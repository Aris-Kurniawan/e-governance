import { useMemo, useState } from "react"
import {
  ShieldCheck,
  Search,
  Clock,
  User,
  AlertTriangle,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { auditLog } from "@/lib/api/dashboard"

/**
 * F4.1 — Log Audit & Kepatuhan PDP.
 *
 * Sumber data tunggal: `GET /audit/log` (`admin`, `kepala_dinas` —
 * INTERFACES.md §9). Backend mengirim field
 * `{ audit_id, aksi, actor_user_id, target, timestamp }`.
 *
 * Yang TIDAK ada di backend v1 dan karena itu dihapus dari halaman ini:
 * tipe aktivitas (`NIK_ACCESS`/`DECRYPT_VAULT`/dst.), status entri
 * (sukses/gagal/peringatan), alamat IP, hash TSA RFC-3161, nama aktor
 * (hanya `actor_user_id`), dan field `detail`. Sebelumnya halaman menampilkan
 * data rekaan; angka sertifikat dan klaim "COMPLIANT" juga dihapus karena
 * tidak ada endpoint atau tabel yang menyertainya.
 */

/** `page_size` maksimal 100 (backend `GET /audit/log`, `le=100`). */
const PAGE_SIZE = 20;

function formatWaktu(iso: string | null): { tanggal: string; jam: string } {
  if (!iso) return { tanggal: "—", jam: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { tanggal: iso, jam: "" };
  return {
    tanggal: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    jam: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

/** `aksi` dikirim backend sebagai string bebas → badge netral + teks apa adanya. */
function prettyAksi(aksi: string): string {
  return aksi.replace(/[_.]/g, " ").trim();
}

export default function LogAuditPdp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { state, refetch } = useFetch(() => auditLog({ page, page_size: PAGE_SIZE }), [page]);

  const entries = state.status === "success" ? state.data.data : [];
  const meta = state.status === "success" ? state.data.meta : null;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.audit_id, e.aksi, e.target ?? "", e.actor_user_id ?? "", e.actor_role ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [entries, searchQuery]);

  const totalItems = meta?.total_items ?? 0;
  const totalPages = meta?.total_pages ?? 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="h-4 w-4 text-[#0B3052]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kepatuhan UU PDP No. 27/2022</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Log Audit &amp; Kepatuhan PDP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Catatan aksi sensitif pada data sarpras sekolah: verifikasi klaster, perubahan status, dan ingest data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refetch}
            className="h-9 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" /> Muat Ulang
          </Button>
        </div>
      </div>

      {/* Stats — hanya angka yang benar-benar dikirim backend */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Total Entri Log</p>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {state.status === "success" ? totalItems : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Entri Halaman Ini</p>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {state.status === "success" ? entries.length : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Halaman</p>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {state.status === "success" ? `${page} / ${totalPages}` : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Sumber Data</p>
          <div className="text-3xl font-extrabold text-[#0B3052] font-mono text-xl">audit/log</div>
        </div>
      </div>

      {/* Banner — apa yang benar-benar dicatat sistem */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-950">Cakupan Log Audit</p>
            <p className="text-[11px] text-blue-900 mt-0.5">
              Setiap entri memuat <code className="font-mono">aksi</code>, <code className="font-mono">target</code>,{" "}
              <code className="font-mono">actor_user_id</code>, dan <code className="font-mono">timestamp</code>.
              Backend v1 belum mencatat alamat IP, tanda waktu kriptografis (RFC-3161), atau detail tambahan.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-mono text-[10px] text-blue-700 bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 block">
            AKSES: ADMIN · KEPALA DINAS
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 w-full min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aksi, target, ID aktor, ID log..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
        <span className="text-xs font-medium text-slate-500 shrink-0">
          {state.status === "success" ? `${filtered.length} entri tampil` : "…"}
        </span>
      </div>

      {/* State: loading / error / empty / daftar */}
      {state.status === "loading" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">Memuat log audit…</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm py-16 px-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Log audit tidak dapat dimuat</p>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">{state.message}</p>
          <p className="text-[11px] text-slate-500">
            Endpoint <code className="font-mono">GET /audit/log</code> hanya untuk role{" "}
            <strong>admin</strong> dan <strong>kepala_dinas</strong>. Backend juga harus berjalan di{" "}
            <span className="font-mono">http://localhost:8000</span>.
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
        `auditLog()` mengembalikan objek `Page<T>`, bukan array, sehingga
        `useFetch` selalu berstatus "success" walau `data` kosong. Empty state
        karena itu ditentukan di sini, bukan dari status hook.
      */}
      {state.status === "success" && entries.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 px-6 text-center space-y-2">
          <ShieldCheck className="h-10 w-10 text-slate-200 mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Belum ada entri log</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Belum ada aksi sensitif tercatat di tabel <code className="font-mono">audit_log</code>.
          </p>
        </div>
      )}

      {state.status === "success" && entries.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Tidak ada log yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((log) => {
          const waktu = formatWaktu(log.timestamp);
          const aktor = log.actor_role ?? log.actor_user_id ?? "—";
          return (
            <div key={log.audit_id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-slate-600" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-100 rounded px-2 py-0.5 border border-slate-200">
                        {log.audit_id}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {prettyAksi(log.aksi || "AKSI TIDAK DISPEKAN")}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {waktu.tanggal}
                        {waktu.jam ? ` · ${waktu.jam} WIB` : ""}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-900 block break-all">
                        {log.target || "Tanpa target"}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-mono">aksi: {log.aksi || "—"}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <strong className="text-slate-700 font-mono break-all">{aktor}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination dari meta API */}
      {state.status === "success" && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems} entri
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

      {/* Footer faktual */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0B3052] shrink-0" />
            <span className="text-xs font-bold text-slate-700">Catatan Implementasi Audit Trail</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">F3.21 · GET /audit/log</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Endpoint: <strong className="text-slate-700 font-mono">/audit/log</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
            <span>Akses: <strong className="text-slate-700">admin, kepala_dinas</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span>Retensi log: <strong className="text-slate-700">belum ditetapkan</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}