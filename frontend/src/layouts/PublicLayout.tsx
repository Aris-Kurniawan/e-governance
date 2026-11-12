import { useState, useRef, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  History,
  LogOut,
  ArrowRight,
  Menu,
  X,
  Home,
  BarChart2,
  FolderOpen,
  School,
  FileText,
  Info,
  PlusCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

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
}

export default function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, role, roleLabel, logout } = useAuth()

  const isDinasStaff = role === "admin" || role === "verifikator_dinas" || role === "kepala_dinas"
  const dashboardTarget = isDinasStaff ? "/dinas/dashboard" : "/dashboard"

  // ── Menu akun dropdown ─────────────────────
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountContainerRef = useRef<HTMLDivElement>(null)

  // ── Mobile Hamburger Menu state ─────────────────────
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Tutup menu mobile ketika rute berpindah
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsAccountOpen(false)
  }, [location.pathname])

  // Cegah scroll body ketika drawer menu mobile terbuka
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

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
    <div className="flex min-h-screen flex-col bg-white w-full max-w-full overflow-x-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden">
                <img
                  src="/logo-simakis-icon.png"
                  alt="Logo SIMAKIS"
                  className="h-full w-full object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = "/logo-simakis.png"
                  }}
                />
              </div>
              <div className="leading-tight">
                <span className="text-base font-extrabold text-[#0B3052] tracking-tight">SIMAKIS</span>
                <span className="block text-[10px] sm:text-[11px] font-medium text-slate-400">Kec. Lamongan</span>
              </div>
            </Link>

            {/* Navigasi Desktop */}
            <nav className="hidden items-center gap-1 md:flex lg:gap-1.5">
              <NavLink to="/" label="Home" active={location.pathname === "/"} />
              <NavLink to="/laporan/wilayah" label="Dashboard Wilayah" active={location.pathname === "/laporan/wilayah"} />
              <NavLink to="/klaster" label="Klaster Isu" active={location.pathname.startsWith("/klaster")} />
              <NavLink to="/sekolah" label="Direktori Sekolah" active={location.pathname === "/sekolah"} />
              <NavLink to="/laporan/riwayat" label="Riwayat Laporan" active={location.pathname === "/laporan/riwayat"} />
              <NavLink to="/tentang" label="Tentang Data" active={location.pathname === "/tentang"} />
            </nav>
          </div>

          {/* Right Area: Auth & Hamburger Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={accountContainerRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountOpen((prev) => !prev)}
                  title="Menu Akun Warga"
                  className={`flex items-center gap-2 sm:gap-2.5 rounded-xl border px-2.5 sm:px-3 py-1.5 transition-colors cursor-pointer ${
                    isAccountOpen
                      ? "bg-slate-100 border-slate-300"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80"
                  }`}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B3052] text-[11px] font-bold text-white shadow-xs">
                    {user?.nama?.charAt(0) || "U"}
                  </div>
                  <div className="leading-tight hidden sm:block text-left">
                    <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px] lg:max-w-[150px]">
                      {user?.nama}
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold">{roleLabel ?? "Warga Terdaftar"}</span>
                  </div>
                </button>

                {/* Account Flyout Dropdown Desktop */}
                {isAccountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100">
                    {/* Profile Card Header */}
                    <div className="p-4 bg-slate-50/90">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
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
                            STATUS_VERIFIKASI_META.menunggu
                          return (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="p-2 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountOpen(false)
                          navigate(dashboardTarget)
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
              <div className="hidden sm:flex items-center gap-2.5">
                <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs font-semibold cursor-pointer">
                  <Link to="/login">Masuk</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#0B3052] hover:bg-[#07213A] text-white text-xs font-semibold rounded-lg px-3.5 shadow-xs cursor-pointer">
                  <Link to="/registrasi">Daftar Akun</Link>
                </Button>
              </div>
            )}

            {/* Tombol Hamburger Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer — Sidebar Slide-in Kiri ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[9999] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {/* Overlay blur */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel sidebar kiri */}
          <div
            className="absolute left-0 top-0 h-full w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
              {/* Header panel: logo + avatar + tombol X */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
                <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="h-8 w-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden">
                    <img
                      src="/logo-simakis-icon.png"
                      alt="Logo SIMAKIS"
                      className="h-full w-full object-contain rounded-full"
                      onError={(e) => { e.currentTarget.src = "/logo-simakis.png" }}
                    />
                  </div>
                  <div className="leading-tight">
                    <span className="text-sm font-extrabold text-[#0B3052] tracking-tight">SIMAKIS</span>
                    <span className="block text-[10px] font-medium text-slate-400">Kec. Lamongan</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {isAuthenticated && user && (
                    <div className="h-7 w-7 rounded-lg bg-[#0B3052] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {user.nama?.charAt(0) || "U"}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Tutup menu"
                  >
                    <X className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Kartu profil jika sudah login */}
              {isAuthenticated && user && (
                <div className="mx-4 my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-[#0B3052] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {user.nama?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 block truncate">{user.nama}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{user.email}</span>
                    </div>
                  </div>
                  <span className="rounded-lg bg-blue-100 text-[#0B3052] text-[10px] font-bold px-2 py-0.5 shrink-0">
                    {roleLabel ?? "Warga"}
                  </span>
                </div>
              )}

              {/* Daftar menu — scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
                  Menu Utama
                </span>
                <MobileNavLink
                  to="/"
                  label="Home / Beranda"
                  icon={<Home className="h-4 w-4" />}
                  active={location.pathname === "/"}
                />
                <MobileNavLink
                  to="/laporan/wilayah"
                  label="Dashboard Wilayah"
                  icon={<BarChart2 className="h-4 w-4" />}
                  active={location.pathname === "/laporan/wilayah"}
                />
                <MobileNavLink
                  to="/klaster"
                  label="Klaster Isu Sarpras"
                  icon={<FolderOpen className="h-4 w-4" />}
                  active={location.pathname.startsWith("/klaster")}
                />
                <MobileNavLink
                  to="/sekolah"
                  label="Direktori Sekolah"
                  icon={<School className="h-4 w-4" />}
                  active={location.pathname === "/sekolah"}
                />
                <MobileNavLink
                  to="/laporan/riwayat"
                  label="Riwayat Laporan Publik"
                  icon={<FileText className="h-4 w-4" />}
                  active={location.pathname === "/laporan/riwayat"}
                />
                <MobileNavLink
                  to="/tentang"
                  label="Tentang Data"
                  icon={<Info className="h-4 w-4" />}
                  active={location.pathname === "/tentang"}
                />
              </div>

              {/* Tombol aksi di bagian bawah */}
              <div className="px-4 pb-6 pt-3 border-t border-slate-100 space-y-2 shrink-0">
                {isAuthenticated ? (
                  <>
                    <Button
                      asChild
                      className="w-full bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-11 rounded-xl justify-center shadow-xs"
                    >
                      <Link to="/sekolah" className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Buat Laporan Baru</span>
                      </Link>
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        logout()
                      }}
                      className="w-full h-11 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" className="w-full text-xs font-semibold h-11 rounded-xl border-slate-200">
                      <Link to="/login">Masuk</Link>
                    </Button>
                    <Button asChild className="w-full bg-[#0B3052] hover:bg-[#07213A] text-white text-xs font-semibold h-11 rounded-xl shadow-xs">
                      <Link to="/registrasi">Daftar Akun</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#07162C] text-slate-400 border-t border-slate-800 w-full overflow-x-hidden">
        <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 px-4 sm:px-6 py-10 sm:py-14 text-sm md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm overflow-hidden shrink-0">
                <img
                  src="/logo-simakis-icon.png"
                  alt="Logo SIMAKIS"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/logo-simakis.png"
                  }}
                />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">SIMAKIS</span>
            </div>
            <p className="leading-relaxed text-slate-400 text-xs sm:text-sm">
              Sistem Informasi Masukan dan Klasterisasi Isu Sarpras — audit
              partisipatif sekolah di Kecamatan Lamongan, Kabupaten Lamongan.
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
              <li><Link to="/tentang" className="hover:text-white transition-colors">Perlindungan Data Pribadi</Link></li>
              <li><Link to="/tentang" className="hover:text-white transition-colors">Ketentuan Layanan</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Kontak Dinas</h4>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
              Dinas Pendidikan Kab. Lamongan<br />
              Kecamatan Lamongan
            </p>
            <Link
              to="/dinas/login"
              className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Portal Dinas (Aparatur)
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-slate-500">
          &copy; 2026 SIMAKIS &middot; Dibuat di Lamongan
        </div>
      </footer>
    </div>
  )
}

function NavLink({ to, label, active = false }: { to: string; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs lg:text-sm font-medium transition-colors ${
        active
          ? "bg-[#0B3052] text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  )
}

function MobileNavLink({
  to,
  label,
  icon,
  active = false,
}: {
  to: string
  label: string
  icon: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
        active
          ? "bg-[#0B3052] text-white"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className={active ? "text-white" : "text-slate-400"}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
