# CHANGELOG.md — Backend SIMAKIS

> Catatan perubahan backend. Format: **fase** — task — ringkasan.
> Realisasi kerja, pelengkap `ROADMAP.md` (rencana). Entri digrup per fase
> sesuai urutan pengerjaan: Fase 1 → Fase 2 → dst.

---

# FASE 1 — Persiapan (Minggu 1–3) ✅ 100%

## 1.1 Setup Project (F1.1 + F1.4, 2026-09-14)

- **`app/main.py`** — FastAPI app instance + endpoint health:
  - `GET /` → `{app, status, version}`
  - `GET /health` → `{status: healthy}`
  - Swagger UI di `/docs`.
- **`app/core/config.py`** — Pydantic BaseSettings, membaca `.env`:
  APP_NAME, DEBUG, DATABASE_URL, JWT_*, PDP_ENCRYPTION_KEY, MINIO_*,
  EMBEDDING_MODEL. (Sekaligus memenuhi F1.4.)
- **`requirements.txt`** — fastapi, uvicorn[standard], pydantic-settings.
- **`pyrightconfig.json`** — konfigurasi LSP (venv Python 3.14).
- **`venv/`** — Python virtual environment lokal (tidak di-commit).

**Verifikasi:** `uvicorn app.main:app --port 8000` jalan tanpa error;
`GET /` dan `GET /health` balas 200 OK.

---

## 1.2 Database & Migrasi (F1.2, 2026-09-14)

- **`app/models/`** — 12 tabel SQLAlchemy (2.0 style, Mapped):
  - `base.py` — `Base`, `TimestampMixin`, `gen_uuid()`, `utcnow()`
  - `user.py` — `User`, `PdpVault`
  - `sekolah.py` — `Sekolah`, `SekolahDataResmi`, `KondisiSarana`
    (+ property `perlu_verifikasi` untuk deteksi inkonsistensi Dapodik)
  - `laporan.py` — `Laporan`, `LaporanFoto`
  - `klaster.py` — `Klaster`, `Vote`, `StatusLog`
  - `logs.py` — `IngestJob`, `AuditLog`
  - `__init__.py` — registrasi semua model ke `Base.metadata`
- **`app/core/database.py`** — engine + `SessionLocal` + dependency `get_db()`.
- **`alembic/`** + **`alembic.ini`** — Alembic dikonfigurasi; URL diambil
  dari `settings.DATABASE_URL` (`.env`), bukan hardcode.
- **`alembic/versions/478d2b0819e6_init_12_tables.py`** — migration awal
  12 tabel.

### Verifikasi 2 tahap (F1.5)

- **SQLite (dev):** `alembic upgrade head` + `revision --autogenerate` —
  12 tabel + `alembic_version` terbuat, struktur kolom cocok dengan
  `DATABASE_SCHEMA.md`. `dev_check.db` dihapus setelah verifikasi.
- **MySQL 8.4.11 (WSL, 2026-09-15):** database `simakis` dibuat,
  **13 tabel terbuat** (12 tabel + `alembic_version`), ENUM/DECIMAL
  berjalan sesuai.

Catatan auth MySQL 8.4: plugin `mysql_native_password` sudah dihapus di
MySQL 8.4; dipakai `caching_sha2_password` (default) + `cryptography`
untuk PyMySQL.

---

## 1.3 PDP Vault Helper (F1.3, 2026-09-15)

- **`app/core/pdp.py`** — enkripsi/dekripsi NIK memakai **AES-256-GCM**
  (`cryptography`). Kunci di-derive dari `PDP_ENCRYPTION_KEY` via SHA-256
  (menerima passphrase apa pun, tidak terikat format Fernet).
  - `encrypt_nik(plain) -> bytes` — format `nonce(12) || tag(16) || ciphertext`.
  - `decrypt_nik(cipher) -> str`.
  - `simpan_nik(db, user_id, nik)` / `ambil_nik(db, user_id)` — akses
    `pdp_vault` terpusat (upsert, satu-satunya modul yang query tabel ini).
- **`tests/test_pdp.py`** + **`pytest.ini`** — 7 unit test: roundtrip,
  nonce acak (ciphertext beda tiap enkripsi), deteksi tampering (GCM
  `InvalidTag`), input kosong, key kosong, ciphertext pendek, dan
  simpan/ambil via SQLite in-memory.

**Verifikasi:** `python -m pytest -q` → **7 passed**.

---

## 1.4 Scraping Dapodik (F1.6, 2026-09-14)

- **`app/dataset/scraping/scrape_sekolah_v4.py`** — Scraper final Dapodik
  untuk Kecamatan Lamongan (kode `050713`). Mengambil SD, SMP, SMA, SMK.

  **Cara kerja:**
  1. Buka halaman progres Dapodik, capture `Bearer token` dari XHR.
  2. Replay token via `page.evaluate(fetch)` ke 3 endpoint:
     - `/api/progress-pengiriman/kecamatan/school?kode_kecamatan=050713&jenjang=X`
     - `/api/detail-sekolah?npsn=X` — infrastruktur lengkap
     - `/api/ikdByNpsn?npsn=X` — Indikator Kualitas Data
  3. Simpan ke JSON (raw) + CSV (74 kolom bersih).

  **Hasil:** 62 sekolah — SD 37, SMP 12, SMA 5, SMK 8.
  Data mencakup identitas, siswa, guru/tendik, kondisi ruang kelas
  (baik/ringan/sedang/berat), perpustakaan, lab, UKS, WC, listrik,
  internet, dan IKD.

- **`app/dataset/raw/sekolah_lamongan_semua.json`** — Raw lengkap
  (semua field Dapodik, 275 KB).
- **`app/dataset/raw/sekolah_lamongan_semua.csv`** — Kolom bersih siap
  ingest DB (24 KB).

Catatan teknis: endpoint Dapodik mengembalikan 403 tanpa header
`authorization: Bearer <token>`. Token tidak tersimpan di
localStorage/sessionStorage — disuntik JS ke XHR, sehingga harus
ditangkap dari request pertama.

---

## 1.5 Audit & Sinkronisasi Skema (2026-09-14)

Audit membandingkan `DATABASE_SCHEMA.md` vs data scraping aktual vs mockup
detail sekolah menemukan skema lama **tidak cukup** untuk menampung data
nyata. Perubahan disetujui, dokumen diperbarui:

**`docs/backend/DATABASE_SCHEMA.md`:**
- **Tabel `sekolah`** — tambah field hasil scraping: `sekolah_id`,
  `status_sekolah`, `kecamatan`, `desa_kelurahan`, `lintang`/`bujur`,
  `akreditasi`, `nama_kepsek`, `tanggal_verifikasi_baseline`.
- **Tabel `kondisi_sarana`** — diubah dari per-ruang individual (1 kolom
  `kondisi`) menjadi **agregat per jenis ruang**: `jumlah` +
  `kondisi_baik`/`rusak_ringan`/`rusak_sedang`/`rusak_berat` + `sumber`.
  Constraint `UNIQUE(sekolah_npsn, nama_ruang, sumber)`. Kolom
  `lokasi_ruang` dihapus.
- **Tabel `laporan`** — tambah `kondisi_dilaporkan` (untuk deteksi
  mismatch vs Dapodik) dan `status_sanggahan`.
- **Tabel `klaster`** — tambah `status_penanganan` dan `updated_at`.
- Catatan validasi inkonsistensi Dapodik + item baru di "Yang Belum
  Diputuskan".

**`docs/universal/INTERFACES.md`:**
- **`GET /sekolah/{npsn}`** — response diperluas: `kondisi_sarana` (array
  agregat per jenis ruang, dengan `perlu_verifikasi` + `ada_sanggahan`),
  `ringkasan_sarpras`, `rasio_spm_terpenuhi`, `utilitas_kapasitas_belajar`,
  `status_sekolah`, `akreditasi`, `nama_kepsek`.
