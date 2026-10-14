# DEBUGGING.md — Log Permasalahan Backend SIMAKIS

**Tujuan:** pelacakan masalah backend (bug, drift, gap integrasi) beserta **status penyelesaiannya** — dokumen hidup, diperbarui tiap kali ada debugging baru atau sebuah masalah dinyatakan selesai.

**Aturan pemakaian:**
- ID entri `DBG-xxx` **permanen** — jangan dihapus, cukup ubah status + isi blok "Penyelesaian".
- Status hanya boleh dinaikkan ke ✅ jika ada **bukti**: commit hash, angka verifikasi, atau uji negatif.
- Masalah yang butuh keputusan pemilik proyek ditandai ⚪ (butuh keputusan) di kolom status — tetap dicatat, jangan dihapus.
- Referensi kontrak: `docs/universal/INTERFACES.md` (deviasi kontrak FE↔BE = daftar di `docs/frontend/CHANGELOG.md` §"Catatan Deviasi Kontrak").

**Legenda status:**

| Simbol | Arti |
|---|---|
| ✅ SELESAI | Diperbaiki + terverifikasi (ada commit/bukti) |
| 🔴 TERBUKA | Terkonfirmasi rusak, belum diperbaiki |
| ⚪ TERBLOKIR | Butuh keputusan desain/produk sebelum diperbaiki |

---

## Ringkasan

