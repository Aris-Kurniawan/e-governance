import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthField } from "@/components/auth/AuthField"
import { useAuth } from "@/context/AuthContext"
import {
  Building2,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react"

/**
 * F4.1 — Login panel dinas dengan estetika split-dark yang diselaraskan
 * secara presisi dengan halaman login warga (`AuthLayout` & `Login.tsx`).
 */
export default function LoginDinas() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const identitas = email.trim()
    if (!identitas || !password) return

    if (!identitas.includes("@")) {
      setError("Masukkan email dinas yang terdaftar (format: nama@simakis.id).")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const profile = await login(identitas, password)
      const dinas = ["verifikator_dinas", "kepala_dinas", "admin"]
      navigate(dinas.includes(profile.role) ? "/dinas/dashboard" : "/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Periksa email & kata sandi.")
    } finally {
      setLoading(false)
    }
  }

  const handleIsiAkunUji = (akunEmail: string, akunPass: string) => {
    setEmail(akunEmail)
    setPassword(akunPass)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#0B1726] text-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── Kiri: Navigasi + Form Login Dinas ── */}
      <div className="relative flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14 xl:px-20 justify-between">
        {/* Topbar: Brand Titik + Navigasi */}
        <div className="sticky top-0 z-20 -mx-6 mb-2 bg-[#0B1726]/95 backdrop-blur px-6 py-3 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14 xl:-mx-20 xl:px-20 flex items-center justify-between">
          <Link to="/dinas/dashboard" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-full bg-white border border-white/40 p-1 flex items-center justify-center shadow-sm shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
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
              <span className="text-sm font-extrabold tracking-tight text-white block">
                SIMAKIS<span className="text-blue-400">.</span>
              </span>
              <span className="text-[10px] text-white/50 block font-medium">Portal Kedinasan</span>
            </div>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-xs font-semibold">
            <Link to="/dinas/dashboard" className="text-white/55 hover:text-white transition-colors">
              Beranda
            </Link>
            <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 text-[11px] font-bold">
              Portal Dinas
            </span>
          </nav>
        </div>

        {/* Konten Form */}
        <div className="flex flex-1 items-center justify-center lg:justify-start my-auto">
          <div className="w-full max-w-[430px] py-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-3">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Aparatur Dinas Pendidikan</span>
            </div>

            <h1 className="text-[32px] sm:text-[38px] font-extrabold leading-[1.12] tracking-tight text-white">
              Portal Dinas<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-3 text-sm text-white/55 leading-relaxed">
              Panel verifikasi, audit sarpras, dan tindak lanjut isu fasilitas sekolah Kecamatan Lamongan.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <AuthField
                label="Email Dinas Resmi"
                type="email"
                placeholder="nama@simakis.id"
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <AuthField
                label="Kata Sandi Akun"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan kata sandi dinas"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="h-8 w-8 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                    title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="remember-dinas"
                    checked={rememberSession}
                    onCheckedChange={(checked) => setRememberSession(Boolean(checked))}
                    className="border-white/25 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <label htmlFor="remember-dinas" className="text-xs text-white/55 cursor-pointer">
                    Ingat sesi kedinasan (30 hari)
                  </label>
                </div>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-white/55 hover:text-blue-400 transition-colors"
                >
                  Bukan aparatur?
                </Link>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200 flex items-start gap-2.5"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="mt-2 w-full h-[52px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Memverifikasi Kredensial…" : "Masuk ke Panel Dinas"}
              </Button>

              {/* Pintasan Akun Uji Cepat */}
              <div className="pt-4 border-t border-white/10 mt-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Akun Pengujian Sistem
                  </span>
                  <span className="text-[10px] text-white/35">Klik untuk mengisi</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleIsiAkunUji("bambang@simakis.id", "Dinas123!")}
                    className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs transition-colors cursor-pointer text-left"
                  >
                    <div className="font-bold text-blue-300">Bambang H., S.T.</div>
                    <div className="text-[10px] text-white/45 truncate">Verifikator Sarpras</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIsiAkunUji("kadis@simakis.id", "Dinas123!")}
                    className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs transition-colors cursor-pointer text-left"
                  >
                    <div className="font-bold text-emerald-300">Kepala Dinas</div>
                    <div className="text-[10px] text-white/45 truncate">Pengambil Kebijakan</div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-white/30 pt-6 border-t border-white/5">
          <span>&copy; 2026 Disdik Kab. Lamongan &middot; SPBE Terpadu</span>
          <span>Kepatuhan UU PDP No. 27/2022 &middot; Enkripsi AES-256</span>
        </footer>
      </div>

      {/* ── Kanan: Foto Institusional + Overlay + Badge SPBE ── */}
      <aside className="relative hidden lg:block overflow-hidden bg-[#0E1F33]">
        <img
          src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1600&q=80"
          alt="Gedung Sarpras Sekolah Lamongan"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Overlay Gelap */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1726] via-[#0B1726]/50 to-[#0B1726]/70" />
        <div className="absolute inset-0 bg-[#0B1726]/40" />

        {/* Garis Kurva Putus-Putus Khas SIMAKIS */}
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

        {/* Floating Security Badge Card */}
        <div className="absolute top-10 right-10 max-w-sm rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">AUTENTIKASI APARATUR SPBE</div>
              <div className="text-[11px] text-white/60">Hak akses tersertifikasi RBAC &amp; Audit Trail</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/70 leading-relaxed border-t border-white/10 pt-2.5">
            Sistem pengawasan berkala sarana dan prasarana pendidikan berbasis pangkalan data terintegrasi Dapodikdasmen.
          </p>
        </div>
      </aside>
    </div>
  )
}
