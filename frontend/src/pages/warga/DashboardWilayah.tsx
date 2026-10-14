import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import { useAuth } from "@/context/AuthContext"
import { useFetch } from "@/hooks/useFetch"
import { detailSekolah, listSekolah } from "@/lib/api/sekolah"
import { detailKlaster, listKlaster } from "@/lib/api/klaster"
import type { KondisiSarana, SekolahDetail, SekolahList } from "@/lib/api/types"
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Filter, 
  ThumbsUp, 
  Shield, 
  Clock,
  Plus,
  Lock,
  Check
} from "lucide-react"

type ToneMatriks = "baik" | "minor" | "kritis" | "netral"

interface BarisMatriks {
  npsn: string
  nama: string
  jenjang: "SD" | "SMP" | "SMA" | "SMK"
  status_sekolah: string
  alamat: string
  ruangKelas: { label: string; tone: ToneMatriks }
  labIpa: { label: string; tone: ToneMatriks }
  perpus: { label: string; tone: ToneMatriks }
  sanitasi: { label: string; tone: ToneMatriks }
  status: "Sesuai" | "Selisih Minor" | "Mismatch Kritis" | "Tidak Tersedia"
}

interface DataSarpras {
  rows: BarisMatriks[]
  total: number
  detail: Record<string, SekolahDetail>
}

const TIER: Record<ToneMatriks, number> = { netral: 0, baik: 1, minor: 2, kritis: 3 }

const hitungSel = (
  sarana: KondisiSarana[] | null | undefined,
  namaRuang: string[],
): { label: string; tone: ToneMatriks } => {
  const cocok = (sarana ?? []).filter((s) => namaRuang.includes(s.nama_ruang))
  if (cocok.length === 0) return { label: "—", tone: "netral" }
  const jumlah = cocok.reduce((a, s) => a + s.jumlah, 0)
  const berat = cocok.reduce((a, s) => a + s.kondisi_rusak_berat, 0)
  const sedang = cocok.reduce((a, s) => a + s.kondisi_rusak_sedang, 0)
  const ringan = cocok.reduce((a, s) => a + s.kondisi_rusak_ringan, 0)
  const tone: ToneMatriks =
    berat > 0 ? "kritis" : sedang > 0 || ringan > 0 ? "minor" : "baik"
  return { label: String(jumlah), tone }
}

const bangunBaris = (s: SekolahList, detail: SekolahDetail | null): BarisMatriks => {
  const sarana = detail?.kondisi_sarana ?? null
  const ruangKelas = hitungSel(sarana, ["ruang_kelas"])
  const labIpa = hitungSel(sarana, ["lab_ipa"])
  const perpus = hitungSel(sarana, ["perpustakaan"])
  const sanitasi = hitungSel(sarana, ["wc_siswa", "wc_guru"])
  const sel = [ruangKelas, labIpa, perpus, sanitasi]
  const status: BarisMatriks["status"] =
    sarana === null && !detail
      ? "Tidak Tersedia"
      : sel.reduce((worst, c) => Math.max(worst, TIER[c.tone]), 0) >= TIER.kritis
        ? "Mismatch Kritis"
        : sel.some((c) => c.tone === "minor")
          ? "Selisih Minor"
          : "Sesuai"
  return {
    npsn: s.npsn,
    nama: s.nama,
    jenjang: s.jenjang as BarisMatriks["jenjang"],
    status_sekolah: s.status_sekolah ?? "—",
    alamat: s.alamat,
    ruangKelas,
    labIpa,
    perpus,
    sanitasi,
    status,
  }
}

const TONE_SEL: Record<Exclude<ToneMatriks, "netral">, string> = {
  baik: "bg-emerald-50 font-bold text-emerald-700 border border-emerald-200/60",
  minor: "bg-amber-50 font-bold text-amber-800 border border-amber-200/60",
  kritis: "bg-rose-50 font-bold text-rose-700 border border-rose-200/60",
}

const STATUS_SEL: Record<BarisMatriks["status"], string> = {
  Sesuai: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Selisih Minor": "bg-amber-50 text-amber-800 border-amber-200",
  "Mismatch Kritis": "bg-rose-50 text-rose-800 border-rose-200",
  "Tidak Tersedia": "bg-slate-100 text-slate-500 border-slate-200",
}

