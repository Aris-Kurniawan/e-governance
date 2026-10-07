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
- **Tooling Dev Monorepo: `npm run dev` menyalakan backend + frontend sekaligus**:
  - **`package.json` baru di root repo** — hanya berisi tooling pengembangan, bukan dependensi aplikasi (dependensi FE tetap di `frontend/`, BE di `backend/requirements.txt`).
  - `npm run dev` menjalankan dua proses berdampingan lewat `concurrently` (pane `backend` biru + `frontend` hijau): `uvicorn app.main:app --reload --port 8000` dan Vite di `:5173`.
  - **`wait-on` menahan pane frontend** sampai `GET /health` backend balas 200 — penting karena backend memuat model embedding dan butuh ±30 detik start. Prefix `http-get://` dipakai (bukan `http://`) karena `wait-on` default memakai HTTP HEAD, sedangkan endpoint `/health` hanya menerima GET.
  - `Ctrl+C` mematikan keduanya; flag `-k` memastikan pane frontend ikut mati kalau backend gagal start (tidak menggantung sampai timeout).
  - Script tambahan: `dev:backend:only`, `dev:frontend:only`, `build:frontend`, `test:backend`.
- **CORS middleware di backend (`app/main.py`, `app/core/config.py`)** — prasyarat agar browser boleh memanggil API dari origin Vite:
  - `CORSMiddleware` dipasang dengan `allow_origins` dari setting `CORS_ORIGINS`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
  - Default Setting: `http://localhost:5173` + `http://127.0.0.1:5173`. Format di `.env` harus JSON; produksi disaranankan `[]` karena FE & BE dilayani same-origin di belakang reverse proxy.
  - Terverifikasi: preflight `OPTIONS /sekolah` dengan `Origin: http://localhost:5173` → `access-control-allow-origin: http://localhost:5173`; `GET /sekolah` → 200 dengan 62 sekolah; `POST /auth/login` → 200 role `admin`; pytest tetap 87/87.
- **Perbaikan `.gitignore`: `lib/` → `/lib/`** — aturan `lib/` (warisan template setuptools Python) tanpa tanda akar cocok dengan folder `lib` di kedalaman mana pun, sehingga **`frontend/src/lib/` ikut ter-ignore** dan seluruh lapisan API F4.1 (11 file) tidak muncul di `git status`. Di-root-kan agar hanya artifact Python di root yang diabaikan; `CRLF` file dipertahankan; `.venv/` tetap ter-ignore lewat aturannya sendiri.

### Ditambahkan
- **F4.1 — Integrasi FE↔BE: Ganti Mock dengan API Nyata (`src/lib/api/*`)**:
  - **Lapis API baru** `src/lib/api/` sebagai satu-satunya jalan FE ke backend (kontrak: `docs/universal/INTERFACES.md`):
    - `client.ts` — fetch wrapper:FQ lewat amplop `{data, meta}`, pasang `Authorization: Bearer` otomatis dari `tokenStore`, **refresh token otomatis sekali** saat 401 lalu mengulang request, pemetaan error respons ke `ApiError`, dan penanda `ApiError.isAuthError`.
    - `errors.ts` — `ApiError` + `ApiErrorCode` sesuai INTERFACES.md §0.3 (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `ALREADY_VOTED`, `REASON_REQUIRED`, `INTERNAL_ERROR`, `NETWORK_ERROR`).
    - `types.ts` — seluruh type respons (Auth, Sekolah, Laporan, Klaster, Vote, Status, Dashboard, `AsyncState` untuk `useFetch`).
    - Modul domain: `auth.ts`, `sekolah.ts`, `laporan.ts`, `klaster.ts`, `vote.ts`, `dashboard.ts`, plus `index.ts` sebagai barrel import.
  - **`src/lib/utils.ts`** — helper `cn()` (clsx + tailwind-merge); memperbaiki 12 komponen `ui/*` yang gagal build karena modul ini belum pernah ada.
  - `useFetch`/`useStatusPolling` (sudah ada) kini benar-benar terpakai karena sumber datanya API.
  - **Smoke test kontrak 14/14 lulus** terhadap backend yang sedang berjalan: setiap field wajib pada `types.ts` diverifikasi cocok dengan respons nyata (`GET /auth/me`, `/sekolah`, `/sekolah/{npsn}`, `/sekolah/{npsn}/sanggahan`, `/klaster`, `/klaster/{id}`, `/klaster/{id}/riwayat`, `/dashboard/prioritas`, `/dashboard/wilayah`, `/ai/status`, `/ingest/riwayat`, plus pemetaan error 404/401).
  - **Halaman warga di-migrate ke API**: `Dashboard.tsx` (KPI & daftar sekolah dari `GET /sekolah`, riwayat laporan dari `GET /laporan/riwayat`), `Direktori.tsx` (pencarian & paginasi kini **server-side** via `?search=&jenjang=&page=&page_size=`), `DetailSekolah.tsx` (3 kartu D-20 dari `GET /sekolah/{npsn}`: kondisi sarana + ringkasan sarpras, profil Dapodik, klaster isu dari `GET /klaster?sekolah_npsn=`), `FormLaporan.tsx`, `DetailKlaster.tsx` (`GET /klaster/{id}`), `ModalFormLaporan.tsx`.
  - **Halaman dinas di-migrate ke API**: `AntrianValidasi.tsx` (antrean dari `GET /klaster`, detail + laporan anggota dari `GET /klaster/{id}`, jejak status dari `GET /klaster/{id}/riwayat`, **tombol keputusan memanggil `PUT /klaster/{id}/verifikasi?status=&alasan=`**), `DinasLayout.tsx` (pencarian global: sekolah via `GET /sekolah?search=`, klaster dari `GET /klaster?page_size=100`), `DashboardKadis.tsx`, `PetaSebaranDinas.tsx`, `CetakRingkasanEksekutif.tsx`, `IngestDataCsv.tsx` (pemilih berkas CSV asli + pratinjau hasil parse + unggah via `POST /ingest/dapodik`, riwayat dari `GET /ingest/riwayat`).
  - **`src/context/AuthContext.tsx` ditulis ulang**: `mock-jwt-token` dihapus; login kini `POST /auth/login` → token disimpan di `tokenStore`, profil diambil dari `GET /auth/me`, `isLoading`, `role`, `roleLabel`, `refreshUser()`, dan `logout()` yang benar-benar membersihkan token.
  - **`src/pages/warga/Login.tsx`**: login sungguhan ke backend dengan pesan error dari server (bukan lagi delay simulasi + user palsu).
