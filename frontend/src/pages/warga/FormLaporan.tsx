import { useState, useRef } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { detailSekolah } from "@/lib/api/sekolah"
import { kirimLaporan } from "@/lib/api/laporan"
import type { SekolahDetail } from "@/lib/api/types"
import {
  CheckCircle2,
  Send,
  Upload,
  ShieldCheck,
  Info,
  X,
  ImageIcon,
} from "lucide-react"

type TipeTemuan = "mismatch" | "kerusakan_baru"

export default function FormLaporan() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const npsnParam = searchParams.get("sekolah") || "70002205"

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [npsn] = useState(npsnParam)
  const [tipeTemuan, setTipeTemuan] = useState<TipeTemuan>("mismatch")
  const [lokasiSpesifik, setLokasiSpesifik] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [isAnonim, setIsAnonim] = useState(true)
  const [loading, setLoading] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [errorGagal, setErrorGagal] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const { state: sekolahState } = useFetch(
    () => (npsn.trim() ? detailSekolah(npsn.trim()) : Promise.resolve(null as unknown as SekolahDetail)),
    [npsn]
  )
  const sekolah = sekolahState.status === "success" ? sekolahState.data : null

  const displayName = sekolah?.nama || "SMAN 1 Sukodadi"
  const displayNpsn = npsn || "70002205"

  // Ringkasan baseline dapodik
  const baselineText = sekolah?.ringkasan_sarpras?.total_unit
    ? `${sekolah.ringkasan_sarpras.total_unit} unit sarpras: ${sekolah.ringkasan_sarpras.total_baik} baik dan ${sekolah.ringkasan_sarpras.total_rusak_berat || 6} rusak berat.`
    : "24 ruang kelas: 18 baik dan 6 rusak berat."

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/sekolah")
    }
  }

  const handleFileChange = (file: File | null) => {
    if (!file) return
    const allowed = ["image/png", "image/jpeg"]
    if (!allowed.includes(file.type)) return
    if (file.size > 5 * 1024 * 1024) return
    setFotoFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileChange(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayNpsn || !deskripsi || deskripsi.length < 20) return
    setLoading(true)
    try {
      const res = await kirimLaporan({
        sekolah_npsn: displayNpsn,
        fasilitas_terkait: lokasiSpesifik || null,
        deskripsi,
      })
      setTrackingId(res.tracking_id)
      setErrorGagal(null)
    } catch (err) {
      setErrorGagal(err instanceof Error ? err.message : "Gagal mengirim laporan.")
    } finally {
      setLoading(false)
    }
  }

  // Tampilan Sukses
  if (trackingId) {
    return (
      <div className="min-h-screen bg-slate-50/60 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan Berhasil Dikirim</h1>
            <p className="mt-2 text-sm text-slate-600">
              Laporan audit kamu sudah diterima dan sedang menunggu verifikasi oleh tim audit partisipatif.
            </p>
            <div className="mt-4 inline-block rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600 border border-slate-200">
              Tracking ID: <strong className="font-mono text-slate-900">{trackingId}</strong>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild className="rounded-xl bg-[#64748b] hover:bg-[#475569] text-white font-medium">
              <Link to="/laporan/riwayat">Lihat Riwayat Laporan</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link to="/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl space-y-5">
        {errorGagal && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
          >
            {errorGagal}
          </div>
        )}

        {/* ── Header ── */}
        <div className="relative">
          {/* Badge tahap */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 text-xs font-semibold px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Tahap 2 · Sanggahan Fakta Lapangan
            </span>

            {/* Tombol tutup bulat */}
            <button
              type="button"
              onClick={handleBack}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug mt-3">
            Audit Ketidaksesuaian Data Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Bandingkan catatan Dapodik dengan kondisi riil di {displayName}. Formulir ini hanya untuk demonstrasi.
          </p>
        </div>

        {/* ── Body Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sekolah yang Diperiksa */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Sekolah yang Diperiksa
            </label>
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-800 font-medium">
              {displayName} (NPSN: {displayNpsn})
            </div>
          </div>

          {/* Catatan Baseline Dapodik */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700">Catatan Baseline Dapodik</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {baselineText}
              </p>
            </div>
          </div>

          {/* Tipe Temuan Lapangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2">
              Tipe Temuan Lapangan <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "mismatch" as TipeTemuan,
                  label: "Ketidaksesuaian Data (Mismatch)",
                  desc: "Catatan resmi berbeda dari kondisi fisik yang ditemukan.",
                },
                {
                  value: "kerusakan_baru" as TipeTemuan,
                  label: "Kerusakan Baru / Insiden Mendadak",
                  desc: "Kerusakan baru setelah verifikasi semester terakhir.",
                },
              ].map((opt) => {
                const isChecked = tipeTemuan === opt.value
                return (
                  <div
                    key={opt.value}
                    onClick={() => setTipeTemuan(opt.value)}
                    className={`rounded-xl p-3.5 flex items-start gap-3.5 cursor-pointer transition-all ${
                      isChecked
                        ? "border-2 border-slate-800 bg-white"
                        : "border border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {/* Custom Radio Button */}
                    {isChecked ? (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-slate-800" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block leading-tight">
                        {opt.label}
                      </span>
                      <span className="text-xs text-slate-500 block mt-1 leading-normal">
                        {opt.desc}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lokasi Ruang Spesifik */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Lokasi Ruang Spesifik{" "}
              <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={lokasiSpesifik}
              onChange={(e) => setLokasiSpesifik(e.target.value)}
              placeholder="Contoh: Gedung Barat, lantai 1 sisi utara"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
            />
          </div>

          {/* Deskripsi Fakta Lapangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Deskripsi Fakta Lapangan <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              placeholder="Jelaskan kondisi riil secara objektif. Contoh: Genteng pecah sehingga air menetes ke meja praktikum..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors resize-none min-h-[96px]"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimal 20 karakter. Jangan mencantumkan NIK atau data pribadi.
            </p>
          </div>

          {/* Lampiran Bukti Foto */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Lampiran Bukti Foto{" "}
              <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                dragOver
                  ? "border-slate-400 bg-slate-50"
                  : fotoFile
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {fotoFile ? (
                <>
                  <ImageIcon className="h-6 w-6 text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-700">{fotoFile.name}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFotoFile(null) }}
                    className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Hapus file
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700">
                    Pilih atau seret foto bukti fisik
                  </p>
                  <p className="text-[11px] text-slate-400">PNG, JPG · maksimal 5 MB</p>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Foto diproses ulang tanpa metadata EXIF di browser. Foto tidak diunggah dalam mode demonstrasi.
            </p>
          </div>

          {/* Toggle Anonim */}
          <div
            onClick={() => setIsAnonim((v) => !v)}
            className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-800 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Kirim Sebagai Laporan Anonim
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Identitas profil contoh disamarkan dalam pratinjau.
                </span>
              </div>
            </div>
            {/* Switch Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isAnonim}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                isAnonim ? "bg-[#0B3052]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isAnonim ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Laporan hanya ditambahkan ke sesi pratinjau dan tidak dikirim ke dinas. Jangan gunakan informasi sensitif.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer text-sm px-5 py-2.5 h-auto shadow-sm"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || !deskripsi || deskripsi.length < 20}
              className="rounded-xl bg-[#64748b] hover:bg-[#475569] text-white px-5 py-2.5 text-sm font-medium shadow flex items-center gap-2 cursor-pointer h-auto transition-colors disabled:opacity-50"
            >
              {loading ? (
                "Mengirim…"
              ) : (
                <>
                  <Send className="h-4 w-4" /> Kirim Audit (Simulasi)
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}