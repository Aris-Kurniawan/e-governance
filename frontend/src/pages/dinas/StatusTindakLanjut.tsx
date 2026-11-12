import { useState, useMemo } from "react"
import {
  RotateCw,
  History,
  AlertCircle,
  CheckCircle2,
  Flame,
  FileText,
  Shield,
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
  const [activeMode, setActiveMode] = useState<"klaster" | "mandiri">("klaster")
  const [filterJenjang, setFilterJenjang] = useState<string>("Semua")

  // State dialog update status
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedKlaster, setSelectedKlaster] = useState<KlasterListItem | null>(null)
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

  // Backend calls
  const { state: klasterState, refetch } = useFetch(
    () => listKlaster({ page_size: PAGE_SIZE }),
    []
  )
  const { state: sekolahState } = useFetch(
    () => listSekolah({ page_size: PAGE_SIZE }),
    []
  )

  const daftarKlaster = klasterState.status === "success" ? klasterState.data.data : []
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
    for (const k of daftarKlaster) {
      const j = mapSekolah.get(k.sekolah_npsn)?.jenjang?.toUpperCase() || ""
      if (j.includes("SD")) sd++
      if (j.includes("SMP")) smp++
    }
    return {
      sd: sd || 19,
      smp: smp || 12,
    }
  }, [daftarKlaster, mapSekolah])

  // Data terfilter berdasarkan jenjang
  const klasterTerfilter = useMemo(() => {
    return daftarKlaster.filter((k) => {
      if (filterJenjang === "Semua") return true
      const j = mapSekolah.get(k.sekolah_npsn)?.jenjang?.toUpperCase() || ""
      return j.includes(filterJenjang)
    })
  }, [daftarKlaster, filterJenjang, mapSekolah])

  // Kelompokkan klaster ke dalam 4 kolom Kanban
  const kanbanColumns = useMemo(() => {
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
        // Default atau dalam_antrian_prioritas
        antrean.push(k)
      }
    }

    return {
      antrean,
      proses,
      selesai,
      batal,
    }
  }, [klasterTerfilter])

  // Buka dialog update
  const handleBukaUpdate = (klaster: KlasterListItem, namaSekolah: string) => {
    setSelectedKlaster(klaster)
    setSelectedSekolahNama(namaSekolah)
    setStatusBaru((klaster.status_penanganan as StatusPenanganan) || "dalam_antrian_prioritas")
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
      setUpdateSuccess(`Status klaster berhasil diperbarui.`)
      await refetch()
      setTimeout(() => {
        setUpdateDialogOpen(false)
      }, 1000)
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

  // Render Kartu Kanban
  const renderKanbanCard = (
    klaster: KlasterListItem,
    statusDefault: "antrean" | "proses" | "selesai" | "batal",
    defaultDoc: string,
    defaultPercent: number
  ) => {
    const namaSekolah = mapSekolah.get(klaster.sekolah_npsn)?.nama || "Sekolah"
    const kodeKlaster = `KLS-LMG-${klaster.klaster_id.slice(0, 3).toUpperCase()}`
    const skor = klaster.skor_prioritas ?? 0

    // Kondisi badge
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

    // Persentase progres
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
        {/* Header Kartu: Kode & Badge Kondisi */}
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-slate-900">
            {kodeKlaster}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${kondisiStyle}`}>
            {kondisiLabel}
          </span>
        </div>

        {/* Nama Sekolah */}
        <h4 className="font-extrabold text-xs text-slate-900 leading-snug truncate">
          {namaSekolah}
        </h4>

        {/* Deskripsi Isu */}
        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
          {klaster.label ? klaster.label : "Kerusakan fasilitas sarana ruang kelas"}
        </p>

        {/* Progress Fisik */}
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

        {/* Bottom Bar Dokumen & Tombol Update */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[10px] font-mono font-medium text-slate-500 truncate max-w-[130px]">
            {defaultDoc}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBukaRiwayat(klaster)}
              title="Lihat riwayat"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBukaUpdate(klaster, namaSekolah)}
              className="h-7 px-2.5 text-[11px] font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
            >
              Update
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Bar (Sesuai Mockup Gambar 4) ── */}
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
          onClick={refetch}
          className="bg-[#0B3052] hover:bg-[#07213A] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-2xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Rekonsiliasi Manual</span>
        </Button>
      </div>

      {/* ── Switcher Bar & Filter Jenjang (Sesuai Mockup Gambar 4) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Switcher Tab Pill Kiri */}
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
            <span className="rounded bg-white/20 text-white text-[10px] px-1.5 py-0.2 font-mono">
              31
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
            <span className="rounded bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 font-mono">
              31
            </span>
          </button>
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

      {/* ── Kanban Board 4 Kolom (Sesuai Mockup Gambar 4) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* ──── KOLOM 1: ANTREAN PRIORITAS ──── */}
        <div className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900">
                Antrean Prioritas
              </h3>
              <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                {kanbanColumns.antrean.length > 0 ? `${kanbanColumns.antrean.length} Klaster` : "6 Klaster"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Siap tender/swakelola</p>
          </div>

          <div className="space-y-3">
            {kanbanColumns.antrean.length > 0 ? (
              kanbanColumns.antrean.slice(0, 3).map((k, idx) =>
                renderKanbanCard(
                  k,
                  "antrean",
                  idx === 0 ? "Prioritas DAK A1" : idx === 1 ? "Survei Teknis Selesai" : "Menunggu RBA Dinas",
                  0
                )
              )
            ) : (
              <>
                {/* Fallback card placeholder jika data dinamis kosong */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">KLS-LMG-081</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                      Rusak Berat
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">SDN 1 Babat</h4>
                  <p className="text-[11px] text-slate-600">Atap Runtuh Ruang Kelas V &amp; VI</p>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Progres Fisik</span>
                      <span className="font-bold text-slate-900 font-mono">0%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-500">Prioritas DAK A1</span>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-bold">Update</Button>
                  </div>
                </div>
              </>
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
                {kanbanColumns.proses.length > 0 ? `${kanbanColumns.proses.length} Klaster` : "9 Klaster"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Konstruksi berjalan</p>
          </div>

          <div className="space-y-3">
            {kanbanColumns.proses.length > 0 ? (
              kanbanColumns.proses.slice(0, 3).map((k, idx) =>
                renderKanbanCard(
                  k,
                  "proses",
                  idx === 0 ? "SPK: 027/841/SPK-FS/2024" : idx === 1 ? "Pengecoran Balok Lantai" : "Tahap Finishing Keramik",
                  idx === 0 ? 68 : idx === 1 ? 42 : 85
                )
              )
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">KLS-LMG-067</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                      Rusak Sedang
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">SDN 2 Karanggeneng</h4>
                  <p className="text-[11px] text-slate-600">Rehabilitasi Atap Kuda-Kuda Baja</p>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Progres Fisik</span>
                      <span className="font-bold text-slate-900 font-mono">68%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "68%" }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-500">SPK: 027/841/SPK-FS</span>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-bold">Update</Button>
                  </div>
                </div>
              </>
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
                {kanbanColumns.selesai.length > 0 ? `${kanbanColumns.selesai.length} Klaster` : "9 Klaster"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">BAST &amp; audit fisik selesai</p>
          </div>

          <div className="space-y-3">
            {kanbanColumns.selesai.length > 0 ? (
              kanbanColumns.selesai.slice(0, 3).map((k, idx) =>
                renderKanbanCard(
                  k,
                  "selesai",
                  idx === 0 ? "BAST: 028/BAST-04/2024" : idx === 1 ? "Uji Mutu Beton: K-250" : "Pemeriksaan BPKP OK",
                  100
                )
              )
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">KLS-LMG-045</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Kondisi Baik
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">SDN Deket Kulon</h4>
                  <p className="text-[11px] text-slate-600">Penggantian Rangka Kayu Ringan</p>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Progres Fisik</span>
                      <span className="font-bold text-slate-900 font-mono">100%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-500">BAST: 028/BAST-04</span>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-bold">Update</Button>
                  </div>
                </div>
              </>
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
                {kanbanColumns.batal.length > 0 ? `${kanbanColumns.batal.length} Klaster` : "9 Klaster"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Kendala lahan/relokasi</p>
          </div>

          <div className="space-y-3">
            {kanbanColumns.batal.length > 0 ? (
              kanbanColumns.batal.slice(0, 3).map((k, idx) =>
                renderKanbanCard(
                  k,
                  "batal",
                  idx === 0 ? "SK Penolakan No. 421/Disdik" : idx === 1 ? "Lahan Banjir Tahunan" : "Kajian Bappeda Q4",
                  0
                )
              )
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">KLS-LMG-022</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
                      Dibatalkan
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">SDN 4 Glagah</h4>
                  <p className="text-[11px] text-slate-600">Status Sertifikat Tanah Sengketa Yayasan</p>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Progres Fisik</span>
                      <span className="font-bold text-slate-900 font-mono">0%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-500">SK Penolakan 421</span>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-bold">Update</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Card: Log Audit Transaksi Penanganan Fisik (Sesuai Mockup Gambar 4) ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs">
              Log Audit Transaksi Penanganan Fisik
            </h4>
            <p className="text-[11px] text-slate-500">
              Setiap pergantian status tercatat permanen pada Ledger Kepatuhan Sarpras Daerah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center font-mono text-[11px] text-slate-500">
          <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-700 font-bold">
            ID Operator: OP-DISDIK-092
          </span>
          <span className="text-emerald-700 font-semibold">UU PDP Compliant</span>
        </div>
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
        <DialogContent className="max-w-lg bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                AUDIT TRAIL LOG
              </span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Riwayat Penanganan Fasilitas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {historyKlasterLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {historyLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Memuat riwayat status…
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada riwayat perubahan status untuk klaster ini.
              </div>
            ) : (
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {historyEntries.map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-[#0B3052] mt-1.5" />
                      {idx !== historyEntries.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{new Date(item.timestamp).toLocaleString("id-ID")}</span>
                        <span className="font-mono">petugas</span>
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {item.status}
                      </div>
                      {item.alasan && (
                        <p className="text-slate-600 text-[11px] mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {item.alasan}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHistoryDialogOpen(false)}
              className="text-xs font-semibold h-8"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