- **Section baru §2.1** — mekanisme "Sanggah Data Ini" (via `POST /laporan`,
  tanpa endpoint terpisah) + `GET /sekolah/{npsn}/sanggahan`.

**`docs/backend/TASK_GUIDE.md`:**
- F1.2 tabel — catatan field baru `sekolah` + `kondisi_sarana`.
- F2.4 model SQLAlchemy — `Sekolah` + `KondisiSarana` diperluas.
- F2.5 schema Pydantic — `SekolahDetailResponse` + `KondisiSaranaResponse`.
- F2.9/F2.10 — `Laporan` tambah `kondisi_dilaporkan` + `status_sanggahan`.
- **F2.17 (baru)** — endpoint riwayat sanggahan sekolah.

**Alasan:** skema lama berbasis data per-ruang individual yang **tidak
tersedia** di Dapodik (sumber hanya punya agregat per jenis ruang). Mockup
detail sekolah sudah disesuaikan menampilkan kartu per jenis ruang
("Rincian Fasilitas Sekolah") + tombol sanggah.

---

## 1.6 Lainnya

### Changed — `requirements.txt`

- Lengkapi dependency yang sudah dipakai tapi belum tercatat: `alembic`,
  `SQLAlchemy`, `PyMySQL`, `cryptography`, `greenlet`, `pytest`.

### Changed — `.gitignore`

- Tambah `*.db` (SQLite dev check) agar tidak ter-commit.

### Added — Dokumentasi

- **TASK_GUIDE.md** — Panduan tugas backend per fitur (51 task, Fase 1–4),
  diturunkan dari `PRD.md`, `ROADMAP.md`, dan `DATABASE_SCHEMA.md`.

---

## Status Fase 1

| Task | Status |
|------|--------|
| F1.1 — Setup FastAPI Project Structure | ✅ Selesai |
| F1.2 — Database & Migrasi Alembic | ✅ Selesai |
| F1.3 — PDP Vault Helper | ✅ Selesai |
| F1.4 — Setup Config & Environment | ✅ Selesai (digabung F1.1) |
| F1.5 — Verifikasi Koneksi DB | ✅ Selesai (MySQL 8.4.11) |
| F1.6 — Scraping Dapodik | ✅ Selesai |
| F1.7 — Parsing PDF Dapodik | ⚠️ Opsional (API JSON sudah cukup) |

**Progress Fase 1: 100%** (6 task wajib selesai; F1.7 opsional tidak
diperlukan).

---

# FASE 2 — Fitur Dasar (Minggu 4–7) ✅ 100%

## 2.1 Auth & RBAC (F2.1–F2.3, 2026-09-15)

- **`app/schemas/auth.py`** — Pydantic schema untuk authentication:
  - `RegisterRequest` — validasi input: nik (16 digit), nama, email, password (min 8 char), sekolah_terkait_id.
  - `LoginRequest` — email + password.
  - `RefreshRequest` — refresh_token untuk perpanjang session.
  - `TokenResponse` — response login: access_token, refresh_token, role, status_verifikasi.
  - `UserMeResponse` — data akun sendiri: id, nama, email, role, status_verifikasi, sekolah_terkait_npsn (tanpa NIK).

- **`app/core/deps.py`** — dependency & helper untuk authentication:
  - `get_current_user(token: str)` — parse JWT Bearer token, cek claim `type: "access"`, return User object.
  - `RoleChecker(allowed_roles: list)` — dependency untuk RBAC, validasi user role.
  - `hash_password(password: str)` — hash password menggunakan pwdlib argon2.
  - `verify_password(plain: str, hashed: str)` — verify password vs hash.
  - `create_token(data: dict, expires_delta: timedelta)` — generate JWT token dengan claims `sub` (user_id), `type` (access/refresh), `exp`.

- **`app/routers/auth.py`** — 4 endpoint authentication sesuai `INTERFACES.md`:
  - `POST /auth/register` (201 Created) — Daftar akun baru.
    - Validasi: email belum terdaftar, NIK 16 digit, password min 8 char.
    - Hash password dengan pwdlib argon2.
    - Insert user ke tabel `users` dengan role default "warga_umum", status_verifikasi "menunggu".
    - Encrypt NIK ke `pdp_vault` (tidak pernah dikembalikan).
    - Return: `{ user_id, status_verifikasi }`.
  - `POST /auth/login` — Login dengan email & password.
    - Query user by email, verify password.
    - Generate access token (60 menit) + refresh token (7 hari).
    - Return: `{ access_token, refresh_token, role, status_verifikasi }`.
  - `POST /auth/refresh` — Refresh token untuk perpanjang session.
    - Parse refresh token, validasi claim `type: "refresh"`.
    - Query user dari database (cek still exists & active).
    - Generate token baru: access (60 menit) + refresh (7 hari).
    - Return: `{ access_token, refresh_token, role, status_verifikasi }`.
  - `GET /auth/me` — Ambil data akun sendiri (require JWT access token).
    - Return user profile tanpa NIK: `{ id, nama, email, role, status_verifikasi, sekolah_terkait_npsn }`.

- **`app/core/config.py`** — tambah config untuk JWT:
  - `JWT_SECRET: str` — secret key untuk sign token.
  - `JWT_ALGORITHM: str` — HS256.
  - `JWT_EXPIRE_MINUTES: int` — access token lifetime (60 menit).
  - `JWT_REFRESH_EXPIRE_DAYS: int` — refresh token lifetime (7 hari).
  - `PDP_ENCRYPTION_KEY: str` — kunci untuk enkripsi NIK di PDP Vault.

- **`app/main.py`** — register `auth.router` ke FastAPI app.

- **`tests/test_auth.py`** — 5 unit test untuk authentication:
  - Test register success: user terbuat, NIK tersimpan di vault.
  - Test register invalid NIK: reject NIK bukan 16 digit.
  - Test login & get me: login berhasil, bisa ambil profile.
  - Test login wrong password: reject password salah.
  - Test refresh token: token lama bisa direfresh, token baru valid.

- **`requirements.txt`** — tambah: `PyJWT` (2.14.0), `pwdlib[argon2]` (0.3.1), `httpx` (untuk test), `email-validator`.

- **Verifikasi:** `python -m pytest -q` → **12 passed** (7 PDP + 5 auth).

---

## 2.2 Model FEAT-001 & FEAT-003 (F2.4, F2.9, dari F1.2)

Model SQLAlchemy untuk Sekolah dan Laporan sudah dibuat di Fase 1, di-reuse untuk Fase 2 tanpa perlu migration baru.

- **`app/models/sekolah.py`** — Model Sekolah & Kondisi Sarana (F2.4):
  - `Sekolah` — master data sekolah:
    - `npsn` (VARCHAR(20)) — primary key, unique identifier Dapodik.
    - `sekolah_id` (UUID, nullable) — ID internal optional.
    - `nama` (VARCHAR(255)) — nama sekolah.
    - `alamat` (VARCHAR(500)) — alamat lengkap.
    - `jenjang` (ENUM: SD/SMP/SMA/SMK) — tingkat pendidikan.
    - `status_sekolah` (ENUM: Negeri/Swasta) — status kepemilikan.
    - `kecamatan`, `desa_kelurahan` — lokasi administratif.
    - `lintang`, `bujur` (NUMERIC(10,7)) — koordinat GPS.
    - `akreditasi` (VARCHAR(5)) — peringkat akreditasi.
    - `nama_kepsek` (VARCHAR(255)) — nama kepala sekolah.
    - `sumber_data` (default: "Dapodik") — asal data.
    - `tanggal_pembaruan_data`, `tanggal_verifikasi_baseline` (DATE) — audit timestamp.
    - `created_at`, `updated_at` (via TimestampMixin).
    - Relationship: `data_resmi` (1:N ke SekolahDataResmi), `kondisi_sarana` (1:N ke KondisiSarana).

  - `SekolahDataResmi` — data resmi dari Dapodik per sekolah (F2.4):
    - `id` (UUID) — primary key.
    - `sekolah_npsn` (FK) — relasi ke Sekolah.
    - `rasio_guru_siswa` (VARCHAR(20)) — ratio informasi.
    - `indikator_kualitas_data` (VARCHAR(50)) — IKD Dapodik.
    - Relationship: `sekolah` (N:1 ke Sekolah).

  - `KondisiSarana` — agregat kondisi sarana per jenis ruang (F2.4):
    - `id` (UUID) — primary key.
    - `sekolah_npsn` (FK) — relasi ke Sekolah.
    - `nama_ruang` (VARCHAR(255)) — jenis ruang (ruang_kelas, perpustakaan, lab, UKS, WC, dll).
    - `jumlah` (INTEGER) — total unit.
    - `kondisi_baik`, `kondisi_rusak_ringan`, `kondisi_rusak_sedang`, `kondisi_rusak_berat` (INTEGER) — breakdown kondisi.
    - `sumber` (ENUM: dapodik/laporan_warga) — asal data.
    - `perlu_verifikasi` (property) — true jika total kondisi > jumlah (inkonsistensi).
    - Unique constraint: `(sekolah_npsn, nama_ruang, sumber)`.
    - Relationship: `sekolah` (N:1 ke Sekolah).

