import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useFetch } from "@/hooks/useFetch"
import { listSekolah } from "@/lib/api/sekolah"
import { listKlaster } from "@/lib/api/klaster"
import { dashboardPrioritas } from "@/lib/api/dashboard"
import { statusVote, voteKlaster } from "@/lib/api/vote"
import { ApiError } from "@/lib/api/errors"
import { MapContainer, SeverityMarker } from "@/components/map"
import { filterTitikPeta, skorTertinggiPerSekolah, statusDariSkor } from "@/lib/peta"
import type { DashboardPrioritasItem, KlasterListItem, SekolahList } from "@/lib/api/types"
import NumberedPagination from "@/components/composite/NumberedPagination"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import ScrollReveal from "@/components/composite/ScrollReveal"
import MobileBreadcrumb from "@/components/composite/MobileBreadcrumb"
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RotateCw,
  ThumbsUp,
  ChevronDown,
  ExternalLink,
  Search,
  Layers,
  MapPin,
  School,
} from "@/components/ui/iconify-icons"

/**
 * F4.1 — Dashboard Wilayah / Matriks Integritas Sarpras.
 *
 * Dipakai di dua rute: `/laporan/wilayah` (publik) dan `/dashboard` (warga
 * masuk). Karena itu hanya endpoint **publik** yang dipakai:
 * `GET /sekolah`, `GET /klaster`, `GET /dashboard/prioritas`.
 * `GET /dashboard/wilayah` TIDAK dipakai — endpoint itu khusus
 * `verifikator_dinas`/`kepala_dinas` dan akan 403 untuk warga.
 */

const PAGE_SIZE = 100;
const ITEMS_PER_PAGE = 10;

/** Role yang boleh memberi vote (POST /vote per D-28). */
const ROLE_BOLEH_VOTE = ["warga_umum", "warga_terverifikasi", "komite_sekolah"];

type FilterKlaster = "semua" | "belum" | "terverifikasi";

const STATUS_VERIFIKASI_STYLE: Record<string, string> = {
  terverifikasi: "bg-emerald-50 text-emerald-800 border-emerald-200",
  menunggu_verifikasi: "bg-amber-50 text-amber-800 border-amber-200",
  tidak_terverifikasi: "bg-rose-50 text-rose-800 border-rose-200",
};

const STATUS_VERIFIKASI_LABEL: Record<string, string> = {
  terverifikasi: "Terverifikasi",
  menunggu_verifikasi: "Menunggu Verifikasi",
  tidak_terverifikasi: "Tidak Terverifikasi",
  belum_terklasifikasi: "Belum Terklasifikasi",
};

function labelUrgensi(skor: number): { label: string; kelas: string } {
  if (skor >= 70) return { label: "Kritis / Mendesak", kelas: "bg-rose-50 text-rose-800 border-rose-200" };
  if (skor >= 40) return { label: "Perhatian Sedang", kelas: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: "Rendah", kelas: "bg-slate-100 text-slate-700 border-slate-200" };
}

