import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useFetch } from "@/hooks/useFetch"
import PertanyaanKonfirmasi from "@/components/warga/PertanyaanKonfirmasi"
import { riwayatLaporan, listLaporanPublik } from "@/lib/api/laporan"
import { listSekolah } from "@/lib/api/sekolah"
import { listKlaster } from "@/lib/api/klaster"
import { isLoggedIn } from "@/lib/api/auth"
import type { RiwayatLaporanItem, KlasterListItem } from "@/lib/api/types"
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  ArrowRight,
  Clock,
  RotateCw,
  LogIn,
  Search,
  Globe2,
  UserCheck,
  ThumbsUp,
  Building2,
  Check,
  ChevronDown,
  XCircle,
  HelpCircle,
  Activity,
} from "lucide-react"

const PAGE_SIZE = 50

type TabPribadi = "semua" | "menunggu" | "divalidasi" | "ditolak"
type FilterPublik = "semua" | "menunggu_verifikasi" | "terverifikasi" | "dalam_proses" | "selesai"

const TABS_PRIBADI: { id: TabPribadi; label: string }[] = [
  { id: "semua", label: "Semua Laporan Saya" },
  { id: "menunggu", label: "Menunggu Validasi" },
  { id: "divalidasi", label: "Tervalidasi" },
  { id: "ditolak", label: "Ditolak" },
]

const STATUS_STYLE: Record<string, { box: string; label: string }> = {
  menunggu: {
    box: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Menunggu Validasi Dinas",
  },
  menunggu_verifikasi: {
    box: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Menunggu Verifikasi",
  },
  divalidasi: {
    box: "bg-emerald-50 text-emerald-800 border-emerald-200",
    label: "Tervalidasi",
  },
  terverifikasi: {
    box: "bg-emerald-50 text-emerald-800 border-emerald-200",
    label: "Terverifikasi Lapangan",
  },
  perlu_info_tambahan: {
    box: "bg-blue-50 text-blue-800 border-blue-200",
    label: "Perlu Info Tambahan",
  },
  tidak_terverifikasi: {
    box: "bg-rose-50 text-rose-800 border-rose-200",
    label: "Tidak Terverifikasi",
  },
  ditolak: {
    box: "bg-rose-50 text-rose-800 border-rose-200",
    label: "Ditolak",
  },
}

const KONDISI_LABEL: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_sedang: "Rusak Sedang",
  rusak_berat: "Rusak Berat",
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

export interface InfoStatusPengerjaan {
  status: "menunggu_verifikasi" | "sudah_diproses" | "dalam_pengerjaan" | "sudah_selesai" | "tidak_ditindaklanjuti"
  label: string
  ringkas: string
  badgeStyle: string
  dotStyle: string
  tahapIndex: number // 1: Telaah, 2: Sudah Diproses, 3: Dalam Pengerjaan, 4: Sudah Selesai, 0: Ditolak
}

