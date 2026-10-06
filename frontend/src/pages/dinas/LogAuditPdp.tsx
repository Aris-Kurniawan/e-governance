import { useState } from "react"
import {
  ShieldCheck,
  Search,
  Download,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Clock,
  User,
  Database,
  Key,
  FileText,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type AktivitasTipe = "NIK_ACCESS" | "VERIFIKASI" | "INGEST_CSV" | "LOGIN" | "EXPORT" | "DECRYPT_VAULT"

interface LogEntry {
  id: string
  waktu: string
  tanggal: string
  tipe: AktivitasTipe
  subyek: string
  deskripsi: string
  aktor: string
  ipAddress: string
  tsaHash: string
  status: "sukses" | "gagal" | "peringatan"
  detail?: string
}

const logEntries: LogEntry[] = [
  {
    id: "LOG-20260812-001",
    waktu: "09:15:32",
    tanggal: "12 Agu 2026",
    tipe: "NIK_ACCESS",
    subyek: "NIK 3524015809923021 (Ahmad Fauzi)",
    deskripsi: "Pembongkaran NIK terenkripsi dari PDP_VAULT untuk keperluan verifikasi tiket KLS-2026-0891",
    aktor: "Bambang H., S.T.",
    ipAddress: "192.168.1.105",
    tsaHash: "sha256:a1b2c3d4e5f6...0891",
    status: "sukses",
    detail: "Akses NIK diizinkan berdasarkan otoritas verifikator Level-2. Waktu akses terbatas 15 menit.",
  },
  {
    id: "LOG-20260812-002",
    waktu: "09:42:18",
    tanggal: "12 Agu 2026",
    tipe: "VERIFIKASI",
    subyek: "Tiket KLS-2026-0891 (SMAN 1 Sukodadi)",
    deskripsi: "Keputusan verifikasi: Mismatch Sarpras disetujui. Dokumen diteruskan ke Tim DAK Perencanaan.",
    aktor: "Bambang H., S.T.",
    ipAddress: "192.168.1.105",
    tsaHash: "sha256:b2c3d4e5f6g7...0891v",
    status: "sukses",
  },
  {
    id: "LOG-20260812-003",
    waktu: "10:05:44",
    tanggal: "12 Agu 2026",
    tipe: "INGEST_CSV",
    subyek: "dapodik_sarpras_wilayah_tengah.csv",
    deskripsi: "Upload batch data Dapodik berhasil. 142 baris diproses, 0 error terdeteksi.",
    aktor: "Bambang H., S.T.",
    ipAddress: "192.168.1.105",
    tsaHash: "sha256:c3d4e5f6g7h8...csv",
    status: "sukses",
  },
  {
    id: "LOG-20260812-004",
    waktu: "11:18:27",
    tanggal: "12 Agu 2026",
    tipe: "NIK_ACCESS",
    subyek: "NIK 3524021105944492 (Hendro Wibowo)",
    deskripsi: "Percobaan akses NIK gagal — verifikator tidak memiliki clearance untuk tiket KLS-2026-0887.",
    aktor: "Siti Aminah, M.Pd.",
    ipAddress: "192.168.1.108",
    tsaHash: "sha256:d4e5f6g7h8i9...FAIL",
    status: "gagal",
    detail: "Error: Insufficient clearance level. Required: Level-2, Current: Level-1. Insiden dicatat ke SIEM.",
  },
  {
    id: "LOG-20260812-005",
    waktu: "13:30:00",
    tanggal: "12 Agu 2026",
    tipe: "LOGIN",
    subyek: "Portal SIMAKIS v2 — Akses Admin Panel",
    deskripsi: "Login berhasil dari IP tidak terdaftar. Sesi dibatasi 30 menit dan MFA diwajibkan.",
    aktor: "Ir. Hendro Kusumo",
    ipAddress: "202.43.112.88",
    tsaHash: "sha256:e5f6g7h8i9j0...login",
    status: "peringatan",
    detail: "IP 202.43.112.88 bukan bagian dari subnet dinas yang diizinkan. Aktivitas dipantau.",
  },
  {
    id: "LOG-20260812-006",
    waktu: "14:10:55",
    tanggal: "12 Agu 2026",
    tipe: "EXPORT",
    subyek: "Laporan Skor KBM Semester Ganjil 2026",
    deskripsi: "Ekspor PDF laporan skor dampak KBM dilakukan. Dokumen ditandatangani secara digital.",
    aktor: "Bambang H., S.T.",
    ipAddress: "192.168.1.105",
    tsaHash: "sha256:f6g7h8i9j0k1...export",
    status: "sukses",
  },
  {
    id: "LOG-20260811-001",
    waktu: "14:00:11",
    tanggal: "11 Agu 2026",
    tipe: "DECRYPT_VAULT",
    subyek: "Vault KLS-2026-0887 — PDP_VAULT[bengkel_otomotif]",
    deskripsi: "Pembongkaran AES-256 vault laporan warga untuk keperluan audit teknis kelistrikan.",
    aktor: "Bambang H., S.T.",
    ipAddress: "192.168.1.105",
    tsaHash: "sha256:g7h8i9j0k1l2...vault",
    status: "sukses",
  },
  {
    id: "LOG-20260811-002",
    waktu: "08:45:19",
    tanggal: "11 Agu 2026",
    tipe: "VERIFIKASI",
    subyek: "Tiket KLS-2026-0865 (SMPN 1 Lamongan)",
    deskripsi: "Sanggahan warga ditolak dengan catatan verifikator. Alasan: bukti foto tidak memenuhi standar resolusi.",
    aktor: "Bambang H., S.T.",
    ipAddress: "192.168.1.105",
    tsaHash: "sha256:h8i9j0k1l2m3...0865",
    status: "sukses",
  },
  {
    id: "LOG-20260810-001",
    waktu: "10:02:33",
    tanggal: "10 Agu 2026",
    tipe: "INGEST_CSV",
    subyek: "dapodik_sarpras_kec_babat_v2.csv",
    deskripsi: "Upload batch gagal sebagian. 88 baris diproses, 3 error: NPSN tidak valid.",
    aktor: "Siti Aminah, M.Pd.",
    ipAddress: "192.168.1.108",
    tsaHash: "sha256:i9j0k1l2m3n4...fail2",
    status: "peringatan",
    detail: "Baris yang gagal: 12, 45, 67. NPSN kosong atau tidak terdaftar di Kemendikbud.",
  },
]

const tipeBadgeConfig: Record<AktivitasTipe, { label: string; bg: string; text: string; icon: typeof ShieldCheck }> = {
  NIK_ACCESS: { label: "NIK ACCESS", bg: "bg-purple-50", text: "text-purple-800", icon: Key },
  VERIFIKASI: { label: "VERIFIKASI", bg: "bg-blue-50", text: "text-blue-800", icon: CheckCircle2 },
  INGEST_CSV: { label: "INGEST CSV", bg: "bg-slate-100", text: "text-slate-700", icon: Database },
  LOGIN: { label: "LOGIN", bg: "bg-amber-50", text: "text-amber-800", icon: User },
  EXPORT: { label: "EXPORT", bg: "bg-emerald-50", text: "text-emerald-800", icon: FileText },
  DECRYPT_VAULT: { label: "DECRYPT VAULT", bg: "bg-rose-50", text: "text-rose-800", icon: Lock },
}

const pdpStats = [
  { label: "Total Log Entry", value: "247", color: "text-slate-900", bg: "bg-white" },
  { label: "Akses NIK Terotorisasi", value: "18", color: "text-purple-700", bg: "bg-purple-50" },
  { label: "Pelanggaran Terdeteksi", value: "3", color: "text-rose-700", bg: "bg-rose-50" },
  { label: "TSA Terverifikasi RFC-3161", value: "244", color: "text-emerald-700", bg: "bg-emerald-50" },
]

export default function LogAuditPdp() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTipe, setFilterTipe] = useState<string>("Semua")
  const [filterStatus, setFilterStatus] = useState<string>("Semua")
  const [revealedHashes, setRevealedHashes] = useState<Record<string, boolean>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  const toggleHash = (id: string) => setRevealedHashes((prev) => ({ ...prev, [id]: !prev[id] }))
  const toggleExpand = (id: string) => setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }))

  const filteredLogs = logEntries.filter((log) => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || log.subyek.toLowerCase().includes(q) || log.aktor.toLowerCase().includes(q) || log.id.toLowerCase().includes(q) || log.deskripsi.toLowerCase().includes(q)
    const matchTipe = filterTipe === "Semua" || log.tipe === filterTipe
    const matchStatus = filterStatus === "Semua" || log.status === filterStatus
    return matchSearch && matchTipe && matchStatus
  })

  const statusIcon = (status: LogEntry["status"]) => {
    if (status === "sukses") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
    if (status === "gagal") return <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
    return <Clock className="h-3.5 w-3.5 text-amber-500" />
  }

  const statusLabel: Record<LogEntry["status"], string> = {
    sukses: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    gagal: "text-rose-700 bg-rose-50 border border-rose-200",
    peringatan: "text-amber-700 bg-amber-50 border border-amber-200",
  }

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
            Log Audit & Kepatuhan PDP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan kriptografis (RFC-3161 TSA) atas seluruh aktivitas penelaahan NIK, verifikasi sarpras, dan pembongkaran vault
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Ekspor Log
          </Button>
        </div>
      </div>

      {/* PDP Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pdpStats.map((stat, idx) => (
          <div key={idx} className={`rounded-2xl border border-slate-200/80 ${stat.bg} p-5 shadow-sm space-y-2`}>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
            <div className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* PDP Compliance Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900">Status Kepatuhan PDP: <span className="text-emerald-700">COMPLIANT</span></p>
            <p className="text-[11px] text-emerald-800 mt-0.5">Seluruh akses NIK tercatat dengan tanda waktu kriptografis RFC-3161. Retensi log 5 tahun sesuai Pasal 16 UU PDP No. 27/2022.</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 block">
            CERT-PDP-SIMAKIS-2026-08A
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
            placeholder="Cari subyek, aktor, ID log, deskripsi..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="relative">
          <select value={filterTipe} onChange={(e) => setFilterTipe(e.target.value)} className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none">
            <option value="Semua">Semua Tipe</option>
            <option value="NIK_ACCESS">NIK ACCESS</option>
            <option value="VERIFIKASI">VERIFIKASI</option>
            <option value="INGEST_CSV">INGEST CSV</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
            <option value="DECRYPT_VAULT">DECRYPT VAULT</option>
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer appearance-none">
            <option value="Semua">Semua Status</option>
            <option value="sukses">Sukses</option>
            <option value="gagal">Gagal</option>
            <option value="peringatan">Peringatan</option>
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <span className="text-xs font-medium text-slate-500 shrink-0">{filteredLogs.length} entri</span>
      </div>

      {/* Log Entries */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const tipeConfig = tipeBadgeConfig[log.tipe]
          const TipeIcon = tipeConfig.icon
          const isHashRevealed = !!revealedHashes[log.id]
          const isExpanded = !!expandedLogs[log.id]

          return (
            <div
              key={log.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                log.status === "gagal"
                  ? "border-rose-200"
                  : log.status === "peringatan"
                  ? "border-amber-200"
                  : "border-slate-200/80"
              }`}
            >
              {/* Main Row */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon */}
                  <div className={`h-9 w-9 rounded-xl ${tipeConfig.bg} flex items-center justify-center shrink-0`}>
                    <TipeIcon className={`h-4 w-4 ${tipeConfig.text}`} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Top: ID, Tipe, Status, Waktu */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-100 rounded px-2 py-0.5 border border-slate-200">
                        {log.id}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${tipeConfig.bg} ${tipeConfig.text}`}>
                        <TipeIcon className="h-2.5 w-2.5" />
                        {tipeConfig.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusLabel[log.status]}`}>
                        {statusIcon(log.status)}
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {log.tanggal} · {log.waktu} WIB
                      </span>
                    </div>

                    {/* Subject */}
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{log.subyek}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{log.deskripsi}</p>
                    </div>

                    {/* Meta Row */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <strong className="text-slate-700">{log.aktor}</strong>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono">{log.ipAddress}</span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Key className="h-3 w-3 text-slate-400" />
                        {isHashRevealed ? log.tsaHash : "sha256:••••••••••••••••••••"}
                      </span>
                      <button
                        onClick={() => toggleHash(log.id)}
                        className="text-[#0B3052] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {isHashRevealed ? <><EyeOff className="h-3 w-3" /> Sembunyikan</> : <><Eye className="h-3 w-3" /> Lihat Hash</>}
                      </button>

                      {log.detail && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="ml-auto text-[#0B3052] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Filter className="h-3 w-3" />
                          {isExpanded ? "Sembunyikan Detail" : "Lihat Detail"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {log.detail && isExpanded && (
                <div className={`px-5 pb-5 pt-0 border-t ${log.status === "gagal" ? "border-rose-100 bg-rose-50/40" : log.status === "peringatan" ? "border-amber-100 bg-amber-50/40" : "border-slate-100 bg-slate-50/50"}`}>
                  <div className="pt-3 flex items-start gap-2">
                    <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${log.status === "gagal" ? "text-rose-600" : "text-amber-500"}`} />
                    <p className="text-[11px] text-slate-600 leading-relaxed">{log.detail}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredLogs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Tidak ada log yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        )}
      </div>

      {/* RFC-3161 TSA Footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#0B3052] shrink-0" />
            <span className="text-xs font-bold text-slate-700">Infrastruktur Kriptografi Audit Trail</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">RFC-3161 Timestamp Authority · AES-256-GCM PDP_VAULT</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>TSA Provider: <strong className="text-slate-700">BSSN Digital Trust CA</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
            <span>Enkripsi Vault: <strong className="text-slate-700">AES-256-GCM + HKDF Key Derivation</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0B3052] shrink-0" />
            <span>Retensi Log: <strong className="text-slate-700">5 Tahun (Pasal 16 UU PDP)</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
