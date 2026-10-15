import { Link } from "react-router-dom"
import { AlertTriangle, ArrowRight, BarChart2, Download, ShieldCheck, TrendingDown, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HorizontalBarChart } from "@/components/charts"
import { useFetch } from "@/hooks/useFetch"
import { getSkorKbm } from "@/lib/api/laporan"
import type { DistribusiKondisi, LevelKbm } from "@/lib/api/types"

const PERIODE = "Data per Oktober 2026"

const LEVEL_BADGE: Record<LevelKbm, { label: string; color: string }> = {
  kritis: { label: "KRITIS", color: "bg-rose-600" },
  tinggi: { label: "TINGGI", color: "bg-amber-500" },
  sedang: { label: "SEDANG", color: "bg-blue-500" },
  rendah: { label: "RENDAH", color: "bg-slate-400" },
}

const SKOR_HEX = (skor: number): string =>
  skor >= 70 ? "#DC2626" : skor >= 50 ? "#F59E0B" : skor >= 40 ? "#3B82F6" : "#94A3B8"

const LABEL_RUANG: Record<string, string> = {
  ruang_kelas: "Ruang Kelas",
  wc_siswa: "WC Siswa",
  wc_guru: "WC Guru",
  uks: "UKS",
  perpustakaan: "Perpustakaan",
  lab_ipa: "Lab IPA",
  lab_komputer: "Lab Komputer",
}

const URUTAN_KONDISI: (keyof DistribusiKondisi)[] = [
  "baik",
  "rusak_ringan",
  "rusak_sedang",
  "rusak_berat",
]

const LABEL_KONDISI: Record<keyof DistribusiKondisi, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_sedang: "Rusak Sedang",
  rusak_berat: "Rusak Berat",
}

