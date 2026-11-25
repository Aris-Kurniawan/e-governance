import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { CoachMarkIcon } from "@/components/composite/coachMarksIcons"
import {
  X,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Sparkles,
} from "@/components/ui/iconify-icons"
import { Button } from "@/components/ui/button"

export interface CoachMarkStep {
  id: string
  targetSelector: string
  fallbackSelector?: string
  badge: string
  title: string
  description: string
  highlights?: string[]
  iconName: string
  iconColor: string
  iconBg: string
  route?: string
  preferredPlacement?: "bottom" | "top" | "right" | "left" | "auto"
}

export interface PageTourConfig {
  key: string
  name: string
  storageKey: string
  steps: CoachMarkStep[]
}

export const PAGE_TOURS: Record<string, PageTourConfig> = {
  // ── 1. Beranda (Home Overview Tour) ──────────────────────────
  home: {
    key: "home",
    name: "Beranda SIMAKIS",
    storageKey: "simakis_tour_home_completed",
    steps: [
      {
        id: "step-wilayah",
        targetSelector: '[data-coachmark="nav-wilayah"]',
        fallbackSelector: '[data-coachmark="hero-peta-btn"]',
        badge: "Fitur 1 dari 5 · Spasial & Transparansi",
        title: "Dashboard Wilayah & Peta Sebaran",
        description:
          "Pantau sebaran kondisi 62 sekolah di Kecamatan Lamongan secara interaktif. Anda dapat melihat indeks integritas sarpras, tingkat kerusakan fasilitas, dan peringkat prioritas perbaikan.",
        highlights: [
          "Peta interaktif sebaran sekolah se-Kecamatan Lamongan",
          "Skor integritas sarpras per sekolah dari audit dan laporan",
          "Filter prioritas darurat, waspada, hingga normal",
        ],
        iconName: "solar:map-point-wave-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        route: "/laporan/wilayah",
        preferredPlacement: "bottom",
      },
      {
        id: "step-klaster",
        targetSelector: '[data-coachmark="nav-klaster"]',
        badge: "Fitur 2 dari 5 · Otomatisasi AI",
        title: "Analisis Klaster Isu Berbasis AI",
        description:
          "SIMAKIS mengelompokkan laporan warga secara otomatis menggunakan kecerdasan buatan (Machine Learning). Sistem mendeteksi pola masalah fasilitas fisik yang serupa di lapangan.",
        highlights: [
          "Pengelompokan otomatis topik masalah (atap bocor, sanitasi, lab)",
          "Peringkat urgensi penanganan per klaster masalah",
          "Transparansi data tanpa bias laporan tunggal",
        ],
        iconName: "solar:layers-minimalistic-bold-duotone",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50/90 border-indigo-200/80 ring-2 ring-indigo-100",
        route: "/klaster",
        preferredPlacement: "bottom",
      },
      {
        id: "step-sekolah",
        targetSelector: '[data-coachmark="nav-sekolah"]',
        badge: "Fitur 3 dari 5 · Database Sekolah",
        title: "Direktori & Detail Fasilitas Sekolah",
        description:
          "Cari profil spesifik sekolah untuk memeriksa kondisi sarpras resmi Dapodik, status ruang kelas rusak, fasilitas sanitasi, dan riwayat laporan dari warga sekitar.",
        highlights: [
          "Pencarian cepat 62 sekolah jenjang SD/SMP Lamongan",
          "Detail perbandingan data Dapodik vs fakta laporan warga",
          "Katalog foto audit kondisi fisik sekolah terkini",
        ],
        iconName: "solar:buildings-3-bold-duotone",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50/90 border-emerald-200/80 ring-2 ring-emerald-100",
        route: "/sekolah",
        preferredPlacement: "bottom",
      },
      {
        id: "step-lapor",
        targetSelector: '[data-coachmark="action-laporan"]',
        fallbackSelector: '[data-coachmark="hero-lapor-btn"]',
        badge: "Fitur 4 dari 5 · Partisipasi Warga",
        title: "Kirim Laporan Kerusakan Fasilitas",
        description:
          "Temukan fasilitas sekolah yang rusak atau membahayakan siswa? Laporkan langsung dengan mengunggah foto bukti, memilih kategori, dan menentukan titik koordinat sekolah.",
        highlights: [
          "Unggah bukti foto kerusakan langsung dari perangkat",
          "Privasi aman dengan enkripsi data identitas warga",
          "Laporan diteruskan langsung ke antrean verifikasi dinas",
        ],
        iconName: "solar:clipboard-add-bold-duotone",
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50/90 border-amber-200/80 ring-2 ring-amber-100",
        route: "/laporan/baru",
        preferredPlacement: "auto",
      },
      {
        id: "step-riwayat",
        targetSelector: '[data-coachmark="nav-riwayat"]',
        fallbackSelector: '[data-coachmark="user-menu"]',
        badge: "Fitur 5 dari 5 · Kawal & Dukung",
        title: "Riwayat Laporan & Dukungan Suara",
        description:
          "Pantau perkembangan tindak lanjut laporan yang Anda ajukan, serta berikan dukungan suara (vote) pada laporan warga lain untuk menaikkan prioritas penanganannya.",
        highlights: [
          "Status real-time: Terkirim → Terverifikasi → Ditindaklanjuti",
          "Dukung laporan darurat di lingkungan Anda lewat fitur upvote",
          "Transparansi catatan perbaikan dari Dinas Pendidikan",
        ],
        iconName: "solar:check-circle-bold-duotone",
        iconColor: "text-sky-600",
        iconBg: "bg-sky-50/90 border-sky-200/80 ring-2 ring-sky-100",
        route: "/laporan/riwayat",
        preferredPlacement: "bottom",
      },
    ],
  },

  // ── 2. Dashboard Wilayah (/laporan/wilayah) ───────────────────
  wilayah: {
    key: "wilayah",
    name: "Dashboard Wilayah",
    storageKey: "simakis_tour_wilayah_completed",
    steps: [
      {
        id: "step-wilayah-kpi",
        targetSelector: '[data-coachmark="wilayah-kpi"]',
        badge: "Fitur 1 dari 3 · Ringkasan Sarpras",
        title: "Indikator Kondisi Sarpras Wilayah",
        description:
          "Ringkasan statistik data pangkalan: mencakup 62 sekolah di Kecamatan Lamongan, jumlah sekolah yang memiliki klaster masalah aktif, dan persentase laporan yang telah diverifikasi dinas.",
        highlights: [
          "Cakupan total sekolah terdata di Dapodikdasmen",
          "Jumlah sekolah yang terdeteksi memiliki isu fasilitas",
          "Tingkat verifikasi faktual lapangan oleh tim pengawas",
        ],
        iconName: "solar:chart-2-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-wilayah-peta",
        targetSelector: '[data-coachmark="wilayah-peta"]',
        badge: "Fitur 2 dari 3 · Peta Spasial",
        title: "Peta Interaktif Sebaran Sekolah",
        description:
          "Peta spasial berkoordinat nyata. Pin warna menandakan tingkat urgensi kerusakan fisik (merah = darurat, kuning = waspada, hijau = normal). Klik pada pin sekolah mana pun untuk melihat skor dan statusnya.",
        highlights: [
          "Koordinat presisi EPSG:4326 titik sekolah",
          "Warna visual menandakan ambang prioritas kerusakan",
          "Klik pin untuk membuka ringkasan dan form laporan",
        ],
        iconName: "solar:map-point-wave-bold-duotone",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50/90 border-indigo-200/80 ring-2 ring-indigo-100",
        preferredPlacement: "auto",
      },
      {
        id: "step-wilayah-tabel",
        targetSelector: '[data-coachmark="wilayah-tabel"]',
        badge: "Fitur 3 dari 3 · Prioritas & Vote",
        title: "Peringkat Prioritas & Partisipasi Suara",
        description:
          "Daftar klaster isu diurutkan dari skor urgensi tertinggi. Anda dapat memberikan dukungan suara (vote) untuk mempercepat alokasi perbaikan sarpras oleh Dinas Pendidikan.",
        highlights: [
          "Daftar transparan berbasis formula pembobotan resmi",
          "Berikan 1 vote per akun warga terdaftar",
          "Paginasi 10 klaster per halaman dengan filter",
        ],
        iconName: "solar:ranking-bold-duotone",
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50/90 border-amber-200/80 ring-2 ring-amber-100",
        preferredPlacement: "auto",
      },
    ],
  },

  // ── 3. Klaster Isu (/klaster) ────────────────────────────────
  klaster: {
    key: "klaster",
    name: "Klaster Isu",
    storageKey: "simakis_tour_klaster_completed",
    steps: [
      {
        id: "step-klaster-header",
        targetSelector: '[data-coachmark="klaster-header"]',
        badge: "Fitur 1 dari 3 · Pengelompokan AI",
        title: "Analisis Klaster Isu Berbasis AI",
        description:
          "SIMAKIS menggunakan kecerdasan buatan (Machine Learning) untuk mendeteksi kesamaan kata dan topik dalam laporan warga, lalu menggabungkannya ke dalam satu klaster secara otomatis tanpa manipulasi data.",
        highlights: [
          "Pengelompokan otomatis tanpa rekayasa manual",
          "Menghubungkan laporan serupa dari berbagai warga",
          "Skor gabungan tingkat keparahan masalah",
        ],
        iconName: "solar:layers-minimalistic-bold-duotone",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50/90 border-indigo-200/80 ring-2 ring-indigo-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-klaster-filter",
        targetSelector: '[data-coachmark="klaster-filter"]',
        badge: "Fitur 2 dari 3 · Filter Fasilitas",
        title: "Filter Berdasarkan Kategori Fasilitas",
        description:
          "Pilah klaster isu berdasarkan kategori fasilitas yang ingin Anda pantau, seperti Ruang Kelas, Sanitasi/Toilet, Perpustakaan, atau Laboratorium.",
        highlights: [
          "Penyaringan instan kategori sarpras utama",
          "Pencarian kata kunci topik kerusakan fasilitas",
          "Pilihan urutan prioritas darurat dan jumlah sekolah",
        ],
        iconName: "solar:filter-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-klaster-list",
        targetSelector: '[data-coachmark="klaster-list"]',
        badge: "Fitur 3 dari 3 · Partisipasi Warga",
        title: "Daftar Klaster & Dukungan Partisipatif",
        description:
          "Setiap kartu menampilkan jumlah sekolah terdampak, skor urgensi gabungan, status penanganan dinas, serta tombol dukungan suara (vote) warga.",
        highlights: [
          "Ringkasan jumlah laporan & sekolah terdampak",
          "Tombol vote untuk menaikkan prioritas penanganan",
          "Akses ke detail lengkap foto dan riwayat isu",
        ],
        iconName: "solar:check-circle-bold-duotone",
        iconColor: "text-sky-600",
        iconBg: "bg-sky-50/90 border-sky-200/80 ring-2 ring-sky-100",
        preferredPlacement: "auto",
      },
    ],
  },

  // ── 4. Direktori Sekolah (/sekolah) ──────────────────────────
  sekolah: {
    key: "sekolah",
    name: "Direktori Sekolah",
    storageKey: "simakis_tour_sekolah_completed",
    steps: [
      {
        id: "step-direktori-search",
        targetSelector: '[data-coachmark="direktori-search"]',
        badge: "Fitur 1 dari 2 · Pencarian Lembaga",
        title: "Pencarian Cepat & Filter Jenjang",
        description:
          "Temukan sekolah dengan mengetikkan nama sekolah atau nomor NPSN, serta filter berdasarkan jenjang pendidikan (SD / SMP / SMA / SMK) dan status integritas data.",
        highlights: [
          "Cari berdasarkan nama atau 8 digit NPSN",
          "Filter jenjang pendidikan SD, SMP, SMA/SMK",
          "Sinkronisasi langsung dengan pangkalan Dapodik",
        ],
        iconName: "solar:magnifer-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-direktori-list",
        targetSelector: '[data-coachmark="direktori-list"]',
        badge: "Fitur 2 dari 2 · Detail & Lapor",
        title: "Katalog Profil & Akses Lapor Sekolah",
        description:
          "Setiap kartu sekolah menampilkan ringkasan isu aktif, selisih data Dapodik, serta tombol cepat untuk melihat baseline atau langsung melaporkan kerusakan fasilitas sekolah terkait.",
        highlights: [
          "Akses kartu detail sarpras per sekolah",
          "Tombol + Lapor langsung tertaut ke NPSN sekolah",
          "Riwayat laporan warga khusus sekolah terkait",
        ],
        iconName: "solar:buildings-3-bold-duotone",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50/90 border-indigo-200/80 ring-2 ring-indigo-100",
        preferredPlacement: "auto",
      },
    ],
  },

  // ── 5. Riwayat Laporan (/laporan/riwayat) ─────────────────────
  riwayat: {
    key: "riwayat",
    name: "Riwayat Laporan",
    storageKey: "simakis_tour_riwayat_completed",
    steps: [
      {
        id: "step-riwayat-mode",
        targetSelector: '[data-coachmark="riwayat-mode-switcher"]',
        badge: "Fitur 1 dari 3 · Pilihan Mode",
        title: "Beralih Registri Publik & Laporan Saya",
        description:
          "Pilih 'Laporan Publik' untuk memantau seluruh isu sarpras terbuka se-Kecamatan Lamongan, atau 'Laporan Pribadi' untuk memantau aduan yang diajukan oleh akun Anda.",
        highlights: [
          "Mode Registri Publik: transparansi seluruh warga",
          "Mode Laporan Pribadi: kelola riwayat aduan sendiri",
          "Perlindungan privasi akun dan data pelapor",
        ],
        iconName: "solar:users-group-two-rounded-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-riwayat-filter",
        targetSelector: '[data-coachmark="riwayat-filter"]',
        badge: "Fitur 2 dari 3 · Filter Tahapan",
        title: "Filter Tahapan Tindak Lanjut Dinas",
        description:
          "Lacak perkembangan laporan berdasarkan tahapannya: Menunggu Verifikasi, Terverifikasi, Sedang Ditindaklanjuti, atau Selesai Diperbaiki.",
        highlights: [
          "Status alur audit transparan dari dinas",
          "Filter jenjang dan pencarian sekolah",
          "Indikator status verifikasi lapangan",
        ],
        iconName: "solar:tuning-square-2-bold-duotone",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50/90 border-indigo-200/80 ring-2 ring-indigo-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-riwayat-list",
        targetSelector: '[data-coachmark="riwayat-list"]',
        badge: "Fitur 3 dari 3 · Kawal & Dukung",
        title: "Kawal Laporan & Berikan Dukungan (Vote)",
        description:
          "Setiap aduan dilengkapi bukti foto, kategori kerusakan, catatan hasil audit dinas, serta tombol dukungan suara warga untuk mempercepat realisasi penanganan.",
        highlights: [
          "Foto bukti lapangan & keterangan pelapor",
          "Catatan tindak lanjut tim pengawas dinas",
          "Tombol vote warga untuk menaikkan urgensi",
        ],
        iconName: "solar:check-circle-bold-duotone",
        iconColor: "text-sky-600",
        iconBg: "bg-sky-50/90 border-sky-200/80 ring-2 ring-sky-100",
        preferredPlacement: "auto",
      },
    ],
  },

  // ── 6. Tentang Data (/tentang) ────────────────────────────────
  tentang: {
    key: "tentang",
    name: "Tentang Data",
    storageKey: "simakis_tour_tentang_completed",
    steps: [
      {
        id: "step-tentang-sumber",
        targetSelector: '[data-coachmark="tentang-sumber"]',
        badge: "Fitur 1 dari 3 · Sumber Data",
        title: "Integrasi Data Dapodik & Partisipasi Warga",
        description:
          "SIMAKIS menggabungkan data resmi semesteran dari Dapodik Kemendikdasmen dengan laporan faktual real-time warga untuk potret sarpras yang adil.",
        highlights: [
          "Data baseline resmi institusi pemerintah",
          "Laporan faktual langsung dari lapangan",
          "Pencegahan bias data sepihak",
        ],
        iconName: "solar:database-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-tentang-pilar",
        targetSelector: '[data-coachmark="tentang-pilar"]',
        badge: "Fitur 2 dari 3 · Privasi & UU PDP",
        title: "4 Prinsip Audit & Pelindungan Data Pribadi",
        description:
          "Keamanan warga terjamin: NIK dan identitas pelapor disanitasi dan tidak dibuka ke publik sesuai amanat UU PDP No. 27/2022.",
        highlights: [
          "Enkripsi dan sanitasi identitas warga",
          "Kepatuhan penuh pada UU PDP No. 27/2022",
          "Audit partisipatif yang aman bagi pelapor",
        ],
        iconName: "solar:shield-check-bold-duotone",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50/90 border-emerald-200/80 ring-2 ring-emerald-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-tentang-timeline",
        targetSelector: '[data-coachmark="tentang-timeline"]',
        badge: "Fitur 3 dari 3 · Alur Siklus",
        title: "Tahapan Siklus Audit Berkelanjutan",
        description:
          "Alur 4 tahap: Pelaporan Warga → Validasi AI & Pengelompokan → Verifikasi Lapangan oleh Dinas → Tindak Lanjut Perbaikan Sarpras Sekolah.",
        highlights: [
          "Alur kerja 4 tahap yang terukur",
          "Verifikasi komite sekolah & pengawas",
          "Siklus audit berkelanjutan untuk Lamongan",
        ],
        iconName: "solar:history-bold-duotone",
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50/90 border-amber-200/80 ring-2 ring-amber-100",
        preferredPlacement: "auto",
      },
    ],
  },

  // ── 7. Form Buat Laporan (/laporan/baru) ──────────────────────
  lapor: {
    key: "lapor",
    name: "Buat Laporan Sarpras",
    storageKey: "simakis_tour_lapor_completed",
    steps: [
      {
        id: "step-lapor-sekolah",
        targetSelector: '[data-coachmark="lapor-sekolah"]',
        badge: "Langkah 1 dari 3 · Pilih Sekolah",
        title: "Pilih Sekolah Tujuan Audit",
        description:
          "Pilih nama sekolah yang fasilitasnya ingin Anda laporkan. Sistem akan otomatis menampilkan ringkasan baseline Dapodik sekolah tersebut sebagai pembanding.",
        highlights: [
          "Tersedia 62 sekolah terdaftar Kec. Lamongan",
          "Data baseline Dapodik tampil otomatis setelah sekolah dipilih",
          "Bisa pilih cepat ruangan/fasilitas dari daftar Dapodik",
        ],
        iconName: "solar:buildings-3-bold-duotone",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
        preferredPlacement: "bottom",
      },
      {
        id: "step-lapor-temuan",
        targetSelector: '[data-coachmark="lapor-temuan"]',
        badge: "Langkah 2 dari 3 · Detail & Bukti",
        title: "Jelaskan Temuan & Unggah Foto Bukti",
        description:
          "Pilih tipe temuan, tuliskan deskripsi kondisi fisik secara jelas, dan lampirkan foto lapangan (maksimal 2 MB) untuk memperkuat proses verifikasi Dinas.",
        highlights: [
          "Tipe temuan: Ketidaksesuaian Data atau Kerusakan Baru",
          "Deskripsi faktual membantu pengelompokan klaster AI",
          "Metadata lokasi EXIF foto dibersihkan otomatis demi privasi",
        ],
        iconName: "solar:clipboard-add-bold-duotone",
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50/90 border-amber-200/80 ring-2 ring-amber-100",
        preferredPlacement: "auto",
      },
      {
        id: "step-lapor-submit",
        targetSelector: '[data-coachmark="lapor-submit"]',
        badge: "Langkah 3 dari 3 · Kirim & Pantau",
        title: "Kirim Laporan ke Antrean Verifikasi",
        description:
          "Setelah formulir lengkap, tekan Kirim Laporan. Anda akan mendapatkan nomor tracking untuk memantau status verifikasi hingga tindak lanjut perbaikan.",
        highlights: [
          "Laporan langsung masuk ke antrean tim verifikator Dinas",
          "Pantau progres secara transparan di Riwayat Laporan",
          "Identitas pelapor dilindungi sesuai UU PDP",
        ],
        iconName: "solar:check-circle-bold-duotone",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50/90 border-emerald-200/80 ring-2 ring-emerald-100",
        preferredPlacement: "top",
      },
    ],
  },
}

