import { Link, Outlet, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export default function PublicLayout() {
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-sm shrink-0">
                <img
                  src="/logo-simakis-icon.png"
                  alt="Logo SIMAKIS"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/logo-simakis.png";
                  }}
                />
              </div>
              <div className="leading-tight">
                <span className="text-base font-extrabold text-[#0B3052] tracking-tight">SIMAKIS</span>
                <span className="block text-[11px] font-medium text-slate-400">Kec. Lamongan</span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1.5 md:flex">
              <NavLink to="/" label="Home" active={location.pathname === "/"} />
              <NavLink to="/laporan/wilayah" label="Dashboard Wilayah" active={location.pathname === "/laporan/wilayah"} />
              <NavLink to="/sekolah" label="Direktori Sekolah" active={location.pathname === "/sekolah"} />
              <NavLink to="/laporan/riwayat" label="Riwayat Laporan" active={location.pathname === "/laporan/riwayat"} />
              <NavLink to="/tentang" label="Tentang Data" active={location.pathname === "/tentang"} />
            </nav>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3 py-1.5 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B3052] text-[11px] font-bold text-white">
                  {user?.nama?.charAt(0) || "U"}
                </div>
                <div className="leading-tight hidden sm:block text-left">
                  <span className="text-xs font-bold text-slate-800 block">{user?.nama}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Warga Terverifikasi</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-600 hover:text-rose-600 text-xs font-semibold cursor-pointer"
              >
                Keluar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 font-medium cursor-pointer">
                <Link to="/login">
                  Masuk
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-[#0B3052] hover:bg-[#07213A] text-white font-medium rounded-lg px-4 shadow-sm cursor-pointer">
                <Link to="/registrasi">
                  Daftar Akun
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#07162C] text-slate-400 border-t border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 text-sm md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm overflow-hidden shrink-0">
                <img
                  src="/logo-simakis-icon.png"
                  alt="Logo SIMAKIS"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/logo-simakis.png";
                  }}
                />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">SIMAKIS</span>
            </div>
            <p className="leading-relaxed text-slate-400 text-xs sm:text-sm">
              Sistem Informasi Masukan dan Klasterisasi Isu Sekolah — audit partisipatif sarana
              sekolah Kecamatan Lamongan, Kabupaten Lamongan.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Portal</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link to="/sekolah" className="hover:text-white transition-colors">Direktori Sekolah</Link></li>
              <li><Link to="/laporan/riwayat" className="hover:text-white transition-colors">Laporan Saya</Link></li>
              <li><Link to="/tentang" className="hover:text-white transition-colors">Tentang Data</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Kebijakan</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Perlindungan Data Pribadi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Ketentuan Layanan</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Kontak Dinas</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>Dinas Pendidikan Kab. Lamongan</li>
              <li>Kecamatan Lamongan</li>
              <li className="pt-2 border-t border-slate-700/60">
                <Link to="/dinas/login" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 text-xs">
                  <span>Portal Dinas (Aparatur)</span> &rarr;
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-slate-500">
          &copy; 2026 SIMAKIS &middot; Disdik Kab. Lamongan
        </div>
      </footer>
    </div>
  )
}

function NavLink({ to, label, active = false }: { to: string; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#0B3052] text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  )
}