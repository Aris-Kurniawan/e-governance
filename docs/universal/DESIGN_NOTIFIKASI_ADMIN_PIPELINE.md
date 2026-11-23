# DESIGN — Notifikasi Warga, Surface Admin, Monitoring Pipeline AI

**Status:** usulan, **belum disetujui** · 22 Nov 2026
**Cakupan:** F4.13 (notifikasi), F4.14 (surface admin), F4.15 (monitoring pipeline)
**Sifat dokumen:** rancangan sebelum kode. Tidak ada perubahan kode yang menyertai dokumen ini.

---

## 0. Keputusan yang diminta dari Aris

| # | Pertanyaan | Rekomendasi saya |
|---|---|---|
| K1 | Notifikasi warga: in-app saja, atau in-app + WhatsApp/email? | **In-app saja** untuk F4.13. Kanal eksternal ditunda sampai ada keputusan biaya/penyedia. |
| K2 | Surface admin dipisah dari `/dinas/*`? | **Ya**, `/admin/*` dengan layout sendiri. Alasan di §3.1. |
| K3 | Halaman ingest tetap di `/dinas/ingest` atau pindah ke `/admin/ingest`? | **Tetap di `/dinas/ingest`** (verifikator butuh), admin dapat halaman riwayat sendiri. |
| K4 | Retensi notifikasi | **90 hari**, dihapus cron harian. |

---

## 1. Kondisi saat ini (bukti kode, bukan asumsi)

| Klaim | Bukti | Akibat |
|---|---|---|
| Tidak ada sistem notifikasi | `grep -rni notif backend/app` → 0 hasil; tidak ada tabel `notifikasi` | Warga tidak tahu laporannya diverifikasi/ditolak/ditindaklanjuti kecuali membuka `/laporan/riwayat` manual |
| Banner peringatan di dashboard dinas **hardcoded** | `frontend/src/layouts/DinasLayout.tsx:406` → teks tetap `"3 klaster darurat memerlukan persetujuan hari ini."` | Angka palsu: selalu 3, tidak pernah berubah, tidak berasal dari data. Ini cacat, bukan fitur |
| Admin menumpang surface pemerintah | `frontend/src/App.tsx` → `/dinas/*` `allowedRoles=[admin, verifikator_dinas, kepala_dinas]`; `/dinas/sistem` (baru) admin-only di dalamnya | Batas wewenang tidak terlihat di URL; menu pemerintah memuat operasi destruktif |
| Monitoring pipeline hanya satu slot | `backend/app/core/pipeline_state.py` → `pipeline_state.json`, field `last_run/source/status/klaster_created/message` | Tidak ada riwayat run, tidak ada durasi, tidak ada pelaku, tidak ada tahap |
| Trigger clustering sinkron | `backend/app/routers/klaster.py:134` `POST /ai/cluster` → `run_clustering_sync()` lalu `return` | Request HTTP menggantung selama proses berjalan; tidak ada `run_id` untuk dipantau |
| Status pipeline tidak punya riwayat | `GET /ai/status` (`klaster.py:159`) membaca state file + hitung `belum_diproses` | Tidak bisa menjawab "run kemarin berhasil?", "berapa lama?", "tahap mana yang gagal?" |

---

## 2. Notifikasi warga (F4.13)

### 2.1 Prinsip

1. **In-app, tersimpan di DB.** Bukan push, bukan WebSocket. Klien polling 60 detik.
2. **Idempoten.** Satu peristiwa = maksimal satu notifikasi per pengguna, dijaga `UNIQUE (user_id, tipe, ref_id)`.
3. **Ditulis di service layer setelah `db.commit()`.** Tidak pakai DB trigger — logika bisnis tetap di Python, mudah diuji.
4. **Kegagalan notifikasi tidak boleh menggagalkan aksi utama.** Bungkus `try/except`, catat ke `AuditLog`.

### 2.2 Skema tabel

```sql
CREATE TABLE notifikasi (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL REFERENCES users(id),
  tipe          ENUM('laporan_divalidasi','laporan_ditolak','tindak_lanjut',
                     'konfirmasi_diminta','klaster_prioritas','akun_diverifikasi') NOT NULL,
  judul         VARCHAR(120) NOT NULL,
  pesan         VARCHAR(500) NOT NULL,
  ref_type      ENUM('laporan','klaster','akun') NOT NULL,
  ref_id        VARCHAR(36) NOT NULL,
  dibaca_pada   DATETIME NULL,
  created_at    DATETIME NOT NULL,
  UNIQUE KEY uq_notif (user_id, tipe, ref_id),
  KEY ix_notif_user_baca (user_id, dibaca_pada, created_at)
);
```

