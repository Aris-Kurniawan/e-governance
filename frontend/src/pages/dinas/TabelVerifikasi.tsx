import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  SlidersHorizontal,
  Search,
  XCircle,
  ArrowUpDown,
  ChevronDown,
  Download,
  Eye,
  Building2,
  ArrowRight,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const tabelRows = [
  { id: "tv-001", npsn: "20506255", sekolah: "SMAN 1 Sukodadi", jenjang: "SMA", kecamatan: "Kec. Sukodadi", fasilitas: "Lab Kimia Utama", kategori: "Sarpras Kritis", skorPrioritas: 82, statusVerifikasi: "Mismatch" as const, dapodikKondisi: "Baik", faktaKondisi: "Rusak Berat", tanggalVerifikasi: "12 Agu 2026", verifikator: "Bambang H., S.T.", laporanCount: 8, tiketId: "kls-001", nomorTiket: "KLS-2026-0891" },
  { id: "tv-002", npsn: "20506300", sekolah: "SMKN 1 Lamongan", jenjang: "SMK", kecamatan: "Kec. Lamongan", fasilitas: "Bengkel Otomotif", kategori: "Kelistrikan Bengkel", skorPrioritas: 74, statusVerifikasi: "Kejadian Baru" as const, dapodikKondisi: "Baik", faktaKondisi: "Korsleting Berat", tanggalVerifikasi: "12 Agu 2026", verifikator: "Bambang H., S.T.", laporanCount: 14, tiketId: "kls-002", nomorTiket: "KLS-2026-0887" },
  { id: "tv-003", npsn: "20506198", sekolah: "SMPN 2 Lamongan", jenjang: "SMP", kecamatan: "Kec. Deket", fasilitas: "Sanitasi Blok B", kategori: "Sanitasi & Air Bersih", skorPrioritas: 61, statusVerifikasi: "Mismatch" as const, dapodikKondisi: "Baik", faktaKondisi: "Mampet & Pipa Patah", tanggalVerifikasi: "11 Agu 2026", verifikator: "Siti Aminah, M.Pd.", laporanCount: 6, tiketId: "kls-003", nomorTiket: "KLS-2026-0882" },
  { id: "tv-004", npsn: "20506199", sekolah: "SDN 5 Turi", jenjang: "SD", kecamatan: "Kec. Turi", fasilitas: "Dinding R.Kelas 3B", kategori: "Struktur Gedung", skorPrioritas: 48, statusVerifikasi: "Menunggu" as const, dapodikKondisi: "Baik", faktaKondisi: "Retak Rambut", tanggalVerifikasi: "—", verifikator: "—", laporanCount: 4, tiketId: "kls-004", nomorTiket: "KLS-2026-0870" },
  { id: "tv-005", npsn: "20506303", sekolah: "SMPN 1 Lamongan", jenjang: "SMP", kecamatan: "Kec. Lamongan", fasilitas: "Sirkulasi Perpustakaan", kategori: "Kenyamanan Ruang", skorPrioritas: 35, statusVerifikasi: "Ditolak" as const, dapodikKondisi: "Baik", faktaKondisi: "Pengap & Lembap", tanggalVerifikasi: "10 Agu 2026", verifikator: "Bambang H., S.T.", laporanCount: 3, tiketId: "kls-005", nomorTiket: "KLS-2026-0865" },
  { id: "tv-006", npsn: "20506214", sekolah: "SMPN 1 Babat", jenjang: "SMP", kecamatan: "Kec. Babat", fasilitas: "Pagar & Gerbang Utama", kategori: "Keamanan Sekolah", skorPrioritas: 55, statusVerifikasi: "Mismatch" as const, dapodikKondisi: "Baik", faktaKondisi: "Miring & Berkarat", tanggalVerifikasi: "09 Agu 2026", verifikator: "Siti Aminah, M.Pd.", laporanCount: 5, tiketId: "", nomorTiket: "KLS-2026-0860" },
  { id: "tv-007", npsn: "20506288", sekolah: "SDN Sendangagung 1", jenjang: "SD", kecamatan: "Kec. Turi", fasilitas: "Toilet Siswa", kategori: "Sanitasi & Air Bersih", skorPrioritas: 42, statusVerifikasi: "Menunggu" as const, dapodikKondisi: "Rusak Sedang", faktaKondisi: "Tidak Berfungsi", tanggalVerifikasi: "—", verifikator: "—", laporanCount: 7, tiketId: "", nomorTiket: "KLS-2026-0858" },
  { id: "tv-008", npsn: "20506240", sekolah: "SMAS Muhammadiyah 1 Babat", jenjang: "SMA", kecamatan: "Kec. Babat", fasilitas: "Aula Serba Guna", kategori: "Sarpras Kritis", skorPrioritas: 67, statusVerifikasi: "Kejadian Baru" as const, dapodikKondisi: "Baik", faktaKondisi: "Atap Seng Bocor", tanggalVerifikasi: "08 Agu 2026", verifikator: "Ir. Hendro Kusumo", laporanCount: 9, tiketId: "", nomorTiket: "KLS-2026-0854" },
  { id: "tv-009", npsn: "20506312", sekolah: "SMPN 1 Paciran", jenjang: "SMP", kecamatan: "Kec. Paciran", fasilitas: "Lab IPA", kategori: "Sarpras Kritis", skorPrioritas: 38, statusVerifikasi: "Ditolak" as const, dapodikKondisi: "Baik", faktaKondisi: "Meja Praktikum Rusak", tanggalVerifikasi: "07 Agu 2026", verifikator: "Bambang H., S.T.", laporanCount: 2, tiketId: "", nomorTiket: "KLS-2026-0849" },
  { id: "tv-010", npsn: "20506177", sekolah: "SDN Moropelang", jenjang: "SD", kecamatan: "Kec. Tikung", fasilitas: "Ruang Guru", kategori: "Kenyamanan Ruang", skorPrioritas: 29, statusVerifikasi: "Menunggu" as const, dapodikKondisi: "Baik", faktaKondisi: "Plafon Menggantung", tanggalVerifikasi: "—", verifikator: "—", laporanCount: 2, tiketId: "", nomorTiket: "KLS-2026-0844" },
]

