import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import { useAuth } from "@/context/AuthContext"
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
  Lock
} from "lucide-react"

type ToneMatriks = "baik" | "minor" | "kritis" | "netral"

interface BarisMatriks {
  npsn: string
  nama: string
  jenjang: "SD" | "SMP" | "SMA" | "SMK"
  ruangKelas: { label: string; tone: ToneMatriks }
  labIpa: { label: string; tone: ToneMatriks }
  perpus: { label: string; tone: ToneMatriks }
  sanitasi: { label: string; tone: ToneMatriks }
  status: "Sesuai" | "Selisih Minor" | "Mismatch Kritis"
}

// Data matriks integritas (mock UI-only) — 5 entitas percontohan dari 24 terdaftar
const matriksSekolah: BarisMatriks[] = [
  {
    npsn: "20506281",
    nama: "SMAN 1 Sukodadi",
    jenjang: "SMA",
    ruangKelas: { label: "18", tone: "baik" },
    labIpa: { label: "1", tone: "kritis" },
    perpus: { label: "1", tone: "baik" },
    sanitasi: { label: "8", tone: "baik" },
    status: "Mismatch Kritis",
  },
  {
    npsn: "20506304",
    nama: "SMPN 2 Lamongan",
    jenjang: "SMP",
    ruangKelas: { label: "24", tone: "baik" },
    labIpa: { label: "2", tone: "baik" },
    perpus: { label: "1", tone: "baik" },
    sanitasi: { label: "2", tone: "minor" },
    status: "Selisih Minor",
  },
  {
    npsn: "20506112",
    nama: "SDN 5 Turi",
    jenjang: "SD",
    ruangKelas: { label: "6", tone: "baik" },
    labIpa: { label: "—", tone: "netral" },
    perpus: { label: "1", tone: "baik" },
    sanitasi: { label: "3", tone: "baik" },
    status: "Sesuai",
  },
  {
    npsn: "20506450",
    nama: "SMKN 1 Lamongan",
    jenjang: "SMK",
    ruangKelas: { label: "1", tone: "minor" },
    labIpa: { label: "5", tone: "baik" },
    perpus: { label: "1", tone: "baik" },
    sanitasi: { label: "12", tone: "baik" },
    status: "Selisih Minor",
  },
  {
    npsn: "20506303",
    nama: "SMPN 1 Lamongan",
    jenjang: "SMP",
    ruangKelas: { label: "27", tone: "baik" },
    labIpa: { label: "3", tone: "baik" },
    perpus: { label: "1", tone: "baik" },
    sanitasi: { label: "10", tone: "baik" },
    status: "Sesuai",
  },
]

const TONE_SEL: Record<Exclude<ToneMatriks, "netral">, string> = {
  baik: "bg-emerald-50 font-bold text-emerald-700 border border-emerald-200/60",
  minor: "bg-amber-50 font-bold text-amber-800 border border-amber-200/60",
  kritis: "bg-rose-50 font-bold text-rose-700 border border-rose-200/60",
}

const STATUS_SEL: Record<BarisMatriks["status"], string> = {
  Sesuai: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Selisih Minor": "bg-amber-50 text-amber-800 border-amber-200",
  "Mismatch Kritis": "bg-rose-50 text-rose-800 border-rose-200",
}

const OPSI_JENJANG = ["Semua", "SD", "SMP", "SMA", "SMK"] as const

