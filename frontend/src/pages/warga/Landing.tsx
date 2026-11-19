import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { TiltCard } from "@/components/ui/TiltCard"
import { EllipseGallery } from "@/components/ui/EllipseGallery"
import ConvergingWorkflow from "@/components/composite/ConvergingWorkflow"
import { useAuth } from "@/context/AuthContext"
import {
  ArrowRight,
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
  TrendingUp,
  Users,
} from "lucide-react"

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Gerbang autentikasi pelaporan:
  // belum login → langsung diarahkan ke halaman login; sudah login → langsung ke form laporan.
  const handleMulaiLapor = () => {
    if (isAuthenticated) {
      navigate("/laporan/baru")
    } else {
      navigate("/login?redirect=%2Flaporan%2Fbaru&action=report")
    }
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
<<<<<<< HEAD
              {/* Kartu kecil: sekolah tervalidasi */}
              <div className="absolute -top-11 left-0 z-20 flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60">
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
              <div className="absolute -bottom-12 -left-6 z-20 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-blue-600" />
||||||| 5982711
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
=======
              <TiltCard
                maxTilt={9}
                scale={1.025}
                glare={true}
                className="relative rounded-3xl p-1 bg-transparent border-0 shadow-none cursor-pointer"
              >
                {/* Kartu kecil: sekolah tervalidasi */}
                <div
                  style={{ transform: "translateZ(36px)" }}
                  className="absolute -top-4 left-0 z-30 flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60 transition-transform duration-200"
                >
                  <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
>>>>>>> 0954b9a591e2808cb519ff57d2be98b8cf601497
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-slate-900">SDN 1 Sukodadi</span>
                    <span className="block text-[10px] text-slate-400">Laporan Terverifikasi · NPSN 6401 Validasi</span>
                  </div>
                </div>

                {/* Kartu utama: Indeks Integritas Sarpras */}
                <div
                  style={{ transform: "translateZ(18px)" }}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/50 transition-shadow duration-300 hover:border-blue-300"
                >
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
                <div
                  style={{ transform: "translateZ(42px)" }}
                  className="absolute -bottom-6 -left-6 z-30 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-lg shadow-slate-200/60 transition-transform duration-200"
                >
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
                <div
                  style={{ transform: "translateZ(38px)" }}
                  className="absolute top-1/2 -right-4 z-30 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-[10px] font-bold text-amber-700 shadow-sm"
                >
                  4 Isu Mendesak
                </div>

                {/* Pil status antrean */}
                <div
                  style={{ transform: "translateZ(46px)" }}
                  className="absolute -bottom-4 right-4 z-30 rounded-full bg-[#0B3052] px-4 py-2 text-[10px] font-bold text-white shadow-lg"
                >
                  Status: Masuk Antrian Prioritas Dinas
                </div>
              </TiltCard>
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

      {/* ── Galeri Elips: Bukti Nyata Laporan Warga ── */}
      {/* Hanya tampil di layar md ke atas — terlalu padat di mobile */}
      <section className="hidden md:block bg-white py-12 md:py-16 border-b border-slate-100 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Header section */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 mb-3">
              <Camera className="h-3.5 w-3.5 text-blue-600" />
              <span>Dampak Nyata dari Partisipasi Warga</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Foto-foto berikut mewakili kondisi fasilitas sekolah yang telah berhasil dilaporkan dan ditindaklanjuti
            </p>
          </div>

          <EllipseGallery
            centerStat="1.200+"
            centerStatLabel="Laporan Terverifikasi"
            centerTitle="Jejak Nyata Laporan Warga"
            centerSubtitle="Setiap foto adalah langkah nyata menuju sekolah yang layak"
            className="mt-0"
          />
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
            <TiltCard
              maxTilt={7}
              scale={1.025}
              className="rounded-2xl border border-slate-200 bg-white p-6 cursor-pointer flex flex-col group"
            >
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
            </TiltCard>

            {/* Kartu 2 */}
            <TiltCard
              maxTilt={7}
              scale={1.025}
              className="rounded-2xl border border-slate-200 bg-white p-6 cursor-pointer flex flex-col group"
            >
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
            </TiltCard>

            {/* Kartu 3 */}
            <TiltCard
              maxTilt={7}
              scale={1.025}
              className="rounded-2xl border border-slate-200 bg-white p-6 cursor-pointer flex flex-col group"
            >
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
            </TiltCard>

            {/* Kartu 4 */}
            <TiltCard
              maxTilt={7}
              scale={1.025}
              className="rounded-2xl border border-slate-200 bg-white p-6 cursor-pointer flex flex-col group"
            >
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
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ── Alur Kerja Partisipatif: Animasi Konvergensi Scroll (Pure React + Tailwind) ── */}
      <ConvergingWorkflow />

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

          {/* ── TAMPILAN MOBILE (< lg): Unified Formula Ledger Card (Muat 1 Layar Penuh) ── */}
          <div className="block lg:hidden max-w-md mx-auto">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-3.5">
              
              {/* Baris 1: Skor Keparahan Fasilitas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        1. Skor Keparahan Fasilitas
                      </h3>
                      <p className="text-[10px] text-slate-500">Matriks 100 Poin Kerusakan Fisik</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-700 shrink-0">
                    Bobot 70:30
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden flex">
                    <div className="h-full w-[70%] bg-blue-600" />
                    <div className="h-full w-[30%] bg-blue-300" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> 70% Fakta
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> 30% Dapodik
                    </span>
                    <span className="font-mono text-[9px] text-slate-400">
                      (Fakta×0.7 + Dapodik×0.3)
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider Operator (+) */}
              <div className="relative flex items-center justify-center py-0.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-black shadow-2xs">
                  +
                </span>
              </div>

              {/* Baris 2: Dukungan Partisipasi Warga */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                      <ThumbsUp className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        2. Dukungan Partisipasi Warga
                      </h3>
                      <p className="text-[10px] text-slate-500">1 NIK = 1 Suara Sah (Terverifikasi)</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                    Multiplier
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 text-xs">+1.0 Poin per Suara</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Anti-Bot</span>
                  </div>
                </div>
              </div>

              {/* Divider Operator (=) */}
              <div className="relative flex items-center justify-center py-0.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-slate-300" />
                </div>
                <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-black shadow-xs">
                  =
                </span>
              </div>

              {/* Baris 3: Output Resmi (Skor Prioritas Final) */}
              <div className="rounded-xl bg-slate-900 p-3.5 text-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center">
                      <LineChart className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs font-bold tracking-tight">3. Skor Prioritas Final (P_k)</span>
                  </div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                    Output Resmi
                  </span>
                </div>

                <div className="flex items-end justify-between pt-0.5">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      Indeks Urgensi
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-white leading-none">85.5</span>
                      <span className="text-xs font-semibold text-slate-400">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      <span>Prioritas Darurat</span>
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 leading-snug">
                  Urutan antrean Surat Perintah Kerja (SPK) RKT Dinas Pendidikan.
                </p>
              </div>

            </div>
          </div>

          {/* ── TAMPILAN DESKTOP (≥ lg): 3 Kartu Horizontal Lebar ── */}
          <div className="hidden lg:flex items-stretch justify-center gap-4 lg:gap-3 max-w-none">
            {/* Kartu 1: Skor Keparahan */}
            <div className="flex-1 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
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
            <div className="flex items-center justify-center self-center py-2 lg:py-0">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                <span className="leading-none pb-0.5">+</span>
              </div>
            </div>

            {/* Kartu 2: Dukungan Partisipasi */}
            <div className="flex-1 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
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
            <div className="flex items-center justify-center self-center py-2 lg:py-0">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                <span className="leading-none pb-0.5">=</span>
              </div>
            </div>

            {/* Kartu 3: Skor Prioritas Final */}
            <div className="flex-1 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:shadow-blue-100/70 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300 ease-out flex flex-col cursor-pointer group">
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
                  onClick={() => navigate("/laporan/baru")}
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
