import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  History,
  Inbox,
  RefreshCw,
  ShieldQuestion,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import InstitutionalStepper, { tahapDariStatus } from "@/components/composite/InstitutionalStepper"
import { useFetch, useStatusPolling } from "@/hooks/useFetch"
import { detailKlaster, riwayatStatus } from "@/lib/api/klaster"
import type { RiwayatStatusEntry } from "@/lib/api/types"

/**
 * F3.3 — Halaman Status Tindak Lanjut (publik) per klaster.
 *
 * Sumber data: `GET /klaster/{id}/riwayat` (publik, append-only —
 * INTERFACES.md §7) dengan **polling 15 detik** (`useStatusPolling`),
 * ditambah `GET /klaster/{id}` untuk judul isu/sekolah.
 *
 * State wajib mengikuti PAGE_STATES.md §A5:
 * - menunggu_verifikasi → badge netral "Sedang ditinjau"
 * - tidak_terverifikasi / tidak_dapat_ditindaklanjuti → **alasan wajib tampil**
 * - dalam_antrian_prioritas → badge kuning; dalam_proses → stepper tahap 3
 * - selesai → badge hijau, stepper penuh
 */

const POLL_INTERVAL_MS = 15_000

type MetaStatus = {
  label: string
  teks: string
  badgeCls: string
  negatif: boolean
}

const STATUS_META: Record<string, MetaStatus> = {
  menunggu_verifikasi: {
    label: "Sedang Ditinjau",
    teks: "Laporan Anda sedang ditinjau oleh Verifikator Dinas.",
    badgeCls: "bg-surface-alt text-ink-secondary border border-border",
    negatif: false,
  },
  terverifikasi: {
    label: "Terverifikasi",
    teks: "Isu terverifikasi dan masuk dalam perhitungan skor prioritas.",
    badgeCls: "bg-primary-light text-primary border border-primary-border",
    negatif: false,
  },
  tidak_terverifikasi: {
    label: "Tidak Terverifikasi",
    teks: "Isu ini belum dapat ditindaklanjuti sebagai isu valid.",
    badgeCls: "bg-danger-light text-danger-text border border-danger-border",
    negatif: true,
  },
  dalam_antrian_prioritas: {
    label: "Dalam Antrian Prioritas",
    teks: "Isu masuk dalam daftar rencana alokasi anggaran & logistik Dinas.",
    badgeCls: "bg-warning-light text-warning-text border border-warning-border",
    negatif: false,
  },
  dalam_proses: {
    label: "Dalam Proses",
    teks: "Pekerjaan penanganan sarpras sedang berlangsung di lapangan.",
    badgeCls: "bg-warning-light text-warning-text border border-warning-border",
    negatif: false,
  },
  selesai: {
    label: "Selesai",
    teks: "Penanganan isu ini telah tuntas.",
    badgeCls: "bg-primary-light text-primary border border-primary-border",
    negatif: false,
  },
  tidak_dapat_ditindaklanjuti: {
    label: "Tidak Dapat Ditindaklanjuti",
    teks: "Isu ini tidak dapat ditindaklanjuti oleh Dinas.",
    badgeCls: "bg-danger-light text-danger-text border border-danger-border",
    negatif: true,
  },
}

