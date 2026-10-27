import { useState, useRef } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import PertanyaanKonfirmasi from "@/components/warga/PertanyaanKonfirmasi"
import { detailSekolah } from "@/lib/api/sekolah"
import { kirimLaporan, uploadFotoBukti } from "@/lib/api/laporan"
import { ApiError } from "@/lib/api/errors"
import type { SekolahDetail, StatusKonfirmasi } from "@/lib/api/types"
import {
  CheckCircle2,
  Send,
  Upload,
  ShieldCheck,
  Info,
  X,
  ImageIcon,
  Copy,
  Check,
  HelpCircle,
} from "lucide-react"

type TipeTemuan = "mismatch" | "kerusakan_baru"

const MIN_DESKRIPSI = 20
const MAX_DESKRIPSI = 2000
const MAX_FOTO_BYTES = 5 * 1024 * 1024

const LABEL_TIPE: Record<TipeTemuan, string> = {
  mismatch: "[Ketidaksesuaian Data]",
  kerusakan_baru: "[Kerusakan Baru]",
}

/**
 * Buang metadata EXIF dengan re-encode di browser: gambar dirender ulang ke
 * canvas lalu di-export sebagai JPEG — sifat canvas melepas seluruh metadata
 * (termasuk koordinat GPS yang mungkin tertempel di foto ponsel).
 */
