  -# TASK_GUIDE.md — Backend SIMAKIS

> Panduan tugas backend per fitur berdasarkan `PRD.md`, `ROADMAP.md`,
> dan `DATABASE_SCHEMA.md`. Dokumen ini menjadi **single source of truth**
> untuk pekerjaan Aris (Backend Engineer).

**Update terakhir:** 14 September 2026

---

## Peta Fase & Timeline

| Fase | Minggu | Fokus Backend |
|------|--------|---------------|
| **Fase 1** | 1–3 | Skema DB, Scraping/Parsing Dapodik, Setup Project |
| **Fase 2** | 4–7 | FEAT-001 (Sekolah), FEAT-003 (Laporan), Auth/RBAC Dasar |
| **Fase 3** | 8–11 | FEAT-004 (AI Pipeline), FEAT-005 (Voting), FEAT-006 (Status), RBAC Penuh |
| **Fase 4** | 12–14 | Integrasi FE↔BE, Testing, Finalisasi |

---

## FASE 1 — Persiapan (Minggu 1–3)

### F1.1 — Setup FastAPI Project Structure

**Tujuan:** Membuat struktur folder dasar sesuai `GIT_WORKFLOW.md` §2.

| Item | Path |
|------|------|
| Entry point | `app/main.py` |
| Config & security | `app/core/config.py`, `app/core/pdp.py`, `app/core/deps.py`, `app/core/audit.py` |
| Models (SQLAlchemy) | `app/models/` |
| Schemas (Pydantic) | `app/schemas/` |
| Routers (Endpoints) | `app/routers/` |
| AI Pipeline | `app/ai_pipeline/` |
| Dataset Ingestion | `app/dataset/` |

**Deliverable:** Struktur folder + `app/main.py` bisa dijalankan via `uvicorn`.

---

### F1.2 — Setup Database & Migrasi Alembic

**Tujuan:** Konfigurasi MySQL + buat semua migrasi tabel dari `DATABASE_SCHEMA.md`.

**Tabel yang harus dibuat (12 tabel):**

