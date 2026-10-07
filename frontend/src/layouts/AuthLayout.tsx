import { Link, Outlet } from "react-router-dom"
import { ArrowLeft, ShieldCheck, GraduationCap, Contact2 } from "lucide-react"

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Kiri: Branding ── */}
      <aside className="relative hidden w-[400px] xl:w-[440px] flex-col justify-between overflow-hidden bg-[#0B2F52] p-8 lg:p-10 text-white lg:flex shrink-0">
        {/* Dekorasi lingkaran watermark lembut sesuai desain */}
        <div className="absolute -right-20 bottom-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
        <div className="absolute right-0 bottom-48 h-64 w-64 rounded-full bg-teal-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Beranda SIMAKIS
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20 shadow-sm overflow-hidden">
              <img src="/logo-simakis-icon.png" alt="S" className="h-10 w-10 object-contain" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base">SIMAKIS</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white border border-white/20 uppercase tracking-wide">
                  V2 RESMI
                </span>
              </div>
              <span className="block text-xs text-white/70 font-medium">Disdik Lamongan</span>
            </div>
          </div>

          <h1 className="mt-8 text-2xl lg:text-[32px] font-extrabold leading-[1.22] tracking-tight text-white">
            Satu Suara Nyata untuk Sekolah yang Layak.
          </h1>
          <p className="mt-4 text-xs lg:text-sm leading-relaxed text-white/80">
            Bergabunglah bersama ribuan pelajar, orang tua, dan warga Kecamatan Lamongan untuk
            mengaudit sarana sekolah secara partisipatif, aman, dan berbasis fakta resmi.
          </p>

          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs lg:text-sm font-semibold text-white shadow-sm backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>Identitas Asli Disamarkan</span>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs lg:text-sm font-semibold text-white shadow-sm backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span>Siswa adalah Saksi Kunci Utama</span>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs lg:text-sm font-semibold text-white shadow-sm backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Contact2 className="h-5 w-5" />
              </div>
              <span>1 NIK / NISN = 1 Hak Suara Akuntabel</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 text-[11px] text-white/60 flex items-center justify-between border-t border-white/10 flex-wrap gap-2">
          <span>&copy; 2026 SIMAKIS &middot; PSDKU Lamongan PENS</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Integrasi Dapodik Kemendikdasmen
          </span>
        </div>
      </aside>

      {/* ── Kanan: Form Content ── */}
      <main className="flex flex-1 items-start justify-center px-6 py-8 sm:px-12 sm:py-10 overflow-y-auto">
        <div className="w-full max-w-[620px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}