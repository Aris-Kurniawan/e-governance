import { useState, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { kirimLaporan } from "@/lib/api/laporan"
import {
  CheckCircle2,
  Send,
  Upload,
  ShieldCheck,
  Info,
  X,
  ImageIcon,
} from "lucide-react"

interface ModalFormLaporanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialNpsn?: string
  namaSekolah?: string
}

type TipeTemuan = "mismatch" | "kerusakan_baru"

export default function ModalFormLaporan({
  open,
  onOpenChange,
  initialNpsn = "20506281",
  namaSekolah = "SMAN 1 Sukodadi",
}: ModalFormLaporanProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tipeTemuan, setTipeTemuan] = useState<TipeTemuan>("mismatch")
  const [lokasiSpesifik, setLokasiSpesifik] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [isAnonim, setIsAnonim] = useState(true)
  const [loading, setLoading] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [errorGagal, setErrorGagal] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const displayName = namaSekolah || "SMAN 1 Sukodadi"
  const displayNpsn = initialNpsn || "20506281"

  const handleReset = () => {
    setTipeTemuan("mismatch")
    setLokasiSpesifik("")
    setDeskripsi("")
    setIsAnonim(true)
    setFotoFile(null)
    setTrackingId(null)
    setErrorGagal(null)
    setLoading(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(handleReset, 200)
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
    if (!deskripsi || deskripsi.length < 20) return

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
      // Fail keras: jangan fabricate tracking_id — user harus tahu gagal.
      setErrorGagal(err instanceof Error ? err.message : "Gagal mengirim laporan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 sm:rounded-2xl border-slate-200 shadow-2xl [&>button]:hidden">
        {trackingId ? (
          /* ── Tampilan Sukses ── */
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Laporan Berhasil Dikirim</h2>
              <p className="mt-2 text-sm text-slate-600">
                Laporan audit kamu sudah diterima dan sedang menunggu verifikasi oleh tim audit partisipatif.
              </p>
              <div className="mt-4 inline-block rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600 border border-slate-200">
                Tracking ID: <strong className="font-mono text-slate-900">{trackingId}</strong>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild className="bg-[#0B3052] hover:bg-[#07213A] text-white font-medium">
                <Link to="/laporan/riwayat" onClick={() => onOpenChange(false)}>
                  Lihat Riwayat Laporan
                </Link>
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Tutup Form
              </Button>
            </div>
          </div>
        ) : (
          /* ── Tampilan Form Laporan ── */
          <div>
            {errorGagal && (
              <div
                role="alert"
                className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {errorGagal}
              </div>
            )}
            {/* ── Header ── */}
            <div className="px-6 pt-5 pb-4 relative">
              {/* Badge tahap */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold px-3 py-1 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Tahap 2 · Sanggahan Fakta Lapangan
              </span>

              {/* Tombol tutup */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>

              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                Audit Ketidaksesuaian Data Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bandingkan catatan Dapodik dengan kondisi riil di {displayName}.{" "}
                Formulir ini hanya untuk demonstrasi.
              </p>
            </div>

            {/* ── Body Form ── */}
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">

              {/* Sekolah yang Diperiksa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sekolah yang Diperiksa
                </label>
                <div className="h-10 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 font-medium">
                  {displayName} (NPSN: {displayNpsn})
                </div>
              </div>

              {/* Catatan Baseline Dapodik */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-blue-700">Catatan Baseline Dapodik</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    24 ruang kelas: 18 baik dan 6 rusak berat.
                  </p>
                </div>
              </div>

              {/* Tipe Temuan Lapangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
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
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          isChecked
                            ? "border-[#0B3052] bg-blue-50/50"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipe_temuan"
                          value={opt.value}
                          checked={isChecked}
                          onChange={() => setTipeTemuan(opt.value)}
                          className="h-4 w-4 accent-[#0B3052] cursor-pointer mt-0.5 shrink-0"
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-800 block">{opt.label}</span>
                          <span className="text-xs text-slate-500 leading-relaxed">{opt.desc}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Lokasi Ruang Spesifik */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi Ruang Spesifik{" "}
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={lokasiSpesifik}
                  onChange={(e) => setLokasiSpesifik(e.target.value)}
                  placeholder="Contoh: Gedung Barat, lantai 1 sisi utara"
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-[#0B3052] focus:outline-none focus:ring-1 focus:ring-[#0B3052] transition-colors"
                />
              </div>

              {/* Deskripsi Fakta Lapangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Fakta Lapangan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan kondisi riil secara objektif. Contoh: Genteng pecah sehingga air menetes ke meja praktikum…"
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm placeholder:text-slate-400 focus:border-[#0B3052] focus:outline-none focus:ring-1 focus:ring-[#0B3052] transition-colors resize-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Minimal 20 karakter. Jangan mencantumkan NIK atau data pribadi.
                </p>
              </div>

              {/* Lampiran Bukti Foto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lampiran Bukti Foto{" "}
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                    dragOver
                      ? "border-[#0B3052] bg-blue-50/60"
                      : fotoFile
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
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
                      <ImageIcon className="h-7 w-7 text-emerald-500" />
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
                      <Upload className="h-7 w-7 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">
                        Pilih atau seret foto bukti fisik
                      </p>
                      <p className="text-[10px] text-slate-400">PNG, JPG · maksimal 5 MB</p>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Foto diproses ulang tanpa metadata EXIF di browser. Foto tidak diunggah dalam mode demonstrasi.
                </p>
              </div>

              {/* Toggle Anonim */}
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-[#0B3052] shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      Kirim Sebagai Laporan Anonim
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Identitas profil contoh disamarkan dalam pratinjau.
                    </span>
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonim}
                  onClick={() => setIsAnonim((v) => !v)}
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
              </label>

              {/* Footer note */}
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Laporan hanya ditambahkan ke sesi pratinjau dan tidak dikirim ke dinas. Jangan gunakan informasi sensitif.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer text-sm"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !deskripsi || deskripsi.length < 20}
                  className="bg-[#0B3052] hover:bg-[#07213A] text-white px-5 cursor-pointer text-sm"
                >
                  {loading ? (
                    "Mengirim…"
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1.5" /> Kirim Audit (Simulasi)
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
