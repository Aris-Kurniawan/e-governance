import { useState } from "react"
import {
  Users,
  Database,
  Cpu,
  Search,
  RotateCw,
  Play,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from "@/components/ui/iconify-icons"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useFetch, useStatusPolling } from "@/hooks/useFetch"
import { ROLES, type Role } from "@/lib/api/types"
import { listAkun, statistikAkun, type AkunRow, type StatusVerifikasi } from "@/lib/api/users"
import { riwayatIngest, type IngestJob } from "@/lib/api/dashboard"
import { statusPipeline, triggerClustering } from "@/lib/api/klaster"

/**
 * F4.12 — Halaman Sistem (admin). Tiga panel monitoring:
 *   1. Akun     — `GET /users`, `GET /users/statistik` (baru, admin saja)
 *   2. Ingest   — `GET /ingest/riwayat` (upload ada di /dinas/ingest)
 *   3. Pipeline — `GET /ai/status` + `POST /ai/cluster` (polling 15 s)
 *
 * NIK tidak pernah ditampilkan: backend tidak mengirimnya (D-29).
 */

const ROLE_LABEL: Record<Role, string> = {
  warga_umum: "Warga Umum",
  warga_terverifikasi: "Warga Terverifikasi",
  komite_sekolah: "Komite Sekolah",
  verifikator_dinas: "Verifikator Dinas",
  kepala_dinas: "Kepala Dinas",
  admin: "Admin Sistem",
}

const STATUS_BADGE: Record<StatusVerifikasi, string> = {
  menunggu: "bg-amber-50 text-amber-700 border-amber-200",
  terverifikasi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ditolak: "bg-rose-50 text-rose-700 border-rose-200",
}

function fmtWaktu(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{value}</div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-rose-200 shadow-sm py-12 px-6 text-center space-y-3">
      <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto" />
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Coba lagi
      </Button>
    </div>
  )
}

// ── Panel 1: Akun ────────────────────────────────────────────────────────────

