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

**Ringkasan F3.0 Sub-tasks:**

| Sub-task | Tujuan | Durasi | Dependen |
|----------|--------|--------|----------|
| F3.0a | Manual clustering | 1 hari | - |
| F3.0b | Framework setup | 2 hari | F3.0a |
| F3.0c | Test suite A (embedding) | 1 hari | F3.0b |
| F3.0d | Test suite B (baseline + MiniLM) | Paralel F3.0c | F3.0b |
| F3.0e | Analysis & reporting | 2 hari | F3.0c + F3.0d |
| F3.0f | Optimal config implementation | 1 hari | F3.0e |

**Total: 1 minggu** (F3.0a → F3.0b → F3.0c/F3.0d paralel → F3.0e → F3.0f)

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
```

---

## Catatan Terbuka

- [ ] Task queue: pilih antara BackgroundTasks, Celery, atau RQ (DEPLOYMENT.md §7)
- [ ] JWT rotation: apakah perlu refresh_token? (SETUP.md §4)
- [ ] S3 URL: presigned (privat) atau publik? (INTEGRATION.md §2.4)
- [ ] Retention policy untuk audit_log dan status_log
- [ ] Indeks tambahan untuk performa (menunggu data uji nyata)
