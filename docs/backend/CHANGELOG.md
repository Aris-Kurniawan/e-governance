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
   — **SUPERSEDED (8 Okt 2026)**, lihat `DECISIONS.md` **D-21**: noise tidak lagi menjadi
   klaster; laporan tanpa klaster ditangani lewat `GET /laporan/perlu-review`.
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

### 3.18 F4.2 + F4.4 — Black-box Testing & Fix Bug (2026-10-05) ✅ SELESAI

**F4.2 — Black-box Testing (sisi backend):** `backend/tests/test_blackbox.py` — 48 skenario dalam 9 kelas:

| Kelas | Cakupan |
|---|---|
| HealthAndErrorEnvelope | `GET /`, `/health`, bentuk `{"error":{code,message}}` |
| AuthFlow | register → login → `/auth/me`, 401 tanpa token, 400 payload salah |
| SekolahPublic | list `data`+`meta`, detail `data`, 404, 422 pagination |
| LaporanFlow | create 201, 404 sekolah tak ada, riwayat owner-only, detail 201/403/404 |
| KlasterPublic | envelope `data`+`meta`, filter kategori, 404 (endpoint F4.5) |
| VoteFlow | vote 201, `ALREADY_VOTED` 409, override admin tanpa alasan 422, non-admin 403 |
| VerifikasiStatus | verifikasi `data.status`, tolak tanpa alasan 422, riwayat |
| DashboardAudit | 3 endpoint dashboard publik, `/audit/log` admin 200/non-admin 403 |
| AIUpload | 401 tanpa token, upload ke laporan inexisten 404 |

