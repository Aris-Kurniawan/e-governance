import { useState, useRef, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, History, LogOut, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { ROLE_LABEL } from "@/lib/api/types"

/** Badge status akun warga — `UserMe.status_verifikasi` (menunggu/terverifikasi/ditolak). */
const STATUS_VERIFIKASI_META: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  terverifikasi: {
    label: "Terverifikasi",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  menunggu: {
    label: "Menunggu Verifikasi",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  ditolak: {
    label: "Ditolak",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

export default function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  // ── Menu akun dropdown (pola sama dengan DinasLayout) ─────────────────────
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isAccountOpen &&
        accountContainerRef.current &&
        !accountContainerRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isAccountOpen])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden">
                <img
                  src="/logo-simakis-icon.png"
                  alt="Logo SIMAKIS"
                  className="h-full w-full object-contain rounded-full"
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
              <NavLink to="/klaster" label="Klaster Isu" active={location.pathname.startsWith("/klaster")} />
              <NavLink to="/sekolah" label="Direktori Sekolah" active={location.pathname === "/sekolah"} />
              <NavLink to="/laporan/riwayat" label="Riwayat Laporan" active={location.pathname === "/laporan/riwayat"} />
              <NavLink to="/tentang" label="Tentang Data" active={location.pathname === "/tentang"} />
            </nav>
          </div>

          {isAuthenticated ? (
            <div className="relative" ref={accountContainerRef}>
              <button
                type="button"
                onClick={() => setIsAccountOpen((prev) => !prev)}
                title="Menu Akun Warga"
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors cursor-pointer ${
                  isAccountOpen
                    ? "bg-slate-100 border-slate-300"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200/80"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B3052] text-[11px] font-bold text-white">
                  {user?.nama?.charAt(0) || "U"}
                </div>
                <div className="leading-tight hidden sm:block text-left">
                  <span className="text-xs font-bold text-slate-800 block">{user?.nama}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {user ? ROLE_LABEL[user.role] : "Warga Terverifikasi"}
                  </span>
                </div>
              </button>

              {/* Account Flyout Dropdown */}
              {isAccountOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100">
                  {/* Profile Card Header */}
                  <div className="p-4 bg-slate-50/90">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        {user?.nama?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-xs text-slate-900 truncate">{user?.nama}</h3>
                          <span className="rounded bg-blue-100 text-[#0B3052] text-[9px] font-bold px-1.5 py-0.2 shrink-0">
                            Warga
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">Status Akun:</span>
                      {(() => {
                        const meta =
                          STATUS_VERIFIKASI_META[user?.status_verifikasi ?? "menunggu"] ??
                          STATUS_VERIFIKASI_META.menunggu;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="p-2 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        navigate("/dashboard")
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <LayoutDashboard className="h-4 w-4 text-slate-400 group-hover:text-[#0B3052]" />
                        <span>Dashboard Saya</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        navigate("/laporan/riwayat")
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <History className="h-4 w-4 text-slate-400 group-hover:text-[#0B3052]" />
                        <span>Riwayat Laporan</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="p-2 bg-slate-50/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        logout()
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              )}
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
              <li><Link to="/klaster" className="hover:text-white transition-colors">Klaster Isu</Link></li>
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
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#0B3052] text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  )
}