- **`app/models/laporan.py`** — Model Laporan & LaporanFoto (F2.9):
  - `Laporan` — laporan masalah dari warga:
    - `id` (UUID) — primary key.
    - `tracking_id` (VARCHAR(50)) — unique identifier user-facing (format: LAP-YYYYMMDD-{hex}), indexed.
    - `user_id` (FK) — relasi ke User (pelapor).
    - `sekolah_npsn` (FK) — relasi ke Sekolah (target).
    - `kategori` (ENUM: infrastruktur_sarana/ketersediaan_tenaga_pengajar/lainnya) — jenis isu.
    - `fasilitas_terkait` (VARCHAR(255), nullable) — nama ruang/fasilitas yang disanggah.
    - `kondisi_dilaporkan` (ENUM: baik/rusak_ringan/rusak_sedang/rusak_berat, nullable) — kondisi menurut pelapor.
    - `deskripsi` (TEXT) — detail masalah.
    - `klaster_id` (FK, nullable) — relasi ke Klaster (AI clustering).
    - `status_sanggahan` (ENUM: menunggu/divalidasi/ditolak) — status verifikasi dinas.
    - `created_at`, `updated_at` (via TimestampMixin).
    - Relationship: `foto` (1:N ke LaporanFoto).

  - `LaporanFoto` — bukti foto per laporan:
    - `id` (UUID) — primary key.
    - `laporan_id` (FK) — relasi ke Laporan.
    - `storage_key` (VARCHAR(500)) — path di MinIO/S3 (format: `laporan/{laporan_id}/{filename}`).
    - `created_at` (via TimestampMixin).
    - Relationship: `laporan` (N:1 ke Laporan).

- **`alembic/versions/478d2b0819e6_init_12_tables.py`** — Migration F1.2 sudah mencakup semua model di atas.
  - `sekolah`, `sekolah_data_resmi`, `kondisi_sarana`, `laporan`, `laporan_foto` sudah terbuat di F1.2.
  - Tidak ada migration baru untuk Fase 2.

---

## 2.3 Sinkronisasi Kontrak FE↔BE (2026-09-15)

**`docs/backend/TASK_GUIDE.md`** — sinkronkan endpoint Fase 2 dengan
`INTERFACES.md` (sumber kebenaran FE↔BE, keputusan lintas tim):
- F2.1 — register/login kini menyertakan NIK + `sekolah_terkait_id`,
  refresh token, `GET /auth/me`; password pwdlib argon2 (bukan bcrypt).
- F2.3 — profile manggil `/auth/me`.
- F2.7 — pencarian sekolah via `GET /sekolah?search=&jenjang=&page=`
  (bukan `/sekolah/search`).
- F2.8 — kondisi sarana masuk `GET /sekolah/{npsn}`, tidak ada endpoint
  `/sekolah/{npsn}/sarana`.
- F2.12 — `/laporan/riwayat` (bukan `/laporan/me`).
- F2.13 — `/laporan/{id}` dengan akses terbatas pemilik + dinas (bukan
  publik; pantauan publik via `GET /klaster/{id}/status`).

---

## 2.4 Endpoint Sekolah & Kondisi Sarana (F2.5–F2.8, 2026-09-21)

- **`app/schemas/sekolah.py`** — Pydantic schema untuk sekolah:
  - `KondisiSaranaResponse` — agregat kondisi sarana per jenis ruang (nama_ruang, jumlah, kondisi_baik/rusak_ringan/sedang/berat, sumber, perlu_verifikasi).
  - `SekolahResponse` — info dasar sekolah (npsn, nama, alamat, jenjang, status_sekolah, jumlah_isu_aktif, penanda_masalah).
  - `SekolahDetailResponse` — extend SekolahResponse dengan detail: akreditasi, nama_kepsek, rasio_guru_siswa, rasio_spm_terpenuhi, jumlah_pd/ptk/rombel, utilitas_kapasitas_belajar, kondisi_sarana[], ringkasan_sarpras, klaster_isu.

- **`app/routers/sekolah.py`** — 2 endpoint direktori sekolah:
  - `GET /sekolah?search=&jenjang=&page=&page_size=` — Daftar sekolah dengan filter & pagination.
    - Query: nama sekolah (ILIKE), filter jenjang (SD/SMP/SMA/SMK).
    - Pagination: default page_size=10, max 50.
    - Return: `{ data: [...], meta: { page, page_size, total_items, total_pages } }`.
  - `GET /sekolah/{npsn}` — Detail sekolah + kondisi sarana agregat.
    - Query `sekolah` + `kondisi_sarana` per jenis ruang.
    - Return ringkasan sarpras: `{ total_unit, total_baik, total_rusak_ringan, sedang, berat }`.
    - Include data resmi (rasio guru-siswa dari Dapodik).

- **`app/schemas/__init__.py`** — export sekolah schemas.

- **`app/main.py`** — register `sekolah.router`.

---

## 2.5 Endpoint Laporan (F2.10–F2.13, 2026-09-21)

- **`app/schemas/laporan.py`** — Pydantic schema untuk laporan:
  - `LaporanCreateRequest` — validasi input: sekolah_npsn, kategori, fasilitas_terkait, kondisi_dilaporkan, deskripsi.
  - `LaporanResponse` — laporan dasar (id, tracking_id, user_id, sekolah_npsn, kategori, deskripsi, status_sanggahan, created_at).
  - `LaporanDetailResponse` — extend LaporanResponse dengan sekolah info & foto list.

- **`app/routers/laporan.py`** — 3 endpoint untuk laporan warga:
  - `POST /laporan` — Buat laporan baru.
    - Generate unique `tracking_id` (format: `LAP-YYYYMMDD-{hex}`).
    - Validasi sekolah ada.
    - Cek user punya akses (hanya pemilik akun yang bisa create).
    - Insert ke `laporan` dengan status_sanggahan = "menunggu".
    - Return: `{ id, tracking_id, user_id, sekolah_npsn, ... }` (201 Created).
  - `GET /laporan/riwayat?page=&page_size=` — Riwayat laporan user sendiri.
    - Query: `laporan WHERE user_id = current_user.id`.
    - Pagination & order by created_at DESC.
    - Return: `{ data: [...], meta: {...} }`.
  - `GET /laporan/{laporan_id}` — Detail laporan (akses terbatas).
    - Hanya pemilik laporan ATAU dinas (verifikator_dinas, kepala_dinas, admin) yang bisa akses.
    - Include sekolah info & foto list.
    - Return: `{ id, tracking_id, user_id, ..., sekolah: {...}, foto: [...] }`.

- **`app/schemas/__init__.py`** — export laporan schemas.

- **`app/main.py`** — register `laporan.router`.

---

## 2.6 Upload Foto ke MinIO/S3 (F2.14, 2026-09-21)

