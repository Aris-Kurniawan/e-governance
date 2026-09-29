import { useState } from "react"
import { Link } from "react-router-dom"
import { BarChart2, ArrowRight, TrendingDown, AlertTriangle, BookOpen, ChevronDown, Download, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaTrendChart, HorizontalBarChart } from "@/components/charts"

const skorKbmSekolah = [
  { sekolah: "SMAN 1 Sukodadi", npsn: "20506255", skorKbm: 78, efisiensiHilang: "4.2 jam/minggu", siswaImpak: 312, levelBadge: "KRITIS", levelColor: "bg-rose-600" },
  { sekolah: "SMKN 1 Lamongan", npsn: "20506300", skorKbm: 71, efisiensiHilang: "3.8 jam/minggu", siswaImpak: 280, levelBadge: "KRITIS", levelColor: "bg-rose-600" },
  { sekolah: "SMAS Muh. 1 Babat", npsn: "20506240", skorKbm: 64, efisiensiHilang: "2.9 jam/minggu", siswaImpak: 205, levelBadge: "TINGGI", levelColor: "bg-amber-500" },
  { sekolah: "SMPN 2 Lamongan", npsn: "20506198", skorKbm: 58, efisiensiHilang: "2.3 jam/minggu", siswaImpak: 178, levelBadge: "TINGGI", levelColor: "bg-amber-500" },
  { sekolah: "SMPN 1 Babat", npsn: "20506214", skorKbm: 51, efisiensiHilang: "1.8 jam/minggu", siswaImpak: 143, levelBadge: "SEDANG", levelColor: "bg-blue-500" },
  { sekolah: "SDN 5 Turi", npsn: "20506199", skorKbm: 44, efisiensiHilang: "1.4 jam/minggu", siswaImpak: 97, levelBadge: "SEDANG", levelColor: "bg-blue-500" },
  { sekolah: "SDN Sendangagung 1", npsn: "20506288", skorKbm: 38, efisiensiHilang: "1.1 jam/minggu", siswaImpak: 82, levelBadge: "RENDAH", levelColor: "bg-slate-400" },
  { sekolah: "SMPN 1 Lamongan", npsn: "20506303", skorKbm: 31, efisiensiHilang: "0.8 jam/minggu", siswaImpak: 61, levelBadge: "RENDAH", levelColor: "bg-slate-400" },
]

const dampakPerKategori = [
  { kategori: "Ruang Kelas Rusak", dampakSkor: 4.2, siswa: 640, fasilitas: "Kelas" },
  { kategori: "Lab Tidak Berfungsi", dampakSkor: 3.8, siswa: 592, fasilitas: "Lab" },
  { kategori: "Bengkel / Praktek", dampakSkor: 3.1, siswa: 425, fasilitas: "Bengkel" },
  { kategori: "Sanitasi Bermasalah", dampakSkor: 2.4, siswa: 340, fasilitas: "Toilet" },
  { kategori: "Ventilasi / Sirkulasi", dampakSkor: 1.6, siswa: 220, fasilitas: "Sirkulasi" },
]

const trenKbm = [
  { bulan: "Mar", skor: 28 },
  { bulan: "Apr", skor: 34 },
  { bulan: "Mei", skor: 41 },
  { bulan: "Jun", skor: 38 },
  { bulan: "Jul", skor: 52 },
  { bulan: "Agu", skor: 57 },
]

