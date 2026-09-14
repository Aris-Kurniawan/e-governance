# SETUP.md — SIMAKIS Backend

Cara install dan menjalankan backend SIMAKIS secara lokal. Stack: FastAPI
(`ARCHITECTURE.md` §3.1), MySQL, dan Modul AI Pipeline (`ARCHITECTURE.md`
§3.3).

> Frontend dan backend sengaja dipisah dan bisa dikerjakan paralel — tidak
> perlu jalankan frontend untuk kerja di backend (lihat `GIT_WORKFLOW.md`
> §1).

---

## 1. Prasyarat

| Tool | Versi minimum | Cek dengan |
|---|---|---|
| Python | 3.11+ | `python3 --version` |
| MySQL | 8.x | `mysql --version` |
| Docker (opsional, buat MinIO lokal) | apa saja yang cukup baru | `docker --version` |

---

## 2. Inisialisasi Environment

```bash
git clone <url-repo>
cd simakis-backend

python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

## 3. Dependency Inti (`requirements.txt`)

```
fastapi
uvicorn[standard]
sqlalchemy
alembic
pymysql
python-jose[cryptography]      # JWT (auth)
passlib[bcrypt]                 # hashing password
pydantic
pandas                           # Pandas Batch Ingestion
playwright                       # scraping Dapodik — lihat INTEGRATION.md
sentence-transformers            # IndoBERT / embedding
umap-learn                       # step reduksi dimensi, DECISIONS.md D-05
hdbscan                          # clustering
scikit-learn                     # TF-IDF labeling
boto3                            # S3 API client untuk MinIO
cryptography                     # enkripsi AES-256 PDP Vault
```

Setelah install Playwright:
```bash
playwright install chromium
```

---

## 4. Environment Variables (`.env`, jangan commit)

```env
# Database
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/simakis

# Auth
JWT_SECRET=<ganti-dengan-secret-kuat>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# PDP Vault — enkripsi NIK, ARCHITECTURE.md §3.2
PDP_ENCRYPTION_KEY=<32-byte-key-untuk-AES-256>

# MinIO / S3 — media terenkripsi, ARCHITECTURE.md §4.2
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=<isi>
MINIO_SECRET_KEY=<isi>
MINIO_BUCKET=simakis-media

# AI Pipeline
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
```

> **Belum ditentukan:** durasi `JWT_EXPIRE_MINUTES` yang final dan
> kebijakan rotasi `refresh_token` — nilai di atas cuma default
> sementara, catat keputusan finalnya di `DECISIONS.md` kalau berubah.

---

## 5. Setup Database

```bash
# buat database kosong dulu di MySQL
mysql -u root -p -e "CREATE DATABASE simakis CHARACTER SET utf8mb4;"

# jalankan migrasi (lihat DATABASE_SCHEMA.md untuk skema lengkap)
alembic upgrade head
```

---

## 6. MinIO Lokal (opsional, buat testing upload foto tanpa akun cloud)

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```
Buat bucket `simakis-media` lewat console di `http://localhost:9001`.

---

## 7. Struktur Folder

Lihat `GIT_WORKFLOW.md` §2 untuk struktur `app/` lengkap
(`core/`, `models/`, `schemas/`, `routers/`, `ai_pipeline/`, `dataset/`).
**Jangan** buat modul baru di luar struktur itu tanpa update dokumen
tersebut dulu.

---

## 8. Menjalankan Server

```bash
uvicorn app.main:app --reload --port 8000
```
Dokumentasi API otomatis (Swagger) tersedia di
`http://localhost:8000/docs` — **bukan pengganti** `INTERFACES.md`, cuma
alat bantu testing manual; kontrak resmi tetap di `INTERFACES.md`.

---

## 9. Checklist Sebelum Mulai Coding

- [ ] `uvicorn app.main:app --reload` jalan tanpa error
- [ ] Koneksi ke MySQL berhasil (`alembic upgrade head` tidak error)
- [ ] `playwright install chromium` berhasil (buat kerja di `dataset/scraping/`)
- [ ] Baca `DATABASE_SCHEMA.md` sebelum bikin model baru
- [ ] Baca `INTERFACES.md` sebelum bikin/ubah endpoint apapun
