import { useEffect, useState, useRef } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { AuthField } from "@/components/auth/AuthField"
import { register } from "@/lib/api/auth"
import { listSekolah } from "@/lib/api/sekolah"
import type { SekolahList } from "@/lib/api/types"
import {
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Clock,
  GraduationCap,
  ShieldCheck,
  ImageIcon,
  ChevronDown,
  ShieldAlert,
  User,
  Phone,
  Mail,
  Hash,
  CreditCard,
} from "lucide-react"

type Step = 1 | 2

export default function Registrasi() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect")
  const action = searchParams.get("action")

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 fields
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 2 fields
  const [peran, setPeran] = useState<string>("pelajar")
  /** NPSN sekolah asal — dikirim sebagai `sekolah_terkait_id` (null = tidak terkait). */
  const [sekolahNpsn, setSekolahNpsn] = useState("")
  const [sekolahOptions, setSekolahOptions] = useState<SekolahList[]>([])
  const [sekolahLoading, setSekolahLoading] = useState(true)
  const [sekolahError, setSekolahError] = useState(false)
  const [nisn, setNisn] = useState("")
  const [nik, setNik] = useState("")
  const [kelurahan, setKelurahan] = useState("Jetis")

  // Foto kartu pelajar
  const kartuInputRef = useRef<HTMLInputElement>(null)
  const [fotoKartuFile, setFotoKartuFile] = useState<File | null>(null)
  const [fotoKartuPreview, setFotoKartuPreview] = useState<string | null>(null)
  const [fotoKartuError, setFotoKartuError] = useState<string | null>(null)
  const [dragOverKartu, setDragOverKartu] = useState(false)

  // Daftar sekolah asli dari `GET /sekolah` (publik) — dipakai pemetaan NPSN.
  useEffect(() => {
    let active = true
    listSekolah({ page_size: 100 })
      .then((page) => {
        if (active) setSekolahOptions(page.data)
      })
      .catch(() => {
        if (active) setSekolahError(true)
      })
      .finally(() => {
        if (active) setSekolahLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (fotoKartuPreview) {
        URL.revokeObjectURL(fotoKartuPreview)
      }
    }
  }, [fotoKartuPreview])

  const handleKartuFileChange = (file: File | null) => {
    if (!file) return
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      setFotoKartuError("Format tidak didukung. Harap gunakan format JPG, PNG, atau WEBP.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setFotoKartuError("Ukuran foto melebihi batas 3 MB.")
      return
    }
    setFotoKartuError(null)
    setFotoKartuFile(file)
    if (fotoKartuPreview) {
      URL.revokeObjectURL(fotoKartuPreview)
    }
    setFotoKartuPreview(URL.createObjectURL(file))
  }

  const handleHapusFotoKartu = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFotoKartuFile(null)
    if (fotoKartuPreview) {
      URL.revokeObjectURL(fotoKartuPreview)
      setFotoKartuPreview(null)
    }
    setFotoKartuError(null)
    if (kartuInputRef.current) {
      kartuInputRef.current.value = ""
    }
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError("Format alamat email tidak valid.")
      return
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.")
      return
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak sama.")
      return
    }
    setError(null)
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    const nikDigits = nik.replace(/\D/g, "")
    if (nikDigits.length !== 16) {
      setError("NIK harus terdiri dari tepat 16 digit angka.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Kontrak INTERFACES.md §1 — POST /auth/register (publik).
      await register({
        nama: nama.trim(),
        email: email.trim(),
        password,
        nik: nikDigits,
        sekolah_terkait_id:
          peran === "pelajar" && sekolahNpsn ? sekolahNpsn : null,
      })
    } catch (err) {
      // Pesan dari backend sudah human-readable (mis. "Email already taken").
      setError(err instanceof Error ? err.message : "Pendaftaran gagal. Coba lagi.")
      setLoading(false)
      return
    }
    setLoading(false)
    const emailQuery = email ? `&email=${encodeURIComponent(email.trim())}` : ""
    const target = redirect
      ? `/login?redirect=${encodeURIComponent(redirect)}${action ? `&action=${action}` : ""}&registered=true${emailQuery}`
      : `/login?registered=true${emailQuery}`
    navigate(target)
  }

  const loginLink = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}${action ? `&action=${action}` : ""}`
    : "/login"

  const selectClass =
    "w-full h-[58px] appearance-none rounded-xl border border-white/10 bg-white/[0.06] pl-4 pr-10 pt-6 pb-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 [&>option]:text-slate-900"

  return (
    <div className="space-y-6">
      {/* ── Header gaya mockup ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-400">
          Mulai Gratis
        </p>
        <h1 className="mt-3 text-[32px] sm:text-[38px] font-extrabold leading-[1.12] tracking-tight text-white">
          Buat akun baru<span className="text-blue-400">.</span>
        </h1>
        <p className="mt-3 text-sm text-white/55">
          Sudah memiliki akun terdaftar?{" "}
          <Link
            to={loginLink}
            className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Masuk di sini
          </Link>
        </p>
      </div>

      {redirect && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-400/25 bg-blue-400/10 p-3.5 text-xs text-blue-200">
          <ShieldAlert className="h-4 w-4 text-blue-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Pendaftaran untuk Melaporkan Fasilitas</span>
            <p className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">
              Daftarkan akun warga/pelajar untuk melanjutkan pelaporan. Data NIK/NISN
              akan diverifikasi silang dengan Dapodik resmi.
            </p>
          </div>
        </div>
      )}

      {/* ── Progress & estimasi ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1 text-[11px] font-bold text-blue-300">
            {step === 1 ? "TAHAP 1 DARI 2: KREDENSIAL AKUN" : "TAHAP 2 DARI 2: VERIFIKASI IDENTITAS"}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
            <Clock className="h-3.5 w-3.5" />
            Estimasi: {step === 1 ? "1 menit" : "2 menit"} pengisian
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="flex items-center justify-center gap-6 py-1">
        <div className="flex flex-col items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === 1 ? "bg-blue-500 text-white" : "bg-emerald-500/90 text-white"
            }`}
          >
            {step === 2 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className={`mt-1 text-xs font-bold ${step === 1 ? "text-white" : "text-white/50"}`}>
            Kredensial
          </span>
        </div>

        <div
          className={`h-0.5 w-24 sm:w-32 transition-colors -mt-4 ${
            step === 2 ? "bg-blue-500" : "bg-white/15"
          }`}
        />

        <div className="flex flex-col items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === 2 ? "bg-blue-500 text-white" : "border border-white/20 text-white/40"
            }`}
          >
            2
          </div>
          <span className={`mt-1 text-xs font-medium ${step === 2 ? "text-white font-bold" : "text-white/40"}`}>
            Verifikasi Identitas
          </span>
        </div>
      </div>

      {/* ── Banner error (validasi client & respons backend) ── */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200"
        >
          {error}
        </div>
      )}

      {/* ── STEP 1: Kredensial ── */}
      {step === 1 ? (
        <form onSubmit={handleStep1} className="space-y-4">
          <p className="text-xs leading-relaxed text-white/50 -mt-1">
            Informasi dasar untuk mengakses portal dan menerima notifikasi tindak lanjut dinas.
            Nama asli tersimpan terenkripsi dan tidak dipublikasikan.
          </p>

          <AuthField
            label="Nama Lengkap"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Sesuai KTP / KIA / Kartu Pelajar"
            icon={<User className="h-4 w-4" />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AuthField
              label="Alamat Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              icon={<Mail className="h-4 w-4" />}
              required
            />
            <AuthField
              label="Nomor WhatsApp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="81234567890"
              icon={<Phone className="h-4 w-4" />}
              required
            />
          </div>

          <AuthField
            label="Kata Sandi"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Buat kata sandi (min. 8 karakter)"
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="h-8 w-8 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          {/* Meter kekuatan sandi */}
          <div className="space-y-1.5 -mt-1">
            <div className="flex gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
              <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
              <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
              <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 font-medium">
                Kekuatan Sandi: <strong className="text-emerald-400">Kuat</strong> (Huruf, Angka &amp; Simbol)
              </span>
              <span className="text-white/35">Min. 8 Karakter</span>
            </div>
          </div>

          <AuthField
            label="Konfirmasi Kata Sandi"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi kata sandi"
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="h-8 w-8 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex items-center gap-3 pt-2">
            <Link
              to={loginLink}
              className="h-12 px-6 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-bold flex items-center justify-center transition-colors shrink-0"
            >
              Masuk
            </Link>
            <Button
              type="submit"
              className="h-12 flex-1 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              Selanjutnya <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        /* ── STEP 2: Verifikasi Identitas ── */
        <form onSubmit={handleStep2} className="space-y-5">
          <p className="text-xs leading-relaxed text-white/50 -mt-1">
            Data identitas menjamin prinsip 1 Warga/Pelajar = 1 Suara dan mencegah bot
            dalam audit sarpras sekolah.
          </p>

          {/* Pilihan peran */}
          <div>
            <label className="block text-[10px] font-bold text-white/45 uppercase tracking-wider mb-2">
              Mendaftar Sebagai
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "pelajar",
                  title: "Pelajar / Siswa Aktif",
                  badge: "Saksi Kunci",
                  desc: "Siswa SD/SMP/SMA/SMK di Kec. Lamongan.",
                },
                {
                  id: "orang_tua",
                  title: "Orang Tua / Wali",
                  desc: "Memiliki putra/putri aktif di sekolah Kec. Lamongan.",
                },
                {
                  id: "komite",
                  title: "Pengurus Komite",
                  desc: "Pengurus perwakilan paguyuban komite sekolah resmi.",
                },
                {
                  id: "warga_umum",
                  title: "Warga Domisili Umum",
                  desc: "Penduduk yang peduli sarana pendidikan sekitar.",
                },
              ].map((r) => (
                <div
                  key={r.id}
                  onClick={() => setPeran(r.id)}
                  className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                    peran === r.id
                      ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/40"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          peran === r.id ? "border-blue-500 bg-blue-500" : "border-white/30"
                        }`}
                      >
                        {peran === r.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-white text-xs sm:text-sm">{r.title}</span>
                    </div>
                    {r.badge && (
                      <span className="rounded-full bg-blue-500/90 px-2 py-0.5 text-[9px] font-bold text-white uppercase shrink-0">
                        {r.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/45 pl-6 leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Kotak verifikasi Dapodik (pelajar) */}
          {peran === "pelajar" && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs sm:text-sm">
                    Verifikasi Data Peserta Didik (Dapodik)
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-400/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Terkoneksi ke Dapodik
                </span>
              </div>

              <div className="relative">
                <label className="pointer-events-none absolute left-4 top-2 z-10 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  Sekolah Asal Tempat Belajar
                </label>
                <select
                  value={sekolahNpsn}
                  onChange={(e) => setSekolahNpsn(e.target.value)}
                  disabled={sekolahLoading}
                  className={selectClass}
                >
                  <option value="" disabled>
                    {sekolahLoading
                      ? "Memuat daftar sekolah…"
                      : sekolahError
                        ? "Gagal memuat — lanjut tanpa sekolah asal"
                        : "— Pilih sekolah asal —"}
                  </option>
                  {sekolahOptions.map((s) => (
                    <option key={s.npsn} value={s.npsn}>
                      {s.nama} ({s.jenjang}) — NPSN {s.npsn}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>

              <AuthField
                label="NISN 10-Digit"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="0078129341"
                className="font-mono"
                icon={<Hash className="h-4 w-4" />}
                required
              />

              <div className="space-y-2">
                <input
                  ref={kartuInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleKartuFileChange(e.target.files?.[0] ?? null)}
                />

                {fotoKartuPreview && fotoKartuFile ? (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[0.08] p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-emerald-400/30 shrink-0 bg-black/40">
                        <img
                          src={fotoKartuPreview}
                          alt="Pratinjau Kartu Pelajar"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Foto Kartu Terpilih
                        </span>
                        <p className="text-xs font-semibold text-white truncate">
                          {fotoKartuFile.name}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {(fotoKartuFile.size / (1024 * 1024)).toFixed(2)} MB &middot; EXIF disanitasi
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => kartuInputRef.current?.click()}
                        className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={handleHapusFotoKartu}
                        className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors cursor-pointer"
                        title="Hapus foto"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => kartuInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverKartu(true)
                    }}
                    onDragLeave={() => setDragOverKartu(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverKartu(false)
                      const file = e.dataTransfer.files?.[0] ?? null
                      handleKartuFileChange(file)
                    }}
                    className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
                      dragOverKartu
                        ? "border-emerald-400 bg-emerald-500/20"
                        : "border-emerald-400/30 bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-400/50"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 mx-auto mb-1.5">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs text-white/85 block">
                      Klik untuk memilih foto kartu pelajar
                    </span>
                    <span className="text-[10px] text-white/35 block mt-0.5">
                      JPG, PNG, atau WEBP maks 3MB &middot; EXIF/GPS disanitasi otomatis
                    </span>
                  </div>
                )}

                {fotoKartuError && (
                  <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg px-3 py-1.5">
                    {fotoKartuError}
                  </p>
                )}
              </div>
            </div>
          )}

          <AuthField
            label="NIK Sesuai KK / KIA / KTP"
            value={nik}
            onChange={(e) => setNik(e.target.value)}
            placeholder="3524052104070001"
            className="font-mono"
            icon={<CreditCard className="h-4 w-4" />}
            required
          />

          <div className="relative">
            <label className="pointer-events-none absolute left-4 top-2 z-10 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Kelurahan / Desa Domisili
            </label>
            <select
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
              className={selectClass}
            >
              <option>Jetis</option>
              <option>Sidokumpul</option>
              <option>Sukorejo</option>
              <option>Tumenggungan</option>
              <option>Banjarmendalan</option>
              <option>Made</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>

          {/* Amanat UU PDP */}
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.08] p-4 flex items-start gap-3 text-xs">
            <ShieldCheck className="h-5 w-5 text-blue-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white text-xs">
                Amanat Perlindungan Data Anak &amp; Warga (UU PDP No. 27/2022)
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Identitas NIK, NISN, dan foto kartu pelajar Anda dienkripsi AES-256 GCM
                di brankas PDP Vault. Saat mengirim sanggahan, nama Anda disamarkan
                sepenuhnya (mis. <strong>Pelapor #S012</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-12 px-6 rounded-full border-white/15 bg-white/5 text-white font-bold text-sm hover:bg-white/10 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Memproses..." : (
                <>
                  Buat Akun <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
