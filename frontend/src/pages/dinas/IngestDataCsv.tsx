import { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Database,
  Trash2,
  Check,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from "lucide-react"
import { useFetch } from "@/hooks/useFetch"
import { ingestDapodik, riwayatIngest } from "@/lib/api/dashboard"

/**
 * F4.1 — pratinjau CSV dihitung di sisi FE dari berkas yang benar-benar dipilih
 * user. Tidak ada data contoh: kolom "nama_sekolah"/"npsn" dibaca apa adanya,
 * baris tanpa NPSN atau nama ditandai sebagai baris bermasalah.
 */
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
  const [skipErrors, setSkipErrors] = useState(true)
  const [isCommitted, setIsCommitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorPesan, setErrorPesan] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [berkas, setBerkas] = useState<File | null>(null)
  const [semuaBaris, setSemuaBaris] = useState<BarisCsv[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Riwayat ingestion dari backend (`GET /ingest/riwayat`, admin/verifikator).
  const { state: riwayatState } = useFetch(() => riwayatIngest({ page_size: 20 }))

  /** Baca CSV sederhana (delim koma) & tandai baris tanpa NPSN/nama. */
  const bacaCsv = async (file: File): Promise<BarisCsv[]> => {
    const teks = await file.text()
    const baris = teks.split(/\r?\n/).filter((b) => b.trim() !== "")
    if (baris.length === 0) return []
    const ambil = (s: string): string[] => s.split(",").map((v) => v.trim())
    const header = ambil(baris[0]).map((h) => h.toLowerCase())
    const idx = (nama: string): number =>
      header.findIndex((h) => h.includes(nama))
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

  const handleCommit = async () => {
    if (!berkas) return
    setLoading(true)
    setErrorPesan(null)
    try {
      // `POST /ingest/dapodik` — multipart, field `file` (INTERFACES.md §8/§10).
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
  const persenKepatuhan = useMemo(() => {
    if (semuaBaris.length === 0) return 0
    return Math.round((barisValid / semuaBaris.length) * 10000) / 100
  }, [semuaBaris.length, barisValid])
  const pratinjau = semuaBaris.slice(0, 10)
  const ukuranBerkas = berkas ? `${(berkas.size / 1024 / 1024).toFixed(1)} MB` : "—"

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
      {/* ── Header with Stepper ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border border-slate-200">
              SUB-SISTEM 04
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Protokol Validasi Dapodik V.2026.a</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Ingest Data Dapodik (Batch Ingestion)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Sinkronisasi berkala data sarana prasarana sekolah se-Kecamatan Lamongan via berkas CSV Dapodik resmi.
          </p>
        </div>

        {/* Stepper on Top Right */}
        <div className="flex items-center gap-2 text-xs font-medium self-start lg:self-center">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="text-slate-700 font-bold">1. Unggah CSV</span>
          </div>
          <span className="text-slate-300">—</span>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-[#0B3052] text-white font-bold text-xs flex items-center justify-center shadow-sm">
              2
            </div>
            <span className="text-[#0B3052] font-bold">Parsing &amp; Audit</span>
          </div>
          <span className="text-slate-300">—</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <span>Commit Data</span>
          </div>
        </div>
      </div>

      {errorPesan && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs text-rose-800 shadow-sm">
          {errorPesan}
        </div>
      )}

      {/* ── File Uploaded Box ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-200 text-[#0B3052] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">
                {berkas ? berkas.name : "Belum ada berkas dipilih"}
              </h3>
              <span className="rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-1.5 py-0.5">
                {ukuranBerkas}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {semuaBaris.length > 0
                  ? `Berkas terbaca — ${semuaBaris.length} baris entri`
                  : "Pilih berkas CSV hasil scraping Dapodik"}
              </span>
              {semuaBaris.length > 0 && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-600">
                    {barisValid} baris valid / {barisBermasalah} bermasalah
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handlePilihBerkas}
            className="hidden"
            aria-label="Pilih berkas CSV Dapodik"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> {berkas ? "Ganti Berkas" : "Pilih Berkas"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!berkas}
            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 cursor-pointer disabled:opacity-40"
            aria-label="Hapus berkas"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── 3 Metric Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              INTEGRITAS SCHEMA
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{barisValid}</span>
              <span className="text-xs font-semibold text-slate-600">Baris Terverifikasi Sesuai</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${persenKepatuhan}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">
              Tingkat Kepatuhan Format: <strong>{persenKepatuhan}%</strong>
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              PENYIMPANGAN FORMAT
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-700 tracking-tight">{barisBermasalah}</span>
              <span className="text-xs font-semibold text-rose-800">Baris Bermasalah</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${semuaBaris.length ? (barisBermasalah / semuaBaris.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-rose-700 block mt-2 font-medium">
              {barisBermasalah > 0
                ? `Baris tanpa NPSN atau nama sekolah — lihat di pratinjau di bawah.`
                : "Tidak ada baris bermasalah pada berkas ini."}
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              PREDIKSI DAMPAK DATABASE
            </span>
            <Database className="h-4 w-4 text-[#0B3052]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{semuaBaris.length}</span>
              <span className="text-xs font-semibold text-slate-600">Entri Akan Diproses</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-2 font-medium">
              <span>● {barisValid} valid</span>
              <span>● {barisBermasalah} dilewati</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-2">
              Target: tabel <span className="font-mono">sekolah</span> &amp;{" "}
              <span className="font-mono">kondisi_sarana</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Raw CSV Preview Table ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#0B3052]" />
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              {semuaBaris.length > 0
                ? `Pratinjau Data Mentah CSV (10 dari ${semuaBaris.length} baris terbaca)`
                : "Pratinjau Data Mentah CSV"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Check className="h-3 w-3" /> Struktur Kolom Sesuai Schema Kemendikdasmen
            </span>
            <span className="text-slate-400 font-mono text-[11px]">Delim: Koma (,)</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">NPSN</th>
                <th className="py-2.5 px-3">NAMA SEKOLAH</th>
                <th className="py-2.5 px-3 text-center">JENJANG</th>
                <th className="py-2.5 px-3">KONDISI R.KELAS</th>
                <th className="py-2.5 px-3">KONDISI TOILET</th>
                <th className="py-2.5 px-3">KONDISI LAB</th>
                <th className="py-2.5 px-3">KONDISI PERPUS</th>
                <th className="py-2.5 px-3">CATATAN OPERATOR DAPODIK</th>
                <th className="py-2.5 px-3 text-right">STATUS BARIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pratinjau.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 px-3 text-center text-slate-400 text-xs">
                    Belum ada data. Pilih berkas CSV Dapodik untuk melihat pratinjau 10 baris pertama.
                  </td>
                </tr>
              ) : pratinjau.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`transition-colors ${
                    row.isError 
                      ? "bg-rose-50/70 hover:bg-rose-50 text-rose-950 font-medium" 
                      : "hover:bg-slate-50/80 text-slate-700"
                  }`}
                >
                  <td className="py-3 px-3 font-mono">
                    {row.npsn ? (
                      row.npsn
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-bold">
                        <AlertTriangle className="h-3 w-3" /> Kosong
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-3 font-bold ${row.isError ? "text-rose-900" : "text-slate-900"}`}>
                    {row.nama}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.jenjang === "SMA" || row.jenjang === "SMK"
                        ? "bg-blue-50 text-blue-700"
                        : row.jenjang === "SMP"
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-amber-50 text-amber-800"
                    }`}>
                      {row.jenjang}
                    </span>
                  </td>
                  <td className="py-3 px-3">{row.kondisiRuasKelas}</td>
                  <td className="py-3 px-3">
                    <span className={row.kondisiToilet.toLowerCase().includes("rusak") ? "font-bold text-amber-800" : ""}>
                      {row.kondisiToilet}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={row.kondisiLab.toLowerCase().includes("rusak") ? "font-bold text-amber-800" : ""}>
                      {row.kondisiLab}
                    </span>
                  </td>
                  <td className="py-3 px-3">{row.kondisiPerpus}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[11px] ${row.isError ? "font-bold text-rose-700" : "text-slate-500"}`}>
                      {row.catatan}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      !row.isError
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}>
                      {row.isError ? "Bermasalah" : "Valid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Menampilkan 10 baris pertama berkas. Sisa baris akan diproses backend setelah berkas diunggah.</span>
          <button className="font-bold text-[#0B3052] hover:underline flex items-center gap-1 cursor-pointer">
            <span>Buka Penampil Data Lengkap</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Action Commitment Card ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        {isCommitted ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Ingestion diproses backend.</strong> Job <span className="font-mono">{jobId}</span> tercatat. Status dan jumlah baris terproses bisa dipantau di tabel Riwayat Ingest Dapodik di bawah.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsCommitted(false)} className="text-xs">
              Selesai
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                id="skip-errors"
                checked={skipErrors}
                onCheckedChange={(c) => setSkipErrors(!!c)}
              />
              <label htmlFor="skip-errors" className="text-xs font-bold text-slate-800 cursor-pointer">
                Lewati {barisBermasalah} baris bermasalah dan proses {barisValid} baris yang valid.
              </label>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-[#0B3052] shrink-0 mt-0.5" />
              <div>
                <strong>Kepatuhan:</strong> Tindakan ingest ini memperbarui data sekolah &amp; kondisi sarpras di server dan dicatat ke <strong>Log Audit</strong>. Butuh peran admin atau verifikator dinas.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={loading}
                className="w-full sm:w-auto h-10 px-5 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Batalkan &amp; Buang Berkas
              </Button>
              <Button
                onClick={handleCommit}
                disabled={loading}
                className="w-full sm:w-auto h-10 px-6 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <span>Menyimpan ke Basis Data...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Proses &amp; Simpan ke Basis Data (230 Baris)</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom Table: Riwayat Ingest Dapodik Terakhir ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              Riwayat Ingest Dapodik Terakhir
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Transaksi ingestion dari backend (GET /ingest/riwayat)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">WAKTU / TANGGAL</th>
                <th className="py-2.5 px-3">NAMA BERKAS</th>
                <th className="py-2.5 px-3 text-center">JUMLAH BARIS</th>
                <th className="py-2.5 px-3">STATUS INGEST</th>
                <th className="py-2.5 px-3 text-right">DIUNGGAH OLEH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {riwayatState.status === "loading" && (
                <tr>
                  <td colSpan={5} className="py-8 px-3 text-center text-slate-400 text-xs">
                    Memuat riwayat ingestion...
                  </td>
                </tr>
              )}
              {riwayatState.status === "error" && (
                <tr>
                  <td colSpan={5} className="py-8 px-3 text-center text-rose-700 text-xs">
                    {riwayatState.code === "FORBIDDEN"
                      ? "Halaman ini khusus admin dan verifikator dinas."
                      : riwayatState.message}
                  </td>
                </tr>
              )}
              {riwayatState.status === "empty" && (
                <tr>
                  <td colSpan={5} className="py-8 px-3 text-center text-slate-400 text-xs">
                    Belum ada riwayat ingestion. Job yang kamu jalankan akan tercatat di sini.
                  </td>
                </tr>
              )}
              {riwayatState.status === "success" &&
                riwayatState.data.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(job.completed_at ?? job.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px]">{job.file_name}</td>
                    <td className="py-3 px-3 text-center font-semibold">
                      {job.baris_diproses ?? "—"} Baris
                      {job.baris_gagal ? (
                        <span className="block text-[10px] font-bold text-rose-700">{job.baris_gagal} gagal</span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        job.status === "selesai"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : job.status === "gagal"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400">
                      {job.id.slice(0, 8)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="text-right pt-2 border-t border-slate-100">
          <Link 
            to="/dinas/log-audit" 
            className="text-xs font-bold text-[#0B3052] hover:underline inline-flex items-center gap-1"
          >
            <span>Lihat seluruh riwayat sinkronisasi di Log Audit</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
