import { useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Clock,
  Search,
  ChevronDown,
  Building2,
  CheckCircle2,
  RotateCw,
  Send,
  History,
  FileCheck2,
  XCircle,
  Download,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useFetch } from "@/hooks/useFetch"
import { listKlaster, riwayatStatus, updateStatusKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import type {
  KlasterListItem,
  RiwayatStatusEntry,
  StatusPenanganan,
} from "@/lib/api/types"

const PAGE_SIZE = 100
const ITEMS_PER_PAGE = 10

type FilterStatusPenanganan =
  | "Semua"
  | "belum_ada"
  | "dalam_antrian_prioritas"
  | "dalam_proses"
  | "selesai"
  | "tidak_dapat_ditindaklanjuti"

const STATUS_TINDAK_META: Record<
  FilterStatusPenanganan,
  { label: string; badge: string; bg: string; border: string; text: string; dot: string }
> = {
  Semua: { label: "Semua Status", badge: "Semua", bg: "", border: "", text: "", dot: "" },
  belum_ada: {
    label: "Belum Ditindaklanjuti",
    badge: "Belum Ditindak",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  dalam_antrian_prioritas: {
    label: "Dalam Antrian Prioritas",
    badge: "Antrian Prioritas",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  dalam_proses: {
    label: "Dalam Pengerjaan / Proses",
    badge: "Sedang Dikerjakan",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    dot: "bg-blue-600",
  },
  selesai: {
    label: "Tuntas / Selesai",
    badge: "Selesai",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-600",
  },
  tidak_dapat_ditindaklanjuti: {
    label: "Tidak Dapat Ditindaklanjuti",
    badge: "Dibatalkan / Tidak Layak",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    dot: "bg-rose-500",
  },
}

const OPSI_STATUS: FilterStatusPenanganan[] = [
  "Semua",
  "dalam_antrian_prioritas",
  "dalam_proses",
  "selesai",
  "tidak_dapat_ditindaklanjuti",
  "belum_ada",
]

const OPSI_PILIHAN_STATUS: { value: StatusPenanganan; label: string; desc: string }[] = [
  {
    value: "dalam_antrian_prioritas",
    label: "Dalam Antrian Prioritas",
    desc: "Masuk dalam daftar rencana alokasi anggaran & logistik Dinas.",
  },
  {
    value: "dalam_proses",
    label: "Dalam Proses Pengerjaan",
    desc: "Pekerjaan fisik sarpras sedang berlangsung di lapangan.",
  },
  {
    value: "selesai",
    label: "Selesai Ditangani",
    desc: "Renovasi sarpras tuntas dan siap dimutakhirkan ke Dapodik.",
  },
  {
    value: "tidak_dapat_ditindaklanjuti",
    label: "Tidak Dapat Ditindaklanjuti",
    desc: "Ditolak karena sanggahan tidak valid atau di luar wewenang Disdik.",
  },
]

export default function StatusTindakLanjut() {
  const [searchParams] = useSearchParams()
  const urlKlasterId = searchParams.get("id")

  const [searchQuery, setSearchQuery] = useState(urlKlasterId ?? "")
  const [filterStatus, setFilterStatus] = useState<FilterStatusPenanganan>("Semua")
  const [filterJenjang, setFilterJenjang] = useState("Semua")
  const [currentPage, setCurrentPage] = useState(1)

  // State Dialog Update Status
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedKlaster, setSelectedKlaster] = useState<KlasterListItem | null>(null)
  const [selectedSekolahNama, setSelectedSekolahNama] = useState<string>("")
  const [statusBaru, setStatusBaru] = useState<StatusPenanganan>("dalam_antrian_prioritas")
  const [alasanStatus, setAlasanStatus] = useState("")
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  // State Dialog Riwayat
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<RiwayatStatusEntry[]>([])
  const [historyKlasterLabel, setHistoryKlasterLabel] = useState("")

  const { state: klasterState, refetch } = useFetch(() => listKlaster({ page_size: PAGE_SIZE }))
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: PAGE_SIZE }))

  const profilSekolah = useMemo(() => {
    const map = new Map<string, { nama: string; jenjang: string }>()
    if (sekolahState.status === "success") {
      for (const s of sekolahState.data.data) map.set(s.npsn, { nama: s.nama, jenjang: s.jenjang })
    }
    return map
  }, [sekolahState])

  const daftarKlaster = klasterState.status === "success" ? klasterState.data.data : []
  const totalKlaster = klasterState.status === "success" ? klasterState.data.meta.total_items : 0

  const baris = useMemo(() => {
    return daftarKlaster.map((k) => {
      const profil = profilSekolah.get(k.sekolah_npsn)
      return {
        klaster: k,
        namaSekolah: profil?.nama ?? null,
        jenjang: profil?.jenjang ?? "—",
      }
    })
  }, [daftarKlaster, profilSekolah])

  // Count agregat status penanganan
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatusPenanganan, number> = {
      Semua: baris.length,
      belum_ada: 0,
      dalam_antrian_prioritas: 0,
      dalam_proses: 0,
      selesai: 0,
      tidak_dapat_ditindaklanjuti: 0,
    }
    for (const row of baris) {
      const pen = row.klaster.status_penanganan as FilterStatusPenanganan | null
      if (!pen || !(pen in counts)) {
        counts.belum_ada += 1
      } else {
        counts[pen] += 1
      }
    }
    return counts
  }, [baris])

  // Filtered rows
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return baris.filter((row) => {
      const k = row.klaster
      const matchSearch =
        !q ||
        (row.namaSekolah ?? "").toLowerCase().includes(q) ||
        k.sekolah_npsn.includes(q) ||
        k.klaster_id.toLowerCase().includes(q) ||
        (k.label ?? "").toLowerCase().includes(q) ||
        k.kategori.toLowerCase().includes(q)

      let matchStatus = true
      if (filterStatus === "belum_ada") {
        matchStatus = !k.status_penanganan
      } else if (filterStatus !== "Semua") {
        matchStatus = k.status_penanganan === filterStatus
      }

      const matchJenjang = filterJenjang === "Semua" || row.jenjang === filterJenjang
      return matchSearch && matchStatus && matchJenjang
    })
  }, [baris, searchQuery, filterStatus, filterJenjang])

  const totalPages = Math.max(Math.ceil(filteredData.length / ITEMS_PER_PAGE), 1)
  const pageSafe = Math.min(currentPage, totalPages)
  const paginatedData = filteredData.slice((pageSafe - 1) * ITEMS_PER_PAGE, pageSafe * ITEMS_PER_PAGE)

  // Buka dialog update
  const handleBukaUpdate = (klaster: KlasterListItem, namaSekolah: string | null) => {
    setSelectedKlaster(klaster)
    setSelectedSekolahNama(namaSekolah ?? "Sekolah")
    setStatusBaru(
      (klaster.status_penanganan as StatusPenanganan) || "dalam_antrian_prioritas"
    )
    setAlasanStatus("")
    setUpdateError(null)
    setUpdateSuccess(null)
    setUpdateDialogOpen(true)
  }

  // Submit update status
  const handleSubmitUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKlaster) return

    if (statusBaru === "tidak_dapat_ditindaklanjuti" && !alasanStatus.trim()) {
      setUpdateError("Alasan wajib diisi untuk status 'Tidak Dapat Ditindaklanjuti'.")
      return
    }

    setSubmittingStatus(true)
    setUpdateError(null)
    try {
      await updateStatusKlaster(
        selectedKlaster.klaster_id,
        statusBaru,
        alasanStatus.trim() || undefined
      )
      const label = STATUS_TINDAK_META[statusBaru as FilterStatusPenanganan]?.label ?? statusBaru

      if (statusBaru === "dalam_proses") {
        // PAGE_STATES §B3 + §C.3: "Masih berlangsung" BUKAN state akhir —
        // dialog dibiarkan terbuka agar status bisa diperbarui berulang
        // (loop), bukan form sekali-jalan yang hilang setelah submit.
        setUpdateSuccess(
          `Progres diperbarui ke "${label}". Status ini bukan akhir — perbarui lagi kapan saja sampai selesai.`
        )
        setAlasanStatus("")
        await refetch()
      } else {
        // Status akhir (selesai / tidak dapat ditindaklanjuti) — append-only,
        // tidak bisa diubah lagi → tutup dialog.
        setUpdateSuccess(`Status klaster berhasil diperbarui menjadi "${label}".`)
        await refetch()
        setTimeout(() => {
          setUpdateDialogOpen(false)
        }, 1200)
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Gagal memperbarui status tindak lanjut.")
    } finally {
      setSubmittingStatus(false)
    }
  }

  // Buka riwayat timeline
  const handleBukaRiwayat = async (klaster: KlasterListItem) => {
    setHistoryDialogOpen(true)
    setHistoryLoading(true)
    setHistoryKlasterLabel(klaster.label ?? klaster.klaster_id)
    try {
      const logs = await riwayatStatus(klaster.klaster_id)
      setHistoryEntries(logs)
    } catch {
      setHistoryEntries([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // Ekspor status ke CSV
  const handleEksporCsv = () => {
    const header = [
      "klaster_id",
      "npsn",
      "sekolah",
      "jenjang",
      "label",
      "status_verifikasi",
      "status_penanganan",
      "skor_prioritas",
      "jumlah_vote",
    ]
    const escape = (val: string | number | null) => `"${String(val ?? "").replace(/"/g, '""')}"`
    const rows = filteredData.map((r) =>
      [
        r.klaster.klaster_id,
        r.klaster.sekolah_npsn,
        r.namaSekolah,
        r.jenjang,
        r.klaster.label,
        r.klaster.status_verifikasi,
        r.klaster.status_penanganan ?? "belum_ditindaklanjuti",
        r.klaster.skor_prioritas,
        r.klaster.jumlah_vote_terhitung,
      ]
        .map(escape)
        .join(",")
    )
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `rekap_status_tindak_lanjut_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="h-4 w-4 text-[#0B3052]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              PANEL TINDAK LANJUT SARPRAS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Status Tindak Lanjut Penanganan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau dan mutakhirkan tahapan eksekusi fisik penanganan fasilitas sekolah yang telah terverifikasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleEksporCsv}
            disabled={filteredData.length === 0}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Ekspor Status
          </Button>
          <Button
            variant="outline"
            onClick={refetch}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" /> Muat Ulang
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Antrian Prioritas</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2 tabular-nums">
            {statusCounts.dalam_antrian_prioritas}
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">Menunggu alokasi teknis &amp; jadwal</p>
        </div>

        <div className="rounded-2xl border border-blue-200/90 bg-blue-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Dalam Pengerjaan</span>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2 tabular-nums">
            {statusCounts.dalam_proses}
          </div>
          <p className="text-[11px] text-blue-700 mt-0.5">Pekerjaan fisik sedang berjalan</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Tuntas / Selesai</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2 tabular-nums">
            {statusCounts.selesai}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Fasilitas telah diperbaiki</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Total Klaster Terdaftar</span>
            <FileCheck2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
            {totalKlaster}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Kecamatan Lamongan</p>
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
        {OPSI_STATUS.map((status) => {
          const cfg = STATUS_TINDAK_META[status]
          const isSelected = filterStatus === status
          return (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status)
                setCurrentPage(1)
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#0B3052] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{cfg.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {statusCounts[status]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Cari nama sekolah, NPSN, nomor klaster, atau label isu..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="relative">
          <select
            value={filterJenjang}
            onChange={(e) => {
              setFilterJenjang(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none"
          >
            {["Semua", "SD", "SMP", "SMA", "SMK"].map((j) => (
              <option key={j}>{j}</option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          {filteredData.length} baris ditemukan
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">SEKOLAH / NPSN</th>
                <th className="py-3.5 px-3">ISU SARPRAS</th>
                <th className="py-3.5 px-3">STATUS VERIFIKASI</th>
                <th className="py-3.5 px-3">TAHAPAN TINDAK LANJUT</th>
                <th className="py-3.5 px-3 text-center">SKOR</th>
                <th className="py-3.5 px-3 text-right">AKSI KEDINASAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row) => {
                const k = row.klaster
                const penKey = (k.status_penanganan as FilterStatusPenanganan) || "belum_ada"
                const penMeta = STATUS_TINDAK_META[penKey] ?? STATUS_TINDAK_META.belum_ada

                return (
                  <tr key={k.klaster_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Sekolah */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#0B3052] flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-snug">
                            {row.namaSekolah ?? "Sekolah Terdata"}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono">{k.sekolah_npsn}</span>
                            <span>&middot;</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                              {row.jenjang}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Isu */}
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-800 block">{k.label ?? "Tanpa label"}</span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wide">{k.kategori}</span>
                    </td>

                    {/* Verifikasi */}
                    <td className="py-3.5 px-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                        {k.status_verifikasi.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Status Penanganan / Tindak Lanjut */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${penMeta.bg} ${penMeta.text} ${penMeta.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${penMeta.dot}`} />
                        {penMeta.badge}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        ID: {k.klaster_id.slice(0, 10)}
                      </div>
                    </td>

                    {/* Skor */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center font-black text-xs rounded px-2 py-1 tabular-nums ${
                          (k.skor_prioritas ?? 0) >= 70
                            ? "bg-rose-100 text-rose-800"
                            : (k.skor_prioritas ?? 0) >= 40
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {k.skor_prioritas ?? "—"}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleBukaRiwayat(k)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Lihat Log Riwayat Status"
                        >
                          <History className="h-3.5 w-3.5 text-slate-500" /> Riwayat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBukaUpdate(k, row.namaSekolah)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0B3052] hover:bg-[#07213A] shadow-sm transition-all cursor-pointer"
                          title="Perbarui Status Penanganan"
                        >
                          <Send className="h-3.5 w-3.5" /> Ubah Status
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="py-16 text-center">
            <XCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Tidak ada klaster yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter status</p>
          </div>
        )}

        {filteredData.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan {(pageSafe - 1) * ITEMS_PER_PAGE + 1}–{Math.min(pageSafe * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} klaster
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={pageSafe === 1}
                className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#0B3052] text-white font-bold tabular-nums">
                {pageSafe}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={pageSafe === totalPages}
                className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog Update Status Tindak Lanjut ── */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0B3052] border border-blue-200">
                PEMUTAKHIRAN STATUS
              </span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Update Status Penanganan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedSekolahNama} &middot; {selectedKlaster?.label ?? "Klaster Isu"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitUpdateStatus} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih Tahapan Penanganan Baru <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {OPSI_PILIHAN_STATUS.map((opsi) => {
                  const isChecked = statusBaru === opsi.value
                  return (
                    <label
                      key={opsi.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-blue-50/60 border-blue-400 ring-1 ring-blue-400"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="statusBaru"
                        value={opsi.value}
                        checked={isChecked}
                        onChange={() => setStatusBaru(opsi.value)}
                        className="mt-0.5 text-[#0B3052] focus:ring-[#0B3052]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">{opsi.label}</span>
                        <span className="text-slate-500 text-[11px] leading-relaxed block mt-0.5">
                          {opsi.desc}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Field Catatan / Alasan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>
                  Catatan Tindak Lanjut / Alasan{" "}
                  {statusBaru === "tidak_dapat_ditindaklanjuti" && (
                    <span className="text-rose-500">* (Wajib)</span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Audit Trail SPBE</span>
              </label>
              <textarea
                value={alasanStatus}
                onChange={(e) => setAlasanStatus(e.target.value)}
                placeholder={
                  statusBaru === "tidak_dapat_ditindaklanjuti"
                    ? "Wajib tuliskan alasan penolakan/pembatalan penanganan…"
                    : "Tambahkan rincian nomor surat tugas, tim pelaksana, atau estimasi selesai…"
                }
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B3052] placeholder:text-slate-400"
              />
            </div>

            {updateError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{updateError}</span>
              </div>
            )}

            {updateSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{updateSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUpdateDialogOpen(false)}
                disabled={submittingStatus}
                className="text-xs font-semibold h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submittingStatus}
                className="text-xs font-bold h-9 bg-[#0B3052] hover:bg-[#07213A] text-white"
              >
                {submittingStatus ? "Menyimpan…" : "Simpan Status Baru"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Log Riwayat Status ── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-[#0B3052]" />
              <span>Log Riwayat Status Klaster</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {historyKlasterLabel}
            </DialogDescription>
          </DialogHeader>

          {historyLoading && (
            <div className="py-8 text-center text-xs text-slate-400">
              <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0B3052]" />
              Memuat jejak audit riwayat status…
            </div>
          )}

          {!historyLoading && historyEntries.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              Belum ada riwayat perubahan status pada klaster ini.
            </div>
          )}

          {!historyLoading && historyEntries.length > 0 && (
            <div className="relative pl-6 space-y-4 pt-4 before:absolute before:left-2.5 before:top-4 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {historyEntries.map((log, idx) => (
                <div key={idx} className="relative text-xs space-y-1">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0B3052]" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 capitalize">
                      {log.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "—"}
                    </span>
                  </div>
                  {log.alasan && (
                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/70 text-[11px] leading-relaxed">
                      "{log.alasan}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
