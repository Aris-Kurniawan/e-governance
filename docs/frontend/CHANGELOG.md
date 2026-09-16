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
- **Implementasi Halaman Dashboard Wilayah (`src/pages/warga/DashboardWilayah.tsx`)**:
  - Halaman audit partisipatif sarana sekolah tingkat kecamatan dengan rute `/laporan/wilayah` dan `/dashboard`.
  - Banner status sinkronisasi Dapodik real-time (Kecamatan Lamongan - Semester Genap).
  - Header selamat datang dengan panduan validasi sarpras standar Permendikbudristek No. 22/2023.
  - Kartu ringkasan 3 KPI: Cakupan Wilayah (24 sekolah), Perhatian Audit (6 sekolah - selisih minor & mismatch kritis), Realisasi Lapangan (42 isu - tindak lanjut fisik 87.5%).
  - Tabel Matriks Integritas Sarana Sekolah (ruang kelas, lab IPA/kimia, perpustakaan, sanitasi/toilet, status integritas).
  - Widget temuan kritis teratas (#ISU-064 Lab Kimia SMAN 1 Sukodadi) dan visualisasi peta sebaran wilayah audit (Sukodadi, Kota, Turi).
  - Tabel Daftar Laporan Klaster Isu Terkini dengan filter tingkat urgensi dan navigasi paginasi.

### Diubah
- **Redesain Halaman Direktori Sekolah (`src/pages/warga/Direktori.tsx`)**:
  - Tampilan grid 2 kolom dengan kartu sekolah berstatus integritas tinggi (`Selisih Kritis`, `Selisih Minor`, `Data Sesuai`).
  - Rincian baseline ruang kelas, laboratorium, dan rasio guru serta kotak temuan audit partisipatif komite sekolah.
  - Sidebar Kepatuhan Audit Sarpras berstandar Kemendikdasmen dengan progress bar tingkat kepatuhan wilayah (87.5%), dasar regulasi Permendikbud No. 24/2007 & UU PDP No. 27/2022, serta opsi ekspor CSV.
  - Baris filter terpadu: pencarian nama/NPSN, filter jenjang (Semua, SD/MI, SMP/MTs, SMA/SMK), dropdown status integritas, dan tombol reset.
- **Redesain Halaman Detail Sekolah (`src/pages/warga/DetailSekolah.tsx`)**:
  - Header institusi resmi Dinas Pendidikan Jawa Timur Wilayah Kab. Lamongan, status akreditasi, dan tombol aksi pelaporan ketidaksesuaian fasilitas.
  - Tiga kartu metrik utama: Rasio Pendidik (standar SPM), Kapasitas Rombel (utilitas belajar), dan Audit Sarpras Fisik (kondisi baik, rusak ringan, rusak berat).
  - Rincian fasilitas sekolah (Ruang Kelas, Toilet Siswa, Lab Kimia, Ruang UKS, Perpustakaan) dengan indikator status dan tautan sanggahan data.
  - Komparasi visual arsip dokumentasi Dapodik baseline versus fakta audit lapangan warga terverifikasi dengan foto bukti fisik.
  - Banner kepatuhan UU PDP No. 27/2022 dengan enkripsi SHA-256 dan tombol log audit trail.
- **Redesain Halaman Riwayat Laporan (`src/pages/warga/RiwayatLaporan.tsx`)**:
  - Registri partisipasi publik dengan ringkasan total aduan dan persentase penyelesaian audit.
  - Kartu aduan interaktif lengkap dengan stepper alur birokrasi 4 tahap (Sanggahan Diterima, Klaster Otomatis, Audit Fisik Dinas, Pembaruan Dapodik).
  - Kuorum validasi komite warga (pencapaian target NIK sah), catatan resmi tim verifikator sarpras Disdik, dan dokumen bukti fisik geotagged.
  - Sidebar ketentuan suara & validitas (1 NIK = 1 Suara Mandiri, kepatuhan UU PDP) serta kriteria sanggahan ditolak.
- **Penyelarasan Layout Publik & Navigasi (`src/layouts/PublicLayout.tsx` & `src/App.tsx`)**:
  - Navigasi aktif untuk Beranda, Dashboard Wilayah (`/laporan/wilayah`), Direktori Sekolah (`/sekolah`), Riwayat Laporan (`/laporan/riwayat`), dan Tentang Data.
  - Footer bernuansa dark navy institusional (`#07162C`) dengan navigasi 4 kolom lengkap.
- **Penyelarasan Proporsi & Redesain Halaman Verifikasi & Registrasi (`src/pages/warga/Registrasi.tsx` & `src/layouts/AuthLayout.tsx`)**:
  - Penataan proporsi layout split-screen dengan sidebar branding kiri bernuansa `#0B2F52` (logo V2 Resmi, 3 kartu nilai dengan ikon tinted, watermark radial melengkung) dan form kanan berlebar optimal `max-w-[620px]`.
  - **Tahap 1 (Kredensial Akun)**: Indikator estimasi waktu 1 menit, progress bar 50%, stepper 2 tahap, input nama resmi, WhatsApp prefix `+62`, pengukur kekuatan sandi 4 bar (`Kuat`), toggle intip sandi, dan tombol aksi biru `#2563EB`.
  - **Tahap 2 (Verifikasi Identitas)**: Estimasi waktu 2 menit, progress bar 100%, kartu pilihan 4 peran (Pelajar/Siswa Aktif dengan badge *Saksi Kunci*, Orang Tua/Wali, Pengurus Komite, Warga Umum).
  - Integrasi kotak verifikasi Dapodik peserta didik (dropdown sekolah, validasi NISN 10-digit dengan badge status, area unggah foto kartu pelajar berbingkai dashed hijau).
  - Input NIK terenkripsi 16-digit sah, dropdown kelurahan/desa domisili di Lamongan, serta banner jaminan keamanan data anak UU PDP No. 27/2022.

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
