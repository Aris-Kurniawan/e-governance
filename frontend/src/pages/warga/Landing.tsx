import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Camera,
  ThumbsUp,
  Activity,
  Landmark,
  Building2,
  FileCheck,
  Gauge,
  Bot,
  LineChart,
  Megaphone,
  MapPin,
  Heart,
  TrendingUp,
  Users,
} from "lucide-react"

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Gerbang autentikasi pelaporan:
  // belum login → langsung diarahkan ke halaman login; sudah login → langsung ke form laporan.
  const handleMulaiLapor = () => {
    navigate("/sekolah")
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        {/* Dekorasi latar */}
        <div className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-slate-100 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pt-12 md:pt-20 pb-10 md:pb-14">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Platform Transparansi Sarpras Sekolah Kab. Lamongan
              </div>

              <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-slate-900">
                Kawal Fasilitas Sekolah,
                <br />
                Wujudkan <span className="text-blue-600">Ruang Belajar Layak</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Laporkan kerusakan ruang kelas, sanitasi, dan fasilitas sekolah
                secara transparan dengan sanitasi privasi NIK otomatis dan verifikasi
                kecerdasan buatan.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleMulaiLapor}
                  className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-6 py-3.5 h-auto rounded-xl text-sm shadow-sm transition-colors cursor-pointer"
                >
                  Buat Laporan Baru
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button asChild variant="outline" className="bg-white hover:bg-slate-50 text-slate-800 border-slate-200 font-semibold px-6 py-3.5 h-auto rounded-xl text-sm shadow-sm transition-colors cursor-pointer">
                  <Link to="/laporan/wilayah">
                    <MapPin className="h-4 w-4 mr-1.5 text-blue-600" />
                    Jelajahi Peta Sekolah
                  </Link>
                </Button>
              </div>

              {/* Indikator Status Autentikasi Pelapor */}
              {!isAuthenticated && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 font-medium bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg px-3 py-1.5 w-fit">
                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Pelaporan membutuhkan akun warga terverifikasi (Wajib Masuk / Daftar)</span>
                </div>
              )}

              {/* Kategori Populer */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase shrink-0 whitespace-nowrap">
                  Kategori Populer:
                </span>
                {[
                  { label: "Ruang Kelas", icon: Building2 },
                  { label: "Sanitasi & Toilet", icon: ShieldCheck },
                  { label: "Perpustakaan", icon: FileCheck },
                  { label: "Laboratorium", icon: Gauge },
                ].map((kat) => {
                  const Icon = kat.icon
                  return (
                    <span
                      key={kat.label}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs cursor-pointer select-none whitespace-nowrap transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                    >
                      <Icon className="h-3.5 w-3.5 text-blue-600 transition-colors group-hover:text-blue-700" />
                      {kat.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Right Floating Preview Cards – disembunyikan di mobile */}
            <div className="hidden lg:block lg:col-span-5 relative">
              {/* Kartu kecil: sekolah tervalidasi */}
              <div className="absolute -top-4 left-0 z-20 flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60">
                <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="leading-tight">
                  <span className="block text-xs font-bold text-slate-900">SDN 1 Sukodadi</span>
                  <span className="block text-[10px] text-slate-400">Laporan Terverifikasi · NPSN 6401 Validasi</span>
                </div>
              </div>

              {/* Kartu utama: Indeks Integritas Sarpras */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                    Verifikasi Sarpras Terbuka
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sistem
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-5">
                  {/* Gauge indeks */}
                  <div className="relative h-24 w-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="#2563EB" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - 0.942)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-extrabold text-slate-900 leading-none">94.2</span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-0.5">INDEKS</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Indeks Integritas Sarpras</h3>
                    <p className="text-[11px] text-slate-500 leading-snug mt-1">
                      Berbasis audit 62 sekolah dan 49 laporan warga terverifikasi.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Terverifikasi Dapodik &amp; Warga
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
                    <span>Realisasi Perbaikan Semester Ini</span>
                    <span className="font-bold text-slate-700">64%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-[64%] rounded-full bg-blue-600" />
                  </div>
                </div>
              </div>

              {/* Kartu melayang: AI Consensus */}
              <div className="absolute -bottom-6 -left-6 z-20 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="leading-tight">
                    <span className="block text-[11px] font-bold text-slate-900">AI Consensus: 0.88</span>
                    <span className="block text-[10px] text-slate-400">Kualitas Klaster</span>
                  </div>
                </div>
              </div>

              {/* Pil isu mendesak */}
              <div className="absolute top-1/2 -right-4 z-20 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-[10px] font-bold text-amber-700 shadow-sm">
                4 Isu Mendesak
              </div>

              {/* Pil status antrean */}
              <div className="absolute -bottom-4 right-4 z-20 rounded-full bg-[#0B3052] px-4 py-2 text-[10px] font-bold text-white shadow-lg">
                Status: Masuk Antrian Prioritas Dinas
              </div>
            </div>
          </div>


        </div>
      </section>

      {/* ── Trust Bar: Lembaga Pemerintah (marquee berjalan) ── */}
      <section className="border-y border-slate-100 bg-white py-10 md:py-12 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-7">
            Terintegrasi &amp; Diakui oleh Lembaga Pemerintah Resmi
          </p>
        </div>
        <div className="relative w-full" aria-label="Lembaga pemerintah yang mengakui SIMAKIS">
          {/* Mask gradien di tepi kiri/kanan */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent" />

          <div className="flex w-max animate-marquee">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex items-center gap-x-10 sm:gap-x-16 pr-10 sm:pr-16 shrink-0"
                aria-hidden={copy === 1}
              >
                {[
                  { label: "Kemendikbudristek RI", icon: Landmark },
                  { label: "Dinas Pendidikan Lamongan", icon: Building2 },
                  { label: "SPBE–LAPOR RI", icon: FileCheck },
                  { label: "Pengawasan BPKP RI", icon: ShieldCheck },
                  { label: "Kemendikbudristek RI", icon: Landmark },
                  { label: "Dinas Pendidikan Lamongan", icon: Building2 },
                  { label: "SPBE–LAPOR RI", icon: FileCheck },
                  { label: "Pengawasan BPKP RI", icon: ShieldCheck },
                ].map((org, idx) => {
                  const Icon = org.icon
                  return (
                    <div
                      key={`${copy}-${org.label}-${idx}`}
                      className="flex items-center gap-2.5 text-slate-400 shrink-0"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{org.label}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Transparansi Penuh: 4 Kartu Fitur ── */}
      <section className="bg-[#F8FAFC] py-14 md:py-20 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Arsitektur Transparansi Nirlaba</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Transparansi Penuh dari Aduan hingga Realisasi Fisik
            </h2>
            <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
              Setiap aduan warga diproses secara objektif, aman, dan diaudit secara
              terbuka tanpa jalur birokrasi tertutup.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Kartu 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 mb-4 transition-all duration-300 group-hover:scale-110">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Pelaporan Aman &amp; Bebas Cemas
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-1">
                Pembersihan metadata EXIF lokasi otomatis dan enkripsi berstandar
                AES-256 pada NIK warga sesuai mandat UU PDP No. 27/2022.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                <span>Sanitasi Kriptografi 100%</span>

              </div>
            </div>

            {/* Kartu 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 mb-4 transition-all duration-300 group-hover:scale-110">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Klasterisasi Isu Berbasis AI
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-1">
                Algoritma adaptif mengelompokkan keluhan serupa dari berbagai warga
                sekolah yang sama secara otomatis tanpa spam aduan duplikat.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                <span>Cosine Distance Matching</span>

              </div>
            </div>

            {/* Kartu 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 mb-4 transition-all duration-300 group-hover:scale-110">
                <ThumbsUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Dukungan Warga (1 NIK 1 Vote)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-1">
                Komunitas orang tua murid dan warga dapat memvote isu paling mendesak
                agar skor prioritas anggaran daerah (P_k) meningkat.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                <span>Konsensus Warga Transparan</span>

              </div>
            </div>

            {/* Kartu 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 mb-4 transition-all duration-300 group-hover:scale-110">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Audit Progres Real-Time
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-1">
                Pantau setiap tahap perbaikan fisik sekolah hingga verifikasi dinas,
                pelaksanaan SPK tender, hingga serah terima fisik (BAST).
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                <span>Status Ledger D-32 Terbuka</span>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tiga Langkah: Alur Kerja Partisipatif (gelap) ── */}
      <section className="bg-[#0B3052] py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Mockup Ponsel — mobile: setelah teks, desktop: kolom kiri */}
            <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
              <div className="w-full max-w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/30">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-extrabold text-slate-900">SIMAKIS Mobile</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Terpantau
                  </span>
                </div>

                <div className="rounded-2xl bg-[#0E2A47] p-4 text-white space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-blue-300">LAP-2026-042</span>
                    <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                      Dalam Pengerjaan (66%)
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold leading-snug">
                    Atap Ruang Kelas 3 Roboh
                  </h3>

                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                      Berita Warga
                    </span>
                    <div className="text-right leading-tight">
                      <span className="block text-[9px] text-slate-400">Proyek Prioritas</span>
                      <span className="block text-[11px] font-bold">Rp 45.000.000</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-300 mb-1.5">
                      <span>Progress Fisik SPK</span>
                      <span className="font-bold text-white">45% Selesai</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[45%] rounded-full bg-blue-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                    <span className="font-semibold">Citra Karya Mulya</span>
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />
                      24 Suara Warga
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Anggaran DAK 2026
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">Rp 125.000.000</span>
                </div>
              </div>
            </div>

            {/* Langkah 1–3 — mobile: urutan pertama */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Alur Kerja Partisipatif</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
                Tiga Langkah Mudah Mengawal Fasilitas Belajar
              </h2>

              <div className="mt-8 space-y-6">
                {[
                  {
                    no: "01",
                    title: "Foto & Kirim Aduan",
                    desc: "Sertakan foto kerusakan fasilitas dari HP Anda. Sistem secara otomatis mencocokkan metadata sensitif dan mengamankan data pelapor dalam brankas kriptografis.",
                  },
                  {
                    no: "02",
                    title: "Validasi AI & Konsensus Komunitas",
                    desc: "Sistem mengelompokkan laporan serupa menjadi klaster isu dan membuka voting dukungan publik (1 NIK 1 Suara) untuk menentukan bobot urgensi pelaporan.",
                  },
                  {
                    no: "03",
                    title: "Dinas Menurunkan Anggaran Perbaikan",
                    desc: "Dinas Pendidikan menerbitkan Surat Perintah Kerja (SPK). Warga dapat memantau serah terima material hingga proyek tuntas 100% secara transparan.",
                  },
                ].map((step) => (
                  <div key={step.no} className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-xs font-extrabold text-white">
                      {step.no}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white">{step.title}</h3>
                      <p className="mt-1 text-xs sm:text-[13px] text-blue-100/70 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleMulaiLapor}
                className="mt-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 h-auto rounded-xl text-sm shadow-sm transition-colors cursor-pointer"
              >
                Mulai Laporkan Sarpras Sekarang
                <ArrowUpRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Skor Prioritas Perbaikan ── */}
      <section className="bg-white py-14 md:py-20 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 mb-4">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Kalkulasi Objektif &amp; Transparan (Tanpa Intervensi Politik)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Bagaimana Skor Prioritas Perbaikan Sekolah Ditentukan?
            </h2>
            <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
              Dinas Pendidikan menentukan urutan pengerjaan sarpras berdasarkan data
              faktaual lapangan, catatan resmi Dapodik, dan suara sah warga Lamongan.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 lg:gap-3">
            {/* Kartu 1: Skor Keparahan */}
            <div className="flex-1 max-w-sm mx-auto lg:mx-0 lg:max-w-none rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  Bobot 70:30
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. Skor Keparahan Fasilitas</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Matriks 100 Poin Berdasarkan Matriks Kerusakan Fisik
              </p>
              <div className="mt-3.5 h-2 rounded-full bg-slate-100 overflow-hidden flex">
                <div className="h-full w-[70%] bg-blue-600" />
                <div className="h-full w-[30%] bg-blue-200" />
              </div>
              <div className="mt-2.5 flex items-center gap-4 text-[10px] font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> 70% Fakta Laporan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-200" /> 30% Audit Dapodik
                </span>
              </div>
              <div className="mt-auto pt-4 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                <span className="font-semibold">Formula:</span>
                <span className="font-mono font-bold text-slate-600">(Fakta &times; 0.7) + (Dapodik &times; 0.3)</span>
              </div>
            </div>

            {/* Konektor + */}
            <div className="hidden lg:flex items-center">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                +
              </div>
            </div>

            {/* Kartu 2: Dukungan Partisipasi */}
            <div className="flex-1 max-w-sm mx-auto lg:mx-0 lg:max-w-none rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <ThumbsUp className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Multiplier Faktor
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. Dukungan Partisipasi Warga</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Kompensasi suara dari komite sekolah &amp; warga (Akumulasi 1 NIK = 1 Suara Sah)
              </p>
              <div className="mt-3.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="leading-tight">
                    <span className="block text-sm font-extrabold text-slate-900">+1.0 Poin per Suara</span>
                    <span className="block text-[10px] text-slate-500">Menjangkau 471 Warga Lamongan</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-100">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Bebas bot &amp; otomatis dihitung duplikasi NIK</span>
              </div>
            </div>

            {/* Konektor = */}
            <div className="hidden lg:flex items-center">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                =
              </div>
            </div>

            {/* Kartu 3: Skor Prioritas Final */}
            <div className="flex-1 max-w-sm mx-auto lg:mx-0 lg:max-w-none rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  <LineChart className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Output Resmi
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">3. Skor Prioritas Final (P_k)</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Penentuan Akhir Susunan Fisik oleh Dinas
              </p>
              <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                  Indeks Urgensi
                </span>
                <div className="flex items-end justify-between mt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 leading-none">85.5</span>
                    <span className="text-xs font-bold text-slate-400">/100</span>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4">
                <div className="w-full rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center text-[10px] font-bold text-amber-800">
                  Prioritas Darurat (Masuk RKT Tahun Berjalan)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA: Menemukan Sarana Rusak ── */}
      <section className="bg-[#F8FAFC] py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="group rounded-3xl border border-slate-200 bg-white px-6 py-10 sm:px-12 sm:py-14 text-center shadow-sm hover:shadow-xl hover:shadow-blue-100/60 hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 ease-out">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Megaphone className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Menemukan Sarana Sekolah Rusak di Sekitar Anda?
            </h2>
            <p className="mt-3 mx-auto max-w-2xl text-slate-600 text-sm md:text-base leading-relaxed">
              Partisipasi Anda adalah langkah nyata menghadirkan ruang belajar yang
              aman bagi anak-anak di Lamongan. Tidak dipungut biaya dan kerahasiaan
              identitas dilindungi.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated ? (
                <Button
                  onClick={() => navigate("/sekolah")}
                  className="bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md text-white font-semibold px-6 py-3.5 h-auto rounded-xl text-sm transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  Ambil Foto &amp; Unggah Laporan
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/registrasi?redirect=%2Flaporan%2Fbaru&action=report")}
                  className="bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md text-white font-semibold px-6 py-3.5 h-auto rounded-xl text-sm transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  Ambil Foto &amp; Unggah Laporan
                </Button>
              )}
              <Button asChild variant="outline" className="bg-white hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md text-slate-800 border-slate-200 font-semibold px-6 py-3.5 h-auto rounded-xl text-sm transition-all cursor-pointer">
                <Link to="/klaster">
                  Lihat 49 Klaster Aktif
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
