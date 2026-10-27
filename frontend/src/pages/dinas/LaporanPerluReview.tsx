import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  ClipboardList,
  RotateCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import { perluReviewLaporan, updateStatusLaporan } from "@/lib/api/laporan"
import { ApiError } from "@/lib/api/errors"
import type { LaporanPerluReview } from "@/lib/api/types"

/**
 * F4.7 (D-21) — Verifikasi manual per laporan.
 *
 * Sumber data: `GET /laporan/perlu-review` — laporan tanpa klaster (noise
 * HDBSCAN, `klaster: null`) ATAU klaster kategori `belum_terklasifikasi`.
 * Aksi: `PUT /laporan/{id}/status` → `menunggu | divalidasi | ditolak`.
 * RBAC keduanya: `admin`, `kepala_dinas` (INTERFACES.md §4).
 *
 * Keterbatasan v1 (kontrak): belum ada field alasan penolakan —
 * verifikator cukup memilih Tolak tanpa catatan terstruktur.
 */
const PAGE_SIZE = 20

type StatusSanggahan = "menunggu" | "divalidasi" | "ditolak"

const STATUS_BADGE: Record<StatusSanggahan, string> = {
  menunggu: "bg-amber-100 text-amber-800 border border-amber-200",
  divalidasi: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  ditolak: "bg-rose-100 text-rose-800 border border-rose-200",
}

const STATUS_LABEL: Record<StatusSanggahan, string> = {
  menunggu: "Menunggu",
  divalidasi: "Divalidasi",
  ditolak: "Ditolak",
}

const KONDISI_LABEL: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_sedang: "Rusak Sedang",
  rusak_berat: "Rusak Berat",
  rusak_total: "Rusak Total",
}

function formatTanggal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusKeEnum(s: string): StatusSanggahan {
  return s === "divalidasi" || s === "ditolak" ? s : "menunggu"
}

