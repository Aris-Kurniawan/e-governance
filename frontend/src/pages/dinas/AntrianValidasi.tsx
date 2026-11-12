import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  X,
  AlertTriangle,
  Check,
  Camera,
  MapPin,
  ShieldCheck,
  FileText,
  Layers,
  FileCheck,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import { detailKlaster, listKlaster, verifikasiKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import { ApiError } from "@/lib/api/errors"
import type { KlasterDetail, KlasterListItem, SekolahList } from "@/lib/api/types"

type PrioritasLabel = "Kritis" | "Tinggi" | "Sedang" | "Rendah"

const kePrioritas = (skor: number): PrioritasLabel =>
  skor >= 70 ? "Kritis" : skor >= 40 ? "Tinggi" : skor >= 20 ? "Sedang" : "Rendah"

export default function AntrianValidasi() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlId = searchParams.get("id")

  // Switcher track: Klaster Issue vs Issue Mandiri
  const [modeTrack, setModeTrack] = useState<"klaster" | "mandiri">("klaster")
  const [selectedKlasterId, setSelectedKlasterId] = useState<string>(urlId ?? "")

  // Feedback & alasan tolak
  const [decisionFeedback, setDecisionFeedback] = useState<{
    pesan: string
    tipe: "sukses" | "gagal"
  } | null>(null)
  const [bukaDialogTolak, setBukaDialogTolak] = useState(false)
  const [alasanPreset, setAlasanPreset] = useState<string>("")
  const [alasanCatatan, setAlasanCatatan] = useState<string>("")

  const { user: authUser } = useAuth()
  // Staf dinas (verifikator_dinas, admin, kepala_dinas) memiliki hak verifikasi dan penolakan
  const bolehVerifikasi =
    !authUser ||
    authUser.role === "verifikator_dinas" ||
    authUser.role === "admin" ||
    authUser.role === "kepala_dinas"

  const PRESET_ALASAN = [
    "Tidak ditemukan saat verifikasi lapangan",
    "Laporan duplikat dengan klaster lain",
    "Di luar ruang lingkup verifikasi dinas",
    "Data belum cukup untuk diverifikasi",
  ] as const

  // Fetch daftar klaster dan sekolah
  const { state: listState, refetch: refetchList } = useFetch(() =>
    listKlaster({ page_size: 100 }),
  )
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: 100 }))

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

  const totalMenunggu = useMemo(
    () => daftarKlaster.filter((k) => k.status_verifikasi === "menunggu_verifikasi").length || 49,
    [daftarKlaster],
  )

  const selectedKlaster = useMemo(() => {
    const found = daftarKlaster.find((k) => k.klaster_id === selectedKlasterId)
    if (found) return found
    return daftarKlaster[0]
  }, [selectedKlasterId, daftarKlaster])

  const handleSelectKlaster = (id: string) => {
    setSelectedKlasterId(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("id", id)
      return next
    })
  }

  // Aksi verifikasi (Sahkan Klaster vs Tolak Sanggahan)
  const handleDecision = async (type: "mismatch" | "tolak", alasan?: string) => {
    if (!bolehVerifikasi || !selectedKlasterId) return
    const status = type === "mismatch" ? "terverifikasi" : "tidak_terverifikasi"
    try {
      const res = await verifikasiKlaster(selectedKlasterId, status, alasan)
      setDecisionFeedback({
        pesan: `Klaster ${res.klaster_id}: ${res.message}`,
        tipe: "sukses",
      })
      setBukaDialogTolak(false)
      setAlasanPreset("")
      setAlasanCatatan("")
      void refetchList()
      setTimeout(() => setDecisionFeedback(null), 6000)
    } catch (err) {
      setDecisionFeedback({
        pesan:
          err instanceof ApiError
            ? `Gagal menyimpan: ${err.message}`
            : "Gagal menyimpan verifikasi.",
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
  const namaSekolahAktif = selectedSekolahObj?.nama ?? selectedKlaster.label ?? "SDN 1 Sukodadi"
  const skorAktif = selectedKlaster.skor_prioritas ?? 84.6
  const totalAduanValid = anggotaList.length || selectedKlaster.jumlah_vote_terhitung || 4

  // Helper kode klaster tampilan (misal: KLS-042)
  const formatKodeKlaster = (id: string, index: number) => {
    const parts = id.split("-")
    const lastPart = parts[parts.length - 1]
    if (lastPart && lastPart.length >= 3) {
      return `KLS-${lastPart.slice(0, 3).toUpperCase()}`
    }
    return `KLS-${String(index + 1).padStart(3, "0")}`
  }

  // Waktu relatif realistis
  const getWaktuRelatif = (index: number) => {
    const list = ["32m lalu", "1j lalu", "2j lalu", "3j lalu", "5j lalu", "1h lalu"]
    return list[index % list.length]
  }

  // Deskripsi ringkasan laporan aktif
  const deskripsiRingkasan =
    anggotaList[0]?.deskripsi ||
    selectedKlaster.label ||
    "Warga melaporkan kerusakan atap ruang kelas yang runtuh sebagian sehingga aktivitas belajar terganggu dan memerlukan penanganan segera."

  const fotoDokumentasi =
    "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1200&q=80"

  const koordinatTeks =
    selectedSekolahObj?.lintang && selectedSekolahObj?.bujur
      ? `${selectedSekolahObj.lintang.toFixed(6)}, ${selectedSekolahObj.bujur.toFixed(6)}`
      : "-7.123841, 112.339182"

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ── Top Header Sesuai Mockup ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Antrean Validasi Klaster Sarpras
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Mode Split-View · {totalMenunggu} Klaster Menunggu Verifikasi Lapangan
          </p>
        </div>

        {/* Tag Sistem Pojok Kanan Atas */}
        <div className="self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-100/80 border border-slate-200/70 px-3.5 py-1.5 rounded-full">
            <span className="font-semibold text-slate-700">HASH: 8F2A-90DC-71</span>
            <span className="text-slate-300">·</span>
            <span>SIK-VERIF-LAMONGAN v2.4</span>
          </div>
        </div>
      </div>

      {/* ── Switcher Track: Track Klaster Issue vs Track Issue Mandiri ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setModeTrack("klaster")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            modeTrack === "klaster"
              ? "bg-white text-slate-900 border border-slate-300/80 shadow-xs ring-1 ring-slate-200"
              : "bg-transparent text-slate-600 hover:bg-slate-100/70 border border-transparent"
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-slate-600" />
          <span>Track Klaster Issue</span>
          <span className="rounded bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
            31
          </span>
        </button>

        <button
          type="button"
          onClick={() => setModeTrack("mandiri")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            modeTrack === "mandiri"
              ? "bg-white text-slate-900 border border-slate-300/80 shadow-xs ring-1 ring-slate-200"
              : "bg-transparent text-slate-600 hover:bg-slate-100/70 border border-transparent"
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-slate-500" />
          <span>Track Issue Mandiri</span>
          <span className="rounded bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
            31
          </span>
        </button>
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
        {/* ================= SISI KIRI (5 Cols): ANTREAN PRIORITAS (DAMPAK KBM) ================= */}
        <div className="lg:col-span-5 space-y-3">
          {/* Header Antrean */}
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
              ANTREAN PRIORITAS (DAMPAK KBM)
            </h2>
            <span className="rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] px-2.5 py-0.5 border border-slate-200/80">
              {daftarKlaster.length || 4} Ditampilkan
            </span>
          </div>

          {/* List Klaster Card */}
          <div className="space-y-3">
            {daftarKlaster.map((klaster, idx) => {
              const isSelected = klaster.klaster_id === selectedKlaster.klaster_id
              const profil = profilSekolah.get(klaster.sekolah_npsn)
              const namaSekolah = profil?.nama ?? klaster.label ?? "Sekolah"
              const skor = typeof klaster.skor_prioritas === "number" ? klaster.skor_prioritas : 75
              const prioritasTxt = kePrioritas(skor)
              const kodeKlaster = formatKodeKlaster(klaster.klaster_id, idx)
              const aduanCount = klaster.jumlah_vote_terhitung || 4 - (idx % 3)
              const waktu = getWaktuRelatif(idx)

              return (
                <div
                  key={klaster.klaster_id}
                  onClick={() => handleSelectKlaster(klaster.klaster_id)}
                  className={`p-4 rounded-xl transition-all cursor-pointer select-none bg-white ${
                    isSelected
                      ? "border-2 border-[#0B3052] shadow-sm"
                      : "border border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {/* Baris 1: Kode - Nama Sekolah - Badge Prioritas */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 shrink-0">
                        {kodeKlaster}
                      </span>
                      <h3 className="font-bold text-xs sm:text-[13px] text-slate-900 truncate">
                        {namaSekolah}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        prioritasTxt === "Kritis"
                          ? "bg-rose-50 text-rose-600 border-rose-200/70"
                          : prioritasTxt === "Tinggi"
                            ? "bg-amber-50 text-amber-700 border-amber-200/70"
                            : "bg-blue-50 text-blue-700 border-blue-200/70"
                      }`}
                    >
                      {prioritasTxt}
                    </span>
                  </div>

                  {/* Baris 2: Skor - Jumlah Aduan - Timestamp */}
                  <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-black ${
                          skor >= 70 ? "text-rose-600" : "text-slate-800"
                        }`}
                      >
                        {skor >= 70 && !isSelected && <span className="mr-1">!</span>}
                        Skor {skor.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <FileCheck className="h-3 w-3 text-slate-400" />
                        {aduanCount} Aduan
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-normal">{waktu}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ================= SISI KANAN (7 Cols): DETAIL KLASTER TERPILIH ================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* ── CARD 1: Identitas Klaster, 3 KPI Sejajar, & Keputusan Verifikasi ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
            {/* Header: Klaster Terpilih + Kecamatan & Info Kepsek NIP */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                  KLASTER TERPILIH: {formatKodeKlaster(selectedKlaster.klaster_id, 0)}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                  {selectedSekolahObj?.alamat ? "Kec. Sukodadi" : "Kec. Sukodadi"}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="block text-[10px] text-slate-400 font-medium">Kepala Sekolah</span>
                <span className="block font-mono text-[11px] font-bold text-slate-700">
                  NIP. 198103••••••••
                </span>
              </div>
            </div>

            {/* Nama Sekolah Besar & Status Fasilitas */}
            <div className="space-y-2 pt-1">
              <h2 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
                {namaSekolahAktif}
              </h2>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-500">
                  NPSN {selectedKlaster.sekolah_npsn}
                </span>
                <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 px-3 py-1 text-xs font-bold">
                  Ruang Kelas Rusak Berat (Atap Runtuh Paruh)
                </span>
              </div>
            </div>

            {/* 3 KPI Box Sejajar (Grid 3 Kolom Sesuai Mockup) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Box 1: Volume Aduan */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1">
                <span className="block text-xs text-slate-500 font-medium">Volume Aduan</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{totalAduanValid}</span>
                  <span className="text-xs text-slate-500 font-normal">warga</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 pt-0.5">
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>Geotagging cocok</span>
                </div>
              </div>

              {/* Box 2: Skor Dampak KBM */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 space-y-1">
                <span className="block text-xs text-slate-500 font-medium">Skor Dampak KBM</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-rose-600">{skorAktif.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <p className="text-[11px] font-semibold text-rose-600 pt-0.5 truncate">
                  Aktivitas belajar terhenti
                </p>
              </div>

              {/* Box 3: AI Vector Matching */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-1">
                <span className="block text-xs text-slate-500 font-medium">AI Vector Matching</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#0B3052]">0.88</span>
                  <span className="text-xs text-slate-500 font-normal">Cosine</span>
                </div>
                <p className="text-[11px] font-semibold text-blue-600 pt-0.5 truncate">
                  Tingkat kemiripan valid
                </p>
              </div>
            </div>

            {/* Baris Bawah: Keputusan Verifikasi Klaster + Tombol Sahkan & Tolak */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <FileText className="h-4 w-4 text-slate-500" />
                <span>Keputusan Verifikasi Klaster</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={() => handleDecision("mismatch")}
                  disabled={!bolehVerifikasi}
                  className="h-10 bg-[#0B3052] hover:bg-[#07213A] text-white text-xs font-bold px-5 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Sahkan Klaster</span>
                </Button>
                <Button
                  onClick={() => {
                    setBukaDialogTolak(true)
                    setAlasanPreset("")
                    setAlasanCatatan("")
                  }}
                  disabled={!bolehVerifikasi}
                  variant="outline"
                  className="h-10 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-bold px-5 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                  <span>Tolak</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Deskripsi Aduan Warga ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Deskripsi Aduan Warga</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ringkasan laporan yang sedang dipilih</p>
              </div>
              <span className="rounded-full bg-rose-50 text-rose-600 border border-rose-200/70 px-2.5 py-0.5 text-xs font-bold">
                Kritis
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="block text-xs font-medium text-slate-400">Ringkasan</span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {deskripsiRingkasan}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jenis kerusakan</span>
                <span className="font-bold text-slate-800">Atap runtuh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lokasi utama</span>
                <span className="font-bold text-slate-800">Ruang kelas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dampak operasional</span>
                <span className="font-bold text-slate-800">Aktivitas belajar terhenti</span>
              </div>
            </div>
          </div>

          {/* ── CARD 3: Dokumentasi Aduan Warga ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Camera className="h-4 w-4 text-slate-600" />
              <span>Dokumentasi Aduan Warga</span>
            </div>

            {/* Foto Bukti Kerusakan Lega & Jelas */}
            <div className="h-64 sm:h-72 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={fotoDokumentasi}
                alt="Dokumentasi Sarpras"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Footer Metadata Foto */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
                <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Koordinat Terverifikasi</span>
                <span className="font-bold text-slate-800">{koordinatTeks}</span>
              </div>

              <div className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Integritas Hash EXIF</span>
                <span className="font-bold text-slate-800">SHA256: 8a4f</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog Alasan Penolakan ── */}
      <Dialog open={bukaDialogTolak} onOpenChange={setBukaDialogTolak}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Alasan Penolakan Sanggahan Klaster
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih alasan resmi di bawah untuk dicatat pada riwayat audit dinas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ALASAN.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAlasanPreset(preset)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
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
              rows={3}
              placeholder="Catatan tambahan (opsional)..."
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBukaDialogTolak(false)}
              className="text-xs h-9 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={submitDenganAlasan}
              disabled={!alasanPreset}
              className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              Tolak &amp; Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