const OPSI_JENJANG = ["Semua", "SD", "SMP", "SMA", "SMK"] as const
const BARIS_PER_HALAMAN = 10

const LABEL_STATUS_VERIFIKASI: Record<string, string> = {
  menunggu_verifikasi: "Menunggu Verifikasi",
  terverifikasi: "Terverifikasi Dinas",
  perlu_info_tambahan: "Perlu Info Tambahan",
  tidak_terverifikasi: "Tidak Terverifikasi",
}

const LABEL_KONDISI_DILAPORKAN: Record<string, string> = {
  baik: "Kondisi Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_sedang: "Rusak Sedang",
  rusak_berat: "Rusak Berat",
  rusak_total: "Rusak Total",
}

const PIN_JENJANG: Record<string, string> = {
  SD: "bg-rose-600",
  SMP: "bg-blue-600",
  SMA: "bg-amber-600",
  SMK: "bg-emerald-600",
}

interface KlasterIsuRow {
  id: string
  kode: string
  judul: string
  wargaTerverifikasi: number
  keterangan: string
  sekolah: string
  kategori: string
  kategoriBadgeCls: string
  tanggal: string
  urgensi: string
  urgensiBadgeCls: string
  urgensiDotCls: string
}

const KLASTER_ISU_LIST: KlasterIsuRow[] = [
  {
    id: "ISU-064",
    kode: "#ISU-064",
    judul: "Kerusakan Atap Lab Kimia",
    wargaTerverifikasi: 38,
    keterangan: "4 Foto Bukti",
    sekolah: "SMAN 1 Sukodadi",
    kategori: "Laboratorium & Praktikum",
    kategoriBadgeCls: "bg-blue-50 text-blue-800 border-blue-200/60",
    tanggal: "23 Okt 2025",
    urgensi: "Kritis / Mendesak",
    urgensiBadgeCls: "bg-rose-50 text-rose-800 border-rose-200",
    urgensiDotCls: "bg-rose-600",
  },
  {
    id: "ISU-051",
    kode: "#ISU-051",
    judul: "Pompa Sanitasi Toilet Siswa Macet",
    wargaTerverifikasi: 14,
    keterangan: "2 Foto Bukti",
    sekolah: "SMPN 2 Lamongan",
    kategori: "Sanitasi & Air Bersih",
    kategoriBadgeCls: "bg-slate-100 text-slate-700 border-slate-200/60",
    tanggal: "21 Okt 2025",
    urgensi: "Perhatian Sedang",
    urgensiBadgeCls: "bg-amber-50 text-amber-800 border-amber-200",
    urgensiDotCls: "bg-amber-600",
  },
  {
    id: "ISU-039",
    kode: "#ISU-039",
    judul: "Kekurangan Meja Kursi Ruang Teori",
    wargaTerverifikasi: 22,
    keterangan: "Berita Acara Dinas",
    sekolah: "SMKN 1 Lamongan",
    kategori: "Mubeler & Kelas",
    kategoriBadgeCls: "bg-blue-50 text-blue-800 border-blue-200/60",
    tanggal: "18 Okt 2025",
    urgensi: "Perhatian Sedang",
    urgensiBadgeCls: "bg-amber-50 text-amber-800 border-amber-200",
    urgensiDotCls: "bg-amber-600",
  },
  {
    id: "ISU-019",
    kode: "#ISU-019",
    judul: "Verifikasi Peremajaan Rak Perpustakaan",
    wargaTerverifikasi: 9,
    keterangan: "Laporan Tuntas Realisasi",
    sekolah: "SMPN 1 Lamongan",
    kategori: "Fasilitas Literasi",
    kategoriBadgeCls: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    tanggal: "15 Okt 2025",
    urgensi: "Selesai Fisik",
    urgensiBadgeCls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    urgensiDotCls: "bg-emerald-600",
  },
]

