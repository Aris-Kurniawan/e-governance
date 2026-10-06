import { Link, Outlet, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export default function WargaLayout() {
  const location = useLocation()
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200/80 p-1.5 shadow-sm shrink-0 overflow-hidden">
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

            <nav className="hidden items-center gap-1 md:flex">
              <Nav active={location.pathname === "/dashboard"} to="/dashboard" label="Dashboard" />
              <Nav active={location.pathname.startsWith("/sekolah")} to="/sekolah" label="Direktori Sekolah" />
              <Nav active={location.pathname.startsWith("/laporan/riwayat")} to="/laporan/riwayat" label="Riwayat Laporan" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-body-sm text-ink-secondary md:block">{user?.nama || "Siti Aminah"}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="cursor-pointer">
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ringkas ── */}
      <footer className="border-t border-border bg-surface-alt px-6 py-4 text-center text-xs text-ink-tertiary">
        &copy; 2026 SIMAKIS &middot; PSDKP Lamongan PENS &middot; Disdik Kab. Lamongan
      </footer>
    </div>
  )
}

function Nav({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-ink-secondary hover:bg-surface-alt hover:text-ink"
      }`}
    >
      {label}
    </Link>
  )
}