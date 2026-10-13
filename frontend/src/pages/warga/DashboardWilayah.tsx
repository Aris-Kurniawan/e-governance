import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import { useAuth } from "@/context/AuthContext"
import { useFetch } from "@/hooks/useFetch"
import { listSekolah } from "@/lib/api/sekolah"
import { listKlaster } from "@/lib/api/klaster"
import { dashboardPrioritas } from "@/lib/api/dashboard"
import type { DashboardPrioritasItem, KlasterListItem, SekolahList } from "@/lib/api/types"
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Shield,
  Clock,
  Plus,
  Lock,
  RotateCw,
} from "lucide-react"

/**
 * F4.1 — Dashboard Wilayah / Matriks Integritas Sarpras.
 *
 * Dipakai di dua rute: `/laporan/wilayah` (publik) dan `/dashboard` (warga
 * masuk). Karena itu hanya endpoint **publik** yang dipakai:
 * `GET /sekolah`, `GET /klaster`, `GET /dashboard/prioritas`.
 * `GET /dashboard/wilayah` TIDAK dipakai — endpoint itu khusus
 * `verifikator_dinas`/`kepala_dinas` dan akan 403 untuk warga.
 *
 * Yang dihapus karena tidak ada sumber data (AGENTS.md §Scope):
 * kolom jumlah ruang kelas/lab/perpustakaan/sanitasi per sekolah (butuh
 * 1 request per sekolah, tidak tersedia pada endpoint list), KPI "Cakupan
 * 100%", "6 Sekolah / 4 Selisih Minor / 2 Mismatch Kritis", "42 Isu / 87,5%",
 * gambar peta Unsplash dengan pin rekaan, dan foto mock "38 warga memvalidasi".
 */

const PAGE_SIZE = 100;

const OPSI_JENJANG = ["Semua", "SD", "SMP", "SMA", "SMK"] as const;

type StatusIntegritas = "Sesuai" | "Selisih Minor" | "Mismatch Kritis";
type FilterKlaster = "semua" | "belum" | "terverifikasi";

const STATUS_SEL: Record<StatusIntegritas, string> = {
  Sesuai: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Selisih Minor": "bg-amber-50 text-amber-800 border-amber-200",
  "Mismatch Kritis": "bg-rose-50 text-rose-800 border-rose-200",
};

const STATUS_VERIFIKASI_STYLE: Record<string, string> = {
  terverifikasi: "bg-emerald-50 text-emerald-800 border-emerald-200",
  menunggu_verifikasi: "bg-amber-50 text-amber-800 border-amber-200",
  perlu_info_tambahan: "bg-blue-50 text-blue-800 border-blue-200",
  tidak_terverifikasi: "bg-rose-50 text-rose-800 border-rose-200",
};

const STATUS_VERIFIKASI_LABEL: Record<string, string> = {
  terverifikasi: "Terverifikasi",
  menunggu_verifikasi: "Menunggu Verifikasi",
  perlu_info_tambahan: "Perlu Info Tambahan",
  tidak_terverifikasi: "Tidak Terverifikasi",
  belum_terklasifikasi: "Belum Terklasifikasi",
};

/**
 * Status integritas diturunkan dari klaster milik sekolah:
 * ada klaster `tidak_terverifikasi` → kritis; klaster masih menunggu/info →
 * selisih minor; semua terverifikasi (atau tidak ada klaster) → sesuai.
 */
function deriveStatusIntegritas(klasters: KlasterListItem[]): StatusIntegritas {
  if (klasters.some((k) => k.status_verifikasi === "tidak_terverifikasi")) return "Mismatch Kritis";
  if (
    klasters.some(
      (k) => k.status_verifikasi === "menunggu_verifikasi" || k.status_verifikasi === "perlu_info_tambahan",
    )
  )
    return "Selisih Minor";
  return "Sesuai";
}

function labelUrgensi(skor: number): { label: string; kelas: string } {
  if (skor >= 70) return { label: "Kritis / Mendesak", kelas: "bg-rose-50 text-rose-800 border-rose-200" };
  if (skor >= 40) return { label: "Perhatian Sedang", kelas: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: "Rendah", kelas: "bg-slate-100 text-slate-700 border-slate-200" };
}

