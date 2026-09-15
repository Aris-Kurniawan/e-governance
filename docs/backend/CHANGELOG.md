# CHANGELOG.md — Backend SIMAKIS

> Catatan perubahan backend. Format: tanggal (WIB) — task — ringkasan.
> Realisasi kerja, pelengkap `ROADMAP.md` (rencana).

---

## 2026-09-14

### Added — Dokumentasi

- **TASK_GUIDE.md** — Panduan tugas backend per fitur (51 task, Fase 1–4),
  diturunkan dari `PRD.md`, `ROADMAP.md`, dan `DATABASE_SCHEMA.md`.
  Mencakup F1.1–F1.7 (Persiapan), F2.1–F2.16 (Fitur Dasar),
  F3.1–F3.22 (Fitur Lanjutan), F4.1–F4.6 (Integrasi & Finalisasi),
  plus peta dependency antar task dan catatan terbuka.

### Added — Dataset Scraping (F1.6)

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

  **Catatan teknis:** Endpoint Dapodik mengembalikan 403 tanpa header
  `authorization: Bearer <token>`. Token tidak tersimpan di
  localStorage/sessionStorage — disuntik JS ke XHR, sehingga harus
  ditangkap dari request pertama.

### Added — Setup Project (F1.1)

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

## 2026-09-14 (lanjutan)

### Changed — Audit & Sinkronisasi Skema

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

### Added — Database & Migrasi (F1.2)

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

**Verifikasi SQLite:** `alembic upgrade head` + `revision --autogenerate`
dijalankan terhadap SQLite sementara (`*.db`, di-gitignore) — 12 tabel +
`alembic_version` terbuat, struktur kolom cocok dengan
`DATABASE_SCHEMA.md`. `dev_check.db` dihapus setelah verifikasi.

**Verifikasi MySQL (2026-09-15):** `alembic upgrade head` ke MySQL 8.4.11
di WSL — database `simakis` dibuat, 13 tabel terbuat (12 tabel + 
`alembic_version`), ENUM/DECIMAL berjalan sesuai. F1.5 selesai.

  **Catatan auth MySQL 8.4:** plugin `mysql_native_password` sudah
  dihapus di MySQL 8.4; dipakai `caching_sha2_password` (default) +
  `cryptography` untuk PyMySQL.

### Added — PDP Vault Helper (F1.3)

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

### Changed — `requirements.txt`

- Lengkapi dependency yang sudah dipakai tapi belum tercatat: `alembic`,
  `SQLAlchemy`, `PyMySQL`, `cryptography`, `greenlet`, `pytest`.

### Changed — `.gitignore`

- Tambah `*.db` (SQLite dev check) agar tidak ter-commit.

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

## Catatan Terbuka

- [ ] Hapus scraper versi lama (`intercept_dapo.py`, `scrape_sekolah.py`,
      `_v2.py`, `_v3.py`) dan file raw sisa (`debug_page.html`, dll).
- [ ] Task queue AI Pipeline: BackgroundTasks / Celery / RQ.
- [ ] JWT rotation: perlu refresh_token?
- [ ] S3 URL: presigned (privat) atau publik?
- [ ] Retention policy `audit_log` dan `status_log`.
