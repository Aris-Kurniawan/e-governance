# CHANGELOG.md — SIMAKIS Frontend

Semua perubahan penting pada modul Frontend SIMAKIS akan dicatat dalam dokumen ini.

Format dokumen ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi prinsip Semantic Versioning. Dokumen ini mencatat realisasi perkembangan frontend per milestone (sesuai `ROADMAP.md`).

---

## Format Kategori Perubahan

- **Ditambahkan** (*Added*): Untuk fitur atau spesifikasi baru yang ditambahkan.
- **Diubah** (*Changed*): Untuk perubahan pada fungsi atau spesifikasi yang sudah ada.
- **Diperbaiki** (*Fixed*): Untuk perbaikan bug atau perbaikan kesalahan teknis/dokumen.
- **Dihapus** (*Removed*): Untuk fitur atau elemen yang dihapus.
- **Keamanan** (*Security*): Untuk perbaikan celah keamanan.

---

## [Belum Rilis]

### Ditambahkan
- Perencanaan komponen mock data dan client API (`MOCK_DATA.md` & `API_CLIENT.md`).
- Implementasi awal halaman Dashboard Warga & Pelaporan Isu (Fase 2).

---

## [0.1.0] - 2026-09-15

### Ditambahkan
- **Setup Proyek Frontend (`SETUP.md`)**:
  - Inisialisasi proyek React 18 SPA + Vite + TypeScript.
  - Integrasi Tailwind CSS, PostCSS, dan Autoprefixer.
  - Konfigurasi `shadcn/ui` dengan dasar tema Slate dan Support CSS Variables.
  - Setup pustaka charting (Apache ECharts & `echarts-for-react`), peta interaktif (`Leaflet` & `react-leaflet`), serta ikon (`lucide-react`).
  - Penataan pemuatan font resmi **Plus Jakarta Sans** via Google Fonts.
- **Sistem Desain Frontend (`DESIGN_SYSTEM.md`)**:
  - Definisi palet warna resmi e-governance (Primary `#123A63`, Primary Light, Neutral/Ink, Surface, Danger, Warning).
  - Skala tipografi lengkap (Display H1 hingga Overline).
  - Skala Spacing (4px - 48px), Border Radius (sm 8px, md 12px, lg 16px, full 9999px), dan aturan shadow halus e-gov.
  - Panduan elemen dekoratif institusional (Hairline Kop, Watermark Motif Contour & Seal).
- **Spesifikasi Komponen UI (`UI_COMPONENTS.md`)**:
  - Konvensi penamaan dan hierarki komponen UI (`ui/`, `institutional/`, `composite/`, `charts/`, `map/`).
  - Pemetaan komponen `shadcn/ui` dan komponen custom institusional.
- **Alur & State Halaman (`FLOWS.md` & `PAGE_STATES.md`)**:
  - Pemetaan alur navigasi pengguna (Public/Warga & Internal Dinas).
  - Spesifikasi kondisi tampilan halaman (Loading, Empty Data, Error, Success State, & RBAC Guard).

### Diubah
- Penyelarasan struktur folder frontend sesuai kesepakatan batas modul di `universal/GIT_WORKFLOW.md`.

---

## Hubungan dengan Dokumen Lain

- `docs/universal/ROADMAP.md` — Sumber target milestone rencana pengerjaan frontend.
- `docs/frontend/SETUP.md` — Panduan setup dan cara menjalankan frontend secara lokal.
- `docs/frontend/DESIGN_SYSTEM.md` — Sumber kebenaran tunggal token visual frontend.