function kelasSkor(skor: number): string {
  if (skor >= 70) return "bg-rose-100 text-rose-800";
  if (skor >= 40) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function DashboardWilayah() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false);
  const [selectedSchoolForReport, setSelectedSchoolForReport] = useState<{ npsn: string; nama: string } | null>(null);
  const [filterJenjang, setFilterJenjang] = useState<string>("Semua");
  const [filterKlaster, setFilterKlaster] = useState<FilterKlaster>("semua");

  const { state: sekolahState, refetch: refetchSekolah } = useFetch(() => listSekolah({ page_size: PAGE_SIZE }));
  const { state: klasterState, refetch: refetchKlaster } = useFetch(() => listKlaster({ page_size: PAGE_SIZE }));
  const { state: prioritasState } = useFetch(() => dashboardPrioritas({ limit: 20 }));

  const daftarSekolah: SekolahList[] = sekolahState.status === "success" ? sekolahState.data.data : [];
  const totalSekolah = sekolahState.status === "success" ? sekolahState.data.meta.total_items : 0;
  const daftarKlaster: KlasterListItem[] = klasterState.status === "success" ? klasterState.data.data : [];
  const totalKlaster = klasterState.status === "success" ? klasterState.data.meta.total_items : 0;
  const klastersPrioritas: DashboardPrioritasItem[] =
    prioritasState.status === "success" ? prioritasState.data : [];

  /** Kelompokkan klaster per NPSN sekolah untuk matriks integritas. */
  const klastersPerSekolah = useMemo(() => {
    const map = new Map<string, KlasterListItem[]>();
    for (const k of daftarKlaster) {
      const list = map.get(k.sekolah_npsn);
      if (list) list.push(k);
      else map.set(k.sekolah_npsn, [k]);
    }
    return map;
  }, [daftarKlaster]);

  const barisMatriks = useMemo(
    () =>
      daftarSekolah.map((s) => {
        const klasters = klastersPerSekolah.get(s.npsn) ?? [];
        const belumTerverifikasi = klasters.filter((k) => k.status_verifikasi !== "terverifikasi").length;
        return {
          sekolah: s,
          totalKlaster: klasters.length,
          belumTerverifikasi,
          skorTertinggi: klasters.reduce((maks, k) => Math.max(maks, k.skor_prioritas ?? 0), 0),
          status: deriveStatusIntegritas(klasters),
        };
      }),
    [daftarSekolah, klastersPerSekolah],
  );

  const filteredRows = useMemo(
    () =>
      filterJenjang === "Semua"
        ? barisMatriks
        : barisMatriks.filter((r) => r.sekolah.jenjang === filterJenjang),
    [barisMatriks, filterJenjang],
  );

  /** Distribusi klaster per kategori — menggantikan peta mock. */
  const sebaranKategori = useMemo(() => {
    const tally = new Map<string, number>();
    for (const k of daftarKlaster) tally.set(k.kategori, (tally.get(k.kategori) ?? 0) + 1);
    const max = Math.max(...tally.values(), 1);
    return [...tally.entries()]
      .map(([kategori, jumlah]) => ({ kategori, jumlah, persen: Math.round((jumlah / max) * 100) }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [daftarKlaster]);

  const klasterTerfilter = useMemo(() => {
    if (filterKlaster === "belum") return klastersPrioritas.filter((k) => k.status_verifikasi !== "terverifikasi");
    if (filterKlaster === "terverifikasi") return klastersPrioritas.filter((k) => k.status_verifikasi === "terverifikasi");
    return klastersPrioritas;
  }, [klastersPrioritas, filterKlaster]);

  const sekolahDenganKlaster = useMemo(
    () => new Set(daftarKlaster.map((k) => k.sekolah_npsn)).size,
    [daftarKlaster],
  );
  const klasterTerverifikasi = useMemo(
    () => daftarKlaster.filter((k) => k.status_verifikasi === "terverifikasi").length,
    [daftarKlaster],
  );

  const handleUnduhCsv = () => {
    const headers = ["NPSN", "Nama Sekolah", "Jenjang", "Jumlah Klaster", "Belum Terverifikasi", "Skor Tertinggi", "Status Integritas"];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = filteredRows.map((r) =>
      [
        r.sekolah.npsn,
        r.sekolah.nama,
        r.sekolah.jenjang,
        r.totalKlaster,
        r.belumTerverifikasi,
        r.skorTertinggi,
        r.status,
      ]
        .map(escape)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const saringan = filterJenjang !== "Semua" ? `${filterJenjang.toLowerCase()}_` : "";
    link.download = `matriks_integritas_sarpras_${saringan}${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReportClick = (school?: { npsn: string; nama: string }) => {
    if (!isAuthenticated) {
      setSelectedSchoolForReport(school ?? null);
      setIsAuthRequiredOpen(true);
    } else if (school) {
      navigate(`/laporan/baru?sekolah=${school.npsn}`);
    } else {
      navigate("/sekolah");
    }
  };

  const memuat = [sekolahState, klasterState].some((s) => s.status === "loading");
  const gagal = [sekolahState, klasterState].find((s) => s.status === "error");
  const muatUlang = () => {
    refetchSekolah();
    refetchKlaster();
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Status Bar ── */}
      <div className="border-b border-slate-200/80 bg-white py-2.5 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 tracking-wider uppercase text-[11px]">PORTAL RESMI AUDIT DAPODIK</span>
            <span className="text-slate-300">|</span>
            <span>Kecamatan Lamongan</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Sekolah: <strong className="text-slate-700 tabular-nums">{sekolahState.status === "success" ? totalSekolah : "…"}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80 ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {sekolahState.status === "success" ? "Data Backend Aktif" : "Menghubungkan…"}
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
                  <Link to="/tentang">Panduan Validasi</Link>
                </Button>
              </div>

              {isAuthenticated ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Masuk sebagai {user?.nama}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Wajib masuk untuk melapor
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI Cards (angka dari backend) ── */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">CAKUPAN WILAYAH</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0B3052]">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1 tabular-nums">
                {sekolahState.status === "success" ? totalSekolah : "…"}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
              <span className="text-xs text-slate-500">Sekolah terdata di backend Dapodikdasmen.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">SEKOLAH DENGAN KLASTER</span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {klasterState.status === "success" ? sekolahDenganKlaster : "…"}
                </span>
                <span className="text-lg font-bold text-slate-700">Sekolah</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                {totalKlaster - klasterTerverifikasi} belum terverifikasi
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                {klasterTerverifikasi} terverifikasi
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">TOTAL KLASTER ISU</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {klasterState.status === "success" ? totalKlaster : "…"}
                </span>
                <span className="text-lg font-bold text-slate-700">Klaster</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Terverifikasi</span>
                <span className="tabular-nums">
                  {totalKlaster === 0 ? 0 : Math.round((klasterTerverifikasi / totalKlaster) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${totalKlaster === 0 ? 0 : (klasterTerverifikasi / totalKlaster) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── State: loading / error ── */}
        {memuat && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm text-center text-sm text-slate-500">
            Memuat data sekolah &amp; klaster isu…
          </div>
        )}

        {!memuat && gagal && gagal.status === "error" && (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-8 shadow-sm text-center space-y-3">
            <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
            <p className="text-sm font-bold text-slate-900">Data tidak dapat dimuat</p>
            <p className="text-xs text-slate-600">{gagal.message}</p>
            <p className="text-[11px] text-slate-500">
              Pastikan backend berjalan di <span className="font-mono">http://localhost:8000</span> (dari root repo:{" "}
              <span className="font-mono">npm run dev</span>).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={muatUlang}
              className="h-8 text-xs font-semibold text-slate-700 border-slate-200"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1" /> Coba Lagi
            </Button>
          </div>
        )}

        {!memuat && !gagal && (
          <>
            {/* ── Matriks Integritas + Widgets ── */}
            <div className="grid gap-8 lg:grid-cols-12 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">Matriks Integritas Sarana Sekolah</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Status integritas diturunkan dari klaster isu hasil processing AI pipeline per sekolah.
                      </p>
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
                            filterJenjang !== "Semua" ? "border-blue-300 bg-blue-50 text-[#0B3052]" : "text-slate-700"
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                          <span className="whitespace-nowrap">
                            {filterJenjang === "Semua" ? "Filter Jenjang" : `Jenjang: ${filterJenjang}`}
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
                        disabled={filteredRows.length === 0}
                        className="h-8 text-xs font-medium text-slate-700 border-slate-200 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Unduh CSV
                      </Button>
                    </div>
                  </div>

<div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      <th className="py-3 px-2">NAMA SEKOLAH</th>
                      <th className="py-3 px-2 text-center">KLASTER</th>
                      <th className="py-3 px-2 text-center">BELUM VERIFIKASI</th>
                      <th className="py-3 px-2 text-center">SKOR MAX</th>
                      <th className="py-3 px-2 text-right">STATUS</th>
                      <th className="py-3 px-2 text-right">AKSI</th>
                    </tr>
                  </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              {totalSekolah === 0
                                ? "Belum ada sekolah di backend. Jalankan ingest CSV Dapodik lebih dahulu."
                                : `Tidak ada sekolah dengan jenjang ${filterJenjang}.`}
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row) => (
                            <tr key={row.sekolah.npsn} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-2">
                                <Link to={`/sekolah/${row.sekolah.npsn}`} className="font-bold text-slate-900 hover:text-[#0B3052] block">
                                  {row.sekolah.nama}
                                </Link>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  NPSN: {row.sekolah.npsn} · {row.sekolah.jenjang}
                                </span>
                              </td>
                              <td className="py-3.5 px-2 text-center tabular-nums">{row.totalKlaster}</td>
                              <td className="py-3.5 px-2 text-center tabular-nums">
                                {row.belumTerverifikasi === 0 ? (
                                  <span className="text-slate-400">0</span>
                                ) : (
                                  <span className="inline-block rounded px-2 py-0.5 text-sm bg-amber-50 font-bold text-amber-800 border border-amber-200/60">
                                    {row.belumTerverifikasi}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-2 text-center">
                                {row.totalKlaster === 0 ? (
                                  <span className="text-slate-400">—</span>
                                ) : (
                                  <span className={`inline-block rounded px-2 py-0.5 text-sm tabular-nums ${kelasSkor(row.skorTertinggi)}`}>
                                    {row.skorTertinggi}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-2 text-right">
                                <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_SEL[row.status]}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-2 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReportClick({ npsn: row.sekolah.npsn, nama: row.sekolah.nama })}
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>Keterangan:</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Sesuai</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Selisih Minor</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Mismatch Kritis</span>
                    </div>
                    <span className="tabular-nums">
                      Menampilkan {filteredRows.length} dari {totalSekolah} sekolah terdaftar
                      {filterJenjang !== "Semua" ? ` · difilter jenjang ${filterJenjang}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Widgets */}
              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                    <span className="text-xs font-extrabold tracking-wider text-rose-700 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> TEMUAN PRIORITAS TERATAS
                    </span>
                    <span className="text-[11px] font-mono font-medium text-rose-500">GET /dashboard/prioritas</span>
                  </div>

                  {klastersPrioritas.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada klaster isu. Jalankan pipeline clustering lebih dahulu.</p>
                  ) : (
                    <div className="space-y-3">
                      {klastersPrioritas.slice(0, 3).map((k) => (
                        <div key={k.klaster_id} className="rounded-xl bg-white p-3 border border-rose-200/70 space-y-1">
                          <span className="font-bold text-slate-900 text-xs block">{k.label ?? k.kategori}</span>
                          <p className="text-[11px] text-slate-500">
                            {k.sekolah_nama} · <span className="font-mono">{k.kategori}</span>
                          </p>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`inline-block rounded-full border px-2 py-0.5 font-bold ${STATUS_VERIFIKASI_STYLE[k.status_verifikasi] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
                              {STATUS_VERIFIKASI_LABEL[k.status_verifikasi] ?? k.status_verifikasi}
                            </span>
                            <span className={`inline-block rounded px-2 py-0.5 font-black tabular-nums ${kelasSkor(k.skor_prioritas)}`}>
                              {k.skor_prioritas}
                            </span>
                          </div>
                          <Link
                            to={`/klaster/${k.klaster_id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B3052] hover:underline"
                          >
                            Periksa klaster
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">SEBARAN KLASTER PER KATEGORI</span>
                    <span className="text-xs text-slate-400 tabular-nums">{totalKlaster} klaster</span>
                  </div>

                  {sebaranKategori.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada data kategori.</p>
                  ) : (
                    <div className="space-y-2">
                      {sebaranKategori.map((item) => (
                        <div key={item.kategori} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-600">{item.kategori}</span>
                            <span className="font-bold text-slate-800 tabular-nums">{item.jumlah}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-[#0B3052]" style={{ width: `${item.persen}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    Kategori &ldquo;belum_terklasifikasi&rdquo; muncul untuk laporan yang tidak masuk ambang klaster.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Klaster Terkini ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daftar Klaster Isu Terkini</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Klaster isu sarpras dengan skor prioritas tertinggi di wilayah kerja.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { id: "semua", label: `Semua Klaster (${totalKlaster})` },
                    { id: "belum", label: "Belum Terverifikasi" },
                    { id: "terverifikasi", label: "Terverifikasi" },
                  ] as { id: FilterKlaster; label: string }[]).map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setFilterKlaster(chip.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        filterKlaster === chip.id
                          ? "bg-[#0B3052] text-white font-semibold"
                          : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <Button
                    onClick={() => handleReportClick()}
                    className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Buat Aduan Baru
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      <th className="py-3 px-3">ISU &amp; SEKOLAH</th>
                      <th className="py-3 px-3">KLASTER ISU</th>
                      <th className="py-3 px-3">STATUS VERIFIKASI</th>
                      <th className="py-3 px-3">TINGKAT URGENSI</th>
                      <th className="py-3 px-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {klasterTerfilter.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          {totalKlaster === 0
                            ? "Belum ada klaster isu. Jalankan POST /ai/cluster untuk memproses laporan."
                            : "Tidak ada klaster pada filter ini."}
                        </td>
                      </tr>
                    ) : (
                      klasterTerfilter.map((k) => {
                        const urgensi = labelUrgensi(k.skor_prioritas);
                        return (
                          <tr key={k.klaster_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-3">
                              <span className="font-bold text-slate-900 text-sm block">{k.label ?? k.kategori}</span>
                              <span className="text-[11px] text-slate-400">{k.sekolah_nama}</span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200/60 font-mono">
                                {k.kategori}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_VERIFIKASI_STYLE[k.status_verifikasi] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
                                {STATUS_VERIFIKASI_LABEL[k.status_verifikasi] ?? k.status_verifikasi}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${urgensi.kelas}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {urgensi.label}
                              </span>
                              <span className="ml-2 text-[11px] text-slate-400 tabular-nums">skor {k.skor_prioritas}</span>
                            </td>
                            <td className="py-4 px-3 text-right">
                              <Link
                                to={`/klaster/${k.klaster_id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline"
                              >
                                Tinjau Isu
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span className="tabular-nums">
                  Menampilkan {klasterTerfilter.length} klaster
                  {totalKlaster > klastersPrioritas.length ? ` · 20 teratas dari ${totalKlaster}` : ""}
                </span>
                <Link to="/laporan/riwayat" className="text-xs font-bold text-[#0B3052] hover:underline">
                  Lihat riwayat laporan
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <AuthRequiredModal
        open={isAuthRequiredOpen}
        onOpenChange={setIsAuthRequiredOpen}
        redirectUrl={
          selectedSchoolForReport ? `/laporan/baru?sekolah=${selectedSchoolForReport.npsn}` : "/laporan/baru"
        }
        schoolName={selectedSchoolForReport?.nama}
      />
    </div>
  );
}