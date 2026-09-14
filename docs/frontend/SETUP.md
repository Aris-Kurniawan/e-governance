# SETUP.md — SIMAKIS Frontend

Cara install dan menjalankan proyek frontend SIMAKIS secara lokal. Stack diambil
dari `ARCHITECTURE.md` dan `DESIGN_SYSTEM.md` (React 18 SPA + Tailwind CSS +
shadcn/ui + Apache ECharts) dan diverifikasi ulang terhadap file Figma mockup
yang sudah dibuat.

> Catatan: `API_CLIENT.md` dan `MOCK_DATA.md` belum dibuat (menunggu
> `universal/INTERFACES.md`). Sampai keduanya ada, jalankan frontend dalam
> mode UI-only — komponen data (tabel, chart, peta) dirender dengan props
> statis dulu, belum fetch ke backend sungguhan.

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

`VITE_API_BASE_URL` belum benar-benar dipakai sampai `API_CLIENT.md` dibuat —
disiapkan lebih dulu supaya tidak perlu ubah konfigurasi environment belakangan.

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

```bash
npm run dev
```

Default jalan di `http://localhost:5173`.

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
