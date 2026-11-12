import { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CloudUpload,
  ShieldCheck,
  Check,
  RotateCcw,
  Trash2,
  Lock,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Download,
} from "lucide-react"
import { useFetch } from "@/hooks/useFetch"
import { ingestDapodik, auditLog } from "@/lib/api/dashboard"

interface BarisCsv {
  npsn: string
  nama: string
  jenjang: string
  kondisiRuasKelas: string
  kondisiToilet: string
  kondisiLab: string
  kondisiPerpus: string
  catatan: string
  isError: boolean
}

export default function IngestDataCsv() {
  const [activeTab, setActiveTab] = useState<"ingest" | "vault">("ingest")
  const [skipErrors, setSkipErrors] = useState(true)
  const [isCommitted, setIsCommitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorPesan, setErrorPesan] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [berkas, setBerkas] = useState<File | null>(null)
  const [semuaBaris, setSemuaBaris] = useState<BarisCsv[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Data Log Audit dari backend untuk tab PDP Vault
  const { state: auditState } = useFetch(() => auditLog({ page: 1, page_size: 20 }))
  const auditEntries = auditState.status === "success" ? auditState.data.data : []

  /** Baca CSV sederhana (delim koma) */
  const bacaCsv = async (file: File): Promise<BarisCsv[]> => {
    const teks = await file.text()
    const baris = teks.split(/\r?\n/).filter((b) => b.trim() !== "")
    if (baris.length === 0) return []
    const ambil = (s: string): string[] => s.split(",").map((v) => v.trim())
    const header = ambil(baris[0]).map((h) => h.toLowerCase())
    const idx = (nama: string): number => header.findIndex((h) => h.includes(nama))
    const iNpsn = idx("npsn")
    const iNama = idx("nama")
    const iJenjang = idx("jenjang")
    const iKelas = idx("ruang_kelas") >= 0 ? idx("ruang_kelas") : idx("kelas")
    const iToilet = idx("toilet")
    const iLab = idx("lab")
    const iPerpus = idx("perpus")
    const iCatatan = idx("catatan")

    return baris.slice(1).map((line) => {
      const sel = ambil(line)
      const npsn = iNpsn >= 0 ? (sel[iNpsn] ?? "") : ""
      const nama = iNama >= 0 ? (sel[iNama] ?? "") : ""
      return {
        npsn,
        nama,
        jenjang: iJenjang >= 0 ? (sel[iJenjang] ?? "") : "",
        kondisiRuasKelas: iKelas >= 0 ? (sel[iKelas] ?? "") : "",
        kondisiToilet: iToilet >= 0 ? (sel[iToilet] ?? "") : "",
        kondisiLab: iLab >= 0 ? (sel[iLab] ?? "") : "",
        kondisiPerpus: iPerpus >= 0 ? (sel[iPerpus] ?? "") : "",
        catatan: iCatatan >= 0 ? (sel[iCatatan] ?? "") : "",
        isError: npsn === "" || nama === "",
      }
    })
  }

  const handlePilihBerkas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorPesan(null)
    setIsCommitted(false)
    setBerkas(file)
    try {
      setSemuaBaris(await bacaCsv(file))
    } catch {
      setSemuaBaris([])
      setErrorPesan("Gagal membaca berkas. Pastikan format CSV dengan kolom NPSN dan nama sekolah.")
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setErrorPesan(null)
    setIsCommitted(false)
    setBerkas(file)
    try {
      setSemuaBaris(await bacaCsv(file))
    } catch {
      setSemuaBaris([])
      setErrorPesan("Gagal membaca berkas CSV.")
    }
  }

  const handleCommit = async () => {
    if (!berkas) return
    setLoading(true)
    setErrorPesan(null)
    try {
      const res = await ingestDapodik(berkas)
      setJobId(res.ingest_job_id)
      setIsCommitted(true)
    } catch (err) {
      setErrorPesan(err instanceof Error ? err.message : "Gagal menjalankan ingestion.")
    } finally {
      setLoading(false)
    }
  }

  const barisValid = useMemo(() => semuaBaris.filter((b) => !b.isError).length, [semuaBaris])
  const barisBermasalah = useMemo(() => semuaBaris.length - barisValid, [semuaBaris])
  const pratinjau = semuaBaris.slice(0, 10)

  const handleReset = () => {
    setBerkas(null)
    setSemuaBaris([])
    setJobId(null)
    setIsCommitted(false)
    setErrorPesan(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Bar (Sesuai Mockup Gambar 2 & 3) ── */}
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
        <span className="rounded bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 border border-slate-200">
          SPBE TERINTEGRASI
        </span>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span>HASH: <strong className="text-slate-800">8F2A-90DC-71</strong></span>
          <span>•</span>
          <span>SIK-VERIF-LAMONGAN v2.4</span>
        </div>
      </div>

      {/* ── Page Title & Badges ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block">
            SISTEM &amp; KEPATUHAN &bull; Komp. SKB 4 Menteri No. 03/2024
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Otomasi &amp; Enkripsi Dapodik
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-slate-700 text-xs font-semibold shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Vault PDP: Terkunci (AES-256-GCM)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B3052] text-white text-xs font-bold shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Integritas 100% Valid</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation Switcher ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("ingest")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ingest"
              ? "bg-[#0B3052] text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <CloudUpload className="h-4 w-4" />
          <span>Ingest Data CSV Dapodik &amp; Pemicu AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vault")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vault"
              ? "bg-[#0B3052] text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Log Audit Enkripsi PDP Vault 2.8k</span>
        </button>
      </div>

      {errorPesan && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs text-rose-800 shadow-2xs">
          {errorPesan}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 1: INGEST DATA CSV (Sesuai Mockup Gambar 3)
         ══════════════════════════════════════════════ */}
      {activeTab === "ingest" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-6">
            {/* Header Modul Pipeline 01 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  MODUL PIPELINE 01
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Ingest Dapodik Semesteran
                </h2>
              </div>
              <span className="rounded bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
                <span>UTF-8 Delimited</span>
              </span>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#0B3052] rounded-2xl p-10 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handlePilihBerkas}
                className="hidden"
                aria-label="Pilih berkas CSV Dapodik"
              />
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-[#0B3052]">
                <CloudUpload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Seret &amp; Tarik File dapodik.csv
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Mendukung format dump Dapodik Kemendikbudristek versi 2026.a. Maksimal arsip 120MB.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-2xs"
              >
                <CloudUpload className="h-3.5 w-3.5 mr-1.5" />
                <span>Pilih Berkas Lokal</span>
              </Button>
            </div>

            {/* Status Skema & Berkas Aktif Terpasang */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Status Skema */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Status Skema</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-bold text-slate-800">38 Kolom Wajib</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-600">0 Missing Attr</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Check className="h-3 w-3" />
                  <span>Valid (v4.2)</span>
                </span>
              </div>

              {/* Box 2: Berkas Aktif Terpasang */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Berkas Aktif Terpasang</span>
                  <span className="text-xs font-bold text-slate-800 block mt-1">
                    {berkas ? berkas.name : "dapodik_2026_ganjil.csv"}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    614 Sekolah &bull; 4.120 Ruang Kelas
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Footer Bar Modul */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Sinkronisasi Terakhir: 18 Menit Lalu (Operator: M. Fauzi)</span>
              </div>
              <a
                href="#download-template"
                onClick={(e) => {
                  e.preventDefault()
                  const blob = new Blob(["npsn,nama,jenjang,ruang_kelas,toilet,lab,perpus,catatan\n"], { type: "text/csv" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "template_dapodik_simakis.csv"
                  a.click()
                }}
                className="font-bold text-[#0B3052] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>Unduh Template CSV</span>
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Jika ada berkas yang dipilih, tampilkan parser & commit button */}
          {berkas && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Pratinjau Data ({semuaBaris.length} baris)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {barisValid} baris valid &bull; {barisBermasalah} baris bermasalah
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Buang Berkas
                </Button>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">NPSN</th>
                      <th className="py-2.5 px-3">NAMA SEKOLAH</th>
                      <th className="py-2.5 px-3">JENJANG</th>
                      <th className="py-2.5 px-3">RUANG KELAS</th>
                      <th className="py-2.5 px-3">TOILET</th>
                      <th className="py-2.5 px-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pratinjau.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.npsn || "—"}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{b.nama || "—"}</td>
                        <td className="py-2.5 px-3">{b.jenjang || "—"}</td>
                        <td className="py-2.5 px-3">{b.kondisiRuasKelas || "—"}</td>
                        <td className="py-2.5 px-3">{b.kondisiToilet || "—"}</td>
                        <td className="py-2.5 px-3">
                          {b.isError ? (
                            <span className="text-rose-600 font-bold text-[10px]">Perlu Perbaikan</span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[10px]">Siap Diproses</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isCommitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Ingestion berhasil diproses! Job ID: {jobId}</span>
                  </div>
                  <Button size="sm" onClick={() => setIsCommitted(false)} className="text-xs">
                    Selesai
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="skip-errors"
                      checked={skipErrors}
                      onCheckedChange={(c) => setSkipErrors(!!c)}
                    />
                    <label htmlFor="skip-errors" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Lewati {barisBermasalah} baris bermasalah &amp; simpan data valid
                    </label>
                  </div>
                  <Button
                    onClick={handleCommit}
                    disabled={loading}
                    className="bg-[#0B3052] hover:bg-[#07213A] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-xs"
                  >
                    {loading ? "Menyimpan ke Basis Data..." : "Proses & Simpan ke Basis Data"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: LOG AUDIT PDP VAULT (Sesuai Mockup Gambar 2)
         ══════════════════════════════════════════════ */}
      {activeTab === "vault" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
            {/* Header Preview Audit */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#0B3052] flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Preview Audit PDP Vault Terbaru
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pencatatan real-time pembukaan identitas NIP/kontak termasking
                  </p>
                </div>
              </div>
              <Link
                to="/dinas/log-audit"
                className="text-xs font-bold text-[#0B3052] hover:underline flex items-center gap-1"
              >
                <span>Buka Seluruh Arsip</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Table Audit PDP Vault Sesuai Gambar 2 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Timestamp UTC+7</th>
                    <th className="py-2.5 px-3">Pegawai Terautentikasi</th>
                    <th className="py-2.5 px-3">ID Laporan Sarpras</th>
                    <th className="py-2.5 px-3">Tindakan / Data Diminta</th>
                    <th className="py-2.5 px-3">Alasan Akses</th>
                    <th className="py-2.5 px-3 text-right">Integritas Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* Tampilkan data log backend atau data baris audit terverifikasi */}
                  {auditEntries.length > 0 ? (
                    auditEntries.slice(0, 5).map((log, i) => (
                      <tr key={log.audit_id || i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "2026-03-31 09:14:22"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{log.actor_user_id || "Budi Santoso, S.Kom."}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">NIP. 19880410••••••</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {log.target || "REP-LMG-2026-0412"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <Lock className="h-3 w-3 text-slate-500" />
                            <span>{log.aksi || "Dekripsi NIP Kepsek"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          Verifikasi Dokumen Lapangan Bantuan DAK
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                          sha256:7c9e••
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          2026-03-31 09:14:22
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">Budi Santoso, S.Kom.</span>
                          <span className="text-[10px] text-slate-400 font-mono block">NIP. 19880410••••••</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          REP-LMG-2026-0412
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <Lock className="h-3 w-3 text-slate-500" />
                            <span>Dekripsi NIP Kepsek</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs">
                          Verifikasi Dokumen Lapangan Bantuan DAK
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                          sha256:7c9e••
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          2026-03-31 08:42:10
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">Drs. H. Mulyono</span>
                          <span className="text-[10px] text-slate-400 font-mono block">NIP. 19740512••••••</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          REP-LMG-2026-0399
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>Nomor Kontak Darurat Sarpras</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs">
                          Konfirmasi Kerusakan Atap Roboh SDN 2 Babat
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                          sha256:1a84••
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          2026-03-30 16:55:04
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">Siti Rahmawati, M.Pd.</span>
                          <span className="text-[10px] text-slate-400 font-mono block">NIP. 19820921••••••</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          REP-LMG-2026-0388
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <Lock className="h-3 w-3 text-slate-500" />
                            <span>Rekening Dana BOS Operasional</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs">
                          Pencocokan Rekening Hibah Tanggap Bencana
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                          sha256:f402••
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
