import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import { useAuth } from "@/context/AuthContext"
import { ShieldCheck, FileText, MessageSquare, Plus, Lock, CheckCircle2 } from "lucide-react"

export default function Landing() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false)

  // Gerbang autentikasi pelaporan (CHANGELOG "Proteksi & Gerbang Autentikasi Pelaporan"):
  // belum login → modal Wajib Masuk / Daftar; sudah login → langsung ke form laporan.
  const handleMulaiLapor = () => {
    if (!isAuthenticated) {
      setIsAuthRequiredOpen(true)
    } else {
      navigate("/laporan/baru")
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-900 text-slate-900 min-h-screen flex items-start">
        {/* Background Image & Light Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-35"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=2000&q=80')` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-100 via-slate-100/95 to-slate-100/80 md:to-slate-100/10" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 w-full pt-20 md:pt-28 pb-16 md:pb-24">
          <div className="grid gap-12 lg:grid-cols-12 items-stretch">
            {/* Left Content Column */}
            <div className="lg:col-span-7 max-w-2xl flex flex-col justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold leading-[1.18] tracking-tight text-slate-900">
                  Laporkan kondisi sekolah, dicek dulu ke data resminya.
                </h1>
                <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
                  SIMAKIS menyandingkan data resmi Dapodik dengan laporan warga di
                  Kecamatan Lamongan, sehingga setiap sanggahan kondisi fasilitas diperiksa
                  berdasarkan catatan resmi sebelum diteruskan ke Dinas Pendidikan.
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Berbasis data resmi Dapodik Kemendikdasmen, per NPSN sekolah</span>
                </div>
              </div>

              <div className="mt-12 lg:mt-16 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleMulaiLapor}
                    className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Mulai Laporkan Temuan
                  </Button>
                  <Button asChild variant="outline" className="bg-white hover:bg-slate-50 text-slate-800 border-slate-200 font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-colors cursor-pointer">
                    <Link to="/sekolah">
                      Lihat Direktori Sekolah
                    </Link>
                  </Button>
                </div>

                {/* Indikator Status Autentikasi Pelapor */}
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50/80 border border-emerald-200/60 rounded-lg px-3 py-1.5 w-fit">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Masuk sebagai <strong>{user?.nama}</strong> (Akun Terverifikasi — Siap Melaporkan)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg px-3 py-1.5 w-fit">
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Pelaporan membutuhkan akun warga terverifikasi (Wajib Masuk / Daftar)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Floating Preview Card Column */}
            <div className="lg:col-span-5 self-end">
              <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    SMAN 1 Sukodadi <span className="text-slate-400 font-normal">·</span> Laboratorium Kimia
                  </h3>
                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/70">
                    Selisih Terdeteksi
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {/* Dapodik Data */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      DATA DAPODIK
                    </span>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                      <span className="font-semibold text-slate-700">Baik</span>
                      <span className="text-slate-500 text-xs font-medium">1 unit</span>
                    </div>
                  </div>

                  {/* Field Fact */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                      FAKTA LAPANGAN
                    </span>
                    <div className="rounded-xl bg-rose-50/80 border border-rose-100 px-3.5 py-3 text-xs sm:text-sm font-bold text-rose-900 leading-snug">
                      Atap bocor & plafon runtuh
                    </div>
                  </div>
                </div>

                {/* Progress bar line segments as seen in reference */}
                <div className="mt-6 grid grid-cols-4 gap-2">
                  <div className="h-1 rounded-full bg-[#0B3052]" />
                  <div className="h-1 rounded-full bg-[#0B3052]" />
                  <div className="h-1 rounded-full bg-slate-200" />
                  <div className="h-1 rounded-full bg-slate-200" />
                </div>

                {/* Step timeline breadcrumbs at bottom */}
                <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <span>Sanggahan warga</span>
                  <span>→</span>
                  <span>Klasterisasi</span>
                  <span>→</span>
                  <span>Audit fisik Dinas</span>
                  <span>→</span>
                  <span>Pembaruan Dapodik</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI ── */}
      <section className="border-b border-slate-100 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">24</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">Sekolah terdata di Kec. Lamongan</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">6</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">Sekolah dengan selisih data terdampak</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">42</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">Isu fasilitas yang sudah tuntas</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">1 NIK</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">= 1 suara, terverifikasi kependudukan</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cara Melaporkan ── */}
      <section className="bg-[#F8FAFC] py-10 md:py-14 border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Cara melaporkan kondisi fasilitas
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600 text-sm md:text-base leading-relaxed">
            Supaya laporan bisa langsung diverifikasi dan tidak berupa keluhan tanpa dasar, prosesnya mengikuti tiga langkah berikut.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {/* Step 1 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3052] text-sm font-bold text-white shadow-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Buka Direktori Sekolah</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Cari sekolah yang ingin dilaporkan dan periksa catatan resmi Dapodik untuk fasilitas yang dimaksud.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3052] text-sm font-bold text-white shadow-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Bandingkan dengan kondisi nyata</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Jika kondisi di lapangan berbeda dari catatan Dapodik, isi sanggahan lengkap dengan keterangan dan foto.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3052] text-sm font-bold text-white shadow-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Didukung warga, diteruskan ke Dinas</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Laporan serupa dikelompokkan otomatis, warga lain bisa memberi dukungan, lalu Dinas menindaklanjuti dengan audit fisik.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kenapa Diperiksa ── */}
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Kenapa laporan diperiksa ke data resmi dulu
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600 text-sm md:text-base leading-relaxed">
            Prinsip ini menjaga agar laporan warga tetap bisa dipercaya dan tidak disalahgunakan sebagai keluhan sepihak.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Data resmi pemerintah</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Diambil dari pangkalan data Dapodik Kemendikdasmen per NPSN, dimutakhirkan tiap semester oleh operator sekolah.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Suara warga yang terverifikasi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Laporan warga melengkapi data resmi dengan kondisi riil, dikelompokkan otomatis supaya isu serupa tidak tercatat berulang.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Identitas pelapor dilindungi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                NIK dan data pribadi dienkripsi sesuai UU PDP No. 27/2022, dan tidak ditampilkan ke publik atau Dinas secara terbuka.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 md:p-12">
            {/* Background image */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=2000&q=80')` }}
            />
            {/* Dark navy overlay */}
            <div className="absolute inset-0 z-0 bg-[#0B3052]/70" />

            {/* Content */}
            {/* Content */}
            <div className="relative z-10 max-w-xl">
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {isAuthenticated
                  ? `Siap berpartisipasi, ${user?.nama}?`
                  : "Ikut menjaga integritas data sekolah di Lamongan"}
              </h3>
              <p className="mt-2 text-slate-300 text-sm md:text-base leading-relaxed">
                {isAuthenticated
                  ? "Akun Anda telah terverifikasi kependudukan (1 NIK = 1 Suara Sah). Laporkan selisih sarana sekolah atau pantau progres audit langsung dari sistem."
                  : "Daftar dengan NIK atau masuk ke akun Anda untuk mulai melaporkan temuan dan memvalidasi sarana sekolah secara objektif."}
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={() => navigate("/laporan/baru")}
                    className="bg-white hover:bg-slate-100 text-[#0B3052] font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Buat Laporan Baru
                  </Button>
                  <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 font-medium px-5 py-3.5 h-auto rounded-lg text-sm cursor-pointer">
                    <Link to="/laporan/riwayat">
                      Riwayat Laporan Saya
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/registrasi?redirect=%2Flaporan%2Fbaru&action=report">
                    <Button className="bg-white hover:bg-slate-100 text-[#0B3052] font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer">
                      Daftar Akun Warga
                    </Button>
                  </Link>
                  <Link to="/login?redirect=%2Flaporan%2Fbaru&action=report">
                    <Button className="bg-white hover:bg-slate-100 text-[#0B3052] font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer">
                      Masuk Akun
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Modal Wajib Autentikasi jika Belum Login ── */}
      <AuthRequiredModal
        open={isAuthRequiredOpen}
        onOpenChange={setIsAuthRequiredOpen}
        redirectUrl="/laporan/baru"
      />
    </>
  )
}