export default function LaporanSkorKbm() {  const [selectedPeriode, setSelectedPeriode] = useState("Semester Ganjil 2026")

  const totalSiswaImpak = skorKbmSekolah.reduce((a, b) => a + b.siswaImpak, 0)
  const rataRataSkor = Math.round(skorKbmSekolah.reduce((a, b) => a + b.skorKbm, 0) / skorKbmSekolah.length)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart2 className="h-4 w-4 text-[#0B3052]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analisis Dampak</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Laporan Skor Dampak KBM
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indeks kalkulasi penurunan efektivitas Kegiatan Belajar Mengajar (KBM) akibat kerusakan sarpras · Kecamatan Lamongan
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value)}
              className="h-9 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none shadow-sm"
            >
              <option>Semester Ganjil 2026</option>
              <option>Semester Genap 2025/2026</option>
              <option>Semester Ganjil 2025/2026</option>
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <Button variant="outline" className="h-9 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Unduh PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white">NAIK 12%</span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-rose-700">{rataRataSkor}</div>
            <p className="text-xs text-rose-800 font-medium mt-0.5">Rata-rata Skor Dampak KBM</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">KRITIS</span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">
              {skorKbmSekolah.filter((s) => s.skorKbm >= 70).length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Sekolah skor &gt; 70 (Kritis)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#0B3052] flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{totalSiswaImpak.toLocaleString("id-ID")}</div>
            <p className="text-xs text-slate-500 mt-0.5">Siswa terdampak gangguan KBM</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <BarChart2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">4.2</div>
            <p className="text-xs text-slate-500 mt-0.5">Jam KBM hilang / minggu (maks)</p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: Bar Chart Skor per Sekolah */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Skor Dampak KBM per Sekolah</h2>
              <p className="text-xs text-slate-400 mt-0.5">Nilai 0–100: makin tinggi, gangguan KBM makin berat</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {selectedPeriode}
            </span>
          </div>

          <div className="pt-1">
            <HorizontalBarChart
              data={skorKbmSekolah.map((item) => ({
                nama: item.sekolah,
                nilai: item.skorKbm,
                status: item.skorKbm >= 70 ? "kritis" : item.skorKbm >= 50 ? "sedang" : "rendah",
                color:
                  item.skorKbm >= 70
                    ? "#DC2626"
                    : item.skorKbm >= 50
                      ? "#F59E0B"
                      : item.skorKbm >= 40
                        ? "#3B82F6"
                        : "#94A3B8",
              }))}
              height={300}
              unit="skor"
            />
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-rose-600" /> &gt;70 Kritis</span>
            <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-amber-500" /> 50–70 Tinggi</span>
            <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-blue-500" /> 40–49 Sedang</span>
            <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-slate-400" /> &lt;40 Rendah</span>
          </div>
        </div>

        {/* Right: Dampak per Kategori Fasilitas */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Dampak per Kategori Fasilitas</h2>
            <p className="text-xs text-slate-400 mt-0.5">Kontribusi tiap jenis kerusakan terhadap penurunan KBM</p>
          </div>

          <div className="mt-4">
            <HorizontalBarChart
              data={dampakPerKategori.map((item) => ({
                nama: item.kategori,
                nilai: item.dampakSkor,
                subLabel: `${item.siswa} siswa`,
              }))}
              height={220}
              unit="skor"
              showValueLabels={true}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            <p>Skor dampak dihitung berdasarkan agregasi laporan warga, verifikasi lapangan, dan korelasi jadwal KBM aktif.</p>
          </div>
        </div>
      </div>

      {/* Tren Skor Rata-rata */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Tren Rata-rata Skor KBM Bulanan</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rentang 6 Bulan Terakhir — Maret s.d. Agustus 2026</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
            ▲ +29 poin dari periode awal
          </span>
        </div>

        {/* ECharts Area Trend Chart */}
        <div className="relative w-full pt-2">
          <AreaTrendChart
            data={trenKbm.map((t) => ({ bulan: t.bulan, nilai: t.skor }))}
            height={184}
            color="#DC2626"
          />
        </div>
      </div>

      {/* Tabel Detail Sekolah */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-sm">Detail Skor Dampak KBM per Sekolah</h2>
          <span className="text-xs text-slate-400">Diurutkan: Skor Tertinggi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-3 px-5">SEKOLAH / NPSN</th>
                <th className="py-3 px-4">LEVEL DAMPAK</th>
                <th className="py-3 px-4 text-center">SKOR KBM</th>
                <th className="py-3 px-4">JAM KBM HILANG</th>
                <th className="py-3 px-4 text-center">SISWA TERDAMPAK</th>
                <th className="py-3 px-4 text-right">RINCIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {skorKbmSekolah.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="font-bold text-slate-900 block">{row.sekolah}</span>
                    <span className="font-mono text-[11px] text-slate-400">{row.npsn}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white ${row.levelColor}`}>
                      {row.levelBadge}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`font-black text-xs px-2.5 py-1 rounded ${row.skorKbm >= 70 ? "bg-rose-100 text-rose-800" : row.skorKbm >= 50 ? "bg-amber-100 text-amber-800" : row.skorKbm >= 40 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                      {row.skorKbm}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.efisiensiHilang}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">{row.siswaImpak.toLocaleString("id-ID")}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to="/dinas/tabel" className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline">
                      Tabel <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Skor KBM dikalkulasi otomatis oleh engine <strong>SIMAKIS-AI v2</strong> menggunakan data laporan warga, inspeksi fisik, dan jadwal aktif KBM semester.</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400 shrink-0">Rev: LAM-KBM-2026-08A · {selectedPeriode}</span>
      </div>
    </div>
  )
}
