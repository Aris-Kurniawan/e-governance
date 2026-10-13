import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import { useAuth } from "@/context/AuthContext"
import { useFetch } from "@/hooks/useFetch"
import { riwayatLaporan } from "@/lib/api/laporan"
import { listSekolah } from "@/lib/api/sekolah"
import { isLoggedIn } from "@/lib/api/auth"
import type { RiwayatLaporanItem } from "@/lib/api/types"
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  Clock,
  RotateCw,
  LogIn,
} from "lucide-react"

/**
 * F4.1 — Riwayat Laporan & Sanggahan Sarana.
 *
 * Seluruh isi halaman berasal dari `GET /laporan/riwayat` (backend) plus
 * `GET /sekolah` untuk memetakan NPSN → nama sekolah. Sebelumnya kartu
 * laporan (REP-2026-001..003), jumlah suara NIK, catatan verifikator, dan
 * angka "3 Berkas / 33%" adalah data rekaan yang tidak ada di backend —
 * sudah dihapus (lihat CHANGELOG F4.1 §Halaman yang Masih Pakai Data Demo).
 *
 * `status_sanggahan` hanya bisa berisi `menunggu`, `divalidasi`, atau
 * `ditolak` (backend `STATUS_SANGGHAN_ENUM`).
 */

/** `page_size` maksimal 50 (backend `GET /laporan/riwayat`, `le=50`). */
const PAGE_SIZE = 50;

type TabId = "semua" | "menunggu" | "divalidasi" | "ditolak";

const TABS: { id: TabId; label: string }[] = [
  { id: "semua", label: "Semua Laporan" },
  { id: "menunggu", label: "Menunggu Validasi" },
  { id: "divalidasi", label: "Tervalidasi" },
  { id: "ditolak", label: "Ditolak" },
];

const STATUS_STYLE: Record<string, { box: string; label: string }> = {
  menunggu: {
    box: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Menunggu Validasi Dinas",
  },
  divalidasi: {
    box: "bg-emerald-50 text-emerald-800 border-emerald-200",
    label: "Tervalidasi",
  },
  ditolak: {
    box: "bg-rose-50 text-rose-800 border-rose-200",
    label: "Ditolak",
  },
};

