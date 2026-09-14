# DATABASE_SCHEMA.md — SIMAKIS Backend

> Skema ini **wajib sinkron** dengan `app/models/` (SQLAlchemy) dan dengan
> bentuk data di `INTERFACES.md`. Kalau salah satu berubah, dua lainnya
> ikut diperbarui di PR yang sama (`GIT_WORKFLOW.md` §3).

Sistem: MySQL 8.x. Semua tabel `id` pakai `CHAR(36)` (UUID) kecuali
disebutkan lain (mis. `npsn` sebagai PK alami untuk sekolah).

---

## 1. `users`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `nama` | VARCHAR(255) | |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | bcrypt |
| `role` | ENUM | `warga_umum`, `warga_terverifikasi`, `komite_sekolah`, `verifikator_dinas`, `kepala_dinas`, `admin` |
| `status_verifikasi` | ENUM | `menunggu`, `terverifikasi`, `ditolak` |
| `sekolah_terkait_npsn` | VARCHAR(20) NULLABLE | FK → `sekolah.npsn`, opsional & self-declared (`PRD.md` §2.3) |
| `account_age_days` | derived/computed | dipakai sinyal anti-buzzer (`DECISIONS.md` D-08), tidak perlu kolom fisik — hitung dari `created_at` |
| `created_at` | DATETIME | |

## 2. `pdp_vault`

Tabel **terpisah** dari `users`, sesuai `ARCHITECTURE.md` §3.2 — bukan
kolom biasa di `users`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `user_id` | CHAR(36) PK, FK → `users.id` | |
| `nik_encrypted` | VARBINARY(255) | Terenkripsi AES-256, key dari `PDP_ENCRYPTION_KEY` (`backend/SETUP.md` §4) |
| `created_at` | DATETIME | |

**Aturan:** hanya modul `app/core/pdp.py` (encrypt/decrypt helper) yang
boleh baca/tulis tabel ini langsung — router lain **tidak boleh** query
tabel ini secara langsung, harus lewat helper tersebut.

## 3. `sekolah`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `npsn` | VARCHAR(20) PK | |
| `nama` | VARCHAR(255) | |
| `alamat` | VARCHAR(500) | |
| `jenjang` | ENUM | `SD`, `SMP`, `SMA`, `SMK` |
| `sumber_data` | VARCHAR(50) | mis. `"Dapodik"` |
| `tanggal_pembaruan_data` | DATE | dari hasil scraping/parsing (`INTEGRATION.md`) |

## 4. `sekolah_data_resmi`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `sekolah_npsn` | VARCHAR(20) FK → `sekolah.npsn` | |
| `rasio_guru_siswa` | VARCHAR(20) | mis. `"1:20"` |
| `indikator_kualitas_data` | VARCHAR(50) NULLABLE | IKD dari Dapodik |

## 5. `kondisi_sarana`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `sekolah_npsn` | VARCHAR(20) FK → `sekolah.npsn` | |
| `nama_ruang` | VARCHAR(255) | |
| `kondisi` | ENUM | `baik`, `rusak_ringan`, `rusak_sedang`, `rusak_berat` |
| `lokasi_ruang` | VARCHAR(255) NULLABLE | opsional/keterangan warga (`PRD.md` §6.1) |

## 6. `laporan`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `tracking_id` | VARCHAR(50) UNIQUE | ditampilkan ke warga setelah kirim |
| `user_id` | CHAR(36) FK → `users.id` | |
| `sekolah_npsn` | VARCHAR(20) FK → `sekolah.npsn` | |
| `kategori` | ENUM | `infrastruktur_sarana`, `ketersediaan_tenaga_pengajar`, `lainnya` |
| `fasilitas_terkait` | VARCHAR(255) NULLABLE | wajib jika kategori = `infrastruktur_sarana` (validasi di level aplikasi, bukan DB) |
| `deskripsi` | TEXT | |
| `klaster_id` | CHAR(36) NULLABLE, FK → `klaster.id` | diisi setelah AI pipeline jalan, null sebelum diproses |
| `created_at` | DATETIME | |

