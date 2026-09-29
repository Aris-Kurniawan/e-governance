import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import AuthRequiredModal from "@/components/composite/AuthRequiredModal"
import { useAuth } from "@/context/AuthContext"
import { 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  Download, 
  MessageSquare, 
  Copy,
  ArrowRight
} from "lucide-react"

export default function RiwayatLaporan() {
  const { isAuthenticated } = useAuth()
  const [tab, setTab] = useState<string>("semua")
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false)

  const handleBuatLaporanClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      setIsAuthRequiredOpen(true)
    }
  }

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
          <div className="flex items-center gap-2 font-medium">
            <span className="font-mono text-slate-400 text-[11px]">SESI: W-3524-2026-F98</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="h-3 w-3" /> TERAKREDITASI SIBER
            </span>
          </div>
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
                Pantau status verifikasi, klasterisasi otomatis, dan jadwal audit fisik lapangan oleh Dinas Pendidikan Kab. Lamongan secara akuntabel dan transparan.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-xs space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">TOTAL ADUAN:</span>
                  <strong className="text-slate-900 font-bold">3 Berkas</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">SELESAI AUDIT:</span>
                  <strong className="text-emerald-700 font-bold">33% (1/3)</strong>
                </div>
              </div>

              <Button asChild className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-5 py-3 h-full rounded-lg text-sm shadow-sm w-full sm:w-auto cursor-pointer">
                <Link to="/laporan/baru" onClick={handleBuatLaporanClick}>
                  <Plus className="h-4 w-4 mr-1.5" /> Buat Aduan Baru
                </Link>
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 overflow-x-auto">
            {[
              { id: "semua", label: "Semua Laporan (3)" },
              { id: "verifikasi", label: "Dalam Verifikasi (1)" },
              { id: "audit", label: "Menunggu Audit Fisik (1)" },
              { id: "selesai", label: "Selesai / Dapodik Dimutakhirkan (1)" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  tab === item.id
                    ? "bg-[#0B3052] text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2-Column Main Layout ── */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column (8 cols): Report Cards */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: REP-2026-001 (Active / In Progress) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-900 text-sm">REP-2026-001</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" /> Audit Lapangan Ditugaskan
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Hasil: 8 s/d 10d</span>
                </div>
                <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200 shrink-0">
                  Bahaya Keselamatan (Atap Plafon)
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  SMAN 1 Sukodadi — Laboratorium Kimia
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  NPSN: 20506281 · Kec. Sukodadi, Lamongan · Diajukan: 12 Februari 2026
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                  DESKRIPSI SANGGAHAN MANDIRI
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Plafon bagian tengah laboratorium kimia runtuh dengan luas kerusakan ± 4x6 meter. Terdapat rembesan air hujan langsung ke meja instrumen dan reagen kimia saat praktikum berlangsung, membahayakan 34 siswa kelas XI.
                </p>
              </div>

              {/* Validation Progress Kuorum Box */}
              <div className="rounded-xl bg-blue-50/50 p-3.5 border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-900 block">VALIDASI KOMITE WARGA:</span>
                  <span className="text-slate-600 text-[11px]">Ambang klaster terpenuhi (&gt;= 30 NIK)</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-blue-900 block">38</span>
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Suara NIK Sah</span>
                </div>
              </div>

              {/* 4-Step Stepper Timeline */}
              <div className="pt-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-3">
                  STATUS ALUR BIROKRASI DINAS
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Step 1 */}
                  <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">✓ Tahap 1: Selesai</span>
                    <strong className="text-slate-900 text-xs block">Sanggahan Diterima</strong>
                    <span className="text-[10px] text-slate-500 block">Tervalidasi 12 Feb, 14:20</span>
                  </div>

                  {/* Step 2 */}
                  <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">✓ Tahap 2: Selesai</span>
                    <strong className="text-slate-900 text-xs block">Klaster Otomatis</strong>
                    <span className="text-[10px] text-slate-500 block">38 warga mendukung</span>
                  </div>

                  {/* Step 3 (Active) */}
                  <div className="rounded-xl bg-amber-50 p-3 border-2 border-amber-500 space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" /> Tahap 3: Sedang Berjalan
                    </span>
                    <strong className="text-amber-950 text-xs block">Audit Fisik Dinas</strong>
                    <span className="text-[10px] text-amber-800 font-semibold block">Jadwal: 24 Feb 2026</span>
                  </div>

                  {/* Step 4 */}
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 opacity-60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tahap 4: Antrean</span>
                    <strong className="text-slate-700 text-xs block">Pembaruan Dapodik</strong>
                    <span className="text-[10px] text-slate-400 block">Sinkronisasi Pusat</span>
                  </div>
                </div>
              </div>

              {/* Verifier Note */}
              <div className="rounded-xl bg-slate-100 p-3.5 text-xs text-slate-700 space-y-1 border border-slate-200/60">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  💬 CATATAN TIM VERIFIKATOR SARPRAS DISDIK:
                </span>
                <p className="italic text-slate-600 text-[11px] leading-relaxed">
                  &ldquo;Tim pengawas sarpras wilayah Sukodadi telah memasukkan ke agenda inspeksi minggu ke-4 Februari. Prioritas tinggi karena menyangkut fasilitas praktikum aktif.&rdquo;
                </p>
                <span className="text-[10px] text-slate-400 block text-right font-mono">Verifikator: Ir. Bambang Hermanto (NIP: 1974...03)</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Dokumen Bukti Fisik: <strong>3 Foto (Geotagged Lamongan)</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50">
                    Lihat Berita Acara
                  </Button>
                  <Button size="sm" className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs h-8 px-3">
                    Konfirmasi Kehadiran
                  </Button>
                </div>
              </div>
            </div>

            {/* Card 2: REP-2026-002 (Completed) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">REP-2026-002</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Selesai · Dapodik Termutakhirkan
                  </span>
                </div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  SUMBER ALOKASI: BOS Reguler Pemeliharaan 2026
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  SMPN 2 Lamongan — Toilet Siswa Blok B
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  NPSN: 20506190 · Kecamatan Lamongan Kota · Diajukan: 18 Januari 2026
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                  HASIL REKONSILIASI &amp; TINDAK LANJUT
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Saluran pembuangan utama tersumbat dan kerusakan pada 6 kran air telah direvitalisasi penuh. Berita Acara Perbaikan bernomor BA-SAR/2026/081 telah ditandatangani Kepala Sekolah dan Auditor Wilayah pada 05 Februari 2026.
                </p>
              </div>

              {/* 4 Pills Completed */}
              <div className="rounded-xl bg-emerald-50/50 p-3 border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-2">
                  <span>PROSES AUDIT &amp; SINKRONISASI TUNTAS</span>
                  <span>100% Selesai (4/4 Tahap)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <span className="rounded bg-emerald-100/80 px-2 py-1 font-semibold text-emerald-900 text-center">✓ 1. Pengajuan Sah</span>
                  <span className="rounded bg-emerald-100/80 px-2 py-1 font-semibold text-emerald-900 text-center">✓ 2. Klaster 42 Suara</span>
                  <span className="rounded bg-emerald-100/80 px-2 py-1 font-semibold text-emerald-900 text-center">✓ 3. Audit Lapangan</span>
                  <span className="rounded bg-emerald-100/80 px-2 py-1 font-semibold text-emerald-900 text-center">✓ 4. Dapodik Terkini</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="font-mono text-slate-400 text-[11px]">ID Verifikasi Dapodik: DPK-LM-2026-9902-REV</span>
                <button className="text-xs font-bold text-[#0B3052] hover:underline flex items-center gap-1">
                  Unduh Salinan Digital Dapodik <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3: REP-2026-003 (Community Gathering Stage) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">REP-2026-003</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                    Tahap 2: Pengumpulan Validasi Warga
                  </span>
                </div>
                <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  Standar K3 / Kelayakan
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  SMKN 1 Lamongan — Ruang Praktik Otomotif
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  NPSN: 20506214 · Jl. Raya Deket No. 1, Lamongan · Diajukan: 02 Februari 2026
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                  DESKRIPSI MASALAH TEKNIS
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Instalasi sirkuit kelistrikan blower ventilasi gas buang tidak sesuai beban kompresor.
                </p>
              </div>

              {/* Support Progress Box */}
              <div className="rounded-xl bg-blue-50/50 p-3.5 border border-blue-100 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-blue-900">
                  <span>Dukungan NIK Masuk</span>
                  <span>14 dari 25 Target Kuorum</span>
                </div>
                <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: "56%" }} />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Perlu 11 dukungan warga sebelum verifikasi fisik otomatis dibuka.
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400">Tanggal verifikasi komite: 28 Feb 2026</span>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50">
                  <Copy className="h-3.5 w-3.5 mr-1" /> Salin Tautan Sanggahan
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Guidelines & Rules Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Widget 1: Ketentuan Suara & Validitas */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0B3052]" />
                <h3 className="font-bold text-slate-900 text-sm">KETENTUAN SUARA &amp; VALIDITAS</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 block">👤 Prinsip 1 NIK = 1 Suara Mandiri</span>
                  <p className="text-[11px]">
                    Setiap warga negara terdaftar di Dapil Lamongan berhak mengajukan 1 sanggahan valid dan memverifikasi maksimal 3 isu per siklus anggaran triwulan. Sanggahan ganda atas obyek yang sama secara otomatis dikelompokkan ke klaster induk.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 block">🔒 Kepatuhan UU PDP No. 27 Tahun 2022</span>
                  <p className="text-[11px]">
                    Nomor Induk Kependudukan (NIK) dan data biometrik Anda dienkripsi satu arah (SHA-256) serta dilindungi hukum negara. Data warga tidak dipublikasikan ke pihak sekolah untuk mencegah intimidasi moral.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between"><span>Algoritma Hashing:</span> <strong className="text-slate-700">HMAC-SHA256</strong></div>
                <div className="flex justify-between"><span>Status Kependudukan:</span> <strong className="text-emerald-700">Terkoneksi Disdukcapil</strong></div>
                <div className="flex justify-between"><span>Waktu Sinkron:</span> <strong className="text-slate-700">Hari ini, 15:42 WIB</strong></div>
              </div>
            </div>

            {/* Widget 2: Kriteria Sanggahan Ditolak */}
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-rose-900 text-sm">KRITERIA SANGGAHAN DITOLAK</h3>
              </div>

              <p className="text-xs text-slate-600">
                Untuk menjaga validitas Dapodik daerah, sistem menolak sanggahan yang memenuhi indikator berikut:
              </p>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold shrink-0">🚫</span>
                  <span>Foto tanpa metadata geotagging atau lokasi berada &gt; 500m dari perimeter sekolah.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold shrink-0">🚫</span>
                  <span>Objek kerusakan non-struktural yang bukan kewenangan belanja Dapodik sekolah formal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold shrink-0">🚫</span>
                  <span>Pelapor bukan penduduk ber-KTP Lamongan atau guru/wali murid terdaftar.</span>
                </li>
              </ul>

              <a href="#" className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3052] hover:underline pt-2 border-t border-rose-100 w-full">
                Unduh Pedoman Teknis Audit Sarpras 2026 <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Widget 3: Kendala Nomor Registrasi? */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Kendala Nomor Registrasi?</h4>
                <p className="text-[11px] text-slate-500">Hubungi Tim Layanan Audit Dapodik</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50">
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
        redirectUrl="/laporan/baru"
      />
    </div>
  )
}