function PanelAkun() {
  const [q, setQ] = useState("")
  const [role, setRole] = useState<Role | "">("")
  const [status, setStatus] = useState<StatusVerifikasi | "">("")
  const [page, setPage] = useState(1)

  const stat = useFetch(() => statistikAkun(), [])
  const list = useFetch(() => listAkun({ q, role, status_verifikasi: status, page }), [q, role, status, page])

  const rows: AkunRow[] = list.state.status === "success" ? list.state.data.data : []
  const meta = list.state.status === "success" ? list.state.data.meta : null
  const s = stat.state.status === "success" ? stat.state.data : null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Akun" value={s ? s.total : "—"} hint="Seluruh role" />
        <StatCard label="Menunggu Verifikasi" value={s ? s.menunggu_verifikasi : "—"} hint="NIK menunggu ditinjau" />
        <StatCard label="Dinas" value={s ? s.per_role.verifikator_dinas + s.per_role.kepala_dinas : "—"} hint="Verifikator + Kepala Dinas" />
        <StatCard
          label="Warga & Komite"
          value={s ? s.per_role.warga_umum + s.per_role.warga_terverifikasi + s.per_role.komite_sekolah : "—"}
          hint="Warga + komite sekolah"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 w-full min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Cari nama atau email..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "")
            setPage(1)
          }}
          className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
        >
          <option value="">Semua role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusVerifikasi | "")
            setPage(1)
          }}
          className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052]"
        >
          <option value="">Semua status</option>
          <option value="menunggu">Menunggu</option>
          <option value="terverifikasi">Terverifikasi</option>
          <option value="ditolak">Ditolak</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => { stat.refetch(); list.refetch() }}>
          <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Muat ulang
        </Button>
      </div>

      {list.state.status === "loading" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">Memuat akun…</p>
        </div>
      )}

      {list.state.status === "error" && <ErrorBox message={list.state.message} onRetry={list.refetch} />}

      {(list.state.status === "empty" || (list.state.status === "success" && rows.length === 0)) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center space-y-2">
          <Users className="h-6 w-6 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Tidak ada akun yang cocok</p>
          <p className="text-xs text-slate-400">Ubah kata kunci atau filter role.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {["Nama", "Email", "Role", "Status", "NIP", "Terdaftar"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.user_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{r.nama}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">{r.email}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{ROLE_LABEL[r.role] ?? r.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                          STATUS_BADGE[r.status_verifikasi] ?? "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {r.status_verifikasi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.nip ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtWaktu(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {meta.total_items} akun · halaman {meta.page} dari {meta.total_pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        NIK tidak ditampilkan di halaman ini — backend hanya mengirim status verifikasi (D-29).
        Ubah role dan verifikasi akun belum tersedia lewat UI.
      </p>
    </div>
  )
}

// ── Panel 2: Ingest ──────────────────────────────────────────────────────────

function PanelIngest() {
  const { state, refetch } = useFetch(() => riwayatIngest({ page_size: 50 }), [])
  const jobs: IngestJob[] = state.status === "success" ? state.data : []

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-950">Riwayat Ingest Dapodik</p>
            <p className="text-[11px] text-blue-900 mt-0.5">
              Upload berkas ada di <code className="font-mono">/dinas/ingest</code>. Panel ini hanya memantau hasil job.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Muat ulang
        </Button>
      </div>

      {state.status === "loading" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">Memuat riwayat ingest…</p>
        </div>
      )}

      {state.status === "error" && <ErrorBox message={state.message} onRetry={refetch} />}

      {(state.status === "empty" || (state.status === "success" && jobs.length === 0)) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center space-y-2">
          <Database className="h-6 w-6 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Belum ada job ingest</p>
          <p className="text-xs text-slate-400">Unggah berkas Dapodik dari halaman Ingest Data CSV.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {["Berkas", "Status", "Baris diproses", "Baris gagal", "Selesai", "Dibuat"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 font-mono">{j.file_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{j.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">{j.baris_diproses ?? "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      <span className={j.baris_gagal ? "text-rose-600 font-semibold" : "text-slate-600"}>
                        {j.baris_gagal ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtWaktu(j.completed_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtWaktu(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panel 3: Pipeline AI ─────────────────────────────────────────────────────

function PanelPipeline() {
  const { state, refetch } = useStatusPolling(() => statusPipeline(), 15_000, [])
  const [busy, setBusy] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  const st = state.status === "success" ? state.data : null

  async function jalankan() {
    // ponytail: window.confirm cukup; ganti ke Dialog bila perlu alasan/audit input.
    if (!window.confirm("Jalankan pipeline klasterisasi sekarang? Proses ini menulis ulang klaster.")) return
    setBusy(true)
    setPesan(null)
    try {
      const res = await triggerClustering(false)
      setPesan(res.message || `${res.klaster_created} klaster dibuat.`)
      refetch()
    } catch {
      setPesan("Gagal menjalankan pipeline. Cek log backend.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Laporan Belum Terklaster" value={st ? st.unclustered_laporan : "—"} hint="Masuk noise / menunggu run" />
        <StatCard label="Total Klaster" value={st ? st.total_klaster : "—"} />
        <StatCard label="Run Terakhir" value={st ? fmtWaktu(st.last_run) : "—"} />
        <StatCard label="Status Run" value={st?.last_run_status ?? "—"} />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 text-[#0B3052] flex items-center justify-center shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Pipeline Klasterisasi</p>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
              TF-IDF 300 → UMAP 10 → HDBSCAN (<code className="font-mono">min_cluster_size=3, min_samples=2</code>).
              Berjalan otomatis tiap hari 02:00; tombol ini untuk run manual. Halaman ini menyegarkan tiap 15 detik.
            </p>
            {st?.message && <p className="text-[11px] text-slate-400 mt-1">{st.message}</p>}
          </div>
        </div>
        <Button onClick={jalankan} disabled={busy} className="shrink-0">
          {busy ? (
            <>
              <Clock className="h-4 w-4 mr-1.5 animate-spin" /> Menjalankan…
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1.5" /> Jalankan sekarang
            </>
          )}
        </Button>
      </div>

      {pesan && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 flex items-center gap-2">
          {pesan.startsWith("Gagal") ? (
            <XCircle className="h-4 w-4 text-rose-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          <p className="text-xs text-slate-700">{pesan}</p>
        </div>
      )}

      {state.status === "error" && <ErrorBox message={state.message} onRetry={refetch} />}
    </div>
  )
}

// ── Halaman ──────────────────────────────────────────────────────────────────

export default function SistemAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Sistem & Akun</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitoring akun pengguna, riwayat ingest Dapodik, dan status pipeline AI. Hanya admin sistem.
        </p>
      </div>

      <Tabs defaultValue="akun" className="space-y-4">
        <TabsList>
          <TabsTrigger value="akun">Akun</TabsTrigger>
          <TabsTrigger value="ingest">Ingest Dapodik</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline AI</TabsTrigger>
        </TabsList>
        <TabsContent value="akun">
          <PanelAkun />
        </TabsContent>
        <TabsContent value="ingest">
          <PanelIngest />
        </TabsContent>
        <TabsContent value="pipeline">
          <PanelPipeline />
        </TabsContent>
      </Tabs>
    </div>
  )
}