- **Fitur Filter Jenjang & Ekspor CSV pada Matriks Integritas Dashboard Wilayah (`src/pages/warga/DashboardWilayah.tsx`)**:
  - Tombol **Filter Jenjang** sebelumnya hanya tampilan (tanpa `onClick`); kini membuka dropdown pilihan `Semua / SD / SMP / SMA / SMK` (komponen `Select` shadcn) yang menyaring baris tabel matriks secara langsung — label tombol berubah menjadi `Jenjang: <pilihan>` dengan aksen biru saat filter aktif.
  - Tombol **Unduh CSV** kini mengekspor baris hasil filter menjadi berkas `matriks_integritas_sarpras_<jenjang?>_<tanggal>.csv` (kolom NPSN, Nama Sekolah, Jenjang, Ruang Kelas, Lab IPA/Kimia, Perpustakaan, Sanitasi/Toilet, Status Integritas), mengikuti pola ekspor CSV Direktori Sekolah.
  - 5 baris tabel di-refactor dari JSX hardcoded menjadi array `matriksSekolah` (type `BarisMatriks` + token warna `TONE_SEL`/`STATUS_SEL`) sehingga tampilan, filter, dan ekspor memakai satu sumber data.
  - Footer tabel kini menampilkan jumlah baris hasil filter ("Menampilkan X dari 24 entitas terdaftar · difilter jenjang …") dan empty state "Tidak ada sekolah dengan jenjang …".
  - `npm run build` sukses; `/laporan/wilayah` dan `/dashboard` → HTTP 200.