async function stripExif(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Gambar tidak dapat dibaca"))
      el.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    )
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function FormLaporan() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Rute /laporan/baru sudah dibungkus ProtectedRoute (App.tsx) — user belum
  // login diarahkan ke /login?redirect=… otomatis sebelum halaman ini tampil.
  const npsn = (searchParams.get("sekolah") || "").trim()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tipeTemuan, setTipeTemuan] = useState<TipeTemuan>("mismatch")
  const [lokasiSpesifik, setLokasiSpesifik] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [loading, setLoading] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [errorGagal, setErrorGagal] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoError, setFotoError] = useState<string | null>(null)
  const [fotoStatus, setFotoStatus] = useState<"kosong" | "terkirim" | "gagal">("kosong")
  const [dragOver, setDragOver] = useState(false)

  // ── F4.13 — Konfirmasi severity pasca-laporan (opsional, §4.1) ────────────
  const [laporanId, setLaporanId] = useState<string | null>(null)
  const [perluKonfirmasi, setPerluKonfirmasi] = useState(false)
  const [konfirmasiOpen, setKonfirmasiOpen] = useState(false)
  const [konfirmasiStatus, setKonfirmasiStatus] = useState<StatusKonfirmasi | null>(null)
  const [konfirmasiKondisi, setKonfirmasiKondisi] = useState<string | null>(null)

  const { state: sekolahState } = useFetch(
    () => (npsn ? detailSekolah(npsn) : Promise.resolve(null as unknown as SekolahDetail)),
    [npsn],
  )
  const sekolah = sekolahState.status === "success" ? sekolahState.data : null
  const sekolahTidakDitemukan =
    sekolahState.status === "error" && sekolahState.code === "NOT_FOUND"
  const sekolahDimuat = sekolah !== null && sekolahState.status === "success"

  const displayName = sekolah
    ? sekolah.nama
    : sekolahState.status === "loading"
      ? "Memuat data sekolah…"
      : sekolahTidakDitemukan
        ? "Sekolah tidak ditemukan"
        : `NPSN ${npsn}`

  // Baseline dari data nyata — tanpa angka demo fallback.
  const baselineText = sekolah?.ringkasan_sarpras?.total_unit
    ? `${sekolah.ringkasan_sarpras.total_unit} unit sarpras: ${sekolah.ringkasan_sarpras.total_baik} baik dan ${sekolah.ringkasan_sarpras.total_rusak_berat} rusak berat.`
    : sekolahState.status === "loading"
      ? "Memuat baseline sekolah…"
      : sekolahTidakDitemukan
        ? "Baseline tidak tersedia — sekolah tidak ditemukan."
        : "Baseline Dapodik tidak tersedia untuk sekolah ini."

  const deskripsiValid =
    deskripsi.trim().length >= MIN_DESKRIPSI && deskripsi.length <= MAX_DESKRIPSI
  const submitDisabled = loading || !deskripsiValid || !npsn || !sekolahDimuat

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
    if (!allowed.includes(file.type)) {
      setFotoError("Format harus PNG atau JPG.")
      return
    }
    if (file.size > MAX_FOTO_BYTES) {
      setFotoError("Ukuran foto maksimal 5 MB.")
      return
    }
    setFotoError(null)
    setFotoFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileChange(file)
  }

  const handleCopyTracking = async () => {
    if (!trackingId) return
    try {
      await navigator.clipboard.writeText(trackingId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard bisa diblokir browser — biarkan, user masih bisa salin manual.
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitDisabled) return
    setLoading(true)
    setErrorGagal(null)
    try {
      const res = await kirimLaporan({
        sekolah_npsn: npsn,
        fasilitas_terkait: lokasiSpesifik.trim() || null,
        // Tipe temuan dikirim sebagai prefix agar AI pipeline mendapat konteks
        // jenis temuan tanpa menambah field baru di kontrak backend.
        deskripsi: `${LABEL_TIPE[tipeTemuan]} ${deskripsi.trim()}`,
      })
      // Laporan sudah tersimpan — foto bukti menyusul. Gagal upload tidak
      // membatalkan laporan; hanya ditandai di layar sukses.
      if (fotoFile) {
        try {
          const bersih = await stripExif(fotoFile)
          await uploadFotoBukti(res.id, bersih)
          setFotoStatus("terkirim")
        } catch {
          setFotoStatus("gagal")
        }
      }
      setTrackingId(res.tracking_id)
      // F4.13 — banner konfirmasi hanya bila backend menandai perlu (§4.1:
      // opsional, tidak memblokir laporan yang sudah tersimpan).
      setLaporanId(res.id)
      setPerluKonfirmasi(res.konfirmasi?.perlu_konfirmasi === true)
      setKonfirmasiStatus(res.konfirmasi?.perlu_konfirmasi ? "menunggu" : null)
      // DBG-024 — langsung buka modal agar warga tidak melewatkan pertanyaan
      // (sebelumnya hanya banner pasif tanpa pemicu otomatis).
      if (res.konfirmasi?.perlu_konfirmasi) setKonfirmasiOpen(true)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "UNAUTHORIZED") {
          const redirect = encodeURIComponent(`/laporan/baru?sekolah=${encodeURIComponent(npsn)}`)
          navigate(`/login?redirect=${redirect}&action=report`)
          return
        }
        if (err.code === "FORBIDDEN") {
          setErrorGagal(
            "Akun Anda menunggu verifikasi dinas. Laporan hanya bisa dikirim oleh warga terverifikasi atau komite sekolah.",
          )
          return
        }
        if (err.code === "NOT_FOUND") {
          setErrorGagal("Sekolah tidak ditemukan. Periksa kembali atau pilih sekolah lain.")
          return
        }
        setErrorGagal(err.message)
      } else {
        setErrorGagal("Gagal mengirim laporan. Periksa koneksi internet lalu coba lagi.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Tanpa ?sekolah= — arahkan warga memilih sekolah dulu, jangan menebak NPSN.
  if (!npsn) {
    return (
      <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xl space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Pilih Sekolah Terlebih Dahulu</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Laporan harus terkait dengan sekolah tertentu. Buka Direktori Sekolah, lalu tekan
            tombol &ldquo;Lapor&rdquo; pada kartu sekolah yang ingin diaudit.
          </p>
          <Button asChild className="rounded-xl bg-[#64748b] hover:bg-[#475569] text-white font-medium px-5 py-2.5 h-auto">
            <Link to="/sekolah">Buka Direktori Sekolah</Link>
          </Button>
        </div>
      </div>
    )
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
              Laporan audit kamu sudah diterima dan sedang menunggu verifikasi oleh tim audit
              partisipatif.
            </p>
            {fotoStatus === "terkirim" && (
              <p className="mt-2 text-xs text-emerald-600 font-medium">Foto bukti berhasil diunggah.</p>
            )}
            {fotoStatus === "gagal" && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 text-left leading-relaxed">
                Foto bukti gagal diunggah — <strong>laporan tetap tersimpan dan sah</strong> tanpa
                foto. Kamu bisa melampirkan bukti saat verifikasi jika diminta.
              </div>
            )}
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600 border border-slate-200">
              <span>
                Tracking ID: <strong className="font-mono text-slate-900">{trackingId}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyTracking}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Salin Tracking ID"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Salin
                  </>
                )}
              </button>
            </div>
          </div>

          {/* F4.13 T3 — banner konfirmasi (opsional, SPEC §19.6: tidak memblokir).
              DBG-024 — juga tampil saat status masih "menunggu" (warga menutup
              modal tanpa menjawab) agar pertanyaan tetap bisa diakses. */}
          {perluKonfirmasi && (konfirmasiStatus === null || konfirmasiStatus === "menunggu") && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3.5 text-left space-y-2.5">
              <p className="text-xs text-blue-950 leading-relaxed flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>AI menemukan pola pada deskripsimu</strong> — jawab beberapa pertanyaan
                  singkat agar tingkat kerusakan lebih akurat (±1 menit). Boleh juga dilewati,
                  laporanmu tetap sah.
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKonfirmasiOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Jawab Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setKonfirmasiStatus("dilewati")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold px-3.5 py-2 border border-slate-200 cursor-pointer"
                >
                  Lewati
                </button>
              </div>
            </div>
          )}

          {/* Status ringkas konfirmasi setelah diputuskan */}
          {konfirmasiStatus && konfirmasiStatus !== "menunggu" && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Konfirmasi tingkat kerusakan:{" "}
              <strong className="text-slate-700">
                {konfirmasiStatus === "terjawab" ? "Terjawab" : "Dilewati"}
              </strong>
              {konfirmasiKondisi && (
                <span className="text-slate-400 font-normal">
                  · kondisi: {konfirmasiKondisi.replace(/_/g, " ")}
                </span>
              )}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild className="rounded-xl bg-[#64748b] hover:bg-[#475569] text-white font-medium">
              <Link to="/laporan/riwayat">Lihat Riwayat Laporan</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link to="/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* F4.13 T3 — modal pertanyaan konfirmasi */}
        {laporanId && (
          <PertanyaanKonfirmasi
            laporanId={laporanId}
            open={konfirmasiOpen}
            onOpenChange={setKonfirmasiOpen}
            onSelesai={(hasil) => {
              setKonfirmasiOpen(false)
              if (hasil) {
                setKonfirmasiStatus(hasil.status)
                setKonfirmasiKondisi(hasil.kondisi_dilaporkan)
              } else {
                // 409 — sudah pernah dijawab (mis. tab lain) → tutup + tandai.
                setKonfirmasiStatus("terjawab")
              }
            }}
          />
        )}
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
            Bandingkan catatan Dapodik dengan kondisi riil di {displayName}. Laporanmu akan
            diverifikasi oleh tim audit partisipatif.
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
              {displayName} (NPSN: {npsn})
            </div>
            {sekolahTidakDitemukan && (
              <p className="mt-1.5 text-[11px] text-red-600 leading-relaxed">
                Sekolah dengan NPSN {npsn} tidak ditemukan — laporan tidak dapat dikirim. Pilih
                sekolah lain dari{" "}
                <Link to="/sekolah" className="underline font-semibold">
                  Direktori Sekolah
                </Link>
                .
              </p>
            )}
          </div>

          {/* Catatan Baseline Dapodik */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700">Catatan Baseline Dapodik</p>
              <p className="text-xs text-blue-600 mt-0.5">{baselineText}</p>
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
            <p className="text-[11px] text-slate-400 mt-1.5">
              Pilihan ini dilampirkan otomatis ke awal deskripsi agar AI mengenali jenis temuan.
            </p>
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
              maxLength={MAX_DESKRIPSI}
              placeholder="Jelaskan kondisi riil secara objektif. Contoh: Genteng pecah sehingga air menetes ke meja praktikum..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors resize-none min-h-[96px]"
              required
            />
            <div className="flex items-start justify-between gap-3 mt-1">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Minimal {MIN_DESKRIPSI} karakter. Jangan mencantumkan NIK atau data pribadi.
                {deskripsi.length > 0 && deskripsi.trim().length < MIN_DESKRIPSI && (
                  <span className="text-amber-600 font-medium">
                    {" "}
                    Kurang {MIN_DESKRIPSI - deskripsi.trim().length} karakter lagi.
                  </span>
                )}
              </p>
              <span
                className={`text-[11px] tabular-nums shrink-0 ${
                  deskripsi.length >= MAX_DESKRIPSI ? "text-rose-500 font-semibold" : "text-slate-400"
                }`}
              >
                {deskripsi.length}/{MAX_DESKRIPSI}
              </span>
            </div>
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
                    onClick={(e) => { e.stopPropagation(); setFotoFile(null); setFotoError(null) }}
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
            {fotoError && (
              <p className="text-[11px] text-rose-600 mt-1.5">{fotoError}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Foto diunggah sebagai bukti setelah laporan tersimpan; metadata EXIF dibuang di
              browser sebelum unggah.
            </p>
          </div>

          {/* Info Privasi (pengganti toggle anonim — backend selalu mencatat
              pelapor untuk keperluan tracking, identitas tidak dipublikasikan) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <span className="text-sm font-semibold text-slate-800 block">
                Privasi Pelapor
              </span>
              <span className="text-xs text-slate-500 block mt-0.5 leading-relaxed">
                Identitas kamu tidak ditampilkan ke publik. Laporan dilacak lewat Tracking ID
                untuk proses verifikasi.
              </span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Laporan dikirim ke dinas untuk verifikasi. Jangan gunakan informasi sensitif
              seperti NIK atau nama korban.
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
              disabled={submitDisabled}
              className="rounded-xl bg-[#64748b] hover:bg-[#475569] text-white px-5 py-2.5 text-sm font-medium shadow flex items-center gap-2 cursor-pointer h-auto transition-colors disabled:opacity-50"
            >
              {loading ? (
                fotoFile ? "Mengirim & mengunggah…" : "Mengirim…"
              ) : (
                <>
                  <Send className="h-4 w-4" /> Kirim Laporan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
