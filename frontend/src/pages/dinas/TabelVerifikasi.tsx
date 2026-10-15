import { useMemo, useState } from "react"
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
  RotateCw,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { listKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import { useAuth } from "@/context/AuthContext"
import type { KlasterListItem, StatusKlaster } from "@/lib/api/types"

/**
 * F4.1 — Rekap Verifikasi Sarpras (`/dinas/tabel`).
 *
 * Sumber data: `GET /klaster` (publik, `page_size` maks 100) + `GET /sekolah`
 * untuk memetakan NPSN → nama sekolah & jenjang.
 *
 * Kolom yang DIHAPUS karena tidak ada sumbernya di backend v1:
 * "Kondisi Dapodik vs Lapangan" (tidak ada endpoint pembanding),
 * "Verifikator" + tanggal verifikasi (tidak dikirim `GET /klaster`),
 * nomor tiket `KLS-2026-xxxx` (format rekaan; diganti ID klaster asli),
 * serta status "Mismatch / Kejadian Baru / Menunggu / Ditolak" yang bukan
 * nilai enum backend. Enum sebenarnya: `menunggu_verifikasi`,
 * `perlu_info_tambahan`, `tidak_terverifikasi`, `terverifikasi`.
 */

/** `page_size` maksimal 100 (backend `GET /klaster` clamp). */
const PAGE_SIZE = 100;
const ITEMS_PER_PAGE = 10;

type FilterStatus = StatusKlaster | "Semua";
type SortKey = "skorPrioritas" | "jumlahVote" | "sekolah";

const STATUS_META: Record<FilterStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  Semua: { label: "Semua", bg: "", text: "", border: "", dot: "" },
  menunggu_verifikasi: {
    label: "Menunggu Verifikasi",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  perlu_info_tambahan: {
    label: "Perlu Info Tambahan",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
  tidak_terverifikasi: {
    label: "Tidak Terverifikasi",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-600",
  },
  terverifikasi: {
    label: "Terverifikasi",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-600",
  },
};

const OPSI_STATUS: FilterStatus[] = [
  "Semua",
  "menunggu_verifikasi",
  "perlu_info_tambahan",
  "tidak_terverifikasi",
  "terverifikasi",
];

const OPSI_JENJANG = ["Semua", "SD", "SMP", "SMA", "SMK"] as const;

/** Baris tabel = klaster + profil sekolah hasil lookup. */
interface BarisTabel {
  klaster: KlasterListItem;
  namaSekolah: string | null;
  jenjang: string;
}

export default function TabelVerifikasi() {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Semua");
  const [filterJenjang, setFilterJenjang] = useState("Semua");
  const [sortKey, setSortKey] = useState<SortKey>("skorPrioritas");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { state: klasterState, refetch } = useFetch(() => listKlaster({ page_size: PAGE_SIZE }));
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: PAGE_SIZE }));

  const profilSekolah = useMemo(() => {
    const map = new Map<string, { nama: string; jenjang: string }>();
    if (sekolahState.status === "success") {
      for (const s of sekolahState.data.data) map.set(s.npsn, { nama: s.nama, jenjang: s.jenjang });
    }
    return map;
  }, [sekolahState]);

  const daftarKlaster = klasterState.status === "success" ? klasterState.data.data : [];
  const totalKlaster = klasterState.status === "success" ? klasterState.data.meta.total_items : 0;

  const baris: BarisTabel[] = useMemo(
    () =>
      daftarKlaster.map((k) => {
        const profil = profilSekolah.get(k.sekolah_npsn);
        return { klaster: k, namaSekolah: profil?.nama ?? null, jenjang: profil?.jenjang ?? "—" };
      }),
    [daftarKlaster, profilSekolah],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      Semua: baris.length,
      menunggu_verifikasi: 0,
      perlu_info_tambahan: 0,
      tidak_terverifikasi: 0,
      terverifikasi: 0,
    };
    for (const row of baris) counts[row.klaster.status_verifikasi] += 1;
    return counts;
  }, [baris]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasil = baris.filter((row) => {
      const k = row.klaster;
      const matchSearch =
        !q ||
        (row.namaSekolah ?? "").toLowerCase().includes(q) ||
        k.sekolah_npsn.includes(q) ||
        k.klaster_id.toLowerCase().includes(q) ||
        (k.label ?? "").toLowerCase().includes(q) ||
        k.kategori.toLowerCase().includes(q);
      const matchStatus = filterStatus === "Semua" || k.status_verifikasi === filterStatus;
      const matchJenjang = filterJenjang === "Semua" || row.jenjang === filterJenjang;
      return matchSearch && matchStatus && matchJenjang;
    });

    const arah = sortAsc ? 1 : -1;
    return [...hasil].sort((a, b) => {
      if (sortKey === "sekolah") {
        return arah * (a.namaSekolah ?? "").localeCompare(b.namaSekolah ?? "");
      }
      if (sortKey === "jumlahVote") {
        return arah * ((a.klaster.jumlah_vote_terhitung ?? 0) - (b.klaster.jumlah_vote_terhitung ?? 0));
      }
      return arah * ((a.klaster.skor_prioritas ?? 0) - (b.klaster.skor_prioritas ?? 0));
    });
  }, [baris, searchQuery, filterStatus, filterJenjang, sortKey, sortAsc]);

  const totalPages = Math.max(Math.ceil(filteredData.length / ITEMS_PER_PAGE), 1);
  const pageSafe = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((pageSafe - 1) * ITEMS_PER_PAGE, pageSafe * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  /** Ekspor CSV dari baris yang sedang difilter (data nyata, bukan data demo). */
  const handleEksporCsv = () => {
    const header = [
      "klaster_id",
      "npsn",
      "sekolah",
      "jenjang",
      "label",
      "kategori",
      "status_verifikasi",
      "status_penanganan",
      "skor_prioritas",
      "jumlah_vote_terhitung",
    ];
    const escape = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredData.map((row) =>
      [
        row.klaster.klaster_id,
        row.klaster.sekolah_npsn,
        row.namaSekolah,
        row.jenjang,
        row.klaster.label,
        row.klaster.kategori,
        row.klaster.status_verifikasi,
        row.klaster.status_penanganan,
        row.klaster.skor_prioritas,
        row.klaster.jumlah_vote_terhitung,
      ]
        .map(escape)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rekap_verifikasi_sarpras_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const memuat = klasterState.status === "loading" || sekolahState.status === "loading";
  const gagal = [klasterState, sekolahState].find((s) => s.status === "error");

  const SortButton = ({ label, skey }: { label: string; skey: SortKey }) => (
    <button
      onClick={() => handleSort(skey)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === skey ? "text-[#0B3052]" : "text-slate-300"}`} />
    </button>
  );

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
          <p className="text-xs text-slate-500 mt-1">
            Rekap status verifikasi klaster isu sarpras Kecamatan Lamongan. Sumber data:{" "}
            <span className="font-mono">GET /klaster</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleEksporCsv}
            disabled={filteredData.length === 0}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Ekspor CSV
          </Button>
          <Button
            variant="outline"
            onClick={refetch}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" /> Muat Ulang
          </Button>
        </div>
      </div>

      {/* State: loading / error */}
      {memuat && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">Memuat data verifikasi…</p>
        </div>
      )}

      {!memuat && gagal && gagal.status === "error" && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm py-16 px-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Data verifikasi tidak dapat dimuat</p>
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
            <RotateCw className="h-3.5 w-3.5 mr-1" /> Coba Lagi
          </Button>
        </div>
      )}

      {!memuat && !gagal && (
        <>
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
            {OPSI_STATUS.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${filterStatus === status ? "bg-[#0B3052] text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              >
                <span>{STATUS_META[status].label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${filterStatus === status ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}
                >
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari NPSN, nama sekolah, ID klaster, label isu..."
                className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="relative">
              <select
                value={filterJenjang}
                onChange={(e) => {
                  setFilterJenjang(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none"
              >
                {OPSI_JENJANG.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
              {filteredData.length} baris
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">
                      <SortButton label="SEKOLAH / NPSN" skey="sekolah" />
                    </th>
                    <th className="py-3.5 px-3">ISU / KATEGORI</th>
                    <th className="py-3.5 px-3">STATUS VERIFIKASI</th>
                    <th className="py-3.5 px-3">STATUS PENANGANAN</th>
                    <th className="py-3.5 px-3 text-center">
                      <SortButton label="SKOR" skey="skorPrioritas" />
                    </th>
                    <th className="py-3.5 px-3">
                      <SortButton label="DUKUNGAN" skey="jumlahVote" />
                    </th>
                    <th className="py-3.5 px-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row) => {
                    const k = row.klaster;
                    const cfg = STATUS_META[k.status_verifikasi];
                    return (
                      <tr key={k.klaster_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2">
                            <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#0B3052] flex items-center justify-center shrink-0 mt-0.5">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-snug">
                                {row.namaSekolah ?? "Nama sekolah belum termuat"}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono">{k.sekolah_npsn}</span>
                                <span>&middot;</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                  {row.jenjang}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800 block">{k.label ?? "Tanpa label"}</span>
                          <span className="text-[11px] text-slate-400">{k.kategori}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400 mt-1">{k.klaster_id}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          {k.status_penanganan ? (
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              {k.status_penanganan}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 italic">Belum ada</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center font-black text-xs rounded px-2.5 py-1 tabular-nums ${(k.skor_prioritas ?? 0) >= 70 ? "bg-rose-100 text-rose-800" : (k.skor_prioritas ?? 0) >= 40 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                          >
                            {k.skor_prioritas ?? "—"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-slate-900 font-bold tabular-nums">{k.jumlah_vote_terhitung ?? 0}</div>
                          <div className="text-[11px] text-slate-400">suara</div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              to={`/klaster/${k.klaster_id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#0B3052]"
                            >
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </Link>
                            {role === "verifikator_dinas" && (
                              <Link
                                to="/dinas/antrian"
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline"
                              >
                                Verifikasi
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && (
              <div className="py-16 text-center">
                <XCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">
                  {totalKlaster === 0 ? "Belum ada klaster isu" : "Tidak ada data yang cocok"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {totalKlaster === 0
                    ? "Jalankan pipeline clustering (POST /ai/cluster) agar klaster isu terbentuk."
                    : "Coba ubah filter atau kata kunci pencarian"}
                </p>
              </div>
            )}

            {filteredData.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Menampilkan {(pageSafe - 1) * ITEMS_PER_PAGE + 1}–{Math.min(pageSafe * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} entri
                  {totalKlaster > baris.length ? ` (dimuat ${baris.length} dari ${totalKlaster} klaster)` : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={pageSafe === 1}
                    className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#0B3052] text-white font-bold tabular-nums">
                    {pageSafe}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={pageSafe === totalPages}
                    className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Total Klaster", value: totalKlaster, color: "text-slate-900", bg: "bg-white" },
              { label: "Terverifikasi", value: statusCounts.terverifikasi, color: "text-emerald-700", bg: "bg-emerald-50" },
              {
                label: "Belum Terverifikasi",
                value: statusCounts.menunggu_verifikasi + statusCounts.perlu_info_tambahan + statusCounts.tidak_terverifikasi,
                color: "text-rose-700",
                bg: "bg-rose-50",
              },
              {
                label: "Menunggu Verifikasi",
                value: statusCounts.menunggu_verifikasi,
                color: "text-amber-700",
                bg: "bg-amber-50",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl ${item.bg} border border-slate-200/80 p-4 flex items-center justify-between shadow-sm`}
              >
                <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                <span className={`text-2xl font-extrabold tabular-nums ${item.color}`}>
                  {klasterState.status === "success" ? item.value : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Link
              to="/dinas/antrian"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3052] hover:underline"
            >
              Buka Antrian Validasi Lengkap <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}