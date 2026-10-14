import { useEffect } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"

/**
 * Shell autentikasi warga (/login & /registrasi) — gaya mockup split-dark:
 * kiri panel gelap berisi navigasi mini + form (Outlet), kanan foto
 * sekolah dengan garis pemisah SVG putus-putus dan watermark logo.
 */
export default function AuthLayout() {
  const location = useLocation()

  // Reset scroll antar-halaman auth: halaman registrasi yang panjang sering
  // meninggalkan offset scroll, sehingga saat pindah ke /login yang pendek
  // pengguna langsung "mendarat" di footer.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-[#0B1726] text-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── Kiri: Navigasi + Form ── */}
      <div className="relative flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14 xl:px-20">
        {/* Topbar ala mockup: titik brand + nav Beranda / Masuk / Daftar */}
        <div className="sticky top-0 z-20 -mx-6 mb-2 bg-[#0B1726]/95 backdrop-blur px-6 py-3 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14 xl:-mx-20 xl:px-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.85)] transition-transform group-hover:scale-110" />
            <span className="text-sm font-extrabold tracking-tight text-white">
              SIMAKIS<span className="text-blue-400">.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-white/55">
            <Link to="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <Link
              to="/login"
              className={`transition-colors ${
                location.pathname === "/login"
                  ? "text-white"
                  : "text-white/55 hover:text-white"
              }`}
            >
              Masuk
            </Link>
            <Link
              to="/registrasi"
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                location.pathname === "/registrasi"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white/10 text-white/85 hover:bg-white/15 hover:text-white"
              }`}
            >
              Daftar
            </Link>
          </nav>
        </div>

        {/* Konten form */}
        <div className="flex flex-1 items-center justify-center lg:justify-start">
          <div className="w-full max-w-[430px] py-10">
            <Outlet />
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/30">
          <span>&copy; 2026 SIMAKIS &middot; Disdik Kab. Lamongan</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Kepatuhan UU PDP No. 27/2022 &middot; Enkripsi AES-256</span>
        </footer>
      </div>

      {/* ── Kanan: Foto + garis putus-putus + watermark ── */}
      <aside className="relative hidden lg:block overflow-hidden bg-[#0E1F33]">
        <img
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=70"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
        {/* Overlay gelap agar menyatu dengan panel kiri */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1726] via-[#0B1726]/35 to-[#0B1726]/55" />
        <div className="absolute inset-0 bg-[#0B1726]/25" />

        {/* Garis kurva putus-putus pemisah (sesuai mockup) */}
        <svg
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-y-0 left-0 h-full w-24 xl:w-28"
        >
          <path
            d="M72 0 C 18 130, 92 270, 42 410 C 2 520, 84 650, 52 800"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.2"
            strokeDasharray="7 9"
            strokeLinecap="round"
          />
        </svg>

        {/* Watermark logo kanan bawah */}
        <div className="absolute bottom-7 right-8">
          <img
            src="/logo-simakis-icon.png"
            alt="SIMAKIS"
            className="h-14 w-14 object-contain opacity-90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      </aside>
    </div>
  )
}
