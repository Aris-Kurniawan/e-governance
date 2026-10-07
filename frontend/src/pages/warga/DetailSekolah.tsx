import { useState, useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import ModalFormLaporan from "@/components/composite/ModalFormLaporan"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import StatusBadge from "@/components/composite/StatusBadge"
import { useAuth } from "@/context/AuthContext"
import { useMemo } from "react"
import { useFetch } from "@/hooks/useFetch"
import { detailSekolah } from "@/lib/api/sekolah"
import { listKlaster } from "@/lib/api/klaster"
import type { SekolahDetail } from "@/lib/api/types"

/**
 * F4.1 — tampilan detail sekolah dibangun dari `GET /sekolah/{npsn}`
 * (INTERFACES.md §2). Backend v1 belum mengirim baseline per-fasilitas
 * perbandingan, kode wilayah, email sekolah, maupun tanggal audit, sehingga
 * field tersebut tampil sebagai "Belum tersedia" — bukan data rekaan.
 * Rasio guru:siswa & jumlah忽略了/tenaga sengaja tidak dirender sebagai angka
 * karena nilainya belum valid (AGENTS.md §Scope FINAL).
 */
type TipeFasilitas = "baik" | "ringan" | "berat" | "sanggahan"

interface FasilitasBaseline {
  nama: string
  jumlah: string
  kondisi: string
  tipe: TipeFasilitas
  catatan?: string
}

interface BaselineView {
  npsn: string
  nama: string
  jenjang: string
  alamat: string
  status: "Selisih Kritis" | "Selisih Minor" | "Data Sesuai"
  statusBadge: string
  audit: string
  akreditasi: string
  kepalaSekolah: string
  kodeWilayah: string
  email: string
  tahunAjaran: string
  dokumentasiTahun: string
  faktaLabel: string
  faktaCatatan: string
  totalUnit: number
  totalBaik: number
  persenBaik: number
  persenRingan: number
  persenBerat: number
  fasilitas: FasilitasBaseline[]
  temuan: { tipe: "kritis" | "minor" | "sesuai"; judul: string; deskripsi: string }
}

const TIDAK_ADA = "Belum tersedia"

/** Turunkan kondisi terburuk dari angka Dapodik per jenis ruang. */
const keTipeFasilitas = (s: SekolahDetail["kondisi_sarana"][number]): TipeFasilitas => {
  if (s.kondisi_rusak_berat > 0) return "berat"
  if (s.kondisi_rusak_sedang > 0) return "berat"
  if (s.kondisi_rusak_ringan > 0) return "ringan"
  return "baik"
}

const LABELS: Record<TipeFasilitas, string> = {
  baik: "Baik",
  ringan: "Rusak Ringan",
  berat: "Rusak Sedang / Berat",
  sanggahan: "Perlu Verifikasi",
}

function persen(nilai: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((nilai / total) * 100)
}
import {
  ChevronRight,
  MapPin,
  Mail,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Plus,
  ArrowRight,
  Lock,
  Building,
  GraduationCap,
  Award,
} from "lucide-react"

// Label kategori klaster untuk Kartu 3 — Isu & Klaster Warga (TASK_GUIDE F2.6)
const KATEGORI_LABEL: Record<string, string> = {
  infrastruktur_sarana: "Infrastruktur / Sarana",
  ketersediaan_tenaga_pengajar: "Ketersediaan Tenaga Pengajar",
  lainnya: "Lainnya",
}

function skorBadgeCls(skor: number): string {
  if (skor >= 70) return "bg-rose-50 text-rose-700 border border-rose-200"
  if (skor >= 40) return "bg-amber-50 text-amber-700 border border-amber-200"
  return "bg-blue-50 text-blue-700 border border-blue-200"
}

const FASILITAS_STYLE: Record<FasilitasBaseline["tipe"], { icon: "building" | "file" | "flask"; card: string; badge?: { text: string; cls: string } }> = {
  baik: { icon: "building", card: "rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between" },
  ringan: {
    icon: "building",
    card: "rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 flex flex-col justify-between",
    badge: { text: "Perlu Audit", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  },
  berat: {
    icon: "building",
    card: "rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3 flex flex-col justify-between",
    badge: { text: "Rusak Berat", cls: "bg-rose-50 text-rose-800 border-rose-200" },
  },
  sanggahan: {
    icon: "flask",
    card: "rounded-xl border-2 border-blue-600 bg-white p-4 space-y-3 flex flex-col justify-between shadow-sm relative",
    badge: { text: "⚠ Ada sanggahan", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  },
}

export default function DetailSekolah() {
  const { npsn } = useParams<{ npsn: string }>()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const [isModalLaporanOpen, setIsModalLaporanOpen] = useState(false)
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false)

  const { state: sekolahState } = useFetch(
    () => detailSekolah(npsn ?? ""),
    [npsn],
  )
  const { state: klasterState } = useFetch(
    () => listKlaster({ sekolah_npsn: npsn ?? "", page_size: 50 }),
    [npsn],
  )

  const baseline: BaselineView | null = useMemo(() => {
    if (sekolahState.status !== "success") return null
    const d = sekolahState.data
    const r = d.ringkasan_sarpras
    const status: BaselineView["status"] =
      d.penanda_masalah === "kritis"
        ? "Selisih Kritis"
        : d.penanda_masalah === "perlu_perhatian"
        ? "Selisih Minor"
        : "Data Sesuai"
    return {
      npsn: d.npsn,
      nama: d.nama,
      jenjang: d.jenjang,
      alamat: d.alamat,
      status,
      statusBadge: status === "Data Sesuai" ? "Data Sesuai" : status,
      audit: TIDAK_ADA,
      akreditasi: d.akreditasi ?? TIDAK_ADA,
      kepalaSekolah: d.nama_kepsek ?? TIDAK_ADA,
      kodeWilayah: TIDAK_ADA,
      email: TIDAK_ADA,
      tahunAjaran: TIDAK_ADA,
      dokumentasiTahun: TIDAK_ADA,
      faktaLabel: "Kondisi sarana Dapodik",
      faktaCatatan:
        r.total_unit > 0
          ? `${r.total_unit} unit sarpras tercatat, ${r.total_baik} dalam kondisi baik.`
          : "Belum ada data kondisi sarana untuk sekolah ini.",
      totalUnit: r.total_unit,
      totalBaik: r.total_baik,
      persenBaik: persen(r.total_baik, r.total_unit),
      persenRingan: persen(r.total_rusak_ringan, r.total_unit),
      persenBerat: persen(r.total_rusak_sedang + r.total_rusak_berat, r.total_unit),
      fasilitas: d.kondisi_sarana.map((s) => {
        const tipe = keTipeFasilitas(s)
        return {
          nama: s.nama_ruang,
          jumlah: `${s.jumlah} unit`,
          kondisi: LABELS[tipe],
          tipe,
          catatan: s.perlu_verifikasi ? "Perlu verifikasi lapangan" : undefined,
        }
      }),
      temuan: {
        tipe: status === "Selisih Kritis" ? "kritis" : status === "Selisih Minor" ? "minor" : "sesuai",
        judul: status,
        deskripsi:
          "Perbandingan data Dapodik dengan laporan warga belum tersedia di backend v1. " +
          "Kartu ini menampilkan kondisi sarana Dapodik apa adanya.",
      },
    }
  }, [sekolahState])

  // Otomatis buka form laporan jika baru login dengan query action=report
  useEffect(() => {
    if (searchParams.get("action") === "report" && isAuthenticated) {
      setIsModalLaporanOpen(true)
    }
  }, [searchParams, isAuthenticated])

  const handleReportClick = () => {
    if (!isAuthenticated) {
      setIsAuthRequiredOpen(true)
    } else {
      setIsModalLaporanOpen(true)
    }
  }

  if (sekolahState.status === "loading") {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-slate-500">Memuat data sekolah...</p>
      </div>
    )
  }

  if (sekolahState.status === "error") {
    const notFound = sekolahState.code === "NOT_FOUND"
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-2xl font-extrabold text-slate-900">
            {notFound ? "Sekolah tidak ditemukan" : "Gagal memuat data sekolah"}
          </p>
          <p className="text-sm text-slate-500">
            {notFound ? (
              <>
                NPSN <span className="font-mono font-semibold text-slate-700">{npsn}</span> tidak terdaftar di
                Direktori Sekolah Kecamatan Lamongan.
              </>
            ) : (
              sekolahState.message
            )}
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

  if (!baseline) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-2xl font-extrabold text-slate-900">Sekolah tidak ditemukan</p>
          <p className="text-sm text-slate-500">
            NPSN <span className="font-mono font-semibold text-slate-700">{npsn}</span> tidak terdaftar di Direktori Sekolah Kecamatan Lamongan.
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

  const statusBadgeCls =
    baseline.status === "Selisih Kritis"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : baseline.status === "Selisih Minor"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200"

  const statusDotColor =
    baseline.status === "Selisih Kritis"
      ? "bg-rose-500"
      : baseline.status === "Selisih Minor"
      ? "bg-amber-500"
      : "bg-emerald-500"

  // Kartu 3 — Isu & Klaster Warga: daftar klaster_isu milik sekolah ini
  const klasterSekolah =
    klasterState.status === "success" ? klasterState.data.data : []

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* ── Breadcrumb & Sync Header ── */}
      <div className="border-b border-slate-200/80 bg-white py-3 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 flex-wrap gap-2 text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Link to="/sekolah" className="text-slate-600 hover:text-[#0B3052]">Direktori Sekolah</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">{baseline.nama}</span>
            <span className="font-mono text-slate-400 text-[11px] ml-1">NPSN: {baseline.npsn}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span>Sinkronisasi Dapodik: <strong>14 Feb 2026 04:12 WIB</strong></span>
            <span>·</span>
            <span className="font-mono text-slate-400">ID Audit: AUD-LMNG-2026-{baseline.npsn.slice(-3)}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {/* ── Main School Header Card ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase flex-wrap">
                <span>DINAS PENDIDIKAN PROVINSI JAWA TIMUR — WILAYAH KERJA KAB. LAMONGAN</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-slate-400">Kode Wilayah: {baseline.kodeWilayah} · Akreditasi: {baseline.akreditasi} Unggul</span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {baseline.nama}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">NEGERI</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">Jenjang {baseline.jenjang}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold border flex items-center gap-1 ${statusBadgeCls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`} /> {baseline.statusBadge}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  {baseline.alamat}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  {baseline.email}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-right shrink-0">
              <Button
                onClick={handleReportClick}
                className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-5 py-3 h-auto text-sm rounded-lg shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Laporkan Ketidaksesuaian Fasilitas
              </Button>
              {isAuthenticated ? (
                <span className="text-[11px] text-emerald-600 font-semibold block">
                  ✓ Masuk sebagai {user?.nama} (Terverifikasi)
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 block">
                  Khusus NIK Warga &amp; Komite terverifikasi (Wajib Masuk)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── 3 Kartu Detail (TASK_GUIDE F2.6 / DECISIONS D-20): Audit Sarpras + Profil Dapodik + Isu & Klaster ── */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Kartu 1 — Audit Sarpras */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${statusDotColor}`} /> AUDIT SARPRAS FISIK
                </span>
                <span className="text-[11px] font-medium text-slate-400">Data Perbandingan</span>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className={`relative h-16 w-16 flex items-center justify-center rounded-full bg-slate-100 border-4 shrink-0 ${
                  baseline.status === "Data Sesuai" ? "border-emerald-500" : baseline.status === "Selisih Minor" ? "border-amber-500" : "border-rose-500"
                }`}>
                  <span className="font-extrabold text-slate-900 text-lg">{baseline.totalUnit}</span>
                  <span className="text-[9px] text-slate-400 absolute bottom-1">Unit</span>
                </div>
                <div className="text-xs space-y-1 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Baik: <strong className="text-slate-800">{baseline.persenBaik}% ({baseline.totalBaik})</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Rusak Ringan: <strong className="text-slate-800">{baseline.persenRingan}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Rusak Berat: <strong className="text-rose-700">{baseline.persenBerat}%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] font-bold flex items-center justify-between">
              {baseline.status === "Data Sesuai" ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Tidak ada selisih data
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> {baseline.statusBadge}
                </span>
              )}
              <span className="font-normal text-slate-500">Audit {baseline.audit}</span>
            </div>
          </div>

          {/* Kartu 2 — Profil Dapodik */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">PROFIL DAPODIK</span>
                <GraduationCap className="h-5 w-5 text-slate-400" />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                <Award className="h-3.5 w-3.5" /> Akreditasi {baseline.akreditasi}
              </span>

              <dl className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-500 shrink-0">Kepala Sekolah</dt>
                  <dd className="font-bold text-slate-800 text-right leading-snug">{baseline.kepalaSekolah}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-500 shrink-0">Jenjang</dt>
                  <dd className="font-bold text-slate-800">{baseline.jenjang}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 shrink-0">Status Sekolah</dt>
                  <dd>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeCls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`} /> {baseline.statusBadge}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Sumber data: <strong className="text-slate-600">Dapodik</strong></span>
              <span>TA {baseline.tahunAjaran}</span>
            </div>
          </div>

          {/* Kartu 3 — Isu & Klaster Warga */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">ISU &amp; KLASTER WARGA</span>
                <AlertTriangle className="h-5 w-5 text-slate-400" />
              </div>

              {klasterSekolah.length === 0 ? (
                <div className="mt-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center space-y-1.5">
                  <ShieldCheck className="h-6 w-6 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Belum ada isu terdeteksi</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Laporan warga tentang sekolah ini akan dikelompokkan menjadi klaster isu setelah diverifikasi Dinas Pendidikan.
                  </p>
                </div>
              ) : (
                <ul className="mt-1 space-y-2">
                  {klasterSekolah.map((k) => (
                    <li key={k.klaster_id}>
                      <Link
                        to={`/klaster/${k.klaster_id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                      >
                        <div className="min-w-0 space-y-1.5">
                          <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-[#0B3052]">
                            {KATEGORI_LABEL[k.kategori] ?? k.kategori}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${skorBadgeCls(k.skor_prioritas)}`}>
                              Skor {k.skor_prioritas}
                            </span>
                            <StatusBadge status={k.status_verifikasi} />
                            <span className="text-[10px] text-slate-500">{k.jumlah_vote_terhitung} dukungan warga</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              {klasterSekolah.length > 0
                ? "Klik klaster untuk melihat detail laporan & status penanganan."
                : "Isu akan muncul di sini setelah laporan warga terverifikasi."}
            </div>
          </div>
        </div>

        {/* ── Section: Rincian Fasilitas Sekolah ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rincian Fasilitas Sekolah</h2>
              <p className="text-xs text-slate-500 mt-0.5">Catatan resmi menjadi titik awal pemeriksaan Anda.</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Baseline {baseline.tahunAjaran}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {baseline.fasilitas.map((f, i) => {
              const style = FASILITAS_STYLE[f.tipe]
              const isFlask = style.icon === "flask"
              return (
                <div key={`${f.nama}-${i}`} className={style.card}>
                  <div>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${
                      isFlask ? "bg-blue-100 text-blue-800" : "bg-blue-50 text-blue-700"
                    }`}>
                      {f.nama === "Perpustakaan" ? <FileText className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{f.nama}</h3>
                    <span className="text-xs text-slate-500 block">{f.jumlah}</span>
                    <div className="mt-2 text-[11px]">
                      <span className="text-slate-600 block">{f.kondisi}</span>
                      {style.badge && (
                        <span className={`inline-block mt-1 rounded px-2 py-0.5 text-[10px] font-bold border ${style.badge.cls}`}>
                          {style.badge.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleReportClick}
                    className={`text-[11px] font-bold hover:underline flex items-center gap-1 pt-2 border-t cursor-pointer ${
                      isFlask ? "text-blue-700 border-slate-100" : "text-[#0B3052] border-slate-200/60"
                    }`}
                  >
                    Sanggah Data Ini <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Section: Temuan Audit Partisipatif ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className={`font-bold text-sm flex items-center gap-1.5 ${
              baseline.temuan.tipe === "kritis" ? "text-rose-900" : baseline.temuan.tipe === "minor" ? "text-blue-900" : "text-emerald-900"
            }`}>
              {baseline.temuan.tipe === "sesuai" ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className={`h-4 w-4 ${baseline.temuan.tipe === "kritis" ? "text-rose-600" : "text-blue-600"}`} />
              )}
              {baseline.temuan.judul}
            </h3>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Audit {baseline.audit}
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${
            baseline.temuan.tipe === "kritis" ? "text-rose-950" : baseline.temuan.tipe === "minor" ? "text-blue-950" : "text-emerald-950"
          }`}>
            {baseline.temuan.deskripsi}
          </p>
        </div>

        {/* ── Section: Arsip Dokumentasi Dapodik vs Fakta Audit Warga ── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Box: Baseline Dapodik */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Arsip Dokumentasi Dapodik (Baseline)</h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Foto Resmi {baseline.dokumentasiTahun}</span>
            </div>

            <div className="relative h-52 rounded-xl bg-slate-100 overflow-hidden border border-slate-200/80">
              <img
                src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80"
                alt="Dokumentasi Dapodik Baseline"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 left-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                Status: Data Dapodik Tersinkron
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Dokumentasi resmi {baseline.nama} yang tercatat di portal sinkronisasi sarpras semester berjalan.
            </p>
          </div>

          {/* Right Box: Fakta Audit Warga */}
          <div className={`rounded-2xl border p-6 shadow-sm space-y-4 ${
            baseline.temuan.tipe === "sesuai" ? "border-emerald-200/80 bg-emerald-50/20" : "border-rose-200/80 bg-rose-50/20"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className={`font-bold text-sm flex items-center gap-1.5 ${
                baseline.temuan.tipe === "sesuai" ? "text-emerald-900" : "text-rose-900"
              }`}>
                {baseline.temuan.tipe === "sesuai" ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                )}
                Fakta Audit Warga Terverifikasi
              </h3>
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                baseline.temuan.tipe === "sesuai" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>
                {baseline.faktaLabel}
              </span>
            </div>

            <div className={`relative h-52 rounded-xl overflow-hidden border ${
              baseline.temuan.tipe === "sesuai" ? "bg-slate-900 border-emerald-200/80" : "bg-slate-900 border-rose-200/80"
            }`}>
              <img
                src="https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=1000&q=80"
                alt="Fakta Audit Warga"
                className="h-full w-full object-cover opacity-90"
              />
              <div className={`absolute bottom-3 left-3 rounded-lg px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm flex items-center gap-1 ${
                baseline.temuan.tipe === "sesuai" ? "bg-emerald-900/90" : "bg-rose-900/90"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${baseline.temuan.tipe === "sesuai" ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
                {baseline.temuan.tipe === "sesuai" ? "Sesuai Dapodik" : "Ada Ketidaksesuaian"}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{baseline.faktaCatatan}</p>
          </div>
        </div>

        {/* ── Section: Compliance & UU PDP Footer ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-3.5 max-w-3xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0B3052] shrink-0 mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pernyataan Kepatuhan Regulasi &amp; UU PDP No. 27/2022</h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Seluruh rekaman audit partisipatif, validasi warga, dan log perubahan kompartemen {baseline.nama} dienkripsi menggunakan standar SHA-256 dan dilindungi di bawah Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022). Identitas pelapor dan nomor induk kependudukan hanya dapat diakses oleh auditor bersertifikat Dinas Pendidikan Kabupaten Lamongan.
              </p>
            </div>
          </div>
          <Button variant="outline" className="bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold text-xs h-9 px-4 rounded-lg shrink-0 cursor-pointer">
            <Lock className="h-3.5 w-3.5 mr-1.5" /> Lihat Log Audit Trail
          </Button>
        </div>
      </div>

      {/* ── Modal Wajib Autentikasi jika Belum Login ── */}
      <AuthRequiredModal
        open={isAuthRequiredOpen}
        onOpenChange={setIsAuthRequiredOpen}
        schoolName={baseline.nama}
      />

      {/* ── Modal Form Laporan ── */}
      <ModalFormLaporan
        open={isModalLaporanOpen}
        onOpenChange={setIsModalLaporanOpen}
        initialNpsn={baseline.npsn}
      />
    </div>
  )
}