Hasil pertama: **40/47 lulus → 7 gagal = 4 bug nyata** (skenario error/edge ketemu),
ditambah 1 temuan audit kontrak (lihat #5).

**F4.4 — 5 temuan diperbaiki:**

1. **Crash MySQL `NULLS LAST`** — `col.desc().nullslast()` dirender harfiah oleh MySQL → syntax error 1064 → 500 di `GET /klaster` (list), `GET /dashboard/prioritas`, `GET /dashboard/wilayah` (di SQLite lulus, jadi lolos selama ini). Fix: `col IS NULL, col DESC` (kompatibel lintas-DB): `dashboard.py:34,78`, `klaster.py:217`.
2. **Crash `GET /audit/log`** — `select(AuditLog).count()` API SQLAlchemy 1.x → `AttributeError` 500. Fix: `select(func.count()).select_from(AuditLog)` (`audit.py:31`).
3. **Envelope `data` belum diterapkan (sisa F3.11)** — `POST /laporan`, `GET /laporan/{id}`, `GET /sekolah/{npsn}` masih respons rata, melanggar INTERFACES §0.1. Fix: bungkus `{"data": ...}` + lepas `response_model` di 3 endpoint.
4. **`GET /sekolah/{npsn}/sanggahan` minta login** — kode pakai `get_current_user`, INTERFACES §2.1 menyatakan **Publik**. Fix: lepas dependensi auth (riwayat sanggahan bersifat publik).
5. **`GET /dashboard/wilayah` terbuka padahal spec = dinas** — TASK_GUIDE F3.22, PRD FEAT-002, dan INTERFACES §3 semua menetapkan `verifikator_dinas`/`kepala_dinas`, tapi endpoint tidak ada guard (kebalik dari #4). Fix: pasang `RoleChecker(["verifikator_dinas", "kepala_dinas"])` (`dashboard.py`).

**Test penyesuaian:** `test_laporan.py` (2 asersi ikut bentuk baru `data`), `test_blackbox.py` (create/detail laporan + `/dashboard/wilayah` jadi 401/200 sesuai spec).

**Verifikasi akhir:**
- Pytest **87/87 lulus** (39 existing + 48 blackbox), 0 gagal.
- DB prod `simakis` tak tersentuh (600 laporan, 100 klaster, tests memakai `simakis_test`).
- Diff bersih: 26+/22− baris (kode+test), tanpa noise line-ending.

**Catatan:** temuan baru dari pengujian FE (F4.1 bersama Dimas) → buka F4.4 lanjutan.

---

### 3.19 F4.4 (lanjutan) — Fix Bug Verifikasi Klaster: Enum & Kolom Status (2026-10-08) ✅ SELESAI

**Gejala:** klik "Tandai Kejadian Baru" (dan aksi lain ke `perlu_info_tambahan`) gagal 500; daftar klaster tidak ter-refresh setelah aksi.

**3 bug diperbaiki:**
1. `models/klaster.py` — `STATUS_KLASTER_ENUM` (3 nilai) vs `klaster.status_verifikasi` live (4 nilai) → MySQL 1265 Data truncated saat insert `perlu_info_tambahan`. Ditambah nilai ke-4.
2. **Migration baru** `alembic/versions/d4f8c2a91e05_tambah_perlu_info_tambahan_status_klaster.py` (down_rev `c01f4a7b2d09`, ALTER MySQL conditional) — sudah dijalankan di DB live; tutup drift enum.
3. `routers/klaster.py` `update_status` — semua status ditulis ke `status_penanganan` → sekarang keluarga verifikasi (`terverifikasi`/`tidak_terverifikasi`/`perlu_info_tambahan`) ditulis ke `status_verifikasi`, sisanya `status_penanganan`.
4. FE `AntrianValidasi.tsx` — `decisionFeedback` bertipe sukses/gagal (error merah tanpa auto-dismiss), `refetchList()` setelah sukses (klaster pindah tab tanpa reload).

**Verifikasi:** pytest **88/88** lulus; smoke Chromium alur verifikasi penuh lulus (0 pageerror); DB prod tidak terganggu (klaster uji dikembalikan ke `terverifikasi`).

---

### 3.20 SQL Dump & Panduan Impor Database untuk Rekan Tim (2026-10-08) ✅ SELESAI

**Deliverable:**
- `database/simakis.sql` (254 KB) — dump `mysqldump --single-transaction` DB `simakis`: 13 tabel, 62 sekolah, 600 laporan, 100 klaster, 3 akun dev, alembic `d4f8c2a91e05`. Tidak berisi view/routine.
- `docs/backend/SETUP.md` §5a — langkah impor (`mysql simakis < database/simakis.sql`), tabel isi dump, `.env` yang **wajib sama** antar mesin (`PDP_ENCRYPTION_KEY` — ganti = NIK di `pdp_vault` tidak terdekripsi; `DATABASE_URL` disesuaikan), troubleshooting 4 gejala umum.

**Verifikasi:** dump diimpor ke DB sementara `simakis_import_check` → semua row count cocok (62/600/100/3, enum `status_verifikasi` 4 nilai, alembic version cocok), lalu DB sementara dihapus.

**Catatan:** `PDP_ENCRYPTION_KEY` & `JWT_SECRET` di `backend/.env` dev = default `.env.example` (disengaja, agar enkripsi NIK bisa didekripsi lintas mesin). Untuk produksi keduanya wajib diganti (`DEPLOYMENT.md` §4).

---

### 3.21 F4.7 (RENCANA) — Klasterisasi Tanpa "Belum Terklasifikasi" + Fallback Laporan ke Admin/Kepala (2026-10-08) → diimplementasikan 13 Okt, lihat §3.22

**Status:** spesifikasi — **implementasi & hasil verifikasi di §3.22**. Spesifikasi lengkap di `docs/backend/TASK_GUIDE.md` **F4.7**; keputusan desain di `docs/universal/DECISIONS.md` **D-21** (menggantikan Keputusan #5 Opsi A di §3.3).

**Temuan audit (DB `simakis`, 8 Okt 2026):**

| Jenis | Klaster | Laporan |
|---|---|---|
| Noise HDBSCAN (`-1`) → record Klaster "Belum Terklasifikasi" | 57 | 398 |
| Label-fallback (klaster nyata, kategori gagal dipetakan `labeling.py:98`) | 18 | 97 |
| **Total kategori `belum_terklasifikasi`** | **75 dari 100** | **495 dari 600** |
| Klaster valid (5 kategori) | 25 | 105 |

**Akar masalah:** `scripts/run_clustering.py:109-112` dan trigger manual `POST /ai/cluster` (`routers/klaster.py`) sama-sama membuat record `Klaster` untuk label `-1`, hasil dari **Keputusan #5 Opsi A** (§3.3, 23 Sep 2026). Ini **bertentangan dengan metodologi ablation** — `experiments/evaluation.py` mengecualikan noise dari NMI/ARI/purity dan tidak menghitungnya sebagai klaster (hanya melaporkan `noise_ratio`).

**Rencana perubahan (7 langkah, estimasi 1 hari):**

1. Migrasi Alembic: kolom `laporan.hasil_klasterisasi` ENUM(`belum_diproses`, `terklaster`, `noise`) sebagai **penanda anti-loop** — tanpa ini cron 02:00 akan re-cluster 398 laporan noise setiap hari — plus backfill 3 langkah (noise → `klaster_id = NULL` + `'noise'`, hapus 57 klaster noise, sisa 202 → `'terklaster'`).
2. `run_clustering.py` + `routers/klaster.py`: `cluster_id == -1` → skip pembuatan record Klaster, tandai laporan `'noise'`; query cron jadi `WHERE hasil_klasterisasi = 'belum_diproses'`.
3. `GET /klaster`: default menyembunyikan `kategori = belum_terklasifikasi` (filter eksplisit tetap dilayani).
4. `routers/laporan.py`: `GET /laporan/perlu-review` (495 laporan: `klaster_id IS NULL` atau klaster fallback) + `PUT /laporan/{id}/status` (update `status_sanggahan`) — RBAC `admin` + `kepala_dinas`.
5. Kontrak: `INTERFACES.md` §2 + `DECISIONS.md` D-21.
6. Test blackbox: filter `GET /klaster`, RBAC 403 kedua endpoint, `PUT status`.
7. Regenerate `database/simakis.sql` + update count di `SETUP.md` §5a.

**Keputusan yang dicatat:** (1) record klaster noise dihapus, laporan tidak dihapus; (2) 18 klaster label-fallback disembunyikan tapi recordnya dipertahankan dan laporannya masuk endpoint fallback; (3) scope v1 backend/endpoint saja, FE menyusul (Dimas); (4) sekalian aksi verifikasi manual; (5) RBAC `admin` + `kepala_dinas`.

**Dampak ke FE (untuk briefing Dimas):** angka turunan `GET /klaster` berubah dari 100 → 25 klaster (DashboardWilayah, TabelVerifikasi, AntrianValidasi, peta sebaran).

**Issue terpisah (di luar scope F4.7):** kualitas labeling D1 — label unigram tercemar stopword (mis. "dan tidak hancur sudah sejak") dan keyword mapping 5 kategori yang bolong; ini penyebab 18 klaster label-fallback.

---

### 3.22 F4.7 Implementasi — Klasterisasi Tanpa "Belum Terklasifikasi" + Fallback Laporan (2026-10-13) ✅ SELESAI

**Deliverable (7 langkah §3.21, semua selesai):**

1. Migrasi `a7f3c91e5b2d_add_hasil_klasterisasi.py` (`down_revision=d4f8c2a91e05`, head): kolom `laporan.hasil_klasterisasi` ENUM(`belum_diproses`,`terklaster`,`noise`) sebagai penanda anti-loop + backfill 3 langkah FK-safe (lepas laporan → hapus 57 klaster noise → tandai 202 sisa `terklaster`). Guard MySQL-only seperti migrasi sebelumnya.
2. `app/models/laporan.py`: kolom baru (file CRLF dipertahankan; `git diff --numstat` 10/0).
3. `scripts/run_clustering.py` + `app/routers/klaster.py` (`run_clustering_sync`, kode duplikat — keduanya diubah seragam): seleksi `WHERE hasil_klasterisasi='belum_diproses'`; `cluster_id == -1` → **skip** record Klaster, laporan ditandai `noise`; klaster valid → `terklaster`; fallback aman laporan tanpa teks → `noise`; `?force_reprocess=true` ikut mereset penanda.
4. `GET /klaster` (list): default `kategori != 'belum_terklasifikasi'`; `?kategori=belum_terklasifikasi` eksplisit tetap dilayani; `GET /klaster/{id}` tidak diubah.
5. `app/routers/laporan.py`: **`GET /laporan/perlu-review`** (RBAC `admin`+`kepala_dinas`, envelope `{data,meta}` §0.2, 495 laporan) + **`PUT /laporan/{id}/status`** (update `status_sanggahan`; enum divalidasi manual → 422). Keduanya dideklarasikan sebelum `GET /laporan/{id}`.
6. Test `tests/test_blackbox.py` +7 → **pytest 95/95 lulus**.
7. `INTERFACES.md` §4 (2 endpoint baru) + §5 (catatan filter default); dump `database/simakis.sql` diregenerate + `SETUP.md` §5a.

**Verifikasi (DB `simakis`, 13 Okt 2026):**

| Cek | Hasil |
|---|---|
| `alembic current` | `a7f3c91e5b2d` (head) |
| `klaster` | 100 → **43** (18 label-fallback) |
| `laporan` | 600 utuh — `noise` **398**, `terklaster` **202**, `klaster_id IS NULL` **398** |
| `GET /klaster` default / `?kategori=belum_terklasifikasi` | **25** / **18** |
| `GET /laporan/perlu-review` (admin) | **495** |
| RBAC live | anon **401**, verifikator **403**, admin **200** |
| `PUT .../status` | valid **200**, nilai di luar enum **422**, id tak dikenal **404** |
| Anti-loop (cron `scripts/run_clustering.py`) | `No unclustered laporan. Exiting.` — 0 baris dipilih |
| Dump impor ke `simakis_import_check` | 62 / 600 / 43, `noise`=398, alembic `a7f3c91e5b2d` |

**Penyimpangan kecil yang disengaja:** respons PUT tanpa `updated_at` (kolom tidak ada di model `Laporan`); validasi enum manual 422 (handler global `RequestValidationError` → 400); `force_reprocess` ikut reset penanda; laporan tanpa teks ditandai `noise`. Detail di `TASK_GUIDE.md` F4.7 "Hasil implementasi".

**Dampak FE (briefing Dimas):** angka `GET /klaster` turun 100 → 25; laporan noise tak punya `klaster_id` lagi; halaman fallback baru (`/laporan/perlu-review`, `PUT .../status`) menyusul di FE.

---

### 3.23 Koordinat Sekolah (`lintang`/`bujur`) — Isian Dapodik & Ekspos API (2026-10-13) → SELESAI

**Latar:** halaman Peta Sebaran (`/dinas/peta`) butuh titik sekolah, tetapi kolom `sekolah.lintang`/`bujur` kosong semua (62 NULL di dump) dan tidak dikirim API §2.

**Deliverable:**
- **Data:** 59 dari 62 sekolah Kec. Lamongan diisi koordinat nyata dari API Dapodik (`/api/detail-sekolah?npsn=` via token publik `VITE_API_TOKEN` di `/env.js` portal Dapodik; 0 mismatch nama↔NPSN). 3 sekolah (`70040020`, `70062428`, `70063774`) tidak punya koordinat di Dapodik → tetap `NULL` (**tidak dibuat titik rekaan**, konsisten AGENTS.md §Scope). Isian via script one-off (tidak di-commit).
- **`app/schemas/sekolah.py`:** `SekolahResponse` + field `lintang: Optional[float]`, `bujur: Optional[float]` (di-inherit `SekolahDetailResponse`).
- **`app/routers/sekolah.py`:** `GET /sekolah` (list) & `GET /sekolah/{npsn}` (detail) mengisi kedua field (`float(...)` dari `Decimal`, `None` bila kosong).
- **`docs/universal/INTERFACES.md` §2:** contoh response list & detail ditambah `lintang`/`bujur` + aturan render: `null` = tanpa koordinat, FE dilarang membuat pseudo-koordinat.

**Verifikasi:** pytest **88/88** lulus (DB test `simakis_test` dibuat sekali di mesin dev); smoke `GET /sekolah?page_size=2` & `/sekolah/{npsn}` membalas koordinat; FE build hijau.

---

### 3.24 F4.8 — Skor Dampak KBM per Sekolah (2026-10-13) ✅ SELESAI

**Deliverable:**

1. `app/ai_pipeline/scoring.py`: `SEVERITY_MAP` + `calculate_kbm_score()` + `kbm_level()`; `calculate_priority_score` direfaktor pakai `SEVERITY_MAP`.
2. `app/routers/laporan.py`: `GET /laporan/skor-kbm` (dideklarasi sebelum `/{laporan_id}`), envelope `{data: {ringkasan, sekolah}}`, RBAC `admin|verifikator_dinas|kepala_dinas`.
3. `tests/test_blackbox.py`: `TestSkorKbmF48` (RBAC 401/403/200×2, shape+bounds, formula deterministik 70.0 & 76.2) → **pytest 98/98**.
4. FE: `types.ts` (+`SkorKbmData` dll), `laporan.ts` (+`getSkorKbm()`), `LaporanSkorKbm.tsx` di-rewrite penuh wiring live + 11 penggantian widget (lihat TASK_GUIDE §F4.8).
5. Docs: INTERFACES §4 (+baris tabel +response example), TASK_GUIDE F4.8, D-22 di DECISIONS.md.

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `GET /laporan/skor-kbm` live | 200 — 62 sekolah, rata-rata 44.4, kritis 1, top: SDN 2 SENDANGREJO 76.4 |
| Level distribution | rendah 22 · sedang 21 · tinggi 18 · kritis 1 |
| Dampak per jenis (top) | ruang_kelas 77/769 · wc_siswa 31/176 · wc_guru 14/98 |
| Anon | 401 |
| pytest | **98/98** |
| `npx tsc --noEmit` | bersih |
| `npm run build` | sukses (29 dtk) |
| Playwright smoke `/dinas/skor-kbm` | 62 baris tabel · semua 11 check OK · 0 console error |

**Catatan:** Tidak ada migrasi DB (perhitungan on-the-fly). Tidak perlu regen dump. RBAC ketiga-role adalah asumsi — Aris dapat membatalkan. Observasi terbuka: `GET /ai/status` masih menghitung `klaster_id IS NULL` sebagai unclustered (selalu 398) — di luar scope F4.7/F4.8.

### 3.25 F4.9 — Fix Enum `klaster.kategori` Drift + Guard Parity Skema (2026-10-14) ✅ SELESAI

**Masalah:** `8cca6e1b2fa3` membuat ENUM `klaster.kategori` 5 nilai; model & DB live = 6 (nilai `belum_terklasifikasi` ditambahkan di luar alembic). Fresh install via `alembic upgrade head` (jalur produksi SETUP.md §5) → insert 18 klaster label-fallback gagal. Tak tertangkap test karena `conftest.py` memakai `create_all` dari model, bukan alembic.

**Deliverable:**

1. Migrasi `d3cb7888ff94` (down: `a7f3c91e5b2d`): guard non-MySQL + idempoten `information_schema` (sudah 6 nilai → skip); `ALTER ... MODIFY` tambah value di akhir; `downgrade()` balik ke 5 nilai + peringatan backfill.
2. **`backend/scripts/verify_schema_parity.py` (baru)**: bandingkan 94 kolom model vs `information_schema` (14 ENUM termasuk) — mode default fresh-install (bangun DB temp → `upgrade head` → bandingkan → drop), `--db <url>` untuk DB existing; exit 1 saat drift. Didokumentasikan di SETUP.md §5 + baris troubleshooting.
3. `database/simakis.sql` diregen (`mysqldump --single-transaction`, alembic `d3cb7888ff94`).
4. Docs: SETUP.md §5/§5a/troubleshooting, TASK_GUIDE §F4.9, CHANGELOG §3.25.

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `alembic upgrade head` di DB live | no-op idempoten → `alembic_version=d3cb7888ff94`, enum tetap 6 nilai, 18 klaster utuh |
| Fresh install dari nol (DB temp) | chain 6 revisi sukses; enum 6 nilai = model; INSERT `kategori='belum_terklasifikasi'` OK; `hasil_klasterisasi` ada; DB temp di-drop |
| pytest | **98/98** (84 dtk) |
| `verify_schema_parity.py` mode fresh & `--db` live | PARITY OK (94 kolom) |
| Uji negatif (DB berhenti di `a7f3c91e5b2d`) | **menangkap** ENUM DRIFT `klaster.kategori`, exit 1 |
| Dump | 236.747 B, diff **2 baris** (alembic_version saja); impor ke DB temp: 62/600/43, noise 398, enum 6 nilai |

### 3.26 F4.10 — Fix bug backend DBG-004/005/006 (2026-10-14) ✅ SELESAI

**Deliverable:**

1. **DBG-004 — `GET /ai/status` salah hitung.** Seleksi `Laporan.hasil_klasterisasi == 'belum_diproses'` menggantikan `klaster_id IS NULL` (yang ikut menangkap 398 laporan noise). `last_run` tidak lagi hardcoded: dibaca dari state file baru `app/core/pipeline_state.py` (`backend/pipeline_state.json`, di-gitignore) yang ditulis cron script (sukses/kosong/error) dan `POST /ai/cluster`; fallback string bila belum pernah jalan; key baru `last_run_status` (`ok`/`error`).
2. **DBG-005 — audit tak pernah terisi.** `log_audit()` dipanggil di 5 aksi sensitif: `POST /auth/login` → `login`, `POST /auth/register` → `akses_pdp_vault` (`encrypt_nik`), `PUT /klaster/{id}/verifikasi` → `verifikasi_klaster`, `PUT /vote/klaster/{id}/override` → `override_prioritas`, `PUT /laporan/{id}/status` → `verifikasi_status_sanggahan`.
3. **DBG-006 — cron tak terpasang.** Crontab user dev: `0 2 * * * … scripts/run_clustering.py >> logs/clustering.log 2>&1` (+ komentar); service `cron` active; `backend/logs/` dibuat; `.gitignore` += `pipeline_state.json`, `backend/logs/`.
4. **Test baru:** `TestAuditAktifF410` (5) + `TestStatusPipelineF410` (2, termasuk regresi noise-klaster_id-NULL) → **pytest 105/105**.

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `pytest tests/` | **105/105** (101 dtk) |
| `GET /ai/status` live | 200 — `unclustered_laporan: 0` (bukan 398), `total_klaster: 43`, `last_run: 2026-10-14T20:02:58`, `last_run_status: ok` |
| `GET /audit/log` live | baris `login` `admin@simakis.id` tercatat (`total_items: 1`, sebelumnya selalu 0) |
| Anon `GET /ai/status` | 401 |
| Simulasi baris crontab | sukses → `logs/clustering.log` + state file terisi |
| `crontab -l` | 1 entri `0 2 * * *` |
| Git ignore | `pipeline_state.json`, `backend/logs/` ter-capture `.gitignore` |

**Catatan:**

- Tidak ada endpoint `logout` (refresh-token flow) → tidak ada aksi logout untuk di-log.
- `last_run` = timestamp lokal (WIB), `audit.timestamp` = UTC — perbedaan zona, jangan dibaca berdampingan secara harfiah.
- Saat deploy ke server produksi: pasang crontab yang sama (mesin harus menyala 02:00 WIB) — checklist `DEPLOYMENT.md` belum disentuh.
- Docs terkait: `DEBUGGING.md` (DBG-004/005/006 → ✅ + bukti), INTERFACES baris `/ai/status`.

### 3.27 F4.11 — Fix bug backend DBG-007…011 (2026-10-14) ✅ SELESAI

**Deliverable:**

1. **DBG-007 (D-23) — penanda/isu nyata.** Helper `_penanda_isu_per_sekolah()` di `routers/sekolah.py`: `penanda_masalah` = level Skor KBM (D-22) — ≥70 `kritis`, 40–69 `perlu_perhatian`, <40 `aman`; `jumlah_isu_aktif` = laporan dengan `status_sanggahan != 'ditolak'`. Berlaku untuk **list & detail**; agregasi identik dengan `GET /laporan/skor-kbm` (tanpa kolom baru).
2. **DBG-008 — RBAC wilayah.** `require_dinas` di `routers/dashboard.py` += `admin` (dulu 403).
3. **DBG-009 — koordinat.** Helper `_koord()` (→ `Decimal`) di `scripts/setup_f300.py` + `routers/ingest.py`: isi saat insert **dan** backfill idempoten saat re-ingest; `lintang`/`bujur` diekspos di `SekolahResponse` (list + detail); reseed live dijalankan.
4. **DBG-010 — nama ingest.** Key `nama` (header CSV resmi) dengan fallback `nama_sekolah` + slice `[:255]` → tak lagi "Unknown".
5. **DBG-011 (diagnosis ulang) — code 422.** Generic `400 VALIDATION_ERROR` ternyata **sesuai** INTERFACES §0.3 — bukan deviasi. Deviasi nyata: semua 422 dipetakan `ERROR_CODES` jadi `REASON_REQUIRED`, padahal kontrak §4 mewajibkan `422 UNPROCESSABLE_ENTITY` untuk body enum invalid. Solusi: `app/core/exceptions.py::ApiError(status, code, detail)` — handler kini memprioritaskan `exc.api_code`; `PUT /laporan/{id}/status` memakai `ApiError(422, "UNPROCESSABLE_ENTITY", …)`; baris `UNPROCESSABLE_ENTITY` ditambah ke §0.3; union `ApiErrorCode` FE (`errors.ts`) += `UNPROCESSABLE_ENTITY`.

**Verifikasi:**

| Cek | Hasil |
|---|---|
| pytest | **112/112** (106 dtk; +7 test: wilayah admin, penanda×4, koordinat, ingest) |
| `GET /sekolah` live | penanda `perlu_perhatian 39 / aman 22 / kritis 1` · total isu 600 · koordinat 62/62 |
| `setup_f300.py` rerun | idempoten — [SKIP] admin & 600 laporan, 0 sekolah/sarana baru, koordinat ter-backfill |
| Koordinat DB | `COUNT(lintang)=62`, `COUNT(bujur)=62` (dulu 0/0) |
| `GET /dashboard/wilayah` (admin live) | 200 (dulu 403) |
| `PUT /laporan/{id}/status` invalid live | `422 {"error": {"code": "UNPROCESSABLE_ENTITY", …}}` |

**Catatan:**

- Tanpa migrasi DB. AGENTS.md §Scope FINAL (baris `penanda_masalah`/`jumlah_isu_aktif` placeholder) kini usang — **perlu update eksplisit dari pemilik proyek**.
- Komentar FE (`Direktori.tsx`, `Dashboard.tsx`, `PetaSebaranDinas.tsx`, `DashboardKadis.tsx`, `types.ts`) masih menyebut backend placeholder — sebagian sudah disesuaikan (`types.ts`); sisa cleanup + wiring peta koordinat = lane FE terbuka.
- Audit `RoleChecker` vs INTERFACES: tak ada gap lain (verifikasi klaster verifikator-only = per kontrak).
---

### 3.28 Fix Semantik NULL di Scoring + Spesifikasi Klasifikasi Severity (2026-10-20) ✅ SELESAI

**Latar:** `laporan.kondisi_dilaporkan` diperlakukan berbeda oleh dua fungsi di
`app/ai_pipeline/scoring.py` — `calculate_kbm_score` membuang `NULL`, sedangkan
`calculate_priority_score` memetakannya ke `0` (= "kondisi baik"). Akibatnya laporan
berisi keluhan berat namun tanpa nilai enum ikut menurunkan skor prioritas, dan dua
halaman menampilkan angka dari perlakuan yang berbeda atas data yang sama.

**Deliverable:**

1. **`app/ai_pipeline/scoring.py` — `calculate_priority_score`.** `NULL` dan nilai di luar
   enum kini **dibuang** dari rata-rata (bukan dipetakan ke `0`), sehingga identik dengan
   `calculate_kbm_score`. Aturan: `NULL` = "tidak ada data", **bukan** "kondisi baik".
2. **`tests/test_scoring_null.py` (baru, 8 test).** Cakupan: semua-`NULL` di kedua fungsi,
   `NULL` tidak menarik rata-rata turun, nilai di luar enum, list kosong, dan test
   konsistensi antar-kedua-fungsi.
3. **`docs/backend/SPEC_SEVERITY_KLASIFIKASI.md` (baru, 812 baris).** Spesifikasi mandiri
   (tidak digabung ke `TASK_GUIDE.md`) untuk klasifikasi severity dari teks laporan:
   - §15 Lapis 1 — pertanyaan konfirmasi adaptif (bank gejala 8 komponen, diturunkan dari
     dokumen Kemendikbud; nama awam + tabel pemetaan; pertanyaan struktural berbasis pemicu)
   - §16 11 keputusan pemilik proyek (9 sudah ditetapkan)
   - §17 Keputusan final: LLM sebagai pelabel (550 latih + 50 sampel diperiksa manual),
     kolom `sumber_kondisi`, semantik `NULL` dibuang
   - §18 Urutan implementasi 7 langkah
   - §19 Usulan kontrak FE↔BE (4 perubahan) — **usulan, `INTERFACES.md` belum disentuh**
4. **`docs/backend/AI_PIPELINE_ABLATION_STUDY.md` §10 (baru).** Metode perhitungan skor
   keparahan & skor KBM: skala severity, komponen Dapodik, shrinkage lingkungan
   (`λ = n/(n+K)`, `prior = 49.7`, `K = 5`), flag mismatch, dan alternatif yang ditolak.

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `pytest tests/test_scoring_null.py` | **8/8** lulus |
| `pytest tests/` (suite penuh) | **120/120** lulus (112 lama + 8 baru) |
| Laporan live dengan `kondisi_dilaporkan` NULL | **0** dari 600 → tidak ada skor produksi yang berubah |
| Klaster live dengan semua laporan NULL | **0** dari 43 |
| Klaster live yang nilainya berubah | **1** dari 43 — `5dda3ac6` (lihat catatan) |
| Migrasi DB | tidak ada |

**Catatan:**

- Bug terpisah ditemukan saat verifikasi: klaster `5dda3ac6` menyimpan `skor_keparahan = 55,86`
  padahal hitung ulang dari sumber saat ini menghasilkan `75,66` (selisih **19,8**, bukan pembulatan).
  Setelah ditelusuri, `0,7 × 79,8 = 55,86` tepat → komponen Dapodik dihitung **0** saat klaster
  dibuat, dan skor tidak pernah dihitung ulang setelah `kondisi_sarana` terisi. Back-calc
  `skor_prioritas − votes` (`run_clustering.py:161`, `vote.py:49,105`, `klaster.py:116`)
  menyamarkan sebab. Bukan akibat perubahan `NULL`. Dicatat sebagai **DBG-021** (🔴, perbaikan terpisah).
- `docs/backend/INTERFACES.md` **sengaja tidak disentuh** — perubahan kontrak FE↔BE memerlukan
  persetujuan Dimas. Bentuk usulan ada di `SPEC_SEVERITY_KLASIFIKASI.md` §19.
- Sisa implementasi (kolom `sumber_kondisi`, pelabelan LLM, lapis 1 & 2) tercantum sebagai
  urutan 7 langkah di `SPEC_SEVERITY_KLASIFIKASI.md` §18.
- `K = 5` pada shrinkage adalah **expert judgment**, bukan hasil kalibrasi data. Estimasi `K`
  dari data dev tidak terdefinisi (`EPV = 1420.8`, `VHM = −2.5`) karena laporan dev sintetis
  (semua dibuat 2026-10-05, distribusi kondisi hampir uniform). Wajib disebut sebagai
  keterbatasan; estimasi ulang dari data riil = syarat produksi.

---

## 3.29 F4.12 — Shrinkage Skor KBM + Penanda Mismatch (D-24, 2026-10-20) ✅ SELESAI

**Tujuan:** menarik `skor_laporan` sekolah berdata sedikit ke prior global agar sampel 3 laporan
tidak setara 13 laporan, tanpa mengubah bobot `0.7/0.3` atau ambang level.

**Perubahan:**

1. **`app/ai_pipeline/scoring.py`** — `SHRINKAGE_K = 5`, `MISMATCH_SKOR_LAPORAN = 50`;
   `_severities`, `compute_prior`, `is_mismatch`, `estimate_k` (Bühlmann method of moments,
   `None` bila `VHM ≤ 0`); `calculate_kbm_score(..., prior=None, k=SHRINKAGE_K)`
   dengan `λ = n/(n+k)`, `n=0 → skor_laporan 0` (tidak ditarik ke prior).
2. **`app/core/config.py`** — `SHRINKAGE_K: int = 5` (parameter, bukan literal tersebar).
3. **`app/routers/laporan.py`** — `GET /laporan/skor-kbm`: prior **global**, field `mismatch`
   per sekolah, `ringkasan.prior/k/jumlah_mismatch`. Mismatch dihitung **setelah** shrinkage.
4. **`app/routers/sekolah.py`** — `_penanda_isu_per_sekolah` memakai prior global yang sama
   (query laporan tidak lagi dibatasi `WHERE sekolah_npsn IN (...)`), sehingga penanda halaman
   1/2 dan detail identik dengan skor.
5. **Test** — `test_blackbox.py`: shape ketat + formula baru (A 60,1 `tinggi`; B 86,1 `kritis`),
   helper `reset_laporan()` untuk isolasi prior global, 4 test baru (prior global vs halaman,
   mismatch setelah shrinkage true/false, n=0 → prior 0). `test_scoring_shrinkage.py` (baru, 11 test).
6. **FE** — `types.ts`: `mismatch`, `prior`, `k`, `jumlah_mismatch`; `LaporanSkorKbm.tsx`:
   kartu KPI "Mismatch laporan vs Dapodik", kolom MISMATCH, tooltip komponen skor, copy footer
   formula shrinkage + `K`/prior.
7. **Docs** — D-24 (koreksi 76,4 = `skor_kbm`), INTERFACES §4, AIP §10 (status + §10.7),
   TASK_GUIDE F4.12, DEBUGGING (DBG-021).

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `pytest tests/` | **135/135** lulus |
| Live `GET /laporan/skor-kbm` | `prior = 49,7` · `k = 5` · `jumlah_mismatch = 5` · `total_laporan = 600` |
| Distribusi level | `rendah 22 · sedang 22 · tinggi 18 · kritis 0` |
| SDN 2 SENDANGREJO | `skor_laporan` 66,3 → **55,9** · `skor_kbm` 76,4 `kritis` → **69,2 `tinggi`** |
| Mismatch set | 5 sekolah; sama sebelum/sesudah shrinkage |
| `/sekolah` halaman 1+2 vs detail | penanda 0 beda vs level `skor-kbm` |
| `estimate_k()` data dev | `None` (`VHM ≤ 0`) — K=5 tetap **kebijakan** |
| `npx tsc --noEmit` | lulus |

**Catatan:**

- Prior **wajib global**; bila dihitung per halaman, penanda berubah antarhalaman (risiko utama task ini).
- `total_laporan` tetap menghitung 600 baris; `n` per sekolah hanya enum valid. Live: 0 NULL.
- Gap terpisah (belum di task ini): `FormLaporan.tsx` tidak mengirim `kondisi_dilaporkan`,
  sehingga laporan baru selalu NULL dan `n` tidak bertambah sampai F4.13.
- `calculate_priority_score` (level klaster) **tidak** disentuh; skor klaster basi = DBG-021.

---

## 3.30 F4.14 — Provenance Kondisi + Status Konfirmasi Severity (2026-10-20) ✅ SELESAI

**Tujuan:** membedakan nilai `kondisi_dilaporkan` hasil AI dan koreksi manusia, serta
menyimpan status alur konfirmasi severity — prasyarat F4.15/F4.16 agar cron tidak menimpa
koreksi verifikator dan akurasi AI dapat dihitung.

**Perubahan:**

1. **Migrasi `f4a14b7c9e21`** (`down_revision = d3cb7888ff94`) — tambah dua kolom
   `ENUM NULLABLE` pada `laporan`: `sumber_kondisi('ai','warga')` dan
   `status_konfirmasi('menunggu','terjawab','dilewati')`. **Tanpa `server_default`/backfill**;
   guard `information_schema` + no-op non-MySQL, `downgrade()` menghapus keduanya.
2. **`app/models/laporan.py`** — `SUMBER_KONDISI_ENUM`, `STATUS_KONFIRMASI_ENUM`, dua field baru.
3. **`app/schemas/laporan.py`** — `LaporanResponse` mengekspos `sumber_kondisi`,
   `status_konfirmasi`, dan field turunan `konfirmasi_perlu_dijawab`
   (= `status_konfirmasi == "menunggu"`, bukan kolom).
4. **`app/routers/laporan.py`** — `POST /laporan` set `status_konfirmasi='menunggu'`
   (laporan lama tetap NULL); helper `_laporan_fields()` dipakai bersama oleh POST, riwayat,
   dan detail; `GET /laporan/perlu-review` ikut mengekspos ketiga field.
5. **`scripts/run_clustering.py` — tidak diubah.** Saat ini skrip **hanya membaca**
   `kondisi_dilaporkan`; tidak ada assignment `kondisi_dilaporkan` di `app/` maupun `scripts/`
   (diverifikasi `grep`). Guard "jangan timpa bila `sumber_kondisi='warga'`" belum punya titik
   tulis untuk dijaga. **Wajib dipasang di F4.16** saat AI mulai menulis kondisi.
6. **Test** — `TestLaporanProvenanceF414` (3 test): POST baru → `menunggu` + flag `true`;
   detail/riwayat memantulkan `ai`/`terjawab` + baris lama `NULL`/flag `false`;
   `perlu-review` memantulkan field yang sama.
7. **Docs & dump** — `DATABASE_SCHEMA.md` (2 kolom + `hasil_klasterisasi`, hapus baris
   `kategori` yang sudah tidak ada), `INTERFACES.md` §4.4 (status ✅ + 4 endpoint),
   `TASK_GUIDE.md` F4.14, `database/simakis.sql` diregen (alembic head + kolom baru).

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `pytest tests/` | **138/138** lulus |
| `verify_schema_parity.py --db` (live) | **PARITY OK** — 96 kolom, semua ENUM |
| `verify_schema_parity.py` (fresh `alembic upgrade head`) | **PARITY OK** |
| Migrasi live | `d3cb7888ff94 → f4a14b7c9e21`; 600 baris tetap `NULL/NULL` |
| Downgrade → upgrade ulang | kolom hilang lalu kembali; 600 baris utuh |
| Impor ulang `database/simakis.sql` ke DB kosong | parity OK · 600 laporan · 62 sekolah · head `f4a14b7c9e21` |

**Catatan:**

- `konfirmasi_perlu_dijawab` **tidak disimpan** — dihitung saat serialisasi, sehingga tidak ada
  risiko kolom turunan basi.
- `POST /laporan` masih menerima `kondisi_dilaporkan` (kompatibilitas skema), tetapi **tidak**
  mengisi `sumber_kondisi`. FE (`FormLaporan.tsx`) belum mengirim field itu; alur konfirmasi
  tetap menunggu F4.15.
- Dump memuat data live terbaru (4 user termasuk pendaftar `korela@gmail.com`, 32 audit log,
  koordinat hasil F4.11), bukan hanya perubahan skema.

---

## 3.31 F4.15 — Konfirmasi Severity Lapis 1: Bank Pertanyaan + Endpoint (2026-10-20) ✅ SELESAI

**Tujuan:** memberi warga jalur konfirmasi terstruktur (maks. 4 pertanyaan) agar severity tidak
hanya bergantung pada teks bebas, tanpa memblokir pelaporan. Backend final; modal FE menyusul.

**Perubahan:**

1. **`app/ai_pipeline/question_bank.py`** (baru) — 8 komponen nama awam (`plafon`, `atap`,
   `dinding`, `lantai`, `pintu_jendela`, `listrik`, `air`, `drainase`), gejala bertingkat 3–4
   baris + `g0` "tidak ada gejala"; `STRUKTUR_PEMICU`/`GEJALA_STRUKTUR` §15.5; `TINGKAT_URUT`;
   `pertanyaan_bagian`, `deteksi_komponen`, `pemicu_struktural`, `pilih_pertanyaan`,
   `cari_pilihan`, `severity_tertinggi`. Pemetaan resmi: Sangat Berat/Berat → `rusak_berat`,
   Sedang → `rusak_sedang`, Ringan/Sangat Ringan → `rusak_ringan`, `g0` → `baik`.
2. **Migrasi `b7d15c4e9a02`** (`down_revision = f4a14b7c9e21`) — `laporan.jawaban_konfirmasi
   JSON NULLABLE`; guard `information_schema`, no-op non-MySQL, `downgrade()` menghapus kolom.
3. **`app/models/laporan.py`** — field `jawaban_konfirmasi`; **`app/schemas/laporan.py`** —
   `KonfirmasiRingkas`, `KonfirmasiJawaban`, `KonfirmasiRequest`, `LaporanResponse.konfirmasi`.
4. **`app/routers/laporan.py`** — `KONFIRMASI_TTL = 24 jam`; helper `_naive_utc`,
   `_kedaluwarsa_pada`, `_konfirmasi_ringkas`, `_expire_konfirmasi`, `_laporan_milik`.
   `GET /laporan/{id}/konfirmasi` (owner-only; laporan lama NULL → `dilewati`, `pertanyaan: []`);
   `POST /laporan/{id}/konfirmasi` (terjawab/dilewati, `409` bila sudah/kedaluwarsa, `422` kode
   asing/duplikat). `POST /laporan` menyertakan blok `konfirmasi`
   (`perlu_konfirmasi`, `jumlah_pertanyaan`, `kedaluwarsa_pada`).
5. **Test** — `TestKonfirmasiF415` (12 test): bank/selector, GET pemilik vs bukan, laporan lama,
   jawaban menang, `g0`, `[]`, 409, 422, expiry lazy, blok POST.
6. **Docs** — INTERFACES §4.1–4.3 ✅ + §4.4 `konfirmasi`, D-25, DATABASE_SCHEMA
   `jawaban_konfirmasi`, TASK_GUIDE F4.15.

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `pytest tests/` | **150/150** lulus (sebelum F4.16) |
| Migrasi live | `f4a14b7c9e21 → b7d15c4e9a02` |
| Downgrade → upgrade (DB kosong) | kolom hilang lalu kembali; head `b7d15c4e9a02` |
| `verify_schema_parity.py --db` (live) | **PARITY OK** — 97 kolom |
| Impor ulang `database/simakis.sql` ke DB kosong | parity **97 kolom OK** · 600 laporan · 62 sekolah · head `b7d15c4e9a02` |
| Smoke `label_severity_llm.py --dry-run` | 600 laporan terbaca, model belum di-set |

**Catatan:**

- `jawaban_konfirmasi` menyimpan `{"jawaban": [...], "diproses_pada": "..."}` — audit + bahan lapis 2.
- Laporan lama **tidak** ditawari konfirmasi ulang (status NULL → `dilewati`).
- `database/simakis.sql` diregen setelah migrasi ini (**251.565 byte**, head `b7d15c4e9a02`).

---

## 3.32 F4.16 — Klasifikasi Severity Lapis 2: Kerangka K1–K4 + Ablation Final (2026-10-20/21) ⏳ LABEL MANUAL DITUNDA ≥28 OKT

**Tujuan:** menentukan `kondisi_dilaporkan` otomatis dari deskripsi + jawaban konfirmasi,
dengan bukti ablation; tidak menimpa koreksi manusia.

**Sudah diimplementasikan:**

1. **`app/ai_pipeline/severity.py`** — `LEVELS`, `DEFINISI` (4 tingkat Kemendikbud), aturan
   kata kunci K1 + `PENGECUALI_BAIK`, `deteksi_gejala_teks`, `severity_dari_jawaban`,
   `gabung_severity`, `explain`, `classify_severity`. Tanpa sinyal → `rusak_ringan` (bukan `baik`).
2. **`app/core/config.py`** — `SEVERITY_ENABLED=False`, `SEVERITY_METHOD="k1"`.
3. **`scripts/run_clustering.py`** — `apply_severity()`: guard hanya baris
   `kondisi_dilaporkan IS NULL` dan `sumber_kondisi != 'warga'`; hanya K1; set `sumber_kondisi='ai'`.
   `or "baik"` dihapus. `routers/vote.py` + `routers/klaster.py` juga tidak lagi memakai
   fallback `or "baik"`.
4. **`scripts/label_severity_llm.py`** — OpenAI-compatible, `LLM_API_KEY`/`LLM_BASE_URL`/
   `LLM_MODEL`, resume JSONL, prompt `severity-llm-v1`, output
   `app/dataset/severity/labels_llm.jsonl`. Parser menerima JSON biasa, ```` ```json ````,
   dan respons `text/event-stream` berakhiran `data: [DONE]`. **600 label selesai** dengan
   `am/amanai/deepseek-v4-flash`: `rusak_ringan 425 · baik 77 · rusak_berat 52 · rusak_sedang 46`.
5. **`scripts/prepare_manual_testset.py`** — memilih 50 laporan (seed 42) **sebelum** label LLM
   ada, menulis `test_50_ids.json` + `test_50.csv` (kolom `label_manual` kosong) agar penilaian
   Aris tidak bias melihat output LLM. **`scripts/prepare_severity_testset.py`** memakai ID tetap
   itu untuk train 550 + merge label LLM tanpa menghapus `label_manual`.
6. **`scripts/severity_ablation.py`** — K1/K2/K3 + K4 opsional; akurasi, macro-F1, confusion
   matrix; menolak test set yang label manualnya kosong.
7. **`scripts/finetune_severity_indobert.py`** — K4 `indobenchmark/indobert-base-p1`,
   90/10 split internal, class-weighted loss, `--batch-size/--grad-accum/--max-length`,
   `--bf16` (Ampere+), fp16 otomatis bila CUDA, `ignore_mismatched_sizes=True` (classifier
   checkpoint 2 kelas → 4 kelas), simpan model+tokenizer. Smoke-test Trainer dengan model tiny
   lulus; target Aris GTX 1650 (Turing, tanpa bf16) → fp16, `--batch-size 4 --grad-accum 4`.
   `accelerate>=1.1.0` ditambahkan ke `requirements.txt`.
8. **`tests/test_severity.py`** (13 test) — K1 dasar, jawaban menang, guard cron, tanpa kandidat.
9. **`scripts/backfill_severity.py`** — one-off untuk laporan lama yang tidak lagi melewati
   cron (`belum_diproses`); default dry-run, tulis hanya `--commit`, guard NULL + bukan `warga`.
10. **`.env.example`** — `SEVERITY_ENABLED`, `SEVERITY_METHOD`, `LLM_API_KEY`, `LLM_BASE_URL`,
    `LLM_MODEL` (key kosong).

**Verifikasi:**

| Cek | Hasil |
|---|---|
| `pytest tests/` | **163/163** lulus |
| `prepare_manual_testset.py` (live) | 50 laporan → `test_50.csv` + `test_50_ids.json` (8,0 KB) |
| `label_severity_llm.py` (live) | **600/600** label unik; model & prompt tercatat |
| `prepare_severity_testset.py` (live) | train **550** (`ringan 389 · baik 71 · berat 47 · sedang 43`) + test **50** (`ringan 36 · baik 6 · berat 5 · sedang 3`) |
| `severity_ablation.py --labels llm` (provisional) | K1 **48,00% / 0,2467** · K2 **72,00% / 0,5841** · K3 **74,00% / 0,6100** · K4 **70,00% / 0,5722** |
| `backfill_severity.py` (dry-run, live) | 0 kandidat — 600 laporan seed sudah punya `kondisi_dilaporkan` |
| `finetune_severity_indobert.py` (live, GPU) | K4 latih 3 epoch · 270,8 dtk · fp16 · GTX 1650 · eval internal 55 data **67,27% / 0,5414** (bukan test set) |
| `severity_ablation.py --indobert-model` (eval test 50) | K4 **70,00% / 0,5722** — sebanding K1–K3 |
| `torch 2.14.1+cu130` (live, WSL) | `cuda.is_available()=True` · compute 7.5 · 4,29 GB VRAM · matmul GPU OK |
| Uji kebocoran data | irisan `train_550` ∩ `test_50_ids` = **0** (tidak bocor) |
| Distribusi label LLM | `rusak_ringan 425 · baik 77 · rusak_berat 52 · rusak_sedang 46` → **70,8% timpang** |

**Ablation final (K4 dijalankan di GPU, 2026-10-21)** — laporan lengkap:
**`docs/backend/ABLATION_SEVERITY_RESULTS.md`** (10 bagian: hasil, baseline, distribusi label,
temuan 165 label meragukan, confusion matrix, detail latihan, lingkungan GPU, kesimpulan,
langkah lanjut, berkas terkait):

| Varian | Akurasi | Macro-F1 | Waktu | Catatan |
|---|---|---|---|---|
| K1 aturan kata kunci | 48,00% | 0,2467 | instan | basis aturan `severity.py` |
| K2 TF-IDF + LogReg | 72,00% | 0,5841 | ~detik | CPU |
| **K3 TF-IDF + SVM** | **74,00%** | **0,6100** | ~detik | **rekomendasi produksi** |
| K4 IndoBERT fine-tune | 70,00% | 0,5722 | 270,8 dtk (GPU) latih + ~61 dtk evaluasi | kalah dari K2/K3 |

K4: `indobenchmark/indobert-base-p1`, 3 epoch, `--batch-size 16 --max-length 128`, GPU
**GTX 1650** (Turing, compute 7.5), fp16 otomatis (`bf16: True` pada header log = flag fp16 aktif —
Turing tidak punya bf16). Model tersimpan di `app/dataset/severity/models/indobert/model.safetensors`
(**497 MB**) — **jangan di-commit**, tambahkan ke `.gitignore`.

Progres per epoch K4 — `eval_loss` naik di epoch 3 sementara akurasi naik → mulai **overfit**:

| Epoch | eval_loss | Akurasi | Macro-F1 |
|---|---|---|---|
| 1 | 1,057 | 21,82% | 0,3682 |
| 2 | 0,781 | 52,73% | 0,4890 |
| 3 | 0,7925 | 67,27% | 0,5414 |

**Baseline tebak-mayoritas = 70,8%** (`rusak_ringan` 425/600). K3 hanya **+3,2 poin** di atas
baseline, K4 **−3,5 poin** di bawahnya. Penyebab utama bukan algoritma melainkan **kualitas label**:
LLM menumpuk 70,8% ke `rusak_ringan`. Confusion matrix K3 menunjukkan `rusak_sedang` nyaris tidak
terdeteksi (2 dari 3 benar) dan `rusak_berat` sering jatuh ke `rusak_sedang`.

Temuan pendukung — contoh label meragukan: deskripsi *"Tidak ada air bersih di WC sekolah, siswa
kesulitan. **berbahaya bagi keselamatan siswa**"* dilabeli **`rusak_ringan`**. Ini konsekuensi aturan
prompt `severity-llm-v1` ("kekurangan fasilitas → pilih tingkat paling ringan"). Aturan perlu
ditinjau sebelum label dipakai sebagai ground truth.

**Torch CUDA di WSL (2026-10-21).** `torch 2.14.1+cu130` terpasang di `backend/venv` melalui
**mirror Tsinghua** — `pytorch.org` hanya ~70 KB/s dari lokasi Aris, mirror 350 KB/s–2,2 MB/s, dan
wheel `cp314` hanya tersedia di mirror. Driver Windows `CUDA Version: 13.1` mendukung `cu130`.
Verifikasi: `cuda avail True` · `GTX 1650` · compute 7.5 · 4,29 GB VRAM · matmul GPU OK. Total
unduhan ~3–4 GB (torch 554 MB + `nvidia-cudnn-cu13` 553 MB + `nvidia-cusparselt-cu13` 170 MB +
paket `nvidia-*` lain). Peringatan: `pip install -r requirements.txt` menurunkan torch ke `2.14.0`
CPU dan menghapus dukungan GPU.

**Belum selesai / penghalang:**

- **⚠️ PELABELAN MANUAL DITUNDA ke minggu depan (≥ 28 Okt 2026)** — keputusan Aris 21 Okt 2026.
  Penghalang terakhir F4.16. Syarat sebelum mengisi (poin A–C wajib, jangan dilewati):
  1. **(A) Rubrik penilaian dulu, bukan penilaian langsung.** Kriteria resmi sudah ada di
     `severity.py:25` (`DEFINISI` 4 tingkat Kemendikbud: `baik` / `ringan` ≤30% / `sedang` 31–45% /
     `berat` >45% + daftar kata kunci). Rubrik formal **belum dibuat** → buat
     `docs/backend/RUBRIK_LABEL_MANUAL.md` (definisi + daftar periksa pengambil keputusan +
     aturan ambigu "dampak KBM tanpa kerusakan fisik" + penanda `ragu`) **sebelum** Aris menilai.
     Tanpa rubrik, penilaian subjektif dan tidak bisa dipertanggungjawabkan di skripsi.
  2. **(B) Isi dalam kondisi BLIND** — urutan sudah terlanjur bias (Aris mengisi setelah skor
     ablation keluar; lihat catatan bias di bawah). Mitigasi: buat `test_50_blind.csv` berkolom
     `id, deskripsi, label_manual, catatan` **tanpa `label_llm`**, isi ulang memakai rubrik;
     isian pertama (bila sudah ada di luar repo) disimpan sebagai `label_manual_v1` — perbedaan
     v1 vs v2 = ukuran nyata anchoring.
  3. **(C) Setelah 50 baris terisi:** jalankan `severity_ablation.py --labels manual
     --indobert-model app/dataset/severity/models/indobert` → angka **FINAL** untuk skripsi;
     update §3.32 + `ABLATION_SEVERITY_RESULTS.md` §1–§2; baru boleh diajukan
     `SEVERITY_ENABLED=true`.
- **Bias yang harus ditulis jujur di skripsi:** penilaian manual dilakukan **setelah** hasil
  ablation terlihat (*anchoring*), dan **tanpa rubrik baku** saat rencana awal — dua-duanya sudah
  dipetakan 21 Okt 2026 dan dijadikan bagian metodologi, bukan disembunyikan.
- **50 label manual Aris** belum ada (`0/50`) → lembar di
  `backend/app/dataset/severity/test_50.csv`; angka di atas **provisional** (label LLM).
- ✅ **K4 sudah dilatih + dievaluasi ulang di test set 50** (GPU GTX 1650, 2026-10-21) →
  **70,00% / 0,5722** (eval internal 55 data menunjukkan 67,27% / 0,5414 — tidak sebanding).
  **Tidak dipakai produksi** karena di bawah K2/K3. Model 497 MB masih tersimpan — hapus atau
  `gitignore`.
- `SEVERITY_ENABLED` tetap `false` sampai ablation final + 50 label manual disetujui.
- Setelah label manual terisi: rerun `severity_ablation.py --labels manual
  --indobert-model app/dataset/severity/models/indobert`, lalu update §3.32 dengan angka final.
  **Jangan lupa urutan A→B→C di atas** (rubrik → blind → rerun) — dijanjikan minggu depan
  (≥ 28 Okt 2026), jangan kelewat.

---

## 3.33 DBG-021 + DBG-022 — Skor Klaster: Tanpa Back-Calc & Dapodik Aktif (2026-10-21) ✅ SELESAI

**Dua bug backend terakhir (lihat `DEBUGGING.md` DBG-021/022), dikerjakan langsung oleh
orchestrator karena agen `fixer` error (`fix-1`, `fix-2` — sesi mati, tidak dipakai ulang).**

**DBG-022 — vote menghapus komponen Dapodik 30% (diperbaiki DULU, kerusakan aktif):**

1. `routers/vote.py` — `create_vote` dan endpoint F3.14 `PUT /vote/klaster/{id}/skor`
   sebelumnya hardcode `kondisi_dapodik = {"total": 0, ...}` → tiap vote (dan "hitung ulang"
   yang justru merusak) menulis skor tanpa bobot 30% Dapodik. Keduanya kini memakai
   `hitung_kondisi_dapodik(db, klaster.sekolah_npsn)`.
2. `ai_pipeline/scoring.py` — helper baru `hitung_kondisi_dapodik()` (agregasi
   `KondisiSarana`, satu sumber kebenaran) menggantikan duplikasi query di `klaster.py`
   dan `run_clustering.py`.

**DBG-021 — snapshot basi + back-calc menyamarkan sebab:**

3. `scoring.py` — fungsi baru `calculate_score_components() -> (skor_keparahan, skor_prioritas)`
   menghitung **kedua komponen langsung** (D-07), tanpa `skor_prioritas - votes`.
   `calculate_priority_score` **kontrak lama dipertahankan** (return `float`, delegasi ke
   komponen) — `tests/test_scoring_null.py` lulus tanpa perubahan.
4. **4 call site** back-calc diganti tuple: `scripts/run_clustering.py`,
   `routers/klaster.py`, `routers/vote.py` (create_vote + F3.14).
5. **Skrip baru `scripts/recompute_skor.py`** — hitung ulang semua klaster dari sumber
   saat ini (laporan + `kondisi_sarana` + votes); dry-run default, tulis `--commit`,
   idempoten (toleransi 0,01).

**Bukti verifikasi:**

| Pemeriksaan | Hasil |
|---|---|
| `pytest tests/ -q` | **169/169** (163 base + 6 regresi baru `tests/test_recompute_skor.py`) |
| Dry-run `recompute_skor.py` (DB live) | **43 klaster diperiksa, 1 berubah** — `5dda3ac6` 55,86/61,86 → **75,66/81,66** (selisih 19,8 = 0,3×66 sesuai prediksi `DEBUGGING.md`) |
| `recompute_skor.py --commit` | ✅ Ditulis 1 klaster |
| Rerun setelah commit | **0 berubah** (idempoten) |
| Test regresi vote/F3.14 | vote & endpoint hitung ulang mempertahankan Dapodik: 0,7×100 + 0,3×50 = **85**, bukan 70 |
| Line-ending | HEAD & working tree sama-sama LF — tidak ada noise EOL |

**Catatan:** `SEVERITY_ENABLED` tetap `false` (tidak disentuh). Commit menyusul — sesuai
aturan AGENTS.md hanya saat diminta ("commit"). Sisa backlog: 50 label manual F4.16
(ditunda ≥28 Okt 2026), DBG-014/016 (backend), DBG-012/013/019 (lane FE), 5 keputusan ⚪.

## 3.34 DBG-012 + DBG-019 — Perbaikan Frontend Auth Guard & Navigasi Warga (2026-10-21) ✅ SELESAI

**Perbaikan dua bug frontend (lihat `DEBUGGING.md` DBG-012 & DBG-019):**

1. **DBG-012 — Rute `/dinas/*` tanpa guard:**
   - `frontend/src/components/auth/ProtectedRoute.tsx`:
     - Menangani `isLoading` dengan spinner `Loader2` agar tidak terjadi flash/redirect palsu saat me-refresh halaman ber-token.
     - Menambahkan prop `loginPath` (default `"/login"`) dengan preservasi query param `?redirect=...`.
     - Menambahkan prop `allowedRoles?: Role[]` untuk pengecekan hak akses role.
   - `frontend/src/App.tsx`: Seluruh rute `/dinas` dibungkus `ProtectedRoute` dengan `loginPath="/dinas/login"` dan `allowedRoles={["admin", "verifikator_dinas", "kepala_dinas"]}`.
   - `frontend/src/pages/dinas/LogAuditPdp.tsx`: Copywriter basi ("Backend v1 belum menuliskan aksi sensitif") dirapikan menjadi deskripsi netral.

2. **DBG-019 — Sinkronisasi navbar warga & tombol pintasan:**
   - `frontend/src/layouts/WargaLayout.tsx`:
     - Menu diselaraskan dengan navigasi publik: Dashboard, Dashboard Wilayah, Direktori Sekolah, Riwayat Laporan, dan Tentang Data.
     - Menambahkan tombol aksi primer `"Buat Laporan"` mengarah ke `/laporan/baru`.

**Bukti verifikasi:**
- Build frontend `npm run build` (tsc + vite) sukses tanpa error.
- Line-ending bersih (LF pada frontend, CRLF pada file docs backend).

## 3.35 DBG-013 — Profil Pegawai Pemerintah Dinamis & Kolom NIP (2026-10-21) ✅ SELESAI

**Perbaikan DBG-013 (Opsi A yang disetujui pengguna):**

1. **Database & Backend:**
   - Migrasi Alembic `63a2411c6508_dbg_013_users_nip.py` menambahkan kolom `users.nip` (`VARCHAR(30)`, nullable).
   - Model `User` (`backend/app/models/user.py`) ditambahkan kolom `nip`.
   - Endpoint `GET /auth/me` (`backend/app/routers/auth.py`) kini mengembalikan field `nip`.
   - Script seed akun dinas (`backend/scripts/seed_dinas_accounts.py`) dan baris akun dinas DB live diperbarui dengan NIP resmi:
     - `verifikator@simakis.id` (`verifikator_dinas`): `19840822 201001 1 007`
     - `kepala.dinas@simakis.id` (`kepala_dinas`): `19720315 199803 1 004`
     - `admin@simakis.id` (`admin`): `19790512 200501 1 003`
   - Dump database `database/simakis.sql` diregenerasi pada head Alembic terbaru (`63a2411c6508`).

2. **Frontend UI & Cetak Dokumen:**
   - Interface `UserMe` (`frontend/src/lib/api/types.ts`) ditambahkan properti `nip?: string | null`.
   - `frontend/src/layouts/DinasLayout.tsx`:
     - Sidebar bawah (nama, inisial, role) kini membaca dinamis dari `useAuth().user`.
     - Dropdown akun flyout & modal "Profil Pegawai" menampilkan nama, NIP, email, dan jabatan akun yang sedang login.
     - Aksi logout dinas memanggil `logout()` dari `useAuth()`.
   - `frontend/src/components/composite/CetakRingkasanEksekutif.tsx`:
     - Metadata pencetak ("Dicetak pada ... Oleh: ...") dan kolom tanda tangan kini dinamis mencantumkan nama, jabatan, dan NIP akun yang sedang bertugas.

**Bukti verifikasi:**
- `verify_schema_parity.py` PARITY OK (98 kolom cocok antara model dan DB MySQL).
- `pytest tests/ -q` → **169/169** test lulus.
- Frontend build `npm run build` (`tsc && vite build`) sukses tanpa error tipe.

## 3.36 DBG-018 & D-28 — Pembukaan Hak Vote Warga Terdaftar & Status Vote Terhitung Langsung (2026-10-22) ✅ SELESAI

**Perbaikan DBG-018 & Keputusan Produk D-28:**

1. **Masalah:**
   - User baru register otomatis memperoleh `role = "warga_umum"` dan `status_verifikasi = "menunggu"`.
   - Endpoint `POST /vote` membatasi `require_warga = RoleChecker(["warga_terverifikasi", "komite_sekolah"])`.
   - Panel admin dinas tidak memiliki modul/halaman untuk verifikasi warga, sehingga akun warga tidak pernah bisa vote (HTTP 403 Forbidden).
   - Vote baru di backend disimpan dengan status `"pending"`, memicu pesan frontend *"menunggu masa tunda verifikasi akun"* padahal skor prioritas langsung dihitung dan dinaikkan saat itu juga.

2. **Perubahan:**
   - `backend/app/routers/vote.py`:
     - `require_warga` diperluas: `RoleChecker(["warga_umum", "warga_terverifikasi", "komite_sekolah"])`. Akun staf dinas (`admin`, `verifikator_dinas`, `kepala_dinas`) tetap dilarang vote (403 Forbidden).
     - Objek vote yang dibuat langsung disimpan dengan `status_vote = "terhitung"`.
   - `backend/tests/test_blackbox.py`:
     - Menambahkan test regresi `test_vote_warga_umum_happy_dan_staf_forbidden_403` (warga_umum sukses vote 200 OK, staf dinas ditolak 403).
   - `frontend/src/pages/warga/DashboardWilayah.tsx`:
     - `ROLE_BOLEH_VOTE` ditambahkan `"warga_umum"`. Pesan error 403 diselaraskan menjadi *"Vote hanya untuk akun warga dan komite sekolah."*
     - Tombol "Buat Aduan Baru" dipindahkan ke baris header di atas filter chips klaster.
     - Penataan lebar kolom tabel: kolom `ISU & SEKOLAH` diperlebar (`w-auto`), padding kolom status & aksi dipersempit agar proporsional tanpa overflow.
   - `frontend/src/pages/warga/DaftarKlaster.tsx` & `DetailKlaster.tsx`:
     - Menghilangkan logika dan banner teks *"menunggu masa tunda verifikasi akun"*.
     - Feedback vote langsung sukses dan tombol langsung berubah menjadi *"Sudah Vote"* (centang hijau).
   - Dokumen:
     - `docs/universal/DECISIONS.md`: Mencatat **D-28**.
     - `docs/universal/INTERFACES.md`: Menyelaraskan akses role pada `POST /vote` dan `GET /vote/status/{klaster_id}`.
     - `docs/backend/DEBUGGING.md`: Menandai **DBG-018** `✅ SELESAI`.

**Bukti verifikasi:**
- Pytest `test_blackbox.py` vote flow lulus 100% (5/5 passed).
- Frontend `npm run build` sukses 100% (2319 modul ter-bundle hijau).

## 3.39 DBG-024 — Modal Pertanyaan Konfirmasi Severity Otomatis Terbuka di Kedua Jalur Submit (2026-10-22) ✅ SELESAI

**Perbaikan DBG-024:**
- **Masalah:** Setelah submit laporan, modal `PertanyaanKonfirmasi` (lapis 1 konfirmasi severity, F4.15) tidak pernah muncul — warga hanya melihat banner pasif, sehingga pertanyaan severity mudah terlewat. Backend sudah benar menandai `konfirmasi.perlu_konfirmasi = true`.
- **Akar (dua jalur submit):**
  1. `pages/warga/FormLaporan.tsx` — state `konfirmasiOpen` tidak pernah diset `true` di `handleSubmit`.
  2. `components/composite/ModalFormLaporan.tsx` (jalur "Buat Aduan Baru" dari `DetailSekolah.tsx`) — memanggil `kirimLaporan()` tetapi **membuang `res.konfirmasi`** dan tidak merender `PertanyaanKonfirmasi` sama sekali. Jalur inilah yang dipakai saat pengujian.
- **Perbaikan:**
  - `FormLaporan.tsx`: `if (res.konfirmasi?.perlu_konfirmasi) setKonfirmasiOpen(true)`; banner diperluas agar tetap tampil saat `status_konfirmasi = 'menunggu'`.
  - `ModalFormLaporan.tsx`: simpan `laporanId` + `perluKonfirmasi`; auto-open `PertanyaanKonfirmasi` (nested dialog); tombol "Jawab Sekarang" sebagai jalur alternatif; penanda "terjawab"; reset state di `handleReset`.
- **Dokumentasi:** `docs/backend/DEBUGGING.md` DBG-024 (ringkasan + detail, termasuk pelajaran "dua jalur submit") · `docs/frontend/CHANGELOG.md`.
- **Verifikasi:** `npx tsc --noEmit` bersih · `npm run build` hijau (17,1 s) · modul Vite dev memuat `setKonfirmasiOpen(true)` + `PertanyaanKonfirmasi` · live `POST /laporan` mengembalikan `konfirmasi.perlu_konfirmasi = true` (`jumlah_pertanyaan: 2`).
- **Catatan terbuka:** klik-uji UI di browser belum dijalankan (harness browser tidak tersedia saat perbaikan) — perlu reload manual oleh Aris untuk konfirmasi visual.

## 3.40 Perbaikan: Komponen Perabot di Bank Pertanyaan Konfirmasi (2026-10-27) ✅ SELESAI

**Akar Masalah:**
- Setelah merge dari server (18 commit, F4.14–F4.15 konfirmasi severity + DBG-024 auto-open modal), deskripsi perabot ("meja dan kursi ada yang rusak…") tetap tidak menampilkan form pertanyaan meski modal seharusnya auto-open.
- **Penyebab:** Backend compute `perlu_konfirmasi = len(pilih_pertanyaan(deskripsi)) > 1`. Threshold ini memerlukan ≥2 pertanyaan (1 bagian + ≥1 gejala). Untuk deskripsi perabot, `deteksi_komponen()` mengembalikan `[]` karena `KOMPONEN` hanya memiliki 8 komponen gedung (plafon, atap, dinding, lantai, pintu/jendela, listrik, air, drainase) — **tidak ada kategori perabot**. Hasilnya: hanya 1 pertanyaan "Bagian mana yang rusak?" → `perlu_konfirmasi = false` → modal tidak pernah auto-open.
- Simulasi: `pilih_pertanyaan("beberapa meja dan kursi ada yang rusak…")` → `len(q) == 1`, `deteksi_komponen = []`, `perlu_konfirmasi = false`.

**Perbaikan:**
1. **`backend/app/ai_pipeline/question_bank.py`:**
   - Tambah `KOMPONEN["perabot"]`: label "Meja / kursi / perabot", teknis ["meja", "kursi", "perabot kelas", "furnitur"], kata_kunci ["meja", "kursi", "bangku", "lemari", "papan tulis", "perabot", "meja praktik"].
   - Tambah `GEJALA["perabot"]` (4 baris g4..g1) dengan tingkat_resmi Rusak Sangat Berat…Ringan; rujukan ditandai "Ekstensi lokal — di luar tabel Kemendikbud §15.3" (transparansi: komponen bukan bagian dokumen resmi, tetapi isu paling umum dataset SIMAKIS).

2. **`backend/tests/test_blackbox.py`:**
   - Ubah `test_bank_lengkap_8_komponen` → `test_bank_lengkap_9_komponen`: assert `len(KOMPONEN) == 9`.
   - Tambah test unit: `test_pemilih_deskripsi_perabot()` — assert `pilih_pertanyaan("beberapa meja dan kursi…")` → `len(q) >= 2`, ada `gejala_perabot`.
   - Tambah test endpoint: `test_post_laporan_deskripsi_perabot_dapat_konfirmasi()` — POST `/laporan` dengan deskripsi perabot → `konfirmasi.perlu_konfirmasi = true`, `jumlah_pertanyaan == 2`.

3. **`docs/backend/SPEC_SEVERITY_KLASIFIKASI.md`:**
   - §15.3: Catatan ekstensi lokal perabot — alasan (isu paling umum, transparansi sidang).
   - §15.4: Tabel gejala perabot setelah "Saluran air kotor" dengan rujukan "Ekstensi lokal".

**Verifikasi:**
- Pytest: `test_bank_lengkap_9_komponen` + `test_pemilih_deskripsi_perabot` + `test_post_laporan_deskripsi_perabot_dapat_konfirmasi` lulus.
- Simulasi: `pilih_pertanyaan("beberapa meja dan kursi ada yang rusak…")` → `len(q) == 2`, ada gejala perabot → `perlu_konfirmasi = true`.
- Backend `--reload` otomatis; user test submit deskripsi perabot di UI → modal pertanyaan muncul ✓.

**Catatan:**
- Perabot bukan komponen gedung pada tabel Kemendikbud resmi; ditambahkan karena isu paling umum dataset. Rujukan "Ekstensi lokal" agar dapat dipertanggungjawabkan di sidang.
- Kontrak `INTERFACES.md` §4.1 tidak berubah — hanya perluasan deteksi komponen.

---

## 3.38 DBG-017 & D-30 — Pemisahan Wewenang Review Aduan: Verifikator Lapangan vs Pengawasan Kepala Dinas (2026-10-22) ✅ SELESAI

**Perbaikan DBG-017 & Keputusan Produk D-30:**
- **Latar Belakang Birokrasi:** Mengacu pada Permendagri No. 8/2023 dan pedoman SP4N-LAPOR!, verifikasi teknis/lapangan atas berkas laporan fisik adalah kewenangan Pejabat Pengelola Pengaduan (Verifikator Dinas), bukan Kepala Dinas. Membebankan verifikasi teknis aduan mandiri kepada satu orang Kepala Dinas menjadi hambatan operasional, sedangkan Kepala Dinas tetap memerlukan fungsi pengawasan (monitoring).
- **Perubahan Backend & Kontrak:**
  - `GET /laporan/perlu-review`: `RoleChecker(["admin", "verifikator_dinas", "kepala_dinas"])` — verifikator dan kepala dinas dapat membaca daftar laporan noise.
  - `PUT /laporan/{id}/status`: `RoleChecker(["admin", "verifikator_dinas"])` — hanya verifikator dan admin yang dapat memvalidasi/menolak status sanggahan aduan. Kepala dinas ditolak (403).
- **Perubahan Frontend:**
  - `LaporanPerluReview.tsx`: Hak aksi dibatasi untuk `admin` dan `verifikator_dinas`. Akun `kepala_dinas` menerima tampilan mode pengawasan (read-only).
- **Dokumentasi Terkait:**
  - `docs/universal/DECISIONS.md`: Menambahkan **D-30**.
  - `docs/universal/INTERFACES.md`: Memperbarui tabel RBAC §4.
  - `docs/backend/DEBUGGING.md`: Menandai **DBG-017** `✅ SELESAI`.

---

## 3.37 DBG-023 & D-29 — Ekspos Publik Aduan Mandiri Tervalidasi Dinas (2026-10-22) ✅ SELESAI

**Perbaikan DBG-023 & Keputusan Produk D-29:**

1. **Masalah:**
   - Laporan warga yang diverifikasi oleh Kepala Dinas melalui `/dinas/perlu-review` (`status_sanggahan = 'divalidasi'`) namun berstatus noise HDBSCAN (`klaster_id IS NULL`) tidak pernah muncul pada tab "Transparansi Publik" `/laporan/riwayat` karena tab tersebut hanya membaca `GET /klaster`.
   - Contoh kasus: SMP SUNAN GIRI 1 LAMONGAN (`TRK-AUG-500-0460`).

2. **Perubahan:**
   - `backend/app/routers/laporan.py`:
     - Menambahkan endpoint publik `GET /laporan/publik`.
     - Menyaring laporan dengan kondisi `Laporan.status_sanggahan == "divalidasi"` dan `Laporan.klaster_id.is_(None)`.
     - Menerapkan de-identifikasi `user_id` menjadi string kosong untuk kepatuhan privasi UU PDP di ranah publik.
   - `backend/tests/test_blackbox.py`:
     - Menambahkan unit test `test_laporan_publik_hanya_divalidasi_tanpa_klaster`.
   - `frontend/src/lib/api/laporan.ts`:
     - Menambahkan fungsi client `listLaporanPublik()`.
   - `frontend/src/pages/warga/RiwayatLaporan.tsx`:
     - Menambahkan sub-filter switcher: `[Klaster Isu Sarpras]` vs `[Aduan Mandiri Tervalidasi]`.
     - Menampilkan kartu khusus aduan mandiri dengan badge `✓ Terverifikasi Dinas (Aduan Mandiri)` dan rincian sarpras sekolah.
   - Dokumen:
     - `docs/universal/INTERFACES.md`: Menambahkan spesifikasi `GET /laporan/publik`.
     - `docs/universal/DECISIONS.md`: Menambahkan **D-29**.
     - `docs/backend/DEBUGGING.md`: Menandai **DBG-023** `✅ SELESAI`.

**Bukti verifikasi:**
- Pytest `test_blackbox.py -k test_laporan_publik` lulus 100%.
- Endpoint `GET /laporan/publik` live mengembalikan aduan `TRK-AUG-500-0460` (SMP SUNAN GIRI 1).
- Frontend `npm run build` sukses 100% tanpa error.

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