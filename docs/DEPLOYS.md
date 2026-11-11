# Arsitektur & Langkah Deploy SIMAKIS: Cloudflare Pages + Backend dan Database Lokal

Dokumen ini memakai arsitektur untuk **pengujian akademik dan black-box testing warga**:

```text
Browser Penguji
      │
      ▼
Cloudflare Pages
Frontend React/Vite
      │ HTTPS API
      ▼
Cloudflare Tunnel
      │
      ▼
Laptop Lokal Aris
├── FastAPI Backend :8000
└── MySQL SIMAKIS :3306
```

## 1. Pembagian komponen

| Komponen | Lokasi | Keterangan |
|---|---|---|
| Frontend | Cloudflare Pages | Hanya berisi aplikasi React/Vite hasil build |
| Backend | Laptop lokal | FastAPI dijalankan dengan Uvicorn |
| Database | Laptop lokal | MySQL SIMAKIS tetap menggunakan data lokal |
| Akses publik backend | Cloudflare Tunnel | Meneruskan HTTPS publik ke `localhost:8000` |
| Pipeline AI | Laptop lokal | TF-IDF + UMAP + HDBSCAN dijalankan lokal |
| Storage foto | MinIO lokal atau object storage | Tidak menggunakan filesystem Cloudflare Pages |

> Aiven dan Vercel tidak digunakan pada skenario ini. Database tidak dipindahkan ke cloud.

## 2. Batasan arsitektur

Skenario ini cocok untuk pengujian sementara, bukan produksi publik.

- Laptop harus menyala selama pengujian.
- Backend dan Cloudflare Tunnel harus tetap berjalan.
- Laptop tidak boleh masuk mode sleep.
- Jika koneksi internet, backend, atau tunnel berhenti, website tidak dapat memanggil API.
- URL Quick Tunnel dapat berubah ketika tunnel dihentikan dan dibuat ulang.
- Port MySQL `3306` tidak boleh dibuka ke internet.
- Hanya backend pada port `8000` yang diekspos melalui tunnel.
- Data sekolah, laporan, klaster, dan akun tetap berada di laptop lokal.

## 3. Prasyarat

Siapkan:

- Node.js dan npm.
- Python virtual environment backend.
- MySQL lokal yang berisi database `simakis`.
- `cloudflared`.
- Akun Cloudflare.
- Repository SIMAKIS.

Periksa aplikasi lokal:

```bash
node --version
npm --version
cloudflared --version
```

Pastikan database lokal aktif. Jangan menghapus database lokal sebelum membuat backup.

## 4. Backup database sebelum deployment

