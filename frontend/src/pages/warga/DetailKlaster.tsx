import { Link, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/composite/StatusBadge"
import { klasterList, klasterDetailMap } from "@/mocks/klaster"
import {
  ChevronRight,
  ArrowLeft,
  FileText,
  CalendarDays,
  Info,
  Inbox,
} from "lucide-react"

// Label kategori klaster — konsisten dengan Kartu 3 Detail Sekolah
const KATEGORI_LABEL: Record<string, string> = {
  infrastruktur_sarana: "Infrastruktur / Sarana",
  ketersediaan_tenaga_pengajar: "Ketersediaan Tenaga Pengajar",
  lainnya: "Lainnya",
}

function prioritasLabel(skor: number): string {
  if (skor >= 70) return "Prioritas Tinggi"
  if (skor >= 40) return "Prioritas Sedang"
  return "Prioritas Rendah"
}

function prioritasBadgeCls(skor: number): string {
  if (skor >= 70) return "bg-rose-50 text-rose-800 border-rose-200"
  if (skor >= 40) return "bg-amber-50 text-amber-800 border-amber-200"
  return "bg-blue-50 text-blue-800 border-blue-200"
}

const STATUS_PENJELASAN: Record<string, string> = {
  terverifikasi:
    "Klaster telah diverifikasi oleh Verifikator Dinas dan masuk dalam daftar tindak lanjut prioritas.",
  menunggu_verifikasi:
    "Menunggu hasil verifikasi Verifikator Dinas sebelum klaster ditindaklanjuti.",
  tidak_terverifikasi:
    "Laporan dalam klaster ini belum dapat ditindaklanjuti sebagai isu valid — periksa catatan verifikasi Dinas.",
}

export default function DetailKlaster() {
  const { klasterId } = useParams<{ klasterId: string }>()
  const klaster = klasterList.find((k) => k.klaster_id === klasterId)

  if (!klaster) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-2xl font-extrabold text-slate-900">Klaster tidak ditemukan</p>
          <p className="text-sm text-slate-500">
            ID klaster <span className="font-mono font-semibold text-slate-700">{klasterId}</span> tidak terdaftar.
          </p>
          <Link to="/sekolah">
            <Button className="bg-[#0B3052] hover:bg-[#07213A] text-white text-sm cursor-pointer">
              Kembali ke Direktori Sekolah
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const detail = klasterDetailMap[klaster.klaster_id]
  const laporanAnggota = detail?.laporan_anggota ?? []

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-slate-200/80 bg-white py-3 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-1.5 font-medium min-w-0 flex-wrap">
            <Link to="/sekolah" className="text-slate-600 hover:text-[#0B3052]">Direktori Sekolah</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link to={`/sekolah/${klaster.sekolah_npsn}`} className="text-slate-600 hover:text-[#0B3052] truncate max-w-[240px]">
              {klaster.sekolah_nama}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">Klaster Isu</span>
            <span className="font-mono text-slate-400 text-[11px] ml-1">{klaster.klaster_id}</span>
          </div>

          <Link
            to={`/sekolah/${klaster.sekolah_npsn}`}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#0B3052] hover:underline shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Profil Sekolah
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {/* ── Header Klaster ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase flex-wrap">
                <span>KLASTER ISU WARGA — DINAS PENDIDIKAN KAB. LAMONGAN</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-slate-400">ID: {klaster.klaster_id}</span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {KATEGORI_LABEL[klaster.kategori] ?? klaster.kategori}
                </h1>
                <StatusBadge status={klaster.status} />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  {klaster.jumlah_laporan} laporan warga tergabung
                </span>
                <Link
                  to={`/sekolah/${klaster.sekolah_npsn}`}
                  className="flex items-center gap-1.5 font-semibold text-[#0B3052] hover:underline"
                >
                  {klaster.sekolah_nama}
                  <span className="font-mono text-slate-400 font-normal">NPSN {klaster.sekolah_npsn}</span>
                </Link>
              </div>
            </div>

            <div className={`shrink-0 rounded-xl border px-5 py-3 text-center ${prioritasBadgeCls(klaster.skor_prioritas)}`}>
              <span className="block text-[10px] font-bold tracking-wider uppercase">Skor Prioritas</span>
              <span className="block text-3xl font-extrabold leading-tight">{klaster.skor_prioritas}</span>
              <span className="block text-[11px] font-bold">{prioritasLabel(klaster.skor_prioritas)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {STATUS_PENJELASAN[klaster.status] ?? "Status klaster isu terkini."} Skor prioritas dihitung dari
              keparahan laporan dan dukungan warga — bukan domisili pelapor.
            </span>
          </div>
        </div>

        {/* ── Laporan Anggota ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Laporan Anggota Klaster</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Laporan warga terverifikasi yang digabungkan menjadi klaster ini.
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shrink-0">
              {laporanAnggota.length} dari {klaster.jumlah_laporan} laporan
            </span>
          </div>

          {laporanAnggota.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center space-y-1.5">
              <Inbox className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Detail laporan belum tersedia</p>
              <p className="text-[11px] text-slate-500">
                Rincian laporan anggota untuk klaster ini belum dimuat.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {laporanAnggota.map((lap) => (
                <li key={lap.laporan_id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-700">{lap.tracking_id}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {lap.tanggal}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{lap.deskripsi}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── CTA Laporkan Isu ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Punya ketidaksesuaian terkait isu ini?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Laporkan fakta lapangan Anda — laporan valid akan dikelompokkan ke klaster yang sama dan memperkuat
              skor prioritasnya.
            </p>
          </div>
          <Link to={`/sekolah/${klaster.sekolah_npsn}`} className="shrink-0">
            <Button className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer">
              Laporkan Isu di Sekolah Ini
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