export default function DashboardWilayah() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false)
  const [selectedSchoolForReport, setSelectedSchoolForReport] = useState<{ npsn: string; nama: string } | null>(null)
  const [filterJenjang, setFilterJenjang] = useState<string>("Semua")

  const filteredRows =
    filterJenjang === "Semua"
      ? matriksSekolah
      : matriksSekolah.filter((r) => r.jenjang === filterJenjang)

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
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1">24</div>
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
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">6</span>
                <span className="text-lg font-bold text-slate-700">Sekolah</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                4 Selisih Minor
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
                2 Mismatch Kritis
              </span>
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
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">42</span>
                <span className="text-lg font-bold text-slate-700">Isu</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Tindak Lanjut Fisik</span>
                <span>87.5%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "87.5%" }} />
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
                  <Select value={filterJenjang} onValueChange={setFilterJenjang}>
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
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                          Tidak ada sekolah dengan jenjang {filterJenjang}.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr key={row.npsn} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3">
                            <Link
                              to={`/sekolah/${row.npsn}`}
                              className="font-bold text-slate-900 hover:text-[#0B3052] block"
                            >
                              {row.nama}
                            </Link>
                            <span className="text-[11px] text-slate-400">NPSN: {row.npsn} · Negeri</span>
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
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Keterangan:</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Sesuai</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Selisih Minor</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Mismatch Kritis</span>
                </div>
                <span>
                  Menampilkan {filteredRows.length} dari 24 entitas terdaftar
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
                <span className="text-[11px] font-mono font-medium text-rose-500">ID: #ISU-064</span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">Lab Kimia SMAN 1 Sukodadi</h3>
                <p className="text-xs text-slate-500 mt-0.5">Jl. Raya Sukodadi No. 42, Sukodadi, Lamongan</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-500">DATA DAPODIK</span>
                  <span className="font-semibold text-emerald-700">1 Unit · Kondisi Baik</span>
                </div>
                <div className="rounded-lg bg-rose-100/70 p-2.5 border border-rose-200/80">
                  <span className="font-bold text-rose-900 block mb-0.5">FAKTA LAPANGAN: Plafon Runtuh (Bocor)</span>
                  <p className="text-[#641E1E] leading-relaxed text-[11px]">
                    Atap ruang praktikum bocor parah menyebabkan 6 meja praktikum rusak &amp; bau zat menyengat saat hujan.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span className="font-semibold flex items-center gap-1 text-slate-700">
                  <ThumbsUp className="h-3.5 w-3.5 text-blue-600" /> 38 Warga Memvalidasi
                </span>
                <span className="text-slate-400">Verifikasi: Tim Komite</span>
              </div>

              <div className="space-y-2 pt-1">
                <Button asChild className="w-full bg-[#0B3052] hover:bg-[#07213A] text-white font-medium text-xs h-9 rounded-lg cursor-pointer">
                  <Link to="/laporan/riwayat" className="block text-center">
                    Periksa Berkas Temuan
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReportClick({ npsn: "20506281", nama: "SMAN 1 Sukodadi" })}
                  className="w-full text-xs h-8 text-[#0B3052] border-blue-200 hover:bg-white font-semibold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Laporkan Temuan di Sekolah Ini
                </Button>
              </div>
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
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-[10px] shadow-md">1</span>
                    <span className="text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded mt-1">Sukodadi</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px] shadow-md">12</span>
                    <span className="text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded mt-1">Kota</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-[10px] shadow-md">3</span>
                    <span className="text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded mt-1">Turi</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Zona Pengawasan: <strong>3 Sub-wilayah</strong></span>
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
                <span className="rounded-lg bg-[#0B3052] px-3 py-1.5 text-xs font-semibold text-white">Semua Klaster (4)</span>
                <span className="rounded-lg bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 text-xs font-medium text-slate-600 cursor-pointer">Urgensi Tinggi</span>
                <span className="rounded-lg bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 text-xs font-medium text-slate-600 cursor-pointer">Terverifikasi</span>
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
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-3">
                    <span className="font-bold text-slate-900 text-sm block">#ISU-064 Kerusakan Atap Lab Kimia</span>
                    <span className="text-[11px] text-slate-400">38 Warga Terverifikasi · 4 Foto Bukti</span>
                  </td>
                  <td className="py-4 px-3 font-semibold text-slate-800">SMAN 1 Sukodadi</td>
                  <td className="py-4 px-3">
                    <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200/60">
                      Laboratorium &amp; Praktikum
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-medium">23 Okt 2025</td>
                  <td className="py-4 px-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> Kritis / Mendesak
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <Link to="/laporan/riwayat">
                        Tinjau Isu
                      </Link>
                    </Button>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-3">
                    <span className="font-bold text-slate-900 text-sm block">#ISU-051 Pompa Sanitasi Toilet Siswa Macet</span>
                    <span className="text-[11px] text-slate-400">14 Warga Terverifikasi · 2 Foto Bukti</span>
                  </td>
                  <td className="py-4 px-3 font-semibold text-slate-800">SMPN 2 Lamongan</td>
                  <td className="py-4 px-3">
                    <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200/60">
                      Sanitasi &amp; Air Bersih
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-medium">21 Okt 2025</td>
                  <td className="py-4 px-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Perhatian Sedang
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <Link to="/laporan/riwayat">
                        Tinjau Isu
                      </Link>
                    </Button>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-3">
                    <span className="font-bold text-slate-900 text-sm block">#ISU-039 Kekurangan Meja Kursi Ruang Teori</span>
                    <span className="text-[11px] text-slate-400">22 Warga Terverifikasi · Berita Acara Dinas</span>
                  </td>
                  <td className="py-4 px-3 font-semibold text-slate-800">SMKN 1 Lamongan</td>
                  <td className="py-4 px-3">
                    <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200/60">
                      Mubeler &amp; Kelas
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-medium">18 Okt 2025</td>
                  <td className="py-4 px-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Perhatian Sedang
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <Link to="/laporan/riwayat">
                        Tinjau Isu
                      </Link>
                    </Button>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-3">
                    <span className="font-bold text-slate-900 text-sm block">#ISU-019 Verifikasi Peremajaan Rak Perpustakaan</span>
                    <span className="text-[11px] text-slate-400">9 Warga · Laporan Tuntas Realisasi</span>
                  </td>
                  <td className="py-4 px-3 font-semibold text-slate-800">SMPN 1 Lamongan</td>
                  <td className="py-4 px-3">
                    <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
                      Fasilitas Literasi
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-medium">15 Okt 2025</td>
                  <td className="py-4 px-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Selesai Fisik
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <Link to="/laporan/riwayat">
                        Tinjau Isu
                      </Link>
                    </Button>
                  </td>
                </tr>
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
