import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  RotateCcw, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { sekolahDirektoriList } from "@/mocks/sekolahDirektori"

export default function Direktori() {
  const [search, setSearch] = useState("")
  const [jenjang, setJenjang] = useState<string>("Semua")
  const [statusIntegritas, setStatusIntegritas] = useState<string>("Semua Status")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 6

  // Filter logika: nama, npsn, alamat, jenjang, dan integritas
  const filteredSekolah = useMemo(() => {
    return sekolahDirektoriList.filter((s) => {
      // Jenjang matching
      let matchJenjang = true
      if (jenjang === "SD/MI") {
        matchJenjang = s.jenjang === "SD" || s.jenjang === "MI"
      } else if (jenjang === "SMP/MTs") {
        matchJenjang = s.jenjang === "SMP" || s.jenjang === "MTs"
      } else if (jenjang === "SMA/SMK") {
        matchJenjang = s.jenjang === "SMA" || s.jenjang === "SMK"
      }

      // Status Integritas matching
      let matchStatus = true
      if (statusIntegritas !== "Semua Status") {
        matchStatus = s.status === statusIntegritas
      }

      // Search matching (nama, npsn, alamat)
      let matchSearch = true
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        matchSearch =
          s.nama.toLowerCase().includes(q) ||
          s.npsn.includes(q) ||
          s.alamat.toLowerCase().includes(q)
      }

      return matchJenjang && matchStatus && matchSearch
    })
  }, [search, jenjang, statusIntegritas])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handleJenjangChange = (j: string) => {
    setJenjang(j)
    setCurrentPage(1)
  }

  const handleStatusChange = (st: string) => {
    setStatusIntegritas(st)
    setCurrentPage(1)
  }

  const handleReset = () => {
    setSearch("")
    setJenjang("Semua")
    setStatusIntegritas("Semua Status")
    setCurrentPage(1)
  }

  // Hitungan statistik dinamis
  const kritisCount = useMemo(() => filteredSekolah.filter((s) => s.status === "Selisih Kritis").length, [filteredSekolah])
  const minorCount = useMemo(() => filteredSekolah.filter((s) => s.status === "Selisih Minor").length, [filteredSekolah])
  const sesuaiCount = useMemo(() => filteredSekolah.filter((s) => s.status === "Data Sesuai").length, [filteredSekolah])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSekolah.length / pageSize))
  const paginatedSekolah = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSekolah.slice(start, start + pageSize)
  }, [filteredSekolah, currentPage, pageSize])

  // Ekspor CSV dari sekolah hasil filter
  const handleExportCsv = () => {
    const headers = ["NPSN", "Nama Sekolah", "Jenjang", "Alamat", "Status Integritas", "Terakhir Audit"]
    const rows = filteredSekolah.map((s) => [
      `"${s.npsn}"`,
      `"${s.nama}"`,
      `"${s.jenjang}"`,
      `"${s.alamat}"`,
      `"${s.status}"`,
      `"${s.audit}"`
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `rekap_sekolah_lamongan_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Top Header Section ── */}
      <div className="border-b border-slate-200/80 bg-white py-6">
        <div className="mx-auto max-w-7xl px-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span>ARSIP DATA POKOK PENDIDIKAN · WILAYAH KERJA 07.24</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Direktori Sekolah Kecamatan Lamongan
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Menampilkan {filteredSekolah.length} lembaga pendidikan resmi terdaftar dalam pangkalan data Dapodik Kemendikdasmen wilayah Kec. Lamongan.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-2.5 shrink-0">
              <Clock className="h-4 w-4 text-slate-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px]">Sinkronisasi Terakhir</span>
                <span className="font-bold text-slate-800">24 Oktober 2026 — 08:30 WIB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-slate-600 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-3 font-medium">
              <span><strong>{filteredSekolah.length}</strong> Lembaga Ditampilkan</span>
              <span>·</span>
              <span className="text-rose-700 font-bold">{kritisCount} Selisih Kritis</span>
              <span>·</span>
              <span className="text-amber-700 font-bold">{minorCount} Selisih Minor</span>
              <span>·</span>
              <span className="text-emerald-700 font-bold">{sesuaiCount} Valid Sesuai</span>
            </div>
            <span className="font-mono text-slate-400 text-[11px]">KODE DISTRIK: 052401</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {/* ── Search & Filter Bar ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Cari nama sekolah atau NPSN..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-9 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0B3052]"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Jenjang */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium mr-1">Jenjang:</span>
              {["Semua", "SD/MI", "SMP/MTs", "SMA/SMK"].map((j) => (
                <button
                  key={j}
                  onClick={() => handleJenjangChange(j)}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    jenjang === j
                      ? "bg-[#0B3052] text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>

            {/* Select Integritas */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Integritas:</span>
              <select
                value={statusIntegritas}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer"
              >
                <option>Semua Status</option>
                <option>Selisih Kritis</option>
                <option>Selisih Minor</option>
                <option>Data Sesuai</option>
              </select>
            </div>

            {/* Reset */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-3 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* ── Main Layout (Grid Cards + Sidebar) ── */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Cards Grid (8 cols) */}
          <div className="lg:col-span-8">
            {paginatedSekolah.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {paginatedSekolah.map((school) => (
                  <div
                    key={school.npsn}
                    className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-slate-400">NPSN: {school.npsn}</span>
                        {school.status === "Selisih Kritis" && (
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> {school.statusBadge}
                          </span>
                        )}
                        {school.status === "Selisih Minor" && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> {school.statusBadge}
                          </span>
                        )}
                        {school.status === "Data Sesuai" && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {school.statusBadge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{school.nama}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">{school.jenjang}</span>
                          <span className="truncate">{school.alamat}</span>
                        </div>
                      </div>

                      <div className={`grid ${school.stats.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-2 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100`}>
                        {school.stats.map((st, i) => (
                          <div key={i}>
                            <span className="text-slate-400 block text-[10px]">{st.label}</span>
                            <span className={`font-bold ${st.valueClass || "text-slate-800"}`}>{st.val}</span>
                            <span className={`text-[10px] block ${st.descClass || "text-slate-400"}`}>{st.desc}</span>
                          </div>
                        ))}
                      </div>

                      <div className={`rounded-xl p-3 border text-xs ${
                        school.temuan.tipe === "kritis"
                          ? "bg-rose-50/70 border-rose-100"
                          : school.temuan.tipe === "minor"
                          ? "bg-blue-50/70 border-blue-100"
                          : "bg-emerald-50/70 border-emerald-100"
                      }`}>
                        <span className={`font-bold flex items-center gap-1 mb-1 ${
                          school.temuan.tipe === "kritis"
                            ? "text-rose-900"
                            : school.temuan.tipe === "minor"
                            ? "text-blue-900"
                            : "text-emerald-900"
                        }`}>
                          {school.temuan.tipe === "kritis" && <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                          {school.temuan.tipe === "minor" && <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                          {school.temuan.tipe === "sesuai" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                          {school.temuan.judul}:
                        </span>
                        <p className={`text-[11px] leading-relaxed ${
                          school.temuan.tipe === "kritis"
                            ? "text-[#641E1E]"
                            : school.temuan.tipe === "minor"
                            ? "text-blue-950"
                            : "text-emerald-950"
                        }`}>
                          {school.temuan.deskripsi}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-400">Audit: {school.audit}</span>
                      <Link to={`/sekolah/${school.npsn}`}>
                        <Button className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-sm cursor-pointer">
                          Lihat Data Baseline <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Tidak Ada Sekolah Ditemukan</h3>
                <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Tidak ditemukan data sekolah dengan kata kunci &quot;<span className="font-semibold text-slate-800">{search}</span>&quot;
                  {jenjang !== "Semua" ? ` pada jenjang ${jenjang}` : ""}
                  {statusIntegritas !== "Semua Status" ? ` dengan status ${statusIntegritas}` : ""}.
                </p>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="mt-5 rounded-lg text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Bersihkan Filter
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <div className="text-xs text-slate-500">
                  Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredSekolah.length)}</span> dari <span className="font-semibold text-slate-700">{filteredSekolah.length}</span> sekolah
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          currentPage === p
                            ? "bg-[#0B3052] text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Widgets (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Widget 1: Kepatuhan Audit Sarpras */}
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/30 p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0B3052]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Kepatuhan Audit Sarpras</h3>
                  <span className="text-[11px] text-slate-500">Standar Kemendikdasmen</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Direktori ini mengompilasi keselarasan antara laporan berkala operator Dapodik dengan hasil pantauan komite sekolah serta warga kecamatan terverifikasi NIK.
              </p>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1.5">
                  <span>Tingkat Kepatuhan Wilayah</span>
                  <span className="font-bold text-[#0B3052]">87.5%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0B3052]" style={{ width: "87.5%" }} />
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block">
                  21 dari 24 sekolah memiliki data sarana dan prasarana terverifikasi tanpa anomali.
                </span>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">DASAR REGULASI:</span>
                <p>Permendikbud No. 24/2007 (Standar Sarpras) &amp; UU PDP No. 27/2022.</p>
              </div>

              <Button
                onClick={handleExportCsv}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-xs h-9 rounded-lg shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Ekspor Rekap Wilayah (.CSV)
              </Button>
            </div>

            {/* Widget 2: Ingin Mengajukan Verifikasi? */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#0B3052]" />
                <h3 className="font-bold text-slate-900 text-sm">Ingin Mengajukan Verifikasi?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Warga terdaftar dapat mengunggah bukti pembanding foto kondisi fasilitas sekolah melalui modul Riwayat Laporan.
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer Hash Bar ── */}
        <div className="rounded-xl bg-slate-100/80 border border-slate-200/60 p-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Dikelola secara independen oleh Tim Penjaminan Mutu Partisipatif Kec. Lamongan
          </span>
          <span className="font-mono text-[11px] text-slate-400">DAPODIK-SYNC-HASH: 8F2A90DC71</span>
        </div>
      </div>
    </div>
  )
}