export default function LaporanSkorKbm() {
  const { state, refetch } = useFetch(getSkorKbm)

  const memuat = state.status === "loading"
  const gagal = state.status === "error" ? state : null
  const ringkasan = state.status === "success" ? state.data.ringkasan : null
  const daftarSekolah = state.status === "success" ? state.data.sekolah : []
  const sepuluhTeratas = daftarSekolah.slice(0, 10)

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
          <span className="h-9 inline-flex items-center text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg px-3 shadow-sm">
            {PERIODE}
          </span>
          <Button variant="outline" className="h-9 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Unduh PDF
          </Button>
        </div>
      </div>

      {/* State: loading / error */}
      {memuat && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">Memuat skor KBM…</p>
        </div>
      )}

      {!memuat && gagal && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm py-16 px-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Skor KBM tidak dapat dimuat</p>
          <p className="text-xs text-slate-600">{gagal.message}</p>
          <p className="text-[11px] text-slate-500">
            Pastikan backend berjalan di <span className="font-mono">http://localhost:8000</span> (dari root repo:{" "}
            <span className="font-mono">npm run dev</span>).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="h-8 text-xs font-semibold text-slate-700 border-slate-200"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Coba Lagi
          </Button>
        </div>
      )}

      {ringkasan && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm space-y-3">
              <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-rose-700">{ringkasan.rata_rata_skor}</div>
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
                <div className="text-3xl font-extrabold text-slate-900">{ringkasan.sekolah_kritis}</div>
                <p className="text-xs text-slate-500 mt-0.5">Sekolah skor &ge; 70 (Kritis)</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">{ringkasan.ruang_rusak_berat.toLocaleString("id-ID")}</div>
                <p className="text-xs text-slate-500 mt-0.5">Ruang rusak berat (Dapodik)</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
              <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">{ringkasan.total_laporan.toLocaleString("id-ID")}</div>
                <p className="text-xs text-slate-500 mt-0.5">Total laporan warga</p>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left: Bar Chart Skor per Sekolah (10 teratas) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Skor Dampak KBM per Sekolah</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Nilai 0–100: makin tinggi, gangguan KBM makin berat · 10 teratas</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {PERIODE}
                </span>
              </div>

              <div className="pt-1">
                <HorizontalBarChart
                  data={sepuluhTeratas.map((item) => ({
                    nama: item.nama,
                    nilai: item.skor_kbm,
                    color: SKOR_HEX(item.skor_kbm),
                  }))}
                  height={300}
                  unit="skor"
                />
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-rose-600" /> ≥70 Kritis</span>
                <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-amber-500" /> 50–69 Tinggi</span>
                <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-blue-500" /> 40–49 Sedang</span>
                <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-slate-400" /> &lt;40 Rendah</span>
              </div>
            </div>

            {/* Right: Rusak Berat per Jenis Fasilitas */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Rusak Berat per Jenis Fasilitas</h2>
                <p className="text-xs text-slate-400 mt-0.5">Jumlah ruang bergolong rusak berat per jenis (Dapodik)</p>
              </div>

              <div className="mt-4">
                <HorizontalBarChart
                  data={ringkasan.dampak_per_jenis_ruang.map((item) => ({
                    nama: LABEL_RUANG[item.nama_ruang] ?? item.nama_ruang,
                    nilai: item.rusak_berat,
                    subLabel: `${item.jumlah} ruang`,
                  }))}
                  height={220}
                  unit="ruang"
                  showValueLabels={true}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <p>Total {ringkasan.ruang_rusak_berat} ruang rusak berat dari seluruh sekolah. Sumber: data kondisi sarpras Dapodik.</p>
              </div>
            </div>
          </div>

          {/* Distribusi Kondisi Laporan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Distribusi Kondisi Laporan</h2>
              <p className="text-xs text-slate-400 mt-0.5">{ringkasan.total_laporan} laporan warga per kategori kondisi yang dilaporkan</p>
            </div>

            <div className="pt-2">
              <HorizontalBarChart
                data={URUTAN_KONDISI.map((k) => ({
                  nama: LABEL_KONDISI[k],
                  nilai: ringkasan.distribusi_kondisi[k],
                  subLabel: `${Math.round((ringkasan.distribusi_kondisi[k] / Math.max(ringkasan.total_laporan, 1)) * 100)}% laporan`,
                }))}
                height={180}
                unit="laporan"
                showValueLabels={true}
              />
            </div>
          </div>

          {/* Tabel Detail Sekolah */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Detail Skor Dampak KBM per Sekolah</h2>
              <span className="text-xs text-slate-400">Diurutkan: Skor Tertinggi · {daftarSekolah.length} sekolah</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-5">SEKOLAH / NPSN</th>
                    <th className="py-3 px-4">LEVEL DAMPAK</th>
                    <th className="py-3 px-4 text-center">SKOR KBM</th>
                    <th className="py-3 px-4 text-center">LAPORAN</th>
                    <th className="py-3 px-4 text-center">RUSAK BERAT</th>
                    <th className="py-3 px-4 text-right">RINCIAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daftarSekolah.map((row) => (
                    <tr key={row.npsn} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-900 block">{row.nama}</span>
                        <span className="font-mono text-[11px] text-slate-400">{row.npsn}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white ${LEVEL_BADGE[row.level].color}`}>
                          {LEVEL_BADGE[row.level].label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-black text-xs px-2.5 py-1 rounded ${row.skor_kbm >= 70 ? "bg-rose-100 text-rose-800" : row.skor_kbm >= 50 ? "bg-amber-100 text-amber-800" : row.skor_kbm >= 40 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                          {row.skor_kbm}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{row.jumlah_laporan}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">{row.laporan_rusak_berat}</td>
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
              <span>Skor KBM dihitung otomatis: <strong>70%</strong> rata-rata severity laporan warga + <strong>30%</strong> kondisi sarpras Dapodik, skala 0–100.</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 shrink-0">Rev: LAM-KBM-2026-08A · {PERIODE}</span>
          </div>
        </>
      )}
    </div>
  )
}