/** Badge asal klaster: noise (null) vs label-fallback `belum_terklasifikasi`. */
function KlasterBadge({ klaster }: { klaster: LaporanPerluReview["klaster"] }) {
  if (!klaster) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
        Tanpa klaster (noise)
      </span>
    )
  }
  const fallback = klaster.kategori === "belum_terklasifikasi"
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
        fallback
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      }`}
      title={klaster.label ?? klaster.kategori}
    >
      {klaster.label ?? klaster.kategori}
    </span>
  )
}

export default function LaporanPerluReview() {
  const [page, setPage] = useState(1)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<
    { pesan: string; tipe: "sukses" | "gagal" } | null
  >(null)

  const { user } = useAuth()
  const bolehAksi = user?.role === "admin" || user?.role === "verifikator_dinas"
  const isKadis = user?.role === "kepala_dinas"

  const { state, refetch } = useFetch(
    () => perluReviewLaporan({ page, page_size: PAGE_SIZE }),
    [page],
  )

  const rows = state.status === "success" ? state.data.data : []
  const meta = state.status === "success" ? state.data.meta : null
  const totalPages = meta?.total_pages ?? 1
  const totalItems = meta?.total_items ?? 0

  const handleStatus = async (id: string, status: StatusSanggahan) => {
    setAksiId(id)
    setFeedback(null)
    try {
      const res = await updateStatusLaporan(id, status)
      setFeedback({
        pesan: `Laporan ${res.tracking_id} → ${STATUS_LABEL[status]}.`,
        tipe: "sukses",
      })
      refetch()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal memperbarui status laporan."
      setFeedback({ pesan: msg, tipe: "gagal" })
    } finally {
      setAksiId(null)
    }
  }

  // Error umum (termasuk 403 untuk role tanpa akses).
  if (state.status === "error") {
    const forbidden = state.code === "FORBIDDEN"
    return (
      <div className="flex items-center justify-center px-6 py-24 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-lg font-extrabold text-slate-900">
            {forbidden ? "Akses ditolak" : "Data tidak dapat dimuat"}
          </p>
          <p className="text-sm text-slate-600">{state.message}</p>
          {forbidden ? (
            <p className="text-xs text-slate-500">
              Halaman ini khusus peran <strong>admin</strong> dan{" "}
              <strong>kepala_dinas</strong>.
            </p>
          ) : (
            <button
              type="button"
              onClick={refetch}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B3052] px-5 text-xs font-bold text-white hover:bg-[#07213A] cursor-pointer"
            >
              <RotateCw className="h-4 w-4" /> Coba Lagi
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ClipboardList className="h-4 w-4 text-[#0B3052]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              F4.7 · D-21 · Verifikasi Manual Per Laporan
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Laporan Perlu Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Laporan warga tanpa klaster (noise AI) atau masuk klaster belum
            terklasifikasi — diverifikasi satu per satu oleh dinas.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refetch}
          className="h-9 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5" /> Muat Ulang
        </Button>
      </div>

      {/* Stat — hanya angka dari meta backend */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Total Perlu Review</p>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {state.status === "success" || state.status === "empty" ? totalItems : "—"}
          </div>
          <p className="text-[11px] text-slate-400">
            noise + belum terklasifikasi
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Di Halaman Ini</p>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {state.status === "success" ? rows.length : "—"}
          </div>
          <p className="text-[11px] text-slate-400">baris pada halaman {page}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Aksi Verifikasi</p>
          <div className="text-sm font-extrabold text-slate-900">
            {bolehAksi ? "Diizinkan" : isKadis ? "Mode Pengawasan" : "Tidak diizinkan"}
          </div>
          <p className="text-[11px] text-slate-400">
            {bolehAksi
              ? "role Anda dapat memvalidasi / menolak"
              : isKadis
              ? "read-only (verifikasi oleh Verifikator Dinas)"
              : "hanya admin & verifikator dinas"}
          </p>
        </div>
      </div>

      {/* Feedback aksi */}
      {feedback && (
        <div
          role="alert"
          className={`rounded-xl border p-4 text-xs font-semibold shadow-sm flex items-center justify-between ${
            feedback.tipe === "gagal"
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipe === "gagal" ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.pesan}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current hover:opacity-70 text-xs font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabel */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {state.status === "loading" ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0B3052]" />
              Memuat laporan perlu review…
            </span>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="text-sm font-bold text-slate-700">
              Tidak ada laporan yang menunggu review
            </p>
            <p className="text-xs text-slate-400">
              Seluruh laporan sudah terklaster dan terverifikasi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Tracking</th>
                  <th className="py-3 px-4">Sekolah</th>
                  <th className="py-3 px-4">Temuan</th>
                  <th className="py-3 px-4">Klaster</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tanggal</th>
                  {bolehAksi && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((l) => {
                  const status = statusKeEnum(l.status_sanggahan)
                  const sibuk = aksiId === l.id
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors align-top">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {l.tracking_id}
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <span className="block font-semibold text-slate-800 truncate">
                          {l.sekolah_nama ?? "—"}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          {l.sekolah_npsn}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[280px]">
                        {l.fasilitas_terkait && (
                          <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            {l.fasilitas_terkait}
                            {l.kondisi_dilaporkan && (
                              <>
                                {" · "}
                                <span className="text-slate-400 font-normal">
                                  {KONDISI_LABEL[l.kondisi_dilaporkan] ??
                                    l.kondisi_dilaporkan}
                                </span>
                              </>
                            )}
                          </span>
                        )}
                        <p
                          className="text-slate-700 leading-relaxed"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={l.deskripsi}
                        >
                          {l.deskripsi}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <KlasterBadge klaster={l.klaster} />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {formatTanggal(l.created_at)}
                      </td>
                      {bolehAksi && (
                        <td className="py-3 px-4">
                          {status === "menunggu" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={sibuk}
                                onClick={() => handleStatus(l.id, "divalidasi")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="h-3 w-3" /> Validasi
                              </button>
                              <button
                                type="button"
                                disabled={sibuk}
                                onClick={() => handleStatus(l.id, "ditolak")}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-[11px] font-bold px-2.5 py-1.5 border border-rose-200 cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="h-3 w-3" /> Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-[10px] text-slate-400">
                              selesai
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman <strong className="text-slate-700">{page}</strong> dari{" "}
            <strong className="text-slate-700">{totalPages}</strong> ·{" "}
            {totalItems} laporan
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs font-semibold border-slate-200 cursor-pointer disabled:opacity-40"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs font-semibold border-slate-200 cursor-pointer disabled:opacity-40"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* Catatan kontrak v1 */}
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Seleksi mengikuti D-21: laporan <code className="font-mono">noise</code>{" "}
        HDBSCAN (tanpa klaster) atau klaster kategori{" "}
        <code className="font-mono">belum_terklasifikasi</code>. Keterbatasan v1:
        belum ada field alasan penolakan pada{" "}
        <code className="font-mono">PUT /laporan/&#123;id&#125;/status</code>.
      </p>
    </div>
  )
}
