import { useState } from "react"
import { Link, useLocation, useParams, useNavigate } from "react-router-dom"
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
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import { detailKlaster } from "@/lib/api/klaster"
import { statusVote, voteKlaster } from "@/lib/api/vote"
import { ApiError } from "@/lib/api/errors"
import {
  ChevronRight,
  ArrowLeft,
  FileText,
  CalendarDays,
  Info,
  Inbox,
  ThumbsUp,
  CheckCircle2,
  Clock3,
  LogIn,
  AlertTriangle,
  ShieldQuestion,
} from "lucide-react"

// Label kategori klaster — memakai taksonomi backend v1 (INTERFACES.md §5).
const KATEGORI_LABEL: Record<string, string> = {
  ruang_belajar: "Ruang Belajar",
  sanitasi_air: "Sanitasi & Air Bersih",
  utilitas: "Utilitas",
  akses_lahan: "Akses Lahan",
  penunjang: "Sarana Penunjang",
  belum_terklasifikasi: "Belum Terklasifikasi",
}

function formatTanggal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function prioritasLabel(skor: number): string {
  if (skor >= 70) return "Prioritas Tinggi"
  if (skor >= 40) return "Prioritas Sedang"
  return "Prioritas Rendah"
}

function prioritasBadgeCls(skor: number): string {
  if (skor >= 70) return "bg-rose-50 text-rose-800 border-rose-200"
  if (skor >= 40) return "bg-amber-50 text-amber-800 border-amber-200"
  return "bg-blue-50 text-blue-800 border-blue-200"
}

const STATUS_PENJELASAN: Record<string, string> = {
  terverifikasi:
    "Klaster telah diverifikasi oleh Verifikator Dinas dan masuk dalam daftar tindak lanjut prioritas.",
  menunggu_verifikasi:
    "Menunggu hasil verifikasi Verifikator Dinas sebelum klaster ditindaklanjuti.",
  tidak_terverifikasi:
    "Laporan dalam klaster ini belum dapat ditindaklanjuti sebagai isu valid — periksa catatan verifikasi Dinas.",
}

