import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthField } from "@/components/auth/AuthField"
import { useAuth } from "@/context/AuthContext"
import { ShieldAlert, Info, Mail, Eye, EyeOff } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect")
  const action = searchParams.get("action")
  const registered = searchParams.get("registered")

  const { login } = useAuth()
  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registrasiLink = redirect
    ? `/registrasi?redirect=${encodeURIComponent(redirect)}${action ? `&action=${action}` : ""}`
    : "/registrasi"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    try {
      // Kontrak INTERFACES.md §1: login memakai email + password.
      await login(email.trim(), password)
      if (redirect) {
        const destination = action
          ? `${redirect}${redirect.includes("?") ? "&" : "?"}action=${action}`
          : redirect
        navigate(destination)
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      // Pesan dari backend sudah human-readable (INTERFACES.md §0.1).
      setError(err instanceof Error ? err.message : "Gagal masuk. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-400">
        Akses Akun
      </p>
      <h1 className="mt-3 text-[32px] sm:text-[38px] font-extrabold leading-[1.12] tracking-tight text-white">
        Masuk ke akun<span className="text-blue-400">.</span>
      </h1>
      <p className="mt-3 text-sm text-white/55">
        Belum memiliki akun warga?{" "}
        <Link
          to={registrasiLink}
          className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          Daftar sekarang
        </Link>
      </p>

      {/* Banner jika diarahkan karena pelaporan */}
      {redirect && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3.5 text-xs text-amber-200">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Autentikasi Diperlukan</span>
            <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
              Anda harus masuk ke akun terlebih dahulu untuk mengirimkan laporan
              ketidaksesuaian sarana sekolah.
            </p>
          </div>
        </div>
      )}

      {/* Banner jika baru selesai registrasi */}
      {registered && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3.5 text-xs text-emerald-200">
          <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Pendaftaran Berhasil</span>
            <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-relaxed">
              Akun Anda telah tervalidasi. Silakan masuk dengan email terdaftar
              dan kata sandi Anda.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <AuthField
          label="Email Terdaftar"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthField
          label="Kata Sandi"
          type={showPassword ? "text" : "password"}
          placeholder="Masukkan kata sandi"
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
          <a
            href="#"
            className="text-xs font-semibold text-white/55 hover:text-blue-400 transition-colors"
          >
            Lupa Kata Sandi?
          </a>
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox id="remember" defaultChecked className="border-white/25 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
            <label htmlFor="remember" className="text-xs text-white/55 cursor-pointer">
              Ingat sesi saya (30 hari)
            </label>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200"
          >
            {error}
          </div>
        )}

        {/* Baris tombol gaya mockup: metode sekunder + aksi utama */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            to={registrasiLink}
            className="h-12 px-6 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-bold flex items-center justify-center transition-colors shrink-0"
          >
            Daftar
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="h-12 flex-1 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-colors cursor-pointer"
          >
            {loading ? "Memvalidasi..." : "Masuk ke Akun"}
          </Button>
        </div>
      </form>
    </div>
  )
}