Buat backup database lokal:

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  -u root -p simakis > simakis_before_cloudflare.sql
```

Simpan backup di luar repository. Jangan commit file dump karena dapat berisi data pengguna dan data sensitif.

Data yang dipertahankan untuk pengujian:

- 62 sekolah.
- 304 data `kondisi_sarana`.
- 116 laporan non-sintetis.
- Klaster yang tersedia.
- Akun warga untuk responden.
- Data akun dinas untuk kebutuhan sistem, jika diperlukan oleh aplikasi.

Laporan sintetis dengan pola `TRK-AUG-*` harus berjumlah `0` sebelum pengujian publik.

## 5. Konfigurasi backend lokal

Backend membaca konfigurasi dari `backend/.env`.

Contoh konfigurasi non-rahasia:

```env
APP_NAME=SIMAKIS
DEBUG=false
DATABASE_URL=mysql+pymysql://<USER>:<PASSWORD>@localhost:3306/simakis
JWT_SECRET=<SECRET_UNIK>
PDP_ENCRYPTION_KEY=<KEY_PDP>
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=simakis-media
SEVERITY_ENABLED=false
CORS_ORIGINS=["https://<DOMAIN_PAGES_CLOUDFLARE>","http://localhost:5173"]
```

Jangan memasukkan password, JWT secret, encryption key, atau access key ke Git.

Untuk pengujian sementara, `CORS_ORIGINS` harus berisi domain Cloudflare Pages yang sebenarnya. Jangan memakai wildcard seperti:

```text
https://*.pages.dev
```

Setelah mengubah `.env`, restart backend.

## 6. Menjalankan backend lokal

Dari root repository:

```bash
cd /home/aris/projek/e-goverment/backend
./venv/bin/python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000
```

Biarkan terminal ini tetap berjalan.

Uji dari terminal lain:

```bash
curl http://localhost:8000/health
```

Hasil yang diharapkan:

```json
{"status":"healthy"}
```

Uji juga alias API:

```bash
curl http://localhost:8000/api/health
```

Jika health check gagal, jangan lanjutkan ke Cloudflare Tunnel.

## 7. Menjalankan Cloudflare Tunnel

### 7.1 Quick Tunnel untuk pengujian sementara

Jalankan:

```bash
cloudflared tunnel --url http://localhost:8000
```

Cloudflare akan memberikan URL seperti:

```text
https://contoh-nama.trycloudflare.com
```

Gunakan URL tersebut sebagai `BACKEND_PUBLIC_URL`.

Uji tunnel:

```bash
curl https://contoh-nama.trycloudflare.com/health
```

Hasil yang diharapkan:

```json
{"status":"healthy"}
```

Jangan menutup terminal tunnel selama pengujian berlangsung.

### 7.2 Tunnel bernama untuk URL tetap

Quick Tunnel cocok untuk testing singkat. Jika membutuhkan URL yang tetap:

```bash
cloudflared tunnel login
cloudflared tunnel create simakis-api
```

Buat konfigurasi `cloudflared` sesuai domain Cloudflare yang dimiliki:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/aris/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.<DOMAIN_ANDA>
    service: http://localhost:8000
  - service: http_status:404
```

Jalankan:

```bash
cloudflared tunnel --config /home/aris/.cloudflared/config.yml run simakis-api
```

Gunakan URL tetap berikut sebagai alamat API:

```text
https://api.<DOMAIN_ANDA>
```

## 8. Deploy frontend ke Cloudflare Pages

Di Cloudflare Dashboard:

1. Buka **Workers & Pages**.
2. Pilih **Create application**.
3. Pilih **Pages**.
4. Hubungkan repository Git.
5. Atur konfigurasi build:

```text
Framework preset: Vite
Root directory: frontend
Build command: npm run build
Build output directory: dist
```

Tambahkan environment variable pada Cloudflare Pages:

```env
VITE_API_BASE_URL=https://<BACKEND_PUBLIC_URL>
VITE_API_TIMEOUT_MS=15000
```

Contoh:

```env
VITE_API_BASE_URL=https://contoh-nama.trycloudflare.com
```

Jangan menambahkan `/` di akhir URL API karena client frontend sudah menggabungkan path endpoint.

Klik **Save and Deploy**.

## 9. Verifikasi frontend publik

Setelah Cloudflare Pages selesai build:

1. Buka URL Pages.
2. Buka direktori sekolah.
3. Buka detail sekolah.
4. Login menggunakan akun warga.
5. Buat laporan uji.
6. Buka riwayat laporan.
7. Buka daftar klaster.
8. Uji vote satu kali.
9. Pastikan tidak ada error CORS di browser.
10. Jalankan black-box testing warga.
11. Setelah selesai, responden mengisi SUS.

Jika frontend masih memanggil `http://localhost:8000`, berarti `VITE_API_BASE_URL` belum benar atau frontend belum di-build ulang.

## 10. Alur black-box testing dan SUS

Gunakan urutan berikut:

1. Responden membuka direktori sekolah.
2. Responden mencari sekolah yang ditentukan.
3. Responden login sebagai warga.
4. Responden membuat laporan kerusakan.
5. Responden mengunggah foto bukti.
6. Responden menjawab konfirmasi keparahan jika muncul.
7. Responden membuka riwayat laporan.
8. Responden membuka klaster dan melakukan vote.
9. Observer mengisi matriks black-box berdasarkan hasil nyata.
10. Responden mengisi kuesioner SUS.

