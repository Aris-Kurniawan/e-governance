# SETUP.md — SIMAKIS Frontend

Cara install dan menjalankan proyek frontend SIMAKIS secara lokal. Stack diambil
dari `ARCHITECTURE.md` dan `DESIGN_SYSTEM.md` (React 18 SPA + Tailwind CSS +
shadcn/ui + Apache ECharts) dan diverifikasi ulang terhadap file Figma mockup
yang sudah dibuat.

> Catatan: `API_CLIENT.md` dan `MOCK_DATA.md` sudah tersedia (`docs/frontend/`).
> Sampai backend terhubung, jalankan frontend dalam mode UI-only — komponen
> data (tabel, chart, peta) dirender dari `src/mocks/` dulu, belum fetch ke
> backend sungguhan. Cek `TASK_GUIDE.md` (frontend) untuk urutan kerja.

---

## 1. Prasyarat

| Tool | Versi minimum | Cek dengan |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| npm | 10.x (ikut Node) | `npm -v` |
| Git | apa saja yang cukup baru | `git --version` |

Tidak perlu install Python/FastAPI apapun untuk kerja di frontend — sisi
frontend dan backend sengaja dipisah supaya bisa dikerjakan paralel (sesuai
urutan kerja "frontend dulu" yang sudah disepakati).

---

## 2. Inisialisasi proyek

Kalau proyek belum di-scaffold:

```bash
npm create vite@latest simakis-frontend -- --template react-ts
cd simakis-frontend
npm install
```

Kalau proyek sudah ada (clone dari repo tim):

```bash
git clone <url-repo>
cd simakis-frontend
npm install
```

---

## 3. Install dependency inti

```bash
# Routing
npm install react-router-dom

# Styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui (CLI generate komponen ke src/components/ui, bukan lewat npm install biasa)
npx shadcn@latest init

# Charting
npm install echarts echarts-for-react

# Peta (GeoJSON, Leaflet — lihat ARCHITECTURE.md soal kenapa Leaflet dipilih, bukan QGIS)
npm install leaflet react-leaflet
npm install -D @types/leaflet

# Ikon
npm install lucide-react
```

Saat `npx shadcn@latest init` menanyakan konfigurasi, pilih:
- Style: **Default**
- Base color: **Slate** (paling dekat ke token `--ink`/`--border` di Design System, akan di-override lewat token custom — lihat `UI_COMPONENTS.md`)
- CSS variables: **Yes** (wajib, supaya token warna institusional bisa di-swap tanpa ubah tiap komponen satu-satu)

---

## 4. Font

Font resmi seluruh aplikasi adalah **Plus Jakarta Sans** (satu keluarga font
untuk semua teks, termasuk heading — sudah dikonfirmasi lewat token
Typography Scale di file Figma, bukan asumsi).

Tambahkan di `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Lalu set sebagai font default di `tailwind.config.js` (lihat `UI_COMPONENTS.md`
untuk konfigurasi token lengkap).

---

## 5. Environment variables

Buat `.env.local` (jangan commit ke git):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

`VITE_API_BASE_URL` dipakai `src/lib/api/client.ts` sebagai base URL semua
request ke backend. Kalau env ini tidak diisi, kodenya memakai default
`http://localhost:8000`.

`VITE_MAP_TILE_URL` pakai tile OpenStreetMap gratis (tidak perlu API key),
sesuai keputusan Leaflet + OSM di `ARCHITECTURE.md`.

---

## 6. Struktur folder awal

```
src/
├── components/
│   ├── ui/              # hasil generate shadcn/ui, jangan edit manual
│   └── ...               # lihat UI_COMPONENTS.md untuk detail lengkap
├── layouts/
├── pages/
│   ├── warga/
│   └── pemerintah/
├── routes/
├── styles/
│   └── globals.css       # import Tailwind + token CSS variables
└── main.tsx
```

Detail konvensi penamaan dan pemetaan komponen ada di `UI_COMPONENTS.md` —
jangan buat komponen baru sebelum cek dokumen itu, supaya tidak duplikat
pola yang sudah ada.

---

## 7. Menjalankan proyek

### 7.1 Backend + frontend sekaligus (disarankan)

Dari **root repo**, satu perintah menyalakan keduanya:

```bash
npm install     # sekali saja, mengunduh concurrently + wait-on
npm run dev
```

Dua pane berjalan berdampingan:

| Pane | Isi |
|---|---|
| `backend` (biru) | `uvicorn app.main:app --reload --port 8000` |
| `frontend` (hijau) | menunggu `GET /health` backend, lalu `vite` di `:5173` |

Backend butuh **±30 detik** start (memuat model embedding), jadi pane
frontend menunggu backend sehat dulu sebelum Vite dijalankan. `Ctrl+C`
mematikan keduanya. Kalau backend gagal start, `-k` ikut mematikan pane
frontend agar tidak menggantung.

> Jalankan dari **WSL**, bukan PowerShell di `\wsl.localhost` — script memakai
> `cd backend &&` dan path POSIX.
>
> Backend tetap perlu CORS untuk mode ini: origins dev dicakup lewat
> `CORS_ORIGINS` di `backend/.env.example`.

### 7.2 Masing-masing (kalau hanya satu yang perlu)

```bash
npm run dev:frontend        # hanya frontend
npm run dev:backend:only    # hanya backend
npm run build:frontend      # build produksi frontend
npm run test:backend        # pytest backend
```

Atau dari masing-masing folder seperti biasa (`cd frontend && npm run dev`).

### 7.3 Dependency root

`package.json` di root hanya berisi tooling pengembangan monorepo
(`concurrently`, `wait-on`) — bukan dependensi aplikasi. Dependensi
frontend tetap di `frontend/package.json`, backend di
`backend/requirements.txt`.

Script lain yang perlu ada di `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  }
}
```

---

## 8. Checklist sebelum mulai coding komponen

- [ ] `npm run dev` jalan tanpa error di `localhost:5173`
- [ ] Font Plus Jakarta Sans terlihat termuat (cek di DevTools → Network → Fonts)
- [ ] `npx shadcn@latest add button card badge` berhasil generate ke `src/components/ui/`
- [ ] Baca `UI_COMPONENTS.md` sebelum bikin komponen custom pertama