export function getStatusPengerjaan(
  statusPenanganan?: string | null,
  statusSanggahan?: string | null,
  statusVerifikasi?: string | null
): InfoStatusPengerjaan {
  // 1. Cek nilai eksplisit dari status_penanganan
  if (statusPenanganan === "selesai") {
    return {
      status: "sudah_selesai",
      label: "Sudah Selesai",
      ringkas: "Perbaikan sarpras telah tuntas dikerjakan di lapangan.",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-300",
      dotStyle: "bg-emerald-500",
      tahapIndex: 4,
    }
  }

  if (statusPenanganan === "dalam_proses") {
    return {
      status: "dalam_pengerjaan",
      label: "Dalam Pengerjaan",
      ringkas: "Pekerjaan fisik sarpras sedang berlangsung di sekolah.",
      badgeStyle: "bg-amber-50 text-amber-900 border-amber-300",
      dotStyle: "bg-amber-500 animate-pulse",
      tahapIndex: 3,
    }
  }

  if (statusPenanganan === "dalam_antrian_prioritas") {
    return {
      status: "sudah_diproses",
      label: "Sudah Diproses",
      ringkas: "Laporan telah diverifikasi & masuk antrean penanganan dinas.",
      badgeStyle: "bg-sky-50 text-sky-800 border-sky-300",
      dotStyle: "bg-sky-500",
      tahapIndex: 2,
    }
  }

  if (statusPenanganan === "tidak_dapat_ditindaklanjuti") {
    return {
      status: "tidak_ditindaklanjuti",
      label: "Tidak Ditindaklanjuti",
      ringkas: "Laporan di luar wewenang atau ditutup oleh dinas.",
      badgeStyle: "bg-rose-50 text-rose-800 border-rose-300",
      dotStyle: "bg-rose-500",
      tahapIndex: 0,
    }
  }

  // 2. Fallback berdasarkan status_sanggahan / status_verifikasi
  if (statusSanggahan === "divalidasi" || statusVerifikasi === "terverifikasi") {
    return {
      status: "sudah_diproses",
      label: "Sudah Diproses",
      ringkas: "Laporan tervalidasi dinas & masuk rencana penanganan.",
      badgeStyle: "bg-sky-50 text-sky-800 border-sky-300",
      dotStyle: "bg-sky-500",
      tahapIndex: 2,
    }
  }

  if (statusSanggahan === "ditolak" || statusVerifikasi === "tidak_terverifikasi") {
    return {
      status: "tidak_ditindaklanjuti",
      label: "Tidak Ditindaklanjuti",
      ringkas: "Laporan ditolak atau tidak memenuhi syarat verifikasi.",
      badgeStyle: "bg-rose-50 text-rose-800 border-rose-300",
      dotStyle: "bg-rose-500",
      tahapIndex: 0,
    }
  }

  // 3. Default: baru diajukan, menunggu telaah
  return {
    status: "menunggu_verifikasi",
    label: "Menunggu Telaah",
    ringkas: "Menunggu verifikasi dan telaah berkas oleh dinas.",
    badgeStyle: "bg-slate-100 text-slate-700 border-slate-300",
    dotStyle: "bg-slate-400",
    tahapIndex: 1,
  }
}

