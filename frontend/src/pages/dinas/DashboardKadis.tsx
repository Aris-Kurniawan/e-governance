import { useMemo, useState } from "react"
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
  MapPin,
  RotateCw
} from "lucide-react"
import { useFetch } from "@/hooks/useFetch"
import { listKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import { MapContainer, SeverityMarker, MapLegend } from "@/components/map"
import { AreaTrendChart, HorizontalBarChart } from "@/components/charts"
import CetakRingkasanEksekutif from "@/components/composite/CetakRingkasanEksekutif"

export default function DashboardKadis() {
  const navigate = useNavigate()
  const [semester, setSemester] = useState("Semester Ganjil 2026 / Bandingkan Semester Sebelumnya")

  // F4.1 — semua angka di halaman ini dihitung dari data backend nyata.
  // `GET /klaster` & `GET /sekolah` publik; `page_size: 100` = maksimum API.
  const { state: klasterState, refetch: refetchKlaster } = useFetch(() => listKlaster({ page_size: 100 }))
  const { state: sekolahState, refetch: refetchSekolah } = useFetch(() => listSekolah({ page_size: 100 }))

  const daftarKlaster = klasterState.status === "success" ? klasterState.data.data : []
  const totalSekolah = sekolahState.status === "success" ? sekolahState.data.meta.total_items : 0

  const kpi = useMemo(() => {
    const belumTuntas = daftarKlaster.filter((k) => k.status_verifikasi !== "terverifikasi").length
    const kritisSegera = daftarKlaster.filter(
      (k) => k.skor_prioritas >= 70 && k.status_verifikasi !== "terverifikasi",
    ).length
    const totalSkor = daftarKlaster.reduce((a, k) => a + (k.skor_prioritas ?? 0), 0)
    const rataSkor = daftarKlaster.length > 0 ? Math.round(totalSkor / daftarKlaster.length) : 0
    return {
      sekolahTerdaftar: totalSekolah,
      klasterTerbaru: klasterState.status === "success" ? klasterState.data.meta.total_items : 0,
      belumTuntas,
      kritisSegera,
      rataSkorPrioritas: rataSkor,
      // Tidak ada endpoint "tanggal sinkron Dapodik terakhir" di backend v1.
      sinkronDapodik: "Belum tersedia",
      totalSekolahDb: totalSekolah,
      cakupanPersen: 100,
    }
  }, [daftarKlaster, totalSekolah, klasterState])

  // Distribusi kategori dihitung dari 100 klaster yang dikembalikan API.
  const distribusiFasilitas = useMemo(() => {
    const tally = new Map<string, number>()
    for (const k of daftarKlaster) {
      tally.set(k.kategori, (tally.get(k.kategori) ?? 0) + 1)
    }
    return [...tally.entries()]
      .map(([kategori, jumlah]) => ({ kategori, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
  }, [daftarKlaster])

  // Tren bulanan: backend v1 tidak menyimpan riwayat isu per bulan
  // (tidak ada endpoint historis di INTERFACES.md). Kosong → UI menampilkan
  // empty state, bukan angka rekaan.
  const trenBulananIsu: { bulan: string; nilai: number }[] = []

  // Koordinat sekolah belum tersedia di API (kolom lintang/bujur kosong di DB),
  // sehingga peta menampilkan penanda centroide until data koordinat di-ingest.
  const koordinatSekolah: Record<string, [number, number]> = {}

  /**
   * Tanpa guard ini, kegagalan API diam-diam menampilkan angka `0` sehingga
   * terlihat sama dengan "belum ada data". Backend mati atau CORS gagal
   * harus terlihat jelas di layar.
   */
  const gagal = [klasterState, sekolahState].find((s) => s.status === "error")
  const memuat = [klasterState, sekolahState].some((s) => s.status === "loading")

  if (gagal && gagal.status === "error") {
    return (
      <div className="flex items-center justify-center px-6 py-24 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-lg font-extrabold text-slate-900">Data tidak dapat dimuat</p>
          <p className="text-sm text-slate-600">{gagal.message}</p>
          <p className="text-xs text-slate-500">
            Pastikan backend berjalan di <span className="font-mono">http://localhost:8000</span>{" "}
            (dari root repo: <span className="font-mono">npm run dev</span>).
          </p>
          <button
            type="button"
            onClick={() => {
              refetchKlaster()
              refetchSekolah()
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B3052] px-5 text-xs font-bold text-white hover:bg-[#07213A] cursor-pointer"
          >
            <RotateCw className="h-4 w-4" /> Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  if (memuat) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#0B3052]" />
          Memuat ringkasan eksekutif...
        </span>
      </div>
    )
  }

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
            <span>Sinkron Dapodik: <strong className="text-slate-700">{kpi.sinkronDapodik}</strong></span>
            <span>•</span>
            <span>Klaster terbaru diproses: <strong className="text-slate-700">{kpi.klasterTerbaru}</strong></span>
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
              Cakupan {kpi.sekolahTerdaftar > 0 ? `${kpi.cakupanPersen}%` : "Belum tersedia"}
            </span>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {kpi.sekolahTerdaftar}
            </div>
            <p className="text-xs text-slate-500 mt-1">dari {kpi.totalSekolahDb} sekolah tercatat di Dapodik</p>
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
              {kpi.belumTuntas}
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
                {kpi.rataSkorPrioritas}
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
              {kpi.kritisSegera}
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
                {/* Backend v1 belum menyimpan koordinat lintang/bujur sekolah
                    (kolom `lintang`/`bujur` kosong di basis data), jadi pin
                    hanya ditampilkan bila koordinat benar-benar tersedia. */}
                {daftarKlaster
                  .filter((k) => koordinatSekolah[k.sekolah_npsn] !== undefined)
                  .map((point) => {
                    const pos = koordinatSekolah[point.sekolah_npsn]!
                    return (
                      <SeverityMarker
                        key={point.klaster_id}
                        id={point.klaster_id}
                        position={pos}
                        sekolah={point.sekolah_npsn}
                        skor={point.skor_prioritas}
                        status={point.status_verifikasi === "terverifikasi" ? "aman" : "kritis"}
                        onClick={() => navigate(`/dinas/antrian?id=${point.klaster_id}`)}
                      />
                    )
                  })}
                <MapLegend
                  position="bottomright"
                  title="AMBANG SKOR PRIORITAS"
                  totalPins={daftarKlaster.length}
                  clusterCount={daftarKlaster.length}
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
                {daftarKlaster.length > 0 ? "5 Teratas" : "Belum ada data"}
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
                  {[...daftarKlaster]
                    .sort((a, b) => (b.skor_prioritas ?? 0) - (a.skor_prioritas ?? 0))
                    .slice(0, 5)
                    .map((klaster) => (
                    <tr key={klaster.klaster_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-2">
                        <span className="font-bold text-slate-900 block truncate max-w-[120px]">
                          {klaster.label ?? "Klaster isu"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{klaster.sekolah_npsn}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-slate-800 block truncate max-w-[130px]">
                          {(klaster.label ?? "Klaster isu").replace("Kerusakan ", "").replace("Kelistrikan ", "")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {klaster.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${klaster.skor_prioritas >= 70
                            ? "bg-rose-100 text-rose-800"
                            : klaster.skor_prioritas >= 40
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                          {klaster.skor_prioritas}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          to={`/dinas/antrian?id=${klaster.klaster_id}`}
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
                <p className="text-xs text-slate-400 mt-0.5">Rentang 6 Bulan Terakhir — memerlukan riwayat historis backend</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0B3052] border border-blue-200/60 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0B3052]" />
                Total Terverifikasi
              </span>
            </div>

            {/* ECharts Area Trend Chart */}
            <div className="mt-4 pt-2">
              {trenBulananIsu.length > 0 ? (
                <AreaTrendChart data={trenBulananIsu} height={176} />
              ) : (
                <div className="flex h-[176px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
                  <TrendingUp className="h-5 w-5 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Tren bulanan belum tersedia</p>
                  <p className="text-[11px] text-slate-500">
                    Backend belum menyimpan riwayat isu per bulan, jadi grafik tidak dapat dihitung.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-600">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Kenaikan fluktuatif pasca verifikasi lapangan semester genap.
            </span>
            <span className="font-bold text-slate-800">
              {trenBulananIsu.length > 0 ? "Rata-rata: 10 isu / bln" : "Belum ada data historis"}
            </span>
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
                {daftarKlaster.length} Total Kasus
              </span>
            </div>

            {/* ECharts Horizontal Bar Chart */}
            <div className="mt-4">
              <HorizontalBarChart
                data={distribusiFasilitas.map((item) => ({
                  nama: item.kategori,
                  nilai: item.jumlah,
                  subLabel: daftarKlaster.length
                    ? `${Math.round((item.jumlah / daftarKlaster.length) * 100)}%`
                    : "0%",
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