Black-box testing mengukur keberhasilan menyelesaikan tugas. SUS mengukur persepsi kemudahan penggunaan. Hasil keduanya dicatat sebagai instrumen yang berbeda.

## 11. Pipeline AI

Pipeline AI tidak dijalankan pada setiap request warga.

Konfigurasi produksi yang digunakan:

```text
A2+B1+C2+D1
TF-IDF + UMAP + HDBSCAN + unigram labeling
```

Untuk testing:

1. Jalankan pipeline AI secara manual dari laptop jika diperlukan.
2. Verifikasi hasil klaster.
3. Jalankan frontend dan backend untuk sesi pengujian warga.

Jangan memasukkan artefak eksperimen berikut ke deployment frontend:

```text
backend/app/ai_pipeline/experiments/
backend/app/dataset/severity/models/indobert/
backend/app/dataset/severity/train_550.jsonl
backend/app/dataset/severity/test_50.json
backend/app/dataset/severity/labels_llm.jsonl
```

PyTorch, `sentence-transformers`, dan `accelerate` tidak diperlukan untuk jalur produksi TF-IDF.

## 12. Penyimpanan foto

Backend saat ini memakai MinIO/S3-compatible storage. Untuk pengujian dari Cloudflare Pages:

- MinIO harus tetap aktif di laptop.
- Backend harus dapat mengakses MinIO melalui jaringan lokal.
- File foto tidak boleh hanya disimpan ke filesystem sementara.
- Jangan mengekspos port MinIO langsung ke internet.

Jika MinIO lokal tidak dapat digunakan dari alur publik, siapkan object storage S3-compatible atau Cloudflare R2. Jangan menambahkan URL foto lokal seperti `localhost:9000` ke frontend publik.

## 13. Keamanan

- Jangan mengekspos MySQL `3306`.
- Jangan mengekspos MinIO `9000`.
- Gunakan akun warga khusus untuk pengujian.
- Jangan memakai akun administrator sebagai akun responden.
- Jangan menaruh credential di frontend atau repository.
- Jangan mengaktifkan `SEVERITY_ENABLED` tanpa hasil evaluasi yang telah disetujui.
- Hentikan tunnel setelah sesi pengujian selesai jika URL bersifat sementara.
- Gunakan data testing yang tidak mengandung NIK asli atau foto sensitif.

## 14. Troubleshooting

### Frontend gagal memanggil API

Periksa:

```text
VITE_API_BASE_URL
CORS_ORIGINS
URL tunnel
```

Tes langsung:

```bash
curl https://<BACKEND_PUBLIC_URL>/api/health
```

### Muncul error CORS

Pastikan domain Pages tercantum persis dalam `CORS_ORIGINS`, kemudian restart backend.

### Tunnel menghasilkan 502

Pastikan backend masih berjalan pada port `8000`:

```bash
curl http://localhost:8000/health
```

### Frontend masih memakai localhost

Perbarui environment variable Cloudflare Pages dan lakukan redeploy. Environment variable Vite dibaca saat build, bukan saat browser membuka halaman.

### Upload foto gagal

Periksa status MinIO dan konfigurasi:

```env
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET
```

## 15. Status deployment

Arsitektur final untuk testing:

```text
Frontend: Cloudflare Pages
Backend: FastAPI lokal
Database: MySQL lokal
Public API: Cloudflare Tunnel
AI pipeline: Laptop lokal
```

Deployment dianggap siap untuk sesi pengujian jika:

- `http://localhost:8000/health` berhasil.
- URL tunnel dapat mengakses `/health`.
- Frontend Cloudflare Pages berhasil di-build.
- Frontend dapat memanggil backend publik.
- Login warga berhasil.
- Direktori sekolah berhasil dibuka.
- Laporan warga dapat dibuat.
- Riwayat laporan dapat dibuka.
- Klaster dan vote dapat diuji.
- Tidak ada error CORS.
- Black-box testing warga dan SUS dapat dijalankan.

Deployment ini **bukan deployment produksi permanen**. Untuk produksi, backend, database, dan storage harus dipindahkan ke layanan yang selalu aktif.