## 7. `laporan_foto`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `laporan_id` | CHAR(36) FK → `laporan.id` | |
| `storage_key` | VARCHAR(500) | path/object key di MinIO/S3, bukan data biner |
| `created_at` | DATETIME | |

## 8. `klaster`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `label` | VARCHAR(255) | hasil TF-IDF labeling |
| `kategori` | ENUM | sama seperti `laporan.kategori` |
| `sekolah_npsn` | VARCHAR(20) FK → `sekolah.npsn` | |
| `skor_keparahan` | DECIMAL(6,2) | dari data Dapodik (`PRD.md` §4) |
| `jumlah_vote_terhitung` | INT DEFAULT 0 | denormalized, di-update tiap vote baru dihitung |
| `skor_prioritas` | DECIMAL(8,2) | `skor_keparahan + jumlah_vote_terhitung`, dihitung backend |
| `urutan_prioritas_override` | INT NULLABLE | diisi kalau Kepala Dinas override (`DECISIONS.md` D-10) |
| `alasan_override` | TEXT NULLABLE | wajib diisi kalau `urutan_prioritas_override` diisi |
| `status_verifikasi` | ENUM | `menunggu_verifikasi`, `tidak_terverifikasi`, `terverifikasi` |
| `created_at` | DATETIME | |

## 9. `vote`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `klaster_id` | CHAR(36) FK → `klaster.id` | |
| `user_id` | CHAR(36) FK → `users.id` | |
| `status_vote` | ENUM | `pending`, `terhitung` |
| `created_at` | DATETIME | |

**Constraint:** `UNIQUE(klaster_id, user_id)` — satu akun satu suara per
klaster (`PRD.md` §FEAT-005).

## 10. `status_log`

Append-only — **tidak ada** `UPDATE`/`DELETE` dari aplikasi ke tabel ini
(`DECISIONS.md` D-09).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `klaster_id` | CHAR(36) FK → `klaster.id` | |
| `status` | ENUM | seluruh nilai status di `INTERFACES.md` §7 |
| `alasan` | TEXT NULLABLE | wajib untuk status `tidak_terverifikasi`/`tidak_dapat_ditindaklanjuti` |
| `actor_user_id` | CHAR(36) FK → `users.id` | siapa yang mengubah status |
| `created_at` | DATETIME | |

## 11. `ingest_job`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `file_name` | VARCHAR(255) | |
| `status` | ENUM | `diproses`, `selesai`, `gagal` |
| `uploaded_by` | CHAR(36) FK → `users.id` | |
| `baris_diproses` | INT NULLABLE | |
| `baris_gagal` | INT NULLABLE | |
| `created_at` | DATETIME | |
| `completed_at` | DATETIME NULLABLE | |

## 12. `audit_log`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | CHAR(36) PK | |
| `aksi` | VARCHAR(255) | mis. `"akses_pdp_vault"`, `"override_prioritas"` |
| `actor_user_id` | CHAR(36) FK → `users.id` | |
| `target` | VARCHAR(255) | id resource yang terdampak |
| `created_at` | DATETIME | |

---

## 13. Relasi Ringkas

```
users 1---1 pdp_vault
users 1---N laporan
users 1---N vote
sekolah 1---N sekolah_data_resmi
sekolah 1---N kondisi_sarana
sekolah 1---N laporan
sekolah 1---N klaster
laporan N---1 klaster (nullable sampai diproses AI pipeline)
laporan 1---N laporan_foto
klaster 1---N vote
klaster 1---N status_log
```

---

## 14. Yang Belum Diputuskan

- Apakah `laporan.klaster_id` cukup (satu laporan = satu klaster) atau
  perlu tabel join `klaster_laporan` many-to-many — belum ada kasus yang
  mengharuskan satu laporan masuk >1 klaster, jadi dipakai relasi 1-ke-N
  dulu sampai terbukti perlu diubah.
- Indeks tambahan untuk performa (`laporan.sekolah_npsn`,
  `klaster.skor_prioritas` untuk sorting dashboard) belum ditentukan —
  tambahkan begitu ada data uji nyata untuk diukur.
- Retention policy untuk `audit_log` dan `status_log` (disimpan selamanya
  atau ada batas waktu) belum dibahas.