export default function DetailKlaster() {
  const { klasterId } = useParams<{ klasterId: string }>()
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const { state, refetch } = useFetch(
    () => detailKlaster(klasterId ?? ""),
    [klasterId],
  )

  // ── F3.2 (PAGE_STATES §A3) — status vote akun ini pada klaster ────────────
  // Tamu: fetch dilewati (resolve null → state "empty"), tombol mengarahkan
  // ke login. Login: `GET /vote/status/{id}` (INTERFACES §6).
  const { state: voteState, refetch: refetchVote } = useFetch(
    () => (isAuthenticated && klasterId ? statusVote(klasterId) : Promise.resolve(null)),
    [klasterId, isAuthenticated],
  )

  const [konfirmasiOpen, setKonfirmasiOpen] = useState(false)
  const [submittingVote, setSubmittingVote] = useState(false)
  const [voteFeedback, setVoteFeedback] = useState<
    { pesan: string; tipe: "sukses" | "info" | "gagal" } | null
  >(null)

  const vote = voteState.status === "success" ? voteState.data : null
  const sudahVote = vote?.has_voted ?? false
  const voteLoading = voteState.status === "loading"

  const keLogin = () => {
    const redirect = encodeURIComponent(location.pathname + location.search)
    navigate(`/login?redirect=${redirect}`)
  }

  const kirimVote = async () => {
    if (!klasterId) return
    setSubmittingVote(true)
    setVoteFeedback(null)
    try {
      await voteKlaster(klasterId)
      setVoteFeedback({
        pesan: "Vote tercatat — dukunganmu menaikkan skor prioritas isu ini.",
        tipe: "sukses",
      })
      setKonfirmasiOpen(false)
      refetchVote()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "ALREADY_VOTED") {
          setKonfirmasiOpen(false)
          setVoteFeedback({ pesan: "Anda sudah memberikan vote sebelumnya.", tipe: "info" })
          refetchVote()
          return
        }
        if (err.code === "UNAUTHORIZED") {
          setKonfirmasiOpen(false)
          keLogin()
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

  // ── Memuat / gagal ────────────────────────────────────────────────────────
  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
        Memuat data klaster...
      </div>
    )
  }

  if (state.status === "error") {
    const notFound = state.code === "NOT_FOUND"
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-2xl font-extrabold text-slate-900">
            {notFound ? "Klaster tidak ditemukan" : "Gagal memuat klaster"}
          </p>
          <p className="text-sm text-slate-500">
            {notFound ? (
              <>
                ID klaster <span className="font-mono font-semibold text-slate-700">{klasterId}</span> tidak terdaftar.
              </>
            ) : (
              state.message
            )}
          </p>
          <div className="flex justify-center gap-3">
            {!notFound && (
              <Button onClick={refetch} className="bg-[#0B3052] hover:bg-[#07213A] text-white text-sm">
                Coba Lagi
              </Button>
            )}
            <Link to="/sekolah">
              <Button variant="outline" className="text-sm">
                Kembali ke Direktori Sekolah
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (state.status === "empty") return null

  const klaster = state.data
  const laporanAnggota = klaster.laporan ?? []

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-slate-200/80 bg-white py-3 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-1.5 font-medium min-w-0 flex-wrap">
            <Link to="/sekolah" className="text-slate-600 hover:text-[#0B3052]">Direktori Sekolah</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link to={`/sekolah/${klaster.sekolah_npsn}`} className="text-slate-600 hover:text-[#0B3052] truncate max-w-[240px]">
              {klaster.sekolah_nama ?? klaster.sekolah_npsn}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">Klaster Isu</span>
            <span className="font-mono text-slate-400 text-[11px] ml-1">{klaster.klaster_id}</span>
          </div>

          <Link
            to={`/sekolah/${klaster.sekolah_npsn}`}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#0B3052] hover:underline shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Profil Sekolah
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {/* ── Header Klaster ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase flex-wrap">
                <span>KLASTER ISU WARGA — DINAS PENDIDIKAN KAB. LAMONGAN</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-slate-400">ID: {klaster.klaster_id}</span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {KATEGORI_LABEL[klaster.kategori] ?? klaster.kategori}
                </h1>
                <StatusBadge status={klaster.status_verifikasi} />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  {laporanAnggota.length} laporan warga tergabung
                </span>
                <Link
                  to={`/sekolah/${klaster.sekolah_npsn}`}
                  className="flex items-center gap-1.5 font-semibold text-[#0B3052] hover:underline"
                >
                  {klaster.sekolah_nama ?? klaster.sekolah_npsn}
                  <span className="font-mono text-slate-400 font-normal">NPSN {klaster.sekolah_npsn}</span>
                </Link>
              </div>
            </div>

            <div className={`shrink-0 rounded-xl border px-5 py-3 text-center ${prioritasBadgeCls(klaster.skor_prioritas)}`}>
              <span className="block text-[10px] font-bold tracking-wider uppercase">Skor Prioritas</span>
              <span className="block text-3xl font-extrabold leading-tight">{klaster.skor_prioritas}</span>
              <span className="block text-[11px] font-bold">{prioritasLabel(klaster.skor_prioritas)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {STATUS_PENJELASAN[klaster.status_verifikasi] ?? "Status klaster isu terkini."} Skor prioritas dihitung dari
              keparahan laporan dan dukungan warga — bukan domisili pelapor.
            </span>
          </div>
        </div>

        {/* ── F3.2: Vote / Dukungan Warga (PAGE_STATES §A3) ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
                <ThumbsUp className="h-4 w-4 text-primary" />
                <span>Dukungan Warga</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {sudahVote
                  ? "Vote Anda sudah tercatat dan terhitung dalam skor prioritas isu ini."
                  : "Berikan dukungan (vote) agar skor prioritas isu ini naik dan lebih cepat ditangani Dinas. Satu akun satu suara."}
              </p>
              <Link
                to={`/klaster/${klasterId}/status`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
              >
                <ShieldQuestion className="h-3.5 w-3.5" /> Lihat status tindak lanjut isu
              </Link>
            </div>

            <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
              {voteLoading ? (
                <Button
                  disabled
                  className="bg-primary text-white text-xs h-10 px-5 rounded-lg opacity-60 cursor-wait"
                >
                  Memuat status vote...
                </Button>
              ) : !isAuthenticated ? (
                <Button
                  onClick={keLogin}
                  className="bg-primary hover:opacity-90 text-white text-xs h-10 px-5 rounded-lg cursor-pointer"
                >
                  <LogIn className="h-4 w-4 mr-1.5" /> Vote
                </Button>
              ) : sudahVote ? (
                <Button
                  disabled
                  className="bg-primary-light text-primary border border-primary-border text-xs h-10 px-5 rounded-lg cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Sudah Vote
                </Button>
              ) : (
                <Button
                  onClick={() => setKonfirmasiOpen(true)}
                  className="bg-primary hover:opacity-90 text-white text-xs h-10 px-5 rounded-lg cursor-pointer"
                >
                  <ThumbsUp className="h-4 w-4 mr-1.5" /> Vote Sekarang
                </Button>
              )}

              <span className="text-[11px] text-slate-400">
                {klaster.jumlah_vote_terhitung} dukungan terhitung
              </span>
            </div>
          </div>

          {/* Feedback vote */}
          {voteFeedback && (
            <div
              role="alert"
              className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-start justify-between gap-3 ${
                voteFeedback.tipe === "gagal"
                  ? "border-rose-300 bg-rose-50 text-rose-900"
                  : voteFeedback.tipe === "info"
                    ? "border-warning-border bg-warning-light text-warning-text"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900"
              }`}
            >
              <span className="flex items-start gap-2">
                {voteFeedback.tipe === "gagal" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : voteFeedback.tipe === "info" ? (
                  <Clock3 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
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
        </div>

        {/* ── Laporan Anggota ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Laporan Anggota Klaster</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Laporan warga terverifikasi yang digabungkan menjadi klaster ini.
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shrink-0">
              {laporanAnggota.length} laporan
            </span>
          </div>

          {laporanAnggota.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center space-y-1.5">
              <Inbox className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Detail laporan belum tersedia</p>
              <p className="text-[11px] text-slate-500">
                Rincian laporan anggota untuk klaster ini belum dimuat.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {laporanAnggota.map((lap) => (
                <li key={lap.laporan_id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-700">{lap.laporan_id.slice(0, 8)}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {formatTanggal(lap.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{lap.deskripsi}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── CTA Laporkan Isu ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Punya ketidaksesuaian terkait isu ini?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Laporkan fakta lapangan Anda — laporan valid akan dikelompokkan ke klaster yang sama dan memperkuat
              skor prioritasnya.
            </p>
          </div>
          <Link to={`/sekolah/${klaster.sekolah_npsn}`} className="shrink-0">
            <Button className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer">
              Laporkan Isu di Sekolah Ini
            </Button>
          </Link>
        </div>
      </div>

      {/* ── F3.2: Dialog konfirmasi vote (sekali klik, 1 akun 1 suara) ── */}
      <Dialog open={konfirmasiOpen} onOpenChange={setKonfirmasiOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <ThumbsUp className="h-4 w-4 text-primary" /> Dukung isu ini?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 leading-relaxed">
              Vote Anda akan menaikkan skor prioritas isu ini agar lebih cepat ditangani Dinas.
              Satu akun hanya boleh vote satu kali untuk isu yang sama.
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
              className="bg-primary hover:opacity-90 text-white text-xs cursor-pointer"
            >
              {submittingVote ? "Mengirim..." : "Ya, Vote Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
