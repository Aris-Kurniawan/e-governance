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

# FASE 2 — Fitur Dasar (Minggu 4–7) 🔄 Berjalan

## 2.1 Auth & RBAC (F2.1–F2.3, 2026-09-15)

- **`app/schemas/auth.py`** — Pydantic: `RegisterRequest` (validasi NIK 16
  digit, email, password min 8), `LoginRequest`, `RefreshRequest`,
  `TokenResponse`, `UserMeResponse`.
- **`app/core/deps.py`** — dependency `get_current_user` (parse JWT Bearer,
  cek claim `type: "access"`), `RoleChecker` untuk RBAC, helper
  `hash_password`/`verify_password` (pwdlib argon2), `create_token`.
- **`app/routers/auth.py`** — 4 endpoint sesuai `INTERFACES.md`:
  - `POST /auth/register` → 201 `{ user_id, status_verifikasi }`, NIK
    dienkripsi ke PDP Vault, **tidak pernah** dikembalikan.
  - `POST /auth/login` → `{ access_token, refresh_token, role, status_verifikasi }`.
  - `POST /auth/refresh` → rotasi token baru (access 60 menit, refresh 7 hari).
  - `GET /auth/me` → data akun sendiri (tanpa NIK).
- **`app/core/config.py`** — tambah `JWT_REFRESH_EXPIRE_DAYS: int = 7`.
- **`app/main.py`** — register `auth.router`.
- **`tests/test_auth.py`** — 5 test: register, login+me, wrong password,
  refresh, NIK invalid.
- **`requirements.txt`** — tambah `PyJWT`, `pwdlib[argon2]`, `httpx`,
  `email-validator` (via pydantic[email]).

**Verifikasi:** `python -m pytest -q` → **12 passed** (7 PDP + 5 auth).

---

## 2.2 Model FEAT-001 & FEAT-003 (F2.4, F2.9 — terpakai dari F1.2)

Model `Sekolah`, `SekolahDataResmi`, `KondisiSarana` (F2.4) dan `Laporan`,
`LaporanFoto` (F2.9) sudah dibuat sejak F1.2 — tidak perlu ditulis ulang,
tidak menambah migration baru.

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

## Status Fase 2

| Task | Status |
|------|--------|
| F2.1 — Register & Login (incl. refresh) | ✅ Selesai |
| F2.2 — Middleware Otorisasi RBAC | ✅ Selesai |
| F2.3 — Profile Management (`/auth/me`) | ✅ Selesai |
| F2.4 — Model SQLAlchemy (Sekolah) | ✅ Selesai (dari F1.2) |
| F2.9 — Model SQLAlchemy (Laporan) | ✅ Selesai (dari F1.2) |
| F2.5 — Schema Pydantic (Sekolah) | ⬜ Belum |
| F2.6 — Endpoint Sekolah | ⬜ Belum |
| F2.7 — Pencarian Sekolah | ⬜ Belum |
| F2.8 — Detail Kondisi Sarana | ⬜ Belum |
| F2.10 — Schema Pydantic (Laporan) | ⬜ Belum |
| F2.11 — Buat Laporan | ⬜ Belum |
| F2.12 — Riwayat Laporan User | ⬜ Belum |
| F2.13 — Detail Laporan | ⬜ Belum |
| F2.14 — Upload Foto ke MinIO/S3 | ⬜ Belum |
| F2.15 — Ingest CSV Dapodik | ⬜ Belum |
| F2.16 — Status Job Ingest | ⬜ Belum |
| F2.17 — Riwayat Sanggahan Sekolah | ⬜ Belum |

**Progress Fase 2: ~29%** (5 dari 17 task selesai — 3 auth baru + 2 model
terpakai dari F1.2).

---

## Catatan Terbuka

- [ ] Hapus scraper versi lama (`intercept_dapo.py`, `scrape_sekolah.py`,
      `_v2.py`, `_v3.py`) dan file raw sisa (`debug_page.html`, dll).
- [ ] Task queue AI Pipeline: BackgroundTasks / Celery / RQ.
- [ ] JWT rotation: perlu refresh_token? — *sebagian sudah dijawab: refresh
      token diimplementasikan (F2.1); pertanyaan rotation policy masih terbuka.*
- [ ] S3 URL: presigned (privat) atau publik?
- [ ] Retention policy `audit_log` dan `status_log`.