- **Implementasi Halaman Dashboard Wilayah (`src/pages/warga/DashboardWilayah.tsx`)**:
  - Halaman audit partisipatif sarana sekolah tingkat kecamatan dengan rute `/laporan/wilayah` dan `/dashboard`.
  - Banner status sinkronisasi Dapodik real-time (Kecamatan Lamongan - Semester Genap).
  - Header selamat datang dengan panduan validasi sarpras standar Permendikbudristek No. 22/2023.
  - Kartu ringkasan 3 KPI: Cakupan Wilayah (24 sekolah), Perhatian Audit (6 sekolah - selisih minor & mismatch kritis), Realisasi Lapangan (42 isu - tindak lanjut fisik 87.5%).
  - Tabel Matriks Integritas Sarana Sekolah (ruang kelas, lab IPA/kimia, perpustakaan, sanitasi/toilet, status integritas).
  - Widget temuan kritis teratas (#ISU-064 Lab Kimia SMAN 1 Sukodadi) dan visualisasi peta sebaran wilayah audit (Sukodadi, Kota, Turi).
  - Tabel Daftar Laporan Klaster Isu Terkini dengan filter tingkat urgensi dan navigasi paginasi.
- **Proteksi & Gerbang Autentikasi Pelaporan di Halaman Home & Dashboard Wilayah (`src/pages/warga/Landing.tsx` & `src/pages/warga/DashboardWilayah.tsx`)**:
  - Penambahan integrasi `AuthRequiredModal` dan pengecekan otentikasi warga berbasis NIK (`useAuth`) pada semua tombol aksi pelaporan di Beranda (Home) dan Dashboard Wilayah.
  - Tombol **Mulai Laporkan Temuan** di Beranda kini memeriksa status sesi: jika pengguna belum masuk, modal dialog *Wajib Masuk / Daftar Akun* terbuka dengan rincian prinsip 1 NIK = 1 Suara Sah, jaminan kerahasiaan UU PDP, dan pemantauan real-time serta opsi Masuk atau Daftar Akun. Jika sudah masuk, pengguna langsung diarahkan ke form pelaporan.
  - Penambahan badge status autentikasi real-time di bawah tombol aksi Beranda dan banner selamat datang Dashboard Wilayah.
  - Banner CTA di bagian bawah Beranda kini dinamis menyesuaikan sesi login (menampilkan ucapan selamat datang dan tombol aksi laporan langsung bagi pengguna aktif).
  - Pada **Dashboard Wilayah**: penambahan tombol aksi *Laporkan Temuan* pada header tabel matriks integritas, kolom *AKSI* dengan tombol *Lapor* kontekstual per baris entitas sekolah (langsung membawa NPSN sekolah ke dialog login/form), tombol *Laporkan Temuan di Sekolah Ini* pada widget isu kritis teratas, serta tombol *Buat Aduan Baru* pada tabel klaster isu terkini.
- **Halaman Detail Klaster Isu Warga (`src/pages/warga/DetailKlaster.tsx`, `src/App.tsx`, `src/mocks/klaster.ts`)**:
  - Rute publik baru `/klaster/:klasterId` — target klik dari Kartu 3 "Isu & Klaster Warga" di Detail Sekolah (TASK_GUIDE F2.6: *klik → detail klaster*).
  - Konten: breadcrumb (Direktori → sekolah → klaster), header klaster (kategori, badge status via `StatusBadge`, jumlah laporan, tautan sekolah), blok **Skor Prioritas** besar dengan label tingkat (≥70 Tinggi / ≥40 Sedang / <40 Rendah), penjelasan status, daftar **Laporan Anggota Klaster** (tracking ID, tanggal, deskripsi), empty state "Detail laporan belum tersedia", dan CTA "Laporkan Isu di Sekolah Ini".
  - Mock `klasterDetailMap` dilengkapi entri `kls-002` (2 laporan anggota) supaya seluruh klaster yang tampil di kartu punya halaman detail.
  - State `404` "Klaster tidak ditemukan" untuk ID tak dikenal.

### Diubah
- **Status Pengerjaan Task Frontend di TASK_GUIDE (`docs/frontend/TASK_GUIDE.md`)**:
  - Menambahkan seksi **Status Pengerjaan**: tabel status seluruh task F1.1–F4.4 hasil audit terhadap kode (1 Oktober 2026) plus daftar **Detail Task Tertunda (belum selesai / terlewat)** berformat checklist dengan target file/rute dan pendukung yang sudah tersedia.
  - Task tertunda tercatat: F3.1 sisa (`InstitutionalStepper` + list klaster), **F3.2 Voting** (target `DetailKlaster.tsx` §A3 — pendukung `voteKlaster`/`VoteResponse`/mock sudah ada), F3.3 Status Tindak Lanjut (halaman status + `useStatusPolling` belum terpasang), F3.4 sisa (override prioritas §B2, update status penanganan §B3), dan seluruh Fase 4 (F4.1–F4.4); deviasi minor F1.1 (routing di `App.tsx`) & F1.5 (folder institusional kosong) ikut dicatat.
  - `Update terakhir` TASK_GUIDE diperbarui dari 15 September 2026 menjadi 1 Oktober 2026.
- **Antrian Validasi: Strip Filter Fungsional & Data Klaster Diperluas (`src/pages/dinas/AntrianValidasi.tsx`, `src/mocks/dinasData.ts`)**:
  - Strip filter kini berfungsi: 4 tab status (Belum Ditinjau / Mismatch Terverifikasi / Kejadian Baru / Ditolak) dengan badge hitung `tabCounts`, dropdown sekolah (`schoolOptions`, `aria-label="Filter berdasarkan sekolah"`), slider **Prioritas Min** (`min=0 max=90 step=5`, label `N+`), serta pencarian tersinkron URL `?search=` — semua di-`useMemo` `filteredKlasters` dengan auto-pilih kartu pertama saat filter berubah, counter "X Klaster", footer "Menampilkan X dari Y klaster isu aktif", dan empty state 0 hasil.
  - Kartu klaster: galeri bukti MinIO berlabel "BUKTI LAPORAN"; label "Terpilih di Inspector" dihapus (rincian di bagian **Dihapus**).
  - `daftarKlasterDinas` diperluas 5 → 7 klaster (entri baru `kls-006`, `kls-007`) plus pembaruan field entri lama (+347 baris) untuk menopang filter.
  - `npm run build` sukses.
- **Footer Ringkas PublicLayout & WargaLayout (`src/layouts/PublicLayout.tsx`, `src/layouts/WargaLayout.tsx`)**:
  - Kredit footer disederhanakan: `© 2026 SIMAKIS · PSDKP Lamongan PENS · Disdik Kab. Lamongan` menjadi `© 2026 SIMAKIS · Disdik Kab. Lamongan` (PublicLayout) dan `© 2026 SIMAKIS Disdik Kab. Lamongan` (WargaLayout) — kredit PSDKP Lamongan PENS dihapus dari keduanya.
  - Format className komponen `Nav` di `WargaLayout` dirapikan ulang tanpa perubahan perilaku.
  - `npm run build` sukses.
- **Aset Logo SIMAKIS Baru & Pemasangan di Header/Footer (`public/logo-*`, `index.html`, `src/layouts/{AuthLayout,DinasLayout,PublicLayout,WargaLayout}.tsx`, `src/pages/dinas/LoginDinas.tsx`)**:
  - Aset logo diganti: `logo-simakis.svg` baru (geometris huruf S dengan gradien brand #1E40AF → #06B6D4) plus empat berkas PNG (`logo-simakis-icon/clean/transparent/logo-simakis.png`) yang dikompres ulang; favicon `index.html` kini menunjuk `/logo-simakis-icon.png` (sebelumnya `vite.svg`).
  - Logo dipasang di kotak putih bersudut pada header `PublicLayout`, `WargaLayout` & `AuthLayout` (menggantikan inisial "S"), `DinasLayout`, dan `LoginDinas` (wadah 11–12, teks brand naik ke `text-base/lg font-extrabold`), lengkap dengan fallback `onError` ke `/logo-simakis.png`; blok logo footer `PublicLayout` ikut memakai ikon yang sama.
  - `npm run build` sukses.
- **Teks Tabel Matriks Integritas Dashboard Wilayah Satu Baris (`src/pages/warga/DashboardWilayah.tsx`)**:
  - Class `whitespace-nowrap` ditambahkan ke elemen `<table>` sehingga seluruh sel (header RUANG KELAS/LAB IPA-KIMIA/STATUS INTEGRITAS, nama sekolah, baris NPSN · Negeri, pill metrik "1 Rusak"/"−1 R.Teori", dan badge status) tidak lagi turun baris; bila lebar layar kurang, tabel dapat digulir horizontal via pembungkus `overflow-x-auto`.
  - `npm run build` sukses; `/laporan/wilayah` → HTTP 200.
- **Perbesaran Ukuran Angka Matriks Integritas Dashboard Wilayah (`src/pages/warga/DashboardWilayah.tsx`)**:
  - Angka pada pill metrik tabel (Ruang Kelas, Lab IPA/Kimia, Perpustakaan, Sanitasi/Toilet) dinaikkan dari `text-xs` (12px) menjadi `text-sm` (14px) agar lebih terbaca; pill netral "—" tetap berukuran kecil.
  - `npm run build` sukses; `/laporan/wilayah` → HTTP 200.
- **Penyelarasan 3 Kartu Detail Sekolah dengan TASK_GUIDE F2.6 & DECISIONS D-20 (`src/pages/warga/DetailSekolah.tsx`, `src/mocks/sekolahDirektori.ts`)**:
  - Baris kartu metrik kini persis mengikuti spesifikasi F2.6: **Kartu 1 — Audit Sarpras**, **Kartu 2 — Profil Dapodik**, **Kartu 3 — Isu & Klaster Warga**.
  - **Kartu 2 — Profil Dapodik** (baru): badge akreditasi, nama kepala sekolah, jenjang, dan badge status sekolah; footer sumber data Dapodik + TA berjalan. Field `kepalaSekolah` ditambahkan ke `SekolahBaseline` (pool nama deterministik per NPSN).
  - **Kartu 3 — Isu & Klaster Warga** (baru): daftar `klaster_isu` sekolah dari `klasterList` (label kategori, badge skor prioritas, `StatusBadge`, jumlah laporan) yang dapat diklik ke `/klaster/:klasterId`; empty state "**Belum ada isu terdeteksi**" untuk sekolah tanpa klaster.
  - **Kartu "Rasio Pendidik" & "Kapasitas Rombel" dihapus** — kedua kartu diwajibkan disembunyikan pada v1 oleh `DECISIONS.md` D-20 (Final) dan catatan scope `INTERFACES.md` §2 (field `rasio_guru_siswa`, `jumlah_pd/ptk/rombel`, `utilitas_kapasitas_belajar` tidak dirender).
  - `npm run build` sukses; rute `/sekolah/20532361` (2 klaster), `/sekolah/20506281` (empty state), `/klaster/kls-001`, `/klaster/kls-002` → HTTP 200.
- **Rapikan Card Antrian Validasi agar Caption Tidak Bertumpuk (`src/pages/dinas/AntrianValidasi.tsx`)**:
  - Baris metadata atas (badge status, nomor tiket, waktu perbarui, badge skor/prioritas) kini memakai `flex-wrap` + `gap-x/y` sehingga teks panjang turun baris dengan rapi, dan blok skor di `shrink-0 ml-auto` agar tidak tertimpa.
  - Baris metrik (laporan warga, dukungan, "Terpilih di Inspector") juga di-wrap dengan `gap-y-1`; caption `BUKTI MINIO …` dan `Kedaluwarsa 42 mnt lagi` dapat turun baris saat kolom sempit, bukan saling menimpa.
  - `npm run build` sukses.
- **Perbaikan Tombol "Masuk Akun" pada Banner Home Web Warga (`src/pages/warga/Landing.tsx`)**:
  - Tombol **Masuk Akun** sebelumnya memakai `variant="outline"` (latar putih) dengan `text-white` sehingga label teks putih di atas putih — tidak terlihat sama sekali di banner gelap.
  - Kini disamakan gayanya dengan tombol **Daftar Akun Warga** (latar putih solid, teks `#0B3052`, shadow halus, radius 8px) sehingga kedua tombol seragam dan label terbaca jelas.
  - `npm run build` sukses.
- **Cetak Ringkasan Dashboard Kadis Hasilkan Dokumen Data, Bukan Screenshot UI (`src/pages/dinas/DashboardKadis.tsx`, `src/components/composite/CetakRingkasanEksekutif.tsx`, `src/styles/globals.css`)**:
  - Tombol **Cetak Ringkasan** sebelumnya memanggil `window.print()` langsung sehingga hasil cetak = tampilan UI (sidebar, kartu, chart) apa adanya.
  - Komponen baru `CetakRingkasanEksekutif.tsx`: dokumen cetak murni data yang hanya tampil saat print (`hidden print:block`) berisi kop surat resmi (logo SIMAKIS + Pemerintah Kab. Lamongan / Dinas Pendidikan), judul laporan + periode/tanggal cetak, tabel **A. Ringkasan Indikator Utama**, **B. Isu Prioritas Tertinggi (5 Teratas)**, **C. Tren Isu Baru per Bulan**, **D. Distribusi Jenis Fasilitas Bermasalah** (dengan baris total), catatan kaki kemitraan Dapodik/Permendikbudristek/UU PDP, serta blok tanda tangan Kepala Dinas & Verifikator Sarpras.
  - UI dashboard dibungkus `print:hidden`; CSS print di `globals.css` menyembunyikan `aside`/`header` layout, melepas padding `main`, meng-reset latar putih, dan mengatur margin `@page` 15mm — sehingga yang tercetak hanya dokumen data.
  - `npm run build` sukses; `/dinas/dashboard` terverifikasi HTTP 200.
- **Penyelarasan Visualisasi Chart & Peta ke Standar `UI_COMPONENTS.md` §6/§7 (`echarts-for-react` + `react-leaflet`)**:
  - **Dashboard Kadis (`src/pages/dinas/DashboardKadis.tsx`)**: peta SVG statis (5 pin hardcoded + polygon palsu) diganti **peta `react-leaflet` nyata** (`MapContainer` + `SeverityMarker` + `MapLegend`) yang merender `petaMismatchTitik` dari mock — klik pin langsung menuju Antrian Validasi; chart tren SVG manual diganti `AreaTrendChart` (ECharts) dan progress-bar distribusi fasilitas diganti `HorizontalBarChart` (ECharts).
  - **Laporan Skor KBM (`src/pages/dinas/LaporanSkorKbm.tsx`)**: bar skor 8 sekolah (progress bar HTML) diganti `HorizontalBarChart` dengan warna per-item sesuai ambang skor (kritis/tinggi/sedang/rendah), "Dampak per Kategori Fasilitas" memakai `HorizontalBarChart`, dan chart tren SVG merah diganti `AreaTrendChart` berwarna `#DC2626`.
  - **Penguatan komponen wrapper** (`src/components/charts/`): `HorizontalBarChart` menerima prop opsional `color` (warna per bar) dan `showValueLabels`; `AreaTrendChart` gradasi area kini mengikuti `color` chart via helper baru `rgba()` di `charts/theme.ts` (sebelumnya hardcode biru, sehingga chart merah tetap pakai gradasi biru).
  - Perbaikan build: `CHART_PALETTE` tidak ter-*import* di `DamageDonutChart` dan variabel `values` tidak terpakai di `HorizontalBarChart` (error `tsc` strict `noUnusedLocals`).
  - `npm run build` sukses; verifikasi HTTP 200 untuk `/dinas/dashboard`, `/dinas/peta`, dan `/dinas/skor-kbm`.
- **Logo SIMAKIS di Pojok Kiri Atas Sidebar Portal Dinas (`src/layouts/DinasLayout.tsx`)**:
  - Brand header sidebar kiri menampilkan `logo-simakis-icon.png` (fallback otomatis ke `logo-simakis.png` jika file ikon tidak ada) disertai label "SIMAKIS v2 · RESMI" dan "Disdik Kab. Lamongan".
- **Peta Sebaran Dinas — Detail Sekolah Jadi Popup di Samping Pin (`src/pages/dinas/PetaSebaranDinas.tsx` & `src/mocks/dinasData.ts`)**:
  - Panel detail sekolah yang sebelumnya berupa *Inspector Card* tetap di kanan kini berubah menjadi **popup kontekstual** yang muncul di sebelah pin lokasi saat pin diklik.
  - Pin di-render dinamis dari `petaMismatchTitik` (tambah field `posX`/`posY` pada mock); warna & ukuran mengikuti tingkat prioritas (kritis/sedang/rendah).
  - Popup menampilkan header (badge skor + status, nama sekolah, NPSN, kecamatan), koordinat, fasilitas bermasalah, metrik laporan/dukungan, bukti foto MinIO, dan aksi (Antrian Validasi / Berita Acara).
  - Popup otomatis diposisikan ke kiri/kanan pin agar tidak terpotong; ditutup dengan tombol ✕ atau klik area peta; klik pin aktif kembali menutup popup (toggle).
  - **Popup kini dapat digeser (draggable)**: dirender sebagai overlay di dalam kanvas map sehingga tidak lagi terpotong. Header popup menjadi *drag handle* (pointer events + `setPointerCapture`), posisi dibatasi agar selalu berada di dalam **area map** via `clampToMap()` berbasis ukuran kanvas.
  - **Popup mengikuti scroll**: koordinat popup kini **relatif terhadap kanvas map** (posisi `absolute` di dalam wrapper map), sehingga otomatis ikut bergerak saat halaman di-scroll — tidak lagi "tertinggal" seperti pada posisi `fixed` viewport.
  - `npm run build` sukses; `/dinas/peta` terverifikasi HTTP 200.
- **Fungsionalisasi "Lihat Data Baseline" di Direktori Sekolah (`src/pages/warga/DetailSekolah.tsx` & `src/mocks/sekolahDirektori.ts`)**:
  - Halaman Detail Sekolah kini **dinamis** berdasarkan `npsn` dari URL — sebelumnya hardcode "SMAN 1 Sukodadi" sehingga semua sekolah menampilkan data yang sama.
  - Helper baru `getSekolahBaseline(npsn)` + `buildSekolahBaseline()` menghasilkan data baseline lengkap (fasilitas, rasio pendidik, rombel, audit sarpras, temuan) untuk **seluruh 24 sekolah** di `sekolahDirektoriList` secara deterministik.
  - Rincian Fasilitas Sekolah (Ruang Kelas, Lab/Bengkel, Sanitasi, Perpustakaan, UKS, dll) diturunkan dari `stats` tiap sekolah dengan status warna kondisional (baik/ringan/berat/sanggahan).
  - Empty state "Sekolah tidak ditemukan" bila NPSN tidak terdaftar; modal laporan & auth memakai NPSN/nama sekolah aktual.
  - `npm run build` sukses; verifikasi HTTP 200 untuk berbagai NPSN (20506281, 20506312, 20506199, 60718291, 20583010).
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
  - Footer bernuansa dark navy institusional (`#07162C`) dengan navigasi 4 kolom lengkap dan logo SIMAKIS berwarna di dalam badge kotak putih kontras.
- **Pencarian & Filter Interaktif Direktori Sekolah (`src/pages/warga/Direktori.tsx` & `src/mocks/sekolahDirektori.ts`)**:
  - Fungsionalitas pencarian real-time (nama sekolah, NPSN, atau alamat) dengan tombol bersihkan instan (clear button).
  - Filter jenjang multi-kategori (`Semua`, `SD/MI`, `SMP/MTs`, `SMA/SMK`) dan filter status integritas data (`Selisih Kritis`, `Selisih Minor`, `Data Sesuai`).
  - Dataset lengkap 24 sekolah wilayah Kecamatan Lamongan dengan statistik kesesuaian Dapodik yang sinkron secara dinamis.
  - Penomoran halaman (pagination) 6 kartu per halaman, tombol reset filter, empty state pencarian informatif, serta fitur ekspor rekap wilayah ke format `.CSV`.
- **Penyelarasan Proporsi & Redesain Halaman Verifikasi & Registrasi (`src/pages/warga/Registrasi.tsx` & `src/layouts/AuthLayout.tsx`)**:
  - Penataan proporsi layout split-screen dengan sidebar branding kiri bernuansa `#0B2F52` (logo V2 Resmi, 3 kartu nilai dengan ikon tinted, watermark radial melengkung) dan form kanan berlebar optimal `max-w-[620px]`.
  - **Tahap 1 (Kredensial Akun)**: Indikator estimasi waktu 1 menit, progress bar 50%, stepper 2 tahap, input nama resmi, WhatsApp prefix `+62`, pengukur kekuatan sandi 4 bar (`Kuat`), toggle intip sandi, dan tombol aksi biru `#2563EB`.
  - **Tahap 2 (Verifikasi Identitas)**: Estimasi waktu 2 menit, progress bar 100%, kartu pilihan 4 peran (Pelajar/Siswa Aktif dengan badge *Saksi Kunci*, Orang Tua/Wali, Pengurus Komite, Warga Umum).
  - Integrasi kotak verifikasi Dapodik peserta didik (dropdown sekolah, validasi NISN 10-digit dengan badge status, area unggah foto kartu pelajar berbingkai dashed hijau).
  - Input NIK terenkripsi 16-digit sah, dropdown kelurahan/desa domisili di Lamongan, serta banner jaminan keamanan data anak UU PDP No. 27/2022.

### Dihapus
- **F4.1 — Seluruh data mock dihapus (`src/mocks/`, 7 berkas)**:
  - `auth.ts`, `sekolah.ts`, `sekolahDirektori.ts` (710 baris), `klaster.ts`, `laporan.ts`, `status.ts`, `dinasData.ts` (590 baris) — tidak ada lagi import `@/mocks/*` di seluruh `src/`.
  - Angka demo yang sebelumnya dipajang sebagai fakta (jumlah isu, tren bulanan, checksum berkas, "20 sekolah terp%", nomor tiket, baseline per fasilitas, foto, jejak audit) **tidak lagi muncul**; diganti data API atau empty state jujur.
  - Dampak: `npm run build` (tsc + vite) tetap sukses, 2323 modul, tanpa error TypeScript.
- **Tombol "Lihat NIK Penuh" pada Antrian Validasi (`src/pages/dinas/AntrianValidasi.tsx`)**:
  - Backend tidak pernah mengirim NIK pada respons mana pun (INTERFACES.md §1, PDP Vault), sehingga tombol buka-samar NIK beserta state `revealedNiks` dihapus. Baris laporan kini menampilkan sumber fasilitas dan catatan "NIK tidak ditampilkan (UU PDP No. 27/2022)".
- **Label "Terpilih di Inspector" pada Kartu Klaster Antrian Validasi (`src/pages/dinas/AntrianValidasi.tsx`)**:
  - Label indikator **"Terpilih di Inspector →"** di footer kartu klaster (muncul saat kartu dipilih) dihapus dari seluruh kartu *Antrian Isu Terklaster*; baris metrik kini hanya menampilkan jumlah laporan warga dan dukungan warga.
  - Impor ikon `ArrowRight` ikut dihapus karena tidak lagi dipakai (aturan `noUnusedLocals`).
  - `npm run build` sukses; `/dinas/antrian` → HTTP 200.

### Diperbaiki
- **Dashboard Dinas tidak menampilkan "nol palsu" saat backend tak terjangkau** (`/dinas/dashboard`, `/dinas/peta`):
  - **Gejala:** dashboard tampil utuh tetapi semua angka `0` ("0 dari … sekolah terdaftar", "Klaster terbaru diproses: 0") tanpa penjelasan apa pun — tampak seperti backend tidak tersambung, padahal tidak ada tanda errors anywhere.
  - **Akar masalah:** `DashboardKadis` dan `PetaSebaranDinas` tidak punya state `loading`/`error` sama sekali, sehingga kegagalan API dihitung sebagai data kosong (nilai default `0`). disembunyikannya juga angka mock sisa ("Cakupan 100%", "dari 24 sekolah terdaftar") yang selalu tampil apa pun kondisi server.
  - **Perbaikan:** kedua halaman kini punya tiga state — `loading` ("Memuat ringkasan eksekutif…"), `error` (pesan dari backend + petunjuk menjalankan backend di `localhost:8000` + tombol Coba Lagi), dan success. Angka mock sisa dihapus; "Sinkron Dapodik" tetap "Belum tersedia" karena memang tidak ada endpointnya.
  - **Timeout pada API client (`src/lib/api/client.ts`):** setiap request dibatasi 15 detik (`VITE_API_TIMEOUT_MS`) lewat `AbortController`. Tanpa ini `fetch` ke backend mati bisa menggantung **134 detik** di WSL sehingga UI terkunci di status "memuat" tanpa umpan balik. Timeout dilaporkan sebagai `NETWORK_ERROR` dengan pesan yang menyebutkan durasinya; abort dari pemanggil (unmount/StrictMode) tetap diteruskan.
  - **Perbaikan batas `page_size` (`backend/app/routers/sekolah.py`):** `GET /sekolah` membalas `400 VALIDATION_ERROR` untuk `page_size > 50`, padahal `INTERFACES.md` §0.2 menetapkan maks 100 (dan `GET /klaster` sudah 100).FE memanggil `page_size: 100` sehingga dashboard gagal total dengan pesan "Input tidak valid". Batas dinaikkan ke 100 agar sesuai kontrak, FE ditambah clamp `page_size` ke rentang 1–100, plus regression test `test_sekolah_page_size_100_diterima`.
  - **Perbaikan WSL:** script `npm run dev` kini menjalankan uvicorn dengan `--host 0.0.0.0` (sebelumnya `127.0.0.1` saja) agar backend terjangkau dari browser Windows lewat localhost forwarding; Vite juga diberi `--host 0.0.0.0`.

- **Aksi verifikasi di Antrian Validasi kini gated per role + alasan dari petugas (`/dinas/antrian`)**:
  - **Gejala:** ketiga tombol aksi (Verifikasi Mismatch / Tandai Kejadian Baru / Tolak Sanggahan) selalu gagal — tanpa login/backend mati muncul "Tidak dapat terhubung ke server", dengan login `admin` muncul "Not enough permissions". Tombol tetap aktif untuk pengunjung biasa sehingga error teknis tampil tanpa penjelasan.
  - **Akar masalah:** `PUT /klaster/{id}/verifikasi` dibatasi `RoleChecker(["verifikator_dinas"])` (`app/routers/klaster.py:27`), sementara basis data pengembangan hanya berisi akun `admin` — sehingga **tidak ada akun pun yang dapat menjalankan alur verifikasi**. `admin` memang tidak berwenang sesuai kontrak.
  - **Perbaikan FE:** (1) `useAuth()` dipakai untuk menyimpan `role`; aksi verifikasi hanya dirender untuk `verifikator_dinas`, selain itu tampil kartu penjelasan yang menyebut peran pengunjung dan why aksi tidak tersedia — tombol tidak lagi menembak request pasti gagal; (2) `alasan` tidak lagi diisi kalimat otomatis, tetapi dari **pilihan cepat** (4 preset: tidak ditemukan saat verifikasi lapangan / laporan duplikat / di luar ruang lingkup / data belum cukup) plus **catatan bebas opsional**, disusun `"preset — catatan"` dan dikirim apa adanya.
  - **Perbaikan backend/data:** script baru `backend/scripts/seed_dinas_accounts.py` (idempotent) membuat akun `verifikator_dinas` & `kepala_dinas`; dicatat di `docs/backend/SETUP.md` §7a.
  - **Verifikasi:** `tsc` 0 error · build sukses · uji Chromium — tamu & `admin` melihat kartu penjelasan tanpa tombol, `verifikator_dinas` mendapat alur penuh (panel alasan, tombol submit nonaktif sampai preset dipilih, catatan digabung) dan `PUT` terkirim `?status=tidak_terverifikasi&alasan=Laporan duplikat dengan klaster lain — Sudah terverifikasi lapangan, kondisi aktual masih baik.`; alasan utuh tersimpan di `GET /klaster/{id}/riwayat`. Data produksi dipulihkan ke `menunggu_verifikasi` 100/100 setelah pengujian.
  - **Deviasi kontrak ditemukan:** `INTERFACES.md` §5 menyebut `422 REASON_REQUIRED` untuk `alasan` kosong, backend sebenarnya membalas `400 VALIDATION_ERROR` dengan pesan "alasan wajib jika status != terverifikasi".

- **Perbaikan: halaman Antrian Validasi (`/dinas/antrian`) gagal dimuat — "Terjadi kendala tak terduga"**:
  - **Gejala:** seluruh panel halaman tertangkap `ErrorBoundary` dengan pesan "Halaman ini gagal dimuat"; tombol *Muat Ulang* tidak menolong karena kondisi salahnya berulang.
  - **Akar masalah (regresi F4.1):** `selectedKlaster` dihitung dengan fallback berantai (`find` → `filteredKlasters[0]` → `daftarKlasterDinasTerisi[0]`) dan tipe-nya diklaim `KlasterIsuDinas` padahal bisa `undefined`. Bagian IIFE di panel kanan langsung membaca `k.kategori`/`k.skor`. Saat data mock masih sinkron, array selalu terisi; setelah migrasi ke API, `useFetch` mengembalikan `[]` selama status `loading` → renderer crash di render pertama. Dulu tertangkap `ErrorBoundary` sehingga sulit dilacak sumbernya.
  - **Perbaikan:** (1) tipe menjadi `KlasterIsuDinas | undefined`; (2) tiga guard sebelum render utama — `loading` ("Memuat antrean klaster…"), `error` (pesan server + tombol Coba Lagi), dan `Belum ada klaster untuk ditinjau`; (3) `detailKlaster` & `riwayatStatus` tidak lagi menembak endpoint dengan id kosong (sebelumnya `GET /klaster/` → 404 sia-sia saat mount); (4) auto-pilih klaster pertama saat daftar tiba, memulihkan perilaku pra-refactor dan membuat panel kanan langsung terisi; (5) penjaga `k?.kategori` di IIFE.
  - **Verifikasi:** `tsc` 0 error · `npm run build` sukses · uji Chromium (Playwright) pada `/dinas/antrian` → 100 kartu klaster ter-render, panel kanan terisi, **0 `pageerror`**; klik kartu memicu `GET /klaster/{id}` + `GET /klaster/{id}/riwayat?page_size=100`; sapu 8 rute (`/`, `/direktori`, `/sekolah/:npsn`, `/klaster/:id`, `/dashboard`, `/dinas/antrian`, `/dinas/peta`, `/dinas/ringkasan`) → 8/8 tanpa `ErrorBoundary`.

- **Tampilan Filter Jenjang & Pill Matriks Dashboard Wilayah (`src/pages/warga/DashboardWilayah.tsx`, `src/components/ui/select.tsx`)**:
  - `SelectTrigger` shadcn: kelas `[&>span]:line-clamp-1` dihapus dan ikon chevron diberi `shrink-0 ml-1.5` sehingga label trigger ("Filter Jenjang" / "Jenjang: <pilihan>") tidak terpotong satu baris.
  - Trigger Filter Jenjang kini `inline-flex whitespace-nowrap` dengan ikon `Filter shrink-0` terpisah dari label, teks tetap satu baris pada lebar sempit.
  - Pill metrik matriks dirapikan jadi angka saja: `"1 Rusak"` → `"1"`, `"-2 Unit"` → `"2"`, `"-1 R.Teori"` → `"1"`.
  - `npm run build` sukses.
- **Gerbang Login Tombol "Mulai Laporkan Temuan" di Beranda (`src/pages/warga/Landing.tsx`)**:
  - Tombol hero **Mulai Laporkan Temuan** sebelumnya selalu `navigate("/sekolah")` tanpa memeriksa sesi, padahal `AuthRequiredModal` sudah ter-mount tetapi tidak pernah dibuka — warga dapat memulai alur pelaporan tanpa masuk akun, tidak sesuai catatan entri "Proteksi & Gerbang Autentikasi Pelaporan" di changelog ini.
  - Kini `handleMulaiLapor` mengecek sesi: belum login → modal *Wajib Masuk / Daftar Akun* terbuka dengan `redirect=/laporan/baru&action=report`; sudah login → langsung diarahkan ke form pelaporan.
  - Audit seluruh titik masuk pelaporan terhadap `FLOWS.md` (Alur Warga node B & G), `PAGE_STATES.md` §A1/A4, serta `INTERFACES.md` `POST /laporan` — Dashboard Wilayah, Detail Sekolah (tombol lapor + sanggah + auto-buka `action=report` setelah login), Riwayat Laporan, rute `/laporan/baru` via `ProtectedRoute`, banner CTA Beranda, dan jalur Registrasi (`redirect` + `action`) sudah benar; hanya tombol hero Beranda yang lupa gerbang.
  - `npm run build` sukses; `/`, `/laporan/baru`, `/sekolah/20532361` → HTTP 200.

---

### Catatan: Halaman yang Masih Pakai Data Demo (F4.1 belum 100%)

Menghapus `src/mocks/` tidak menutup semua sumber data demo.Sapuan seluruh
18 route (Chromium) tidak menemukan crash, tetapi **5 halaman** masih
merender data contoh yang tertanam langsung di JSX — bukan lewat `@/mocks/`:

| Halaman | Data demo | Endpoint yang tersedia |
|---|---|---|
| `src/pages/warga/DashboardWilayah.tsx` | `matriksSekolah` (24 sekolah) + KPI cakupan | `GET /sekolah`, `GET /klaster` |
| `src/pages/warga/RiwayatLaporan.tsx` | kartu laporan contoh tertanam di markup | `GET /laporan/riwayat` |
| `src/pages/dinas/TabelVerifikasi.tsx` | baris verifikasi (SMAN 1 Sukodadi, dll.) | `GET /klaster` |
| `src/pages/dinas/LaporanSkorKbm.tsx` | baris skor KBM & efisiensi | belum ada endpoint (butuh kontrak) |
| `src/pages/dinas/LogAuditPdp.tsx` | `logEntries` | `GET /audit/log` |

Catatan: 4 dari 5 halaman punya endpoint yang sebenarnya; `LaporanSkorKbm`
butuh endpoint baru (skor KBM belum ada di backend) sehingga butuh keputusan
kontrak lebih dulu. Halaman yang sudah bersih: `Landing.tsx`, `Login.tsx`,
`Registrasi.tsx`, `TentangData.tsx`.

### Catatan Deviasi Kontrak & Gap Data (hasil F4.1)

Ditemukan saat mengintegrasikan FE ke backend yang berjalan. Butuh keputusan Aris + Dimas (`GIT_WORKFLOW.md` §3) sebelum ada perubahan kontrak:

| # | Temuan | Impact ke FE | Usulan |
|---|---|---|---|
| 1 | `GET /sekolah` mengirim `penanda_masalah` yang **selalu bernilai `"normal"`**; nilai `aman`/`perlu_perhatian`/`kritis` ada di INTERFACES §2 tapi backend belum menghitungnya | Filter "Status Integritas" di Direktori & badge kartu sekolah tidak akan pernah menyaring | Backend menghitung `penanda_masalah` (atau FE menyembunyikan filter tersebut) |
| 2 | `rasio_guru_siswa` selalu `null`; `jumlah_pd`/`jumlah_ptk`/`jumlah_rombel` = 0; `utilitas_kapasitas_belajar` = 0.0; `jumlah_isu_aktif` = 0; `klaster_isu` = `[]` | Sesuai AGENTS.md §Scope FINAL, FE **tidak** merender angka ini sebagai data valid | FE sudah menyesuaikan tampilan (angka tersebut disembunyikan); backend mengisi bila memungkinkan |
| 3 | `GET /dashboard/wilayah` hanya mengizinkan `verifikator_dinas` & `kepala_dinas` — **`admin` mendapat 403** | `admin` tidak bisa membuka ringkasan wilayah | Tambahkan `admin` ke RBAC endpoint tersebut |
| 4 | Kolom `sekolah.lintang` & `sekolah.bujur` **NULL untuk 62/62 sekolah**, dan tidak diekspos API | Peta Sebaran (warga & dinas) tidak bisa menampilkan pin sekolah | Re-scraping koordinat dari Dapodik + expose di `GET /sekolah` |
| 5 | Tidak ada endpoint riwayat isu **per bulan** | Grafik tren bulanan & kolom tren di laporan cetak → empty state | Endpoint agregat bulanan, atau scraper turun permanen |
| 6 | `GET /klaster` tidak punya parameter `search` | Pencarian klaster di `DinasLayout` dicocokkan di sisi klien (100 klaster, masih wajar) | Tambahkan `?search=` bila data tumbuh |
| 7 | Backend tidak mengirim nomor tiket, kecamatan, email sekolah, tanggal audit, baseline per fasilitas, TF-IDF keywords, foto, atau jejak audit klaster | Field tersebut tampil "Belum tersedia" di Antrian Validasi & Detail Sekolah | Putuskan: tambah field, atau hapus kolom UI tsb |
| 8 | `POST /auth/login` menerima **email + password** (INTERFACES §1), sedangkan form login FE sebelumnya menanyakan **NIK** | Form login diubah ke email | Kalau NIK harus jadi identitas login, perlu kontrak baru (login by NIK) |
| 9 | `POST /laporan` tidak lagi menerima field `kategori` (kolom di-drop di Fase A) | Field `kategori` dihapus dari form & mock | Keduanya sudah sinkron |

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