function PengerjaanTracker({ pengerjaan }: { pengerjaan: InfoStatusPengerjaan }) {
  if (pengerjaan.tahapIndex === 0) {
    return (
      <div className="rounded-xl bg-rose-50/70 border border-rose-200/80 p-3.5 text-xs text-rose-800 flex items-center gap-2">
        <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
        <span>Status penanganan dihentikan atau tidak dapat ditindaklanjuti oleh dinas.</span>
      </div>
    )
  }

  const steps = [
    { no: 1, title: "Laporan Masuk" },
    { no: 2, title: "Sudah Diproses" },
    { no: 3, title: "Dalam Pengerjaan" },
    { no: 4, title: "Sudah Selesai" },
  ]

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header Info Alur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <span className="flex items-center gap-1.5 font-bold text-slate-800">
          <Activity className="h-4 w-4 text-[#3B82F6]" />
          Alur Pengerjaan Laporan
        </span>
        <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
          {pengerjaan.ringkas}
        </span>
      </div>

      {/* Stepper Bulat Horizontal persis seperti gambar */}
      <div className="pt-2 pb-1">
        <div className="flex items-start justify-between w-full">
          {steps.map((st, idx) => {
            const isDone = st.no < pengerjaan.tahapIndex || pengerjaan.status === "sudah_selesai"
            const isCurrent = st.no === pengerjaan.tahapIndex && pengerjaan.status !== "sudah_selesai"
            const isLast = idx === steps.length - 1

            return (
              <div key={st.no} className="flex-1 flex flex-col items-center relative">
                {/* Garis Penghubung antar bulatan */}
                {!isLast && (
                  <div
                    className={`absolute top-5 sm:top-[22px] left-[50%] right-[-50%] h-[3px] -translate-y-1/2 z-0 ${
                      st.no < pengerjaan.tahapIndex || pengerjaan.status === "sudah_selesai"
                        ? "bg-[#3B82F6]"
                        : "bg-slate-200"
                    }`}
                  />
                )}

                {/* Lingkaran Step */}
                <div className="relative z-10 flex items-center justify-center">
                  {isDone ? (
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-xs">
                      <Check className="h-5 w-5 stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border-[3.5px] border-[#3B82F6] text-[#3B82F6] font-bold text-sm sm:text-base flex items-center justify-center shadow-xs">
                      {st.no}
                    </div>
                  ) : (
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border-[3.5px] border-[#3B82F6] text-[#3B82F6] font-bold text-sm sm:text-base flex items-center justify-center shadow-xs">
                      {st.no}
                    </div>
                  )}
                </div>

                {/* Label teks di bawah lingkaran */}
                <div className="mt-2.5 text-center px-1">
                  <span
                    className={`text-xs sm:text-sm block leading-tight ${
                      isCurrent
                        ? "font-bold text-slate-900"
                        : isDone
                          ? "font-medium text-slate-400"
                          : "font-semibold text-slate-700"
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function RiwayatLaporan() {
  const { isAuthenticated, user } = useAuth()
  const loggedIn = isLoggedIn()

  // Mode utama: "publik" (Riwayat Laporan Publik) vs "pribadi" (Laporan Pribadi)
  // Default selalu "publik" agar aduan tervalidasi dinas & klaster publik langsung terlihat
  const [viewMode, setViewMode] = useState<"publik" | "pribadi">("publik")

  // State tab pribadi
  const [tabPribadi, setTabPribadi] = useState<TabPribadi>("semua")
  const [pagePribadi, setPagePribadi] = useState(1)

  // F4.13 T4 — modal konfirmasi severity dari riwayat (id laporan aktif).
  const [konfirmasiFor, setKonfirmasiFor] = useState<string | null>(null)

  // State pencarian & filter publik
  const [searchPublik, setSearchPublik] = useState("")
  const [subModePublik, setSubModePublik] = useState<"semua" | "klaster" | "mandiri">("semua")
  const [filterPublikStatus, setFilterPublikStatus] = useState<FilterPublik>("semua")
  const [filterPublikJenjang, setFilterPublikJenjang] = useState("Semua")
  const [pagePublik, setPagePublik] = useState(1)

  const navigate = useNavigate()

  // 1. Data pribadi (hanya fetch jika loggedIn)
  const { state: statePribadi, refetch: refetchPribadi } = useFetch(
    () => riwayatLaporan({ page: pagePribadi, page_size: PAGE_SIZE }),
    [loggedIn, pagePribadi]
  )

  // 2. Data sekolah publik
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: 100 }))

  // 3. Data klaster / registri publik
  const { state: klasterState, refetch: refetchKlaster } = useFetch(
    () => listKlaster({ page_size: 100 })
  )

  // 4. Data aduan mandiri tervalidasi publik (DBG-023, D-29)
  const { state: mandiriState, refetch: refetchMandiri } = useFetch(
    () => listLaporanPublik({ page_size: 100 })
  )

  const profilSekolah = useMemo(() => {
    const map = new Map<string, { nama: string; jenjang: string }>()
    if (sekolahState.status === "success") {
      for (const s of sekolahState.data.data) {
        map.set(s.npsn, { nama: s.nama, jenjang: s.jenjang })
      }
    }
    return map
  }, [sekolahState])

  // Laporan pribadi items
  const itemsPribadi: RiwayatLaporanItem[] =
    statePribadi.status === "success" ? statePribadi.data.data : []

  const countsPribadi = useMemo(() => {
    const base = { semua: itemsPribadi.length, menunggu: 0, divalidasi: 0, ditolak: 0 }
    for (const item of itemsPribadi) {
      if (item.status_sanggahan in base) {
        base[item.status_sanggahan as Exclude<TabPribadi, "semua">] += 1
      }
    }
    return base
  }, [itemsPribadi])

  const visiblePribadi = useMemo(
    () => (tabPribadi === "semua" ? itemsPribadi : itemsPribadi.filter((i) => i.status_sanggahan === tabPribadi)),
    [itemsPribadi, tabPribadi]
  )

  // Laporan publik items (dari Klaster publik)
  const itemsPublikRaw: KlasterListItem[] =
    klasterState.status === "success" ? klasterState.data.data : []

  const itemsPublikFiltered = useMemo(() => {
    const q = searchPublik.trim().toLowerCase()
    return itemsPublikRaw.filter((k) => {
      const profil = profilSekolah.get(k.sekolah_npsn)
      const namaSekolah = profil?.nama ?? ""
      const jenjang = profil?.jenjang ?? ""

      const matchSearch =
        !q ||
        k.klaster_id.toLowerCase().includes(q) ||
        k.sekolah_npsn.includes(q) ||
        namaSekolah.toLowerCase().includes(q) ||
        (k.label ?? "").toLowerCase().includes(q) ||
        k.kategori.toLowerCase().includes(q)

      let matchStatus = true
      if (filterPublikStatus === "menunggu_verifikasi") {
        matchStatus = k.status_verifikasi === "menunggu_verifikasi"
      } else if (filterPublikStatus === "terverifikasi") {
        matchStatus = k.status_verifikasi === "terverifikasi"
      } else if (filterPublikStatus === "dalam_proses") {
        matchStatus = k.status_penanganan === "dalam_proses"
      } else if (filterPublikStatus === "selesai") {
        matchStatus = k.status_penanganan === "selesai"
      }

      const matchJenjang = filterPublikJenjang === "Semua" || jenjang === filterPublikJenjang

      return matchSearch && matchStatus && matchJenjang
    })
  }, [itemsPublikRaw, profilSekolah, searchPublik, filterPublikStatus, filterPublikJenjang])

  // Laporan aduan mandiri tervalidasi publik (DBG-023, D-29)
  const itemsMandiriRaw: RiwayatLaporanItem[] =
    mandiriState.status === "success" ? mandiriState.data.data : []

  const itemsMandiriFiltered = useMemo(() => {
    const q = searchPublik.trim().toLowerCase()
    return itemsMandiriRaw.filter((m) => {
      const profil = profilSekolah.get(m.sekolah_npsn)
      const namaSekolah = profil?.nama ?? ""
      const jenjang = profil?.jenjang ?? ""

      const matchSearch =
        !q ||
        m.tracking_id.toLowerCase().includes(q) ||
        m.sekolah_npsn.includes(q) ||
        namaSekolah.toLowerCase().includes(q) ||
        (m.fasilitas_terkait ?? "").toLowerCase().includes(q) ||
        m.deskripsi.toLowerCase().includes(q)

      const matchJenjang = filterPublikJenjang === "Semua" || jenjang === filterPublikJenjang

      let matchStatus = true
      const pen = getStatusPengerjaan(m.status_penanganan, m.status_sanggahan)
      if (filterPublikStatus === "menunggu_verifikasi") {
        matchStatus = pen.status === "menunggu_verifikasi"
      } else if (filterPublikStatus === "terverifikasi") {
        matchStatus = pen.status === "sudah_diproses"
      } else if (filterPublikStatus === "dalam_proses") {
        matchStatus = pen.status === "dalam_pengerjaan"
      } else if (filterPublikStatus === "selesai") {
        matchStatus = pen.status === "sudah_selesai"
      }

      return matchSearch && matchJenjang && matchStatus
    })
  }, [itemsMandiriRaw, profilSekolah, searchPublik, filterPublikStatus, filterPublikJenjang])

  type ItemPublikGabungan =
    | { tipe: "klaster"; id: string; data: KlasterListItem }
    | { tipe: "mandiri"; id: string; data: RiwayatLaporanItem }

  const itemsGabunganFiltered: ItemPublikGabungan[] = useMemo(() => {
    const klasterList: ItemPublikGabungan[] = itemsPublikFiltered.map((k) => ({
      tipe: "klaster",
      id: `klaster-${k.klaster_id}`,
      data: k,
    }))
    const mandiriList: ItemPublikGabungan[] = itemsMandiriFiltered.map((m) => ({
      tipe: "mandiri",
      id: `mandiri-${m.id}`,
      data: m,
    }))

    if (subModePublik === "klaster") return klasterList
    if (subModePublik === "mandiri") return mandiriList
    // "semua": tampilkan aduan mandiri tervalidasi dinas & klaster secara harmonis
    return [...mandiriList, ...klasterList]
  }, [itemsPublikFiltered, itemsMandiriFiltered, subModePublik])

  const ITEMS_PER_PAGE_PUBLIK = 8
  const currentTotalPublik = itemsGabunganFiltered.length
  const totalPagesPublik = Math.max(Math.ceil(currentTotalPublik / ITEMS_PER_PAGE_PUBLIK), 1)

  const paginatedGabungan = itemsGabunganFiltered.slice(
    (pagePublik - 1) * ITEMS_PER_PAGE_PUBLIK,
    pagePublik * ITEMS_PER_PAGE_PUBLIK
  )

  const handleBuatLaporanClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      navigate("/login?redirect=" + encodeURIComponent("/laporan/baru"))
    }
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Top Header Strip ── */}
      <div className="border-b border-slate-200/80 bg-white py-2.5 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 tracking-wider uppercase text-[11px]">
              REGISTRI TRANSPARANSI PUBLIK SIMAKIS
            </span>
            <span className="text-slate-300">|</span>
            <span>KECAMATAN LAMONGAN</span>
          </div>
          {loggedIn ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> SESI AKTIF &middot; {user?.nama ?? "Warga Terdaftar"}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <Globe2 className="h-3 w-3 text-blue-600" /> MODE TRANSPARANSI PUBLIK
              </span>
              <Link
                to="/login?redirect=%2Flaporan%2Friwayat"
                className="text-[11px] font-bold text-[#0B3052] hover:underline"
              >
                Masuk Akun
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        {/* ── Main Header Card ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-900 border border-blue-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> PORTAL ADUAN &amp; AUDIT PARTISIPATIF
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {viewMode === "publik" ? "Registri Aduan & Isu Sarpras Publik" : "Riwayat Laporan Saya"}
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                {viewMode === "publik"
                  ? "Transparansi laporan kondisi fasilitas sekolah yang dihimpun dari masyarakat se-Kecamatan Lamongan dan dipantau oleh Dinas Pendidikan."
                  : "Pantau status verifikasi dan tindak lanjut aduan sarana sekolah yang telah kamu ajukan secara resmi."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button asChild className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-5 py-3 h-11 rounded-xl text-sm shadow-sm w-full sm:w-auto cursor-pointer">
                <Link to="/laporan/baru" onClick={handleBuatLaporanClick}>
                  <Plus className="h-4 w-4 mr-1.5" /> Buat Aduan Baru
                </Link>
              </Button>
            </div>
          </div>

          {/* Mode Switcher Buttons: Riwayat Laporan Publik vs Laporan Pribadi */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5 flex-wrap gap-4">
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setViewMode("publik")
                  setPagePublik(1)
                }}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === "publik"
                    ? "bg-[#0B3052] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Globe2 className="h-4 w-4" />
                <span>Riwayat Laporan Publik</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    viewMode === "publik"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {itemsPublikRaw.length + itemsMandiriRaw.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("pribadi")
                  setPagePribadi(1)
                }}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === "pribadi"
                    ? "bg-[#0B3052] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Laporan Pribadi</span>
                {loggedIn ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                      viewMode === "pribadi"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {itemsPribadi.length}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">(Login)</span>
                )}
              </button>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {viewMode === "publik"
                ? "Seluruh aduan & klaster isu terverifikasi di wilayah kerja"
                : "Aduan resmi yang diajukan melalui akun Anda"}
            </span>
          </div>
        </div>

        {/* ── MODE 1: TRANSPARANSI PUBLIK ── */}
        {viewMode === "publik" && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* Sub-filter Switcher: Semua vs Klaster vs Mandiri */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70 w-fit flex-wrap">
                {[
                  {
                    id: "semua",
                    label: `Semua Laporan Publik (${itemsPublikRaw.length + itemsMandiriRaw.length})`,
                  },
                  { id: "klaster", label: `Klaster Isu Sarpras (${itemsPublikRaw.length})` },
                  { id: "mandiri", label: `Aduan Mandiri Tervalidasi (${itemsMandiriRaw.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSubModePublik(tab.id as "semua" | "klaster" | "mandiri")
                      setPagePublik(1)
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subModePublik === tab.id
                        ? "bg-white text-[#0B3052] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search & Filter Bar Publik */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchPublik}
                    onChange={(e) => {
                      setSearchPublik(e.target.value)
                      setPagePublik(1)
                    }}
                    placeholder="Lacak No. Tracking, ID Klaster, ketik nama sekolah, NPSN, atau kata kunci isu..."
                    className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      { id: "semua", label: "Semua" },
                      { id: "menunggu_verifikasi", label: "Menunggu Telaah" },
                      { id: "terverifikasi", label: "Sudah Diproses" },
                      { id: "dalam_proses", label: "Dalam Pengerjaan" },
                      { id: "selesai", label: "Sudah Selesai" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setFilterPublikStatus(st.id as FilterPublik)
                          setPagePublik(1)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          filterPublikStatus === st.id
                            ? "bg-[#0B3052] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <select
                      value={filterPublikJenjang}
                      onChange={(e) => {
                        setFilterPublikJenjang(e.target.value)
                        setPagePublik(1)
                      }}
                      className="h-8 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none"
                    >
                      {["Semua", "SD", "SMP", "SMA", "SMK"].map((j) => (
                        <option key={j}>{j}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* State Loading / Error Publik */}
              {(klasterState.status === "loading" || mandiriState.status === "loading") && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-500">
                  <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0B3052]" />
                  Memuat aduan publik…
                </div>
              )}

              {klasterState.status === "error" && mandiriState.status === "error" && (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-8 text-center space-y-3">
                  <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
                  <p className="text-sm font-bold text-slate-900">Gagal memuat registri publik</p>
                  <p className="text-xs text-slate-600">{klasterState.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchKlaster()
                      refetchMandiri()
                    }}
                    className="h-8 text-xs font-semibold text-slate-700 border-slate-200"
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" /> Coba Lagi
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {klasterState.status === "success" &&
                mandiriState.status === "success" &&
                itemsGabunganFiltered.length === 0 && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center space-y-2">
                    <XCircle className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-900">Tidak ada aduan publik yang sesuai</p>
                    <p className="text-xs text-slate-500">
                      Coba sesuaikan kata kunci pencarian atau filter jenjang sekolah.
                    </p>
                  </div>
                )}

              {/* List Gabungan Isu Publik & Aduan Mandiri */}
              {paginatedGabungan.map((item) => {
                if (item.tipe === "klaster") {
                  const k = item.data
                  const profil = profilSekolah.get(k.sekolah_npsn)
                  const stVerif = STATUS_STYLE[k.status_verifikasi] ?? {
                    box: "bg-slate-100 text-slate-700 border-slate-200",
                    label: k.status_verifikasi,
                  }
                  const pengerjaan = getStatusPengerjaan(k.status_penanganan, null, k.status_verifikasi)

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      {/* Top Header Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {k.klaster_id}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1 ${stVerif.box}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {stVerif.label}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1.5 ${pengerjaan.badgeStyle}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pengerjaan.dotStyle}`} />
                            Status Pengerjaan: {pengerjaan.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                            {k.kategori.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {/* Info Sekolah & Isu */}
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
                          <Building2 className="h-3.5 w-3.5 text-[#0B3052]" />
                          <span>NPSN: {k.sekolah_npsn}</span>
                          <span>&middot;</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 font-bold text-slate-700">
                            {profil?.jenjang ?? "Sekolah"}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {profil?.nama ?? "Sekolah"} &mdash; {k.label ?? "Klaster Isu Sarpras"}
                        </h3>
                      </div>

                      {/* Skor & Partisipasi Suara */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Skor Prioritas</span>
                          <span className="text-base font-black text-[#0B3052] tabular-nums">
                            {k.skor_prioritas ?? "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Skor Keparahan</span>
                          <span className="text-base font-black text-rose-700 tabular-nums">
                            {k.skor_keparahan ?? "—"}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[11px] text-slate-400 block font-medium">Dukungan Warga</span>
                          <span className="text-base font-black text-emerald-700 tabular-nums flex items-center gap-1">
                            <ThumbsUp className="h-3.5 w-3.5" /> {k.jumlah_vote_terhitung ?? 0} suara
                          </span>
                        </div>
                      </div>

                      {/* Tracker Alur Pengerjaan */}
                      <PengerjaanTracker pengerjaan={pengerjaan} />

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-400 text-[11px]">
                          Teragregasi dari aduan terverifikasi
                        </span>
                        <Link
                          to={`/klaster/${k.klaster_id}`}
                          className="inline-flex items-center gap-1.5 font-bold text-[#0B3052] hover:underline"
                        >
                          Lihat Detail Klaster &amp; Dukung <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                }

                // item.tipe === "mandiri"
                const m = item.data
                const profil = profilSekolah.get(m.sekolah_npsn)
                const pengerjaan = getStatusPengerjaan(m.status_penanganan, m.status_sanggahan)
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    {/* Top Header Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {m.tracking_id}
                        </span>
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Terverifikasi Dinas (Aduan Mandiri)
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1.5 ${pengerjaan.badgeStyle}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pengerjaan.dotStyle}`} />
                          Status Pengerjaan: {pengerjaan.label}
                        </span>
                      </div>

                      <span className="text-xs text-slate-400">
                        {new Date(m.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Info Sekolah & Fasilitas */}
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
                        <Building2 className="h-3.5 w-3.5 text-[#0B3052]" />
                        <span>NPSN: {m.sekolah_npsn}</span>
                        <span>&middot;</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 font-bold text-slate-700">
                          {profil?.jenjang ?? "Sekolah"}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {profil?.nama ?? "Sekolah"} &mdash; {m.fasilitas_terkait ?? "Fasilitas Sarpras"}
                      </h3>
                      {m.kondisi_dilaporkan && (
                        <div className="mt-1">
                          <span className="text-[11px] font-medium text-slate-500">
                            Kondisi dilaporkan:{" "}
                            <span className="capitalize font-bold text-slate-700">
                              {m.kondisi_dilaporkan.replace(/_/g, " ")}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Deskripsi Aduan */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <p className="line-clamp-4 text-slate-700">{m.deskripsi}</p>
                    </div>

                    {/* Tracker Alur Pengerjaan */}
                    <PengerjaanTracker pengerjaan={pengerjaan} />

                    {/* Footer Info Transparansi */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100/60">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Divalidasi keabsahannya oleh Dinas Pendidikan (D-21)
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                        Non-Klaster
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Pagination Publik */}
              {totalPagesPublik > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
                  <span>
                    Halaman {pagePublik} dari {totalPagesPublik} ({currentTotalPublik} item publik)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPagePublik((p) => Math.max(p - 1, 1))}
                      disabled={pagePublik === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <span className="h-8 w-8 rounded-lg bg-[#0B3052] text-white font-bold flex items-center justify-center">
                      {pagePublik}
                    </span>
                    <button
                      onClick={() => setPagePublik((p) => Math.min(p + 1, totalPagesPublik))}
                      disabled={pagePublik === totalPagesPublik}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Right Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Globe2 className="h-4 w-4 text-[#0B3052]" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    TRANSPARANSI AUDIT SARPRAS
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Semua temuan yang dilaporkan warga disandingkan dengan pangkalan data Dapodik
                  Kementerian. Laporan serupa otomatis dikelompokkan oleh kecerdasan buatan menjadi
                  satu <strong>Klaster Isu</strong>.
                </p>
                <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200/60 text-xs text-blue-900 space-y-1.5">
                  <span className="font-bold block">Bagaimana Cara Mendukung?</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Masuk ke akun terverifikasi kependudukan Anda, buka halaman detail klaster isu yang
                    relevan, lalu klik <strong>Beri Dukungan</strong>. Semakin banyak dukungan, semakin tinggi
                    skor prioritas penanganan Dinas!
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  STATISTIK AUDIT REGISTRI
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Total Klaster Terdaftar:</span>
                    <strong className="text-slate-900">{itemsPublikRaw.length}</strong>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Kecamatan:</span>
                    <strong className="text-slate-900">Lamongan</strong>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Prinsip Privasi:</span>
                    <strong className="text-emerald-700">UU PDP No. 27/2022</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 2: LAPORAN SAYA (PRIBADI) ── */}
        {viewMode === "pribadi" && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-8 space-y-6">
              {!loggedIn && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm text-center space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#0B3052] flex items-center justify-center mx-auto">
                    <LogIn className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Masuk untuk melihat riwayat laporan pribadi
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Laporan pribadi dilindungi hak privasinya sesuai UU PDP. Silakan masuk menggunakan
                      email terdaftar Anda untuk memantau status aduan yang Anda kirimkan.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={() => navigate("/login?redirect=" + encodeURIComponent("/laporan/riwayat"))}
                      className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-9 px-5 rounded-lg"
                    >
                      Masuk Akun Warga
                    </Button>
                    <button
                      type="button"
                      onClick={() => setViewMode("publik")}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      Lihat Registri Publik Saja
                    </button>
                  </div>
                </div>
              )}

              {loggedIn && (
                <>
                  {/* Filter Tabs Pribadi */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-2 overflow-x-auto">
                    {TABS_PRIBADI.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setTabPribadi(item.id)
                          setPagePribadi(1)
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          tabPribadi === item.id
                            ? "bg-[#0B3052] text-white shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {item.label} ({countsPribadi[item.id]})
                      </button>
                    ))}
                  </div>

                  {statePribadi.status === "loading" && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-500">
                      Memuat riwayat laporan…
                    </div>
                  )}

                  {statePribadi.status === "error" && (
                    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-8 text-center space-y-3">
                      <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
                      <p className="text-sm font-bold text-slate-900">Riwayat tidak dapat dimuat</p>
                      <p className="text-xs text-slate-600">{statePribadi.message}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refetchPribadi}
                        className="h-8 text-xs font-semibold text-slate-700 border-slate-200"
                      >
                        <RotateCw className="h-3.5 w-3.5 mr-1" /> Coba Lagi
                      </Button>
                    </div>
                  )}

                  {statePribadi.status === "success" && itemsPribadi.length === 0 && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center space-y-3">
                      <FileText className="mx-auto h-6 w-6 text-slate-400" />
                      <p className="text-sm font-bold text-slate-900">Belum ada laporan</p>
                      <p className="text-xs text-slate-500">
                        Sampaikan temuanmu lewat tombol &ldquo;Buat Aduan Baru&rdquo;.
                      </p>
                    </div>
                  )}

                  {statePribadi.status === "success" &&
                    visiblePribadi.map((item) => {
                      const status = STATUS_STYLE[item.status_sanggahan] ?? {
                        box: "bg-slate-100 text-slate-700 border-slate-200",
                        label: item.status_sanggahan,
                      }
                      const sekolah = profilSekolah.get(item.sekolah_npsn)?.nama
                      const pengerjaan = getStatusPengerjaan(item.status_penanganan, item.status_sanggahan)

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {item.tracking_id}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1 ${status.box}`}
                              >
                                {item.status_sanggahan === "divalidasi" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                )}
                                {status.label}
                              </span>
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1.5 ${pengerjaan.badgeStyle}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${pengerjaan.dotStyle}`} />
                                Status Pengerjaan: {pengerjaan.label}
                              </span>
                              {/* F4.13 T4 — penanda konfirmasi severity (§4.4) */}
                              {item.konfirmasi_perlu_dijawab && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 flex items-center gap-1">
                                  <HelpCircle className="h-3 w-3" />
                                  Konfirmasi: Menunggu Jawaban
                                  <button
                                    type="button"
                                    onClick={() => setKonfirmasiFor(item.id)}
                                    className="ml-0.5 rounded-md bg-amber-600 px-1.5 py-0.5 text-[10px] font-black text-white hover:bg-amber-700 cursor-pointer"
                                  >
                                    Jawab
                                  </button>
                                </span>
                              )}
                              {!item.konfirmasi_perlu_dijawab &&
                                item.status_konfirmasi === "terjawab" && (
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Konfirmasi Terjawab
                                  </span>
                                )}
                              {!item.konfirmasi_perlu_dijawab &&
                                item.status_konfirmasi === "dilewati" && (
                                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                    Konfirmasi Dilewati
                                  </span>
                                )}
                              <span className="text-[11px] text-slate-400 font-mono">
                                Diajukan: {formatTanggal(item.created_at)}
                              </span>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 shrink-0">
                              {item.kondisi_dilaporkan
                                ? `Kondisi: ${KONDISI_LABEL[item.kondisi_dilaporkan] ?? item.kondisi_dilaporkan}`
                                : "Kondisi tidak disebutkan"}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                              {sekolah ?? `Sekolah NPSN ${item.sekolah_npsn}`}
                              {item.fasilitas_terkait ? ` — ${item.fasilitas_terkait}` : ""}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-mono">
                              NPSN: {item.sekolah_npsn}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                              DESKRIPSI SANGGAHAN
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              {item.deskripsi}
                            </p>
                          </div>

                          {/* Tracker Alur Pengerjaan */}
                          <PengerjaanTracker pengerjaan={pengerjaan} />

                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                            <span>ID: {item.id}</span>
                            <span>Status backend: {item.status_sanggahan}</span>
                          </div>
                        </div>
                      )
                    })}
                </>
              )}
            </div>

            {/* Sidebar Right Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                  <Clock className="h-5 w-5 text-blue-700" />
                  <h3 className="font-bold text-blue-950 text-sm">ALUR PEMERIKSAAN</h3>
                </div>
                <ol className="space-y-2.5 text-xs text-slate-700 list-decimal list-inside">
                  <li>Kirim laporan + foto bukti (opsional).</li>
                  <li>Pipeline AI mengelompokkan laporan ke klaster isu harian.</li>
                  <li>Verifikator dinas memeriksa lapangan dan menetapkan status.</li>
                  <li>Isu terverifikasi masuk antrean prioritas penanganan.</li>
                </ol>
                <Link
                  to="/tentang"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline pt-2 border-t border-blue-100 w-full"
                >
                  Baca panduan validasi <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Kendala Nomor Registrasi?</h4>
                  <p className="text-[11px] text-slate-500">Hubungi Tim Layanan Audit Dapodik</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" /> Bantuan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* F4.13 T4 — jawab konfirmasi langsung dari riwayat (jalan sekali, */}
      {/* setelah selesai daftar di-refetch agar badge ikut berubah) */}
      {konfirmasiFor && (
        <PertanyaanKonfirmasi
          laporanId={konfirmasiFor}
          open
          onOpenChange={(open) => {
            if (!open) setKonfirmasiFor(null)
          }}
          onSelesai={() => {
            setKonfirmasiFor(null)
            void refetchPribadi()
          }}
        />
      )}
    </div>
  )
}