type StatusVerifikasi = "Mismatch" | "Kejadian Baru" | "Menunggu" | "Ditolak" | "Semua"
type SortKey = "skorPrioritas" | "laporanCount" | "sekolah"

const statusConfig = {
  "Mismatch": { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-600" },
  "Kejadian Baru": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-600" },
  "Menunggu": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  "Ditolak": { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" },
}

export default function TabelVerifikasi() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<StatusVerifikasi>("Semua")
  const [filterJenjang, setFilterJenjang] = useState("Semua")
  const [sortKey, setSortKey] = useState<SortKey>("skorPrioritas")
  const [sortAsc, setSortAsc] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev)
    else { setSortKey(key); setSortAsc(false) }
  }

  const filteredData = useMemo(() => {
    return tabelRows
      .filter((row) => {
        const q = searchQuery.toLowerCase()
        const matchSearch = !q || row.sekolah.toLowerCase().includes(q) || row.npsn.includes(q) || row.nomorTiket.toLowerCase().includes(q) || row.fasilitas.toLowerCase().includes(q)
        const matchStatus = filterStatus === "Semua" || row.statusVerifikasi === filterStatus
        const matchJenjang = filterJenjang === "Semua" || row.jenjang === filterJenjang
        return matchSearch && matchStatus && matchJenjang
      })
      .sort((a, b) => {
        const valA = a[sortKey]
        const valB = b[sortKey]
        if (typeof valA === "string" && typeof valB === "string") return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
      })
  }, [searchQuery, filterStatus, filterJenjang, sortKey, sortAsc])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const statusCounts = {
    Semua: tabelRows.length,
    Mismatch: tabelRows.filter((r) => r.statusVerifikasi === "Mismatch").length,
    "Kejadian Baru": tabelRows.filter((r) => r.statusVerifikasi === "Kejadian Baru").length,
    Menunggu: tabelRows.filter((r) => r.statusVerifikasi === "Menunggu").length,
    Ditolak: tabelRows.filter((r) => r.statusVerifikasi === "Ditolak").length,
  }

  const SortButton = ({ label, skey }: { label: string; skey: SortKey }) => (
    <button onClick={() => handleSort(skey)} className="flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === skey ? "text-[#0B3052]" : "text-slate-300"}`} />
    </button>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <SlidersHorizontal className="h-4 w-4 text-[#0B3052]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tabel Verifikasi Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Rekap Verifikasi Sarpras</h1>
          <p className="text-xs text-slate-500 mt-1">Kompilasi status verifikasi seluruh klaster isu sarpras — Kecamatan Lamongan & Sekitar · Semester Ganjil 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Ekspor CSV
          </Button>
          <Button className="h-9 text-xs font-semibold bg-[#0B3052] hover:bg-[#07213A] text-white flex items-center gap-1.5 cursor-pointer">
            <Filter className="h-3.5 w-3.5" /> Filter Lanjutan
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
        {(Object.keys(statusCounts) as StatusVerifikasi[]).map((status) => (
          <button
            key={status}
            onClick={() => { setFilterStatus(status); setCurrentPage(1) }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${filterStatus === status ? "bg-[#0B3052] text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            <span>{status}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterStatus === status ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            placeholder="Cari NPSN, nama sekolah, nomor tiket, fasilitas..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="relative">
          <select value={filterJenjang} onChange={(e) => { setFilterJenjang(e.target.value); setCurrentPage(1) }} className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none">
            <option>Semua</option>
            <option>SD</option>
            <option>SMP</option>
            <option>SMA</option>
            <option>SMK</option>
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">{filteredData.length} baris</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4"><SortButton label="SEKOLAH / NPSN" skey="sekolah" /></th>
                <th className="py-3.5 px-3">FASILITAS / KATEGORI</th>
                <th className="py-3.5 px-3">STATUS VERIFIKASI</th>
                <th className="py-3.5 px-3">KONDISI DAPODIK vs LAPANGAN</th>
                <th className="py-3.5 px-3 text-center"><SortButton label="SKOR" skey="skorPrioritas" /></th>
                <th className="py-3.5 px-3"><SortButton label="LAPORAN" skey="laporanCount" /></th>
                <th className="py-3.5 px-3">VERIFIKATOR</th>
                <th className="py-3.5 px-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row) => {
                const cfg = statusConfig[row.statusVerifikasi]
                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#0B3052] flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-snug">{row.sekolah}</span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono">{row.npsn}</span>
                            <span>·</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{row.jenjang}</span>
                            <span>·</span>
                            <span>{row.kecamatan}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-800 block">{row.fasilitas}</span>
                      <span className="text-[11px] text-slate-400">{row.kategori}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {row.statusVerifikasi}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">{row.nomorTiket}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-slate-600">Dapodik: <strong className="text-emerald-700">{row.dapodikKondisi}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <span className="text-slate-600">Lapangan: <strong className="text-rose-700">{row.faktaKondisi}</strong></span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center font-black text-xs rounded px-2.5 py-1 ${row.skorPrioritas >= 70 ? "bg-rose-100 text-rose-800" : row.skorPrioritas >= 40 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                        {row.skorPrioritas}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-slate-900 font-bold">{row.laporanCount}</div>
                      <div className="text-[11px] text-slate-400">warga</div>
                    </td>
                    <td className="py-3.5 px-3">
                      {row.verifikator !== "—" ? (
                        <div>
                          <span className="font-semibold text-slate-800 block truncate max-w-[120px]">{row.verifikator}</span>
                          <span className="text-[11px] text-slate-400">{row.tanggalVerifikasi}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 italic">Belum ditugaskan</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {row.tiketId ? (
                        <Link to={`/dinas/antrian?id=${row.tiketId}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline">
                          <Eye className="h-3.5 w-3.5" /> Tinjau
                        </Link>
                      ) : (
                        <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#0B3052] cursor-pointer">
                          <Eye className="h-3.5 w-3.5" /> Lihat
                        </button>
                      )}
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
            <p className="text-sm font-semibold text-slate-500">Tidak ada data yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        )}

        {filteredData.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}–{Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} entri</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed">
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`h-7 w-7 rounded-lg text-xs font-bold cursor-pointer transition-all ${currentPage === page ? "bg-[#0B3052] text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed">
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Isu Terdaftar", value: tabelRows.length, color: "text-slate-900", bg: "bg-white" },
          { label: "Mismatch Terverifikasi", value: statusCounts["Mismatch"], color: "text-rose-700", bg: "bg-rose-50" },
          { label: "Kejadian Baru", value: statusCounts["Kejadian Baru"], color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Menunggu Tindak Lanjut", value: statusCounts["Menunggu"], color: "text-amber-700", bg: "bg-amber-50" },
        ].map((item, idx) => (
          <div key={idx} className={`rounded-xl ${item.bg} border border-slate-200/80 p-4 flex items-center justify-between shadow-sm`}>
            <span className="text-xs font-semibold text-slate-500">{item.label}</span>
            <span className={`text-2xl font-extrabold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Link to="/dinas/antrian" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3052] hover:underline">
          Buka Antrian Validasi Lengkap <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