const MOBILE_HOME_STEPS: CoachMarkStep[] = [
  {
    id: "step-mobile-menu",
    targetSelector: '[data-coachmark="mobile-menu-btn"]',
    badge: "Langkah 1 dari 3 · Navigasi Mobile",
    title: "Buka Menu Navigasi Portal",
    description:
      "Tekan tombol garis tiga (☰) di pojok kanan atas untuk melihat dan membuka seluruh halaman: Dashboard Wilayah, Klaster Isu, Direktori Sekolah, Riwayat Laporan, serta Tentang Data.",
    highlights: [
      "Akses cepat ke semua halaman informasi sarpras",
      "Berisi tombol Buat Laporan dan pengaturan akun",
    ],
    iconName: "solar:layers-minimalistic-bold-duotone",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50/90 border-blue-200/80 ring-2 ring-blue-100",
    preferredPlacement: "bottom",
  },
  {
    id: "step-mobile-peta",
    targetSelector: '[data-coachmark="hero-peta-btn"]',
    badge: "Langkah 2 dari 3 · Pantau Wilayah",
    title: "Jelajahi Peta & Data Sekolah",
    description:
      "Buka Dashboard Wilayah untuk melihat peta sebaran 62 sekolah Kec. Lamongan, skor kondisi fasilitas, dan daftar isu prioritas.",
    highlights: [
      "Peta interaktif kondisi sarpras sekolah",
      "Daftar klaster isu & dukungan suara warga",
    ],
    iconName: "solar:map-point-wave-bold-duotone",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50/90 border-indigo-200/80 ring-2 ring-indigo-100",
    route: "/laporan/wilayah",
    preferredPlacement: "auto",
  },
  {
    id: "step-mobile-lapor",
    targetSelector: '[data-coachmark="hero-lapor-btn"]',
    badge: "Langkah 3 dari 3 · Partisipasi Warga",
    title: "Kirim Laporan Kerusakan",
    description:
      "Temukan ruang kelas, toilet, atau fasilitas sekolah yang rusak? Tekan tombol ini untuk melaporkan kondisi lapangan lengkap dengan foto bukti.",
    highlights: [
      "Unggah bukti foto langsung dari ponsel",
      "Identitas pelapor dilindungi sesuai UU PDP",
    ],
    iconName: "solar:clipboard-add-bold-duotone",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50/90 border-amber-200/80 ring-2 ring-amber-100",
    route: "/laporan/baru",
    preferredPlacement: "auto",
  },
]

