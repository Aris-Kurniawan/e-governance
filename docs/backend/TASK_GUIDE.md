# TASK_GUIDE.md — Backend SIMAKIS

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
| `/auth/register` | POST | `{ nama, email, password, role? }` → `{ user_id }` |
| `/auth/login` | POST | `{ email, password }` → `{ access_token, token_type }` |

**Validasi:**
- Email unique (cek di DB)
- Password di-hash dengan bcrypt
- Default role: `warga_umum`

**Deliverable:** Register + Login functional.

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

**Deliverable:** 3 model: `Sekolah`, `SekolahDataResmi`, `KondisiSarana` (agregat per jenis ruang).

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
| `/sekolah/search` | GET | `?q=<nama/alamat>` |

**Deliverable:** Pencarian fuzzy (LIKE) berdasarkan nama atau alamat.

---

#### F2.8 — Detail Kondisi Sarana

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/sekolah/{npsn}/sarana` | GET | Daftar ruang + kondisi per sekolah |

**Deliverable:** Kondisi sarana terlihat per ruang.

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
    kategori = Column(Enum("infrastruktur_sarana", "ketersediaan_tenaga_pengajar", "lainnya"))
    fasilitas_terkait = Column(String(255), nullable=True)   # nama_ruang yang disanggah
    kondisi_dilaporkan = Column(Enum("baik", "rusak_ringan", "rusak_sedang", "rusak_berat"), nullable=True)
    deskripsi = Column(Text)
    klaster_id = Column(String(36), ForeignKey("klaster.id"), nullable=True)
    status_sanggahan = Column(Enum("menunggu", "divalidasi", "ditolak"), default="menunggu")
    created_at = Column(DateTime)
```

**Deliverable:** 2 model: `Laporan`, `LaporanFoto`.

---

#### F2.10 — Schema Pydantic (Laporan)

```python
class LaporanCreate(BaseModel):
    sekolah_npsn: str
    kategori: str
    fasilitas_terkait: str | None       # wajib jika kategori infrastruktur_sarana
    kondisi_dilaporkan: str | None      # kondisi aktual menurut warga (untuk mismatch)
    deskripsi: str

class LaporanResponse(BaseModel):
    id: str
    tracking_id: str
    status: str
    created_at: datetime
```

**Deliverable:** Schema untuk semua endpoint laporan.

---

#### F2.11 — Buat Laporan

| Endpoint | Method | Role | Body |
|----------|--------|------|------|
| `/laporan` | POST | `warga_terverifikasi`, `komite_sekolah` | `{ sekolah_npsn, kategori, deskripsi, foto? }` |

**Validasi:**
- `fasilitas_terkait` wajib jika `kategori = "infrastruktur_sarana"`
- Generate `tracking_id` unik untuk ditampilkan ke warga
- Simpan metadata foto (kalau ada) ke `laporan_foto`

**Deliverable:** Warga bisa kirim laporan.

---

#### F2.12 — Riwayat Laporan User

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/laporan/me` | GET | `warga_terverifikasi`, `komite_sekolah` | Daftar laporan yang dikirim user |

**Deliverable:** User bisa lihat riwayat laporannya.

---

#### F2.13 — Detail Laporan

| Endpoint | Method | Role | Deskripsi |
|----------|--------|------|-----------|
| `/laporan/{tracking_id}` | GET | Publik | Detail laporan berdasarkan tracking_id |

**Deliverable:** Status laporan bisa dipantau publik.

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

### A. FEAT-004 — Klasterisasi Isu (AI Pipeline)

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
**Output:** Label klaster (-1 = outlier)

**Library:** `hdbscan`
**Parameter:** `min_cluster_size=5`, `min_samples=3`

**Deliverable:** Fungsi `cluster_texts(vectors: np.ndarray) -> np.ndarray`

---

#### F3.4 — Labeling TF-IDF

**Lokasi:** `app/ai_pipeline/labeling.py`

**Input:** Teks per klaster
**Output:** Label/kata kunci per klaster

**Library:** `scikit-learn` (TfidfVectorizer)

**Deliverable:** Fungsi `label_clusters(texts: list[str], labels: np.ndarray) -> dict`

---

#### F3.5 — Formula Urgensi KBM + Skor Prioritas

**Lokasi:** `app/ai_pipeline/scoring.py`

**Input:** Keparahan dari data Dapodik + jumlah vote
**Output:** Skor prioritas akhir

**Formula:**
```
skor_prioritas = skor_keparahan + jumlah_vote_terhitung
```

**Catatan:** Skor dampak KBM adalah lapisan skoring terpisah setelah klaster terbentuk, bukan input ke HDBSCAN (sesuai `PRD.md` §6.2).

**Deliverable:** Fungsi `calculate_priority_score(severity: float, votes: int) -> float`

---

#### F3.6 — Async Task Queue

**Tujuan:** Menjalankan AI Pipeline tanpa blocking HTTP request.

**Pilihan (belum diputuskan):**

| Opsi | Kelebihan | Kekurangan |
|------|-----------|------------|
| FastAPI `BackgroundTasks` | Simpel, built-in | Tidak persistent, tidak scalable |
| Celery + Redis | Persistent, scalable | Butuh Redis, lebih kompleks |
| RQ (Redis Queue) | Simpel, butuh Redis | Kurang populer |

**Deliverable:** Task queue yang menjalankan pipeline async.

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
| `/ai/cluster` | POST | `admin`, `verifikator_dinas` | Trigger pipeline klasterisasi |

**Alur:**
```
POST /ai/cluster →
Baca semua laporan dengan klaster_id IS NULL →
Jalankan pipeline (async) →
Tulis hasil klaster ke MySQL →
Response: { job_id, status: "processing" }
```

**Deliverable:** Pipeline bisa ditrigger via API.

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
| `/klaster/{id}/verifikasi` | PUT | `verifikator_dinas` | `{ status: "terverifikasi"/"tidak_terverifikasi", alasan? }` |

**Validasi:**
- `alasan` wajib jika status = `tidak_terverifikasi`
- Klaster yang tidak terverifikasi tetap ada (tidak dihapus)

**Deliverable:** Verifikator bisa validasi hasil klaster AI.

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

**Deliverable:** Dashboard prioritas untuk publik.

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