function formatWaktu(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function StatusTindakLanjutWarga() {
  const { klasterId } = useParams<{ klasterId: string }>()
  const id = klasterId ?? ""

  const { state: klasterState, refetch: refetchKlaster } = useFetch(() => detailKlaster(id), [id])
  const {
    state: riwayatState,
    refetch: refetchRiwayat,
  } = useStatusPolling(() => riwayatStatus(id), POLL_INTERVAL_MS, [id])

  const riwayat: RiwayatStatusEntry[] = useMemo(() => {
    if (riwayatState.status === "success") return riwayatState.data
    if (riwayatState.status === "empty") return []
    return []
  }, [riwayatState])

  const terakhir = riwayat.length > 0 ? riwayat[riwayat.length - 1] : null
  const statusKini = terakhir?.status ?? null
  const meta = statusKini ? STATUS_META[statusKini] : null
  const negatif = meta?.negatif ?? false
  const alasan = terakhir?.alasan ?? null
  const tahap = negatif ? null : tahapDariStatus(statusKini)

  const klaster = klasterState.status === "success" ? klasterState.data : null

  // ── Gagal memuat (mis. klaster tidak ada) ─────────────────────────────────
  if (klasterState.status === "error") {
    const notFound = klasterState.code === "NOT_FOUND"
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-2xl font-extrabold text-slate-900">
            {notFound ? "Klaster tidak ditemukan" : "Gagal memuat status"}
          </p>
          <p className="text-sm text-slate-500">
            {notFound
              ? "Isu yang Anda cari tidak terdaftar di SIMAKIS."
              : klasterState.message}
          </p>
          <div className="flex justify-center gap-3">
            {!notFound && (
              <Button onClick={refetchKlaster} className="bg-primary hover:opacity-90 text-white text-sm">
                Coba Lagi
              </Button>
            )}
            <Link to="/klaster">
              <Button variant="outline" className="text-sm">
                Lihat Daftar Isu
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white py-3 text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-1.5 font-medium min-w-0 flex-wrap">
            <Link to="/klaster" className="text-slate-600 hover:text-primary">Daftar Isu</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              to={`/klaster/${id}`}
              className="text-slate-600 hover:text-primary truncate max-w-[260px]"
            >
              {klaster ? (klaster.label ?? klaster.kategori) : "Klaster Isu"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-bold text-slate-900">Status Tindak Lanjut</span>
          </div>
          <Link
            to={`/klaster/${id}`}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Isu
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pt-6 space-y-6">
        {/* Header judul */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase flex-wrap">
            <ShieldQuestion className="h-4 w-4 text-primary" />
            <span>Status Tindak Lanjut Isu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {klaster ? (klaster.label ?? klaster.kategori) : "Memuat isu..."}
          </h1>
          {klaster && (
            <p className="text-xs text-slate-500">
              {klaster.sekolah_nama ?? klaster.sekolah_npsn} · NPSN {klaster.sekolah_npsn}
            </p>
          )}
        </div>

        {/* Kartu status utama */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <span
                className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-bold ${
                  meta ? meta.badgeCls : "bg-surface-alt text-ink-secondary border border-border"
                }`}
              >
                {meta ? meta.label : "Belum Ada Catatan Status"}
              </span>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                {meta
                  ? meta.teks
                  : "Isu ini terdaftar tetapi belum memiliki catatan status tindak lanjut dari Dinas."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Diperbarui otomatis tiap 15 detik
              <button
                type="button"
                onClick={refetchRiwayat}
                className="inline-flex items-center gap-1 text-primary font-bold hover:underline cursor-pointer"
                aria-label="Muat ulang status"
              >
                <RefreshCw className="h-3 w-3" /> Muat ulang
              </button>
            </div>
          </div>

          {/* Alasan — WAJIB tampil untuk status negatif (PAGE_STATES §A5) */}
          {negatif && (
            <div className="rounded-xl border border-danger-border bg-danger-light px-4 py-3 space-y-1">
              <p className="text-xs font-extrabold text-danger-text uppercase tracking-wider">
                Alasan {meta?.label}
              </p>
              <p className="text-sm text-slate-800 leading-relaxed">
                {alasan && alasan.trim() ? alasan : "Alasan tidak dicatat dalam riwayat."}
              </p>
            </div>
          )}

          {/* Alasan opsional untuk status non-negatif bila ada */}
          {!negatif && alasan && alasan.trim() && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan Dinas</p>
              <p className="text-sm text-slate-700 leading-relaxed">{alasan}</p>
            </div>
          )}

          {/* Stepper — hanya jalur positif (A5) */}
          <div className="pt-2 border-t border-slate-100">
            <InstitutionalStepper tahapAktif={tahap ?? 0} />
            {tahap === null && !negatif && statusKini === null && (
              <p className="text-center text-[11px] text-slate-400 mt-3">
                Tahapan tindak lanjut akan tampil setelah Dinas mencatat status pertama.
              </p>
            )}
          </div>
        </div>

        {/* Riwayat timeline (append-only) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Riwayat Tindak Lanjut
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Catatan bersifat permanen dan bertambah (append-only) — tidak pernah dihapus.
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shrink-0">
              {riwayat.length} catatan
            </span>
          </div>

          {riwayatState.status === "loading" ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Memuat riwayat status...
              </span>
            </div>
          ) : riwayat.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center space-y-1.5">
              <Inbox className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">Belum ada riwayat</p>
              <p className="text-[11px] text-slate-500">
                Belum ada perubahan status yang dicatat Dinas untuk isu ini.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {[...riwayat].reverse().map((entry, i) => {
                const m = STATUS_META[entry.status]
                const kunci = `${entry.timestamp}-${i}`
                return (
                  <li key={kunci} className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          m ? m.badgeCls : "bg-surface-alt text-ink-secondary border border-border"
                        }`}
                      >
                        {m ? m.label : entry.status}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock className="h-3.5 w-3.5" /> {formatWaktu(entry.timestamp)}
                      </span>
                    </div>
                    {entry.alasan && entry.alasan.trim() && (
                      <p className="text-xs text-slate-700 leading-relaxed">{entry.alasan}</p>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Ingin mendukung isu ini?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Dukungan warga (vote) menaikkan skor prioritas isu agar lebih cepat ditangani Dinas.
            </p>
          </div>
          <Link to={`/klaster/${id}`} className="shrink-0">
            <Button className="bg-primary hover:opacity-90 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer">
              Buka Detail Isu &amp; Vote
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