function getTourForPath(pathname: string): PageTourConfig | null {
  if (pathname === "/") return PAGE_TOURS.home
  if (pathname === "/laporan/wilayah") return PAGE_TOURS.wilayah
  if (pathname === "/klaster") return PAGE_TOURS.klaster
  if (pathname === "/sekolah") return PAGE_TOURS.sekolah
  if (pathname === "/laporan/riwayat" || pathname === "/laporan/publik") return PAGE_TOURS.riwayat
  if (pathname === "/tentang") return PAGE_TOURS.tentang
  if (pathname === "/laporan/baru") return PAGE_TOURS.lapor
  return null
}

export default function CoachMarksTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const [targetFound, setTargetFound] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  )

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 640)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const activeTour = useMemo(() => getTourForPath(location.pathname), [location.pathname])
  const steps = useMemo(() => {
    if (!activeTour) return []
    if (isMobileViewport && activeTour.key === "home") return MOBILE_HOME_STEPS
    return activeTour.steps
  }, [activeTour, isMobileViewport])
  const storageKey = activeTour?.storageKey ?? ""

  // Otomatis buka tur jika berasal dari "Buka Halaman Ini" atau kunjungan pertama kali di Beranda ("/")
  useEffect(() => {
    if (!activeTour) {
      setIsOpen(false)
      return
    }

    const pendingRoute = sessionStorage.getItem("simakis_pending_page_tour")
    if (pendingRoute && pendingRoute === location.pathname) {
      sessionStorage.removeItem("simakis_pending_page_tour")
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "instant" })
        setCurrentIndex(0)
        setIsOpen(true)
      }, 450)
      return () => clearTimeout(timer)
    }

    if (location.pathname !== "/") {
      setIsOpen(false)
      return
    }

    const onboardingDone = localStorage.getItem("simakis_warga_onboarding_completed")
    const homeTourDone = localStorage.getItem(activeTour.storageKey)
    if (!onboardingDone && !homeTourDone) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "instant" })
        setCurrentIndex(0)
        setIsOpen(true)
      }, 650)
      return () => clearTimeout(timer)
    }
    setIsOpen(false)
  }, [activeTour, location.pathname])

  // Listener event global agar bisa dipicu kapan saja pada halaman yang memiliki tur
  useEffect(() => {
    const handleOpen = () => {
      if (!activeTour) return
      window.scrollTo({ top: 0, behavior: "instant" })
      setCurrentIndex(0)
      setIsOpen(true)
    }
    window.addEventListener("open-simakis-coachmarks", handleOpen)
    return () => window.removeEventListener("open-simakis-coachmarks", handleOpen)
  }, [activeTour])

  // ── Kunci Scroll Halaman saat Coach Marks Aktif ─────────────────────
  useEffect(() => {
    if (!isOpen) return

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    const preventScroll = (e: Event) => {
      if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) {
        return
      }
      e.preventDefault()
    }

    window.addEventListener("wheel", preventScroll, { passive: false })
    window.addEventListener("touchmove", preventScroll, { passive: false })

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      window.removeEventListener("wheel", preventScroll)
      window.removeEventListener("touchmove", preventScroll)
    }
  }, [isOpen])

  const currentStep = useMemo(() => steps[currentIndex] || steps[0], [steps, currentIndex])

  // Cari posisi elemen target di viewport
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return

    let element: HTMLElement | null = document.querySelector(currentStep.targetSelector)

    if ((!element || element.offsetParent === null) && currentStep.fallbackSelector) {
      element = document.querySelector(currentStep.fallbackSelector)
    }

    if (!element || element.offsetParent === null) {
      const mobileNav = document.querySelector('[data-coachmark="mobile-menu-btn"]') as HTMLElement | null
      if (mobileNav && mobileNav.offsetParent !== null) {
        element = mobileNav
      }
    }

    if (element && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
        setTargetFound(true)
        return
      }
    }

    setTargetRect(null)
    setTargetFound(false)
  }, [isOpen, currentStep])

  // Scroll target ke pandangan bila di luar layar
  useEffect(() => {
    if (!isOpen || !currentStep) return

    let element: HTMLElement | null = document.querySelector(currentStep.targetSelector)
    if ((!element || element.offsetParent === null) && currentStep.fallbackSelector) {
      element = document.querySelector(currentStep.fallbackSelector)
    }

    if (element && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect()
      if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }

    const timer = setTimeout(updateTargetPosition, 150)
    return () => clearTimeout(timer)
  }, [isOpen, currentIndex, currentStep, updateTargetPosition])

  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      window.requestAnimationFrame(updateTargetPosition)
    }

    window.addEventListener("resize", handleScrollOrResize)
    window.addEventListener("scroll", handleScrollOrResize, true)

    updateTargetPosition()

    return () => {
      window.removeEventListener("resize", handleScrollOrResize)
      window.removeEventListener("scroll", handleScrollOrResize, true)
    }
  }, [isOpen, updateTargetPosition])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentIndex])

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    if (storageKey) localStorage.setItem(storageKey, "true")
    localStorage.setItem("simakis_warga_onboarding_completed", "true")
  }

  const handleComplete = () => {
    setIsOpen(false)
    if (storageKey) localStorage.setItem(storageKey, "true")
    localStorage.setItem("simakis_warga_onboarding_completed", "true")
  }

  if (!activeTour) return null

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "instant" })
          setCurrentIndex(0)
          setIsOpen(true)
        }}
        title={`Buka panduan fitur ${activeTour.name}`}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-blue-200/90 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 text-[13px] sm:text-sm font-bold text-[#0B3052] shadow-lg hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
      >
        <Sparkles className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-blue-600 shrink-0" />
        <span className="hidden sm:inline">Panduan {activeTour.name}</span>
        <span className="sm:hidden">Panduan</span>
      </button>
    )
  }

  // Parameter spotlight dengan padding
  const padding = 8
  const spotlightX = targetRect ? Math.max(0, targetRect.left - padding) : 0
  const spotlightY = targetRect ? Math.max(0, targetRect.top - padding) : 0
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0

  // ── Perhitungan Posisi Pop-Up Pintar Agar Tidak Menghalangi Target ─────────
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200
  const vh = typeof window !== "undefined" ? window.innerHeight : 800

  const tooltipWidth = typeof window !== "undefined" ? Math.min(350, window.innerWidth - 24) : 340
  const tooltipEstimatedHeight = tooltipRef.current?.offsetHeight || 240

  let tooltipTop = 0
  let tooltipLeft = 0
  let activePlacement: "bottom" | "top" | "right" | "left" | "center" = "center"
  let arrowOffset = "50%"

  if (targetRect && targetFound) {
    const spaceTop = targetRect.top - padding
    const spaceBottom = vh - (targetRect.top + targetRect.height + padding)
    const spaceRight = vw - (targetRect.left + targetRect.width + padding)
    const spaceLeft = targetRect.left - padding

    let preferred = currentStep.preferredPlacement || "auto"

    if (preferred === "auto") {
      if (targetRect.top < 120 && spaceBottom >= tooltipEstimatedHeight + 16) {
        preferred = "bottom"
      } else if (spaceRight >= tooltipWidth + 24) {
        preferred = "right"
      } else if (spaceBottom >= tooltipEstimatedHeight + 16) {
        preferred = "bottom"
      } else if (spaceTop >= tooltipEstimatedHeight + 16) {
        preferred = "top"
      } else {
        preferred = spaceBottom >= spaceTop ? "bottom" : "top"
      }
    }

    if (preferred === "right" && spaceRight < tooltipWidth + 16) {
      preferred = spaceBottom >= tooltipEstimatedHeight + 16 ? "bottom" : (spaceTop >= tooltipEstimatedHeight + 16 ? "top" : "bottom")
    } else if (preferred === "left" && spaceLeft < tooltipWidth + 16) {
      preferred = spaceBottom >= tooltipEstimatedHeight + 16 ? "bottom" : (spaceTop >= tooltipEstimatedHeight + 16 ? "top" : "bottom")
    } else if (preferred === "bottom" && spaceBottom < tooltipEstimatedHeight + 16 && spaceTop >= tooltipEstimatedHeight + 16) {
      preferred = "top"
    } else if (preferred === "top" && spaceTop < tooltipEstimatedHeight + 16 && spaceBottom >= tooltipEstimatedHeight + 16) {
      preferred = "bottom"
    }

    activePlacement = preferred as "bottom" | "top" | "right" | "left"

    if (activePlacement === "right") {
      tooltipLeft = targetRect.left + targetRect.width + padding + 14
      const targetCenterY = targetRect.top + targetRect.height / 2
      tooltipTop = Math.max(12, Math.min(vh - tooltipEstimatedHeight - 12, targetCenterY - 100))
      arrowOffset = `${Math.max(20, Math.min(tooltipEstimatedHeight - 40, targetCenterY - tooltipTop))}px`
    } else if (activePlacement === "left") {
      tooltipLeft = Math.max(12, targetRect.left - padding - tooltipWidth - 14)
      const targetCenterY = targetRect.top + targetRect.height / 2
      tooltipTop = Math.max(12, Math.min(vh - tooltipEstimatedHeight - 12, targetCenterY - 100))
      arrowOffset = `${Math.max(20, Math.min(tooltipEstimatedHeight - 40, targetCenterY - tooltipTop))}px`
    } else if (activePlacement === "top") {
      tooltipTop = Math.max(12, targetRect.top - padding - tooltipEstimatedHeight - 12)
      const targetCenterX = targetRect.left + targetRect.width / 2
      tooltipLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, targetCenterX - tooltipWidth / 2))
      arrowOffset = `${Math.max(24, Math.min(tooltipWidth - 24, targetCenterX - tooltipLeft))}px`
    } else {
      const idealBottomTop = targetRect.top + targetRect.height + padding + 12
      tooltipTop = Math.max(12, Math.min(vh - tooltipEstimatedHeight - 12, idealBottomTop))
      const targetCenterX = targetRect.left + targetRect.width / 2
      tooltipLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, targetCenterX - tooltipWidth / 2))
      arrowOffset = `${Math.max(24, Math.min(tooltipWidth - 24, targetCenterX - tooltipLeft))}px`
    }
  } else {
    tooltipTop = typeof window !== "undefined" ? Math.max(80, window.innerHeight / 2 - 140) : 100
    tooltipLeft = typeof window !== "undefined" ? Math.max(12, (window.innerWidth - tooltipWidth) / 2) : 20
    activePlacement = "center"
  }

  const progressPercent = ((currentIndex + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden select-none">
      {/* ── 1. SVG Cutout Mask (Spotlight Efek) ── */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        onClick={handleNext}
        style={{ cursor: "pointer" }}
      >
        <title>Klik di mana saja untuk lanjut ke fitur berikutnya</title>
        <defs>
          <mask id="simakis-coachmarks-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && targetFound && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx="14"
                ry="14"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(11, 48, 82, 0.72)"
          mask="url(#simakis-coachmarks-mask)"
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* ── 2. Pulsing Glow Ring di sekeliling Target ── */}
      {targetRect && targetFound && (
        <div
          style={{
            top: spotlightY,
            left: spotlightX,
            width: spotlightW,
            height: spotlightH,
          }}
          className="fixed pointer-events-none z-[9991] rounded-2xl ring-4 ring-blue-400/90 shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 ease-out animate-pulse"
        />
      )}

      {/* ── 3. Tooltip Card Berpemandu ── */}
      <div
        ref={tooltipRef}
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
        className="fixed z-[9995] bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-300 ease-out animate-in fade-in zoom-in-95 pointer-events-auto flex flex-col max-h-[calc(100dvh-24px)]"
      >
        {/* Progress Bar di sisi atas */}
        <div className="h-1 sm:h-1.5 w-full bg-slate-100 relative overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Panah Indikator menunjuk ke target secara presisi */}
        {targetRect && targetFound && activePlacement !== "center" && (
          <div
            style={
              activePlacement === "bottom"
                ? { left: arrowOffset, top: "-7px" }
                : activePlacement === "top"
                  ? { left: arrowOffset, bottom: "-7px" }
                  : activePlacement === "right"
                    ? { top: arrowOffset, left: "-7px" }
                    : { top: arrowOffset, right: "-7px" }
            }
            className={`absolute w-3.5 h-3.5 bg-white border-slate-200/90 transform rotate-45 z-10 ${activePlacement === "bottom"
              ? "-translate-x-1/2 border-t border-l"
              : activePlacement === "top"
                ? "-translate-x-1/2 border-b border-r"
                : activePlacement === "right"
                  ? "-translate-y-1/2 border-b border-l"
                  : "-translate-y-1/2 border-t border-r"
              }`}
          />
        )}

        {/* Content Card Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto max-h-[calc(100dvh-100px)] sm:max-h-none relative">
          {/* Tombol Tutup X (posisi absolute di pojok kanan atas agar hemat tempat) */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup petunjuk tur"
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer z-10"
            title="Lewati dan tutup petunjuk (Esc)"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Judul & Ikon Fitur */}
          <div className="flex items-start gap-2.5 sm:gap-3 pr-7">
            <div
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${currentStep.iconBg}`}
            >
              <CoachMarkIcon icon={currentStep.iconName} className={`w-4 h-4 sm:w-5 sm:h-5 ${currentStep.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-[11px] font-semibold text-blue-600 mb-0.5">
                Langkah {currentIndex + 1} dari {steps.length}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {currentStep.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1 line-clamp-3">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Poin-Poin Manfaat Fitur Ringkas (maks 2 poin di desktop agar card tidak terlalu tinggi) */}
          {currentStep.highlights && currentStep.highlights.length > 0 && (
            <div className="hidden sm:flex mt-2.5 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 flex-col gap-1.5">
              {currentStep.highlights.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700 font-medium leading-snug">
                  <CoachMarkIcon icon="solar:check-read-linear" className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick link jika ada (hanya desktop agar mobile ringkas) */}
          {currentStep.route && (
            <div className="hidden sm:flex mt-3 items-center justify-between text-[11px] text-slate-500">
              <span className="italic">Jalur Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("simakis_pending_page_tour", currentStep.route!)
                  handleComplete()
                  navigate(currentStep.route!)
                }}
                className="text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Buka Halaman Ini</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigasi Tur */}
        <div className="px-3 py-2 sm:px-5 sm:py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          {/* Sisi Kiri: Lewati & Step Dots */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-[11px] sm:text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer mr-0.5"
            >
              Lewati
            </button>

            {/* Dots Navigasi */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Ke langkah ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${idx === currentIndex
                    ? "w-3.5 sm:w-5 bg-blue-600"
                    : "w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Sisi Kanan: Tombol Sebelumnya & Lanjut */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5" />
                Kembali
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-7 sm:h-8 px-3 sm:px-3.5 text-[11px] sm:text-xs font-semibold bg-[#0B3052] hover:bg-[#07213A] text-white rounded-lg sm:rounded-xl shadow-xs cursor-pointer flex items-center gap-1 transition-all shrink-0 whitespace-nowrap"
            >
              <span>{currentIndex === steps.length - 1 ? "Selesai" : "Lanjut"}</span>
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
