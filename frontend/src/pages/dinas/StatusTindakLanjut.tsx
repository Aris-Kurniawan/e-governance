import { useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  RotateCw,
  History,
  AlertCircle,
  CheckCircle2,
  Flame,
  FileText,
} from "@/components/ui/iconify-icons"
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
import { perluReviewLaporan, updateTindakLanjutLaporan } from "@/lib/api/laporan"
import type {
  KlasterListItem,
  RiwayatStatusEntry,
  StatusPenanganan,
  LaporanPerluReview,
} from "@/lib/api/types"

const PAGE_SIZE = 100

const OPSI_PILIHAN_STATUS: { value: StatusPenanganan; label: string; desc: string }[] = [
  {
    value: "dalam_antrian_prioritas",
    label: "Dalam Antrian Prioritas",
    desc: "Masuk dalam rencana alokasi anggaran & logistik Dinas.",
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
    desc: "Dibatalkan atau di luar wewenang Disdik.",
  },
]

export default function StatusTindakLanjut() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = (searchParams.get("search") ?? "").trim()
  const [activeMode, setActiveMode] = useState<"klaster" | "mandiri">("klaster")
  const [filterJenjang, setFilterJenjang] = useState<string>("Semua")

  // State dialog update status
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedKlaster, setSelectedKlaster] = useState<KlasterListItem | null>(null)
  const [selectedMandiri, setSelectedMandiri] = useState<LaporanPerluReview | null>(null)
  const [selectedSekolahNama, setSelectedSekolahNama] = useState("")
  const [statusBaru, setStatusBaru] = useState<StatusPenanganan>("dalam_antrian_prioritas")
  const [alasanStatus, setAlasanStatus] = useState("")
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  // State dialog riwayat status
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyKlasterLabel, setHistoryKlasterLabel] = useState("")
  const [historyEntries, setHistoryEntries] = useState<RiwayatStatusEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Backend calls: klaster, sekolah, dan laporan mandiri
  const { state: klasterState, refetch: refetchKlaster } = useFetch(
    () => listKlaster({ page_size: PAGE_SIZE }),
    []
  )
  const { state: mandiriState, refetch: refetchMandiri } = useFetch(
    () => perluReviewLaporan({ page_size: PAGE_SIZE }),
    []
  )
  const { state: sekolahState } = useFetch(
    () => listSekolah({ page_size: PAGE_SIZE }),
    []
  )

  const daftarKlaster = klasterState.status === "success" ? klasterState.data.data : []
  const daftarMandiri = mandiriState.status === "success" ? mandiriState.data.data : []
  const daftarSekolah = sekolahState.status === "success" ? sekolahState.data.data : []

  // Profil sekolah map
  const mapSekolah = useMemo(() => {
    const map = new Map<string, { nama: string; jenjang: string }>()
    for (const s of daftarSekolah) {
      map.set(s.npsn, { nama: s.nama, jenjang: s.jenjang })
    }
    return map
  }, [daftarSekolah])

  // Hitung jumlah per jenjang
  const countJenjang = useMemo(() => {
    let sd = 0
    let smp = 0
    if (activeMode === "klaster") {
      for (const k of daftarKlaster) {
        const j = mapSekolah.get(k.sekolah_npsn)?.jenjang?.toUpperCase() || ""
        if (j.includes("SD")) sd++
        if (j.includes("SMP")) smp++
      }
    } else {
      for (const m of daftarMandiri) {
        const j = mapSekolah.get(m.sekolah_npsn)?.jenjang?.toUpperCase() || ""
        if (j.includes("SD")) sd++
        if (j.includes("SMP")) smp++
      }
    }
    return {
      sd,
      smp,
    }
  }, [activeMode, daftarKlaster, daftarMandiri, mapSekolah])

  // Data terfilter berdasarkan jenjang & pencarian header
  const klasterTerfilter = useMemo(() => {
    const q = urlSearch.toLowerCase()
    return daftarKlaster.filter((k) => {
      if (filterJenjang !== "Semua") {
        const j = mapSekolah.get(k.sekolah_npsn)?.jenjang?.toUpperCase() || ""
        if (!j.includes(filterJenjang)) return false
      }
      if (!q) return true
      const nama = mapSekolah.get(k.sekolah_npsn)?.nama ?? ""
      return (
        k.sekolah_npsn.toLowerCase().includes(q) ||
        nama.toLowerCase().includes(q) ||
        k.klaster_id.toLowerCase().includes(q) ||
        (k.label ?? "").toLowerCase().includes(q)
      )
    })
  }, [daftarKlaster, filterJenjang, mapSekolah, urlSearch])

  const mandiriTerfilter = useMemo(() => {
    const q = urlSearch.toLowerCase()
    return daftarMandiri.filter((m) => {
      if (filterJenjang !== "Semua") {
        const j = mapSekolah.get(m.sekolah_npsn)?.jenjang?.toUpperCase() || ""
        if (!j.includes(filterJenjang)) return false
      }
      if (!q) return true
      const nama = mapSekolah.get(m.sekolah_npsn)?.nama ?? ""
      return (
        m.sekolah_npsn.toLowerCase().includes(q) ||
        nama.toLowerCase().includes(q) ||
        m.tracking_id.toLowerCase().includes(q) ||
        (m.deskripsi ?? "").toLowerCase().includes(q)
      )
    })
  }, [daftarMandiri, filterJenjang, mapSekolah, urlSearch])

  // Kelompokkan klaster ke dalam 4 kolom Kanban
  const kanbanKlasterColumns = useMemo(() => {
    const antrean: KlasterListItem[] = []
    const proses: KlasterListItem[] = []
    const selesai: KlasterListItem[] = []
    const batal: KlasterListItem[] = []

    for (const k of klasterTerfilter) {
      const st = k.status_penanganan
      if (st === "dalam_proses") {
        proses.push(k)
      } else if (st === "selesai") {
        selesai.push(k)
      } else if (st === "tidak_dapat_ditindaklanjuti") {
        batal.push(k)
      } else {
        antrean.push(k)
      }
    }

    return { antrean, proses, selesai, batal }
  }, [klasterTerfilter])

  // Kelompokkan aduan mandiri ke dalam 4 kolom Kanban
  const kanbanMandiriColumns = useMemo(() => {
    const antrean: LaporanPerluReview[] = []
    const proses: LaporanPerluReview[] = []
    const selesai: LaporanPerluReview[] = []
    const batal: LaporanPerluReview[] = []

    for (const m of mandiriTerfilter) {
      const st = m.status_penanganan || (m.status_sanggahan === "ditolak" ? "tidak_dapat_ditindaklanjuti" : "dalam_antrian_prioritas")
      if (st === "dalam_proses") {
        proses.push(m)
      } else if (st === "selesai") {
        selesai.push(m)
      } else if (st === "tidak_dapat_ditindaklanjuti" || m.status_sanggahan === "ditolak") {
        batal.push(m)
      } else {
        antrean.push(m)
      }
    }

    return { antrean, proses, selesai, batal }
  }, [mandiriTerfilter])

  // Buka dialog update untuk klaster
  const handleBukaUpdateKlaster = (klaster: KlasterListItem, namaSekolah: string) => {
    setSelectedKlaster(klaster)
    setSelectedMandiri(null)
    setSelectedSekolahNama(namaSekolah)
    setStatusBaru((klaster.status_penanganan as StatusPenanganan) || "dalam_antrian_prioritas")
    setAlasanStatus("")
    setUpdateError(null)
    setUpdateSuccess(null)
    setUpdateDialogOpen(true)
  }

  // Buka dialog update untuk mandiri
  const handleBukaUpdateMandiri = (mandiri: LaporanPerluReview, namaSekolah: string) => {
    setSelectedMandiri(mandiri)
    setSelectedKlaster(null)
    setSelectedSekolahNama(namaSekolah)
    setStatusBaru((mandiri.status_penanganan as StatusPenanganan) || "dalam_antrian_prioritas")
    setAlasanStatus("")
    setUpdateError(null)
    setUpdateSuccess(null)
    setUpdateDialogOpen(true)
  }

  // Submit update status ke backend
  const handleSubmitUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()

    if (statusBaru === "tidak_dapat_ditindaklanjuti" && !alasanStatus.trim()) {
      setUpdateError("Alasan wajib diisi untuk status 'Tidak Dapat Ditindaklanjuti'.")
      return
    }

    setSubmittingStatus(true)
    setUpdateError(null)
    try {
      if (activeMode === "klaster" && selectedKlaster) {
        await updateStatusKlaster(
          selectedKlaster.klaster_id,
          statusBaru,
          alasanStatus.trim() || undefined
        )
        setUpdateSuccess(`Status klaster berhasil diperbarui.`)
        await refetchKlaster()
      } else if (activeMode === "mandiri" && selectedMandiri) {
        await updateTindakLanjutLaporan(
          selectedMandiri.id,
          statusBaru,
          alasanStatus.trim() || undefined
        )
        setUpdateSuccess(`Status aduan mandiri berhasil diperbarui.`)
        await refetchMandiri()
      }
      setTimeout(() => {
        setUpdateDialogOpen(false)
      }, 1000)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Gagal memperbarui status tindak lanjut.")
    } finally {
      setSubmittingStatus(false)
    }
  }

  // Buka riwayat timeline klaster
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

  // Render Kartu Kanban Klaster
  const renderKlasterCard = (
    klaster: KlasterListItem,
    statusDefault: "antrean" | "proses" | "selesai" | "batal",
    defaultDoc: string,
    defaultPercent: number
  ) => {
    const namaSekolah = mapSekolah.get(klaster.sekolah_npsn)?.nama || "Sekolah"
    const kodeKlaster = `KLS-LMG-${klaster.klaster_id.slice(0, 3).toUpperCase()}`
    const skor = klaster.skor_prioritas ?? 0

    let kondisiLabel = "Rusak Berat"
    let kondisiStyle = "bg-rose-50 text-rose-700 border-rose-200"
    if (statusDefault === "selesai") {
      kondisiLabel = "Kondisi Baik"
      kondisiStyle = "bg-emerald-50 text-emerald-700 border-emerald-200"
    } else if (statusDefault === "batal") {
      kondisiLabel = "Dibatalkan"
      kondisiStyle = "bg-slate-100 text-slate-700 border-slate-200"
    } else if (skor < 70) {
      kondisiLabel = "Rusak Sedang"
      kondisiStyle = "bg-amber-50 text-amber-700 border-amber-200"
    }

    let progress = defaultPercent
    let barColor = "bg-slate-300"
    if (statusDefault === "selesai") {
      progress = 100
      barColor = "bg-emerald-500"
    } else if (statusDefault === "proses") {
      progress = defaultPercent > 0 ? defaultPercent : 68
      barColor = "bg-blue-600"
    } else if (statusDefault === "batal") {
      progress = 0
      barColor = "bg-slate-300"
    }

    return (
      <div
        key={klaster.klaster_id}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3 hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-slate-900">
            {kodeKlaster}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${kondisiStyle}`}>
            {kondisiLabel}
          </span>
        </div>

        <h4 className="font-extrabold text-xs text-slate-900 leading-snug truncate">
          {namaSekolah}
        </h4>

        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
          {klaster.label ? klaster.label : "Kerusakan fasilitas sarana ruang kelas"}
        </p>

        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Progres Fisik</span>
            <span className="font-extrabold text-slate-900 font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[10px] font-mono font-medium text-slate-500 truncate max-w-[130px]">
            {defaultDoc}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBukaRiwayat(klaster)}
              title="Lihat riwayat"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBukaUpdateKlaster(klaster, namaSekolah)}
              className="h-7 px-2.5 text-[11px] font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
            >
              Update
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render Kartu Kanban Aduan Mandiri
  const renderMandiriCard = (
    mandiri: LaporanPerluReview,
    statusDefault: "antrean" | "proses" | "selesai" | "batal",
    defaultDoc: string,
    defaultPercent: number
  ) => {
    const namaSekolah = mandiri.sekolah_nama || mapSekolah.get(mandiri.sekolah_npsn)?.nama || "Sekolah"
    const kodeTiket = mandiri.tracking_id.slice(0, 15)

    let kondisiLabel = mandiri.kondisi_dilaporkan || "Rusak Berat"
    let kondisiStyle = "bg-rose-50 text-rose-700 border-rose-200"
    if (statusDefault === "selesai") {
      kondisiLabel = "Selesai"
      kondisiStyle = "bg-emerald-50 text-emerald-700 border-emerald-200"
    } else if (statusDefault === "batal") {
      kondisiLabel = "Dibatalkan"
      kondisiStyle = "bg-slate-100 text-slate-700 border-slate-200"
    }

    let progress = defaultPercent
    let barColor = "bg-slate-300"
    if (statusDefault === "selesai") {
      progress = 100
      barColor = "bg-emerald-500"
    } else if (statusDefault === "proses") {
      progress = defaultPercent > 0 ? defaultPercent : 50
      barColor = "bg-blue-600"
    } else if (statusDefault === "batal") {
      progress = 0
      barColor = "bg-slate-300"
    }

    return (
      <div
        key={mandiri.id}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3 hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-slate-900">
            {kodeTiket}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${kondisiStyle}`}>
            {kondisiLabel}
          </span>
        </div>

        <h4 className="font-extrabold text-xs text-slate-900 leading-snug truncate">
          {namaSekolah}
        </h4>

        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
          {mandiri.deskripsi}
        </p>

        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Progres Fisik</span>
            <span className="font-extrabold text-slate-900 font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[10px] font-mono font-medium text-slate-500 truncate max-w-[130px]">
            {defaultDoc}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBukaUpdateMandiri(mandiri, namaSekolah)}
            className="h-7 px-2.5 text-[11px] font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer ml-auto"
          >
            Update
          </Button>
        </div>
      </div>
    )
  }

  const columnsData = activeMode === "klaster" ? kanbanKlasterColumns : kanbanMandiriColumns

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
        <span className="rounded bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 border border-slate-200">
          SPBE TERINTEGRASI
        </span>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span>HASH: <strong className="text-slate-800">8F2A-90DC-71</strong></span>
          <span>•</span>
          <span>SIK-VERIF-LAMONGAN v2.4</span>
        </div>
      </div>

      {/* ── Breadcrumb & Title Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">
            SIMAKIS &gt; Disdik Kab. Lamongan &gt; <strong className="text-slate-600">Status Tindak Lanjut</strong>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Status Penanganan Sarpras
            </h1>
            <span className="rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs px-2.5 py-0.5">
              T.A. 2024/2025
            </span>
          </div>
        </div>

        {/* Tombol Rekonsiliasi Manual */}
        <Button
          onClick={() => {
            void refetchKlaster()
            void refetchMandiri()
          }}
          className="bg-[#0B3052] hover:bg-[#07213A] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-2xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Rekonsiliasi Manual</span>
        </Button>
      </div>

      {/* ── Switcher Bar Terhubung ke Backend ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode("klaster")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "klaster"
                ? "bg-[#0B3052] text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Track Klaster Issue</span>
            <span className="rounded bg-slate-900 text-white text-[10px] px-1.5 py-0.2 font-mono">
              {daftarKlaster.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("mandiri")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "mandiri"
                ? "bg-[#0B3052] text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Track Issue Mandiri</span>
            <span className="rounded bg-slate-900 text-white text-[10px] px-1.5 py-0.2 font-mono">
              {daftarMandiri.length}
            </span>
          </button>

          {urlSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete("search")
                  return next
                })
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold hover:bg-blue-100 cursor-pointer"
            >
              <span>Pencarian: {urlSearch}</span>
              <span className="font-bold">×</span>
            </button>
          )}
        </div>

        {/* Filter Jenjang Kanan */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Jenjang:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterJenjang("Semua")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filterJenjang === "Semua"
                  ? "bg-[#0B3052] text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterJenjang("SD")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filterJenjang === "SD"
                  ? "bg-[#0B3052] text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              SD ({countJenjang.sd})
            </button>
            <button
              type="button"
              onClick={() => setFilterJenjang("SMP")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filterJenjang === "SMP"
                  ? "bg-[#0B3052] text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              SMP ({countJenjang.smp})
            </button>
          </div>
        </div>
      </div>

      {/* ── Kanban Board 4 Kolom ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* ──── KOLOM 1: ANTREAN PRIORITAS ──── */}
        <div className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900">
                Antrean Prioritas
              </h3>
              <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                {columnsData.antrean.length} {activeMode === "klaster" ? "Klaster" : "Aduan"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Siap tender/swakelola</p>
          </div>

          <div className="space-y-3">
            {activeMode === "klaster" ? (
              (columnsData.antrean as KlasterListItem[]).map((k, idx) =>
                renderKlasterCard(
                  k,
                  "antrean",
                  idx === 0 ? "Prioritas DAK A1" : idx === 1 ? "Survei Teknis Selesai" : "Menunggu RBA Dinas",
                  0
                )
              )
            ) : (
              (columnsData.antrean as LaporanPerluReview[]).map((m, idx) =>
                renderMandiriCard(
                  m,
                  "antrean",
                  idx === 0 ? "SP4N-LAPOR Mandiri" : "Disposisi Verifikator",
                  0
                )
              )
            )}
          </div>
        </div>

        {/* ──── KOLOM 2: DALAM PROSES ──── */}
        <div className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900">
                Dalam Proses
              </h3>
              <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                {columnsData.proses.length} {activeMode === "klaster" ? "Klaster" : "Aduan"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Konstruksi berjalan</p>
          </div>

          <div className="space-y-3">
            {activeMode === "klaster" ? (
              (columnsData.proses as KlasterListItem[]).map((k, idx) =>
                renderKlasterCard(
                  k,
                  "proses",
                  idx === 0 ? "SPK: 027/841/SPK-FS" : "Pengecoran Balok Lantai",
                  idx === 0 ? 68 : 45
                )
              )
            ) : (
              (columnsData.proses as LaporanPerluReview[]).map((m, idx) =>
                renderMandiriCard(
                  m,
                  "proses",
                  idx === 0 ? "SPK Swakelola Komite" : "Pengerjaan Fisik",
                  50
                )
              )
            )}
          </div>
        </div>

        {/* ──── KOLOM 3: SELESAI ──── */}
        <div className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900">
                Selesai
              </h3>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                {columnsData.selesai.length} {activeMode === "klaster" ? "Klaster" : "Aduan"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">BAST &amp; audit fisik selesai</p>
          </div>

          <div className="space-y-3">
            {activeMode === "klaster" ? (
              (columnsData.selesai as KlasterListItem[]).map((k, idx) =>
                renderKlasterCard(
                  k,
                  "selesai",
                  idx === 0 ? "BAST: 028/BAST-04" : "Pemeriksaan BPKP OK",
                  100
                )
              )
            ) : (
              (columnsData.selesai as LaporanPerluReview[]).map((m, idx) =>
                renderMandiriCard(
                  m,
                  "selesai",
                  idx === 0 ? "BAST Selesai" : "Sinkronisasi Dapodik",
                  100
                )
              )
            )}
          </div>
        </div>

        {/* ──── KOLOM 4: TIDAK DAPAT LANJUT ──── */}
        <div className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900">
                Tidak Dapat Lanjut
              </h3>
              <span className="rounded bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5">
                {columnsData.batal.length} {activeMode === "klaster" ? "Klaster" : "Aduan"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Kendala lahan/relokasi</p>
          </div>

          <div className="space-y-3">
            {activeMode === "klaster" ? (
              (columnsData.batal as KlasterListItem[]).map((k) =>
                renderKlasterCard(
                  k,
                  "batal",
                  "SK Penolakan 421",
                  0
                )
              )
            ) : (
              (columnsData.batal as LaporanPerluReview[]).map((m) =>
                renderMandiriCard(
                  m,
                  "batal",
                  "Dibatalkan / Non-Kewenangan",
                  0
                )
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Dialog Update Status (Klaster & Mandiri) ── */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Update Status {activeMode === "klaster" ? "Klaster" : "Aduan Mandiri"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Perbarui progres penanganan fisik sarpras di {selectedSekolahNama}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitUpdateStatus} className="space-y-4 pt-2">
            {updateError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{updateError}</span>
              </div>
            )}
            {updateSuccess && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{updateSuccess}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Pilih Status Baru:</label>
              <div className="space-y-2">
                {OPSI_PILIHAN_STATUS.map((opsi) => (
                  <label
                    key={opsi.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      statusBaru === opsi.value
                        ? "border-[#0B3052] bg-blue-50/50 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status_pilihan"
                      value={opsi.value}
                      checked={statusBaru === opsi.value}
                      onChange={() => setStatusBaru(opsi.value)}
                      className="mt-0.5 text-[#0B3052] focus:ring-[#0B3052]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">{opsi.label}</span>
                      <span className="text-[11px] text-slate-500">{opsi.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Alasan / Catatan Disdik {statusBaru === "tidak_dapat_ditindaklanjuti" && <span className="text-rose-600">*</span>}
              </label>
              <textarea
                value={alasanStatus}
                onChange={(e) => setAlasanStatus(e.target.value.replace(/[<>]/g, "").slice(0, 500))}
                maxLength={500}
                placeholder="Catatan penanganan lapangan, nomor SPK/BAST, atau kendala (maks. 500 karakter)..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpdateDialogOpen(false)}
                className="text-xs h-9 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingStatus}
                className="text-xs h-9 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold cursor-pointer"
              >
                {submittingStatus ? "Menyimpan..." : "Simpan Status"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Riwayat Status ── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Riwayat Tindak Lanjut Klaster
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Audit jejak status penanganan fisik: {historyKlasterLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[350px] overflow-y-auto pr-1">
            {historyLoading ? (
              <p className="text-center py-6 text-xs text-slate-400">Memuat log audit...</p>
            ) : historyEntries.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Belum ada riwayat perubahan status.</p>
            ) : (
              historyEntries.map((log, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 capitalize">
                      {log.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString("id-ID")}
                    </span>
                  </div>
                  {log.alasan && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60">
                      {log.alasan}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
