import { useState } from "react"
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
import { dataCsvRawSample, riwayatIngestDapodik } from "@/mocks/dinasData"

export default function IngestDataCsv() {
  const [skipErrors, setSkipErrors] = useState(true)
  const [isCommitted, setIsCommitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCommit = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    setIsCommitted(true)
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

      {/* ── File Uploaded Box ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-200 text-[#0B3052] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">
                dapodik_sarpras_lamongan_sem_ganjil_2026.csv
              </h3>
              <span className="rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-1.5 py-0.5">
                2.4 MB
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Berkas siap diproses (Checksum MD5: 9f8a2...3b1)
              </span>
              <span>•</span>
              <span className="font-mono text-slate-600">240 Baris entri terbaca</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Ganti Berkas
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 cursor-pointer">
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
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">230</span>
              <span className="text-xs font-semibold text-slate-600">Baris Terverifikasi Sesuai</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "95.83%" }} />
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">
              Tingkat Kepatuhan Format: <strong>95.83%</strong>
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
              <span className="text-3xl font-extrabold text-rose-700 tracking-tight">10</span>
              <span className="text-xs font-semibold text-rose-800">Baris Bermasalah</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
              <div className="h-full rounded-full bg-rose-500" style={{ width: "4.17%" }} />
            </div>
            <button 
              type="button" 
              className="text-[11px] text-rose-700 hover:underline font-bold block mt-2 text-left cursor-pointer"
            >
              Lihat 10 baris bermasalah
            </button>
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
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">24</span>
              <span className="text-xs font-semibold text-slate-600">Perubahan Entitas Sekolah</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-2 font-medium">
              <span>● 4 Sekolah Baru</span>
              <span>● 20 Diperbarui</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-2">
              Target Tabel: sarpras_master_dapodik
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
              Pratinjau Data Mentah CSV (10 dari 240 baris terbaca)
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
              {dataCsvRawSample.map((row, idx) => (
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
                  <td className="py-3 px-3">{row.rKelas}</td>
                  <td className="py-3 px-3">
                    <span className={row.toilet.includes("Rusak") ? "font-bold text-amber-800" : ""}>
                      {row.toilet}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={row.lab.includes("Rusak") ? "font-bold text-amber-800" : ""}>
                      {row.lab}
                    </span>
                  </td>
                  <td className="py-3 px-3">{row.perpus}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[11px] ${row.isError ? "font-bold text-rose-700" : "text-slate-500"}`}>
                      {row.catatan}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      row.status === "Valid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Menampilkan 10 baris pertama sampel data. Terdapat 230 baris valid lainnya yang sesuai format.</span>
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
                <strong>Berhasil disimpan!</strong> 230 baris data sarpras berhasil di-ingest ke basis data master sarpras Dapodik. Log audit #ING-2026-0922 diterbitkan.
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
                Lewati 10 baris bermasalah dan proses 230 baris yang valid ke basis data master sarpras.
              </label>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-[#0B3052] shrink-0 mt-0.5" />
              <div>
                <strong>Kepatuhan:</strong> Tindakan ingest ini akan memperbarui baseline data 20 sekolah dan otomatis dicatat ke <strong>Log Audit PDP_Vault</strong> dengan tanda tangan digital verifikator.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
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
            <p className="text-xs text-slate-400 mt-0.5">5 Transaksi Sinkronisasi Terakhir</p>
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
              {riwayatIngestDapodik.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{row.waktu}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px]">{row.berkas}</td>
                  <td className="py-3 px-3 text-center font-semibold">{row.baris} Baris</td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      row.status === "Berhasil"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800">{row.pengunggah}</td>
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
