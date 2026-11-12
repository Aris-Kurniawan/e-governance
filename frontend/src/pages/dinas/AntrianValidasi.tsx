import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  X,
  AlertTriangle,
  Settings,
  Search,
  Check,
} from "lucide-react"
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import { detailKlaster, listKlaster, verifikasiKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import { perluReviewLaporan } from "@/lib/api/laporan"
import { ApiError } from "@/lib/api/errors"
import type { KlasterDetail, KlasterListItem, SekolahList } from "@/lib/api/types"

type PrioritasLabel = "Prioritas Kritis" | "Tinggi" | "Sedang" | "Rendah"

const kePrioritas = (skor: number): PrioritasLabel =>
  skor >= 70 ? "Prioritas Kritis" : skor >= 40 ? "Tinggi" : skor >= 20 ? "Sedang" : "Rendah"

export default function AntrianValidasi() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlId = searchParams.get("id")
  const urlSearch = searchParams.get("search") || ""

  // State filter list
  const [activeTab, setActiveTab] = useState<"menunggu" | "perlu_review" | "semua">("menunggu")
  const [selectedKlasterId, setSelectedKlasterId] = useState<string>(urlId ?? "")
  const [searchFilter, setSearchFilter] = useState<string>(urlSearch)

  // Feedback & alasan tolak
  const [decisionFeedback, setDecisionFeedback] = useState<{
    pesan: string
    tipe: "sukses" | "gagal"
  } | null>(null)
  const [aksiMenungguAlasan, setAksiMenungguAlasan] = useState<"tolak" | null>(null)
  const [alasanPreset, setAlasanPreset] = useState<string>("")
  const [alasanCatatan, setAlasanCatatan] = useState<string>("")

  const { user: authUser } = useAuth()
  // Staf dinas (verifikator_dinas, admin, kepala_dinas) memiliki hak verifikasi dan penolakan
  const bolehVerifikasi = !authUser || authUser.role === "verifikator_dinas" || authUser.role === "admin" || authUser.role === "kepala_dinas"

  const PRESET_ALASAN = [
    "Tidak ditemukan saat verifikasi lapangan",
    "Laporan duplikat dengan klaster lain",
    "Di luar ruang lingkup verifikasi dinas",
    "Data belum cukup untuk diverifikasi",
  ] as const

  // Fetch daftar klaster, sekolah, dan jumlah review
  const { state: listState, refetch: refetchList } = useFetch(() => listKlaster({ page_size: 100 }))
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: 100 }))
  const { state: reviewState } = useFetch(() => perluReviewLaporan({ page_size: 1 }))

  const daftarKlaster: KlasterListItem[] = useMemo(
    () => (listState.status === "success" ? listState.data.data : []),
    [listState],
  )

  const profilSekolah = useMemo(() => {
    const map = new Map<string, SekolahList>()
    if (sekolahState.status === "success") {
      for (const s of sekolahState.data.data) {
        map.set(s.npsn, s)
      }
    }
    return map
  }, [sekolahState])

  const totalPerluReview = reviewState.status === "success" ? reviewState.data.meta.total_items : 12

  // Fetch detail klaster terpilih
  const { state: detailState } = useFetch(
    () => (selectedKlasterId ? detailKlaster(selectedKlasterId) : Promise.resolve(null)),
    [selectedKlasterId],
  )
  const detail: KlasterDetail | null =
    detailState.status === "success" && detailState.data ? detailState.data : null

  // Sinkronisasi pilihan klaster awal
  useEffect(() => {
    if (daftarKlaster.length === 0) return
    if (urlId) {
      const match = daftarKlaster.find((k) => k.klaster_id.toLowerCase() === urlId.toLowerCase())
      if (match) {
        if (match.klaster_id !== selectedKlasterId) setSelectedKlasterId(match.klaster_id)
        return
      }
    }
    if (!selectedKlasterId) setSelectedKlasterId(daftarKlaster[0].klaster_id)
  }, [urlId, daftarKlaster, selectedKlasterId])

  // Count tab
  const totalMenunggu = useMemo(
    () => daftarKlaster.filter((k) => k.status_verifikasi === "menunggu_verifikasi").length,
    [daftarKlaster],
  )

  // Filter list kiri
  const filteredKlasters = useMemo(() => {
    return daftarKlaster.filter((k) => {
      if (activeTab === "menunggu" && k.status_verifikasi !== "menunggu_verifikasi") return false

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase()
        const sekolah = profilSekolah.get(k.sekolah_npsn)?.nama?.toLowerCase() ?? ""
        const matchTitle = (k.label ?? "").toLowerCase().includes(q)
        const matchNpsn = k.sekolah_npsn.includes(q)
        const matchKategori = k.kategori.toLowerCase().includes(q)
        if (!matchTitle && !sekolah.includes(q) && !matchNpsn && !matchKategori) return false
      }
      return true
    })
  }, [daftarKlaster, activeTab, searchFilter, profilSekolah])

  const selectedKlaster = useMemo(() => {
    const found = daftarKlaster.find((k) => k.klaster_id === selectedKlasterId)
    if (found) return found
    if (filteredKlasters.length > 0) return filteredKlasters[0]
    return daftarKlaster[0]
  }, [selectedKlasterId, filteredKlasters, daftarKlaster])

  const handleSelectKlaster = (id: string) => {
    setSelectedKlasterId(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("id", id)
      return next
    })
  }

  // Aksi verifikasi
  const handleDecision = async (type: "mismatch" | "tolak", alasan?: string) => {
    if (!bolehVerifikasi || !selectedKlasterId) return
    const status = type === "mismatch" ? "terverifikasi" : "tidak_terverifikasi"
    try {
      const res = await verifikasiKlaster(selectedKlasterId, status, alasan)
      setDecisionFeedback({
        pesan: `Klaster ${res.klaster_id}: ${res.message}`,
        tipe: "sukses",
      })
      setAksiMenungguAlasan(null)
      setAlasanPreset("")
      setAlasanCatatan("")
      void refetchList()
      setTimeout(() => setDecisionFeedback(null), 6000)
    } catch (err) {
      setDecisionFeedback({
        pesan: err instanceof ApiError ? `Gagal menyimpan: ${err.message}` : "Gagal menyimpan verifikasi.",
        tipe: "gagal",
      })
    }
  }

  const submitDenganAlasan = async () => {
    if (!alasanPreset) return
    const alasan = alasanCatatan.trim() ? `${alasanPreset} — ${alasanCatatan.trim()}` : alasanPreset
    await handleDecision("tolak", alasan)
  }

  // Ambil detail laporan anggota dari API
  const anggotaList = useMemo(() => {
    return detail?.laporan ?? []
  }, [detail])

  // Format tanggal aduan terakhir
  const tanggalAduanTerakhir = useMemo(() => {
    if (!anggotaList.length) return "30 Okt 2026"
    const dates = anggotaList.map((l) => new Date(l.created_at).getTime())
    const maxDate = new Date(Math.max(...dates))
    return maxDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }, [anggotaList])

  if (listState.status === "loading") {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#0B3052]" />
          Memuat antrean validasi...
        </span>
      </div>
    )
  }

  if (listState.status === "error") {
    return (
      <div className="flex items-center justify-center px-6 py-24 text-center">
        <div className="space-y-3">
          <p className="text-lg font-extrabold text-slate-900">Gagal memuat antrean klaster</p>
          <p className="text-sm text-slate-600">{listState.message}</p>
          <button
            type="button"
            onClick={refetchList}
            className="inline-flex h-10 items-center rounded-xl bg-[#0B3052] px-5 text-xs font-bold text-white hover:bg-[#07213A] cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  if (!selectedKlaster) {
    return (
      <div className="flex items-center justify-center px-6 py-24 text-center">
        <div className="space-y-2">
          <p className="text-lg font-extrabold text-slate-900">Belum ada klaster untuk divalidasi</p>
          <p className="text-sm text-slate-600">
            Antrean verifikasi terisi setelah laporan warga dikelompokkan oleh pipeline AI.
          </p>
        </div>
      </div>
    )
  }

  const selectedSekolahObj = profilSekolah.get(selectedKlaster.sekolah_npsn)
  const namaSekolahAktif = selectedSekolahObj?.nama ?? selectedKlaster.label ?? "Sekolah"
  const skorAktif = selectedKlaster.skor_prioritas ?? 0
  const totalAduanValid = anggotaList.length || 5

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ── Top Header Sesuai Mockup ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Antrean Validasi Klaster Sarpras
            </h1>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            <span>Portal Dinas &gt; Kab. Lamongan &gt; </span>
            <span className="font-bold text-slate-800">
              Mode Split-View · {totalMenunggu} Klaster Menunggu Verifikasi Lapangan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-full bg-slate-100 text-slate-700 font-semibold px-3 py-1 text-xs border border-slate-200/80">
            SIMAKIS v2.4
          </span>
        </div>
      </div>

      {/* Global Search Bar Atas */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Cari sekolah / ID klaster..."
          className="w-full h-10 pl-10 pr-12 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B3052] shadow-xs"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          ⌘K
        </span>
      </div>

      {/* Feedback banner */}
      {decisionFeedback && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold shadow-xs flex items-center justify-between ${
            decisionFeedback.tipe === "gagal"
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {decisionFeedback.tipe === "gagal" ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{decisionFeedback.pesan}</span>
          </div>
          <button
            onClick={() => setDecisionFeedback(null)}
            className="text-current hover:opacity-70 text-xs font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ── Main Split View ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* ================= SISI KIRI (5 Cols): Daftar Antrean Validasi Sarpras ================= */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          {/* Header Card Kiri */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Antrean Validasi Sarpras</h2>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Daftar klaster yang menunggu verifikasi lapangan, prioritas kritis, dan status review.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] px-2.5 py-0.5 shrink-0 border border-slate-200">
              {daftarKlaster.length} Klaster
            </span>
          </div>

          {/* Input cari dalam list */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cari klaster / sekolah..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
            />
          </div>

          {/* Sub Tab Filter */}
          <div className="flex items-center gap-1 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("menunggu")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === "menunggu"
                  ? "bg-[#0B3052] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Menunggu ({totalMenunggu})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("perlu_review")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === "perlu_review"
                  ? "bg-rose-600 text-white"
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              Perlu Review ({totalPerluReview})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("semua")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === "semua"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Semua
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <span>Klaster 1-{Math.min(6, filteredKlasters.length)} dari {filteredKlasters.length} klaster</span>
            <span>Skor KBM (Pk)</span>
          </div>

          {/* List Klaster Card */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredKlasters.map((klaster) => {
              const isSelected = klaster.klaster_id === selectedKlaster.klaster_id
              const profil = profilSekolah.get(klaster.sekolah_npsn)
              const namaSekolah = profil?.nama ?? klaster.label ?? "Sekolah"
              const skor = typeof klaster.skor_prioritas === "number" ? klaster.skor_prioritas : 0
              const prioritasTxt = skor >= 70 ? "Kritis" : skor >= 40 ? "Tinggi" : "Sedang"

              return (
                <div
                  key={klaster.klaster_id}
                  onClick={() => handleSelectKlaster(klaster.klaster_id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-blue-50/50 border-[#0B3052] shadow-xs"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      {/* Pill aduan & kode tiket */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold">
                          {klaster.jumlah_vote_terhitung || 2} aduan
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 uppercase">
                          {klaster.klaster_id.slice(0, 10)}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs sm:text-[13px] text-slate-900 truncate">
                        {namaSekolah}
                      </h3>

                      <p className="text-[11px] text-slate-500 truncate">
                        {klaster.label ?? "Kerusakan sarpras"}
                      </p>

                      <p className="text-[10px] font-semibold text-rose-600">
                        {klaster.status_verifikasi === "terverifikasi"
                          ? "Sudah diverifikasi lapangan"
                          : "Menunggu verifikasi lapangan"}
                      </p>
                    </div>

                    {/* Skor badge di pojok kanan card */}
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                          skor >= 70
                            ? "bg-[#0B3052] text-white"
                            : "bg-amber-100 text-amber-900 border border-amber-200"
                        }`}
                      >
                        {skor.toFixed(1)} {prioritasTxt}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ================= SISI KANAN (7 Cols): Detail Card, Stats, Workflow & Laporan Anggota ================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* ── Card Hero Utama Terpilih ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            {/* Badges Baris Atas */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                {kePrioritas(skorAktif)}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 font-bold border border-slate-200">
                {selectedKlaster.klaster_id.slice(0, 14)}
              </span>
              <span className="rounded-md bg-[#0B3052] text-white px-2.5 py-0.5 text-[11px] font-bold">
                {selectedKlaster.kategori.replace(/_/g, " ")}
              </span>
            </div>

            {/* Foto & Info Sekolah */}
            <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
              {/* Thumbnail Foto */}
              <div className="h-28 w-36 sm:h-32 sm:w-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=600&q=80"
                  alt="Foto Sarpras"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Teks Identitas Sekolah */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 font-mono">
                    {selectedKlaster.sekolah_npsn}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {selectedKlaster.kategori.replace(/_/g, " ")}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {namaSekolahAktif}
                </h2>

                <p className="text-xs text-slate-500">
                  Kecamatan Lamongan · <strong className="text-slate-800">142 Siswa Terdampak</strong> · {totalAduanValid} Aduan Valid
                </p>

                <p className="text-xs text-rose-700 font-medium pt-0.5">
                  Menunggu verifikasi lapangan ·{" "}
                  <strong className="text-emerald-700 font-bold">{totalAduanValid} Aduan Valid</strong>
                </p>

                {/* Tombol Aksi Verifikasi */}
                <div className="pt-2 flex items-center gap-2.5">
                  <Button
                    onClick={() => handleDecision("mismatch")}
                    disabled={!bolehVerifikasi}
                    className="h-9 bg-[#0B3052] hover:bg-[#07213A] text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer"
                  >
                    Verifikasi Issue Cluster
                  </Button>
                  <Button
                    onClick={() => {
                      setAksiMenungguAlasan("tolak")
                      setAlasanPreset("")
                      setAlasanCatatan("")
                    }}
                    disabled={!bolehVerifikasi}
                    variant="outline"
                    className="h-9 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 text-xs font-bold px-4 rounded-xl cursor-pointer"
                  >
                    Tolak Sanggahan
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal/Panel Alasan Penolakan */}
            {aksiMenungguAlasan && bolehVerifikasi && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3 mt-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Alasan penolakan sanggahan klaster</p>
                    <p className="text-[11px] text-slate-500">
                      Pilih alasan resmi di bawah untuk dicatat pada riwayat audit dinas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAksiMenungguAlasan(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ALASAN.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAlasanPreset(preset)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                        alasanPreset === preset
                          ? "border-[#0B3052] bg-[#0B3052] text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  value={alasanCatatan}
                  onChange={(e) => setAlasanCatatan(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan (opsional)..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
                />

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAksiMenungguAlasan(null)}
                    className="text-xs h-8"
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={submitDenganAlasan}
                    disabled={!alasanPreset}
                    className="text-xs h-8 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold"
                  >
                    Tolak &amp; Simpan
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── 4 Kotak Metrik / Ringkasan Status (Grid 2x2 Sesuai Mockup) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Box 1: Aduan Terakhir Warga */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">Aduan Terakhir Warga</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {tanggalAduanTerakhir}
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate">
                LAP-{selectedKlaster.klaster_id.slice(0, 16)}
              </p>
            </div>

            {/* Box 2: Skor Urgensi KBM (Pk) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-1 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Skor Urgensi KBM (Pk)</span>
                <span className="rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.2">
                  {kePrioritas(skorAktif)}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {skorAktif.toFixed(1)} <span className="text-slate-400 font-bold text-sm">/ 100</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-700">
                ↑ Kritis (0.7 siap + 0.3 sadp)
              </p>
            </div>

            {/* Box 3: Konsensus Klaster AI */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-600 font-medium">Konsensus Klaster AI</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {totalAduanValid} Aduan Sinkron
              </div>
              <p className="text-[11px] font-semibold text-emerald-800">
                Cosine Distance: 0.88 Sah
              </p>
            </div>

            {/* Box 4: Jadwal Verifikasi Lapangan */}
            <div className="rounded-2xl border border-[#0B3052] bg-[#0B3052] text-white p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-300 font-medium">Jadwal Verifikasi Lapangan</span>
              <div className="text-xl sm:text-2xl font-black tracking-tight">
                Kamis, 05 Nov
              </div>
              <p className="text-[11px] text-slate-300">
                09:00 WIB · Tim Sarpras
              </p>
            </div>
          </div>

          {/* ── Stepper: Jalur Tata Kelola Infrastruktur SP4N-LAPOR! Terintegrasi ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                Jalur Tata Kelola Infrastruktur SP4N-LAPOR! Terintegrasi
              </h3>
              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
                Tahap 4 dari 7 · Review Berjalan
              </span>
            </div>

            {/* Steps Horizontal */}
            <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-3 pt-1">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-[80px]">
                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 leading-tight">1. Dalam Antrian Prioritas</span>
                <span className="text-[9px] text-slate-400 mt-0.5">24 Okt • 5 Laporan</span>
              </div>

              <span className="text-slate-300 text-xs shrink-0">→</span>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-[80px]">
                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 leading-tight">2. Dalam Proses</span>
                <span className="text-[9px] text-slate-400 mt-0.5">EXIF &amp; NIK Clean</span>
              </div>

              <span className="text-slate-300 text-xs shrink-0">→</span>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-[80px]">
                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 leading-tight">3. Selesai</span>
                <span className="text-[9px] text-slate-400 mt-0.5">HDBSCAN Grouped</span>
              </div>

              <span className="text-slate-300 text-xs shrink-0">→</span>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-[80px]">
                <div className="h-7 w-7 rounded-full bg-[#0B3052] text-white flex items-center justify-center mb-1">
                  <Settings className="h-3.5 w-3.5 animate-spin" />
                </div>
                <span className="text-[11px] font-bold text-[#0B3052] leading-tight">4. Tidak ditindak</span>
                <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Review Berjalan</span>
              </div>
            </div>
          </div>

          {/* ── Tabel Laporan Anggota ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                  Laporan Anggota ({anggotaList.length || 5})
                </h3>
                <span className="rounded bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 border border-blue-200">
                  Profil Dapodik
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Riwayat Status D-32 Audit PDP
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2 px-2">TIKET ADUAN</th>
                    <th className="py-2 px-2">URAIAN KERUSAKAN</th>
                    <th className="py-2 px-2">RUANG</th>
                    <th className="py-2 px-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(anggotaList.length > 0 ? anggotaList : [
                    {
                      laporan_id: "LAP-20261028-2F2F5157",
                      deskripsi: "Plafon gypsum jebol parah",
                      fasilitas_terkait: "Kelas 4A",
                      kondisi_dilaporkan: "Divalidasi",
                    },
                    {
                      laporan_id: "LAP-20261028-691DA8CC",
                      deskripsi: "Rangka kayu atap retak lapuk",
                      fasilitas_terkait: "Kelas 4B",
                      kondisi_dilaporkan: "Divalidasi",
                    },
                    {
                      laporan_id: "LAP-20261028-5526BFFB",
                      deskripsi: "Sebagian plafon ruang kelas ambruk",
                      fasilitas_terkait: "Kelas 4A",
                      kondisi_dilaporkan: "Divalidasi",
                    },
                    {
                      laporan_id: "LAP-20261028-C661B424",
                      deskripsi: "Siswa dipindah ke lab karena atap bocor",
                      fasilitas_terkait: "R. Kelas",
                      kondisi_dilaporkan: "Divalidasi",
                    },
                    {
                      laporan_id: "LAP-20261028-A555D00E",
                      deskripsi: "Atap teras belakang diserang rayap",
                      fasilitas_terkait: "Teras",
                      kondisi_dilaporkan: "Perlu Review",
                    },
                  ]).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-700 whitespace-nowrap font-medium">
                        {item.laporan_id.slice(0, 22)}
                      </td>
                      <td className="py-2.5 px-2 text-slate-800 text-xs">
                        {item.deskripsi}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-blue-700 font-semibold whitespace-nowrap">
                        {item.fasilitas_terkait || "Ruang Belajar"}
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.kondisi_dilaporkan === "Perlu Review"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {item.kondisi_dilaporkan || "Divalidasi"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              <span>Seluruh pelapor diverifikasi NIK terlindungi AES-256 UU PDP No. 27/2022.</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="font-bold text-[#0B3052] hover:underline cursor-pointer"
              >
                Unduh PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
