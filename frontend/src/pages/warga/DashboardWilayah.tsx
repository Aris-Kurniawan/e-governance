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
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Clock,
  Plus,
  Lock,
  RotateCw,
  ThumbsUp,
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
const ITEMS_PER_PAGE = 10;

/** Role yang boleh memberi vote (POST /vote per D-28). */
const ROLE_BOLEH_VOTE = ["warga_umum", "warga_terverifikasi", "komite_sekolah"];

type FilterKlaster = "semua" | "belum" | "terverifikasi";

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
  const [filterKlaster, setFilterKlaster] = useState<FilterKlaster>("semua");
  const [pageKlaster, setPageKlaster] = useState<number>(1);

  // Vote (F3.2) — status per klaster + umpan balik.
  const [votedKlaster, setVotedKlaster] = useState<Record<string, boolean>>({});
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const [voteBoost, setVoteBoost] = useState<Record<string, number>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isVoteAuthOpen, setIsVoteAuthOpen] = useState(false);

  // Peta sebaran (fitur 74fbcca5 — dipulihkan setelah hilang di merge 74b5e977).
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

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

  const klasterTerfilter = useMemo(() => {
    if (filterKlaster === "belum") return klastersPrioritas.filter((k) => k.status_verifikasi !== "terverifikasi");
    if (filterKlaster === "terverifikasi") return klastersPrioritas.filter((k) => k.status_verifikasi === "terverifikasi");
    return klastersPrioritas;
  }, [klastersPrioritas, filterKlaster]);

  const handleFilterKlaster = (val: FilterKlaster) => {
    setFilterKlaster(val);
    setPageKlaster(1);
  };

  const totalPagesKlaster = Math.max(1, Math.ceil(klasterTerfilter.length / ITEMS_PER_PAGE));
  const currentPageKlaster = Math.min(Math.max(1, pageKlaster), totalPagesKlaster);
  const paginatedKlasterRows = useMemo(() => {
    const start = (currentPageKlaster - 1) * ITEMS_PER_PAGE;
    return klasterTerfilter.slice(start, start + ITEMS_PER_PAGE);
  }, [klasterTerfilter, currentPageKlaster]);

  // ── Peta Sebaran Sekolah (asal: commit 74fbcca5) ──
  /** Skor prioritas tertinggi per sekolah — menentukan warna pin. */
  const klasterPerSekolahSkor = useMemo(
    () => skorTertinggiPerSekolah(daftarKlaster),
    [daftarKlaster],
  );

  /** Titik peta dari koordinat Dapodik — `null` koordinat tidak dipetakan. */
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

  /**
   * Samakan dengan Peta Sebaran: sekolah tanpa klaster tidak dipetakan.
   * `skor_prioritas` tidak punya nilai 0 — pin "0" lama berarti "belum ada
   * klaster", bukan kasus tanpa prioritas.
   */
  const titikTerfilter = useMemo(
    () => filterTitikPeta(titikSekolah, { hanyaBerklaster: true }),
    [titikSekolah],
  );

  const selectedPoint = useMemo(
    () => titikTerfilter.find((p) => p.id === selectedPinId),
    [titikTerfilter, selectedPinId],
  );

  // ── Vote (F3.2) ────────────────────────────────────────────────────────────
  /** `dashboard/prioritas` tidak mengirim jumlah vote → ambil dari `GET /klaster`. */
  const voteCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of daftarKlaster) map[k.klaster_id] = k.jumlah_vote_terhitung;
    return map;
  }, [daftarKlaster]);

  const idKlasterTampil = useMemo(
    () => klasterTerfilter.map((k) => k.klaster_id).join(","),
    [klasterTerfilter],
  );

  // Status vote hanya bisa ditanyakan saat login (endpoint butuh token).
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

  // Pesan error vote hilang sendiri setelah 4 detik.
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
    setVotedKlaster((prev) => ({ ...prev, [klasterId]: true })); // optimistic
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

  const handleReportClick = (school?: { npsn: string; nama: string }) => {
    if (!isAuthenticated) {
      const destination = school
        ? `/laporan/baru?sekolah=${school.npsn}`
        : "/laporan/baru";
      navigate(`/login?redirect=${encodeURIComponent(destination)}`);
    } else if (school) {
      navigate(`/laporan/baru?sekolah=${school.npsn}`);
    } else {
      navigate("/laporan/baru");
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
            {/* ── Daftar Klaster Isu Terkini & Widgets (D-27) ── */}
            <div className="grid gap-8 lg:grid-cols-12 items-start">
              <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daftar Klaster Isu Terkini</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Klaster isu sarpras dengan skor prioritas tertinggi di wilayah kerja.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleReportClick()}
                      className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-sm cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Buat Aduan Baru
                    </Button>
                  </div>
                </div>

                {/* Filter Chips Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {([
                      { id: "semua", label: `Semua Klaster (${totalKlaster})` },
                      { id: "belum", label: "Belum Terverifikasi" },
                      { id: "terverifikasi", label: "Terverifikasi" },
                    ] as { id: FilterKlaster; label: string }[]).map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => handleFilterKlaster(chip.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          filterKlaster === chip.id
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
  
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        <th className="py-3 pl-3 pr-2 w-auto">ISU &amp; SEKOLAH</th>
                        <th className="py-3 px-1.5 text-center w-28 whitespace-nowrap">KLASTER ISU</th>
                        <th className="py-3 px-1.5 text-center w-32 whitespace-nowrap">STATUS VERIFIKASI</th>
                        <th className="py-3 px-1.5 text-center w-36 whitespace-nowrap">TINGKAT URGENSI</th>
                        <th className="py-3 pl-1.5 pr-3 text-center w-32 whitespace-nowrap">AKSI</th>
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
                        paginatedKlasterRows.map((k) => {
                          const urgensi = labelUrgensi(k.skor_prioritas);
                          const sudahVote = !!votedKlaster[k.klaster_id];
                          const jumlahVote =
                            (voteCountById[k.klaster_id] ?? 0) + (voteBoost[k.klaster_id] ?? 0);
                          return (
                            <tr key={k.klaster_id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 pl-3 pr-2">
                                <span className="font-bold text-slate-900 text-sm block leading-snug">{k.label ?? k.kategori}</span>
                                <span className="text-[11px] text-slate-400">{k.sekolah_nama}</span>
                              </td>
                              <td className="py-3.5 px-1.5 text-center whitespace-nowrap">
                                <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200/60 font-sans">
                                  {k.kategori}
                                </span>
                              </td>
                              <td className="py-3.5 px-1.5 text-center whitespace-nowrap">
                                <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold font-sans ${STATUS_VERIFIKASI_STYLE[k.status_verifikasi] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
                                  {STATUS_VERIFIKASI_LABEL[k.status_verifikasi] ?? k.status_verifikasi}
                                </span>
                              </td>
                              <td className="py-3.5 px-1.5 text-center whitespace-nowrap">
                                <div className="inline-flex flex-col items-center justify-center">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold border font-sans ${urgensi.kelas}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> {urgensi.label}
                                  </span>
                                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 tabular-nums font-sans mt-0.5">
                                    <span>skor {k.skor_prioritas}</span>
                                    <span>·</span>
                                    <span>{jumlahVote} vote</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 pl-1.5 pr-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleVote(k.klaster_id)}
                                    disabled={sudahVote || pendingVoteId === k.klaster_id}
                                    title={sudahVote ? "Kamu sudah memvote klaster ini" : "Beri vote dukungan untuk isu ini"}
                                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors font-sans ${
                                      sudahVote
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
                                    Tinjau Isu
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
  
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <span className="tabular-nums">
                    {klasterTerfilter.length === 0 ? (
                      "0 klaster"
                    ) : (
                      <>
                        Menampilkan{" "}
                        <strong className="text-slate-700">
                          {(currentPageKlaster - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPageKlaster * ITEMS_PER_PAGE, klasterTerfilter.length)}
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

                {/* Widget: Peta Sebaran Wilayah Audit (dipulihkan dari commit 74fbcca5) */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold tracking-wider text-slate-800 uppercase block">
                        SEBARAN WILAYAH AUDIT
                      </span>
                      <span className="text-[11px] text-slate-400">Peta Sebaran Faktual Sekolah</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#0B3052] border border-blue-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                      Kec. Lamongan
                    </span>
                  </div>

                  {/* Map Canvas — real Leaflet map seperti di PetaSebaranDinas */}
                  <div className="relative h-[340px] rounded-xl overflow-hidden border border-slate-200/90 shadow-inner">
                    {/* Indikator koordinat pojok peta (digeser agar tidak menghalangi tombol zoom) */}
                    <div className="absolute top-2.5 left-14 sm:left-16 z-[500] pointer-events-none">
                      <div className="bg-white/95 backdrop-blur-sm rounded-md border border-slate-200/80 px-2.5 py-1 text-[10px] font-mono font-medium text-slate-600 shadow-sm flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        EPSG:4326 &middot; -7.1197&deg;, 112.4145&deg;
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
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[1000] rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 p-3 shadow-lg transition-all">
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedPoint.status === "kritis"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : selectedPoint.status === "sedang"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            Skor: {selectedPoint.skor} ({selectedPoint.status === "kritis" ? "Kritis" : selectedPoint.status === "sedang" ? "Sedang" : "Rendah"})
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              asChild
                              size="sm"
                              className="h-7 text-[11px] px-2.5 bg-[#0B3052] hover:bg-[#07213A] text-white font-medium rounded-lg cursor-pointer"
                            >
                              <Link to={`/sekolah/${selectedPoint.npsn}`}>
                                Detail Sekolah
                              </Link>
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

                  {/* Legend Ambang Prioritas */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                    <span className="font-semibold text-slate-600">Ambang Prioritas:</span>
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt;40
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> 40&ndash;70
                      </span>
                      <span className="flex items-center gap-1 text-rose-700 font-medium">
                        <span className="h-2 w-2 rounded-full bg-rose-600" /> &gt;70
                      </span>
                    </div>
                  </div>

                  {/* Info Statistik Bawah */}
                  <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Sekolah Terpetakan:</span>
                      <strong className="text-slate-800 font-bold">
                        {titikTerfilter.length} Sekolah
                      </strong>
                      <span className="text-slate-400 block text-[10px] mt-0.5">
                        {titikSekolah.length - titikTerfilter.length} belum memiliki klaster
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Koordinat Wilayah:</span>
                      <strong className="text-slate-800 font-bold">7.1197&deg; S, 112.4145&deg; E</strong>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="w-full text-xs h-9 text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold cursor-pointer">
                    <Link to="/sekolah">
                      Buka Direktori &amp; Peta Lengkap
                    </Link>
                  </Button>
                </div>
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