| ID | Masalah | Lokasi | Status | Bukti / Rencana |
|---|---|---|---|---|
| DBG-001 | ENUM `klaster.kategori` drift: migrasi = 5 nilai, model & DB live = 6 | `alembic/versions/8cca6e1b2fa3`, `models/laporan.py:10` | ✅ SELESAI | `d3cb7888ff94` (commit `744fc4ca`) + guard `verify_schema_parity.py` |
| DBG-002 | Cron 02:00 me-recluster laporan noise tiap hari (loop harian) | `scripts/run_clustering.py` | ✅ SELESAI | F4.7 `ae07c8de` — kolom `hasil_klasterisasi`, seleksi `'belum_diproses'` |
| DBG-003 | `Unknown column 'perlu_info_tambahan'` / enum truncation saat upgrade | `klaster.status_verifikasi` | ✅ SELESAI | migrasi `d4f8c2a91e05` (commit `5a00bd3d`) |
| DBG-004 | `GET /ai/status`: `unclustered_laporan` selalu 398; `last_run` hardcoded `"N/A"` | `routers/klaster.py:164-185` | 🔴 TERBUKA | Ubah seleksi ke `hasil_klasterisasi='belum_diproses'` + catat run terakhir |
| DBG-005 | `log_audit()` 0 call site — tabel `audit_log` 0 baris; halaman FE Log Audit PDP selalu kosong | `core/audit.py:8` | 🔴 TERBUKA | Tanam `log_audit()` di endpoint aksi sensitif + test assert |
| DBG-006 | Jadwal cron 02:00 WIB tidak pernah dipasang (`crontab -l` kosong) | mesin target / deploy | 🔴 TERBUKA | Pasang crontab/systemd timer di server produksi + checklist deploy |
| DBG-007 | `penanda_masalah` selalu `"normal"`, `jumlah_isu_aktif` selalu 0 (deviasi kontrak #1) | `routers/sekolah.py:60-61` | ⚪ TERBLOKIR | Butuh formula ambang `aman/perlu_perhatian/kritis` (keputusan Aris) |
| DBG-008 | `GET /dashboard/wilayah` menolak role `admin` (403) (deviasi kontrak #3) | `routers/dashboard.py:17` | 🔴 TERBUKA | Tambah `admin` ke `require_dinas` + test |
| DBG-009 | `lintang`/`bujur` NULL 62/62 padahal CSV sumber lengkap (deviasi kontrak #4) | `setup_f300.py:180`, `routers/ingest.py:63` | 🔴 TERBUKA | Petakan 2 kolom di 2 lokasi + reseed |
| DBG-010 | `ingest.py` baca `row.get("nama_sekolah")` padahal header CSV = `nama` → nama bisa "Unknown" | `routers/ingest.py:65` | 🔴 TERBUKA | Ubah key ke `nama` (kompatibel CSV resmi) + test |
| DBG-011 | Global handler `RequestValidationError` mengembalikan **400**, bukan 422 (deviasi INTERFACES) | `main.py` (handler global) | ⚪ TERBLOKIR | Ubah ke 422 = ubah kontrak global; perlu keputusan (F4.7 menyiasati dengan `HTTPException(422)` manual) |

---

## Detail

### DBG-001 ✅ — ENUM `klaster.kategori` drift (2026-10-14)

- **Gejala:** fresh install `alembic upgrade head` dari nol menghasilkan ENUM **5 nilai**; pipeline insert `kategori='belum_terklasifikasi'` gagal (MySQL 1265/1366). DB live selamat karena enum-nya diubah di luar alembic → selisih tak pernah terlihat.
- **Akar:** `8cca6e1b2fa3` membuat ENUM tanpa `belum_terklasifikasi`; penambahan nilai ke-6 terjadi di model Python tanpa migrasi pendamping. Test tak menangkap karena `conftest.py` memakai `Base.metadata.create_all` (model), bukan alembic.
- **Penyelesaian:** migrasi **`d3cb7888ff94`** (commit `744fc4ca`) — guard non-MySQL + guard idempoten `information_schema` (enum sudah 6 nilai → skip/no-op), `ALTER … MODIFY` hanya menambah value di akhir. Revisi lama tidak diedit (sudah tercatat applied).
- **Verifikasi:** upgrade live no-op (18 klaster utuh) · fresh-install chain 6 revisi sukses, enum 6 nilai, INSERT `belum_terklasifikasi` OK · pytest 98/98 · dump diregen + impor-verified.
- **Guard pencegahan:** `backend/scripts/verify_schema_parity.py` — 94 kolom model vs `information_schema` (14 ENUM); mode default = fresh-install check; `--db <url>` = DB existing; exit 1 saat drift. Uji negatif terbukti menangkap bug ini. Terdaftar di SETUP.md §5.

### DBG-002 ✅ — Loop re-clustering noise oleh cron (2026-10-13)

- **Gejala:** seleksi cron `WHERE klaster_id IS NULL` ikut menangkap laporan **noise** (sengaja di-commit tanpa klaster) → tiap 02:00 semua noise di-recluster, hasil noise lagi, loop harian tak berujung.
- **Akar:** `klaster_id IS NULL` punya dua makna baru setelah F4.7 (noise = sudah diproses, ATAU `belum_diproses`) — detail di `CLUSTERING_BUG_ANALYSIS.md` + docstring migrasi `a7f3c91e5b2d`.
- **Penyelesaian:** kolom `laporan.hasil_klasterisasi` (`belum_diproses|terklaster|noise`) + seleksi cron `hasil_klasterisasi == 'belum_diproses'` (commit `ae07c8de`, F4.7).
- **Verifikasi:** cron dijalankan manual → `No unclustered laporan. Exiting.` (anti-loop terbukti); 398 noise stabil.

### DBG-003 ✅ — `Unknown column 'perlu_info_tambahan'` (enum truncation)

- **Gejala:** DB yang dibuat dari migrasi lama lalu di-upgrade bisa gagal/keliru pada `klaster.status_verifikasi` (nilai enum baru tak dikenal).
- **Penyelesaian:** migrasi `d4f8c2a91e05` (commit `5a00bd3d`, F4.4 lanjutan) — `ALTER TABLE klaster MODIFY status_verifikasi ENUM(…perlu_info_tambahan…)` via SQL mentah.
- **Catatan:** tercatat di SETUP.md §5a tabel troubleshooting; guard DBG-001 kini memverifikasi kolom ini otomatis (parity check).

### DBG-004 🔴 — `GET /ai/status` salah hitung unclustered + `last_run` hardcoded

- **Gejala:** `unclustered_laporan` **selalu 398** (angka noise yang sudah selesai), bukan backlog `belum_diproses` (0). `last_run` selalu `"N/A (no cron log yet)"` meski cron/script sudah pernah jalan.
- **Akar:** query masih `WHERE klaster_id IS NULL` (definisi pra-F4.7) — tidak disapu saat semantik berubah (lihat DBG-002). `last_run` tidak pernah diisi karena tidak ada penyimpanan waktu run.
- **Dampak:** dashboard pipeline/Kadis salah baca status; alarm/SLA berbasis endpoint ini akan false dari hari pertama.
- **Rencana:** seleksi → `hasil_klasterisasi == 'belum_diproses'`; `last_run` diisi dari kolom `updated_at` laporan terakhir terproses (atau file log run) — putuskan yang paling murah.

### DBG-005 🔴 — `log_audit()` tak pernah dipanggil; `audit_log` 0 baris

- **Gejala:** `GET /audit/log` (dan halaman FE Log Audit PDP) selalu kosong; 0 baris di tabel `audit_log`.
- **Akar:** helper F3.21 (`core/audit.py`) ditulis bersama endpoint & FE, tetapi "penyambung" (pemanggilan di endpoint aksi sensitif) tak pernah dikerjakan; task ditandai selesai berdasarkan keberadaan fungsi, bukan terjadinya pencatatan.
- **Dampak produksi:** tak ada jejak siapa verifikasi klaster/override prioritas/akses PDP — peluang kepatuhan PDP & forensik insiden hilang.
- **Rencana:** tanam `log_audit()` minimal di: `POST/PUT /auth/login`, `PUT /klaster/{id}/verifikasi`, `PUT /laporan/{id}/status`, akses PDP vault; tambah test black-box assert baris `audit_log` bertambah.

### DBG-006 🔴 — Cron 02:00 WIB tidak pernah terpasang

- **Gejala:** `crontab -l` kosong; `run_clustering.py` hanya jalan manual.
- **Akar:** pemasangan crontab = tindakan operasional di mesin target; tercatat di dokumentasi seolah sudah dilakukan (documentation-as-reality gap).
- **Dampak produksi:** laporan warga baru tidak pernah ter-otomatis terklasterisasi — fitur "AI pipeline harian" jadi fitur mati; backlog `belum_diproses` menumpuk tanpa batas.
- **Rencana:** pasang `0 2 * * *` (lihat komentar kepala `run_clustering.py`) atau systemd timer; masukkan ke checklist deploy (`DEPLOYMENT.md`) — jangan hanya dokumentasi.

### DBG-007 ⚪ — `penanda_masalah` selalu `"normal"` (butuh keputusan)

- **Gejala:** `GET /sekolah` selalu `penanda_masalah="normal"`, `jumlah_isu_aktif=0`; semua 62 sekolah tampil aman; `totalKritis` di FE = 0 selamanya; filter Status Integritas tak menyaring apa-apa.
- **Akar:** placeholder awal tanpa formula keputusan (ambang kritis dari apa? jumlah isu? skor KBM?).
- **Dampak produksi:** *false sense of security* — papan dashboard hijau padahal ada 129 ruang rusak berat (terungkap baru oleh Skor KBM F4.8).
- **Blokir:** butuh keputusan formula dari Aris. Kandidat alami setelah F4.8: turunkan dari `level` Skor KBM (`kritis`/`tinggi` → `penanda_masalah`).

### DBG-008 🔴 — `/dashboard/wilayah` menolak `admin` (403)

- **Gejala:** login `admin@simakis.id` → buka ringkasan wilayah → 403 (deviasi kontrak #3).
- **Akar:** `require_dinas = ["verifikator_dinas","kepala_dinas"]` dibuat sebelum role `admin` dipakai luas; tak ada audit silang role↔endpoint.
- **Rencana:** tambahkan `admin` ke `require_dinas` + 1 test black-box (admin → 200). Kecil; pastikan juga tak ada endpoint lain dengan gap serupa (audit `RoleChecker` sekali jalan).

### DBG-009 🔴 — `lintang`/`bujur` NULL 62/62 padahal CSV lengkap

- **Gejala:** Peta Sebaran tanpa pin; DB `non-null lintang = 0`. Sumber `backend/app/dataset/raw/sekolah_lamongan_semua.csv`: kolom `lintang`/`bujur` **terisi 62/62** (contoh `-7.1173967`, `112.3937566`).
- **Akar:** pemetaan CSV→model ditulis manual per kolom yang "dipakai saat itu"; 2 kolom ini terlewat di `setup_f300.py` (seed) **dan** `routers/ingest.py` — data hilang di jembatan, bukan di sumber.
- **Rencana:** tambah `lintang=row.get("lintang")`, `bujur=row.get("bujur")` di `setup_f300.py` + `ingest.py`; reseed; expose di `GET /sekolah` bila FE butuh; assert kelengkapan di test seed.

### DBG-010 🔴 — `ingest.py` salah key kolom nama

- **Gejala:** upload CSV via `POST /ingest/dapodik` menghasilkan `nama="Unknown"` — endpoint memakai `row.get("nama_sekolah")`, header CSV resmi = `nama`.
- **Akar:** endpoint ditulis terhadap versi CSV hipotetis; tidak diuji dengan CSV asli (`sekolah_lamongan_semua.csv`).
- **Rencana:** `row.get("nama")` (dengan fallback `nama_sekolah` bila mau kompatibel); tambah test ingest 1 baris dari CSV fixture.

### DBG-011 ⚪ — Handler validasi global mengembalikan 400, bukan 422 (butuh keputusan)

- **Gejala:** body request invalid di endpoint mana pun → **400**, sedangkan kontrak INTERFACES menyebut 422 (mis. `PUT /laporan/{id}/status` enum salah).
- **Akar:** global handler `RequestValidationError` di `main.py` meng-`wrap` jadi 400; menimpa perilaku bawaan FastAPI (422).
- **Dampak:** klien/FE yang mengandalkan 422 (documented) tak akan melihatnya; F4.7 menyiasati dengan validasi manual `HTTPException(422)`.
- **Blokir:** mengubah global handler = mengubah kontrak semua endpoint sekaligus + test yang menAssert 400 → butuh keputusan arah (ubah handler ke 422 + perbarui test/kontrak, ATAU tetap 400 + perbarui INTERFACES).

---

## Catatan Proses (bukan bug produksi)

- **Test DB `simakis_test` harus di-recreate sebelum pytest penuh** (`DROP DATABASE IF EXISTS simakis_test; CREATE DATABASE simakis_test;`). `conftest.py` memakai `create_all(checkfirst=True)` — tabel sisa dari run yang di-kill di tengah bisa punya kolom/enum versi lama → error misterius. Sudah dua kali terbukti (Okt 2026). Ide guard: versi ringan dari `verify_schema_parity.py` untuk `simakis_test`.
- **Delegasi sub-agent sempat rusak** (lifecycle error "cannot be resumed safely" + "Cannot connect to API", Okt 2026) — semua lane F4.7–F4.9 dikerjakan langsung oleh orkestrator.

---

## Cara memperbarui

1. **Masalah baru:** tambahkan baris `DBG-xxx` (ID lanjutan) di tabel Ringkasan + blok Detail (Gejala/Akar/Dampak/Rencana) — status 🔴 atau ⚪.
2. **Selesai:** ubah status → ✅, isi blok **Penyelesaian** (commit hash + angka verifikasi) dan **Verifikasi**, tandai pula di Ringkasan. Jangan hapus entri.
3. Update bersamaan: `docs/backend/CHANGELOG.md` §3.x (ringkas) — DEBUGGING.md = catatan teknis lengkap.
