import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Inbox,
  LogIn,
  RefreshCw,
  ShieldQuestion,
  Sparkles,
  ThumbsUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import StatusBadge from "@/components/composite/StatusBadge"
import NumberedPagination from "@/components/composite/NumberedPagination"
import { useAuth } from "@/context/AuthContext"
import { useFetch } from "@/hooks/useFetch"
import { listKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import { statusVote, voteKlaster } from "@/lib/api/vote"
import { ApiError } from "@/lib/api/errors"
import type { KlasterListItem } from "@/lib/api/types"

/**
 * F3.1 — Halaman daftar klaster isu (rute `/klaster`, publik).
 *
 * Sebelumnya klaster hanya tampil sebagai widget Dashboard Wilayah dan kartu
 * 3 Detail Sekolah; kini punya tampilan sendiri dengan filter kategori
 * (server-side, `GET /klaster?kategori=`) dan pagination angka eksplisit
 * (mandate anti infinite-scroll, UI_COMPONENTS.md §5).
 *
 * Nama sekolah di-join dari `GET /sekolah` — respons klaster tidak mengirim
 * `sekolah_nama` (lihat `KlasterListItem`).
 */

const PAGE_SIZE = 12

const KATEGORI_LABEL: Record<string, string> = {
  ruang_belajar: "Ruang Belajar",
  sanitasi_air: "Sanitasi & Air Bersih",
  utilitas: "Utilitas",
  akses_lahan: "Akses Lahan",
  penunjang: "Sarana Penunjang",
  belum_terklasifikasi: "Belum Terklasifikasi",
}

const OPSI_KATEGORI: { value: string; label: string }[] = [
  { value: "", label: "Semua Kategori" },
  ...Object.entries(KATEGORI_LABEL).map(([value, label]) => ({ value, label })),
]

function prioritasBadgeCls(skor: number): string {
  if (skor >= 70) return "bg-rose-50 text-rose-800 border-rose-200"
  if (skor >= 40) return "bg-amber-50 text-amber-800 border-amber-200"
  return "bg-blue-50 text-blue-800 border-blue-200"
}

export default function DaftarKlaster() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const [page, setPage] = useState(1)
  const [kategori, setKategori] = useState("")

  const [voteStatuses, setVoteStatuses] = useState<
    Record<string, { has_voted: boolean; status_vote: string | null }>
  >({})
  const [konfirmasiOpen, setKonfirmasiOpen] = useState(false)
  const [klasterDipilih, setKlasterDipilih] = useState<KlasterListItem | null>(null)
  const [submittingVote, setSubmittingVote] = useState(false)
  const [voteFeedback, setVoteFeedback] = useState<{
    pesan: string
    tipe: "sukses" | "info" | "gagal"
  } | null>(null)

  const { state, refetch } = useFetch(
    () => listKlaster({ page, page_size: PAGE_SIZE, kategori: kategori || undefined }),
    [page, kategori],
  )
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: 100 }))

  const namaSekolah = useMemo(() => {
    const map = new Map<string, string>()
    if (sekolahState.status === "success") {
      for (const s of sekolahState.data.data) map.set(s.npsn, s.nama)
    }
    return map
  }, [sekolahState])

  const baris = state.status === "success" ? state.data.data : []
  const meta = state.status === "success" ? state.data.meta : null
  const totalPages = meta?.total_pages ?? 1
  const totalItems = meta?.total_items ?? 0

  useEffect(() => {
    if (!isAuthenticated || baris.length === 0) return
    let active = true

    Promise.all(
      baris.map(async (k) => {
        try {
          const res = await statusVote(k.klaster_id)
          return [k.klaster_id, res] as const
        } catch {
          return [k.klaster_id, { has_voted: false, status_vote: null }] as const
        }
      }),
    ).then((entries) => {
      if (!active) return
      const map: Record<string, { has_voted: boolean; status_vote: string | null }> = {}
      for (const [id, s] of entries) {
        map[id] = s
      }
      setVoteStatuses((prev) => ({ ...prev, ...map }))
    })

    return () => {
      active = false
    }
  }, [baris, isAuthenticated])

  const gantiKategori = (value: string) => {
    setKategori(value)
    setPage(1)
  }

  const handleVoteClick = (k: KlasterListItem) => {
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(location.pathname + location.search)
      navigate(`/login?redirect=${redirect}`)
      return
    }
    setKlasterDipilih(k)
    setKonfirmasiOpen(true)
  }

  const kirimVote = async () => {
    if (!klasterDipilih) return
    setSubmittingVote(true)
    setVoteFeedback(null)
    const targetId = klasterDipilih.klaster_id
    try {
      const res = await voteKlaster(targetId)
      setVoteFeedback(
        res.status_vote === "pending"
          ? {
              pesan:
                "Vote tercatat — menunggu masa tunda verifikasi akun (belum dihitung ke skor).",
              tipe: "info",
            }
          : { pesan: "Vote tercatat — dukunganmu menaikkan skor prioritas isu ini.", tipe: "sukses" },
      )
      setVoteStatuses((prev) => ({
        ...prev,
        [targetId]: { has_voted: true, status_vote: res.status_vote },
      }))
      setKonfirmasiOpen(false)
      refetch()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "ALREADY_VOTED") {
          setKonfirmasiOpen(false)
          setVoteFeedback({ pesan: "Anda sudah memberikan vote sebelumnya.", tipe: "info" })
          setVoteStatuses((prev) => ({
            ...prev,
            [targetId]: { has_voted: true, status_vote: "dihitung" },
          }))
          return
        }
        if (err.code === "UNAUTHORIZED") {
          setKonfirmasiOpen(false)
          const redirect = encodeURIComponent(location.pathname + location.search)
          navigate(`/login?redirect=${redirect}`)
          return
        }
        setVoteFeedback({ pesan: err.message, tipe: "gagal" })
        setKonfirmasiOpen(false)
        return
      }
      setVoteFeedback({ pesan: "Gagal mengirim vote. Coba lagi.", tipe: "gagal" })
      setKonfirmasiOpen(false)
    } finally {
      setSubmittingVote(false)
    }
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* Header */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Isu Sarpras Terkelompokkan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Daftar Klaster Isu
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Isu dari laporan warga yang digabungkan berdasarkan kesamaan pola — diurutkan dari
            skor prioritas tertinggi. Klik isu untuk detail, dukungan (vote), dan status tindak lanjut.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {/* Feedback vote */}
        {voteFeedback && (
          <div
            role="alert"
            className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-start justify-between gap-3 ${
              voteFeedback.tipe === "gagal"
                ? "border-rose-300 bg-rose-50 text-rose-900"
                : voteFeedback.tipe === "info"
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            <span className="flex items-center gap-2">
              {voteFeedback.tipe === "gagal" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : voteFeedback.tipe === "info" ? (
                <Clock3 className="h-4 w-4 shrink-0 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span>{voteFeedback.pesan}</span>
            </span>
            <button
              type="button"
              onClick={() => setVoteFeedback(null)}
              className="text-current hover:opacity-70 text-xs font-bold underline cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        )}
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative">
            <select
              value={kategori}
              onChange={(e) => gantiKategori(e.target.value)}
              aria-label="Filter kategori isu"
              className="h-9 text-xs font-semibold bg-white border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm appearance-none"
            >
              {OPSI_KATEGORI.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              <strong className="text-slate-700">{totalItems}</strong> isu terdaftar
            </span>
            <Button
              variant="outline"
              onClick={refetch}
              className="h-9 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
            </Button>
          </div>
        </div>

        {/* Daftar kartu */}
        {state.status === "loading" ? (
          <div className="py-16 text-center text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Memuat daftar isu...
            </span>
          </div>
        ) : state.status === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-5 py-8 text-center space-y-2">
            <p className="text-sm font-bold text-rose-800">Gagal memuat daftar isu</p>
            <p className="text-xs text-rose-700">{state.message}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="text-xs">
              Coba Lagi
            </Button>
          </div>
        ) : baris.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center space-y-2">
            <Inbox className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {kategori ? "Tidak ada isu pada kategori ini" : "Belum ada klaster isu"}
            </p>
            <p className="text-xs text-slate-400">
              {kategori
                ? "Coba pilih kategori lain."
                : "Isu akan muncul setelah laporan warga terverifikasi dan terklasterisasi."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {baris.map((k) => (
              <li
                key={k.klaster_id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-primary-border hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-ink-secondary uppercase tracking-wider">
                      {KATEGORI_LABEL[k.kategori] ?? k.kategori}
                    </span>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-black ${prioritasBadgeCls(k.skor_prioritas)}`}
                      title="Skor prioritas dari backend"
                    >
                      {k.skor_prioritas}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                      {k.label ?? "Klaster isu tanpa label"}
                    </h2>
                    <p className="text-[11px] text-slate-500 truncate">
                      {namaSekolah.get(k.sekolah_npsn) ?? "Sekolah"} · NPSN {k.sekolah_npsn}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-2">
                    <div className="pb-1">
                      <StatusBadge status={k.status_verifikasi} />
                    </div>

                    {/* Button vote tepat di kanan, berada tepat di atas 'Lihat Detail' */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!isAuthenticated ? (
                        <Button
                          size="sm"
                          onClick={() => handleVoteClick(k)}
                          className="bg-[#0B3052] hover:bg-[#07213A] text-white text-xs h-9 px-4 rounded-full shadow-sm cursor-pointer font-semibold inline-flex items-center"
                        >
                          <LogIn className="h-3.5 w-3.5 mr-1.5" /> Vote
                        </Button>
                      ) : voteStatuses[k.klaster_id]?.has_voted &&
                        voteStatuses[k.klaster_id]?.status_vote === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 text-xs font-bold">
                          <Clock3 className="h-3.5 w-3.5" /> Menunggu Masa Tunda
                        </span>
                      ) : voteStatuses[k.klaster_id]?.has_voted ? (
                        <Button
                          size="sm"
                          disabled
                          className="bg-slate-100 text-slate-500 border border-slate-200 text-xs h-9 px-4 rounded-full cursor-not-allowed font-semibold inline-flex items-center"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Sudah Vote
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleVoteClick(k)}
                          className="bg-[#0B3052] hover:bg-[#07213A] text-white text-xs h-9 px-4 rounded-full shadow-sm cursor-pointer font-semibold inline-flex items-center"
                        >
                          <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Vote Sekarang
                        </Button>
                      )}

                      <span className="text-[11px] text-slate-400">
                        {k.jumlah_vote_terhitung} dukungan terhitung
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Link
                    to={`/klaster/${k.klaster_id}/status`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary"
                  >
                    <ShieldQuestion className="h-3.5 w-3.5" /> Status
                  </Link>
                  <Link
                    to={`/klaster/${k.klaster_id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Lihat Detail <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination angka eksplisit */}
        <NumberedPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Dialog Konfirmasi Vote */}
      <Dialog open={konfirmasiOpen} onOpenChange={setKonfirmasiOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <ThumbsUp className="h-4 w-4 text-[#0B3052]" /> Dukung isu ini?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 leading-relaxed">
              Vote Anda akan menaikkan skor prioritas isu &ldquo;
              {klasterDipilih?.label ?? klasterDipilih?.kategori}&rdquo; agar lebih cepat ditangani
              Dinas. Satu akun hanya boleh vote satu kali untuk isu yang sama.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setKonfirmasiOpen(false)}
              disabled={submittingVote}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={kirimVote}
              disabled={submittingVote}
              className="bg-[#0B3052] hover:bg-[#07213A] text-white text-xs cursor-pointer font-semibold"
            >
              {submittingVote ? "Mengirim..." : "Ya, Vote Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