/** Mini decorative barcode-style tick bars seperti pada KPI cards referensi layout. */
function MiniMetricBars({ ratio = 0.75, accent = "blue" }: { ratio?: number; accent?: "blue" | "navy" | "sky" | "rose" }) {
  const heights = [38, 62, 48, 84, 56, 92, 68, 78, 52, 95, 64, 82];
  const activeCount = Math.max(2, Math.round(Math.min(1, Math.max(0.15, ratio)) * heights.length));
  const activeColor =
    accent === "rose"
      ? "bg-rose-500"
      : accent === "sky"
        ? "bg-sky-500"
        : accent === "navy"
          ? "bg-[#0B3052]"
          : "bg-blue-600";

  return (
    <div className="flex items-end gap-[3px] h-7 shrink-0" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h}%` }}
          className={`w-[3px] rounded-full transition-colors ${i < activeCount ? activeColor : "bg-blue-100"}`}
        />
      ))}
    </div>
  );
}

export default function DashboardWilayah() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [filterKlaster, setFilterKlaster] = useState<FilterKlaster>("semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageKlaster, setPageKlaster] = useState<number>(1);

  // Vote (F3.2) — status per klaster + umpan balik.
  const [votedKlaster, setVotedKlaster] = useState<Record<string, boolean>>({});
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const [voteBoost, setVoteBoost] = useState<Record<string, number>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isVoteAuthOpen, setIsVoteAuthOpen] = useState(false);

  // Peta sebaran (fitur 74fbcca5 — dipulihkan setelah hilang di merge 74b5e977).
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null);

  const toggleExpandMobile = (id: string) => {
    setExpandedMobileId((prev) => (prev === id ? null : id));
  };

  const { state: sekolahState, refetch: refetchSekolah } = useFetch(() => listSekolah({ page_size: PAGE_SIZE }));
  const { state: klasterState, refetch: refetchKlaster } = useFetch(() => listKlaster({ page_size: PAGE_SIZE }));
  const { state: prioritasState } = useFetch(() => dashboardPrioritas({ limit: PAGE_SIZE }));

  const daftarSekolah: SekolahList[] = sekolahState.status === "success" ? sekolahState.data.data : [];
  const totalSekolah = sekolahState.status === "success" ? sekolahState.data.meta.total_items : 0;
  const daftarKlaster: KlasterListItem[] = klasterState.status === "success" ? klasterState.data.data : [];
  const totalKlaster = klasterState.status === "success" ? klasterState.data.meta.total_items : 0;
  const klastersPrioritas: DashboardPrioritasItem[] =
    prioritasState.status === "success" ? prioritasState.data : [];

  /** Kelompokkan klaster per NPSN sekolah untuk peta. */
  const klastersPerSekolah = useMemo(() => {
    const map = new Map<string, KlasterListItem[]>();
    for (const k of daftarKlaster) {
      const list = map.get(k.sekolah_npsn);
      if (list) list.push(k);
      else map.set(k.sekolah_npsn, [k]);
    }
    return map;
  }, [daftarKlaster]);

  /** Distribusi klaster per kategori. */
  const sebaranKategori = useMemo(() => {
    const tally = new Map<string, number>();
    for (const k of daftarKlaster) tally.set(k.kategori, (tally.get(k.kategori) ?? 0) + 1);
    const max = Math.max(...tally.values(), 1);
    return [...tally.entries()]
      .map(([kategori, jumlah]) => ({ kategori, jumlah, persen: Math.round((jumlah / max) * 100) }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [daftarKlaster]);

  /** Distribusi tingkat urgensi klaster untuk Donut Chart. */
  const distribusiUrgensi = useMemo(() => {
    let kritis = 0;
    let sedang = 0;
    let rendah = 0;
    for (const k of klastersPrioritas) {
      if (k.skor_prioritas >= 70) kritis += 1;
      else if (k.skor_prioritas >= 40) sedang += 1;
      else rendah += 1;
    }
    const total = Math.max(kritis + sedang + rendah, 1);
    return {
      kritis,
      sedang,
      rendah,
      totalRaw: kritis + sedang + rendah,
      items: [
        {
          label: "Kritis / Mendesak",
          count: kritis,
          pct: Math.round((kritis / total) * 100),
          color: "#0B3052",
          dotClass: "bg-[#0B3052]",
        },
        {
          label: "Perhatian Sedang",
          count: sedang,
          pct: Math.round((sedang / total) * 100),
          color: "#2563EB",
          dotClass: "bg-blue-600",
        },
        {
          label: "Prioritas Rendah",
          count: rendah,
          pct: Math.round((rendah / total) * 100),
          color: "#93C5FD",
          dotClass: "bg-blue-300",
        },
      ],
    };
  }, [klastersPrioritas]);

  /** Daftar top 4 isu prioritas untuk panel kanan bawah. */
  const topPrioritasList = useMemo(() => klastersPrioritas.slice(0, 4), [klastersPrioritas]);

  const klasterTerfilter = useMemo(() => {
    let base = klastersPrioritas;
    if (filterKlaster === "belum") {
      base = base.filter((k) => k.status_verifikasi !== "terverifikasi");
    } else if (filterKlaster === "terverifikasi") {
      base = base.filter((k) => k.status_verifikasi === "terverifikasi");
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (k) =>
          k.sekolah_nama.toLowerCase().includes(q) ||
          (k.label ?? "").toLowerCase().includes(q) ||
          k.kategori.toLowerCase().includes(q),
      );
    }
    return base;
  }, [klastersPrioritas, filterKlaster, searchQuery]);

  const handleFilterKlaster = (val: FilterKlaster) => {
    setFilterKlaster(val);
    setPageKlaster(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPageKlaster(1);
  };

  const totalPagesKlaster = Math.max(1, Math.ceil(klasterTerfilter.length / ITEMS_PER_PAGE));
  const currentPageKlaster = Math.min(Math.max(1, pageKlaster), totalPagesKlaster);
  const paginatedKlasterRows = useMemo(() => {
    const start = (currentPageKlaster - 1) * ITEMS_PER_PAGE;
    return klasterTerfilter.slice(start, start + ITEMS_PER_PAGE);
  }, [klasterTerfilter, currentPageKlaster]);

  // ── Peta Sebaran Sekolah (asal: commit 74fbcca5) ──
  const klasterPerSekolahSkor = useMemo(
    () => skorTertinggiPerSekolah(daftarKlaster),
    [daftarKlaster],
  );

  const titikSekolah = useMemo(
    () =>
      daftarSekolah
        .filter((s) => typeof s.lintang === "number" && typeof s.bujur === "number")
        .map((s) => {
          const skor = klasterPerSekolahSkor.get(s.npsn) ?? 0;
          return {
            id: s.npsn,
            sekolah: s.nama,
            npsn: s.npsn,
            alamat: s.alamat,
            jenjang: s.jenjang,
            skor,
            status: statusDariSkor(skor),
            hasKlaster: klastersPerSekolah.has(s.npsn),
            lat: s.lintang as number,
            lng: s.bujur as number,
          };
        }),
    [daftarSekolah, klasterPerSekolahSkor, klastersPerSekolah],
  );

  const titikTerfilter = useMemo(
    () => filterTitikPeta(titikSekolah, { hanyaBerklaster: true }),
    [titikSekolah],
  );

  const selectedPoint = useMemo(
    () => titikTerfilter.find((p) => p.id === selectedPinId),
    [titikTerfilter, selectedPinId],
  );

  // ── Vote (F3.2) ────────────────────────────────────────────────────────────
  const voteCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of daftarKlaster) map[k.klaster_id] = k.jumlah_vote_terhitung;
    return map;
  }, [daftarKlaster]);

  const idKlasterTampil = useMemo(
    () => klasterTerfilter.map((k) => k.klaster_id).join(","),
    [klasterTerfilter],
  );

  useEffect(() => {
    if (!isAuthenticated || !idKlasterTampil) return;
    let cancelled = false;
    const ids = idKlasterTampil.split(",");
    Promise.all(
      ids.map((id) => statusVote(id).catch(() => null)),
    ).then((hasil) => {
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      hasil.forEach((s, i) => {
        if (s) next[ids[i]] = s.has_voted;
      });
      setVotedKlaster((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, idKlasterTampil]);

  useEffect(() => {
    if (!voteError) return;
    const id = setTimeout(() => setVoteError(null), 4000);
    return () => clearTimeout(id);
  }, [voteError]);

  const roleBolehVote = !!user && ROLE_BOLEH_VOTE.includes(user.role);

  const handleVote = async (klasterId: string) => {
    if (!isAuthenticated) {
      setIsVoteAuthOpen(true);
      return;
    }
    if (!roleBolehVote) {
      setVoteError("Vote hanya untuk akun warga dan komite sekolah.");
      return;
    }
    if (pendingVoteId === klasterId || votedKlaster[klasterId]) return;

    setVoteError(null);
    setPendingVoteId(klasterId);
    setVotedKlaster((prev) => ({ ...prev, [klasterId]: true }));
    try {
      await voteKlaster(klasterId);
      setVoteBoost((prev) => ({ ...prev, [klasterId]: (prev[klasterId] ?? 0) + 1 }));
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 409) {
        // Sudah pernah vote — biarkan state voted.
      } else if (apiErr?.status === 401) {
        setVotedKlaster((prev) => ({ ...prev, [klasterId]: false }));
        setIsVoteAuthOpen(true);
      } else if (apiErr?.status === 403) {
        setVotedKlaster((prev) => ({ ...prev, [klasterId]: false }));
        setVoteError("Vote hanya untuk akun warga dan komite sekolah.");
      } else {
        setVotedKlaster((prev) => ({ ...prev, [klasterId]: false }));
        setVoteError("Gagal mengirim vote. Coba lagi.");
      }
    } finally {
      setPendingVoteId(null);
    }
  };

  const sekolahDenganKlaster = useMemo(
    () => new Set(daftarKlaster.map((k) => k.sekolah_npsn)).size,
    [daftarKlaster],
  );
  const klasterTerverifikasi = useMemo(
    () => daftarKlaster.filter((k) => k.status_verifikasi === "terverifikasi").length,
    [daftarKlaster],
  );
  const totalBelumVerif = Math.max(0, totalKlaster - klasterTerverifikasi);

  const handleReportClick = (school?: { npsn: string; nama: string }) => {
    const targetUrl = school ? `/laporan/baru?sekolah=${school.npsn}` : "/laporan/baru";
    if (isAuthenticated) {
      navigate(targetUrl);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}&action=report`);
    }
  };

  const memuat = [sekolahState, klasterState].some((s) => s.status === "loading");
  const gagal = [sekolahState, klasterState].find((s) => s.status === "error");
  const muatUlang = () => {
    refetchSekolah();
    refetchKlaster();
  };

  // Hitung SVG stroke offsets untuk Donut Urgensi (putih-biru SIMAKIS)
  const donutCircumference = 2 * Math.PI * 38;
  const donutSegments = useMemo(() => {
    const total = Math.max(distribusiUrgensi.totalRaw, 1);
    let cumulative = 0;
    return distribusiUrgensi.items.map((item) => {
      const length = (item.count / total) * donutCircumference;
      const offset = -cumulative;
      cumulative += length;
      return { ...item, length, offset };
    });
  }, [distribusiUrgensi, donutCircumference]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-14">
      {/* ── Mobile Breadcrumb (mobile only) ── */}
      <MobileBreadcrumb items={[{ label: "Beranda", to: "/" }, { label: "Dashboard" }]} />

      {/* ── Top Utility Bar (Breadcrumb + Search Bar + Live Status) ── */}
      <div className="border-b border-slate-200/80 bg-white py-2.5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="font-bold text-[#0B3052] tracking-wide uppercase text-[11px] truncate">
              PORTAL RESMI AUDIT DAPODIK
            </span>
            <span className="text-slate-300">|</span>
            <span className="truncate">Kecamatan Lamongan</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari sekolah atau klaster isu…"
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors"
              />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200/70 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              {sekolahState.status === "success" ? `${totalSekolah} Sekolah Aktif` : "Memuat…"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Unified Dashboard Content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full">
        {/* ── Overview Header Row (sesuai "Here's your task overview" pada Gambar 2) ── */}
        <ScrollReveal direction="up" duration={500}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-600 block mb-0.5">
                {isAuthenticated ? `Selamat datang kembali, ${user?.nama}` : "Portal Resmi Audit Partisipatif"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B3052]">
                Ringkasan Kondisi Sarpras Wilayah
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Periksa data resmi Dapodik, peta sebaran sekolah, dan klaster aduan warga Kec. Lamongan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Link to="/tentang">Panduan Validasi</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleReportClick()}
                className="h-9 rounded-xl bg-[#0B3052] hover:bg-[#07213A] text-white text-xs font-semibold px-4 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Buat Aduan Baru
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Row 1: 4 Compact KPI Cards (sesuai Gambar 2, Warna Putih-Biru) ── */}
        <div data-coachmark="wilayah-kpi" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <ScrollReveal direction="up" delay={40} duration={500}>
            <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Total Sekolah</span>
                <span className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3052] leading-none tabular-nums">
                    {sekolahState.status === "success" ? totalSekolah : "…"}
                  </div>
                  <span className="text-[11px] font-medium text-blue-600 mt-1.5 block">
                    Terdata Dapodik
                  </span>
                </div>
                <MiniMetricBars ratio={1} accent="navy" />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100} duration={500}>
            <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Sekolah Berklaster</span>
                <span className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <School className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3052] leading-none tabular-nums">
                    {klasterState.status === "success" ? sekolahDenganKlaster : "…"}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-1.5 block tabular-nums">
                    {totalSekolah > 0
                      ? `${Math.round((sekolahDenganKlaster / totalSekolah) * 100)}% dari cakupan`
                      : "Memuat proporsi"}
                  </span>
                </div>
                <MiniMetricBars
                  ratio={totalSekolah > 0 ? sekolahDenganKlaster / totalSekolah : 0.4}
                  accent="blue"
                />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={160} duration={500}>
            <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Total Klaster Isu</span>
                <span className="h-7 w-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Layers className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3052] leading-none tabular-nums">
                    {klasterState.status === "success" ? totalKlaster : "…"}
                  </div>
                  <span className="text-[11px] font-medium text-amber-700 mt-1.5 block tabular-nums">
                    {totalBelumVerif} menunggu verifikasi
                  </span>
                </div>
                <MiniMetricBars ratio={0.65} accent="sky" />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220} duration={500}>
            <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Isu Kritis (≥70)</span>
                <span className="h-7 w-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3052] leading-none tabular-nums">
                    {prioritasState.status === "success" ? distribusiUrgensi.kritis : "…"}
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 mt-1.5 block tabular-nums">
                    {klasterTerverifikasi} klaster terverifikasi
                  </span>
                </div>
                <MiniMetricBars
                  ratio={
                    distribusiUrgensi.totalRaw > 0
                      ? distribusiUrgensi.kritis / distribusiUrgensi.totalRaw
                      : 0.3
                  }
                  accent="rose"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ── State: loading / error ── */}
        {memuat && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-2xs text-center text-sm text-slate-500">
            Memuat data sekolah &amp; klaster isu…
          </div>
        )}

        {!memuat && gagal && gagal.status === "error" && (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-8 shadow-2xs text-center space-y-3">
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
            {/* ── Row 2: 8 Cols Peta Sebaran Lebar + 4 Cols Donut Status Urgensi (sesuai Gambar 2) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left (8 cols): Peta Sebaran Wilayah Audit */}
              <ScrollReveal direction="up" delay={80} duration={550} className="lg:col-span-8 flex">
                <div
                  id="peta-sebaran-section"
                  data-coachmark="wilayah-peta"
                  className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#0B3052] flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Peta Sebaran Wilayah Audit
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Titik sebaran sekolah dengan klaster isu aktif di Kecamatan Lamongan.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <span className="flex items-center gap-1 font-medium text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt;40
                        </span>
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> 40–70
                        </span>
                        <span className="flex items-center gap-1 font-medium text-rose-700">
                          <span className="h-2 w-2 rounded-full bg-rose-600" /> &gt;70
                        </span>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2.5 rounded-lg border-slate-200 text-[#0B3052] font-semibold"
                      >
                        <Link to="/sekolah">Peta Lengkap</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Map Canvas */}
                  <div className="relative h-[240px] sm:h-[265px] w-full rounded-xl overflow-hidden border border-slate-200/90 shadow-inner">
                    <div className="hidden sm:block absolute top-2.5 right-2.5 z-[500] pointer-events-none">
                      <div className="bg-white/95 backdrop-blur-sm rounded-md border border-slate-200/80 px-2.5 py-1 text-[10px] font-mono font-medium text-slate-600 shadow-sm flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span>EPSG:4326 &middot; -7.1197&deg;, 112.4145&deg;</span>
                      </div>
                    </div>

                    <MapContainer
                      center={[-7.1197, 112.4145]}
                      zoom={13}
                      className="w-full h-full min-h-0"
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom={false}
                      onMapClick={() => setSelectedPinId(null)}
                    >
                      {titikTerfilter.map((point) => (
                        <SeverityMarker
                          key={point.id}
                          id={point.id}
                          position={[point.lat, point.lng]}
                          sekolah={point.sekolah}
                          skor={point.skor}
                          status={point.status}
                          isSelected={point.id === selectedPinId}
                          onClick={() => setSelectedPinId((prev) => (prev === point.id ? null : point.id))}
                        />
                      ))}
                    </MapContainer>

                    {/* Floating Popup Card saat pin dipilih */}
                    {selectedPoint && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:max-w-md z-[1000] rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 p-3 shadow-lg transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {selectedPoint.jenjang} &middot; NPSN: {selectedPoint.npsn}
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {selectedPoint.sekolah}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {selectedPoint.alamat}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPinId(null)}
                            className="h-5 w-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer"
                            aria-label="Tutup info"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedPoint.status === "kritis"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : selectedPoint.status === "sedang"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                          >
                            Skor: {selectedPoint.skor} (
                            {selectedPoint.status === "kritis"
                              ? "Kritis"
                              : selectedPoint.status === "sedang"
                                ? "Sedang"
                                : "Rendah"}
                            )
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              asChild
                              size="sm"
                              className="h-7 text-[11px] px-2.5 bg-[#0B3052] hover:bg-[#07213A] text-white font-medium rounded-lg cursor-pointer"
                            >
                              <Link to={`/sekolah/${selectedPoint.npsn}`}>Detail</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleReportClick({
                                  npsn: selectedPoint.npsn,
                                  nama: selectedPoint.sekolah,
                                })
                              }
                              className="h-7 text-[11px] px-2 text-[#0B3052] border-blue-200 hover:bg-blue-50 font-medium rounded-lg cursor-pointer"
                            >
                              Laporkan
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>

              {/* Right (4 cols): Donut Ring Distribusi Urgensi (sesuai "Tasks by Status" pada Gambar 2) */}
              <ScrollReveal direction="up" delay={140} duration={550} className="lg:col-span-4 flex">
                <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#0B3052] flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" />
                      Urgensi Klaster Isu
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Proporsi seluruh klaster berdasarkan tingkat prioritas.
                    </p>
                  </div>

                  {/* Donut Ring + Legend List side-by-side */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5 py-1">
                    <div className="relative h-32 w-32 shrink-0">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#EFF6FF" strokeWidth="13" />
                        {donutSegments.map((seg) =>
                          seg.count > 0 ? (
                            <circle
                              key={seg.label}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="13"
                              strokeDasharray={`${seg.length} ${donutCircumference}`}
                              strokeDashoffset={seg.offset}
                            />
                          ) : null,
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-extrabold text-[#0B3052] leading-none tabular-nums">
                          {distribusiUrgensi.totalRaw}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5">Klaster</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2.5 flex-1">
                      {distribusiUrgensi.items.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-2 text-slate-600 font-medium truncate">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${item.dotClass}`} />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                            <span className="font-bold text-[#0B3052]">{item.count}</span>
                            <span className="text-[11px] text-slate-400 w-8 text-right">{item.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Verifikasi Bar */}
                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Progres Verifikasi Dinas</span>
                      <span className="tabular-nums text-[#0B3052]">
                        {totalKlaster === 0 ? 0 : Math.round((klasterTerverifikasi / totalKlaster) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-blue-50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{
                          width: `${totalKlaster === 0 ? 0 : (klasterTerverifikasi / totalKlaster) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* ── Row 3: 8 Cols Daftar Klaster Isu + 4 Cols Stacked Kategori & Prioritas (sesuai Gambar 2) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left (8 cols): Daftar Klaster Isu Terkini */}
              <div id="daftar-klaster-section" data-coachmark="wilayah-tabel" className="lg:col-span-8 flex flex-col min-w-0">
                <ScrollReveal direction="up" duration={550} className="flex-1 flex flex-col">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4 min-w-0 flex-1 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-[#0B3052] tracking-tight">
                          Daftar Klaster Isu Terkini
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Klaster isu sarpras dengan skor prioritas tertinggi di wilayah kerja.
                        </p>
                      </div>

                      {/* Filter Chips Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {([
                          { id: "semua", label: `Semua (${totalKlaster})` },
                          { id: "belum", label: "Belum Verifikasi" },
                          { id: "terverifikasi", label: "Terverifikasi" },
                        ] as { id: FilterKlaster; label: string }[]).map((chip) => (
                          <button
                            key={chip.id}
                            onClick={() => handleFilterKlaster(chip.id)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${filterKlaster === chip.id
                              ? "bg-[#0B3052] text-white font-semibold"
                              : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                              }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {voteError && (
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <span>{voteError}</span>
                        <button
                          type="button"
                          onClick={() => setVoteError(null)}
                          aria-label="Tutup pesan"
                          className="shrink-0 font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* ── Tampilan Mobile: Accordion / Collapsible Row ── */}
                    <div className="block md:hidden divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                      {klasterTerfilter.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 px-4">
                          {totalKlaster === 0
                            ? "Belum ada klaster isu. Jalankan POST /ai/cluster untuk memproses laporan."
                            : "Tidak ada klaster yang cocok dengan filter atau pencarian."}
                        </div>
                      ) : (
                        paginatedKlasterRows.map((k) => {
                          const urgensi = labelUrgensi(k.skor_prioritas);
                          const isExpanded = expandedMobileId === k.klaster_id;
                          const sudahVote = !!votedKlaster[k.klaster_id];
                          const jumlahVote =
                            (voteCountById[k.klaster_id] ?? 0) + (voteBoost[k.klaster_id] ?? 0);

                          return (
                            <div key={k.klaster_id} className="transition-colors">
                              <div
                                onClick={() => toggleExpandMobile(k.klaster_id)}
                                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/70 select-none"
                              >
                                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold font-sans ${STATUS_VERIFIKASI_STYLE[k.status_verifikasi] ??
                                        "bg-slate-50 text-slate-700 border-slate-200"
                                        }`}
                                    >
                                      {STATUS_VERIFIKASI_LABEL[k.status_verifikasi] ?? k.status_verifikasi}
                                    </span>
                                    <span className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 border border-blue-200/60 font-sans">
                                      {k.kategori}
                                    </span>
                                  </div>

                                  <span className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                    {k.label ?? k.kategori}
                                  </span>

                                  <span className="text-[11px] text-slate-500 font-medium truncate">
                                    {k.sekolah_nama}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-center">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border font-sans ${urgensi.kelas}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {k.skor_prioritas}
                                  </span>
                                  <div
                                    className={`p-1 rounded-full text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-blue-600 bg-blue-50" : ""
                                      }`}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`grid transition-all duration-300 ease-in-out border-slate-100/80 ${isExpanded
                                  ? "grid-rows-[1fr] opacity-100 border-t"
                                  : "grid-rows-[0fr] opacity-0 border-t-0"
                                  }`}
                              >
                                <div className="overflow-hidden">
                                  <div className="px-3.5 pb-3.5 pt-2.5 bg-slate-50/70 space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-xs">
                                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                                          Tingkat Urgensi
                                        </span>
                                        <span className="font-bold text-slate-800 mt-0.5 block">
                                          {urgensi.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          Skor: {k.skor_prioritas} · {jumlahVote} vote warga
                                        </span>
                                      </div>
                                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-xs">
                                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                                          Verifikasi Dinas
                                        </span>
                                        <span className="font-bold text-slate-800 mt-0.5 block">
                                          {STATUS_VERIFIKASI_LABEL[k.status_verifikasi] ?? k.status_verifikasi}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          Kategori: {k.kategori}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleVote(k.klaster_id);
                                        }}
                                        disabled={sudahVote || pendingVoteId === k.klaster_id}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-bold transition-all ${sudahVote
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                                          : "border-slate-300 bg-white text-[#0B3052] hover:bg-blue-50 shadow-xs active:scale-98 cursor-pointer disabled:opacity-40"
                                          }`}
                                      >
                                        {pendingVoteId === k.klaster_id ? (
                                          "Memproses…"
                                        ) : sudahVote ? (
                                          <>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            Sudah Didukung ({jumlahVote})
                                          </>
                                        ) : (
                                          <>
                                            <ThumbsUp className="h-4 w-4 text-blue-600" />
                                            Dukung Isu ({jumlahVote})
                                          </>
                                        )}
                                      </button>

                                      <Link
                                        to={`/klaster/${k.klaster_id}`}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0B3052] text-white py-2 px-3.5 text-xs font-bold hover:bg-[#07213A] shadow-xs active:scale-98 transition-all"
                                      >
                                        Detail
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* ── Tampilan Desktop: Tabel Lengkap ── */}
                    <div className="hidden md:block overflow-x-auto w-full max-w-full">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                            <th className="py-2.5 pl-2 pr-2 w-auto">ISU &amp; SEKOLAH</th>
                            <th className="py-2.5 px-1.5 text-center w-28 whitespace-nowrap">KLASTER</th>
                            <th className="py-2.5 px-1.5 text-center w-32 whitespace-nowrap">VERIFIKASI</th>
                            <th className="py-2.5 px-1.5 text-center w-36 whitespace-nowrap">URGENSI</th>
                            <th className="py-2.5 pl-1.5 pr-2 text-center w-32 whitespace-nowrap">AKSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {klasterTerfilter.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                                {totalKlaster === 0
                                  ? "Belum ada klaster isu. Jalankan POST /ai/cluster untuk memproses laporan."
                                  : "Tidak ada klaster yang cocok dengan filter atau pencarian."}
                              </td>
                            </tr>
                          ) : (
                            paginatedKlasterRows.map((k) => {
                              const urgensi = labelUrgensi(k.skor_prioritas);
                              const sudahVote = !!votedKlaster[k.klaster_id];
                              const jumlahVote =
                                (voteCountById[k.klaster_id] ?? 0) + (voteBoost[k.klaster_id] ?? 0);
                              return (
                                <tr key={k.klaster_id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 pl-2 pr-2">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm block leading-snug">
                                      {k.label ?? k.kategori}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{k.sekolah_nama}</span>
                                  </td>
                                  <td className="py-3 px-1.5 text-center whitespace-nowrap">
                                    <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200/60 font-sans">
                                      {k.kategori}
                                    </span>
                                  </td>
                                  <td className="py-3 px-1.5 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold font-sans ${STATUS_VERIFIKASI_STYLE[k.status_verifikasi] ??
                                        "bg-slate-50 text-slate-700 border-slate-200"
                                        }`}
                                    >
                                      {STATUS_VERIFIKASI_LABEL[k.status_verifikasi] ?? k.status_verifikasi}
                                    </span>
                                  </td>
                                  <td className="py-3 px-1.5 text-center whitespace-nowrap">
                                    <div className="inline-flex flex-col items-center justify-center">
                                      <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold border font-sans ${urgensi.kelas}`}
                                      >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {urgensi.label}
                                      </span>
                                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 tabular-nums font-sans mt-0.5">
                                        <span>skor {k.skor_prioritas}</span>
                                        <span>·</span>
                                        <span>{jumlahVote} vote</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 pl-1.5 pr-2 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleVote(k.klaster_id)}
                                        disabled={sudahVote || pendingVoteId === k.klaster_id}
                                        title={
                                          sudahVote
                                            ? "Kamu sudah memvote klaster ini"
                                            : "Beri vote dukungan untuk isu ini"
                                        }
                                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors font-sans ${sudahVote
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                                          : "border-slate-200 bg-white text-[#0B3052] hover:bg-blue-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                          }`}
                                      >
                                        {pendingVoteId === k.klaster_id ? (
                                          "…"
                                        ) : sudahVote ? (
                                          <>
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Voted
                                          </>
                                        ) : (
                                          <>
                                            <ThumbsUp className="h-3.5 w-3.5" /> Vote
                                          </>
                                        )}
                                      </button>
                                      <Link
                                        to={`/klaster/${k.klaster_id}`}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline font-sans"
                                      >
                                        Tinjau
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="tabular-nums">
                        {klasterTerfilter.length === 0 ? (
                          "0 klaster"
                        ) : (
                          <>
                            Menampilkan{" "}
                            <strong className="text-slate-700">
                              {(currentPageKlaster - 1) * ITEMS_PER_PAGE + 1}–
                              {Math.min(currentPageKlaster * ITEMS_PER_PAGE, klasterTerfilter.length)}
                            </strong>{" "}
                            dari <strong className="text-slate-700">{klasterTerfilter.length}</strong> klaster
                          </>
                        )}
                      </span>
                      {totalPagesKlaster > 1 && (
                        <NumberedPagination
                          currentPage={currentPageKlaster}
                          totalPages={totalPagesKlaster}
                          onPageChange={setPageKlaster}
                        />
                      )}
                      <Link to="/laporan/riwayat" className="text-xs font-bold text-[#0B3052] hover:underline">
                        Lihat riwayat laporan
                      </Link>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Right (4 cols): 2 Stacked Side Cards (disembunyikan di mobile < lg) */}
              <div className="hidden lg:block lg:col-span-4 space-y-5 min-w-0">
                {/* Card 1: Sebaran Klaster per Kategori */}
                <ScrollReveal direction="up" delay={120} duration={550}>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B3052]">Sebaran per Kategori</h3>
                        <span className="text-[11px] text-slate-400">{totalKlaster} total klaster</span>
                      </div>
                      <Link
                        to="/klaster"
                        className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                      >
                        Lihat semua
                      </Link>
                    </div>

                    {sebaranKategori.length === 0 ? (
                      <p className="text-xs text-slate-500">Belum ada data kategori.</p>
                    ) : (
                      <div className="space-y-3">
                        {sebaranKategori.map((item) => (
                          <div key={item.kategori} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="font-mono text-slate-600 truncate min-w-0">{item.kategori}</span>
                              <span className="font-bold text-[#0B3052] tabular-nums shrink-0">
                                {item.jumlah}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-blue-50 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#0B3052]"
                                style={{ width: `${item.persen}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 leading-relaxed">
                      Kategori &ldquo;belum_terklasifikasi&rdquo; menampung laporan di luar ambang klasterisasi.
                    </p>
                  </div>
                </ScrollReveal>

                {/* Card 2: Prioritas Tertinggi (sesuai Recent Activity / Side Card bawah di Gambar 2) */}
                <ScrollReveal direction="up" delay={180} duration={550}>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B3052]">Prioritas Tertinggi</h3>
                        <span className="text-[11px] text-slate-400">Urutan skor tertinggi saat ini</span>
                      </div>
                      <Link
                        to="/sekolah"
                        className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                      >
                        Direktori
                      </Link>
                    </div>

                    {topPrioritasList.length === 0 ? (
                      <p className="text-xs text-slate-500">Belum ada klaster prioritas.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {topPrioritasList.map((item) => {
                          const urg = labelUrgensi(item.skor_prioritas);
                          return (
                            <Link
                              key={item.klaster_id}
                              to={`/klaster/${item.klaster_id}`}
                              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate transition-colors">
                                  {item.label ?? item.kategori}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {item.sekolah_nama}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${urg.kelas}`}
                              >
                                {item.skor_prioritas}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </>
        )}
      </div>

      <AuthRequiredModal
        open={isVoteAuthOpen}
        onOpenChange={setIsVoteAuthOpen}
        redirectUrl="/dashboard"
      />
    </div>
  );
}