const KONDISI_LABEL: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_sedang: "Rusak Sedang",
  rusak_berat: "Rusak Berat",
};

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RiwayatLaporan() {
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<TabId>("semua");
  const [page, setPage] = useState(1);
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false);

  const loggedIn = isLoggedIn();
  // Tanpa token, `GET /laporan/riwayat` 401 — jangan panggil sama sekali.
  const { state, refetch } = useFetch(
    () => riwayatLaporan({ page, page_size: PAGE_SIZE }),
    [loggedIn, page],
  );
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: 100 }));

  const namaSekolah = useMemo(() => {
    const map = new Map<string, string>();
    if (sekolahState.status === "success") {
      for (const s of sekolahState.data.data) map.set(s.npsn, s.nama);
    }
    return map;
  }, [sekolahState]);

  const items: RiwayatLaporanItem[] = state.status === "success" ? state.data.data : [];
  const meta = state.status === "success" ? state.data.meta : null;

  /**
   * Hitungan per tab dihitung dari data yang sudah dimuat (maks. 50 baris).
   * Backend v1 tidak menyediakan endpoint agregat status, jadi angka di
   * label tab berlaku untuk halaman ini — bukan statistik keseluruhan.
   */
  const counts = useMemo(() => {
    const base = { semua: items.length, menunggu: 0, divalidasi: 0, ditolak: 0 };
    for (const item of items) {
      if (item.status_sanggahan in base) {
        base[item.status_sanggahan as Exclude<TabId, "semua">] += 1;
      }
    }
    return base;
  }, [items]);

  const visible = useMemo(
    () => (tab === "semua" ? items : items.filter((i) => i.status_sanggahan === tab)),
    [items, tab],
  );

  const totalItems = meta?.total_items ?? 0;
  const totalPages = meta?.total_pages ?? 1;
  const firstIndex = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(page * PAGE_SIZE, totalItems);

  const handleBuatLaporanClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setIsAuthRequiredOpen(true);
    }
  };

  const gantiTab = (id: TabId) => {
    setTab(id);
    setPage(1);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Top Header Strip ── */}
      <div className="border-b border-slate-200/80 bg-white py-2.5 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 tracking-wider uppercase text-[11px]">PORTAL AUDIT RESMI SIMAKIS V2.4</span>
            <span className="text-slate-300">|</span>
            <span>WILAYAH KERJA CABANG DINAS PENDIDIKAN KAB. LAMONGAN</span>
          </div>
          {loggedIn ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> SESI AKTIF · {user?.nama ?? "Warga Terdaftar"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              <LogIn className="h-3 w-3" /> MODE TAMU — MASUK UNTUK RIWAYAT
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        {/* ── Main Header Card ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-900 border border-blue-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> REGISTRI PARTISIPASI PUBLIK
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Riwayat Laporan &amp; Sanggahan Sarana
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Pantau status validasi tiap saran yang kamu kirim ke pengelola sarpras sekolah di Kecamatan Lamongan.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-xs space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">TOTAL LAPORAN:</span>
                  <strong className="text-slate-900 font-bold tabular-nums">
                    {state.status === "success" ? `${totalItems} Berkas` : "—"}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">SEDANG DITERIMA:</span>
                  <strong className="text-amber-700 font-bold tabular-nums">{counts.menunggu}</strong>
                </div>
              </div>

              <Button asChild className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-5 py-3 h-full rounded-lg text-sm shadow-sm w-full sm:w-auto cursor-pointer">
                <Link to="/laporan/baru" onClick={handleBuatLaporanClick}>
                  <Plus className="h-4 w-4 mr-1.5" /> Buat Aduan Baru
                </Link>
              </Button>
            </div>
          </div>

          {/* Filter Tabs — count dari data nyata, bukan angka rekaan */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 overflow-x-auto">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => gantiTab(item.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    tab === item.id
                      ? "bg-[#0B3052] text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {item.label} ({counts[item.id]})
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Angka pada tab berlaku untuk {items.length} laporan yang termuat (maks. {PAGE_SIZE} per halaman) —
              backend v1 belum menyediakan endpoint agregat status.
            </p>
          </div>
        </div>

        {/* ── 2-Column Main Layout ── */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column (8 cols): Report Cards */}
          <div className="lg:col-span-8 space-y-6">
            {!loggedIn && <PanelGuest onMasuk={() => setIsAuthRequiredOpen(true)} />}

            {loggedIn && state.status === "loading" && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm text-center text-sm text-slate-500">
                Memuat riwayat laporan…
              </div>
            )}

            {loggedIn && state.status === "error" && (
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-8 shadow-sm text-center space-y-3">
                <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
                <p className="text-sm font-bold text-slate-900">Riwayat tidak dapat dimuat</p>
                <p className="text-xs text-slate-600">{state.message}</p>
                <p className="text-[11px] text-slate-500">
                  Pastikan backend berjalan di <span className="font-mono">http://localhost:8000</span>{" "}
                  (dari root repo: <span className="font-mono">npm run dev</span>).
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

            {/*
              `riwayatLaporan()` mengembalikan objek `Page<T>`, jadi `useFetch`
              selalu berstatus "success" walau `data` kosong — empty state
              ditentukan dari isi data, bukan dari status hook.
            */}
            {loggedIn && state.status === "success" && items.length === 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm text-center space-y-3">
                <FileText className="mx-auto h-6 w-6 text-slate-400" />
                <p className="text-sm font-bold text-slate-900">Belum ada laporan</p>
                <p className="text-xs text-slate-500">
                  Sampaikan temuanmu lewat tombol &ldquo;Buat Aduan Baru&rdquo;.
                </p>
              </div>
            )}

            {loggedIn && state.status === "success" && items.length > 0 && visible.length === 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm text-center space-y-2">
                <FileText className="mx-auto h-6 w-6 text-slate-400" />
                <p className="text-sm font-bold text-slate-900">
                  Tidak ada laporan berstatus &ldquo;{TABS.find((t) => t.id === tab)?.label}&rdquo;
                </p>
                <p className="text-xs text-slate-500">Pilih tab lain untuk melihat laporan yang kamu kirim.</p>
              </div>
            )}

            {visible.map((item) => {
              const status = STATUS_STYLE[item.status_sanggahan] ?? {
                box: "bg-slate-100 text-slate-700 border-slate-200",
                label: item.status_sanggahan,
              };
              const sekolah = namaSekolah.get(item.sekolah_npsn);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {item.tracking_id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border flex items-center gap-1 ${status.box}`}
                      >
                        {item.status_sanggahan === "divalidasi" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                        {status.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Diajukan: {formatTanggal(item.created_at)}
                      </span>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 shrink-0">
                      {item.kondisi_dilaporkan
                        ? `Kondisi: ${KONDISI_LABEL[item.kondisi_dilaporkan] ?? item.kondisi_dilaporkan}`
                        : "Kondisi tidak disebutkan"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {sekolah ?? `Sekolah NPSN ${item.sekolah_npsn}`}
                      {item.fasilitas_terkait ? ` — ${item.fasilitas_terkait}` : ""}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      NPSN: {item.sekolah_npsn}
                      {sekolah ? "" : " · nama sekolah belum termuat"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                      DESKRIPSI SANGGAHAN
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {item.deskripsi}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                    <span>ID: {item.id}</span>
                    <span>Status backend</span>
                  </div>
                </div>
              );
            })}

            {/* Pagination dari meta API */}
            {loggedIn && state.status === "success" && totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                <span>
                  Menampilkan {firstIndex}–{lastIndex} dari {totalItems} laporan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs text-slate-700 border-slate-200"
                  >
                    Sebelumnya
                  </Button>
                  <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#0B3052] font-bold text-white tabular-nums">
                    {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs text-slate-700 border-slate-200"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (4 cols): Panduan Status Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0B3052]" />
                <h3 className="font-bold text-slate-900 text-sm">ARTI STATUS LAPORAN</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="rounded-xl bg-amber-50/60 p-3 border border-amber-100 space-y-1">
                  <span className="font-bold text-slate-800 block">Menunggu Validasi</span>
                  <p className="text-[11px]">
                    Laporan sudah diterima dan menunggu proses pengelompokan isu oleh pipeline AI
                    (cron harian 02:00 WIB) serta pemeriksaan verifikator dinas.
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100 space-y-1">
                  <span className="font-bold text-slate-800 block">Tervalidasi</span>
                  <p className="text-[11px]">
                    Verifikator dinas menyatakan laporan sesuai dengan kondisi lapangan. Isu masuk
                    ke klaster isu dan masuk antrean prioritas penanganan.
                  </p>
                </div>
                <div className="rounded-xl bg-rose-50/60 p-3 border border-rose-100 space-y-1">
                  <span className="font-bold text-slate-800 block">Ditolak</span>
                  <p className="text-[11px]">
                    Laporan tidak dapat diverifikasi atau di luar kewenangan pemeliharaan
                    sarpras sekolah.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Sumber Data:</span>
                  <strong className="text-slate-700">GET /laporan/riwayat</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cakupan:</span>
                  <strong className="text-slate-700">Laporan milikmu</strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                <Clock className="h-5 w-5 text-blue-700" />
                <h3 className="font-bold text-blue-950 text-sm">ALUR PEMERIKSAAN</h3>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-700 list-decimal list-inside">
                <li>Kirim laporan + foto bukti (opsional).</li>
                <li>Pipeline AI mengelompokkan laporan ke klaster isu harian.</li>
                <li>Verifikator dinas memeriksa lapangan dan menetapkan status.</li>
                <li>Isu terverifikasi masuk antrean prioritas penanganan.</li>
              </ol>
              <a
                href="/tentang"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline pt-2 border-t border-blue-100 w-full"
              >
                Baca panduan validasi <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Kendala Nomor Registrasi?</h4>
                <p className="text-[11px] text-slate-500">Hubungi Tim Layanan Audit Dapodik</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Wajib Autentikasi jika Belum Login ── */}
      <AuthRequiredModal
        open={isAuthRequiredOpen}
        onOpenChange={setIsAuthRequiredOpen}
        redirectUrl="/laporan/riwayat"
      />
    </div>
  );
}

function PanelGuest({ onMasuk }: { onMasuk: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm text-center space-y-3">
      <LogIn className="mx-auto h-6 w-6 text-slate-400" />
      <p className="text-sm font-bold text-slate-900">Masuk untuk melihat riwayat laporan</p>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Riwayat hanya menampilkan laporan milik akunmu sendiri (perlindungan data pelapor).
      </p>
      <Button
        onClick={onMasuk}
        className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-9 px-4 rounded-lg"
      >
        Masuk Sekarang
      </Button>
    </div>
  );
}