| # | Tabel | PK | Catatan |
|---|-------|----|---------|
| 1 | `users` | `id` CHAR(36) | UUID, role ENUM 6 nilai |
| 2 | `pdp_vault` | `user_id` CHAR(36) | Terpisah dari users, FK ke users |
| 3 | `sekolah` | `npsn` VARCHAR(20) | PK alami (bukan UUID); + field scraping (sekolah_id, status_sekolah, kecamatan, desa, lintang/bujur, akreditasi, nama_kepsek) |
| 4 | `sekolah_data_resmi` | `id` CHAR(36) | FK ke sekolah.npsn |
| 5 | `kondisi_sarana` | `id` CHAR(36) | FK ke sekolah.npsn; **agregat per jenis ruang** (jumlah + 4 kondisi + sumber) |
| 6 | `laporan` | `id` CHAR(36) | FK ke users + sekolah, klaster_id nullable |
| 7 | `laporan_foto` | `id` CHAR(36) | FK ke laporan, storage_key (bukan biner) |
| 8 | `klaster` | `id` CHAR(36) | FK ke sekolah, skor_prioritas computed |
| 9 | `vote` | `id` CHAR(36) | UNIQUE(klaster_id, user_id) |
| 10 | `status_log` | `id` CHAR(36) | Append-only, FK ke klaster + users |
| 11 | `ingest_job` | `id` CHAR(36` | Status diproses/selesai/gagal |
| 12 | `audit_log` | `id` CHAR(36) | Aksi, actor, target |

**Deliverable:** `alembic.ini` + `alembic/` + `alembic upgrade head` berhasil.

---

### F1.3 — Implementasi PDP Vault Helper

**Tujuan:** Modul enkripsi/dekripsi AES-256 untuk data sensitif (NIK).

**Spesifikasi:**
- Lokasi: `app/core/pdp.py`
- Library: `cryptography` (Fernet atau AES-GCM)
- Key dari environment: `PDP_ENCRYPTION_KEY`
- Fungsi: `encrypt_nik(plain: str) -> bytes`, `decrypt_nik(cipher: bytes) -> str`
- **Hanya** modul ini yang boleh query `pdp_vault` langsung

**Deliverable:** `pdp.py` + unit test encrypt/decrypt.

---

### F1.4 — Setup Config & Environment

**Tujuan:** Centralisasi konfigurasi dari `.env`.

**Environment variables:**

```env
# Database
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/simakis

# Auth
JWT_SECRET=<ganti-dengan-secret-kuat>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# PDP Vault
PDP_ENCRYPTION_KEY=<32-byte-key-untuk-AES-256>

# MinIO / S3
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=<isi>
MINIO_SECRET_KEY=<isi>
MINIO_BUCKET=simakis-media

# AI Pipeline
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
```

**Deliverable:** `app/core/config.py` dengan Pydantic BaseSettings.

---

### F1.5 — Setup Database & Verifikasi Koneksi

**Deliverable:** MySQL running + `alembic upgrade head` tanpa error.

---

### F1.6 — Prototype Scraping Dapodik (Playwright)

**Tujuan:** Proof of concept scraping PDF profil sekolah dari portal Dapodik.

**Catatan:** Dokumen ini masih berdasarkan catatan awal. Begitu kode scraping asli dibagikan, bagian ini perlu direvisi sesuai nama fungsi/parameter yang benar-benar dipakai (`INTEGRATION.md` §1.2).

**Deliverable:** Script Playwright yang bisa mengunduh PDF profil sekolah per NPSN.

---

### F1.7 — Prototype Parsing PDF Dapodik

**Tujuan:** Ekstrak field dari PDF profil sekolah.

**Field yang harus diekstrak:**
- Rasio guru:siswa
- Kondisi sarana per ruang (Baik / Rusak Ringan / Rusak Sedang / Rusak Berat)
- Indikator Kualitas Data (IKD)
- Tanggal pembaruan data

**Deliverable:** Parser yang menghasilkan CSV sesuai format `INTERFACES.md` §8.

---

## FASE 2 — Fitur Dasar (Minggu 4–7)

### A. Auth & RBAC (Cross-Cutting)

#### F2.1 — Register & Login

| Endpoint | Method | Body/Response |
|----------|--------|---------------|
| `/auth/register` | POST | `{ nama, nik, email, password, sekolah_terkait_id? }` → `{ user_id, status_verifikasi }` |
| `/auth/login` | POST | `{ email, password }` → `{ access_token, refresh_token, role, status_verifikasi }` |
| `/auth/refresh` | POST (Publik) | `{ refresh_token }` → `{ access_token, refresh_token, role, status_verifikasi }` |
| `/auth/me` | GET (Semua role login) | → `{ id, nama, email, role, status_verifikasi, sekolah_terkait_npsn? }` |

**Validasi:**
- NIK 16 digit (422 VALIDATION_ERROR kalau salah)
- Email unique (cek di DB)
- Password di-hash dengan pwdlib argon2
- Default role: `warga_umum`, status_verifikasi: `menunggu`
- NIK tidak pernah dikembalikan di respons API (disimpan di PDP Vault terenkripsi)
- Refresh token berisi claim `type: "refresh"`, access token `type: "access"`

**Deliverable:** Register, login, refresh token, dan profile (GET /auth/me) functional.

---

#### F2.2 — Middleware Otorisasi RBAC

**Role hierarchy:**
```
admin > kepala_dinas > verifikator_dinas > komite_sekolah > warga_terverifikasi > warga_umum
```

**Implementasi:**
- Dependency injection di `app/core/deps.py`
- Decorator: `require_role([role1, role2])`
- Extract user dari JWT Bearer token

**Deliverable:** Semua endpoint bisa dilindungi per role.

---

#### F2.3 — Profile Management

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/users/me` | GET | Lihat profil sendiri |
| `/users/me` | UPDATE | Update nama/password |

**Deliverable:** User bisa lihat & update profil.

---

### B. FEAT-001 — Direktori & Profil Sekolah

#### F2.4 — Model SQLAlchemy (Sekolah)

```python
# app/models/sekolah.py
class Sekolah(Base):
    __tablename__ = "sekolah"
    npsn = Column(String(20), primary_key=True)
    sekolah_id = Column(String(36), nullable=True)   # UUID Dapodik
    nama = Column(String(255))
    alamat = Column(String(500))
    jenjang = Column(Enum("SD", "SMP", "SMA", "SMK"))
    status_sekolah = Column(Enum("Negeri", "Swasta"), nullable=True)
    kecamatan = Column(String(255), nullable=True)
    desa_kelurahan = Column(String(255), nullable=True)
    lintang = Column(Numeric(10, 7), nullable=True)
    bujur = Column(Numeric(10, 7), nullable=True)
    akreditasi = Column(String(5), nullable=True)
    nama_kepsek = Column(String(255), nullable=True)
    sumber_data = Column(String(50))
    tanggal_pembaruan_data = Column(Date)
    tanggal_verifikasi_baseline = Column(Date, nullable=True)

class KondisiSarana(Base):
    __tablename__ = "kondisi_sarana"
    id = Column(String(36), primary_key=True)
    sekolah_npsn = Column(String(20), ForeignKey("sekolah.npsn"))
    nama_ruang = Column(String(255))          # jenis ruang
    jumlah = Column(Integer, default=0)
    kondisi_baik = Column(Integer, default=0)
    kondisi_rusak_ringan = Column(Integer, default=0)
    kondisi_rusak_sedang = Column(Integer, default=0)
    kondisi_rusak_berat = Column(Integer, default=0)
    sumber = Column(Enum("dapodik", "laporan_warga"))
    __table_args__ = (UniqueConstraint("sekolah_npsn", "nama_ruang", "sumber"),)
```

**Deliverable:** 3 model: `S ekolah`, `SekolahDataResmi`, `KondisiSarana` (agregat per jenis ruang).

---

#### F2.5 — Schema Pydantic (Request/Response)

```python
# app/schemas/sekolah.py
class KondisiSaranaResponse(BaseModel):
    nama_ruang: str
    jumlah: int
    baik: int
    rusak_ringan: int
    rusak_sedang: int
    rusak_berat: int
    perlu_verifikasi: bool
    ada_sanggahan: bool

class SekolahResponse(BaseModel):
    npsn: str
    nama: str
    alamat: str
    jenjang: str
    status_sekolah: str | None
    jumlah_isu_aktif: int
    penanda_masalah: str

class SekolahDetailResponse(SekolahResponse):
    akreditasi: str | None
    nama_kepsek: str | None
    rasio_guru_siswa: str
    rasio_spm_terpenuhi: bool
    jumlah_pd: int
    jumlah_ptk: int
    jumlah_rombel: int
    utilitas_kapasitas_belajar: float
    kondisi_sarana: list[KondisiSaranaResponse]
    ringkasan_sarpras: dict           # total_unit, total_baik, ...
    klaster_isu: list[dict]
```

**Deliverable:** Schema untuk semua endpoint sekolah (termasuk `kondisi_sarana` agregat).

---

#### F2.6 — Endpoint Sekolah

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/sekolah` | GET | Publik | Daftar semua sekolah (filterable: jenjang, nama) |
| `/sekolah/{npsn}` | GET | Publik | Detail sekolah + rasio guru + kondisi sarana |

**Deliverable:** Direktori sekolah bisa diakses.

---

#### F2.7 — Pencarian Sekolah

| Endpoint | Method | Query |
|----------|--------|-------|
| `/sekolah` | GET | `?search=&jenjang=&page=` |

**Deliverable:** Direktori sekolah dengan filter dan pagination.

---

#### F2.8 — Detail Kondisi Sarana

**Sesuai INTERFACES.md, kondisi sarana sudah termasuk dalam `GET /sekolah/{npsn}`**
(field `data_resmi.kondisi_sarana`) — **tidak ada** endpoint `/sekolah/{npsn}/sarana`.

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/sekolah/{npsn}` | GET | Detail sekolah + `kondisi_sarana` (agregat per jenis ruang) |

**Deliverable:** Kondisi sarana terlihat dalam respons detail sekolah.

---

### C. FEAT-003 — Pelaporan Isu

#### F2.9 — Model SQLAlchemy (Laporan)

```python
# app/models/laporan.py
class Laporan(Base):
    __tablename__ = "laporan"
    id = Column(String(36), primary_key=True)  # UUID
    tracking_id = Column(String(50), unique=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    sekolah_npsn = Column(String(20), ForeignKey("sekolah.npsn"))
    # kategori DIHAPUS (Keputusan #1, 2026-09-23): kategori hanya ada di tabel klaster (hasil AI)
    fasilitas_terkait = Column(String(255), nullable=True)   # nama_ruang yang dilaporkan (opsional, dari teks warga)
    kondisi_dilaporkan = Column(Enum("baik", "rusak_ringan", "rusak_sedang", "rusak_berat"), nullable=True)
    deskripsi = Column(Text)
    klaster_id = Column(String(36), ForeignKey("klaster.id"), nullable=True)
    status_sanggahan = Column(Enum("menunggu", "divalidasi", "ditolak"), default="menunggu")
    created_at = Column(DateTime)
```

**Catatan:** Kolom `kategori` dihapus (lihat CHANGELOG.md §3.3 Keputusan #1). Kategori infrastruktur kini ditentukan oleh AI pipeline dan disimpan di tabel `klaster.kategori`.

**Deliverable:** 2 model: `Laporan`, `LaporanFoto`.

---

#### F2.10 — Schema Pydantic (Laporan)

```python
class LaporanCreate(BaseModel):
    sekolah_npsn: str
    # kategori DIHAPUS (Keputusan #1, 2026-09-23): laporan teks bebas, kategori ditentukan AI
    fasilitas_terkait: str | None       # nama ruang yang dilaporkan (opsional, dari teks warga)
    kondisi_dilaporkan: str | None      # kondisi aktual menurut warga (baik/ringan/sedang/berat)
    deskripsi: str                      # teks bebas minimal 50 karakter

class LaporanResponse(BaseModel):
    id: str
    tracking_id: str
    status: str
    created_at: datetime
```

**Catatan:** Field `kategori` dihapus dari request schema; kategori nanti ditentukan oleh AI pipeline dan muncul di tabel klaster.

**Deliverable:** Schema untuk semua endpoint laporan.

---

#### F2.11 — Buat Laporan

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/laporan` | POST | `warga_terverifikasi`, `komite_sekolah` | `{ sekolah_npsn, deskripsi, fasilitas_terkait?, kondisi_dilaporkan?, foto? }` |

**Validasi:**
- `deskripsi` minimal 50 karakter (teks bebas)
- `fasilitas_terkait` opsional (warga bisa atau tidak menyebut nama fasilitas dalam deskripsi)
- `kondisi_dilaporkan` opsional (baik/ringan/sedang/berat), dipakai untuk scoring keparahan jika ada
- Generate `tracking_id` unik untuk ditampilkan ke warga
- Simpan metadata foto (kalau ada) ke `laporan_foto`

**Catatan:** Tidak ada field `kategori` — warga melaporkan teks bebas, AI pipeline yang nanti mengelompokkan ke kategori infrastruktur (lihat Fase 3).

**Deliverable:** Warga bisa kirim laporan.

---

#### F2.12 — Riwayat Laporan User

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/laporan/riwayat` | GET | `warga_terverifikasi`, `komite_sekolah` | Daftar laporan yang dikirim user |

**Deliverable:** User bisa lihat riwayat laporannya.

---

#### F2.13 — Detail Laporan

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/laporan/{id}` | GET | Pemilik laporan, `verifikator_dinas`, `kepala_dinas` | Detail satu laporan |

> Catatan: detail laporan **bukan** publik (sesuai INTERFACES.md §4 — akses
> terbatas pemilik + dinas). Pantauan status publik memakai
> `GET /klaster/{id}/status` (F3.3).

**Deliverable:** Detail laporan tampil untuk pemilik & dinas.

---

#### F2.14 — Upload Foto ke MinIO/S3

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/laporan/{id}/foto` | POST | `warga_terverifikasi`, `komite_sekolah` | `multipart/form-data` (foto) |

**Alur:**
```
Client kirim foto (multipart) → FastAPI terima →
Striping Metadata (nama, ukuran, tipe) →
Metadata disimpan ke MySQL (laporan_foto) →
Isi file diupload ke MinIO/S3 via boto3 →
Response: { foto_id, url_referensi }
```

**Deliverable:** Foto bukti tersimpan terenkripsi di MinIO.

---

#### F2.15 — Ingest CSV Dapodik

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/ingest/dapodik` | POST | `admin`, `verifikator_dinas` | `multipart/form-data` (CSV) |

**Alur:**
```
Upload CSV → Buat ingest_job (status: diproses) →
Proses async (pandas): validasi NPSN per baris →
Baris valid → insert/update sekolah, kondisi_sarana →
Baris gagal → catat di ingest_job.baris_gagal →
Update ingest_job.status = selesai
```

**Validasi per baris:**
- NPSN harus valid & terdaftar di `sekolah`
- Baris gagal tidak membatalkan batch (baris valid lain tetap masuk)

**Deliverable:** Data Dapodik masuk ke database.

---

#### F2.16 — Status Job Ingest

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/ingest/riwayat` | GET | `admin`, `verifikator_dinas` | Daftar riwayat job ingest |

**Deliverable:** Monitoring status ingest job.

---

#### F2.17 — Riwayat Sanggahan Sekolah

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/sekolah/{npsn}/sanggahan` | GET | Publik | Riwayat sanggahan warga untuk satu sekolah |

**Catatan:** tombol "Sanggah Data Ini" di kartu fasilitas memakai
`POST /laporan` yang sudah ada (`fasilitas_terkait` + `kondisi_dilaporkan`).
Endpoint ini hanya menampilkan riwayatnya, dikelompokkan per `nama_ruang`.

**Deliverable:** Riwayat sanggahan tampil per sekolah/fasilitas.

---

## FASE 3 — Fitur Lanjutan (Minggu 8–11)

### Rencana Eksekusi Fase 3 (Timeline & Urutan Pengerjaan)

#### 🔑 Panduan Membaca Dokumentasi Ini

Dokumentasi ini menggunakan **3 level istilah** yang mudah tertukar. Berikut penjelasannya:

| Istilah | Arti | Contoh | Siapa yang nentuin |
|---------|------|--------|--------------------|
| **Fase 1/2/3/4** | Fase besar proyek (dari `ROADMAP.md`) | Fase 3 = Fitur Lanjutan (AI + Voting + Dashboard) | Roadmap awal |
| **Fase A–F** | Pengelompokan tipe kerja **dalam Fase 3** (dibuat saat perencanaan eksekusi) | Fase D = AI pipeline inti | Rencana eksekusi ini |
| **F3.0a, F3.1, …, F3.22** | Task individual dengan deliverable spesifik | F3.3 = Clustering HDBSCAN | Task breakdown |

**Hubungannya:**
```
Fase 3 (proyek besar)
├── Fase A  → (bukan F3.x, ini prerequisite: schema changes)
├── Fase B  → (bukan F3.x, ini dokumentasi, sudah selesai ✅)
├── Fase C  → berisi: F3.0a
├── Fase D  → berisi: F3.1, F3.2, F3.3, F3.4, F3.5   ← INI AI pipeline
├── Fase E  → berisi: F3.0b, F3.0c, F3.0d, F3.0e, F3.0f  ← testing pipeline
└── Fase F  → berisi: F3.6, F3.7*, F3.8–F3.22       ← API + dashboard
              (* sudah selesai dari F1.2)
```

**Catatan penting:** Fase A–F **bukan** langkah-langkah dalam satu pipeline. Hanya Fase D yang merupakan AI pipeline (embedding → UMAP → HDBSCAN → TF-IDF → scoring). Fase lainnya = pekerjaan pendukung sebelum dan sesudah pipeline.

| Fase | Tipe Kerja | Hubungannya dengan AI Pipeline |
|------|-----------|-------------------------------|
| A | Perubahan database (drop kolom `kategori`) | **Prerequisite** — harus selesai sebelum pipeline jalan |
| C | Manual clustering (ground truth) | **Persiapan data** — benchmark untuk mengukur akurasi AI |
| D | Bangun pipeline: embedding, clustering, scoring | **PIPELINE ITU SENDIRI** ✅ |
| E | Ablation study (81 kombinasi testing) | **Quality assurance** — cari config optimal sebelum production |
| F | API endpoints + dashboard | **Delivery** — expose hasil pipeline ke user (warga, verifikator, dinas) |

---

> **Sumber keputusan desain:** 8 keputusan final (free-text laporan, 5 kategori
> hibrida, cron harian, verifikasi 1-per-1 + badge, outlier `belum_terklasifikasi`,
> dual labeling, skor gabungan, literatur) terdokumentasi di `CHANGELOG.md` §3.3.
> Section ini = **satu-satunya sumber timeline pengerjaan Fase 3**.

**Status awal:** 5/24 task selesai (F3.00, F3.7, F3.11, F3.16, F3.20 — model dari F1.2).

#### Urutan Langkah Pengerjaan

| # | Langkah | Pelaku | Output / Kriteria Selesai |
|---|---------|--------|---------------------------|
| 0 | Cek posisi: branch `backend`, `git status` bersih, backup DB (opsional) | Aris | Working tree bersih sebelum eksekusi |
| 1 | **Fase A** — Drop `laporan.kategori` (migration + model + schema + router + re-seed) ✅ **SELESAI (23 Sep 2026, belum commit)** | Assistant | `alembic upgrade head` sukses, 14/14 tests hijau |
| 2 | Update `INTERFACES.md` (hapus `kategori` dari `POST /laporan`) + kabari Dimas — doc ✅, kabari Dimas ⏳ | Assistant + Aris | Kontrak FE↔BE sinkron; form FE tanpa dropdown kategori |
| 3 | Review hasil Fase A → commit (hanya atas instruksi eksplisit "commit") | Aris | Commit di branch `backend` |
| 4 | **Fase C** — F3.0a manual clustering 62 sekolah (butuh input domain untuk tie-breaker) | Assistant + Aris | `manual_clusters.json` valid, 62 NPSN terkategorisasi |
| 5 | **Fase D** — Pipeline inti F3.1–F3.5 | Assistant | 5 modul pipeline + tests |
| 6 | **Fase E** — Ablation F3.0b–F3.0f (81 kombinasi) | Assistant | `ABLATION_RESULTS.md` + config optimal terpasang |
| 7 | **Fase F** — Endpoint & dashboard F3.6, F3.8–F3.22 | Assistant | Semua endpoint sesuai kontrak, tests hijau |

#### Estimasi Timeline

| Fase | Isi | Estimasi |
|------|-----|----------|
| A | Schema changes (hapus `kategori`) + dokumentasi | 1 hari |
| C | F3.0a manual clustering (62 sekolah) | 1 hari |
| D | F3.1–F3.5 pipeline inti (embedding → scoring) | 3 hari |
| E | F3.0b–F3.0f ablation study (81 kombinasi) | 3–4 hari |
| F | F3.6, F3.8–F3.22 endpoints & dashboard | 5 hari |
| | **Total sisa** | **~13 hari** |

#### Catatan Eksekusi

- **Jangan pernah auto-commit** — commit hanya setelah Aris bilang "commit".
- Setiap fase: jalankan `./venv/bin/python -m pytest` sebelum lanjut.
- Fase B (perbaikan dokumentasi ablation study §0.3/§1) **sudah selesai** (23 Sep 2026) — tidak ada lagi di timeline.
- `INTERFACES.md` masih pending update `POST /laporan` — dikerjakan bersamaan Fase A (langkah #2).

---

### A. FEAT-004 — Klasterisasi Isu (AI Pipeline)

#### F3.00 — Setup & Prerequisites for Ablation Study

**Tujuan:** Menyiapkan data dan environment untuk ablation study AI pipeline.

**Langkah:**
1. **Register admin user** — `POST /auth/register` dengan peran `admin`
2. **Jalankan ingest CSV** (F2.15) — `POST /ingest/dapodik` dengan file `sekolah_lamongan_semua.csv`
3. **Seed dummy laporan** — Generate ~100 laporan dummy dengan **teks bebas realistis** (tanpa field `kategori`), distribusi ke 62 sekolah, deskripsi minimal 50 karakter
4. **Verify DB populated** — Verifikasi jumlah Sekolah ≥ 62, Laporan ≥ 100 (semua tanpa kategori), KondisiSarana terisi
5. **Cek Python dependencies** — `sentence-transformers`, `umap-learn`, `hdbscan`, `scikit-learn`, `python-multipart`, `minio`

**Estimasi Waktu:** 30 menit

**Deliverable:**
- `app/ai_pipeline/experiments/manual_clusters.json` — Ground truth manual (akan dibuat di F3.0a)
- `app/ai_pipeline/experiments/manual_laporan.json` — Dummy laporan untuk testing
- Semua library AI terinstall di venv

**Status: ✅ SELESAI (22 Sep 2026)**
- Admin user: `admin@simakis.id` / `Admin123!` (role: admin, terverifikasi)
- CSV Dapodik ingest: 62 sekolah + 304 KondisiSarana
- Seed laporan dummy: 100 laporan **teks bebas tanpa kategori** (distribusi ke 62 sekolah)
- Dependencies AI: torch 2.14.0+cpu, sentence-transformers 6.1.0, umap-learn 0.5.12, hdbscan 0.8.44, scikit-learn 1.9.1
- Tests: 12/12 pass

---

#### F3.0a — Manual Clustering (Ground Truth Preparation)

**Lokasi:** `app/ai_pipeline/experiments/manual_clusters.json`

**Tujuan:** Membuat klaster manual berdasarkan pengetahuan domain sebagai benchmark evaluasi AI pipeline.

**Metodologi (Keputusan #2, 2026-09-23):**
Ground truth = **5 kategori hibrida** (3 dari Dapodik + 2 dari laporan warga). Lihat CHANGELOG.md §3.3 untuk sumber literatur.

**Langkah per sekolah (62 NPSN):**
1. **Baca `kondisi_sarana` Dapodik** → hitung jumlah rusak per kategori:
   - `ruang_belajar` ← `ruang_kelas`, `perpustakaan`, `lab_ipa`, `lab_komputer` (dominan = max count)
   - `sanitasi_air` ← `wc_guru`, `wc_siswa`
   - `penunjang` ← `uks`
2. **Baca laporan teks warga sekolah itu** → cari indikasi kategori yang tidak ada di Dapodik:
   - `utilitas` ← teks tentang "listrik", "internet", "penerangan"
   - `akses_lahan` ← teks tentang "jalan", "pagar", "drainase"
3. **Tentukan kategori dominan** (skor tertinggi) → label cluster sekolah
4. **Tie-breaker:** domain knowledge (final review sebelum finalisasi)

**Format Output JSON** (refer ke AI_PIPELINE_ABLATION_STUDY.md §1.4):
```json
{
  "metadata": {
    "created_date": "2026-09-23",
    "total_schools": 62,
    "total_categories": 5,
    "source": "Hibrida: Dapodik kondisi_sarana (3 kategori) + laporan warga teks (2 kategori)"
  },
  "manual_clusters": {
    "c0": {
      "label": "ruang_belajar",
      "description": "...",
      "source_dapodik": ["ruang_kelas", "perpustakaan", "lab_ipa", "lab_komputer"],
      "schools": ["20505816", ...]
    },
    ...
  }
}
```

**Deliverable:**
- `app/ai_pipeline/experiments/manual_clusters.json` — Ground truth dengan 62 NPSN terkategorisasi ke 5 kategori

**Estimasi Waktu:** 1 hari

---

#### F3.0b — Implementasi Ablation Framework

**Lokasi:** `app/ai_pipeline/experiments/`

**Tujuan:** Membangun infrastructure untuk menjalankan 81 kombinasi testing.

**Deliverable:**
- `app/ai_pipeline/experiments/run_ablation.py` — Script utama loop 81 kombinasi (A1-A3 × B1-B3 × C1-C3 × D1-D3)
- `app/ai_pipeline/experiments/evaluation.py` — Fungsi evaluasi:
  - Internal metrics: `silhouette_score()`, `davies_bouldin_score()`
  - External metrics: `purity()`, `nmi()`, `ari()`, `homogeneity()`, `completeness()`, `v_measure()`
  - Manual review template
- `app/ai_pipeline/experiments/` structure (results/, config templates)

**Estimasi Waktu:** 2 hari

---

ws#### F3.0c — Running Test Suite A (Embedding Variations)

**Tujuan:** Jalankan 27 kombinasi untuk memilih embedding terbaik (3 embedding × 9 kombinasi B×C×D lainnya).

**Kombinasi:**
- A1 (IndoBERT) × B1-B3 × C1-C3 × D1-D3 = 27 test
- Estimasi: ~40 menit (A1 lamban dengan GPU)

**Deliverable:**
- `app/ai_pipeline/experiments/results/A1_*.json` (9 file)
- Metric report untuk A1

**Estimasi Waktu:** 1 hari (implementasi framework berjalan)

---

#### F3.0d — Running Test Suite B (TF-IDF Baseline + MiniLM)

**Tujuan:** Jalankan 27 kombinasi untuk A2 (TF-IDF) dan A3 (MiniLM).

**Kombinasi:**
- A2 × B1-B3 × C1-C3 × D1-D3 = 27 test (~2 menit)
- A3 × B1-B3 × C1-C3 × D1-D3 = 27 test (~10 menit)
- Total: ~12 menit

**Deliverable:**
- `app/ai_pipeline/experiments/results/A2_*.json` (9 file)
- `app/ai_pipeline/experiments/results/A3_*.json` (9 file)
- Metric report untuk A2 & A3

**Estimasi Waktu:** Paralel dengan F3.0c

---

#### F3.0e — Analysis & Reporting

**Tujuan:** Menganalisis hasil 81 kombinasi, identifikasi top 5 config terbaik.

**Langkah:**
1. Load 81 hasil JSON
2. Generate `summary_report.csv` (kolom: config, silhouette, NMI, ARI, purity, rank)
3. Sort by NMI/ARI (external metrics)
4. Identifikasi top 5 config
5. Manual review top 5 (apakah label relevan?)
6. Tulis laporan: `docs/backend/ABLATION_RESULTS.md`

**Deliverable:**
- `app/ai_pipeline/experiments/summary_report.csv`
- `docs/backend/ABLATION_RESULTS.md` — Laporan analisis dengan rekomendasi config optimal

**Estimasi Waktu:** 2 hari

---

#### F3.0f — Implementation of Optimal Config

**Tujuan:** Update F3.1-F3.5 dengan konfigurasi terbaik dari ablation study.

**Langkah:**
1. Tentukan config terbaik dari F3.0e (misal: A1+B1+C1+D2)
2. Update parameter default di:
   - `app/ai_pipeline/embedding.py` → model = config optimal A
   - `app/ai_pipeline/reduction.py` → n_components = config optimal B
   - `app/ai_pipeline/clustering.py` → min_cluster_size, min_samples = config optimal C
   - `app/ai_pipeline/labeling.py` → ngram_range, stopwords = config optimal D
3. Buat `app/ai_pipeline/pipeline.py` → integrasi semua komponen dengan config optimal
4. Test end-to-end pipeline

**Deliverable:**
- Updated F3.1-F3.5 dengan config terbaik
- `app/ai_pipeline/pipeline.py` — Pipeline utama end-to-end
- `tests/test_ai_pipeline.py` — Test integration

**Estimasi Waktu:** 1 hari

---

#### F3.0g — Ablation A4: Potion Embedding *(selesai 21 Okt 2026)*

**Latar belakang:** Saran dosen (21 Okt 2026) — bandingkan embedding IndoBERT/MiniLM yang besar dengan alternatif lebih ringan. Potion (`minishlab/potion-multilingual-128M`) dipilih karena multilingual, CPU-only, dan jauh lebih kecil (~128 MB).

**Tujuan:** Jalankan 27 kombinasi A4 × B1–B3 × C1–C3 × D1–D3 dan bandingkan NMI/ARI/Purity/Noise vs A1–A3 pada ground truth yang sama.

**Hasil Eksekusi:**
- 27 kombinasi A4 selesai dieksekusi dan disimpan di `backend/app/ai_pipeline/experiments/results/A4_*.json` serta `summary_report.csv`.
- Konfigurasi seimbang terbaik: **A4_B1_C2** (UMAP 10 + HDBSCAN min_cluster_size=3, min_samples=2) menghasilkan NMI = 0.1958, Purity = 0.6923, Noise = 16.1% (9 klaster).
- Konfigurasi tanpa reduksi A4_B2_C2 mencatat NMI 0.4413 namun anomali karena 88.7% data dibuang sebagai noise (hanya 7 dokumen masuk 2 klaster).
- **Keputusan:** A2 (TF-IDF 300 fitur, NMI = 0.3874, Noise 35.6%) tetap dipertahankan sebagai konfigurasi produksi utama. A4 didokumentasikan di `ABLATION_RESULTS.md` & `AI_PIPELINE_ABLATION_STUDY.md`.

**Langkah implementasi:**

1. **`app/ai_pipeline/embedding.py`** — tambah branch `method="potion"`:
   ```python
   if method == "potion":
       from model2vec import StaticModel
       model = StaticModel.from_pretrained("minishlab/potion-multilingual-128M")
       return np.asarray(model.encode(texts), dtype=np.float32)
   ```
   Sisipkan sebelum `raise ValueError(...)`. Tambah fallback ke TF-IDF bila `StaticModel` tidak tersedia (konsisten dengan guard `FALLBACK_USED` di `run_ablation.py`).

2. **`app/ai_pipeline/experiments/run_ablation.py`** — tambah `"potion"` ke `VARIANTS_A`:
   ```python
   VARIANTS_A = ["tfidf", "indobert", "minilm", "potion"]  # tambah "potion"
   ```
   27 kombinasi baru akan otomatis terbuat dari loop yang sudah ada.

3. **Jalankan** (dari folder `backend/`):
   ```bash
   ./venv/bin/python app/ai_pipeline/experiments/run_ablation.py --embedding potion
   ```
   Atau jalankan seluruh suite bila flag `--embedding` belum ada (27 kombinasi saja yang baru).

4. **`docs/backend/ABLATION_RESULTS.md`** — tambah tabel A4 di bawah tabel A1–A3 (jangan timpa — beri header baru `## Tambahan A4: Potion (21 Okt 2026)`).

5. **Keputusan adopsi:**
   - A4 NMI > A2 (0,3874) → ganti default `pipeline.py` + catat di `DECISIONS.md` (D-24+)
   - A4 NMI ≤ A2 → tetap A2, hasil A4 tetap dilaporkan sebagai perbandingan untuk laporan/skripsi

**Deliverable:**
- `embedding.py` dengan branch `method="potion"`
- 27 file hasil `A4_B*_C*_D*.json` di `experiments/results/`
- Tabel A4 di `ABLATION_RESULTS.md`
- Keputusan adopsi di `DECISIONS.md` (D-24 atau lebih)

**Estimasi Waktu:** ~2–3 jam (termasuk unduhan model ~128 MB + 27 run @~5–10 detik/run)

**Catatan:** Jangan jalankan seluruh 108 kombinasi sekaligus — jalankan A4 dulu (27 kombinasi), bandingkan hasilnya, baru putuskan apakah perlu iterasi lanjutan.

---

**Ringkasan F3.0 Sub-tasks:**

| Sub-task | Tujuan | Durasi | Dependen | Status |
|----------|--------|--------|----------|--------|
| F3.0a | Manual clustering | 1 hari | - | ✅ |
| F3.0b | Framework setup | 2 hari | F3.0a | ✅ |
| F3.0c | Test suite A (embedding) | 1 hari | F3.0b | ✅ |
| F3.0d | Test suite B (baseline + MiniLM) | Paralel F3.0c | F3.0b | ✅ |
| F3.0e | Analysis & reporting | 2 hari | F3.0c + F3.0d | ✅ |
| F3.0f | Optimal config implementation | 1 hari | F3.0e | ✅ |
| **F3.0g** | **Ablation A4: Potion embedding** | **~2–3 jam** | **F3.0f** | **⏳ Belum** |

**Total awal: 1 minggu** (F3.0a–F3.0f selesai). F3.0g tambahan atas saran dosen.

---

#### F3.1 — Embedding Teks (IndoBERT)

**Lokasi:** `app/ai_pipeline/embedding.py`

**Input:** Teks laporan (list of strings)
**Output:** Vektor embedding (numpy array)

**Library:** `sentence-transformers`
**Model:** `paraphrase-multilingual-MiniLM-L12-v2`

**Deliverable:** Fungsi `embed_texts(texts: list[str]) -> np.ndarray`

---

#### F3.2 — Reduksi Dimensi UMAP

**Lokasi:** `app/ai_pipeline/reduction.py`

**Input:** Embedding vektor (high-dimensional)
**Output:** Reduced vektor (low-dimensional)

**Library:** `umap-learn`
**Parameter:** `n_components=10`, `metric='cosine'`

**Catatan:** UMAP ditambahkan untuk meningkatkan kualitas clustering pada data berdimensi tinggi. (Belum ada entry di `DECISIONS.md`, perlu ditambahkan)

**Deliverable:** Fungsi `reduce_dimensions(embeddings: np.ndarray) -> np.ndarray`

---

#### F3.3 — Clustering HDBSCAN

**Lokasi:** `app/ai_pipeline/clustering.py`

**Input:** Reduced vektor
**Output:** Label klaster (integer, -1 = noise/outlier)

**Library:** `hdbscan`
**Parameter:** `min_cluster_size=5`, `min_samples=3`

**Outlier Handling (Keputusan #5, 2026-09-23):**
- Noise label (-1) dari HDBSCAN → masuk klaster khusus `klaster_id = "belum_terklasifikasi"`
- Klaster ini status `menunggu_verifikasi` permanent sampai verifikator review (F3.10)
- Verifikator bisa: setujui label otomatis (TF-IDF) → terverifikasi, atau manual assign kategori berbeda, atau tolak sebagai unclear

**Deliverable:** Fungsi `cluster_texts(vectors: np.ndarray) -> np.ndarray`

---

#### F3.4 — Labeling TF-IDF

**Lokasi:** `app/ai_pipeline/labeling.py`

**Input:** Teks per klaster
**Output:** Label klaster dengan **dual output** (Keputusan #6, 2026-09-23):
- **Label teks bebas** — keywords TF-IDF (contoh: "Atap Bocor Lantai Retak")
- **Enum kategori** — mapping ke 5 kategori infrastruktur (ruang_belajar, sanitasi_air, utilitas, akses_lahan, penunjang)

**Library:** `scikit-learn` (TfidfVectorizer + heuristic mapping)

**Mapping Algorithm:**
1. Extract ngram_keywords dari TF-IDF (top 5-10)
2. Cek keywords: jika mengandung kata "kelas", "lab", "perpus", "ruang" → `ruang_belajar`
3. Cek keywords: jika mengandung "wc", "toilet", "air", "sanitasi" → `sanitasi_air`
4. Cek keywords: jika mengandung "listrik", "internet", "penerangan", "listrik" → `utilitas`
5. Cek keywords: jika mengandung "jalan", "pagar", "drainase", "halaman" → `akses_lahan`
6. Cek keywords: jika mengandung "uks", "ibadah", "olahraga", "kantin" → `penunjang`
7. Tie-breaker: domain knowledge (final review)

**Deliverable:** Fungsi `label_clusters(texts: list[str], labels: np.ndarray) -> dict` dengan struktur `{ klaster_id: { label_teks: str, kategori: str } }`

---

#### F3.5 — Formula Urgensi KBM + Skor Prioritas

**Lokasi:** `app/ai_pipeline/scoring.py`

**Input:** 
- `kondisi_dilaporkan` dari laporan warga (baik=0, ringan=1, sedang=2, berat=3)
- `kondisi_sarana` dari Dapodik (jumlah rusak per sarana, berat/sedang/ringan)
- `jumlah_vote_terhitung` dari warga

**Output:** Skor prioritas akhir

**Formula (Keputusan #7, 2026-09-23):**
```
# Skor keparahan dari kondisi_dilaporkan (laporan warga)
severity_per_laporan = { "baik": 0, "rusak_ringan": 33, "rusak_sedang": 66, "rusak_berat": 100 }
skor_from_laporan = AVG(severity_per_laporan untuk semua laporan dalam klaster)

# Skor keparahan dari kondisi_sarana (Dapodik)
skor_from_dapodik = SUM(jumlah_rusak * weight) / total_fasilitas
# weight: berat=100, sedang=66, ringan=33

# Gabungan (70% dari laporan warga, 30% dari Dapodik)
skor_keparahan = 0.7 * skor_from_laporan + 0.3 * skor_from_dapodik

# Skor prioritas final
skor_prioritas = skor_keparahan + jumlah_vote_terhitung
```

**Catatan:** Skor dampak KBM adalah lapisan skoring terpisah setelah klaster terbentuk, bukan input ke HDBSCAN (sesuai `PRD.md` §6.2).

**Deliverable:** Fungsi `calculate_priority_score(kondisi_laporan: list, kondisi_dapodik: dict, votes: int) -> float`

---

#### F3.6 — Async Task Queue

**Tujuan:** Menjalankan AI Pipeline tanpa blocking HTTP request.

**Keputusan #3 (2026-09-23):** → **Scheduled cron harian** (bukan manual trigger, bukan real-time)

**Konfigurasi:**
- Jadwal: setiap hari pukul 02:00 WIB (minimalkan dampak ke user)
- Job: baca semua laporan dengan `klaster_id IS NULL` → jalankan pipeline → tulis hasil ke MySQL
- Endpoint manual `/ai/cluster` tetap ada (F3.8) sebagai **fallback** untuk admin (recap/forced run)

**Alasan memilih cron dibanding real-time:**
- Batch processing lebih efisien (sekali embedding untuk semua laporan baru)
- CPU-only inference ~5-10 menit per batch (acceptable untuk jadwal malam)
- Predictable workflow untuk verifikator (tahu kapan klaster baru siap direview)

**Deliverable:** Task queue yang menjalankan pipeline async (cron harian + manual trigger).

---

#### F3.7 — Model SQLAlchemy (Klaster)

```python
# app/models/klaster.py
class Klaster(Base):
    __tablename__ = "klaster"
    id = Column(String(36), primary_key=True)
    label = Column(String(255))  # dari TF-IDF
    kategori = Column(Enum(...))
    sekolah_npsn = Column(String(20), ForeignKey("sekolah.npsn"))
    skor_keparahan = Column(Decimal(6, 2))
    jumlah_vote_terhitung = Column(Integer, default=0)
    skor_prioritas = Column(Decimal(8, 2))
    urutan_prioritas_override = Column(Integer, nullable=True)
    alasan_override = Column(Text, nullable=True)
    status_verifikasi = Column(Enum("menunggu_verifikasi", "tidak_terverifikasi", "terverifikasi"))
    created_at = Column(DateTime)
```

**Deliverable:** Model `Klaster` siap.

---

#### F3.8 — Endpoint Trigger Clustering

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/ai/cluster` | POST | `admin`, `verifikator_dinas` | Trigger pipeline klasterisasi **manual/fallback** |

**Keputusan #3 (2026-09-23):**
- Trigger utama = **cron harian** (02:00) → F3.6
- Endpoint ini = **fallback** untuk admin (misal: re-process semua laporan, forced run untuk testing ablation)

**Alur:**
```
POST /ai/cluster →
Baca semua laporan dengan klaster_id IS NULL (atau all laporan jika flag force_reprocess) →
Jalankan pipeline (async) →
Tulis hasil klaster ke MySQL →
Response: { job_id, status: "processing" }
```

**Parameter opsional:**
- `force_reprocess: bool` — jika true, reprocess semua laporan (reset klaster_id → NULL)
- `only_new: bool` (default true) — hanya laporan belum terklaster

**Deliverable:** Pipeline bisa ditrigger manual via API (selain cron harian).

---

#### F3.9 — Endpoint Status Pipeline

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/ai/status` | GET | `admin`, `verifikator_dinas` | Status pipeline terakhir |

**Deliverable:** Monitoring status pipeline.

---

#### F3.10 — Verifikasi Klaster

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/klaster/{id}/verifikasi` | PUT | `verifikator_dinas` | `{ status: "terverifikasi"/"tidak_terverifikasi"/"perlu_info_tambahan", alasan? }` |

**Keputusan #4 (2026-09-23):**
- **Review satu per satu** (bukan batch) → verifikator buka daftar, per klaster decide
- **Klaster belum terverifikasi tampil di dashboard dengan badge status** (Keputusan #4) — transparansi ke publik, tidak disembunyikan
- **Dashboard prioritas (F3.19)** menampilkan badge `menunggu_verifikasi` untuk klaster status `menunggu_verifikasi`

**Status flow (update dari F3.17):**
```
Menunggu Verifikasi
    → Perlu Info Tambahan (status: menunggu_verifikasi tetap, tapi ada catatan)
    → Tidak Terverifikasi (alasan wajib)
    → Terverifikasi
```

**Validasi:**
- `alasan` wajib jika status = `tidak_terverifikasi` atau `perlu_info_tambahan`
- Klaster yang tidak terverifikasi tetap ada di database (tidak dihapus)
- Verifikator bisa edit kategori manual jika AI keliru (override `klaster.kategori`)

**Deliverable:** Verifikator bisa validasi hasil klaster AI (3 opsi status).

---

### B. FEAT-005 — Voting Prioritas

#### F3.11 — Model SQLAlchemy (Vote)

```python
# app/models/vote.py
class Vote(Base):
    __tablename__ = "vote"
    id = Column(String(36), primary_key=True)
    klaster_id = Column(String(36), ForeignKey("klaster.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    status_vote = Column(Enum("pending", "terhitung"))
    created_at = Column(DateTime)

    __table_args__ = (UniqueConstraint('klaster_id', 'user_id'),)
```

**Deliverable:** Model `Vote` + constraint UNIQUE.

---

#### F3.12 — Vote Baru

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/vote` | POST | `warga_terverifikasi`, `komite_sekolah` | `{ klaster_id }` |

**Validasi:**
- User belum vote di klaster ini (cek UNIQUE constraint)
- Default status: `pending` (akan diubah ke `terhitung` setelah verifikasi)
- Vote dari akun baru berstatus pending sampai melewati masa verifikasi (`PRD.md` §4)

**Deliverable:** User bisa vote.

---

#### F3.13 — Cek Status Vote

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/vote/status/{klaster_id}` | GET | `warga_terverifikasi`, `komite_sekolah` | Status vote user di klaster tertentu |

**Deliverable:** User bisa cek apakah sudah vote.

---

#### F3.14 — Hitung Ulang Skor Prioritas

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/klaster/{id}/skor` | PUT | `admin`, `system` | Hitung ulang skor prioritas |

**Formula:**
```
skor_prioritas = skor_keparahan + jumlah_vote_terhitung
```

**Deliverable:** Skor prioritas otomatis terupdate.

---

#### F3.15 — Override Prioritas oleh Kepala Dinas

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/klaster/{id}/override` | PUT | `kepala_dinas` | `{ urutan_prioritas: int, alasan: str }` |

**Validasi:**
- `alasan` wajib diisi (audit trail)
- Override tersimpan di `klaster.urutan_prioritas_override`

**Deliverable:** Kepala Dinas bisa override urutan prioritas.

---

### C. FEAT-006 — Accountability / Status

#### F3.16 — Model SQLAlchemy (Status Log)

```python
# app/models/status_log.py
class StatusLog(Base):
    __tablename__ = "status_log"
    id = Column(String(36), primary_key=True)
    klaster_id = Column(String(36), ForeignKey("klaster.id"))
    status = Column(Enum(...))  # sesuai PRD §5
    alasan = Column(Text, nullable=True)
    actor_user_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime)
```

**Catatan:** Tabel ini **append-only** — tidak ada UPDATE/DELETE dari aplikasi.

**Deliverable:** Model `StatusLog` siap.

---

#### F3.17 — Update Status

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/klaster/{id}/status` | POST | `verifikator_dinas`, `kepala_dinas` | `{ status, alasan? }` |

**Status flow (PRD §5):**
```
Menunggu Verifikasi
    → Perlu Info Tambahan
    → Tidak Terverifikasi (alasan wajib)
    → Terverifikasi
        → Dalam Antrian Prioritas
            → Dalam Proses
                → Selesai
                → Tidak Dapat Ditindaklanjuti (alasan wajib)
```

**Validasi:**
- `alasan` wajib untuk status `tidak_terverifikasi` dan `tidak_dapat_ditindaklanjuti`
- Status "Dalam Proses" bisa di-update berulang kali (loop)

**Deliverable:** Status bisa di-update sesuai alur.

---

#### F3.18 — Riwayat Status

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/klaster/{id}/riwayat` | GET | Publik | Riwayat perubahan status (audit trail) |

**Deliverable:** Riwayat status transparan ke publik.

---

#### F3.19 — Dashboard Prioritas

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/dashboard/prioritas` | GET | Publik | Daftar klaster diurutkan berdasarkan skor prioritas |

**Response:**
```json
{
  "data": [
    {
      "klaster_id": "k-xxx",
      "label": "Atap Bocor Lantai Retak",
      "kategori": "ruang_belajar",
      "sekolah_npsn": "20505816",
      "sekolah_nama": "SD NEGERI 3 MADE",
      "skor_prioritas": 185.50,
      "status_verifikasi": "terverifikasi",  // atau "menunggu_verifikasi"
      "badge": "menunggu_verifikasi"  // tampil badge jika belum terverifikasi (Keputusan #4)
    },
    ...
  ]
}
```

**Keputusan #4 (2026-09-23):**
- **Klaster belum terverifikasi TAMPIL di dashboard publik** dengan badge status `menunggu_verifikasi`
- Transparansi: warga bisa lihat klaster yang belum direview (bukan disembunyikan)
- Filter optional: `?status=terverifikasi` untuk hanya tampilkan yang sudah verified

**Deliverable:** Dashboard prioritas untuk publik (dengan badge status transparansi).

---

### D. RBAC Penuh & Audit

#### F3.20 — Model SQLAlchemy (Audit Log)

```python
# app/models/audit_log.py
class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(String(36), primary_key=True)
    aksi = Column(String(255))  # mis. "akses_pdp_vault", "override_prioritas"
    actor_user_id = Column(String(36), ForeignKey("users.id"))
    target = Column(String(255))
    created_at = Column(DateTime)
```

**Deliverable:** Model `AuditLog` siap.

---

#### F3.21 — Logging Aksi Sensitif

**Aksi yang harus di-log:**
- Akses ke PDP Vault (encrypt/decrypt NIK)
- Override prioritas oleh Kepala Dinas
- Perubahan status klaster
- Login/logout

**Lokasi:** `app/core/audit.py`

**Deliverable:** Semua aksi sensitif tercatat di `audit_log`.

---

#### F3.22 — Dashboard Wilayah (FEAT-002)

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/dashboard/wilayah` | GET | `verifikator_dinas`, `kepala_dinas` | Ringkasan statistik wilayah |

**Response:**
```json
{
  "jumlah_sekolah": 50,
  "klaster_aktif": 120,
  "klaster_prioritas": [...],
  "sekolah_dengan_isu_terbanyak": [...]
}
```

**Deliverable:** Dashboard statistik untuk dinas.

---

## FASE 4 — Integrasi & Finalisasi (Minggu 12–14)

### F4.0 — Prasyarat Integrasi: Re-seed Database

> ⚠️ **BLOCKER DITEMUKAN 30 Sep 2026:** database `simakis` saat ini **hanya berisi
> tabel `alembic_version`** — seluruh tabel aplikasi (`sekolah`, `laporan`,
> `klaster`, `users`, `vote`, `status_log`, `audit_log`) hilang. Semua endpoint
> akan mengembalikan data kosong bila integrasi FE↔BE dijalankan tanpa
> re-seed lebih dulu.
>
> Catatan: data ablation **tidak hilang** — hasil eksperimen tetap ada di
> `backend/app/ai_pipeline/experiments/` (`manual_clusters.json` + 81 file
> `results/*.json`). Yang hilang hanya isi database.

**Tujuan:** Pulihkan isi database agar backend melayani data realistis untuk
diuji integrasi dengan frontend.

**Langkah:**

| # | Langkah | Perintah |
|---|---------|----------|
| 1 | Migrasi schema | `cd backend && ./venv/bin/alembic upgrade head` |
| 2 | Ingest 62 sekolah Dapodik | `POST /ingest/dapodik` (file `sekolah_lamongan_semua.csv`, role `admin`/`verifikator_dinas`) |
| 3 | Seed laporan dummy | `./venv/bin/python scripts/setup_f300.py` (100 laporan, 20 per kategori) |
| 4 | Jalankan clustering | `POST /ai/cluster` atau `./venv/bin/python scripts/run_clustering.py` |
| 5 | Verifikasi | `GET /sekolah`, `GET /dashboard/prioritas`, `GET /vote/status/{id}` balas data non-kosong |

**Verifikasi wajib:** `GET /sekolah` balas **62** sekolah (bukan array kosong);
`GET /dashboard/prioritas` balas ≥1 klaster; `GET /laporan/riwayat` balas
data laporan.

**Deliverable:** Database terisi (62 sekolah, ~100 laporan, klaster aktif,
user admin + verifikator) — siap dilayani ke frontend.

**Estimasi Waktu:** 0,5 hari

**Ketergantungan:** F4.0 → F4.1 (harus selesai sebelum integrasi FE↔BE)

---

### F4.1 — Integrasi Frontend ↔ Backend

**Tujuan:** Ganti semua mock data frontend → API sungguhan.

**Deliverable:** Frontend terhubung ke backend.

---

### F4.2 — Black-box Testing

**Metodologi:** Uji fungsi sistem tanpa melihat kode internal.

**Skenario uji:**
- Jalur normal (happy path)
- Jalur gagal (error handling)
- Edge cases

**Deliverable:** Seluruh skenario kritikal lulus.

---

### F4.3 — Evaluasi Klasterisasi

**Metrik:**
- Silhouette Score
- Davies-Bouldin Index
- Validasi manual oleh Verifikator

**Deliverable:** Skor metrik positif, mayoritas klaster relevan.

---

### F4.4 — Fix Bug

**Deliverable:** Semua temuan testing diperbaiki.

---

### F4.5 — Dokumentasi API Final

**Deliverable:** Swagger + `INTERFACES.md` sinkron dengan kode.

---

### F4.6 — Docker Compose

```yaml
# Ringkasan struktur
services:
  backend:
    build: ./backend
    env_file: .env.production
    ports: ["8000:8000"]
    depends_on: [mysql, minio]

  mysql:
    image: mysql:8

  minio:
    image: minio/minio
```

**Deliverable:** `docker-compose.yml` untuk deploy.

---

### F4.7 — Klasterisasi Tanpa "Belum Terklasifikasi" + Fallback Laporan ke Admin/Kepala

> ✅ **STATUS: SELESAI (13 Okt 2026).**
>Hasil verifikasi: pytest **95/95** · migrasi alembic `a7f3c91e5b2d` (head) ·
>DB `simakis`: klaster **43**, noise **398**, terklaster **202**,
>`GET /klaster` default **25**, `GET /laporan/perlu-review` **495**.
>Penyimpangan kecil yang disengaja tercatat di "Hasil implementasi" di bawah.

**Tujuan:** Buang klaster semu `belum_terklasifikasi` dari daftar klaster, dan
tangani laporan yang tidak ter-cluster secara **manual oleh admin/kepala dinas**
lewat endpoint fallback (bukan lewat klaster).

**Latar belakang (audit 8 Okt 2026 atas DB `simakis`):**

Pipeline saat ini mengubah label noise HDBSCAN (`-1`) menjadi record `Klaster`
sungguhan — `scripts/run_clustering.py:109-112` dan trigger manual
`POST /ai/cluster` (`routers/klaster.py`) sama-sama memakai blok
`if cluster_id_int == -1:` → `label="Belum Terklasifikasi"`. Ini berasal dari
**Keputusan #5 Opsi A** (`CHANGELOG.md` §3.3, 23 Sep 2026), yang sekarang
**digantikan** oleh `DECISIONS.md` D-21.

Kondisi DB saat audit (62 sekolah / 600 laporan / 100 klaster):

| Jenis "belum terklasifikasi" | Klaster | Laporan | Penjelasan |
|---|---|---|---|
| (1) Noise HDBSCAN (`-1`) | **57** | **398** | Wadah buangan **per sekolah** (pipeline jalan per sekolah, `min_cluster_size=3`), label persis `"Belum Terklasifikasi"` |
| (2) Label fallback | **18** | **97** | Klaster **nyata** (anggota 3–8 laporan saling mirip, ada label TF-IDF) tetapi heuristic `labeling.py:98` gagal memetakan keyword ke 5 kategori |
| **Total kategori `belum_terklasifikasi`** | **75 dari 100** | **495 dari 600 (82,5%)** | |
| Klaster valid (5 kategori) | 25 | 105 | satu-satunya yang layak ditampilkan |

**Contoh isi laporan tiap jenis:**

| Jenis | Contoh deskripsi |
|---|---|
| (1) Noise | "Area parkir kurang cukup dan tidak aman", "Tidak ada jalur khusus untuk siswa disabilitas" — laporan valid, tapi di ruang vektor sekolahnya berdiri sendiri |
| (2) Label fallback | "patah persen dari 50 komputer" (seharusnya `utilitas`), "area berbahaya di layak bermain" (seharusnya `penunjang`) — clustering-nya **berhasil**, hanya penerjemahan kategorinya bolong |

**Mengapa konsisten dengan ablation study:** di `experiments/evaluation.py`,
noise (`-1`) **dikecualikan** dari NMI/ARI/purity (`valid_mask = y_pred != -1`)
dan **tidak dihitung sebagai klaster** (`n_clusters = len(set(labels)) - (1 if -1 in labels else 0)`); hanya dilaporkan sebagai `noise_ratio` terpisah (mis. 35,6% di run terbaik putaran 1). Jadi **pipeline produksi menyimpang dari metodologi ablation** — langkah ini menyelaraskannya.

**Keputusan (Aris, 8 Okt 2026):**

| # | Keputusan |
|---|---|
| 1 | 57 klaster noise → **record klaster dihapus**, 398 laporan **tidak dihapus** (ditandai tidak-ter-cluster) |
| 2 | 18 klaster label-fallback → **disembunyikan dari daftar klaster**, record & 97 laporan **dipertahankan**; laporannya ikut tampil di endpoint fallback untuk verifikasi manual |
| 3 | Scope v1 = **backend/endpoint saja**; penempatan UI dibahas dengan Dimas setelah kontrak stabil |
| 4 | Sekalian menyediakan **aksi verifikasi manual per laporan** |
| 5 | RBAC endpoint fallback: **`admin` + `kepala_dinas`** saja (verifikator & warga tidak) |

**Hasil akhir yang diharapkan:** 43 klaster (25 tampil + 18 tersembunyi), 600
laporan utuh (398 `noise` + 97 di klaster tersembunyi + 105 di klaster valid),
endpoint fallback berisi **495 laporan**.

---

#### Langkah Implementasi

| # | Langkah | File |
|---|---|---|
| 1 | **Migrasi data + kolom anti-loop** | `alembic/versions/<rev>_add_hasil_klasterisasi.py`, `app/models/laporan.py` |
| 2 | **Noise tidak lagi jadi Klaster** (2 lokasi, kode duplikat) | `scripts/run_clustering.py`, `app/routers/klaster.py` (trigger `POST /ai/cluster`) |
| 3 | **Daftar klaster bersih** (filter default) | `app/routers/klaster.py` (`GET /klaster`) |
| 4 | **2 endpoint fallback + verifikasi manual** | `app/routers/laporan.py` |
| 5 | **Dokumentasi kontrak & keputusan** | `docs/universal/INTERFACES.md` §2, `docs/universal/DECISIONS.md` D-21 |
| 6 | **Test** | `backend/tests/test_blackbox.py` (+ pytest existing) |
| 7 | **Regenerate dump DB untuk rekan** | `database/simakis.sql`, `docs/backend/SETUP.md` §5a |

**1. Migrasi (satu file, MySQL-only untuk bagian DML):**

- Kolom baru `laporan.hasil_klasterisasi` ENUM(`belum_diproses`, `terklaster`, `noise`) DEFAULT `belum_diproses`.
  **Wajib**, bukan opsional: tanpa penanda ini, laporan noise (`klaster_id = NULL`) akan diambil lagi oleh cron 02:00 besok → re-clustering → noise lagi → loop.
- Backfill berurutan (penting karena FK `laporan.klaster_id → klaster.id` default `RESTRICT`):
  1. `UPDATE laporan SET hasil_klasterisasi='noise', klaster_id=NULL WHERE klaster_id IN (SELECT id FROM klaster WHERE label='Belum Terklasifikasi')`
  2. `DELETE FROM klaster WHERE label='Belum Terklasifikasi'` (aman — sudah dicek: `status_log` & `vote` 0 referensi ke klaster noise)
  3. `UPDATE laporan SET hasil_klasterisasi='terklaster' WHERE klaster_id IS NOT NULL` (sisa 202 laporan)

**2. Pipeline (`run_clustering.py` + trigger manual — kodenya duplikat):**

- Query selection cron berubah dari `klaster_id IS NULL` → `hasil_klasterisasi = 'belum_diproses'`.
- `cluster_id == -1` → **lewati pembuatan record Klaster**, tandai laporan `hasil_klasterisasi='noise'` (`klaster_id` tetap `NULL`).
- Klaster valid → buat record Klaster seperti sekarang, tandai `'terklaster'`.
- **Edge case 1 teks** (`app/ai_pipeline/pipeline.py:64-73`, sekolah hanya punya 1 laporan → dipaksa `cluster 0` kategori `belum_terklasifikasi`) **sengaja tidak diubah**: klasternya otomatis tersembunyi oleh filter langkah 3, dan laporannya tetap muncul di endpoint fallback lewat join `klaster.kategori`. Konsisten tanpa menyentuh `test_ai_pipeline.py`.

**3. `GET /klaster` (daftar):**

- Default: `WHERE kategori <> 'belum_terklasifikasi'` → 18 klaster tersebut disembunyikan.
- `?kategori=belum_terklasifikasi` **eksplisit tetap dilayani** (alat debug/admin).
- `GET /klaster/{id}` detail **tidak diubah** — akses langsung by-ID tetap bisa (fallback view mungkin perlu menautkan ke sana).

**4. Dua endpoint baru (`app/routers/laporan.py`, RBAC `admin` + `kepala_dinas`):**

| Endpoint | Fungsi |
|---|---|
| `GET /laporan/perlu-review` | Daftar laporan yang perlu verifikasi manual: `laporan.klaster_id IS NULL` (398 noise) **ATAU** `klaster.kategori = 'belum_terklasifikasi'` (97) → **495 laporan**. Response amplop `{data, meta}` (§0.2) + info klaster (id/label) bila ada, pagination |
| `PUT /laporan/{laporan_id}/status` | Body `{status: menunggu \| divalidasi \| ditolak}` → update `status_sanggahan` (**kolom existing, tanpa kolom baru** — field ini sudah diperlakukan sebagai "status review laporan" di `RiwayatLaporan.tsx`; "Tervalidasi" yang dilihat warga = hasil review admin) |

**Keterbatasan v1:** `PUT /laporan/{id}/status` **belum punya field alasan** — `status_log` terikat klaster (FK `NOT NULL`), tidak ada tempat menyimpan alasan tanpa kolom baru. Kalau alasan dibutuhkan, itu task terpisah (butuh kolom `catatan_verifikasi` + kontrak).

---

#### Verifikasi (wajib sebelum menyatakan selesai)

- `pytest` — existing 88/88 + test baru: filter `GET /klaster` (tidak ada kategori `belum_terklasifikasi` di default list), RBAC 403 untuk anon/warga/verifikator di kedua endpoint baru, `PUT status` valid & invalid.
- Cek DB `simakis`: `klaster` = 43, `GET /klaster` (tanpa filter) = 25, `GET /laporan/perlu-review` = 495, `laporan.hasil_klasterisasi` noise = 398.
- Cron query tidak boleh menyentuh laporan `noise` (cek manual query/`EXPLAIN`).
- `database/simakis.sql` + tabel count di `SETUP.md` §5a diregenerate (dump lama berisi 100 klaster).

#### Hasil implementasi (13 Okt 2026)

- File: migrasi `alembic/versions/a7f3c91e5b2d_add_hasil_klasterisasi.py`,
  `app/models/laporan.py`, `scripts/run_clustering.py`,
  `app/routers/klaster.py`, `app/routers/laporan.py`,
  `tests/test_blackbox.py` (+7 test → 95 total).
- Penyimpangan kecil yang disengaja:
  1. `PUT /laporan/{id}/status` merespons `{id, tracking_id, status_sanggahan}`
     — **tanpa `updated_at`** karena model `Laporan` tidak punya kolom itu
     (menambah kolom di luar scope "tanpa kolom baru").
  2. Validasi enum `status` dilakukan manual di endpoint (`HTTPException 422`),
     bukan Pydantic `Literal` — handler global `RequestValidationError`
     (`main.py`) mengubah error validasi Pydantic menjadi `400`.
  3. `POST /ai/cluster?force_reprocess=true` ikut mereset
     `hasil_klasterisasi` → `belum_diproses` (tanpa ini seleksi baru
     menganggap semua laporan sudah diproses dan reprocess jadi no-op).
  4. Laporan tanpa teks ikut ditandai `noise` (fallback aman) supaya tidak
     dipilih cron berulang tiap hari.
- Anti-loop terverifikasi atas DB live: `python scripts/run_clustering.py`
  → `No unclustered laporan. Exiting.` (0 baris dipilih).

#### Risiko & catatan untuk FE (briefing Dimas)

1. **Angka FE berubah otomatis** karena memakai `GET /klaster`: "100 klaster" → **25** (DashboardWilayah, TabelVerifikasi, AntrianValidasi, peta sebaran). Ini memang tujuan perubahan, tapi perlu dibriefing.
2. Klaster noise hilang permanen dari DB — 398 laporan hanya bisa dibaca lewat endpoint fallback, tidak lagi punya `klaster_id`.
3. Issue **terpisah** (bukan scope F4.7): kualitas labeling D1 — label unigram tercemar stopword ("dan tidak hancur sudah sejak") dan keyword mapping yang bolong (penyebab 18 klaster jenis 2). Perbaikan keyword mapping akan mengubah kategori 18 klaster itu — putuskan setelah F4.7 selesai.

**Estimasi Waktu:** 1 hari (backend + test + docs + regenerate dump)

**Ketergantungan:** F4.7 → FE (tab/halaman fallback menyusul, Dimas)

---
### F4.8 — Skor Dampak KBM per Sekolah (D-22)

> ✅ **STATUS: SELESAI (13 Okt 2026).**
> Hasil verifikasi: pytest **98/98** · `GET /laporan/skor-kbm` live 200 (62 sekolah,
> rata-rata **44.4**, kritis **1**) · `npx tsc --noEmit` bersih · `npm run build` sukses ·
> Playwright smoke `/dinas/skor-kbm` — 62 baris tabel, 0 console error.

**Formula (D-22):**
`skor_kbm = 0.7 × AVG(severity laporan warga) + 0.3 × Σ(weight × kondisi_rusak Dapodik) / Σ(jumlah Dapodik)`, skala 0–100 (1 desimal).
Weight: `baik=0`, `rusak_ringan=33`, `rusak_sedang=66`, `rusak_berat=100`.
Level: `≥70 kritis` · `50–69 tinggi` · `40–49 sedang` · `<40 rendah`.

**Implementasi backend:**
- `app/ai_pipeline/scoring.py`: `SEVERITY_MAP`, `calculate_kbm_score(kondisi_laporan, kondisi_dapodik)`, `kbm_level(skor)`.
- `app/routers/laporan.py`: `GET /laporan/skor-kbm` (dideklarasi **sebelum** `/{laporan_id}`), RBAC
  `admin | verifikator_dinas | kepala_dinas` (asumsi — dapat dibatalkan pemilik proyek).
- Tidak ada migrasi DB — semua dihitung on-the-fly dari `laporan` + `kondisi_sarana`.
- `total_laporan` menghitung **semua** baris termasuk `kondisi IS NULL` (dihitung in-memory).

**Implementasi FE (ganti widget palsu di `LaporanSkorKbm.tsx`):**

| Widget lama (palsu) | Widget baru (live) |
|---|---|
| KPI "Siswa terdampak" | "Ruang rusak berat (Dapodik)" = 129 |
| KPI "Jam hilang" | "Total laporan warga" = 600 |
| Tren bulanan (AreaTrendChart) | Distribusi Kondisi Laporan (HorizontalBarChart: 154/147/145/154) |
| Badge "NAIK 12%" | dihapus |
| Badge "+29 poin" | dihapus |
| `<select>` semester | chip statis "Data per Oktober 2026" |
| Tabel 4 kolom palsu | 62 baris: SEKOLAH/NPSN · LEVEL · SKOR KBM · LAPORAN · RUSAK BERAT · RINCIAN |
| Chart kanan kategori palsu | "Rusak Berat per Jenis Fasilitas" (7 nama_ruang, total 129) |
| Footer "SIMAKIS-AI v2 … jadwal aktif" | jujur: "70% severity laporan warga + 30% kondisi sarpras Dapodik" |

**Ketergantungan:** F4.1 (halaman) + F4.7 (data laporan bersih) → selesai.

---

### F4.9 — Fix Enum `klaster.kategori` Drift (belum_terklasifikasi)

> ✅ **STATUS: SELESAI (14 Okt 2026).**
> Hasil verifikasi: fresh-install `alembic upgrade head` dari nol → enum 6 nilai ✅ ·
> DB live no-op idempoten, 18 klaster utuh · pytest **98/98** ·
> `scripts/verify_schema_parity.py` (baru) → PARITY OK, uji negatif menangkap drift ✅ ·
> dump diregen (alembic `d3cb7888ff94`, diff 2 baris) + impor-verified.

**Masalah:** revisi `8cca6e1b2fa3` hanya membuat ENUM5 nilai (tanpa
`belum_terklasifikasi`), padahal `KATEGORI_ENUM` (model) = 6 nilai dan pipeline
menulis kategori itu. DB live sudah 6 nilai (diubah di luar alembic) sehingga
selisih tak terlihat — sampai ada fresh install ikuti SETUP.md §5 → insert 18
klaster label-fallback gagal (MySQL 1265/1366).

**Fix:** migrasi baru `d3cb7888ff94` (turunan `a7f3c91e5b2d`) — guard non-MySQL
(SQLite test), guard idempoten via `information_schema` (enum sudah 6 nilai →
skip), hanya `ALTER ... MODIFY` menambah value di akhir daftar (aman untuk data
existing). `downgrade()` mengembalikan 5 nilai + peringatan backfill dulu.
Revisi lama sengaja TIDAK diedit (sudah tercatat applied di DB live — tak akan
dieksekusi ulang).

**Guard pencegahan:** `backend/scripts/verify_schema_parity.py` — membandingkan
**94 kolom model** (termasuk 14 ENUM) vs `information_schema`; mode default
menguji jalur produksi sungguhan (fresh DB → `alembic upgrade head`), `--db <url>`
membandingkan DB yang sudah ada. Exit 1 bila drift. Terdaftar di SETUP.md §5.

**Ketergantungan:** perbaikan independen; memperkuat jalur deploy F4.6 (Docker
Compose) & SETUP.md §5.

---

### F4.12 — Penarikan Nilai Skor KBM (Sekolah Berdata Sedikit) + Penanda Mismatch Laporan vs Dapodik (D-24)

> ✅ **STATUS: SELESAI (20 Okt 2026).** Disetujui Aris (19 Okt 2026): ambang **K = 5 laporan** ·
> sekolah **tanpa laporan tetap 0** · **prior dihitung dinamis** · penanda mismatch
> **ditampilkan di halaman Skor KBM saja**. Verifikasi: 135 test lulus · live `prior=49,7`,
> `k=5`, `jumlah_mismatch=5`, distribusi `22/22/18/0` · `estimate_k()` = `None` pada data dev.

**Masalah.** `skor_laporan` = rata-rata biasa severity laporan, sehingga sekolah berdata sedikit
mudah bernilai ekstrem. Pada data live: `SD NEGERI 2 SENDANGREJO` (n=3) mendapat **`skor_kbm` 76,4**
(peringkat 1, level `kritis`) dari `skor_laporan` 66,3, sedangkan `SD MUHAMMADIYAH 1 LAMONGAN` (n=13)
memperoleh `skor_kbm` 52,0. Artinya sampel 3 laporan diperlakukan setara sampel 13 laporan —
sekolah paling parah justru yang paling sedikit datanya.

**Keputusan (D-24):**

| Aspek | Ketentuan |
|---|---|
| Formula laporan | `λ = n/(n+5)`; `skor_laporan = λ × rata-rata severity + (1−λ) × prior` |
| Ambang (K) | **5 laporan** — **kebijakan, bukan estimasi data** (dasar: AIP §10.4.1); >5 laporan lebih dipercaya data sekolah, <5 lebih ke prior |
| Sekolah tanpa laporan (n=0) | **tetap 0** (aturan cakupan D-22 dipertahankan) |
| `prior` | **dinamis** dari data: `Σ(rata-rata_sekolah × n) / Σ n` — live = **49,7** |
| Mismatch | `mismatch = skor_laporan ≥ 50 AND skor_dapodik == 0` — **penanda saja**, skor tidak diubah |
| Dapodik, bobot, level | tidak berubah (`0.7/0.3`; ambang ≥70 / 50 / 40) |

**Dasar K (wajib dibaca sebelum implementasi):** rumus shrinkage = *credibility theory*
Bühlmann (`Z = n/(n+K)`, `K = EPV/VHM`); `K = 5` adalah **kebijakan** (analog IMDb
`m = 25.000`), **bukan hasil estimasi**. Data dev tidak bisa memvalidasi K
(`EPV = 1420,8`, `VHM = −2,5` → tak terdefinisi; validasi silang → "prior saja").
Karena itu F4.12 wajib menyediakan `estimate_k()` (method of moments) + gate produksi:
hitung ulang K saat laporan riil tersedia, dan bila `VHM ≤ 0` nyatakan peringkat
per-sekolah tidak bermakna. Rincian: `AI_PIPELINE_ABLATION_STUDY.md` §10.4.1 dan `D-24`.

**Dampak terukur (data live: 62 sekolah, 600 laporan):**

- **8 dari 62** sekolah berpindah level; sekolah `kritis` **1 → 0** (SDN 2 SENDANGREJO: `skor_kbm` 76,4 `kritis` → 69,2 `tinggi`; `skor_laporan` 66,3 → 55,9).
- Distribusi level: `rendah 22 · sedang 21 · tinggi 18 · kritis 1` → `rendah 22 · sedang 22 · tinggi 18 · kritis 0`.
- Kepekaan ambang: K=3 → 6 sekolah berubah · **K=5 → 8** · K=10 → 16.
- Mismatch: **13** sekolah `skor_dapodik = 0` (plafon skor 70, secara struktural tak mungkin `kritis`) · **5** di antaranya `mismatch` setelah shrinkage.
- Turunan: `sekolah.penanda_masalah` berlevel `kritis` ikut menjadi 0 (F4.11/D-23 sebelumnya melaporkan 1).

**Rencana implementasi:**

1. **`app/ai_pipeline/scoring.py`** — `calculate_kbm_score(laporan, dapodik, prior=None, k=5)`:
   `n=0 → 0`; `n>0` → nilai ditarik ke prior; `prior=None` → perilaku lama (kompatibel).
   Tambah helper `compute_prior(...)` sebagai **satu sumber**, konstanta `SHRINKAGE_K = 5`
   (dapat dioverride config), `is_mismatch(skor_laporan, skor_dapodik)`, dan
   `estimate_k(...)` (method of moments; `None` bila `VHM ≤ 0`) untuk gate produksi.
2. **`app/routers/laporan.py`** — `GET /laporan/skor-kbm`: hitung **prior global**, teruskan ke
   `calculate_kbm_score`; tambah field `mismatch` per sekolah; `ringkasan` + `prior`, `k`,
   `jumlah_mismatch`.
3. **`app/routers/sekolah.py`** — `_penanda_isu_per_sekolah`: hitung **prior global** (bukan per
   halaman — saat ini query dibatasi `WHERE sekolah_npsn IN (npsns)`), memakai helper yang sama
   agar penanda vs skor tidak pernah berbeda (pelajaran DBG-007/DBG-008).
4. **Test** — perbarui `test_skor_kbm_shape_dan_bound` & `test_skor_kbm_formula_deterministik`
   (assert `set()` ketat + angka berubah; contoh: sekolah A/B masing-masing n=1 → prior 83 →
   A = 60,1 `tinggi`, B = 86,1 `kritis`); cek ulang test penanda (~`test_blackbox.py:1057`);
   tambah tes baru: n=0 tetap 0 · data sedikit tertarik ke prior · mismatch benar/salah ·
   **konsistensi halaman** (halaman 1 vs 2 → penanda sama).
5. **FE** — `frontend/src/lib/api/types.ts` (`SkorKbmSekolah.mismatch`,
   `SkorKbmRingkasan.prior/k/jumlah_mismatch`); `pages/dinas/LaporanSkorKbm.tsx` badge
   "Tidak cocok dengan Dapodik" + kartu jumlah mismatch + perbaikan copy footer.
6. **Dokumentasi** — `DECISIONS.md` (**D-24**) · `INTERFACES.md` (field baru + catatan formula) ·
   `AI_PIPELINE_ABLATION_STUDY.md` §10 + §10.4.1 (tandai terimplementasi; koreksi klausul
   n=0 yang bertentangan dengan D-22; catat dasar K + gate estimasi ulang) ·
   `DEBUGGING.md` (entri penyelesaian) · `CHANGELOG.md`.

**Verifikasi yang direncanakan:** recreate `simakis_test` → pytest penuh (112 + tes baru) ·
curl live `/laporan/skor-kbm` (prior/k/mismatch/distribusi) dan `/sekolah?page_size=100`
(2 halaman konsisten) · Playwright: badge mismatch di `/dinas/skor-kbm`, warna pin
`DashboardKadis`, filter penanda Direktori · jalankan `estimate_k()` dan catat hasilnya
(harus `None` pada data dev) · `npx tsc --noEmit` + `npm run build`.

**Risiko:** prior **wajib global** (dua call site + pagination) — salah lingkup = penanda berubah
per halaman. `calculate_priority_score` (skor level klaster) **tidak** disentuh (di luar lingkup).

**Ketergantungan:** melengkapi F4.8 (skor KBM) & F4.11/D-23 (penanda); FE menyentuh halaman
`LaporanSkorKbm.tsx`.

---


> **Catatan penomoran.** F4.13–F4.16 di bawah adalah **lanjutan** dari F4.12 dan berasal dari
> diskusi 19–20 Okt 2026 (perbaikan penentuan severity). Spesifikasi lengkap, termasuk bank
> pertanyaan dan usulan kontrak, ada di **`docs/backend/SPEC_SEVERITY_KLASIFIKASI.md`** —
> dokumen itu berdiri sendiri, sengaja tidak dilebur ke sini. F4.13 dapat dikerjakan
> **sekarang** (bug murni, tidak butuh keputusan desain); F4.14–F4.16 bergantung urutan.

---

### F4.13 — Perbaikan Semantik `NULL` pada Skor Prioritas Klaster (BUG — SELESAI)

> ✅ **STATUS: SELESAI (2026-10-20).** Ringkasan realisasi: `CHANGELOG.md` §3.28.

**Masalah.** `calculate_priority_score` memetakan `kondisi_dilaporkan = NULL` ke `0` (= setara
`baik`), sedangkan `calculate_kbm_score` **membuang** `NULL`. Dua fungsi di berkas yang sama
memperlakukan data yang sama dengan cara berbeda. Akibatnya laporan berisi keluhan berat namun
tanpa nilai enum ikut menurunkan skor prioritas klaster — dan laporan seperti itu tampak "aman".

**Keputusan.** `NULL` (dan nilai di luar enum) berarti **"tidak ada data"**, **bukan** "kondisi
baik" → dibuang dari rata-rata, di **kedua** fungsi. Lihat `SPEC_SEVERITY_KLASIFIKASI.md` §17.3.

**Deliverable:**

1. **`app/ai_pipeline/scoring.py`** — `calculate_priority_score`: `NULL` / nilai di luar enum
   dibuang dari rata-rata, bukan dipetakan ke `0`. Perilaku kini identik dengan `calculate_kbm_score`.
2. **`tests/test_scoring_null.py` (baru, 8 test)** — semua-`NULL` di kedua fungsi · `NULL` tidak
   menarik rata-rata turun · nilai di luar enum · list kosong · konsistensi antar kedua fungsi.

**Verifikasi (sudah dijalankan):**

| Cek | Hasil |
|---|---|
| `pytest tests/test_scoring_null.py` | **8/8** lulus |
| `pytest tests/` (suite penuh) | **120/120** lulus (112 lama + 8 baru) |
| Laporan live dengan `NULL` | **0** dari 600 → tidak ada skor produksi berubah |
| Klaster live dengan semua laporan `NULL` | **0** dari 43 |
| Migrasi DB | tidak ada |

**Catatan:** `calculate_priority_score` di luar lingkup F4.12, jadi perubahan ini berdiri sendiri
dan tidak menghalangi F4.12.

---

### F4.14 — Kolom `laporan.sumber_kondisi` + Penanda Konfirmasi ✅ SELESAI

> ✅ **STATUS: SELESAI (20 Okt 2026).** Migrasi `f4a14b7c9e21` (2 kolom ENUM nullable, tanpa
> backfill) · 138 test lulus · parity fresh + live OK · dump diregen. Keputusan pemilik disetujui
> 20 Okt 2026 (`SPEC_SEVERITY_KLASIFIKASI.md` §17.2).

**Masalah.** Setelah AI mulai mengisi `kondisi_dilaporkan`, nilai hasil AI dan nilai koreksi
manusia **tidak dapat dibedakan**. Konsekuensi: akurasi AI tidak dapat dihitung · salah nilai AI
tidak dapat ditarik tanpa menimpa koreksi manusia · koreksi manusia dapat tertimpa cron berikutnya.

**Keputusan.** Tambah kolom penanda asal nilai. **Warga TIDAK pernah mengisi kolom ini** —
`warga` hanya muncul bila verifikator mengoreksi hasil AI.

| Kolom | Tipe | Nilai |
|---|---|---|
| `laporan.sumber_kondisi` | ENUM NULLABLE | `ai` (cron) · `warga` (koreksi verifikator) · `NULL` (belum ada) |
| `laporan.status_konfirmasi` | ENUM NULLABLE | `menunggu` · `terjawab` · `dilewati` · `NULL` (laporan lama) |

**Rencana implementasi:**

1. **Migrasi Alembic** — dua kolom ENUM NULLABLE; `downgrade()` menghapus keduanya.
   Ikuti pola migrasi `d3cb7888ff94` (guard non-MySQL + idempoten `information_schema`).
2. **`app/models/laporan.py`** — dua field baru + enum-nya.
3. **`app/routers/laporan.py`** — `POST /laporan` set `status_konfirmasi = 'menunggu'`;
   respons ekspos `sumber_kondisi` + `status_konfirmasi` (draft bentuk: `INTERFACES.md` §4.4).
4. **`scripts/run_clustering.py`** — ⚠️ **N/A saat ini:** skrip hanya **membaca**
   `kondisi_dilaporkan`; tidak ada assignment di `app/`/`scripts/`. Guard
   `sumber_kondisi != 'warga'` **wajib dipasang di F4.16** saat AI mulai menulis kondisi.
5. **Dokumentasi** — ✅ `DATABASE_SCHEMA.md` (2 kolom + `hasil_klasterisasi`) · ✅ `INTERFACES.md`
   §4.4 (status ✅, 4 endpoint) · ✅ `database/simakis.sql` (regen, head `f4a14b7c9e21`) ·
   ✅ `CHANGELOG.md` §3.30.
6. **Verifikasi** — ✅ `verify_schema_parity.py` (fresh + `--db` live) · ✅ pytest **138/138** ·
   ✅ impor ulang dump ke DB kosong · ✅ downgrade → upgrade ulang. Uji negatif cron **belum
   dapat dijalankan** karena belum ada titik tulis (lihat item 4).

**Risiko:** migrasi menyentuh tabel `laporan` (600 baris). Kolom NULLABLE → laporan lama tetap
`NULL`, tidak ada backfill. `database/simakis.sql` wajib diregen agar fresh install konsisten
(pelajaran F4.9).

---

### F4.15 — Lapis 1: Bank Pertanyaan Konfirmasi Severity ✅ BACKEND SELESAI

> ✅ **STATUS: BACKEND SELESAI (20 Okt 2026).** Kontrak dikunci dengan default yang disetujui
> (satu GET, `kode`/`nilai`, endpoint terpisah, expiry lazy 24 jam). **FE modal menunggu Dimas.**
> Bergantung F4.14 ✅.

**Masalah.** Form laporan tidak meminta warga memilih tingkat kerusakan. Ditambah dropdown =
meminta warga memetakan pengamatan awam ke istilah teknis (`rusak_ringan/sedang/berat`) yang
ambangnya tidak dia ketahui (Panduan Sarpras: 1–30% / 31–45% / 46–100%) → jawaban jadi ukuran
kepribadian, bukan ukuran kerusakan.

**Keputusan.** Setelah laporan tersimpan, warga diberi **maksimal 4 pertanyaan** yang dipilih AI
dari **bank pertanyaan tetap** (manusia yang menulis). AI **hanya memilih, tidak mengarang**.

**Deliverable:**

1. ✅ **Bank pertanyaan** — `app/ai_pipeline/question_bank.py`: 8 komponen nama awam (§15.3) ×
   3–4 gejala bertingkat (§15.4) + `g0`, pemicu struktural, pemetaan enum resmi.
2. ✅ **Pemilih pertanyaan** — `pilih_pertanyaan()`: 1 `bagian` + maks. 3 `gejala_<komponen>`;
   `gejala_struktur` hanya bila pemicu §15.5 muncul; tanpa komponen → hanya `bagian`.
3. ✅ **Endpoint** — `GET`/`POST /laporan/{id}/konfirmasi` (owner-only), `409`/`422`, lazy expiry
   24 jam, jawaban disimpan di `jawaban_konfirmasi`; `POST /laporan` menyertakan blok `konfirmasi`.
   Migrasi `b7d15c4e9a02`.
4. ⏳ **FE** — modal konfirmasi pasca-kirim; aturan "jawab satu → lewati yang lebih ringan";
   tombol "Lewati". **Menunggu Dimas**; kontrak `INTERFACES.md` §4.1–4.3 sudah final.
5. ✅ **Dokumentasi** — `INTERFACES.md` §4.1–4.4 · `DECISIONS.md` D-25 · `CHANGELOG.md` §3.31 ·
   `DATABASE_SCHEMA.md`.

**Batasan yang wajib dihormati:** konfirmasi **opsional, tidak memblokir apa pun**. Laporan tetap
sah bila tidak dijawab. Bila tidak dijawab dalam 24 jam → `status_konfirmasi = 'dilewati'`.

**Verifikasi:** `TestKonfirmasiF415` 12 test · total **150/150** · migrasi live
`f4a14b7c9e21 → b7d15c4e9a02` · parity live **97 kolom**.

**Sisa:** FE modal (Dimas). Dump sudah diregen (head `b7d15c4e9a02`).

---

### F4.16 — Lapis 2: Klasifikasi Severity dari Teks (`severity.py`) ⏳ K4 SELESAI, SISA 50 LABEL MANUAL

> ⏳ **STATUS: K4 SELESAI DI GPU + EVALUASI TEST SET; PELABELAN MANUAL DITUNDA MINGGU DEPAN
> (≥ 28 Okt 2026).**
> Bergantung F4.14 ✅ + F4.15 ✅. Label LLM **600/600**; train 550 + test 50 (irisan 0, tidak bocor).
> **K1–K4 (semua di test set 50):** K1 `48,00%/0,2467` · K2 `72,00%/0,5841` · K3 `74,00%/0,6100` ·
> **K4 `70,00%/0,5722`** (eval internal 55 data: `67,27%/0,5414`, tidak sebanding) → **K3 menang**,
> direkomendasikan untuk produksi. SVM = **LinearSVC** (linear kernel, `class_weight="balanced"`).
> **Sebelum mengisi label manual (wajib, urut):** (A) buat `docs/backend/RUBRIK_LABEL_MANUAL.md`
> dari `DEFINISI` `severity.py:25` — tanpa rubrik penilaian subjektif; (B) isi dalam kondisi blind
> lewat `test_50_blind.csv` tanpa kolom `label_llm` — Aris sudah mengetahui skor ablation
> sebelumnya (*anchoring*); (C) setelah `0/50` → `50/50`, rerun
> `severity_ablation.py --labels manual --indobert-model app/dataset/severity/models/indobert`
> untuk angka final. Detail & alasan penundaan: `CHANGELOG.md` §3.32 blok "Belum selesai".

**Tujuan.** Mengubah `deskripsi` (+ jawaban konfirmasi bila ada) → `kondisi_dilaporkan`
(4 kelas enum). Ini yang mengisi 70% bobot `skor_kbm` yang saat ini hangus.

**Deliverable:**

1. ✅ **`app/ai_pipeline/severity.py`** — K1 kata kunci + `severity_dari_jawaban` +
   `gabung_severity` + `explain`; `classify_severity(texts)`.
2. ✅ **`scripts/label_severity_llm.py`** — OpenAI-compatible + parser SSE, prompt
   `severity-llm-v1`, resume JSONL, catat model. **600/600 label selesai**
   (`am/amanai/deepseek-v4-flash`; `ringan 425 · baik 77 · berat 52 · sedang 46`).
3. ✅ **`scripts/prepare_manual_testset.py`** — pilih 50 (seed 42) **sebelum** label LLM →
   `test_50.csv` + `test_50_ids.json` (anti-bias). ✅ **`prepare_severity_testset.py`** memakai
   ID tetap → train 550 + merge LLM, `label_manual` tidak tertimpa.
   ⏳ **Menunggu Aris mengisi 50 label di `backend/app/dataset/severity/test_50.csv`.**
4. ✅ **Integrasi** — `apply_severity()` di `scripts/run_clustering.py`; guard
   `kondisi_dilaporkan IS NULL AND sumber_kondisi != 'warga'`; set `sumber_kondisi='ai'`;
   `SEVERITY_ENABLED=False` default; plus `scripts/backfill_severity.py` (dry-run default) untuk
   laporan lama yang tak lagi melewati cron. Catatan: tahap severity dipasang di skrip cron,
   bukan `pipeline.py` (pipeline belum punya tahap tulis kondisi).
5. ✅ **`scripts/severity_ablation.py`** — K1/K2/K3 + K4 opsional, akurasi/macro-F1/matrix.
   ✅ **`scripts/finetune_severity_indobert.py`** — GPU-ready (`--bf16`, fp16 otomatis, class
   weights, `accelerate`); **dijalankan Aris di laptop GPU**.
   **Final sementara (semua varian di test 50, label LLM — ditunggu verifikasi manual):** K1
   `48,00% / 0,2467` · K2 `72,00% / 0,5841` · K3 `74,00% / 0,6100` · **K4 `70,00% / 0,5722`**
   (evaluasi test set 50; latih 3 epoch, 270,8 dtk, GTX 1650, fp16 — eval internal 55 data
   `67,27% / 0,5414` tidak sebanding). Baseline tebak-mayoritas test set `72,0%` → K3 +2,0 poin,
   K4 −2,0 poin. **K4 tidak layak produksi** (kalah dari K2/K3, model 497 MB, butuh GPU).
   **Laporan lengkap: `docs/backend/ABLATION_SEVERITY_RESULTS.md`** — termasuk temuan bahwa
   **165 dari 249** laporan yang menyebut bahaya/keselamatan/dampak KBM dilabeli `rusak_ringan`
   (akibat aturan prompt `severity-llm-v1`); aturan perlu ditinjau sebelum label dipakai
   sebagai ground truth.
6. ⏳ **Dokumentasi final** — `CHANGELOG.md` §3.32 sudah diperbarui dengan angka provisional ·
   `DECISIONS.md` D-26 (+ amandemen 21 Okt) · blok K di `AI_PIPELINE_ABLATION_STUDY.md`
   menunggu angka manual (**ditunda ≥ 28 Okt 2026**, lihat poin 7).
7. ⏳ **Pekerjaan tertunda (minggu depan, ≥ 28 Okt 2026) — JANGAN KELEWAT, urut A→B→C:**
   - **A.** Buat `docs/backend/RUBRIK_LABEL_MANUAL.md` (salin `DEFINISI` `severity.py:25`,
     daftar periksa keputusan, aturan ambigu "dampak KBM tanpa kerusakan fisik", penanda `ragu`).
   - **B.** Siapkan `test_50_blind.csv` (`id, deskripsi, label_manual, catatan` — **tanpa
     `label_llm`**) karena Aris sudah tahu skor ablation (*anchoring*); isian lama (bila ada di
     luar repo) = `label_manual_v1`.
   - **C.** Isi 50/50 → `severity_ablation.py --labels manual --indobert-model
     app/dataset/severity/models/indobert` → angka FINAL → update §3.32 +
     `ABLATION_SEVERITY_RESULTS.md` → ajukan `SEVERITY_ENABLED=true`.

**Menjalankan K4 di GPU (venv proyek, Python 3.14) — SUDAH DIEKSEKUSI 21 Okt 2026.** Wheel CUDA
`cu124`/`cu126` resmi berhenti di `cp313`; yang benar-benar terpasang via **mirror Tsinghua**:
`torch 2.14.1+cu130` (cp314 ada di index cu130; driver CUDA 13.1 mendukung). Verifikasi:
`cuda.is_available()=True`, `GTX 1650`, compute 7.5. Ringkasan pemasangan ada di `CHANGELOG.md`
§3.32 blok "Torch CUDA di WSL".

```bash
cd backend
# Windows PowerShell
.\venv\Scripts\Activate.ps1
pip index versions torch --index-url https://download.pytorch.org/whl/cu126
pip download torch --index-url https://download.pytorch.org/whl/cu126 -d C:\tmp\torchwheel
pip uninstall -y torch
pip install C:\tmp\torchwheel\torch-2.9.1+cu126-*.whl
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
python scripts/finetune_severity_indobert.py --epochs 3 --batch-size 4 --grad-accum 4
```

> **Koreksi (21 Okt 2026):** perintah di atas adalah rencana awal; yang **aktual** memakai
> mirror Tsinghua + `torch 2.14.1+cu130` (resmi `download.pytorch.org` terlalu lambat ~70 KB/s).
> Log pemasangan riil: `CHANGELOG.md` §3.32 "Torch CUDA di WSL".

GTX 1650 = Turing (tanpa bf16) → jangan pakai `--bf16`; fp16 aktif otomatis. OOM →
`--batch-size 2 --grad-accum 8 --max-length 128`. `requirements.txt` masih mem-pin
`torch==2.14.0` (CPU); jangan jalankan `pip install -r requirements.txt` setelah memasang
wheel CUDA, atau torch CPU akan kembali terpasang.

**Verifikasi sementara:** `tests/test_severity.py` 13 test · total **163/163**; label **600/600**
unik; train 550 + test 50; `label_manual` masih **0/50**; smoke parsers/pelabelan/ablation lulus.

**Yang dilarang:** memakai 600 label seed dev (`setup_f300.py`) sebagai data latih. Label itu
dibuat acak/uniform (154/147/145/154) → melatih model memprediksi keacakan.

**Kontribusi yang bisa diklaim:** tabel ablation K1–K4 dengan angka akurasi pada test set
berlabel manual — bagian yang punya nilai metodologis, bukan kodenya.

**Risiko:** bias pelaporan (*self-selection* — warga melapor saat ada masalah) tidak dapat
diperbaiki oleh classifier · 50 sampel terlalu kecil untuk generalisasi ke populasi Lamongan →
wajib ditulis sebagai keterbatasan.

---

### Ringkasan Status F4.12–F4.16

| Task | Isi | Status | Bergantung |
|---|---|---|---|
| **F4.12** | Shrinkage skor KBM + flag mismatch (D-24) | ✅ SELESAI | 135 test · live prior 49,7 · mismatch 5 |
| **F4.13** | Fix semantik `NULL` di `calculate_priority_score` | ✅ **SELESAI** | — |
| **F4.14** | Kolom `sumber_kondisi` + `status_konfirmasi` | ✅ SELESAI | — |
| **F4.15** | Lapis 1 — bank pertanyaan konfirmasi | ✅ BACKEND SELESAI (FE menunggu Dimas) | F4.14 ✅ |
| **F4.16** | Lapis 2 — `severity.py` + ablation K1–K4 | ⏳ K3 menang (74,00%); K4 70,00% test set; **label manual DITUNDA minggu depan** + perlu rubrik + mode blind | F4.14 ✅, F4.15 ✅ |

Urutan pengerjaan yang disetujui (`SPEC_SEVERITY_KLASIFIKASI.md` §18):
**F4.13 ✅ → F4.12 ✅ → F4.14 ✅ → F4.15 ✅ (backend) → F4.16 ⏳**.

Di luar task F4.x, sudah diselesaikan terpisah: **DBG-021 + DBG-022** (21 Okt 2026) — skor
klaster kini dihitung langsung via `calculate_score_components` (tanpa back-calc), `vote.py`
memakai `hitung_kondisi_dapodik` (dulu Dapodik hardcoded nol), `scripts/recompute_skor.py`
memperbaiki klaster `5dda3ac6` (55,86 → 75,66); pytest 169/169. Detail: `DEBUGGING.md` +
`CHANGELOG.md` §3.33.

---

## Dependencies antar Task

```
F1.1 → F1.2 → F2.4/2.5 (model harus ada dulu)
F1.3 → F2.15 (PDP harus siap sebelum ingest)
F1.4 → Semua task (config dibutuhkan semua)
F2.1 → F2.3, F2.11 (auth harus ada dulu)
F2.4 → F2.6-2.8 (model sekolah)
F2.9 → F2.11-2.14 (model laporan)
F3.1-3.5 → F3.8-3.10 (AI pipeline harus jalan dulu)
F3.11 → F3.12-3.14 (model vote)
F3.16 → F3.17-3.18 (model status_log)
F4.7 → FE (halaman fallback laporan perlu-review, Dimas)
F4.12 → melengkapi F4.8 (skor KBM) & F4.11/D-23 (penanda); FE halaman LaporanSkorKbm.tsx
```

---

## Catatan Terbuka

- [ ] Task queue: pilih antara BackgroundTasks, Celery, atau RQ (DEPLOYMENT.md §7)
- [ ] JWT rotation: apakah perlu refresh_token? (SETUP.md §4)
- [ ] S3 URL: presigned (privat) atau publik? (INTEGRATION.md §2.4)
- [ ] Retention policy untuk audit_log dan status_log
- [ ] Indeks tambahan untuk performa (menunggu data uji nyata)
