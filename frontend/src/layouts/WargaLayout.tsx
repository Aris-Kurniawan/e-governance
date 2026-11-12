import { useState, useEffect } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import {
  Menu,
  X,
  LayoutDashboard,
  BarChart2,
  FolderOpen,
  School,
  FileText,
  Info,
  PlusCircle,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export default function WargaLayout() {
  const location = useLocation()
  const { user, roleLabel, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Tutup drawer ketika rute berubah
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Cegah scroll saat mobile drawer terbuka
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

  return (
    <div className="flex min-h-screen flex-col bg-background w-full max-w-full overflow-x-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/dashboard" className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white border border-slate-200/80 p-1 shadow-xs shrink-0 overflow-hidden">
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
              <Nav active={location.pathname === "/dashboard"} to="/dashboard" label="Dashboard" />
              <Nav active={location.pathname === "/laporan/wilayah"} to="/laporan/wilayah" label="Dashboard Wilayah" />
              <Nav active={location.pathname.startsWith("/klaster")} to="/klaster" label="Klaster Isu" />
              <Nav active={location.pathname.startsWith("/sekolah")} to="/sekolah" label="Direktori Sekolah" />
              <Nav active={location.pathname.startsWith("/laporan/riwayat")} to="/laporan/riwayat" label="Riwayat Laporan" />
              <Nav active={location.pathname === "/tentang"} to="/tentang" label="Tentang Data" />
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              asChild
              size="sm"
              className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs cursor-pointer h-9 px-3 sm:px-4 rounded-lg"
            >
              <Link to="/sekolah" className="flex items-center gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Buat Laporan</span>
                <span className="sm:hidden">Lapor</span>
              </Link>
            </Button>

            <div className="hidden md:flex flex-col items-end leading-tight px-1">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{user?.nama || "Warga"}</span>
              <span className="text-[10px] text-blue-700 font-semibold">{roleLabel || "Warga Terdaftar"}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="hidden md:flex cursor-pointer text-slate-600 hover:text-rose-600 text-xs font-semibold h-9"
            >
              Keluar
            </Button>

            {/* Tombol Hamburger Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
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
                <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="h-8 w-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden">
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
                  {user && (
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

              {/* Kartu profil */}
              <div className="mx-4 my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-[#0B3052] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {user?.nama?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">{user?.nama || "Warga"}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{user?.email}</span>
                  </div>
                </div>
                <span className="rounded-lg bg-blue-100 text-[#0B3052] text-[10px] font-bold px-2 py-0.5 shrink-0">
                  {roleLabel ?? "Warga"}
                </span>
              </div>

              {/* Daftar menu — scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
                  Menu Portal Warga
                </span>
                <MobileNav
                  to="/dashboard"
                  label="Dashboard Saya"
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  active={location.pathname === "/dashboard"}
                />
                <MobileNav
                  to="/laporan/wilayah"
                  label="Dashboard Wilayah"
                  icon={<BarChart2 className="h-4 w-4" />}
                  active={location.pathname === "/laporan/wilayah"}
                />
                <MobileNav
                  to="/klaster"
                  label="Klaster Isu Sarpras"
                  icon={<FolderOpen className="h-4 w-4" />}
                  active={location.pathname.startsWith("/klaster")}
                />
                <MobileNav
                  to="/sekolah"
                  label="Direktori Sekolah"
                  icon={<School className="h-4 w-4" />}
                  active={location.pathname.startsWith("/sekolah")}
                />
                <MobileNav
                  to="/laporan/riwayat"
                  label="Riwayat Laporan"
                  icon={<FileText className="h-4 w-4" />}
                  active={location.pathname.startsWith("/laporan/riwayat")}
                />
                <MobileNav
                  to="/tentang"
                  label="Tentang Data"
                  icon={<Info className="h-4 w-4" />}
                  active={location.pathname === "/tentang"}
                />
              </div>

              {/* Tombol aksi di bagian bawah */}
              <div className="px-4 pb-6 pt-3 border-t border-slate-100 space-y-2 shrink-0">
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
              </div>
            </div>
          </div>
        )}


      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* ── Footer ringkas ── */}
      <footer className="border-t border-border bg-surface-alt px-4 sm:px-6 py-4 text-center text-xs text-ink-tertiary w-full overflow-x-hidden">
        &copy; 2026 SIMAKIS Disdik Kab. Lamongan
      </footer>
    </div>
  )
}

function Nav({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-1.5 text-xs lg:text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-ink-secondary hover:bg-surface-alt hover:text-ink"
      }`}
    >
      {label}
    </Link>
  )
}

function MobileNav({
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
