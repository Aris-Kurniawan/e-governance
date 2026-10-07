import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Building2, 
  Lock, 
  KeyRound, 
  Smartphone, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  ShieldAlert, 
  ArrowRight,
  User
} from "lucide-react"

export default function LoginDinas() {
  const navigate = useNavigate()
  const [nip, setNip] = useState("198503242010011008")
  const [password, setPassword] = useState("••••••••••••")
  const [token2Fa, setToken2Fa] = useState("849201")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    navigate("/dinas/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between relative overflow-hidden text-slate-800">
      {/* ── Background Seal / Watermark Graphic ── */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 pointer-events-none opacity-[0.035]">
        <svg width="900" height="900" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="250" cy="250" r="240" stroke="#0B3052" strokeWidth="6" strokeDasharray="12 12" />
          <circle cx="250" cy="250" r="200" stroke="#0B3052" strokeWidth="4" />
          <polygon points="250,50 310,180 450,190 340,290 375,430 250,360 125,430 160,290 50,190 190,180" stroke="#0B3052" strokeWidth="4" />
          <circle cx="250" cy="250" r="110" stroke="#0B3052" strokeWidth="4" />
        </svg>
      </div>

      {/* ── Top Header Strip ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 z-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <img
                src="/logo-simakis-icon.png"
                alt="Logo SIMAKIS"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/logo-simakis.png";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[#0B3052] text-base tracking-tight">SIMAKIS</span>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0B3052] border border-blue-200/70">
                  PORTAL RESMI
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Pemerintah Kabupaten Lamongan · Dinas Pendidikan</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-emerald-800 text-[11px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Server SPBE: Aktif &amp; Terenkripsi</span>
            </div>
            <a 
              href="#panduan" 
              className="hidden sm:flex items-center gap-1 text-slate-600 hover:text-[#0B3052] transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Panduan Teknis</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── Center Login Card ── */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-[480px] bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6">
          {/* Badge & Icon Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>Akses Terbatas: Aparatur Dinas Pendidikan</span>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-[#0B3052] text-white flex items-center justify-center shadow-md">
              <Building2 className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Portal Dinas Pendidikan
              </h1>
              <p className="mt-1 text-xs sm:text-[13px] text-slate-500 leading-relaxed max-w-sm">
                Sistem Audit Partisipatif &amp; Pengambilan Keputusan Sarpras Kecamatan Lamongan
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: NIP */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                NIP (18 Digit) atau Email Dinas Resmi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="19850324xxxxxxxxxx / nama@lamongankab.go.id"
                  className="pl-9 text-xs h-10 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>ⓘ Masukkan 18 digit NIP kepegawaian BKN tanpa tanda hubung/spasi.</span>
              </p>
            </div>

            {/* Field 2: Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800">
                  Kata Sandi Akun <span className="text-rose-500">*</span>
                </label>
                <a href="#helpdesk" className="text-[#0B3052] hover:underline font-semibold text-[11px]">
                  Bantuan Masuk (IT Helpdesk)
                </a>
              </div>
              <div className="relative">
                <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi kedinasan"
                  className="pl-9 pr-9 text-xs h-10 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: 2FA Token */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-[#0B3052]" />
                  Kode Keamanan 2FA / Token Authenticator
                </span>
                <span className="rounded bg-blue-100 text-[#0B3052] font-mono text-[10px] font-bold px-1.5 py-0.5">
                  RFC 6238
                </span>
              </div>
              <Input
                type="text"
                maxLength={6}
                value={token2Fa}
                onChange={(e) => setToken2Fa(e.target.value)}
                placeholder="Contoh: 849201"
                className="text-center font-mono font-bold tracking-[0.3em] text-sm sm:text-base h-11 bg-white border-blue-200 rounded-lg text-slate-900"
                required
              />
              <p className="text-[10px] text-slate-500 text-center">
                Buka aplikasi Google Authenticator atau periksa pesan WhatsApp kedinasan terdaftar.
              </p>
            </div>

            {/* Remember session & Security Protocol */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                <Checkbox
                  checked={rememberSession}
                  onCheckedChange={(c) => setRememberSession(!!c)}
                />
                <span className="text-[11px] font-medium">Ingat sesi kedinasan (12 jam kerja)</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">TLS 1.3 · AES-256</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <span>Memverifikasi Kredensial...</span>
              ) : (
                <>
                  <span>Masuk ke Panel Verifikator</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Legal Notice Card */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
              <Lock className="h-4 w-4 text-[#0B3052] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Pemberitahuan Akuntabilitas Hukum (UU ITE):</strong> Sistem ini dilindungi UU No. 11/2008 &amp; UU No. 27/2022. Segala aktivitas masuk, verifikasi mismatch sarana, dan alokasi perbaikan tercatat otomatis pada <strong>Log Audit PDP</strong> terikat NIP aparatur.
              </div>
            </div>

            {/* Switch to Citizen Portal */}
            <div className="pt-2 text-center text-xs text-slate-500">
              Bukan aparatur dinas pendidikan?{" "}
              <Link to="/" className="font-bold text-[#0B3052] hover:underline">
                Beralih ke Portal Warga &amp; Komite Sekolah
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200/80 px-6 py-4 text-center text-xs text-slate-500 z-10">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 SIMAKIS · Inisiatif Riset Kolaboratif PSDKU Lamongan PENS &amp; Dinas Pendidikan Kab. Lamongan</span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Standar Keamanan SPBE KemenPAN-RB</span>
            <span>•</span>
            <span>Kepatuhan UU PDP No. 27/2022</span>
            <span>•</span>
            <span>Sertifikasi Tanda Tangan BSrE / BSSN</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
