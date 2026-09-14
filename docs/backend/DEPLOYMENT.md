# DEPLOYMENT.md — SIMAKIS Backend

> Panduan deploy ke server/VPS untuk keperluan demo/UAT (`PRD.md` §11,
> `ROADMAP.md` Fase 4). Bukan setup production skala besar — disesuaikan
> dengan tim 2 orang dan waktu 14 minggu (`PRD.md` §7).

---

## 1. Prasyarat Server

- VPS dengan minimal 2 vCPU / 4GB RAM (model AI — IndoBERT + UMAP +
  HDBSCAN — cukup berat untuk RAM kecil, terutama saat load model
  pertama kali).
- Ubuntu 22.04 LTS (atau setara) dengan akses root/sudo.
- Domain (opsional untuk demo, disarankan untuk UAT supaya HTTPS mudah
  disiapkan lewat Let's Encrypt).

---

## 2. Arsitektur Deploy (Docker Compose)

Tiga service utama, sesuai `ARCHITECTURE.md` §1:

```yaml
# docker-compose.yml (ringkasan struktur, bukan file lengkap)
services:
  backend:
    build: ./backend
    env_file: .env.production
    ports: ["8000:8000"]
    depends_on: [mysql, minio]

  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: simakis
    volumes: ["mysql_data:/var/lib/mysql"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes: ["minio_data:/data"]

volumes:
  mysql_data:
  minio_data:
```

Frontend (`frontend/`) di-build terpisah sebagai static files
(`npm run build`) dan disajikan lewat Nginx — **tidak** ikut di container
backend.

---

## 3. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name simakis.contoh-domain.go.id;

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /var/www/simakis-frontend/dist;
        try_files $uri /index.html;
    }
}
```

HTTPS lewat Certbot:
```bash
sudo certbot --nginx -d simakis.contoh-domain.go.id
```

---

## 4. Environment Variables Produksi

Sama seperti `backend/SETUP.md` §4, tapi dengan catatan tambahan untuk
produksi:

- `JWT_SECRET` dan `PDP_ENCRYPTION_KEY` **wajib** nilai baru yang
  di-generate khusus untuk produksi — **jangan pernah** pakai nilai yang
  sama dengan environment development.
- `DATABASE_URL` mengarah ke service `mysql` di dalam Docker network
  (bukan `localhost`).
- Simpan `.env.production` **di luar** git (lihat `GIT_WORKFLOW.md` §5) —
  gunakan secret manager server atau file permission ketat (`chmod 600`).

---

## 5. Langkah Deploy

```bash
# di server
git clone <url-repo>
cd simakis

# isi .env.production sesuai backend/SETUP.md §4 + catatan §4 di atas

docker compose --env-file .env.production up -d --build

# migrasi database
docker compose exec backend alembic upgrade head

# build & copy frontend
cd frontend && npm run build
scp -r dist/* user@server:/var/www/simakis-frontend/dist
```

---

## 6. Model AI — Catatan Khusus Deploy

- Model IndoBERT/sentence-transformer perlu diunduh sekali saat build
  image (`sentence-transformers` akan download otomatis saat pertama
  dipanggil) — pastikan proses build container punya akses internet, atau
  bundling model ke dalam image supaya tidak bergantung koneksi saat
  runtime.
- AI Pipeline (`ARCHITECTURE.md` §3.3) berjalan async lewat task queue —
  pastikan proses worker (bukan cuma `uvicorn`) ikut dijalankan sebagai
  service terpisah kalau task queue butuh proses worker sendiri
  (tergantung pilihan implementasi task queue, lihat §7 di bawah).

---

## 7. Yang Belum Diputuskan

- **Teknologi task queue** untuk AI Pipeline async (`ARCHITECTURE.md`
  §3.3 cuma menyebut "Async Task Queue" secara konseptual) — belum
  ditentukan pakai Celery, RQ, FastAPI `BackgroundTasks` bawaan, atau
  lainnya. Ini menentukan apakah perlu service tambahan (mis. Redis
  sebagai broker) di `docker-compose.yml`.
- **Strategi backup** MySQL dan MinIO — belum dibahas sama sekali,
  penting terutama untuk `pdp_vault` (data NIK terenkripsi) yang tidak
  boleh hilang.
- **Monitoring/logging** produksi — belum ada rencana (mis. Sentry, log
  file rotation sederhana untuk skala proyek ini).
- **Server tujuan deploy final** (VPS kampus, cloud provider, atau server
  Dinas Pendidikan) belum ditentukan — mempengaruhi detail domain, akses
  jaringan, dan siapa yang pegang kredensial server.
