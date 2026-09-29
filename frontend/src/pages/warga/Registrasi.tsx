import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  ShieldAlert
} from "lucide-react"

type Step = 1 | 2

export default function Registrasi() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect")
  const action = searchParams.get("action")

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 fields
  const [nama, setNama] = useState("Rian Pratama Putra")
  const [whatsapp, setWhatsapp] = useState("81234567890")
  const [password, setPassword] = useState("password123")
  const [confirmPassword, setConfirmPassword] = useState("password123")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 2 fields
  const [peran, setPeran] = useState<string>("pelajar")
  const [sekolah, setSekolah] = useState("SMAN 1 Sukodadi")
  const [nisn, setNisn] = useState("0078129341")
  const [nik, setNik] = useState("3524052104070001")
  const [kelurahan, setKelurahan] = useState("Jetis")

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    const target = redirect
      ? `/login?redirect=${encodeURIComponent(redirect)}${action ? `&action=${action}` : ""}&registered=true`
      : "/login?registered=true"
    navigate(target)
  }

  return (
    <div className="w-full space-y-6">
      {redirect && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 shadow-sm">
          <ShieldAlert className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Pendaftaran untuk Melaporkan Fasilitas</span>
            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
              Daftarkan akun warga/pelajar untuk melanjutkan pelaporan. Data NIK/NISN akan diverifikasi silang dengan Dapodik resmi.
            </p>
          </div>
        </div>
      )}

      {/* ── Top Header Progress & Estimasi ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60">
            {step === 1 ? "TAHAP 1 DARI 2: KREDENSIAL AKUN" : "TAHAP 2 DARI 2: VERIFIKASI IDENTITAS"}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            Estimasi: {step === 1 ? "1 menit" : "2 menit"} pengisian
          </span>
        </div>

        {/* Horizontal Progress Bar */}
        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-[#2563EB] transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {/* ── Stepper Line & Indicators ── */}
      <div className="flex items-center justify-center gap-6 py-2">
        {/* Step 1 */}
        <div className="flex flex-col items-center">
          <div 
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === 1
                ? "bg-[#2563EB] text-white shadow-sm"
                : "bg-emerald-600 text-white"
            }`}
          >
            {step === 2 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className={`mt-1 text-xs font-bold ${step === 1 ? "text-[#2563EB]" : "text-slate-600"}`}>
            Kredensial
          </span>
        </div>

        {/* Connector */}
        <div className={`h-0.5 w-24 sm:w-32 transition-colors -mt-4 ${step === 2 ? "bg-[#2563EB]" : "bg-slate-200"}`} />

        {/* Step 2 */}
        <div className="flex flex-col items-center">
          <div 
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === 2
                ? "bg-[#2563EB] text-white shadow-sm"
                : "border border-slate-300 text-slate-400"
            }`}
          >
            2
          </div>
          <span className={`mt-1 text-xs font-medium ${step === 2 ? "text-[#2563EB] font-bold" : "text-slate-400"}`}>
            Verifikasi Identitas
          </span>
        </div>
      </div>

      {/* ── STEP 1: Kredensial Form ── */}
      {step === 1 ? (
        <form onSubmit={handleStep1} className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Buat Kredensial Akun Anda</h2>
            <p className="mt-1 text-xs text-slate-500">
              Informasi dasar untuk mengakses portal dan menerima notifikasi tindak lanjut dinas.
            </p>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Lengkap Sesuai Dokumen Resmi (KTP / KIA / Kartu Pelajar) <span className="text-rose-500">*</span>
            </label>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap Anda"
              className="h-12 rounded-xl border-slate-200 text-sm font-medium px-4 focus-visible:ring-1 focus-visible:ring-[#2563EB]"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Nama asli Anda tersimpan di brankas terenkripsi dan tidak dipublikasikan ke publik.
            </p>
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-1 focus-within:ring-[#2563EB] focus-within:border-[#2563EB]">
              <span className="flex items-center justify-center bg-slate-50 px-4 text-xs font-semibold text-slate-600 border-r border-slate-200">
                +62
              </span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="81234567890"
                className="h-12 flex-1 px-4 text-sm font-medium text-slate-800 bg-white focus:outline-none"
                required
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Digunakan untuk notifikasi progres aduan dan pemulihan akun.
            </p>
          </div>

          {/* Kata Sandi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Sandi Akun <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Buat kata sandi"
                className="h-12 rounded-xl border-slate-200 text-sm font-medium pr-10 px-4 focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">
                  Kekuatan Sandi: <strong className="text-emerald-700">Kuat</strong> (Kombinasi Huruf, Angka &amp; Simbol)
                </span>
                <span className="text-slate-400">Min. 8 Karakter</span>
              </div>
            </div>
          </div>

          {/* Konfirmasi Kata Sandi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Konfirmasi Ulang Kata Sandi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                className="h-12 rounded-xl border-slate-200 text-sm font-medium pr-10 px-4 focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-4"
          >
            Lanjut ke Verifikasi Identitas (Tahap 2) <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-xs text-slate-500 pt-2">
            Sudah memiliki akun terdaftar?{" "}
            <Link to="/login" className="font-bold text-[#2563EB] hover:underline">
              Masuk ke Akun
            </Link>
          </p>
        </form>
      ) : (
        /* ── STEP 2: Verifikasi Identitas ── */
        <form onSubmit={handleStep2} className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pilih Peran &amp; Verifikasi Identitas</h2>
            <p className="mt-1 text-xs text-slate-500">
              Data identitas menjamin prinsip 1 Warga/Pelajar = 1 Suara dan mencegah bot dalam audit sarpras sekolah.
            </p>
          </div>

          {/* Role Selection 2x2 Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              MENDAFTAR SEBAGAI <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Role 1: Pelajar (Selected) */}
              <div
                onClick={() => setPeran("pelajar")}
                className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                  peran === "pelajar"
                    ? "border-2 border-[#2563EB] bg-blue-50/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${peran === "pelajar" ? "border-[#2563EB] bg-[#2563EB]" : "border-slate-300"}`}>
                      {peran === "pelajar" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">Pelajar / Siswa Aktif</span>
                  </div>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                    Saksi Kunci
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                  Siswa SD/SMP/SMA/SMK di Kec. Lamongan.
                </p>
              </div>

              {/* Role 2: Orang Tua */}
              <div
                onClick={() => setPeran("orang_tua")}
                className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                  peran === "orang_tua"
                    ? "border-2 border-[#2563EB] bg-blue-50/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${peran === "orang_tua" ? "border-[#2563EB] bg-[#2563EB]" : "border-slate-300"}`}>
                    {peran === "orang_tua" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Orang Tua / Wali</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                  Memiliki putra/putri aktif di sekolah Kec. Lamongan.
                </p>
              </div>

              {/* Role 3: Komite */}
              <div
                onClick={() => setPeran("komite")}
                className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                  peran === "komite"
                    ? "border-2 border-[#2563EB] bg-blue-50/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${peran === "komite" ? "border-[#2563EB] bg-[#2563EB]" : "border-slate-300"}`}>
                    {peran === "komite" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Pengurus Komite</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                  Pengurus perwakilan paguyuban komite sekolah resmi.
                </p>
              </div>

              {/* Role 4: Warga Umum */}
              <div
                onClick={() => setPeran("warga_umum")}
                className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                  peran === "warga_umum"
                    ? "border-2 border-[#2563EB] bg-blue-50/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${peran === "warga_umum" ? "border-[#2563EB] bg-[#2563EB]" : "border-slate-300"}`}>
                    {peran === "warga_umum" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Warga Domisili Umum</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                  Penduduk yang peduli sarana pendidikan sekitar.
                </p>
              </div>
            </div>
          </div>

          {/* ── Dapodik Verification Box (Pelajar) ── */}
          {peran === "pelajar" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-emerald-700" />
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Verifikasi Data Peserta Didik (Dapodik)</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Terkoneksi ke Dapodik
                </span>
              </div>

              {/* Sekolah Asal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sekolah Asal Tempat Belajar <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={sekolah}
                    onChange={(e) => setSekolah(e.target.value)}
                    className="w-full h-11 appearance-none rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option>SMAN 1 Sukodadi</option>
                    <option>SMPN 2 Lamongan</option>
                    <option>SDN 5 Turi</option>
                    <option>SMKN 1 Lamongan</option>
                    <option>SMPN 1 Lamongan</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* NISN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Nomor Induk Siswa Nasional (NISN) 10-Digit <span className="text-rose-500">*</span>
                  </label>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                    10/10 Digit
                  </span>
                </div>
                <div className="relative">
                  <Input
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="0078129341"
                    className="h-11 rounded-xl border-slate-200 bg-white text-xs sm:text-sm font-mono font-medium px-4 pr-10 focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                    required
                  />
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  NISN divalidasi silang secara instan dengan basis data Dapodik sekolah tujuan.
                </p>
              </div>

              {/* Upload Foto Kartu Pelajar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Foto Kartu Pelajar / Surat Keterangan Aktif (Opsional)
                </label>
                <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-white/80 p-5 text-center cursor-pointer hover:bg-emerald-50/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mx-auto mb-1.5">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-700 block">
                    Klik untuk memilih foto kartu pelajar
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    JPG, PNG, atau WEBP maks 3MB
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Metadata EXIF/GPS foto disanitasi otomatis sebelum diarsipkan di server aman.
                </p>
              </div>
            </div>
          )}

          {/* NIK Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Nomor Induk Kependudukan (NIK) Sesuai KK / KIA / KTP <span className="text-rose-500">*</span>
              </label>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-800">
                16/16 Digit Sah
              </span>
            </div>
            <div className="relative">
              <Input
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="3524052104070001"
                className="h-11 rounded-xl border-slate-200 bg-white text-xs sm:text-sm font-mono font-medium px-4 pr-10 focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                required
              />
              <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Untuk pelajar di bawah 17 tahun, NIK tercantum pada lembar Kartu Keluarga (KK) atau Kartu Identitas Anak (KIA).
            </p>
          </div>

          {/* Kelurahan / Desa Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kelurahan / Desa Domisili di Kec. Lamongan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={kelurahan}
                onChange={(e) => setKelurahan(e.target.value)}
                className="w-full h-11 appearance-none rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                <option>Jetis</option>
                <option>Sidokumpul</option>
                <option>Sukorejo</option>
                <option>Tumenggungan</option>
                <option>Banjarmendalan</option>
                <option>Made</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* UU PDP Notice Box */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 flex items-start gap-3 text-xs">
            <ShieldCheck className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-xs">
                Amanat Perlindungan Data Anak &amp; Warga (UU PDP No. 27/2022)
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sesuai amanat UU PDP Pasal 25 mengenai pemrosesan data pribadi anak, identitas NIK, NISN, dan foto kartu pelajar Anda dienkripsi AES-256 GCM di brankas PDP Vault. Saat Anda mengirimkan sanggahan kerusakan sekolah, nama Anda disamarkan sepenuhnya (mis. <strong>Pelapor #S012</strong>).
              </p>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Tahap 1
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Memproses..." : (
                <>
                  Selesaikan Pendaftaran &amp; Validasi <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-slate-500 pt-2">
            Sudah memiliki akun terdaftar?{" "}
            <Link to="/login" className="font-bold text-[#2563EB] hover:underline">
              Masuk ke Akun
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}