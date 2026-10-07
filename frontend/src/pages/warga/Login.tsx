import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/context/AuthContext"
import { ShieldAlert, Info } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect")
  const action = searchParams.get("action")
  const registered = searchParams.get("registered")

  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <p className="text-overline font-semibold uppercase text-primary">Akses Akun</p>
      <h1 className="mt-2 text-h1 font-bold text-ink">Masuk ke SIMAKIS</h1>
      <p className="mt-2 text-body-sm text-ink-secondary">
        Gunakan identitas yang telah terdaftar untuk melanjutkan.
      </p>

      {/* Banner jika diarahkan karena pelaporan */}
      {redirect && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-sm">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Autentikasi Diperlukan</span>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Anda harus masuk ke akun terlebih dahulu untuk mengirimkan laporan ketidaksesuaian sarana sekolah.
            </p>
          </div>
        </div>
      )}

      {/* Banner jika baru selesai registrasi */}
      {registered && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 shadow-sm">
          <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Pendaftaran Berhasil</span>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              Akun Anda telah tervalidasi. Silakan masuk dengan NIK dan kata sandi Anda.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="text-body-sm font-medium text-ink">
            Email Terdaftar <span className="text-danger-text">*</span>
          </label>
          <Input
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <label className="text-body-sm font-medium text-ink">
            Kata Sandi <span className="text-danger-text">*</span>
          </label>
          <Input
            type="password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <a href="#" className="text-body-sm text-primary hover:underline">Lupa Kata Sandi?</a>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" defaultChecked />
          <label htmlFor="remember" className="text-body-sm text-ink-secondary">Ingat sesi masuk saya di perangkat ini (30 hari)</label>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full bg-[#0B3052] hover:bg-[#07213A] text-white cursor-pointer" disabled={loading}>
          {loading ? "Memvalidasi..." : "Masuk ke Akun"}
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-ink-secondary">
        Belum memiliki akun warga terverifikasi?{" "}
        <Link
          to={redirect ? `/registrasi?redirect=${encodeURIComponent(redirect)}${action ? `&action=${action}` : ""}` : "/registrasi"}
          className="font-semibold text-primary hover:underline"
        >
          Daftar Akun Baru
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-ink-tertiary">
        Kepatuhan UU PDP No. 27/2022 &middot; Enkripsi AES-256
      </p>
    </div>
  )
}