Tanpa kolom NIK, tanpa isi laporan mentah — hanya rujukan `ref_id` (D-29).

### 2.3 Pemicu (titik sisip konkret)

| Tipe | Pemicu | Lokasi kode | Penerima |
|---|---|---|---|
| `laporan_divalidasi` | `PUT /laporan/{id}/status` → `status_sanggahan='divalidasi'` | `routers/laporan.py:395` | pemilik laporan |
| `laporan_ditolak` | idem, `status_sanggahan='ditolak'` (sertakan alasan) | `routers/laporan.py:395` | pemilik laporan |
| `tindak_lanjut` | `POST /laporan/{id}/tindak-lanjut` dan `PUT /klaster/{id}/status` | `routers/laporan.py:447`, `routers/klaster.py:386` | pemilik semua laporan anggota klaster |
| `konfirmasi_diminta` | `POST /laporan/{id}/konfirmasi` membuat `status_konfirmasi='menunggu'` | `routers/laporan.py:658` | pemilik laporan |
| `klaster_prioritas` | `PUT /vote/klaster/{id}/override` (kepala dinas) | `routers/vote.py:130` | pemilik laporan anggota klaster |
| `akun_diverifikasi` | verifikasi akun warga oleh admin (endpoint **belum ada**) | F4.12 lanjutan | warga |

Satu notifikasi per pemilik laporan; anggota klaster 40 orang = 40 baris. Batas aman: `POST /vote/klaster/{id}/override` menulis ≤ jumlah anggota klaster (maks 62 sekolah × anggota).

