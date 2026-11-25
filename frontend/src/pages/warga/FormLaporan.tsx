import { useState, useRef, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import PertanyaanKonfirmasi from "@/components/warga/PertanyaanKonfirmasi"
import { detailSekolah, listSekolah } from "@/lib/api/sekolah"
import { kirimLaporan, uploadFotoBukti } from "@/lib/api/laporan"
import { ApiError } from "@/lib/api/errors"
import type { SekolahDetail, SekolahList, StatusKonfirmasi } from "@/lib/api/types"
import {
  CheckCircle2,
  Send,
  Upload,
  Info,
  X,
  ImageIcon,
  Copy,
  Check,
  Building2,
  ChevronDown,
} from "@/components/ui/iconify-icons"

type TipeTemuan = "mismatch" | "kerusakan_baru"

const MIN_DESKRIPSI = 20
const MAX_DESKRIPSI = 2000
const MAX_FOTO_BYTES = 2 * 1024 * 1024

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
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Inisialisasi sekolah: prioritaskan URL query ?sekolah=, lalu fallback ke profil user
  const urlNpsn = (searchParams.get("sekolah") || "").trim()
  const [selectedNpsn, setSelectedNpsn] = useState<string>(
    urlNpsn || user?.sekolah_terkait_npsn || "",
  )

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
  const [, setFotoStatus] = useState<"kosong" | "terkirim" | "gagal">("kosong")
  const [dragOver, setDragOver] = useState(false)

  // ── F4.13 — Konfirmasi severity pasca-laporan (opsional, §4.1) ────────────
  const [laporanId, setLaporanId] = useState<string | null>(null)
  const [, setPerluKonfirmasi] = useState(false)
  const [konfirmasiOpen, setKonfirmasiOpen] = useState(false)
  const [, setKonfirmasiStatus] = useState<StatusKonfirmasi | null>(null)
  const [, setKonfirmasiKondisi] = useState<string | null>(null)

  // Fetch daftar seluruh sekolah (untuk pilihan dropdown instan)
  const { state: sekolahListState } = useFetch(() => listSekolah({ page_size: 100 }), [])
  const daftarSekolah: SekolahList[] =
    sekolahListState.status === "success" ? sekolahListState.data.data : []

  // Fetch data detail Dapodik sekolah terpilih
  const { state: sekolahState } = useFetch(
    () => (selectedNpsn ? detailSekolah(selectedNpsn) : Promise.resolve(null as unknown as SekolahDetail)),
    [selectedNpsn],
  )
  const sekolah = sekolahState.status === "success" ? sekolahState.data : null
  const sekolahTidakDitemukan =
    sekolahState.status === "error" && sekolahState.code === "NOT_FOUND"
  const sekolahDimuat = sekolah !== null && sekolahState.status === "success"

  // Sinkronisasi jika URL berubah atau profil user selesai dimuat
  useEffect(() => {
    if (urlNpsn) {
      if (urlNpsn !== selectedNpsn) setSelectedNpsn(urlNpsn)
    } else if (!selectedNpsn && user?.sekolah_terkait_npsn) {
      setSelectedNpsn(user.sekolah_terkait_npsn)
    }
  }, [urlNpsn, user?.sekolah_terkait_npsn, selectedNpsn])

  const handlePilihSekolah = (npsnVal: string) => {
    setSelectedNpsn(npsnVal)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (npsnVal) {
        next.set("sekolah", npsnVal)
      } else {
        next.delete("sekolah")
      }
      return next
    })
  }

  const displayName = sekolah
    ? sekolah.nama
    : sekolahState.status === "loading"
      ? "Memuat data sekolah…"
      : sekolahTidakDitemukan
        ? "Sekolah tidak ditemukan"
        : selectedNpsn
          ? `NPSN ${selectedNpsn}`
          : "Pilih Sekolah"

  const deskripsiValid =
    deskripsi.trim().length >= MIN_DESKRIPSI && deskripsi.length <= MAX_DESKRIPSI
  const submitDisabled = loading || !deskripsiValid || !selectedNpsn || !sekolahDimuat

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
      setFotoError("Ukuran foto maksimal 2 MB.")
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
      // Clipboard bisa diblokir browser
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitDisabled) return
    if (/[<>]/.test(deskripsi)) {
      setErrorGagal("Deskripsi tidak boleh mengandung karakter khusus '<' atau '>'.")
      return
    }
    setLoading(true)
    setErrorGagal(null)
    try {
      const res = await kirimLaporan({
        sekolah_npsn: selectedNpsn,
        fasilitas_terkait: lokasiSpesifik.trim() || null,
        deskripsi: `${LABEL_TIPE[tipeTemuan]} ${deskripsi.trim()}`,
      })
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
      setLaporanId(res.id)
      setPerluKonfirmasi(res.konfirmasi?.perlu_konfirmasi === true)
      setKonfirmasiStatus(res.konfirmasi?.perlu_konfirmasi ? "menunggu" : null)
      if (res.konfirmasi?.perlu_konfirmasi) setKonfirmasiOpen(true)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "UNAUTHORIZED") {
          const redirect = encodeURIComponent(`/laporan/baru?sekolah=${encodeURIComponent(selectedNpsn)}`)
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

  // Tampilan Sukses Pengiriman Laporan
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
              Laporan Anda untuk <span className="font-semibold text-slate-800">{displayName}</span> telah masuk ke
              sistem SIMAKIS untuk diverifikasi.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <span className="text-xs text-slate-500 font-medium">Nomor Tracking Laporan</span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">{trackingId}</span>
              <button
                type="button"
                onClick={handleCopyTracking}
                className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                title="Salin nomor tracking"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Simpan nomor ini untuk memantau status tindak lanjut sarpras.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild className="rounded-xl bg-[#0B3052] hover:bg-[#07213A] text-white font-medium">
              <Link to="/laporan/riwayat">Lihat Riwayat Laporan</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link to="/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* F4.13 T3 — modal pertanyaan konfirmasi AI */}
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
                setKonfirmasiStatus("terjawab")
              }
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 flex items-center justify-center font-sans">
      {/* Container Card Form Utama */}
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl space-y-6">
        {errorGagal && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
          >
            {errorGagal}
          </div>
        )}

        {/* ── Header Card ── */}
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              Audit Ketidaksesuaian Fasilitas Sekolah
            </h1>

            <button
              type="button"
              onClick={handleBack}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer shrink-0"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Periksa catatan resmi Dapodik sekolah di bawah ini, lalu laporkan jika terdapat kerusakan fisik atau
            ketidaksesuaian dengan kondisi lapangan nyata.
          </p>
        </div>

        {/* ── Body Form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Pemilihan Sekolah */}
          <div data-coachmark="lapor-sekolah" className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Sekolah yang Diperiksa <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <select
                value={selectedNpsn}
                onChange={(e) => handlePilihSekolah(e.target.value)}
                className="w-full h-11 appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 font-medium focus:border-[#0B3052] focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer truncate"
              >
                <option value="">-- Pilih Sekolah yang Ingin Diaudit --</option>
                {daftarSekolah.map((s) => (
                  <option key={s.npsn} value={s.npsn}>
                    {s.nama} ({s.jenjang} - NPSN {s.npsn})
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {user?.sekolah_terkait_npsn && selectedNpsn === user.sekolah_terkait_npsn && (
              <p className="text-[11px] text-blue-600 font-medium">
                ✓ Otomatis terpilih sesuai profil sekolah akun Anda.
              </p>
            )}

            {sekolahTidakDitemukan && (
              <p className="text-[11px] text-red-600 leading-relaxed">
                Sekolah dengan NPSN {selectedNpsn} tidak ditemukan di database. Silakan pilih sekolah lain dari daftar.
              </p>
            )}
          </div>

          {/* ── Kompartemen Data Resmi Dapodik (Baseline) Disatukan di Dalam Card ── */}
          {selectedNpsn && sekolah ? (
            <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-b from-blue-50/70 to-indigo-50/30 p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#0B3052] text-white flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">
                      Data Resmi Dapodik (Baseline)
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      {sekolah.nama}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100/80 text-blue-700 border border-blue-200/60">
                    NPSN {sekolah.npsn}
                  </span>
                  {sekolah.akreditasi && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Akreditasi {sekolah.akreditasi}
                    </span>
                  )}
                  {sekolah.status_sekolah && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {sekolah.status_sekolah}
                    </span>
                  )}
                </div>
              </div>

              {/* 4 Metrik Ringkasan Sarpras */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                  <span className="text-[10px] font-medium text-slate-400 block">Total Sarpras</span>
                  <span className="text-base sm:text-lg font-black text-slate-800">
                    {sekolah.ringkasan_sarpras?.total_unit ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 shadow-2xs">
                  <span className="text-[10px] font-medium text-emerald-600 block">Kondisi Baik</span>
                  <span className="text-base sm:text-lg font-black text-emerald-600">
                    {sekolah.ringkasan_sarpras?.total_baik ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white p-2.5 shadow-2xs">
                  <span className="text-[10px] font-medium text-amber-600 block">Rusak Ringan</span>
                  <span className="text-base sm:text-lg font-black text-amber-600">
                    {sekolah.ringkasan_sarpras?.total_rusak_ringan ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-rose-200/80 bg-white p-2.5 shadow-2xs">
                  <span className="text-[10px] font-medium text-rose-600 block">Rusak Berat</span>
                  <span className="text-base sm:text-lg font-black text-rose-600">
                    {sekolah.ringkasan_sarpras?.total_rusak_berat ?? 0}
                  </span>
                </div>
              </div>

              {/* Rincian Ruang & Fasilitas dari Dapodik (Quick-Pick Chips) */}
              {sekolah.kondisi_sarana && sekolah.kondisi_sarana.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Fasilitas tercatat di Dapodik (klik untuk pilih cepat ke lokasi):
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                      Quick Select
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {sekolah.kondisi_sarana.map((ks) => {
                      const totalRusak =
                        (ks.kondisi_rusak_ringan || 0) +
                        (ks.kondisi_rusak_sedang || 0) +
                        (ks.kondisi_rusak_berat || 0)
                      const isSelected =
                        lokasiSpesifik.trim().toLowerCase() === ks.nama_ruang.toLowerCase()

                      return (
                        <button
                          key={ks.id}
                          type="button"
                          onClick={() => setLokasiSpesifik(ks.nama_ruang)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#0B3052] text-white border-[#0B3052] shadow-xs font-bold"
                              : "bg-white text-slate-700 border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/50"
                          }`}
                        >
                          <span>{ks.nama_ruang}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : totalRusak > 0
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {ks.jumlah} unit
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Edukasi Transparansi Dapodik */}
              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 leading-relaxed border-t border-blue-100/60">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Data di atas adalah rekaman resmi Dapodik semester ini. Laporkan ketidaksesuaian atau insiden
                  kerusakan fisik nyata pada formulir di bawah.
                </span>
              </div>
            </div>
          ) : selectedNpsn && sekolahState.status === "loading" ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-center text-xs text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#0B3052]" />
                Memuat rekaman data resmi Dapodik...
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                Pilih sekolah pada langkah 1 untuk melihat rekaman resmi Dapodik
              </p>
              <p className="text-[11px] text-slate-400">
                Data sarpras Dapodik akan ditampilkan otomatis sebagai baseline sebelum Anda menulis laporan.
              </p>
            </div>
          )}

          {/* 2. Tipe Temuan Lapangan */}
          <div data-coachmark="lapor-temuan" className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Tipe Temuan Lapangan <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "mismatch" as TipeTemuan,
                  label: "Ketidaksesuaian Data (Mismatch)",
                  desc: "Kondisi fisik di lapangan tidak sesuai dengan catatan resmi Dapodik di atas.",
                },
                {
                  value: "kerusakan_baru" as TipeTemuan,
                  label: "Kerusakan Baru / Insiden Mendadak",
                  desc: "Kerusakan terjadi baru-baru ini setelah pemutakhiran data semester.",
                },
              ].map((opt) => {
                const isChecked = tipeTemuan === opt.value
                return (
                  <div
                    key={opt.value}
                    onClick={() => setTipeTemuan(opt.value)}
                    className={`rounded-xl p-3.5 flex items-start gap-3.5 cursor-pointer transition-all ${
                      isChecked
                        ? "border-2 border-[#0B3052] bg-white shadow-2xs"
                        : "border border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked ? (
                      <div className="h-4 w-4 rounded-full border-2 border-[#0B3052] flex items-center justify-center shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-[#0B3052]" />
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

          {/* 3. Lokasi Ruang Spesifik */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              3. Lokasi Ruang / Fasilitas Terkait{" "}
              <span className="text-slate-400 font-normal lowercase">(opsional)</span>
            </label>
            <input
              type="text"
              value={lokasiSpesifik}
              onChange={(e) => setLokasiSpesifik(e.target.value.replace(/[<>]/g, "").slice(0, 100))}
              maxLength={100}
              placeholder="Contoh: Ruang Kelas 3, Gedung Barat sisi utara"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#0B3052] focus:outline-none focus:ring-1 focus:ring-[#0B3052] transition-colors"
            />
          </div>

          {/* 4. Deskripsi Fakta Lapangan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              4. Deskripsi Fakta Lapangan <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              maxLength={MAX_DESKRIPSI}
              placeholder="Jelaskan kondisi riil secara objektif. Contoh: Atap ruang kelas runtuh sebelah barat, plafon jebol dan air merembes saat hujan sehingga ruang tidak aman digunakan..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm placeholder:text-slate-400 focus:border-[#0B3052] focus:outline-none focus:ring-1 focus:ring-[#0B3052] transition-colors resize-none min-h-[96px]"
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

          {/* 5. Lampiran Bukti Foto */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              5. Lampiran Bukti Foto{" "}
              <span className="text-slate-400 font-normal lowercase">(opsional)</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setFotoFile(null)
                      setFotoError(null)
                    }}
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
                  <p className="text-[11px] text-slate-400">PNG, JPG · maksimal 2 MB</p>
                </>
              )}
            </div>
            {fotoError && <p className="text-[11px] text-rose-600 mt-1.5">{fotoError}</p>}
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Foto diunggah sebagai bukti fisik; metadata EXIF GPS dibersihkan otomatis di browser demi privasi pelapor.
            </p>
          </div>

          {/* Action Buttons */}
          <div data-coachmark="lapor-submit" className="flex items-center justify-end gap-3 pt-2">
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
              className="rounded-xl bg-[#0B3052] hover:bg-[#07213A] text-white px-5 py-2.5 text-sm font-bold shadow flex items-center gap-2 cursor-pointer h-auto transition-colors disabled:opacity-50"
            >
              {loading ? (
                fotoFile ? "Mengirim & mengunggah foto…" : "Mengirim laporan…"
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
