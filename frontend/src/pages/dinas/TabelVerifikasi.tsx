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
  ClipboardCheck,
  Clock,
  MessageSquare,
  Gauge,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import { listKlaster, detailKlaster } from "@/lib/api/klaster"
import { listSekolah } from "@/lib/api/sekolah"
import { overridePrioritas } from "@/lib/api/vote"
import { ApiError } from "@/lib/api/errors"
import type { KlasterListItem, StatusKlaster, KlasterDetail } from "@/lib/api/types"

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Semua");
  const [filterJenjang, setFilterJenjang] = useState("Semua");
  const [sortKey, setSortKey] = useState<SortKey>("skorPrioritas");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Detail Klaster Internal (khusus panel dinas, tidak ke dashboard warga)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    klaster: KlasterDetail | null;
    namaSekolah: string | null;
    jenjang: string;
  } | null>(null);

  const handleBukaDetail = async (row: BarisTabel) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailData({ klaster: null, namaSekolah: row.namaSekolah, jenjang: row.jenjang });
    try {
      const data = await detailKlaster(row.klaster.klaster_id);
      setDetailData({ klaster: data, namaSekolah: row.namaSekolah, jenjang: row.jenjang });
    } catch {
      setDetailData({
        klaster: { ...row.klaster, sekolah_nama: row.namaSekolah, created_at: "", laporan: [] },
        namaSekolah: row.namaSekolah,
        jenjang: row.jenjang,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // ── F3.4 §B2 — Override urutan prioritas manual (kepala_dinas) ────────────
  // INTERFACES.md §7: `PUT /vote/klaster/{id}/override?urutan_prioritas=&alasan=`
  // `alasan` WAJIB (422 REASON_REQUIRED) — PAGE_STATES §B2 & §C.1 (audit trail).
  const { role } = useAuth();
  const bolehOverride = role === "kepala_dinas";

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<BarisTabel | null>(null);
  const [overrideUrutan, setOverrideUrutan] = useState("");
  const [overrideAlasan, setOverrideAlasan] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  const handleBukaOverride = (row: BarisTabel, posisiSaatIni: number) => {
    setOverrideTarget(row);
    setOverrideUrutan(String(row.klaster.urutan_prioritas_override ?? posisiSaatIni));
    setOverrideAlasan("");
    setOverrideError(null);
    setOverrideSuccess(null);
    setOverrideOpen(true);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTarget) return;

    const urutan = Number(overrideUrutan);
    if (!Number.isInteger(urutan) || urutan < 1) {
      setOverrideError("Peringkat harus berupa bilangan bulat ≥ 1.");
      return;
    }
    if (!overrideAlasan.trim()) {
      setOverrideError("Alasan override wajib diisi untuk audit trail.");
      return;
    }

    setOverrideSubmitting(true);
    setOverrideError(null);
    try {
      const res = await overridePrioritas(overrideTarget.klaster.klaster_id, urutan, overrideAlasan.trim());
      setOverrideSuccess(
        `Prioritas dikunci ke urutan #${res.urutan_prioritas_override} — alasan tercatat untuk audit.`
      );
      await refetch();
      setTimeout(() => setOverrideOpen(false), 1400);
    } catch (err) {
      if (err instanceof ApiError) {
        setOverrideError(
          err.code === "REASON_REQUIRED"
            ? "Alasan wajib diisi (backend menolak tanpa alasan)."
            : err.code === "FORBIDDEN"
              ? "Hanya Kepala Dinas yang boleh mengubah urutan prioritas."
              : err.message
        );
      } else {
        setOverrideError("Gagal menyimpan override prioritas.");
      }
    } finally {
      setOverrideSubmitting(false);
    }
  };

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
                  {paginatedData.map((row, idx) => {
                    const k = row.klaster;
                    const cfg = STATUS_META[k.status_verifikasi];
                    const posisiSaatIni = (pageSafe - 1) * ITEMS_PER_PAGE + idx + 1;
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
                          {k.urutan_prioritas_override !== null && (
                            <div className="text-[10px] font-bold text-[#0B3052] bg-blue-50 border border-blue-200/70 rounded px-1.5 py-0.5 mt-1 inline-block">
                              override #{k.urutan_prioritas_override}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-slate-900 font-bold tabular-nums">{k.jumlah_vote_terhitung ?? 0}</div>
                          <div className="text-[11px] text-slate-400">suara</div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {bolehOverride && (
                              <button
                                type="button"
                                onClick={() => handleBukaOverride(row, posisiSaatIni)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition-colors cursor-pointer"
                                title="Override Urutan Prioritas Manual (Kepala Dinas) — alasan wajib"
                              >
                                <Gauge className="h-3.5 w-3.5 text-amber-600" /> Prioritas
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleBukaDetail(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Lihat Pratinjau Detail Klaster Internal Dinas"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" /> Detail
                            </button>
                            <Link
                              to={`/dinas/antrian?id=${k.klaster_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#0B3052] bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-colors"
                              title="Buka Lembar Verifikasi Lengkap"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5 text-[#0B3052]" /> Verifikasi
                            </Link>
                            <Link
                              to={`/dinas/status?id=${k.klaster_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition-colors"
                              title="Kelola Status Tindak Lanjut"
                            >
                              <Clock className="h-3.5 w-3.5 text-emerald-700" /> Tindak Lanjut
                            </Link>
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

      {/* ── Dialog Pratinjau Detail Klaster Internal (Dinas Only) ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0B3052] border border-blue-200">
                AUDIT INTERNAL SARPRAS
              </span>
              <span className="text-xs font-mono text-slate-400">
                {detailData?.klaster?.klaster_id ?? "Memuat…"}
              </span>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center justify-between">
              <span>{detailData?.klaster?.label ?? "Detail Klaster Isu"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pratinjau resmi isu sarpras untuk keperluan verifikasi dan tindakan Dinas Pendidikan.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && (
            <div className="py-12 text-center text-xs font-semibold text-slate-500">
              <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0B3052]" />
              Memuat data lengkap klaster…
            </div>
          )}

          {!detailLoading && detailData?.klaster && (
            <div className="space-y-5 pt-3">
              {/* Profil Sekolah & Kategori */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Sekolah / NPSN</span>
                  <span className="font-bold text-slate-800 text-sm block mt-0.5">
                    {detailData.namaSekolah ?? detailData.klaster.sekolah_nama ?? "—"}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    NPSN: {detailData.klaster.sekolah_npsn} &middot; {detailData.jenjang}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Kategori &amp; Status</span>
                  <span className="font-bold text-slate-800 block mt-0.5 uppercase tracking-wide">
                    {detailData.klaster.kategori.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Status Penanganan: <strong className="text-slate-700">{detailData.klaster.status_penanganan ?? "Belum ada"}</strong>
                  </span>
                </div>
              </div>

              {/* Skor & Metrik */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200/80 p-3 bg-white text-center">
                  <span className="text-[11px] font-medium text-slate-400 block">Skor Prioritas</span>
                  <span className="text-xl font-black text-[#0B3052] tabular-nums">
                    {detailData.klaster.skor_prioritas ?? "—"}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3 bg-white text-center">
                  <span className="text-[11px] font-medium text-slate-400 block">Skor Keparahan</span>
                  <span className="text-xl font-black text-rose-700 tabular-nums">
                    {detailData.klaster.skor_keparahan ?? "—"}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3 bg-white text-center">
                  <span className="text-[11px] font-medium text-slate-400 block">Dukungan Warga</span>
                  <span className="text-xl font-black text-emerald-700 tabular-nums">
                    {detailData.klaster.jumlah_vote_terhitung ?? 0} <span className="text-xs font-normal text-slate-400">suara</span>
                  </span>
                </div>
              </div>

              {/* Laporan Warga dalam Klaster */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-[#0B3052]" />
                    Laporan Anggota dalam Klaster ({detailData.klaster.laporan?.length ?? 0})
                  </span>
                </div>
                {(!detailData.klaster.laporan || detailData.klaster.laporan.length === 0) ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                    Belum ada detail teks laporan tersinkronisasi pada klaster ini.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {detailData.klaster.laporan.map((lap) => (
                      <div
                        key={lap.laporan_id}
                        className="rounded-lg border border-slate-200/70 p-3 bg-white text-xs space-y-1 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            {lap.fasilitas_terkait ?? "Fasilitas"} &middot;{" "}
                            <span className="font-semibold text-rose-700">
                              {lap.kondisi_dilaporkan?.replace(/_/g, " ") ?? "Kondisi tidak dicantumkan"}
                            </span>
                          </span>
                          <span className="text-slate-400">
                            {lap.created_at ? new Date(lap.created_at).toLocaleDateString("id-ID") : "—"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[12px] leading-relaxed">
                          "{lap.deskripsi}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons inside Dialog */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="text-xs font-semibold h-9"
                >
                  Tutup
                </Button>
                <Link to={`/dinas/status?id=${detailData.klaster.klaster_id}`}>
                  <Button
                    variant="outline"
                    className="text-xs font-bold h-9 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <Clock className="h-3.5 w-3.5" /> Kelola Tindak Lanjut
                  </Button>
                </Link>
                <Link to={`/dinas/antrian?id=${detailData.klaster.klaster_id}`}>
                  <Button
                    className="text-xs font-bold h-9 bg-[#0B3052] hover:bg-[#07213A] text-white flex items-center gap-1.5"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Buka Lembar Verifikasi
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── F3.4 §B2: Dialog Override Urutan Prioritas (kepala_dinas) ── */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Gauge className="h-4 w-4 text-amber-600" /> Override Urutan Prioritas
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 leading-relaxed">
              {overrideTarget ? (
                <>
                  <strong>{overrideTarget.namaSekolah ?? overrideTarget.klaster.sekolah_npsn}</strong> —{" "}
                  {overrideTarget.klaster.label ?? overrideTarget.klaster.kategori}. Skor sistem:{" "}
                  <strong>{overrideTarget.klaster.skor_prioritas}</strong>. Pengubahan manual
                  tercatat pada log audit.
                </>
              ) : (
                "Menyesuaikan urutan prioritas manual di atas perhitungan sistem."
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitOverride} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="override-urutan" className="text-xs font-bold text-slate-700 block">
                Peringkat Baru <span className="text-rose-600">*</span>
              </label>
              <input
                id="override-urutan"
                type="number"
                min={1}
                step={1}
                required
                value={overrideUrutan}
                onChange={(e) => setOverrideUrutan(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
                placeholder="mis. 1"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="override-alasan" className="text-xs font-bold text-slate-700 block">
                Alasan Override <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="override-alasan"
                required
                rows={3}
                value={overrideAlasan}
                onChange={(e) => setOverrideAlasan(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B3052] resize-y"
                placeholder="Wajib diisi — dipertahankan untuk audit trail (PAGE_STATES §B2)..."
              />
              <p className="text-[11px] text-slate-400">
                Tanpa alasan, backend menolak dengan <span className="font-mono">422 REASON_REQUIRED</span>.
              </p>
            </div>

            {overrideError && (
              <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                {overrideError}
              </div>
            )}
            {overrideSuccess && (
              <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                {overrideSuccess}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOverrideOpen(false)}
                disabled={overrideSubmitting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={overrideSubmitting || !!overrideSuccess}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs cursor-pointer"
              >
                {overrideSubmitting ? "Menyimpan..." : "Simpan Override"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}