### 2.4 Endpoint

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/notifikasi` | semua role login | Daftar notifikasi milik sendiri, paginasi §0.2, filter `?belum_dibaca=true` |
| GET | `/notifikasi/jumlah` | semua role login | `{ "belum_dibaca": 3 }` untuk badge |
| PATCH | `/notifikasi/{id}/baca` | pemilik | Tandai satu terbaca (idempoten) |
| PATCH | `/notifikasi/baca-semua` | pemilik | Tandai semua terbaca |

Tidak ada endpoint hapus. Retensi diurus cron.

### 2.5 UI

- **Warga:** ikon lonceng di `frontend/src/layouts/PublicLayout.tsx` (belum ada) + halaman `/notifikasi`. Badge angka dari `GET /notifikasi/jumlah`, polling 60 detik saat tab aktif (`document.visibilityState`).
- **Klik notifikasi** → deep link: `laporan` → `/laporan/{tracking_id}`, `klaster` → `/klaster/{id}`, `akun` → `/profil`.
- **Pemerintah & admin:** lonceng yang sama di `DinasLayout`/`AdminLayout`, memakai endpoint yang sama. Tidak ada notifikasi broadcast.

### 2.6 Retensi

`DELETE FROM notifikasi WHERE created_at < NOW() - INTERVAL 90 DAY` — cron harian 02:30, satu skrip `backend/scripts/purge_notifikasi.py`, idempoten, log jumlah terhapus.

### 2.7 Yang sengaja tidak dibuat

- WhatsApp/email/Telegram: butuh biaya + penyedia + template approval. Ditunda.
- Realtime (SSE/WebSocket): polling 60 detik cukup untuk frekuensi perubahan saat ini (verifikasi laporan = puluhan per hari). `ponytail:` naik ke SSE kalau ada keluhan latensi.
- Preferensi notifikasi per pengguna: belum ada kebutuhan.

---

## 3. Pemisahan surface admin (F4.14)

### 3.1 Rekomendasi: pisahkan route, bukan aplikasi baru

Admin pindah ke `/admin/*` dengan `AdminLayout` sendiri. Tiga alasan:

1. **Pemisahan tugas.** Admin membuat dan menaikkan role. Kalau admin duduk di surface yang audited party-nya bekerja, jejak audit kehilangan independensi — verifikator bisa memunculkan akun `kepala_dinas` dari dalam surface yang sama.
2. **Menu pemerintah bersih.** `ingest` menimpa data sekolah, `ai/cluster` menulis ulang klaster + pemetaan vote. Operasi destruktif tidak pantas sebaris dengan antrean verifikasi harian.
3. **URL jujur.** `/admin/pipeline` menyatakan wewenangnya; `/dinas/sistem` menyamarkan.

### 3.2 Peta route & RBAC setelah perubahan

| Route | Akses | Isi |
|---|---|---|
| `/admin` | `admin` | Ringkasan sistem: akun per role, ingest terakhir, run pipeline terakhir, error 24 jam |
| `/admin/akun` | `admin` | Pindahan `/dinas/sistem` panel akun |
| `/admin/ingest` | `admin` | Riwayat ingest (baca) + unggah CSV |
| `/admin/pipeline` | `admin` | Riwayat run AI, detail tahap, tombol jalankan (§4) |
| `/admin/audit` | `admin` | Pindahan `/dinas/log-audit` |
| `/dinas/dashboard`, `/dinas/antrian`, `/dinas/status` | ketiga role dinas | tetap |
| `/dinas/ingest` | `admin`, `verifikator_dinas` | tetap (K3) |
| `/dinas/log-audit` | `admin`, `kepala_dinas` | tetap — kadis butuh akses audit |

### 3.3 Konsekuensi & mitigasi

- **Duplikasi shell.** `AdminLayout` akan mengulang sidebar/header (~150–180 baris). Mitigasi: ekstrak `frontend/src/layouts/SidebarShell.tsx` (logo, header, footer, wrapper) yang dipakai `DinasLayout` dan `AdminLayout`. Tanpa ekstraksi ini, dua layout akan menyimpang perlahan.
- **Dua titik masuk login.** `/dinas/login` tetap satu-satunya form; setelah login, `admin` diarahkan ke `/admin`, role dinas ke `/dinas/dashboard`. Redirect ditentukan di `ProtectedRoute`/`Login`, bukan di dua form.
- **Menu admin bertambah.** Dibatasi 5 item (§3.2). Tidak ada submenu bersarang.

### 3.4 Migrasi dua fase

1. **Fase 1** — tambah `/admin/*` + `AdminLayout` + `SidebarShell`; `/dinas/sistem` jadi `<Navigate to="/admin/akun" replace />`. Tidak ada yang hilang, bisa dibalik satu commit.
2. **Fase 2** — hapus item `Sistem & Akun` dari `DinasLayout.navItems`, hapus route lama, tambah redirect `/dinas/sistem → /admin/akun` permanen.

### 3.5 Yang tetap di `/dinas`

Validasi sarpras, status tindak lanjut, ingest (verifikator), log audit (kadis). Surface pemerintah tetap 4 item.

---

## 4. Monitoring pipeline AI (F4.15)

### 4.1 Masalah konkret

| Gejala | Sebab di kode |
|---|---|
| Tidak bisa lihat run sebelumnya | `pipeline_state.json` menimpa satu slot (`core/pipeline_state.py:26`) |
| Tombol jalankan menggantung | `POST /ai/cluster` sinkron (`routers/klaster.py:134`) |
| Tidak tahu tahap mana yang gagal | `run_clustering_sync` hanya mengembalikan `total_created`; error dilempar sebagai `HTTPException(500)` |
| Tidak tahu siapa yang menjalankan | `record_pipeline_run` tidak menerima `actor_user_id` |
| Cron dan manual tidak bisa dibedakan riwayatnya | `source` hanya `script`/`api`, tidak ada riwayat |

### 4.2 Skema

```sql
CREATE TABLE ai_run (
  id                VARCHAR(36) PRIMARY KEY,
  sumber            ENUM('manual','cron','api') NOT NULL,
  status            ENUM('berjalan','sukses','gagal','dibatalkan') NOT NULL,
  actor_user_id     VARCHAR(36) NULL REFERENCES users(id),
  mulai             DATETIME NOT NULL,
  selesai           DATETIME NULL,
  durasi_ms         INT NULL,
  laporan_masuk     INT NULL,
  laporan_noise     INT NULL,
  klaster_dibuat    INT NULL,
  klaster_diperbarui INT NULL,
  silhouette        FLOAT NULL,
  parameter         JSON NULL,
  pesan_error       TEXT NULL,
  KEY ix_ai_run_mulai (mulai)
);

CREATE TABLE ai_run_tahap (
  id        VARCHAR(36) PRIMARY KEY,
  run_id    VARCHAR(36) NOT NULL REFERENCES ai_run(id),
  tahap     ENUM('muat_laporan','tfidf','umap','hdbscan','simpan_klaster') NOT NULL,
  status    ENUM('berjalan','sukses','gagal','dilewati') NOT NULL,
  mulai     DATETIME NOT NULL,
  selesai   DATETIME NULL,
  detail    JSON NULL,
  KEY ix_tahap_run (run_id, mulai)
);
```

`silhouette` hanya diisi bila klaster > 1; kalau tidak, `NULL` — jangan tulis 0,0 karena itu klaim palsu.

### 4.3 Endpoint

| Method | Endpoint | Akses | Perubahan |
|---|---|---|---|
| POST | `/ai/cluster` | `admin`, `verifikator_dinas` | **Berubah**: balas `202 {data:{run_id, status:"berjalan"}}`, proses di background |
| GET | `/ai/runs` | `admin` | Baru — riwayat run, paginasi §0.2, filter `?status=` |
| GET | `/ai/runs/{run_id}` | `admin` | Baru — detail run + daftar tahap |
| GET | `/ai/status` | `admin`, `verifikator_dinas` | Ditambah `sedang_berjalan: bool`, `run_terakhir: {run_id, sumber, status, mulai, durasi_ms}`; field lama tetap |

`POST /ai/cluster` yang mengembalikan 202 adalah **breaking change** untuk pemanggil yang mengharapkan `klaster_created`. Pemanggil saat ini hanya frontend (`triggerClustering()`), yang akan diperbarui di commit yang sama. Skrip cron memakai `scripts/run_clustering.py`, bukan endpoint ini.

### 4.4 Eksekusi async & reaper

- `BackgroundTasks` FastAPI + session DB baru di dalam worker. Tidak pakai Celery/Redis — satu proses, satu job; `ponytail:` naik ke queue kalau run bersamaan dibutuhkan.
- Kunci tunggal: `SELECT ... FOR UPDATE` pada baris `ai_run` berstatus `berjalan`, atau cukup cek `EXISTS(status='berjalan')` sebelum mulai → `409` bila ada run aktif. Satu pipeline per saat ini cukup.
- **Reaper:** run `berjalan` dengan `mulai < NOW() - 60 MINUTE` dianggap `gagal` (`pesan_error='timeout, proses berhenti tanpa penutupan'`). Dipanggil di awal `GET /ai/runs`, bukan cron terpisah.
- Cron 02:00 (`scripts/run_clustering.py`) memakai fungsi yang sama: `mulai_run(sumber='cron')` → `catat_tahap()` → `selesai_run()`.

### 4.5 Metrik yang boleh tampil

Boleh: durasi, jumlah laporan masuk, jumlah noise, klaster dibuat/diperbarui, silhouette (bila ada), pesan error.

Tidak boleh: persentase akurasi, "kualitas klaster naik X%", biaya rupiah. Tidak ada dasar pengukuran di repo untuk angka semacam itu.

### 4.6 UI `/admin/pipeline`

- Tabel riwayat: mulai, sumber, status, durasi, laporan masuk, klaster, aksi "Detail".
- Detail: 5 baris tahap dengan status + durasi, `pesan_error` mentah bila gagal.
- Tombol "Jalankan sekarang" nonaktif saat `sedang_berjalan`; konfirmasi menyebutkan bahwa klaster + pemetaan vote akan ditulis ulang.
- Polling 10 detik selama ada run `berjalan`, berhenti saat selesai.

### 4.7 Jalur cron

`scripts/run_clustering.py` tetap menjadi entry cron 02:00. Perubahan: tiga panggilan (`mulai_run`, `catat_tahap`, `selesai_run`) menggantikan `record_pipeline_run`. `pipeline_state.json` dipertahankan sebagai cache `last_run` sampai `GET /ai/status` membaca DB, lalu file dihapus di commit terpisah.

---

## 5. Matriks endpoint baru

| Fitur | Endpoint baru | Endpoint berubah |
|---|---|---|
| F4.13 | `GET /notifikasi`, `GET /notifikasi/jumlah`, `PATCH /notifikasi/{id}/baca`, `PATCH /notifikasi/baca-semua` | — |
| F4.14 | — (murni frontend) | — |
| F4.15 | `GET /ai/runs`, `GET /ai/runs/{run_id}` | `POST /ai/cluster` → 202 async, `GET /ai/status` + 2 field |

Total 6 endpoint baru, 2 berubah.

---

## 6. Migrasi DB (Alembic)

Repo sudah punya `backend/alembic`. Tiga revisi terpisah, satu per tabel:

```text
xxxx_add_notifikasi.py       → tabel notifikasi
xxxx_add_ai_run.py           → tabel ai_run
xxxx_add_ai_run_tahap.py     → tabel ai_run_tahap
```

Tanpa `server_default` untuk kolom baru yang nullable; tidak ada backfill karena ketiga tabel baru. Tabel lama tidak disentuh.

---

## 7. Rencana kerja bertahap

| Fase | Isi | File utama | Uji |
|---|---|---|---|
| F4.13a | Model + migrasi + `notif_service` + endpoint baca | `models/notifikasi.py`, `routers/notifikasi.py`, `core/notif.py` | 8 test: RBAC, idempoten, paginasi, tanda baca |
| F4.13b | Sisip pemicu di 5 titik (§2.3) | `routers/laporan.py`, `routers/klaster.py`, `routers/vote.py` | 5 test: satu peristiwa = satu baris, aksi tetap sukses saat notifikasi gagal |
| F4.13c | Lonceng + halaman `/notifikasi` | `PublicLayout.tsx`, `pages/warga/Notifikasi.tsx`, `lib/api/notifikasi.ts` | smoke Playwright: badge, tandai terbaca |
| F4.14a | `SidebarShell` + `AdminLayout` + route `/admin/*` | `layouts/SidebarShell.tsx`, `layouts/AdminLayout.tsx`, `App.tsx` | smoke: admin masuk `/admin`, role dinas ditolak |
| F4.14b | Pindah panel + redirect + hapus nav lama | `pages/admin/*`, `DinasLayout.tsx` | smoke: `/dinas/sistem` → `/admin/akun` |
| F4.15a | Model `ai_run` + `ai_run_tahap` + refactor `run_clustering_sync` jadi bertahap | `models/ai_run.py`, `ai_pipeline/clustering.py` | 4 test: run sukses tercatat, gagal tercatat, reaper, 409 saat run aktif |
| F4.15b | `POST /ai/cluster` async + `GET /ai/runs` | `routers/klaster.py` | 5 test: 202, status berubah, riwayat, filter, RBAC |
| F4.15c | UI `/admin/pipeline` | `pages/admin/Pipeline.tsx` | smoke Playwright: tabel, detail, tombol nonaktif saat berjalan |

Urutan wajib: F4.13 → F4.14 → F4.15. F4.14 sebelum F4.15 karena UI pipeline hidup di `/admin`.

---

## 8. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `POST /ai/cluster` async memutus klien lama | Frontend error saat klik jalankan | Frontend diperbarui di commit yang sama; field `klaster_created` hilang diganti `run_id` |
| Notifikasi membanjiri warga (klaster 40 anggota) | Lonceng penuh, warga mengabaikan | `UNIQUE(user_id,tipe,ref_id)`; untuk `klaster_prioritas` satu baris per klaster, bukan per perubahan |
| Sisip notifikasi memperlambat verifikasi | Verifikasi jadi lambat | `try/except` + commit terpisah; kegagalan notifikasi tidak menggagalkan aksi |
| Dua layout menyimpang | UI tidak konsisten | `SidebarShell` wajib diekstrak di F4.14a, bukan "nanti" |
| Run `berjalan` menggantung | Tombol jalankan mati permanen | Reaper 60 menit + tampilkan tombol "tandai gagal" untuk admin |
| `pipeline_state.json` dan DB tidak sinkron | `last_run` berbeda antar endpoint | Satu sumber setelah F4.15b: DB. File dihapus di commit terpisah |

---

## 9. Pertanyaan terbuka

1. **K1** — notifikasi in-app saja cukup untuk demo/sidang, atau perlu WhatsApp?
2. **K3** — halaman unggah CSV tetap di `/dinas/ingest` (verifikator), atau admin juga dipindah ke `/admin/ingest` dan `/dinas/ingest` dihapus?
3. **K5** — banner hardcoded `DinasLayout.tsx:406` diganti angka nyata dari `GET /dashboard/pemerintah`, atau dihapus saja sampai ada data yang bisa dihitung?
4. **K6** — kepala dinas perlu akses baca ke `/admin/pipeline` (lihat riwayat run AI), atau cukup admin?

---

## 10. Kriteria terima

- Notifikasi: 6 tipe terpicu, idempoten (kirim dua kali → satu baris), RBAC (warga hanya melihat miliknya), badge akurat, `GET /notifikasi` tidak pernah memuat NIK.
- Admin: role `verifikator_dinas` dan `kepala_dinas` ditolak di seluruh `/admin/*` (403 API + redirect UI); menu pemerintah tinggal 4 item; `/dinas/sistem` redirect permanen.
- Pipeline: satu run = satu baris `ai_run` + 5 baris `ai_run_tahap`; run gagal menyimpan `pesan_error`; reaper menutup run menggantung; `silhouette` `NULL` bila klaster ≤ 1; tombol jalankan nonaktif saat `sedang_berjalan`.
- Tidak ada angka rupiah, tidak ada klaim akurasi tanpa pengukuran.
