import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Briefcase,
  Gauge,
  AlertTriangle,
  Printer,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  MapPin
} from "lucide-react"
import {
  ringkasanKpiDinas,
  daftarKlasterDinas,
  trenBulananIsu,
  distribusiFasilitas,
  petaMismatchTitik
} from "@/mocks/dinasData"
import { MapContainer, SeverityMarker, MapLegend } from "@/components/map"
import { AreaTrendChart, HorizontalBarChart } from "@/components/charts"
import CetakRingkasanEksekutif from "@/components/composite/CetakRingkasanEksekutif"

export default function DashboardKadis() {
  const navigate = useNavigate()
  const [semester, setSemester] = useState("Semester Ganjil 2026 / Bandingkan Semester Sebelumnya")

  return (
    <>
    <div className="space-y-6 max-w-7xl mx-auto pb-10 print:hidden">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded bg-[#0B3052] text-white text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
              LAPORAN RESMI
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Kecamatan Lamongan</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Ringkasan Eksekutif Kecamatan Lamongan
          </h1>

          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
            <span>Sinkron Dapodik: <strong className="text-slate-700">{ringkasanKpiDinas.sinkronDapodik}</strong></span>
            <span>•</span>
            <span>Klaster terbaru diproses: <strong className="text-slate-700">{ringkasanKpiDinas.klasterTerbaru}</strong></span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-9 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer shadow-sm appearance-none"
            >
              <option>Semester Ganjil 2026 / Bandingkan Semester Sebelumnya</option>
              <option>Semester Genap 2025/2026</option>
              <option>Semester Ganjil 2025/2026</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button
            onClick={() => window.print()}
            className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Ringkasan</span>
          </Button>
        </div>
      </div>

      {/* ── Top 4 KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#0B3052] flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/70">
              Cakupan 100%
            </span>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {ringkasanKpiDinas.sekolahTerdaftar}
            </div>
            <p className="text-xs text-slate-500 mt-1">dari 24 sekolah terdaftar</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200/70">
              ▲ 3 dari bulan lalu
            </span>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {ringkasanKpiDinas.belumTuntas}
            </div>
            <p className="text-xs text-slate-500 mt-1">belum tuntas ditindaklanjuti</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Gauge className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200/80">
              ▼ 4 poin (membaik)
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {ringkasanKpiDinas.rataSkorPrioritas}
              </span>
              <span className="text-base font-bold text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Rata-rata Skor Prioritas</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              KRITIS SEGERA
            </span>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-rose-700 tracking-tight">
              {ringkasanKpiDinas.kritisSegera}
            </div>
            <p className="text-xs font-semibold text-rose-800 mt-1">Skor &gt;70 - Butuh tindakan segera</p>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Peta Sebaran + Isu Prioritas Tertinggi ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* Left (7 Cols): Peta Sebaran Kasus Mismatch Wilayah */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#0B3052]" />
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Peta Sebaran Kasus Mismatch Wilayah
                </h2>
              </div>
              <Link
                to="/dinas/peta"
                className="text-xs font-bold text-[#0B3052] hover:underline flex items-center gap-1"
              >
                <span>Lihat Peta Lengkap</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 py-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0B3052]" />
                Wilayah Pantauan: <strong>Lamongan Kota &amp; Sekitar</strong>
              </span>
              <span className="font-mono text-[11px] text-slate-400">Geo-Anchor: -7.1197, 112.4145</span>
            </div>

            {/* React-Leaflet Map (compact) */}
            <div className="relative h-64 rounded-xl overflow-hidden border border-slate-200/70 mt-2">
              <MapContainer
                center={[-7.1197, 112.4145]}
                zoom={12}
                className="w-full h-full"
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                {petaMismatchTitik.map((point) => (
                  <SeverityMarker
                    key={point.id}
                    id={point.id}
                    position={[point.lat, point.lng]}
                    sekolah={point.sekolah}
                    skor={point.skor}
                    status={point.status}
                    onClick={() => navigate(`/dinas/antrian?id=${point.id.replace("pin", "kls")}`)}
                  />
                ))}
                <MapLegend
                  position="bottomright"
                  title="AMBANG SKOR PRIORITAS"
                  totalPins={petaMismatchTitik.length}
                  clusterCount={3}
                />
              </MapContainer>
            </div>
          </div>

          {/* Legend & Clustering Footer */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 pt-3 text-xs border-t border-slate-100">
            {/* Baris 1: Ambang Skor Prioritas */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 whitespace-nowrap">
                AMBANG SKOR PRIORITAS:
              </span>
              <div className="flex items-center gap-2 sm:gap-2.5 text-xs whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
                  <span>&gt; 70 Kritis</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span>40–70 Sedang</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>&lt; 40 Rendah</span>
                </span>
              </div>
            </div>

            {/* Baris 2 (atau sisi kanan jika layar lebar): Info Klaster DBSCAN */}
            <div className="text-[11px] text-slate-500 whitespace-nowrap flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>
                Kerapatan klaster dideteksi otomatis via DBSCAN:{" "}
                <strong className="text-slate-800 font-bold">5 Klaster Signifikan</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right (5 Cols): Isu Prioritas Tertinggi */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Isu Prioritas Tertinggi
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                5 Teratas
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-2">SEKOLAH / NPSN</th>
                    <th className="py-2.5 px-2">RINGKASAN KLASTER</th>
                    <th className="py-2.5 px-2 text-center">SKOR</th>
                    <th className="py-2.5 px-2 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daftarKlasterDinas.slice(0, 5).map((klaster) => (
                    <tr key={klaster.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-2">
                        <span className="font-bold text-slate-900 block truncate max-w-[120px]">
                          {klaster.sekolah}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{klaster.npsn}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-slate-800 block truncate max-w-[130px]">
                          {klaster.judul.replace("Kerusakan ", "").replace("Kelistrikan ", "")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {klaster.tfidfTag}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${klaster.skor >= 70
                            ? "bg-rose-100 text-rose-800"
                            : klaster.skor >= 40
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                          {klaster.skor}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          to={`/dinas/antrian?id=${klaster.id}`}
                          className="inline-flex items-center text-xs font-bold text-[#0B3052] hover:underline"
                        >
                          Tinjau <ArrowRight className="h-3 w-3 ml-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Menampilkan 5 dari 12 tiket aktif</span>
            <Link
              to="/dinas/antrian"
              className="font-bold text-[#0B3052] hover:underline flex items-center gap-1"
            >
              <span>Buka Seluruh Antrian</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Tren Isu Baru per Bulan + Distribusi Jenis Fasilitas ── */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Left: Tren Isu Baru per Bulan */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Tren Isu Baru per Bulan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Rentang 6 Bulan Terakhir (Maret – Agustus 2026)</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0B3052] border border-blue-200/60 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0B3052]" />
                Total Terverifikasi
              </span>
            </div>

            {/* ECharts Area Trend Chart */}
            <div className="mt-4 pt-2">
              <AreaTrendChart
                data={trenBulananIsu.map((t) => ({ bulan: t.bulan, nilai: t.jumlah }))}
                height={176}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-600">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Kenaikan fluktuatif pasca verifikasi lapangan semester genap.
            </span>
            <span className="font-bold text-slate-800">Rata-rata: 10 isu / bln</span>
          </div>
        </div>

        {/* Right: Distribusi Jenis Fasilitas Bermasalah */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Distribusi Jenis Fasilitas Bermasalah
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Klasifikasi berdasarkan pelaporan kerusakan sarpras</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                20 Total Kasus
              </span>
            </div>

            {/* ECharts Horizontal Bar Chart */}
            <div className="mt-4">
              <HorizontalBarChart
                data={distribusiFasilitas.map((item) => ({
                  nama: item.nama,
                  nilai: item.jumlah,
                  subLabel: `${item.persen}%`,
                }))}
                height={190}
                unit="kasus"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Kategori ditentukan melalui agregasi tagging entri tiket Sarpras.</span>
            <Link
              to="/dinas/skor-kbm"
              className="font-bold text-[#0B3052] hover:underline flex items-center gap-1"
            >
              <span>Analisis Dampak KBM</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer Audit Verification Strip ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Dokumen audit resmi diverifikasi oleh <strong>Tim Verifikator Sarpras Disdik Lamongan</strong>.</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          ID Hash Validasi: #LAM-SARPRAS-2026-08A2
        </span>
      </div>
    </div>

    {/* Dokumen cetak murni data — hanya tampil saat print */}
    <div className="max-w-4xl mx-auto">
      <CetakRingkasanEksekutif semester={semester} />
    </div>
    </>
  )
}
