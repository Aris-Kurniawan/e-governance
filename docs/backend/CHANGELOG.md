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

---

## Status Fase 1

| Task | Status |
|------|--------|
| F1.1 — Setup FastAPI Project Structure | ✅ Selesai |
| F1.2 — Database & Migrasi Alembic | ⬜ Belum |
| F1.3 — PDP Vault Helper | ⬜ Belum |
| F1.4 — Setup Config & Environment | ✅ Selesai (digabung F1.1) |
| F1.5 — Verifikasi Koneksi DB | ⬜ Belum |
| F1.6 — Scraping Dapodik | ✅ Selesai |
| F1.7 — Parsing PDF Dapodik | ⚠️ Opsional (API JSON sudah cukup) |

**Progress Fase 1: ~57%** (4 dari 7 task selesai; F1.7 kemungkinan
tidak diperlukan karena scraping JSON API sudah berhasil).

---

## Catatan Terbuka

- [ ] Hapus scraper versi lama (`intercept_dapo.py`, `scrape_sekolah.py`,
      `_v2.py`, `_v3.py`) dan file raw sisa (`debug_page.html`, dll).
- [ ] Task queue AI Pipeline: BackgroundTasks / Celery / RQ.
- [ ] JWT rotation: perlu refresh_token?
- [ ] S3 URL: presigned (privat) atau publik?
- [ ] Retention policy `audit_log` dan `status_log`.