export default function DashboardWilayah() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false)
  const [selectedSchoolForReport, setSelectedSchoolForReport] = useState<{ npsn: string; nama: string } | null>(null)
  const [filterJenjang, setFilterJenjang] = useState<string>("Semua")
  const [halaman, setHalaman] = useState(1)
  const [votedIsu, setVotedIsu] = useState<Record<string, boolean>>({})
  const [isuVoteCounts, setIsuVoteCounts] = useState<Record<string, number>>(() => ({
    "ISU-064": 38,
    "ISU-051": 14,
    "ISU-039": 22,
    "ISU-019": 9,
  }))

  const { state: sarprasState, refetch: refetchSarpras } = useFetch<DataSarpras>(async () => {
    const page = await listSekolah({ page: 1, page_size: 100 })
    const detailList = await Promise.all(
      page.data.map((s) => detailSekolah(s.npsn).catch(() => null)),
    )
    const detail: Record<string, SekolahDetail> = {}
    const rows = page.data.map((s, i) => {
      const d = detailList[i]
      if (d) detail[s.npsn] = d
      return bangunBaris(s, d)
    })
    return { rows, total: page.meta.total_items, detail }
  }, [])

  const { state: klasterState, refetch: refetchKlaster } = useFetch(
    () => listKlaster({ page: 1, page_size: 100 }),
    [],
  )

  const klasterList =
    klasterState.status === "success" ? klasterState.data.data : []
  const klasterMeta =
    klasterState.status === "success" ? klasterState.data.meta : null
  const top = klasterList[0]

  const { state: topDetailState } = useFetch(
    () => (top ? detailKlaster(top.klaster_id) : Promise.resolve(null)),
    [top?.klaster_id],
  )

  const sarpras = sarprasState.status === "success" ? sarprasState.data : null
  const rows = sarpras?.rows ?? []
  const detailMap = sarpras?.detail ?? {}
  const totalSekolah = sarpras?.total ?? 0

  const jumlahKritis = rows.filter((r) => r.status === "Mismatch Kritis").length
  const jumlahMinor = rows.filter((r) => r.status === "Selisih Minor").length
  const jumlahPerhatian = jumlahKritis + jumlahMinor
  const totalKlaster = klasterMeta?.total_items ?? 0
  const klasterSelesai = klasterList.filter(
    (k) => k.status_penanganan === "selesai",
  ).length
  const persenSelesai =
    totalKlaster > 0 ? Math.round((klasterSelesai / totalKlaster) * 100) : 0

  const sebaranJenjang = ["SD", "SMP", "SMA", "SMK"].map((j) => ({
    jenjang: j,
    jumlah: rows.filter((r) => r.jenjang === j).length,
  }))

  const sekolahTop = top ? rows.find((r) => r.npsn === top.sekolah_npsn) : undefined
  const ringkasanTop = top ? detailMap[top.sekolah_npsn]?.ringkasan_sarpras : undefined
  const topDetail = topDetailState.status === "success" ? topDetailState.data : null
  const fakta = topDetail?.laporan?.[0]

  const handleVoteIsu = (isuId: string) => {
    if (!isAuthenticated) {
      setSelectedSchoolForReport(null)
      setIsAuthRequiredOpen(true)
      return
    }

    setVotedIsu((prev) => {
      const isCurrentlyVoted = !!prev[isuId]
      const nextVoted = !isCurrentlyVoted
      setIsuVoteCounts((counts) => ({
        ...counts,
        [isuId]: (counts[isuId] ?? 0) + (nextVoted ? 1 : -1),
      }))
      return { ...prev, [isuId]: nextVoted }
    })
  }

  const filteredRows =
    filterJenjang === "Semua"
      ? rows
      : rows.filter((r) => r.jenjang === filterJenjang)

  const totalHalaman = Math.max(1, Math.ceil(filteredRows.length / BARIS_PER_HALAMAN))
  const halamanAktif = Math.min(halaman, totalHalaman)
  const barisTampil = filteredRows.slice(
    (halamanAktif - 1) * BARIS_PER_HALAMAN,
    halamanAktif * BARIS_PER_HALAMAN,
  )
  const nomorAwal = filteredRows.length === 0 ? 0 : (halamanAktif - 1) * BARIS_PER_HALAMAN + 1
  const nomorAkhir = Math.min(halamanAktif * BARIS_PER_HALAMAN, filteredRows.length)

  const renderSel = (cell: { label: string; tone: ToneMatriks }) =>
    cell.tone === "netral" ? (
      <span className="text-slate-400">{cell.label}</span>
    ) : (
      <span className={`inline-block rounded px-2 py-0.5 text-sm ${TONE_SEL[cell.tone]}`}>{cell.label}</span>
    )

  // Ekspor CSV dari baris matriks hasil filter jenjang (tampilan yang terlihat)
  const handleUnduhCsv = () => {
    const headers = [
      "NPSN",
      "Nama Sekolah",
      "Jenjang",
      "Ruang Kelas",
      "Lab IPA/Kimia",
      "Perpustakaan",
      "Sanitasi/Toilet",
      "Status Integritas",
    ]
    const rows = filteredRows.map((r) => [
      `"${r.npsn}"`,
      `"${r.nama}"`,
      `"${r.jenjang}"`,
      `"${r.ruangKelas.label}"`,
      `"${r.labIpa.label}"`,
      `"${r.perpus.label}"`,
      `"${r.sanitasi.label}"`,
      `"${r.status}"`,
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    const saringan = filterJenjang !== "Semua" ? `${filterJenjang.toLowerCase()}_` : ""
    link.setAttribute(
      "download",
      `matriks_integritas_sarpras_${saringan}${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReportClick = (school?: { npsn: string; nama: string }) => {
    if (!isAuthenticated) {
      if (school) {
        setSelectedSchoolForReport(school)
      } else {
        setSelectedSchoolForReport(null)
      }
      setIsAuthRequiredOpen(true)
    } else {
      if (school) {
        navigate(`/laporan/baru?sekolah=${school.npsn}`)
      } else {
        navigate("/sekolah")
      }
    }
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Status Bar ── */}
      <div className="border-b border-slate-200/80 bg-white py-2.5 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 tracking-wider uppercase text-[11px]">PORTAL RESMI AUDIT DAPODIK</span>
            <span className="text-slate-300">|</span>
            <span>Kecamatan Lamongan — Semester Genap TA 2025/2026</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Sinkronisasi Terakhir: <strong className="text-slate-700">24 Okt 2025, 08:30 WIB</strong></span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80 ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        {/* ── Welcome Banner ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 p-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200/60 mb-4">
              <Shield className="h-3.5 w-3.5 text-[#0B3052]" />
              <span>PEDOMAN VERIFIKASI PARTISIPATIF SARPRAS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Selamat Datang di Portal Audit Partisipatif Sarana Sekolah Kec. Lamongan
            </h1>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              Periksa data resmi sarana sekolah, verifikasi fakta di lapangan, dan laporkan ketidaksesuaian secara objektif demi transparansi serta pemerataan mutu pendidikan negeri.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleReportClick()}
                  className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-5 py-2.5 h-auto text-sm rounded-lg shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Mulai Laporkan Temuan
                </Button>
                <Button asChild variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-semibold px-5 py-2.5 h-auto text-sm rounded-lg shadow-sm cursor-pointer">
                  <Link to="/tentang">
                    Panduan Validasi
                  </Link>
                </Button>
              </div>

              {/* Status Autentikasi */}
              {isAuthenticated ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Masuk sebagai {user?.nama} (Terverifikasi)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Wajib masuk / daftar akun NIK untuk melapor
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Top 3 KPI Cards Row ── */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">CAKUPAN WILAYAH</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0B3052]">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
                {sarpras ? totalSekolah : "—"}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                <CheckCircle2 className="h-3.5 w-3.5" /> 100% Terdata & Tersinkronisasi
              </span>
              <p className="text-xs text-slate-500 mt-1">Data resmi Dapodikdasmen semester genap.</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">PERHATIAN AUDIT</span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {sarpras ? jumlahPerhatian : "—"}
                </span>
                <span className="text-lg font-bold text-slate-700">Sekolah</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              {sarpras ? (
                <>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                    {jumlahMinor} Selisih Minor
                  </span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
                    {jumlahKritis} Mismatch Kritis
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400">Memuat data audit…</span>
              )}
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">REALISASI LAPANGAN</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {klasterMeta ? totalKlaster : "—"}
                </span>
                <span className="text-lg font-bold text-slate-700">Isu</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Tindak Lanjut Selesai</span>
                <span>{klasterMeta ? `${persenSelesai}%` : "—"}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${persenSelesai}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Section Row 1: Table Matriks + Widgets ── */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column (Wide): Matriks Integritas */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Matriks Integritas Sarana Sekolah</h2>
                  <p className="text-xs text-slate-500 mt-1">Perbandingan ketersediaan dan kelaikan fasilitas Dapodik vs verifikasi faktual.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => handleReportClick()}
                    className="h-8 text-xs font-semibold text-white bg-[#0B3052] hover:bg-[#07213A] rounded-lg shadow-sm cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Laporkan Temuan
                  </Button>
                  <Select
                    value={filterJenjang}
                    onValueChange={(value) => {
                      setFilterJenjang(value)
                      setHalaman(1)
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filter jenjang sekolah"
                      className={`h-8 w-auto gap-2 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium shadow-sm whitespace-nowrap inline-flex items-center ${
                        filterJenjang !== "Semua"
                          ? "border-blue-300 bg-blue-50 text-[#0B3052]"
                          : "text-slate-700"
                      }`}
                    >
                      <Filter className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="whitespace-nowrap">
                        {filterJenjang === "Semua"
                          ? "Filter Jenjang"
                          : `Jenjang: ${filterJenjang}`}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {OPSI_JENJANG.map((j) => (
                        <SelectItem key={j} value={j} className="text-xs">
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnduhCsv}
                    className="h-8 text-xs font-medium text-slate-700 border-slate-200 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Unduh CSV
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      <th className="py-3 px-3">NAMA SEKOLAH</th>
                      <th className="py-3 px-3 text-center">RUANG KELAS</th>
                      <th className="py-3 px-3 text-center">LAB IPA/KIMIA</th>
                      <th className="py-3 px-3 text-center">PERPUSTAKAAN</th>
                      <th className="py-3 px-3 text-center">SANITASI/TOILET</th>
                      <th className="py-3 px-3 text-right">STATUS INTEGRITAS</th>
                      <th className="py-3 px-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sarprasState.status === "success" && filteredRows.length > 0 ? (
                      barisTampil.map((row) => (
                        <tr key={row.npsn} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3">
                            <Link
                              to={`/sekolah/${row.npsn}`}
                              className="font-bold text-slate-900 hover:text-[#0B3052] block"
                            >
                              {row.nama}
                            </Link>
                            <span className="text-[11px] text-slate-400">
                              NPSN: {row.npsn} · {row.status_sekolah}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">{renderSel(row.ruangKelas)}</td>
                          <td className="py-3.5 px-3 text-center">{renderSel(row.labIpa)}</td>
                          <td className="py-3.5 px-3 text-center">{renderSel(row.perpus)}</td>
                          <td className="py-3.5 px-3 text-center">{renderSel(row.sanitasi)}</td>
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_SEL[row.status]}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportClick({ npsn: row.npsn, nama: row.nama })}
                              className="h-7 px-2.5 text-[11px] font-bold text-[#0B3052] border-slate-200 hover:bg-blue-50 cursor-pointer"
                            >
                              Lapor
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : sarprasState.status === "error" ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center space-y-2">
                          <p className="text-xs text-rose-600 font-semibold">{sarprasState.message}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refetchSarpras}
                            className="text-xs text-slate-700 border-slate-200 cursor-pointer"
                          >
                            Coba Lagi
                          </Button>
                        </td>
                      </tr>
                    ) : sarprasState.status === "loading" ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                          Memuat data sarpras dari backend…
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                          Tidak ada sekolah dengan jenjang {filterJenjang}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalHalaman > 1 && (
                <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
                  <span>
                    Halaman {halamanAktif} dari {totalHalaman}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={halamanAktif <= 1}
                      onClick={() => setHalaman(halamanAktif - 1)}
                      className="h-8 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={halamanAktif >= totalHalaman}
                      onClick={() => setHalaman(halamanAktif + 1)}
                      className="h-8 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Keterangan:</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Sesuai</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Selisih Minor</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Mismatch Kritis</span>
                </div>
                <span>
                  Menampilkan {nomorAwal}–{nomorAkhir} dari {filteredRows.length} entitas terdaftar
                  {filterJenjang !== "Semua" ? ` · difilter jenjang ${filterJenjang}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Narrow): Widgets */}
          <div className="lg:col-span-4 space-y-6">
            {/* Widget 1: Temuan Kritis Teratas */}
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <span className="text-xs font-extrabold tracking-wider text-rose-700 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> TEMUAN KRITIS TERATAS
                </span>
                <span className="text-[11px] font-mono font-medium text-rose-500">
                  {top
                    ? `ID: #${top.klaster_id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
                    : "ID: —"}
                </span>
              </div>

              {klasterState.status === "error" ? (
                <div className="text-xs space-y-2">
                  <p className="text-rose-700 font-semibold">{klasterState.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refetchKlaster}
                    className="text-xs text-slate-700 border-slate-200 bg-white cursor-pointer"
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : !top ? (
                <p className="text-xs text-slate-500">
                  {klasterState.status === "loading"
                    ? "Memuat klaster prioritas…"
                    : "Belum ada klaster isu terprioritas saat ini."}
                </p>
              ) : (
                <>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {top.label?.trim() || "Isu Fasilitas Sekolah"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sekolahTop?.nama ?? top.sekolah_npsn}
                      {sekolahTop ? ` · ${sekolahTop.alamat}` : ""}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200/60 flex items-center justify-between">
                      <span className="text-slate-500">DATA DAPODIK</span>
                      <span className="font-semibold text-emerald-700">
                        {ringkasanTop
                          ? `${ringkasanTop.total_unit} Unit · ${ringkasanTop.total_baik} Kondisi Baik`
                          : "Belum tersedia"}
                      </span>
                    </div>
                    {fakta ? (
                      <div className="rounded-lg bg-rose-100/70 p-2.5 border border-rose-200/80">
                        <span className="font-bold text-rose-900 block mb-0.5">
                          FAKTA LAPANGAN:{" "}
                          {(fakta.kondisi_dilaporkan &&
                            LABEL_KONDISI_DILAPORKAN[fakta.kondisi_dilaporkan]) ||
                            fakta.kondisi_dilaporkan ||
                            "Laporan Warga"}
                        </span>
                        <p className="text-[#641E1E] leading-relaxed text-[11px]">{fakta.deskripsi}</p>
                      </div>
                    ) : topDetailState.status === "loading" ? (
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200/60">
                        <p className="text-slate-500 text-[11px]">Memuat rincian laporan…</p>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200/60">
                        <p className="text-slate-500 text-[11px]">
                          Belum ada laporan warga terkait isu ini.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span className="font-semibold flex items-center gap-1 text-slate-700">
                      <ThumbsUp className="h-3.5 w-3.5 text-blue-600" />{" "}
                      {top.jumlah_vote_terhitung} Warga Memvalidasi
                    </span>
                    <span className="text-slate-400">
                      Verifikasi:{" "}
                      {LABEL_STATUS_VERIFIKASI[top.status_verifikasi] ?? top.status_verifikasi}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button asChild className="w-full bg-[#0B3052] hover:bg-[#07213A] text-white font-medium text-xs h-9 rounded-lg cursor-pointer">
                      <Link to={`/klaster/${top.klaster_id}`} className="block text-center">
                        Periksa Berkas Temuan
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleReportClick({
                          npsn: top.sekolah_npsn,
                          nama: sekolahTop?.nama ?? top.sekolah_npsn,
                        })
                      }
                      className="w-full text-xs h-8 text-[#0B3052] border-blue-200 hover:bg-white font-semibold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Laporkan Temuan di Sekolah Ini
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Widget 2: Sebaran Wilayah Audit */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">SEBARAN WILAYAH AUDIT</span>
                <span className="text-xs text-slate-400">Kec. Lamongan</span>
              </div>

              {/* Map Graphic Mock */}
              <div className="relative h-36 rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden flex items-center justify-center">
                <div 
                  className="absolute inset-0 opacity-40 bg-cover bg-center" 
                  style={{ backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                
                {/* Pins */}
                <div className="relative z-10 flex items-center justify-around w-full px-4 text-center">
                  {sarpras ? (
                    sebaranJenjang
                      .filter((b) => b.jumlah > 0)
                      .map((b) => (
                        <div key={b.jenjang} className="flex flex-col items-center">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${
                              PIN_JENJANG[b.jenjang] ?? "bg-slate-600"
                            } text-white font-bold text-[10px] shadow-md`}
                          >
                            {b.jumlah}
                          </span>
                          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded mt-1">
                            {b.jenjang}
                          </span>
                        </div>
                      ))
                  ) : (
                    <span className="text-[11px] font-semibold text-white bg-slate-900/70 px-2 py-1 rounded">
                      {sarprasState.status === "error" ? "Data tidak tersedia" : "Memuat…"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Total Terpantau: <strong>{sarpras ? `${totalSekolah} Sekolah` : "—"}</strong></span>
                <span className="font-mono">Koordinat: 7.1206° S, 112.4158° E</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Section Row 2: Daftar Laporan Klaster Isu Terkini ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daftar Laporan Klaster Isu Terkini</h2>
              <p className="text-xs text-slate-500 mt-1">Arsip pengaduan fasilitas aktif dengan riwayat validasi masyarakat dan komite sekolah.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#0B3052] px-3.5 py-1.5 text-xs font-semibold text-white">Semua Klaster (4)</span>
                <span className="rounded-full bg-slate-100 hover:bg-slate-200/70 px-3.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer">Urgensi Tinggi</span>
                <span className="rounded-full bg-slate-100 hover:bg-slate-200/70 px-3.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer">Terverifikasi</span>
              </div>
              <Button
                onClick={() => handleReportClick()}
                className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-sm cursor-pointer ml-auto"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Buat Aduan Baru
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="py-3 px-3">KODE &amp; RINCIAN FASILITAS</th>
                  <th className="py-3 px-3">ENTITAS SEKOLAH</th>
                  <th className="py-3 px-3">KLASTER ISU</th>
                  <th className="py-3 px-3">TANGGAL VERIFIKASI</th>
                  <th className="py-3 px-3">TINGKAT URGENSI</th>
                  <th className="py-3 px-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {KLASTER_ISU_LIST.map((item) => {
                  const isVoted = !!votedIsu[item.id]
                  const voteCount = isuVoteCounts[item.id] ?? item.wargaTerverifikasi

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-3">
                        <Link
                          to="/laporan/riwayat"
                          className="font-bold text-slate-900 text-sm block hover:text-[#0B3052] hover:underline transition-colors"
                        >
                          {item.kode} {item.judul}
                        </Link>
                        <span className="text-[11px] text-slate-400">
                          {voteCount} Warga {item.id === "ISU-019" ? "" : "Terverifikasi"} · {item.keterangan}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-semibold text-slate-800">{item.sekolah}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold border ${item.kategoriBadgeCls}`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-slate-500 font-medium">{item.tanggal}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${item.urgensiBadgeCls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${item.urgensiDotCls}`} /> {item.urgensi}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleVoteIsu(item.id)}
                          title={isVoted ? "Klik untuk membatalkan vote" : "Beri vote dukungan untuk isu ini"}
                          className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center justify-center ${
                            isVoted
                              ? "bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-500/30"
                              : "bg-[#0B3052] hover:bg-[#07213A] active:scale-95 text-white"
                          }`}
                        >
                          {isVoted ? (
                            <>
                              <Check className="h-3 w-3 mr-1" /> Vote
                            </>
                          ) : (
                            "Vote"
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>Menampilkan 1–4 dari 42 arsip tindak lanjut</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled className="h-8 text-xs text-slate-400 border-slate-200">Sebelumnya</Button>
              <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#0B3052] font-bold text-white">1</span>
              <span className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">2</span>
              <span className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">3</span>
              <Button variant="outline" size="sm" className="h-8 text-xs text-slate-700 border-slate-200 hover:bg-slate-50">Berikutnya</Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Wajib Autentikasi jika Belum Login ── */}
      <AuthRequiredModal
        open={isAuthRequiredOpen}
        onOpenChange={setIsAuthRequiredOpen}
        redirectUrl={
          selectedSchoolForReport
            ? `/laporan/baru?sekolah=${selectedSchoolForReport.npsn}`
            : "/laporan/baru"
        }
        schoolName={selectedSchoolForReport?.nama}
      />
    </div>
  )
}