- **`app/core/storage.py`** — Storage client untuk MinIO/S3:
  - `StorageClient` class dengan method:
    - `upload_file(file_content, file_name, content_type)` — Upload ke MinIO, auto-create bucket.
    - `get_file_url(file_name)` — Presigned URL dengan expire 7 hari.
    - `delete_file(file_name)` — Hapus dari MinIO.
  - Koneksi menggunakan `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` dari config.

- **`app/routers/upload.py`** — 2 endpoint upload/delete:
  - `POST /upload/laporan?laporan_id=<id>` — Upload foto untuk laporan.
    - Validasi: file type (image/* only), size max 5MB.
    - Hanya pemilik laporan atau dinas yang bisa upload.
    - Upload ke MinIO dengan path `laporan/{laporan_id}/{filename}`.
    - Insert ke `laporan_foto` dengan storage_key.
    - Return: `{ id, laporan_id, storage_key, url, created_at }` (201 Created).
  - `DELETE /upload/{storage_key}` — Hapus foto.
    - Hanya pemilik laporan atau dinas yang bisa delete.
    - Delete dari MinIO & database.

- **`requirements.txt`** — tambah `minio` (7.2.20), `python-multipart` (0.0.32).

- **`app/main.py`** — register `upload.router`.

---

## 2.7 Ingest CSV Dapodik (F2.15–F2.16, 2026-09-21)

- **`app/routers/ingest.py`** — 2 endpoint ingest & monitoring:
  - `POST /ingest/dapodik` — Upload CSV Dapodik untuk di-ingest.
    - Hanya admin & verifikator_dinas yang bisa upload.
    - Validasi file extension (.csv only).
    - Buat `IngestJob` record dengan status "diproses".
    - Parse CSV row-by-row:
      - Extract NPSN, nama, jenjang, status, akreditasi, dll.
      - Insert/update `sekolah` (jika NPSN belum ada).
      - Insert/update `kondisi_sarana` agregat per jenis ruang (ruang_kelas, perpustakaan, lab_ipa, lab_komputer, uks, wc, tempat_ibadah).
      - Tracking baris_diproses vs baris_gagal.
    - Update `IngestJob` status → "selesai" dengan completed_at.
    - Return: `{ job_id, status, baris_diproses, baris_gagal, completed_at }` (201 Created).
  - `GET /ingest/riwayat?page=&page_size=` — Riwayat job ingest.
    - Hanya admin & verifikator_dinas yang bisa akses.
    - Pagination & order by created_at DESC.
    - Return: `{ data: [{ id, file_name, status, baris_diproses, baris_gagal, completed_at, created_at }], meta: {...} }`.

- **`app/main.py`** — register `ingest.router`.

---

## 2.8 Riwayat Sanggahan Sekolah (F2.17, 2026-09-21)

- **`app/routers/sanggahan.py`** — 1 endpoint riwayat sanggahan:
  - `GET /sekolah/{npsn}/sanggahan?page=&page_size=` — Riwayat laporan sanggahan untuk sekolah.
    - Query: `laporan WHERE sekolah_npsn = npsn AND status_sanggahan != "menunggu"`.
    - Pagination & order by created_at DESC.
    - Return: `{ data: [{ id, tracking_id, kategori, fasilitas_terkait, kondisi_dilaporkan, deskripsi, status_sanggahan, created_at }], meta: {...} }`.

- **`app/main.py`** — register `sanggahan.router`.

---

## Status Fase 2

| Task | Status |
|------|--------|
| F2.1 — Register & Login (incl. refresh) | ✅ Selesai |
| F2.2 — Middleware Otorisasi RBAC | ✅ Selesai |
| F2.3 — Profile Management (`/auth/me`) | ✅ Selesai |
| F2.4 — Model SQLAlchemy (Sekolah) | ✅ Selesai (dari F1.2) |
| F2.5 — Schema Pydantic (Sekolah) | ✅ Selesai |
| F2.6 — Endpoint Sekolah | ✅ Selesai |
| F2.7 — Pencarian Sekolah | ✅ Selesai |
| F2.8 — Detail Kondisi Sarana | ✅ Selesai |
| F2.9 — Model SQLAlchemy (Laporan) | ✅ Selesai (dari F1.2) |
| F2.10 — Schema Pydantic (Laporan) | ✅ Selesai |
| F2.11 — Buat Laporan | ✅ Selesai |
| F2.12 — Riwayat Laporan User | ✅ Selesai |
| F2.13 — Detail Laporan | ✅ Selesai |
| F2.14 — Upload Foto ke MinIO/S3 | ✅ Selesai |
| F2.15 — Ingest CSV Dapodik | ✅ Selesai |
| F2.16 — Status Job Ingest | ✅ Selesai |
| F2.17 — Riwayat Sanggahan Sekolah | ✅ Selesai |

**Progress Fase 2: 100%** (17 dari 17 task selesai).

---

# FASE 3 — Fitur Lanjutan (Minggu 8–11) 🔄 Berjalan

## 3.1 Setup Ablation Study (F3.00, 2026-09-22)

- **`scripts/setup_f300.py`** — Script setup otomatis (4 step):
  - Register admin user: `admin@simakis.id` / `Admin123!` (role: admin, status terverifikasi, NIK 16 digit disimpan via PDP Vault).
  - Ingest CSV Dapodik: 62 sekolah (SD 37, SMP 12, SMA 5, SMK 8) + 304 KondisiSarana.
  - Seed 100 dummy laporan, distribusi ke 62 sekolah, deskripsi realistis per kategori (kategori awal 3 nilai; diganti 5 nilai infrastruktur di 3.2).
  - Verify DB: jumlah sekolah ≥ 62, laporan ≥ 100, kondisi_sarana terisi.
- **`requirements.txt`** — tambah dependencies AI Pipeline:
  - `torch==2.14.0+cpu` — CPU-only (versi GPU 554MB terlalu besar untuk dev).
  - `sentence-transformers==6.1.0`, `umap-learn==0.5.12`, `hdbscan==0.8.44`, `scikit-learn==1.9.1`, `numpy==2.5.3`, `scipy==1.18.1`.
  - `minio==7.2.20`, `python-multipart==0.0.32`, `httpx==0.28.1`, `email-validator==2.2.0`.
- **`docs/backend/TASK_GUIDE.md`** — Task F3.00 ditambahkan sebelum F3.0a.
- **`docs/backend/AI_PIPELINE_ABLATION_STUDY.md`** — Section 0. Setup & Prerequisites ditambahkan.

**Verifikasi:** `scripts/setup_f300.py` jalan sukses — semua data terisi, 12/12 tests pass.

---

## 3.2 Keputusan Scope: Taksonomi Infrastruktur Eksplisit (2026-09-22)

**Keputusan scope:** platform SIMAKIS dibatasi **infrastruktur-only** (sesuai nama:
*Advokasi Kebutuhan Infrastruktur Sekolah*). Kategori non-fisik
(`ketersediaan_tenaga_pengajar`) dihapus karena tidak punya data pembanding
di Dapodik, sehingga tidak bisa diverifikasi sistem.

- **`app/models/laporan.py`** — `KATEGORI_ENUM` diubah dari 3 nilai lama
  (`infrastruktur_sarana`, `ketersediaan_tenaga_pengajar`, `lainnya`) menjadi
  5 kategori infrastruktur eksplisit:
  - `ruang_belajar` — kelas, lab IPA, lab komputer, perpustakaan
  - `sanitasi_air` — WC, air bersih, saluran pembuangan
  - `utilitas` — listrik, internet, penerangan
  - `akses_lahan` — jalan akses, pagar, drainase, halaman
  - `penunjang` — UKS, tempat ibadah, olahraga, kantin, ruang guru
- **`alembic/versions/8cca6e1b2fa3_...py`** — migration ALTER ENUM pada
  `laporan.kategori` dan `klaster.kategori`. Data dummy lama dihapus dulu
  (laporan_foto, vote, status_log, laporan, klaster) agar ALTER tidak gagal
  dengan `Data truncated`.
- **`app/schemas/laporan.py`** — deskripsi field `kategori` diperbarui ke 5 nilai baru.
- **`scripts/setup_f300.py`** — `KATEGORI_OPTIONS`, `LAPORAN_DESKRIPSI` (10 deskripsi
  realistis per kategori), dan `FASILITAS_MAP` diperbarui. Seed jadi distribusi
  merata: **20 laporan per kategori × 5 = 100 laporan**.
- **`docs/universal/INTERFACES.md`** — kontrak `POST /laporan` (request kategori),
  endpoint sanggahan, dan response diperbarui.
- **`docs/backend/AI_PIPELINE_ABLATION_STUDY.md`** — seed categories + contoh
  manual clustering (F3.0a) diselaraskan dengan 5 klaster infrastruktur.

**Verifikasi:**
- `alembic upgrade head` sukses (ENUM baru aktif).
- Re-seed: 100 laporan (20 per kategori) tersebar ke 62 sekolah.
- 12/12 tests pass.

---

## 3.3 Keputusan Desain: Free-Text Laporan + 5 Kategori Hibrida (2026-09-23)

**Keputusan desain:** Laporan warga menggunakan **teks bebas** — tidak ada dropdown
`kategori` di form. AI yang mengelompokkan laporan ke dalam kategori infrastruktur
melalui clustering (IndoBERT + HDBSCAN). Kategori ground truth = **5 kategori hibrida**:

| Kategori | Sumber Data | Literatur Pendukung |
|----------|-------------|---------------------|
| `ruang_belajar` | Dapodik (kondisi_sarana) | Permendiknas 24/2007 (di-Rev. Permendikbudriset 22/2023) |
| `sanitasi_air` | Dapodik + laporan warga | UNICEF/WHO JMP WASH in Schools (SDG 4.a.1) |
| `utilitas` | Dapodik + laporan warga | UNICEF/WHO JMP WASH SDG 4.a.1(a,b) |
| `penunjang` | Dapodik (uks) | Permendiknas 24/2007 (UKS, tempat ibadah) |
| `akses_lahan` | Laporan warga saja | Permendiknas 24/2007 (luas lahan) + NCES FCI (site improvements) |

**Keputusan terkait (8/8):**
1. **`laporan.kategori`** → **HAPUS kolom** (migration drop, hapus dari model/schemas/routers/seed)
2. **Ground truth** → **5 kategori hibrida** (Dapodik 3 + laporan warga 2)
3. **Waktu jalan AI** → **Scheduled cron harian**
4. **Alur verifikasi** → **Review satu per satu** + badge status tampil di publik
5. **Outlier HDBSCAN (-1)** → **Opsi A**: klaster `belum_terklasifikasi` + review verifikator
6. **Label klaster** → **Dua-duanya**: teks bebas (TF-IDF) + enum kategori
7. **Formula skor keparahan** → **Gabungan** `kondisi_dilaporkan` + data Dapodik
8. **Literatur** → **Selesai dicari** (lihat tabel di atas)

**Dampak implementasi:**
- Migration baru: `ALTER TABLE laporan DROP COLUMN kategori`
- Model `Laporan` hapus field `kategori`; `KATEGORI_ENUM` tetap (dipakai `klaster.kategori`)
- Schema Pydantic (`LaporanCreateRequest`) hapus field `kategori`
- Router `laporan.py` hapus 4 referensi `kategori=`
- Seed script: laporan tanpa kategori (teks bebas saja)
- `INTERFACES.md`: hapus `kategori` dari `POST /laporan` contract
- `AI_PIPELINE_ABLATION_STUDY.md`: perbaiki §0.3 (seed = teks bebas) + §1 (ground truth = 5 kategori hibrida)

**Verifikasi rencana:**
- Migration sukses: `alembic upgrade head` tanpa error
- Seed: 100 laporan tanpa kategori, deskripsi teks bebas (50+ kata per laporan)
- `KATEGORI_ENUM` tetap berfungsi di tabel `klaster`
- Tests: 12/12 pass setelah schema update

---

## 3.4 Perbaikan Dokumentasi Ground Truth (Fase B, 2026-09-23) ✅ SELESAI

Dokumentasi keputusan #1–#8 disinkronkan ke seluruh doc backend (teks bebas +
5 kategori hibrida + outlier `belum_terklasifikasi` + dual labeling + skor
gabungan + cron harian + verifikasi 1-per-1/badge):

- **`AI_PIPELINE_ABLATION_STUDY.md`** — §0.3 (seed teks bebas, tanpa kategori) +
  §1 (ground truth 5 kategori hibrida, sumber Dapodik + laporan warga, format JSON)
- **`TASK_GUIDE.md`** — F2.9–F2.11 (hapus `kategori`), F3.00/3.0a (metodologi
  hybrid), F3.3 (outlier), F3.4 (dual label), F3.5 (skor gabungan), F3.6/F3.8
  (cron harian), F3.10 (3 status + badge), F3.19 (badge publik).
- **`CHANGELOG.md`** — §3.3 mencatat 8 keputusan final + literatur.

> **Timeline & urutan pengerjaan Fase 3 tidak lagi di CHANGELOG** — satu-satunya
> sumber ada di **`TASK_GUIDE.md` → "Rencana Eksekusi Fase 3 (Timeline & Urutan
> Pengerjaan)"** di pembuka Fase 3. CHANGELOG hanya mencatat apa yang *sudah*
> direalisasi (Fase B selesai; Fase A/C/D/E/F belum dikerjakan).

**Status:** 5/24 task Fase 3 selesai. **Fase A (drop `kategori`) SELESAI**
(2026-09-23, belum di-commit):

- Migration `c01f4a7b2d09_drop_laporan_kategori.py` — `DROP COLUMN laporan.kategori`
  (down_revision `8cca6e1b2fa3`); `alembic upgrade head` sukses, kolom hilang,
  `klaster.kategori` tetap ada, 100 laporan lama aman.
- `app/models/laporan.py` — field `kategori` dihapus; `KATEGORI_ENUM` dipertahankan
  (dipakai `klaster.py`).
- `app/schemas/laporan.py` — `kategori` dihapus dari `LaporanCreateRequest` +
  `LaporanResponse`.
- `app/routers/laporan.py` — 4 referensi `kategori=` dihapus.
- `app/routers/sanggahan.py` — key `kategori` dihapus dari response.
- `scripts/setup_f300.py` — seed teks bebas (tanpa kategori) + verify breakdown
  kategori dihapus; re-seed 100 laporan sukses.
- `docs/universal/INTERFACES.md` — `kategori` dihapus dari kontrak `POST /laporan`
  (§2.1 + §4 contoh request).
- `tests/test_laporan.py` (baru) — 2 regression test: POST /laporan tanpa kategori
  (201, response tanpa `kategori`) + field kategori diabaikan jika dikirim.

**Verifikasi:** `pytest` → **14 passed** (12 lama + 2 baru). Catatan: response
`POST /laporan` tidak dibungkus `{ data: ... }` (beda dari auth) — pre-existing,
bukan regresi Fase A.

**Selanjutnya:** Fase C (F3.0a manual clustering) — butuh input domain Aris.

---

## 3.5 Penyesuaian Tampilan Detail Sekolah Frontend v1 (2026-09-28)

**Keputusan:** Kartu "Rasio Pendidik" dan "Kapasitas Rombel" di halaman detail sekolah **tidak ditampilkan** di frontend v1 karena data `jumlah_pd`, `jumlah_ptk`, `jumlah_rombel` tidak di-ingest per **scope infrastruktur-only**.

**Alasan:** Platform SIMAKIS v1 fokus pada **infrastructure advocacy** (kondisi fisik sarana/prasarana). Data jumlah siswa, guru, dan rombel tidak terkait langsung dengan ketersediaan infrastruktur fisik.

**Dokumentasi yang diperbarui:**

1. **`docs/universal/INTERFACES.md` §2** — tambah catatan implementasi v1:
   - Field `rasio_guru_siswa`, `rasio_spm_terpenuhi`, `jumlah_pd/ptk/rombel`, `utilitas_kapasitas_belajar` dikirim dengan nilai default (null/0) tapi **tidak dirender** di FE v1.
   - `data_resmi` blok (sumber, tanggal_pembaruan) & `ada_sanggahan` ditandai **belum diimplementasi** di backend v1.
   - `penanda_masalah` saat ini return `"normal"` (bukan `aman|perlu_perhatian|kritis`), threshold belum diputuskan.
   - `jumlah_isu_aktif` saat ini selalu `0` (belum dihitung backend).
   - Aturan render FE: jangan tampilkan angka 0/null dari field yang ditandai "tidak diimplementasi" sebagai angka valid.
   - Frontend v1 hanya tampilkan: (1) Audit Sarpras, (2) Profil Dapodik (akreditasi/kepsek/jenjang/status), (3) Isu & Klaster Warga (empty state sampai Fase D).

2. **`docs/universal/DECISIONS.md`** — tambah **D-20**: Kartu Rasio Pendidik & Kapasitas Rombel di-hide di v1; field API tetap dikirim default tapi FE tidak render; alternatif "isi backend" ditolak untuk v1.

3. **`docs/frontend/TASK_GUIDE.md` F2.6** — update spesifikasi Detail Sekolah: 3 kartu (Audit Sarpras + Profil Dapodik + Isu Klaster), catatan scope v1 (rasio/rombel tidak tampil).

4. **`docs/frontend/MOCK_DATA.md` §3.2** — tambah catatan scope v1: `rasio_guru_siswa` dikirim null/default, FE tidak render.

5. **`docs/universal/PRD.md` FEAT-001** — update requirement: "Pencarian nama/alamat; kondisi sarana; ..." + catatan inline *(rasio guru & data siswa tidak ditampilkan di v1 per scope infrastruktur-only – lihat DECISIONS.md D-20)*.

**Konsekuensi:**
- Backend **tidak perlu ubah kode** — response tetap kirim field dengan nilai default.
- Frontend (Dimas) rombak mockup halaman detail: buang 2 kartu, ganti layout ke 3 kartu di atas.
- PRD FEAT-001 deviasi dicatat (rasio guru tidak tampil di v1).

**Status:** Dokumentasi selesai; koordinasi dengan Dimas pending.

---

## 3.6 Ground Truth Manual Clustering (F3.0a, 2026-09-29) ✅ SELESAI

Ground truth manual untuk evaluasi AI pipeline selesai dibuat dengan metodologi 5 kategori hibrida:

**Output:** `backend/app/ai_pipeline/experiments/manual_clusters.json`
- 62 sekolah terkategorisasi ke 5 kategori
- Distribusi: ruang_belajar 37, sanitasi_air 13, akses_lahan 6, utilitas 4, penunjang 2
- Scoring: rasio kerusakan (% rusak/total unit) Dapodik + mention laporan teks
- 27 tie-breaker cases (dokumentasi otomatis untuk review domain)

**Script:** `backend/app/ai_pipeline/experiments/generate_ground_truth.py`
- Baca `kondisi_sarana` + `laporan` teks bebas
- Mapping Dapodik: ruang_belajar (kelas/lab/perpus), sanitasi_air (WC), penunjang (UKS/ibadah)
- Kategori teks: utilitas (listrik/internet), akses_lahan (jalan/pagar/drainase)

**Deliverable:** Ground truth siap sebagai benchmark evaluasi F3.1–F3.5 (AI pipeline ablation study).

---

## 3.10 AI Pipeline Endpoints — F3.6, F3.8, F3.9, F3.10 (2026-09-29) ✅ SELESAI

**Tujuan:** Enable AI pipeline integration via scheduled cron (F3.6) dan REST API endpoints (F3.8–F3.10).

- **F3.6 (Cron script):** `backend/scripts/run_clustering.py` — batch processing harian 02:00 WIB untuk laporan `klaster_id IS NULL`, dikelompokkan per sekolah, menjalankan pipeline & kalkulasi skor prioritas.
- **F3.8 (Manual Trigger):** `POST /ai/cluster` (admin, verifikator_dinas) — fallback manual rerun.
- **F3.9 (Status Pipeline):** `GET /ai/status` — cek jumlah unclustered laporan & total klaster.
- **F3.10 (Verifikasi Klaster):** `PUT /klaster/{klaster_id}/verifikasi` (verifikator_dinas) — update status (`terverifikasi`, `tidak_terverifikasi`, `perlu_info_tambahan`) + append ke `StatusLog`.

**File baru:**
- `backend/scripts/run_clustering.py`
- `backend/app/routers/klaster.py`
- `backend/tests/test_klaster.py`

---

## 3.11 Envelope Respons & Inventaris Endpoint (2026-09-30) ✅ SELESAI

**Tujuan:** Samakan bentuk respons backend dengan kontrak `INTERFACES.md` §0.1/§0.3 sebelum FE integrasi.

- **Respons sukses:** hapus field `success: true` dari semua router (`klaster`, `vote`, `dashboard`, `audit`); `message` dipindah ke dalam `data`. Sekarang konsisten `{ data, meta? }`.
- **Respons gagal:** exception handler global di `app/main.py` — `HTTPException` → `{ error: { code, message } }` dengan mapping kode standar §0.3 (`VALIDATION_ERROR/UNAUTHORIZED/FORBIDDEN/NOT_FOUND/ALREADY_VOTED/REASON_REQUIRED/INTERNAL_ERROR`); `RequestValidationError` (pydantic) → 400 `VALIDATION_ERROR` + `details` per-field (sebelumnya 422 bawaan FastAPI).
- **Test:** 39/39 pass — fix fixture `login()` di `test_klaster.py` (baca envelope `data`), assert menyesuaikan envelope baru.
- **`docs/frontend/API_CLIENT.md`:** inventaris 26 endpoint aktif + tabel perbedaan path backend vs `INTERFACES.md` (vote/riwayat/upload) + catat `GET /klaster` & `GET /klaster/{id}` **belum ada** di backend.

**Commit:** `b90b2ae` (backend), `c47cd25` (docs).

---

## Status Fase 3

### A. FEAT-004 — Klasterisasi Isu (AI Pipeline)

| Task | Status |
|------|--------|
| F3.00 — Setup & Prerequisites for Ablation Study | ✅ Selesai |
| F3.0a — Manual Clustering (Ground Truth) | ✅ Selesai (29 Sep 2026) |
| F3.0b — Implementasi Ablation Framework | ✅ Selesai (29 Sep 2026) |
| F3.0c — Running Test Suite A (Embedding Variations) | ✅ Selesai (29 Sep 2026) |
| F3.0d — Running Test Suite B (TF-IDF Baseline + MiniLM) | ✅ Selesai (29 Sep 2026) |
| F3.0e — Analysis & Reporting | ✅ Selesai (29 Sep 2026) |
| F3.0f — Implementation of Optimal Config | ✅ Selesai (29 Sep 2026) |
| F3.1 — Embedding Teks (default TF-IDF per ablation, dukung indobert/minilm) | ✅ Selesai (29 Sep 2026) |
| F3.2 — Reduksi Dimensi UMAP (n_components=10) | ✅ Selesai (29 Sep 2026) |
| F3.3 — Clustering HDBSCAN (min_cluster_size=3, min_samples=2) | ✅ Selesai (29 Sep 2026) |
| F3.4 — Labeling TF-IDF (unigram + mapping 5 kategori) | ✅ Selesai (29 Sep 2026) |
| F3.5 — Formula Urgensi KBM + Skor Prioritas (0.7×laporan + 0.3×Dapodik + vote) | ✅ Selesai (29 Sep 2026) |
| F3.6 — Async Task Queue (cron harian 02:00 WIB + manual trigger) | ✅ Selesai (29 Sep 2026) |
| F3.7 — Model SQLAlchemy (Klaster) | ✅ Selesai (dari F1.2) |
| F3.8 — Endpoint Trigger Clustering (POST /ai/cluster) | ✅ Selesai (29 Sep 2026) |
| F3.9 — Endpoint Status Pipeline (GET /ai/status) | ✅ Selesai (29 Sep 2026) |
| F3.10 — Verifikasi Klaster (PUT /klaster/{id}/verifikasi) | ✅ Selesai (29 Sep 2026) |

### B. FEAT-005 — Voting Prioritas

| Task | Status |
|------|--------|
| F3.11 — Model SQLAlchemy (Vote) | ✅ Selesai (dari F1.2) |
| F3.12 — Vote Baru (POST /vote) | ✅ Selesai (30 Sep 2026) |
| F3.13 — Cek Status Vote (GET /vote/status/{klaster_id}) | ✅ Selesai (30 Sep 2026) |
| F3.14 — Hitung Ulang Skor Prioritas (PUT /klaster/{id}/skor) | ✅ Selesai (30 Sep 2026) |
| F3.15 — Override Prioritas (PUT /klaster/{id}/override) | ✅ Selesai (30 Sep 2026) |

### C. FEAT-006 — Accountability / Status

| Task | Status |
|------|--------|
| F3.16 — Model SQLAlchemy (Status Log) | ✅ Selesai (dari F1.2) |
| F3.17 — Update Status (POST /klaster/{id}/status) | ✅ Selesai (30 Sep 2026) |
| F3.18 — Riwayat Status (GET /klaster/{id}/riwayat) | ✅ Selesai (30 Sep 2026) |
| F3.19 — Dashboard Prioritas (GET /dashboard/prioritas) | ✅ Selesai (30 Sep 2026) |
| F3.20 — Model SQLAlchemy (Audit Log) | ✅ Selesai (dari F1.2) |
| F3.21 — Logging Aksi Sensitif (core/audit.py + GET /audit/log) | ✅ Selesai (30 Sep 2026) |
| F3.22 — Dashboard Wilayah (GET /dashboard/wilayah) | ✅ Selesai (30 Sep 2026) |

**Progress Fase 3: 29/29 task selesai (SEMUA SELESAI!).**

---

## 3.12 Temuan Database & Persiapan Fase 4 (2026-09-30)

**Temuan:**
- Pengecekan database `simakis` menunjukkan tabel kosong (hanya tersisa `alembic_version`). Seluruh data sekolah, laporan, klaster, user, dan vote ter-drop sebelumnya.
- Data eksperimen AI (`backend/app/ai_pipeline/experiments/`) dan script seed (`setup_f300.py`, `run_clustering.py`) tetap aman dan utuh.

**Keputusan / Tindakan (F4.0 — Prasyarat Integrasi):**
- Menambahkan **F4.0** di `TASK_GUIDE.md` sebagai prasyarat wajib sebelum integrasi frontend ↔ backend:
  1. `alembic upgrade head`
  2. Ingest CSV Dapodik (62 sekolah)
  3. Seed laporan dummy (100 laporan, `setup_f300.py`)
  4. Jalankan AI clustering (`run_clustering.py` atau POST `/ai/cluster`)
  5. Verifikasi respon non-kosong

---

## 3.13 F3.23 — Desain & Eksekusi Eksperimen Augmentasi Data (2026-10-02/03) ✅ SELESAI

**Konteks:** Atas saran dosen, ablation awal perlu dibandingkan pada jumlah
laporan **sedikit vs banyak**. Analisis data awal: 100 laporan dummy dibuat
dari hanya **54 kalimat template** (`setup_f300.py`) → kosakata sangat berulang
dan menguntungkan TF-IDF; neural (IndoBERT/MiniLM) kalah sebelum sempat
bersinar. Pencarian dataset pengaduan nyata berlabel (Mendeley/LAPOR!/
JAKI/Kaggle/Zenodo) nihil yang sesuai domain sarpras → keputusan **jalur
augmentasi + template sendiri**.

**Task baru: F3.23** (sekarang **SELESAI**):
- `generate_augmented.py` — script memperluas 54 template → 185 template unik dengan 5 teknik variasi (sinonim, parafrase, gaya, konteks, gabung_topik).
- `dataset_aug_{45,150,500,1500}.json` — 4 dataset dengan distribusi kategori seimbang.
- `run_scale_sweep.py` — runner evaluasi 24 kombinasi (3 embedding × 2 UMAP) × skala.
- `results_scale/` — 24 result JSON + `summary_scale.csv` (all NMI/Purity/Clustering metrics).

**Hasil Utama:**
- **n=45:** Neural (A1+B2) unggul NMI 0.65 (TF-IDF 0.46). Variasi semantik membuat neural bersinar.
- **n=150:** Neural (A1+B2) NMI 0.64, MiniLM (A3+B2) 0.63, TF-IDF (A2+B2) 0.62 — **sangat kompetitif**.
- **n=500:** TF-IDF (A2+B1) NMI 0.58 (terbaik), neural sekitar 0.55–0.57 — **saling sengit**.
- **n=1500:** Semua metode **converge** ke NMI ~0.47–0.49, purity 1.00; **TF-IDF 10x lebih cepat** (6.6s vs 40–60s).
- **UMAP penting** di skala besar: noise ratio turun dari ~17% tanpa UMAP menjadi ~5% dengan UMAP.

**Keputusan:** Kembangkan **A2+B1+C2+D1** sebagai config default production (TF-IDF + UMAP 10 + HDBSCAN 3/2). Neural untuk phase lanjutan jika butuh fine-tuning.

**Verifikasi:**
- `pytest tests/`: **39 passed** ✅
- DB: 62 sekolah + 600 laporan (100 seed + 500 augmentasi) ✅
- Database re-seed F4.0 selesai (alembic upgrade head, ingest CSV, seed laporan, clustering) ✅

---

## 3.14 F4.0 Re-seed Database & F3.23 Insert Laporan (2026-10-03) ✅ SELESAI

**Masalah:** Database `simakis` hanya berisi `alembic_version` (tabel aplikasi ter-drop).

**Penyelesaian:**
- `alembic upgrade head` → 12 tabel aplikasi terbuat.
- `scripts/setup_f300.py` → 62 sekolah, 304 kondisi_sarana, 100 laporan.
- `scripts/run_clustering.py` → initial clustering selesai.
- `insert_augmented_laporan.py` → 500 laporan augmentasi di-DB.
- **Total:** 62 sekolah, **600 laporan** (100+500), 1 admin user (`admin@simakis.id`).

---

### 3.14 F4.0 Re-seed & Clustering Pipeline Fixes (2026-10-05) ✅ SELESAI

**Masalah yang Ditemukan (5 Okt 2026):**
1. **Bug rollback kaskade (Factor 1):** `scripts/run_clustering.py` memproses 62 sekolah dalam 1 transaksi → 1 error → `db.rollback()` menghapus kerja semua sekolah sebelumnya. Output "Created 83 klaster" tapi DB hanya 26.
2. **Crash UMAP spectral (Factor 2):** Sekolah dengan ≤11 laporan → `scipy.linalg.eigh` crash → sekolah di-skip utuh.
3. **Test isolation gagal (Factor 3):** `tests/test_klaster.py` fixture `drop_all(bind=engine)` menghapus seluruh tabel DB produksi `simakis` setiap pytest jalan. Ini menjelaskan temuan 30 Sep "DB hanya alembic_version".

**Perbaikan:**
1. **Per-school commit** (`run_clustering.py:160`): pindahkan `db.commit()` ke dalam loop sekolah → rollback hanya sekolah yang error.
2. **Index tracking fix** (`run_clustering.py:91–96`): perbaiki mapping `labels[idx]` agar pakai `text_idx` bukan `idx` (prevent index misalignment jika ada laporan tanpa deskripsi).
3. **UMAP spectral guard** (`reduction.py:52–61`): jika `n_samples < n_components+2` pakai `init='random'` + adaptive `n_components = min(n_components, n_samples-1)`.
4. **Test isolation** (`tests/conftest.py` baru + `test_klaster.py` update): tests pakai DB terpisah `simakis_test` via fixtures; production DB tidak lagi disinggung.

**Hasil Verifikasi:**
- **600/600 laporan clustered** (0 unlinked), 100 klaster created
- **Pytest 39/39 passed** → production DB tetap 600 laporan, 100 klaster (tidak berubah)
- Test DB `simakis_test` terisolasi sepenuhnya

**File yang Diubah:**
- `scripts/run_clustering.py` (per-school commit, index tracking)
- `app/ai_pipeline/reduction.py` (UMAP spectral guard)
- `tests/conftest.py` (baru: test fixtures untuk simakis_test)
- `tests/test_klaster.py` (update fixtures, hapus `setup_db` yang drop_all)

---

### 3.15 F4.3 — Evaluasi Klasterisasi (2026-10-05) ✅ SELESAI (metrik otomatis)

**Deliverable:** Skor metrik positif, mayoritas klaster relevan.

**Eksekusi:** `scripts/evaluate_clustering.py` (baru) — metrik dihitung terhadap
assignment klaster **di DB produksi** (bukan rerun), embeddings dihitung ulang
dengan konfigurasi pipeline sama (TF-IDF 300 + UMAP 10).

**Hasil (600 laporan, 100 klaster, 62 sekolah):**

| Metrik | Nilai | Interpretasi |
|---|---|---|
| Silhouette (rata-rata 20 sekolah multi-klaster) | **+0.1385** | positif → di atas random, tapi masih lemah |
| Davies-Bouldin (rata-rata 20 sekolah) | **1.5364** | < 2.0 = klaster cukup terpisah |
| Silhouette global (600 laporan) | −0.5683 | **tidak bermakna** — label klaster unik per sekolah, jarak antar-sekolah bukan ruang klaster yang sama; hanya sekolah ≥2 klaster yang valid |
| Sekolah multi-klaster (silhouette terhitung) | 20 / 62 | 42 sekolah = 1 klaster (metrik undefined) |
| Kategori klaster | 75 belum_terklasifikasi, 14 ruang_belajar, 5 sanitasi_air, 5 utilitas, 1 akses_lahan | noise HDBSCAN mayoritas |

**Kesimpulan:**
- ✅ Silhouette positif & DB-index < 2 → **deliverable "skor metrik positif" terpenuhi**.
- ⚠️ Kekuatan klaster masih lemah (0.14) — konsisten dengan 75/100 klaster =
  hasil noise (`min_cluster_size=3` ketat untuk data 5–16 laporan/sekolah).
- ⏳ **Validasi manual oleh Verifikator** (bagian F4.3 ketiga) menunggu F4.1
  integrasi FE↔BE — endpoint `/api/klaster/{id}/verifikasi` sudah ada.

---

### 3.16 F4.5 — Dokumentasi API Final (2026-10-05) ✅ SELESAI

**Deliverable:** Swagger + `INTERFACES.md` sinkron dengan kode.

**Keputusan:** sinkronisasi **kode → kontrak** (pilihan Aris: backend tidak
diubah karena sudah tested & committed; `INTERFACES.md` mengikuti path aktual).

**Perubahan:**
1. **2 endpoint baru diimplementasi** (`app/routers/klaster.py`):
   - `GET /klaster` — list klaster publik, filter `sekolah_npsn`/`kategori`/`status_verifikasi`, pagination §0.2, urut `skor_prioritas` desc.
   - `GET /klaster/{id}` — detail klaster + `sekolah_nama` + daftar laporan anggota (untuk halaman Detail Klaster, `PAGE_STATES.md` §A3).
2. **`INTERFACES.md` ditulis ulang** mengikuti kode:
   - §3: + `GET /dashboard/prioritas`; §5: path `PUT /klaster/{id}/verifikasi` (query-param) + `/ai/cluster` + `/ai/status`; §6: pindah ke `/vote/*` (query-param) + `PUT /vote/klaster/{id}/skor`; §7: `POST /klaster/{id}/status` + `GET /klaster/{id}/riwayat` + `PUT /vote/.../override`; §10: `POST /upload/laporan?laporan_id=` + `DELETE /upload/{storage_key}`; §0: health check `GET /`, `/health`, `/api/health`.
   - Deviasi lama (path vote/foto/riwayat, method PATCH→PUT/POST, body→query-param) dihapus — kontrak = kode.
3. **`API_CLIENT.md` §4**: tabel deviasi lama ditandai "sudah sinkron (F4.5)".
4. **TASK_GUIDE F4.5** ditandai ✅ dengan catatan eksekusi.

**Verifikasi:**
- 31 endpoint di `openapi.json` = 31 endpoint terdokumentasi (sehat: 3 health + 28 API).
- Pytest **39/39 passed** (endpoint baru lolos import/route tanpa memutus test lama).
- Diff `comm` kode vs `INTERFACES.md`: 0 selisih nyata (hanya notasi `{id}` vs `{klaster_id}`).

**Belum/Follow-up:**
- Schema `backend/app/schemas/` belum diwajibkan mengikuti §0.1 (catatan header INTERFACES) — audit terpisah.
- §11 "Yang Belum Diputuskan" tetap berlaku (batas ukuran foto, masa tunda vote, dll).

---

### 3.17 F4.6 — Docker Compose (2026-10-05) ✅ SELESAI

**Deliverable:** `docker-compose.yml` untuk deploy.

**File baru (4):**
- `docker-compose.yml` — 3 service sesuai `DEPLOYMENT.md` §2: `backend` (build `./backend`, port 8000, `depends_on` mysql sehat), `mysql:8` (volume `mysql_data`, credentials dari env), `minio/minio` (volume `minio_data`, console :9001) + network `simakis-network`.
- `backend/Dockerfile` — multi-stage, Python 3.14 slim, pre-download model embedding `paraphrase-multilingual-MiniLM-L12-v2` saat build (catatan `DEPLOYMENT.md` §6), non-root user, `HEALTHCHECK` ke `/api/health`, uvicorn workers=1.
- `.dockerignore` — exclude venv/.env/cache/tests/frontend.
- `.env.production.example` — template env produksi (JWT_SECRET & PDP_ENCRYPTION_KEY wajib diganti, `DATABASE_URL` mengarah ke service `mysql`, lihat `DEPLOYMENT.md` §4).

**Verifikasi:** Docker tidak tersedia di WSL lokal → validasi syntax manual
(setara `docker compose config` ditunda ke server deploy). Deploy manual:
`docker compose --env-file .env.production up -d --build` lalu
`docker compose exec backend alembic upgrade head` (`DEPLOYMENT.md` §5).

---

## Catatan Terbuka

- [ ] **F3.23 Fine-tuning Neural** — jika ingin meningkatkan performa neural di atas NMI 0.47–0.58, perlu fine-tuning IndoBERT/MiniLM dengan domain data.
      `n = 45 → 150 → 500 → 1.500` (desain sudah ada di TASK_GUIDE/AIP §9).
- [x] **F4.0 Re-seed database & clustering pipeline fix** — ✅ SELESAI (5 Okt 2026): 62 sekolah, 600 laporan, 100 klaster, pipeline robust ke error per-sekolah.
- [ ] Hapus scraper versi lama (`intercept_dapo.py`, `scrape_sekolah.py`,
      `_v2.py`, `_v3.py`) dan file raw sisa (`debug_page.html`, dll).
- [ ] Task queue AI Pipeline: BackgroundTasks / Celery / RQ.
- [ ] JWT rotation: perlu refresh_token? — *sebagian sudah dijawab: refresh
      token diimplementasikan (F2.1); pertanyaan rotation policy masih terbuka.*
- [ ] S3 URL: presigned (privat) atau publik?
- [ ] Retention policy `audit_log` dan `status_log`.