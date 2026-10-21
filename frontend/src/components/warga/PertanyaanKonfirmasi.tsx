import { useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  SkipForward,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getKonfirmasi, postKonfirmasi } from "@/lib/api/laporan"
import { ApiError } from "@/lib/api/errors"
import type {
  JawabanKonfirmasi,
  KonfirmasiDetail,
  KonfirmasiHasil,
  KonfirmasiPertanyaan,
} from "@/lib/api/types"

/**
 * F4.13 T2 — Modal pertanyaan konfirmasi severity pasca-laporan.
 *
 * Kontrak: INTERFACES.md §4.2–§4.3 (disetujui 20 Okt 2026 — 5 keputusan
 * §11.1: sekali GET · field `kode` · endpoint terpisah · lewati = POST
 * `jawaban: []` · verifikator tidak mengubah jawaban warga).
 *
 * Prinsip (SPEC §19.6): OPSIONAL & tidak memblokir — tombol "Lewati semua
 * pertanyaan" selalu terlihat. Aturan `pilih_satu_bertingkat` diterapkan di
 * FE: begitu satu gejala dipilih, opsi lebih ringan di bawahnya
 * disembunyikan (§4.2 catatan bentuk).
 */

/** Warna tingkat memakai enum kondisi resmi (`tingkat`). */
const WARNA_TINGKAT: Record<string, string> = {
  rusak_total: "border-rose-300 bg-rose-50 text-rose-900",
  rusak_berat: "border-rose-200 bg-rose-50/70 text-rose-800",
  rusak_sedang: "border-amber-200 bg-amber-50 text-amber-900",
  rusak_ringan: "border-blue-200 bg-blue-50 text-blue-900",
  baik: "border-emerald-200 bg-emerald-50 text-emerald-900",
}

interface PertanyaanKonfirmasiProps {
  laporanId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `hasil = null` bila gagal / sudah pernah dijawab (409) — induk tetap menutup + memberi info. */
  onSelesai: (hasil: KonfirmasiHasil | null) => void
}

export default function PertanyaanKonfirmasi({
  laporanId,
  open,
  onOpenChange,
  onSelesai,
}: PertanyaanKonfirmasiProps) {
  const [detail, setDetail] = useState<KonfirmasiDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jawaban, setJawaban] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Sekali GET memuat seluruh pertanyaan (keputusan §11.1 #1).
  useEffect(() => {
    if (!open || !laporanId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setSubmitError(null)
    setJawaban({})
    setDetail(null)
    getKonfirmasi(laporanId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setError(
            err.code === "FORBIDDEN"
              ? "Anda bukan pemilik laporan ini."
              : err.code === "NOT_FOUND"
                ? "Laporan tidak ditemukan."
                : err.code === "UNAUTHORIZED"
                  ? "Sesi berakhir — silakan login kembali."
                  : err.message,
          )
        } else {
          setError("Gagal memuat pertanyaan konfirmasi.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, laporanId])

  const kirim = async (daftarJawaban: JawabanKonfirmasi[]) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const hasil = await postKonfirmasi(laporanId, daftarJawaban)
      onSelesai(hasil)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // 409 = sudah pernah dijawab — tidak boleh menimpa (§4.3).
        if (err.status === 409) {
          onSelesai(null)
          return
        }
        if (err.code === "UNAUTHORIZED") {
          setError("Sesi berakhir — silakan login kembali.")
          onOpenChange(false)
          return
        }
        setSubmitError(err.message)
      } else {
        setSubmitError("Gagal mengirim jawaban. Coba lagi.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    const daftar: JawabanKonfirmasi[] = Object.entries(jawaban).map(([kode, nilai]) => ({
      kode,
      nilai,
    }))
    void kirim(daftar)
  }

  const handleLewatiSemua = () => {
    void kirim([])
  }

  const pilihJawaban = (kodePertanyaan: string, nilai: string) => {
    setJawaban((prev) => ({ ...prev, [kodePertanyaan]: nilai }))
  }

  /** Aturan §4.2: pilih gejala → opsi lebih ringan (di bawahnya) disembunyikan. */
  const pilihanTampak = (p: KonfirmasiPertanyaan) => {
    if (p.tipe !== "pilih_satu_bertingkat" || !p.lewati_bila_terjawab) return p.pilihan
    const terpilih = jawaban[p.kode]
    if (!terpilih) return p.pilihan
    const idx = p.pilihan.findIndex((o) => o.kode === terpilih)
    return idx >= 0 ? p.pilihan.slice(0, idx + 1) : p.pilihan
  }

  const adaPertanyaan = (detail?.pertanyaan.length ?? 0) > 0
  const sudahSelesai = detail !== null && detail.status !== "menunggu"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <HelpCircle className="h-4 w-4 text-primary" /> Konfirmasi Tingkat Kerusakan
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed">
            Jawaban singkat ini membantu AI menentukan kondisi sarpras lebih akurat. Bersifat
            <strong> opsional</strong> — laporan Anda tetap sah meski dilewati (maksimal 1 menit).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-1 -mr-1 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat pertanyaan...
              </span>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          ) : sudahSelesai ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-center space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-emerald-900">
                Konfirmasi sudah {detail?.status === "terjawab" ? "terjawab" : "dilewati"}
              </p>
              <p className="text-xs text-emerald-800">
                Jawaban tidak dapat diubah lagi untuk laporan ini.
              </p>
            </div>
          ) : !adaPertanyaan ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-center">
              <p className="text-sm font-semibold text-slate-600">
                Tidak ada pertanyaan yang perlu dijawab untuk laporan ini.
              </p>
            </div>
          ) : (
            detail!.pertanyaan.map((p) => {
              const terpilih = jawaban[p.kode]
              return (
                <fieldset key={p.kode} className="space-y-2">
                  <legend className="text-sm font-bold text-slate-800 leading-snug mb-2">
                    {p.teks}
                    <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                      {p.tipe === "pilih_satu_bertingkat"
                        ? "Pilih satu — pilihan lebih ringan otomatis tidak ditawarkan."
                        : "Pilih satu jawaban."}
                    </span>
                  </legend>

                  <div className="grid gap-1.5">
                    {pilihanTampak(p).map((o) => {
                      const aktif = terpilih === o.kode
                      const warna = o.tingkat ? WARNA_TINGKAT[o.tingkat] : ""
                      return (
                        <label
                          key={o.kode}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            aktif
                              ? "border-primary bg-primary-light ring-1 ring-primary"
                              : warna || "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${p.kode}`}
                            value={o.kode}
                            checked={aktif}
                            onChange={() => pilihJawaban(p.kode, o.kode)}
                            className="accent-[#0B3052] cursor-pointer"
                          />
                          <span className="font-semibold text-current">{o.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })
          )}

          {submitError && (
            <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-900">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleLewatiSemua}
            disabled={loading || submitting || sudahSelesai}
            className="text-xs text-slate-600 cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Lewati semua pertanyaan
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || submitting || sudahSelesai || Object.keys(jawaban).length === 0}
            className="bg-primary hover:opacity-90 text-white text-xs cursor-pointer"
          >
            {submitting ? "Mengirim..." : "Kirim Jawaban"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
