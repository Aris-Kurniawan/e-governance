import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import {
  ShieldCheck,
  FileText,
  MessageSquare,
  Plus,
  Lock,
  CheckCircle2,
  Sparkles,
  Layers,
  Calculator,
  ThumbsUp,
  Camera,
  Search,
} from "lucide-react"

export default function Landing() {
  const { isAuthenticated, user, roleLabel } = useAuth()
  const navigate = useNavigate()

  // Gerbang autentikasi pelaporan:
  // belum login → langsung diarahkan ke halaman login; sudah login → langsung ke form laporan.
  const handleMulaiLapor = () => {
    if (!isAuthenticated) {
      navigate("/login?redirect=" + encodeURIComponent("/laporan/baru"))
    } else {
      navigate("/laporan/baru")
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-900 text-slate-900 min-h-screen flex items-start">
        {/* Background Image & Light Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-35"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=2000&q=80')` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-100 via-slate-100/95 to-slate-100/80 md:to-slate-100/10" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 w-full pt-20 md:pt-28 pb-16 md:pb-24">
          <div className="grid gap-12 lg:grid-cols-12 items-stretch">
            {/* Left Content Column */}
            <div className="lg:col-span-7 max-w-2xl flex flex-col justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold leading-[1.18] tracking-tight text-slate-900">
                  Laporkan kondisi sekolah, dicek dulu ke data resminya.
                </h1>
                <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
                  SIMAKIS menyandingkan data resmi Dapodik dengan laporan warga di
                  Kecamatan Lamongan, sehingga setiap sanggahan kondisi fasilitas diperiksa
                  berdasarkan catatan resmi sebelum diteruskan ke Dinas Pendidikan.
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Berbasis data resmi Dapodik Kemendikdasmen, per NPSN sekolah</span>
                </div>
              </div>

              <div className="mt-12 lg:mt-16 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleMulaiLapor}
                    className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Mulai Laporkan Temuan
                  </Button>
                  <Button asChild variant="outline" className="bg-white hover:bg-slate-50 text-slate-800 border-slate-200 font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-colors cursor-pointer">
                    <Link to="/sekolah">
                      Lihat Direktori Sekolah
                    </Link>
                  </Button>
                </div>

                {/* Indikator Status Autentikasi Pelapor */}
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50/80 border border-emerald-200/60 rounded-lg px-3 py-1.5 w-fit">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Masuk sebagai <strong>{user?.nama}</strong> ({roleLabel ?? "Akun Terdaftar"} — Siap Melaporkan)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg px-3 py-1.5 w-fit">
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Pelaporan membutuhkan akun warga terverifikasi (Wajib Masuk / Daftar)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Floating Preview Card Column */}
            <div className="lg:col-span-5 self-end">
              <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    SMAN 1 Sukodadi <span className="text-slate-400 font-normal">·</span> Laboratorium Kimia
                  </h3>
                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/70">
                    Selisih Terdeteksi
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {/* Dapodik Data */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      DATA DAPODIK
                    </span>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                      <span className="font-semibold text-slate-700">Baik</span>
                      <span className="text-slate-500 text-xs font-medium">1 unit</span>
                    </div>
                  </div>

                  {/* Field Fact */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                      FAKTA LAPANGAN
                    </span>
                    <div className="rounded-xl bg-rose-50/80 border border-rose-100 px-3.5 py-3 text-xs sm:text-sm font-bold text-rose-900 leading-snug">
                      Atap bocor & plafon runtuh
                    </div>
                  </div>
                </div>

                {/* Progress bar line segments as seen in reference */}
                <div className="mt-6 grid grid-cols-4 gap-2">
                  <div className="h-1 rounded-full bg-[#0B3052]" />
                  <div className="h-1 rounded-full bg-[#0B3052]" />
                  <div className="h-1 rounded-full bg-slate-200" />
                  <div className="h-1 rounded-full bg-slate-200" />
                </div>

                {/* Step timeline breadcrumbs at bottom */}
                <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <span>Sanggahan warga</span>
                  <span>→</span>
                  <span>Klasterisasi</span>
                  <span>→</span>
                  <span>Audit fisik Dinas</span>
                  <span>→</span>
                  <span>Pembaruan Dapodik</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI ── */}
      <section className="border-b border-slate-100 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">24</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">Sekolah terdata di Kec. Lamongan</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">6</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">Sekolah dengan selisih data terdampak</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">42</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">Isu fasilitas yang sudah tuntas</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">1 NIK</div>
              <p className="mt-2 text-sm text-slate-500 leading-snug">= 1 suara, terverifikasi kependudukan</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mekanisme Sistem Klusterisasi AI ── */}
      <section className="bg-[#F8FAFC] py-14 md:py-20 border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Teknologi Kecerdasan Buatan (AI)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Mekanisme Klusterisasi Isu Otomatis
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
                SIMAKIS tidak membiarkan aduan masyarakat tercecer menjadi ribuan keluhan terisolasi.
                Sistem secara otomatis menganalisis teks aduan Anda dan menggabungkannya ke dalam satu
                <strong> Klaster Isu Terpadu</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shrink-0">
              <Layers className="h-4 w-4 text-[#0B3052]" />
              <span>Pipeline: TF-IDF Semantik + UMAP + HDBSCAN</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Step 1: Parsing & Feature Extraction */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Analisis Teks &amp; Kata Kunci Sarpras
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Saat Anda menulis aduan, model NLP (Natural Language Processing) mengekstraksi kata kunci
                kerusakan fisik seperti <em>"atap bocor"</em>, <em>"plafon retak"</em>, <em>"sanitasi mampet"</em>,
                atau <em>"kusen lapuk"</em>.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Ekstraksi 300 fitur semantik
              </div>
            </div>

            {/* Step 2: Clustering */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Pengelompokan Otomatis (Klaster Isu)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Laporan dari orang tua murid, guru, atau warga yang mengeluhkan ruang atau fasilitas yang sama di satu
                sekolah otomatis disatukan ke dalam 1 ID Klaster. Tidak ada aduan yang terduplikasi.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Pengelompokan bebas bias
              </div>
            </div>

            {/* Step 3: Collective Voice */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Kekuatan Suara Bersama ke Dinas
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Klaster isu menjadi representasi resmi di dashboard Dinas Pendidikan. Warga lain di sekitar
                sekolah dapat langsung memberikan dukungan (vote) sehingga posisi urgensi penanganan meningkat.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 1 NIK = 1 Dukungan Kuat
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mekanisme Perhitungan Skor Prioritas & Keparahan ── */}
      <section className="bg-white py-14 md:py-20 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 mb-3">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              <span>Transparansi Algoritma Pengambilan Keputusan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bagaimana Skor Prioritas Penanganan Dihitung?
            </h2>
            <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
              Dinas Pendidikan tidak memilih sekolah mana yang diperbaiki berdasarkan firasat atau kedekatan.
              SIMAKIS menerapkan formula matematis yang objektif dan transparan.
            </p>
          </div>

          {/* Formula Visual Banner */}
          <div className="rounded-2xl bg-[#0B3052] text-white p-6 sm:p-8 shadow-xl mb-10 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300">
                RUMUS FORMULA PRIORITAS SARPRAS (D-07)
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white flex flex-wrap items-center justify-center gap-2">
                <span className="bg-white/10 px-3 py-1 rounded-lg">Skor Prioritas</span>
                <span className="text-blue-300">=</span>
                <span className="bg-white/10 px-3 py-1 rounded-lg">Skor Keparahan</span>
                <span className="text-blue-300">+</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4" /> Dukungan Warga (Vote)
                </span>
              </div>
              <p className="text-xs text-white/70 max-w-2xl mx-auto mt-2 leading-relaxed">
                Di mana <strong>Skor Keparahan = 70% Bobot Fakta Laporan Warga + 30% Bobot Kerusakan Dapodik</strong>.
              </p>
            </div>
          </div>

          {/* 3 Penjelasan Komponen Skor */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#0B3052]">70%</span>
                <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  Bobot Terbesar
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">Fakta Lapangan Warga</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kondisi riil yang dirasakan langsung oleh siswa dan guru memegang porsi terbesar.
                Laporan kerusakan berat yang mengancam keselamatan proses belajar-mengajar (KBM) langsung mendapat nilai urgensi tinggi.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#0B3052]">30%</span>
                <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  Data Resmi
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">Catatan Dapodik Kemendikbud</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Data resmi sarpras sekolah (kondisi baik, rusak ringan, sedang, berat) dari pangkalan data resmi
                Kemendikbud digunakan sebagai basis pembanding objektivitas agar anggaran tepat sasaran.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-800">+1 Poin</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                  Per 1 Suara Sah
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">Partisipasi &amp; Dukungan Warga</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Setiap 1 warga terverifikasi kependudukan (1 NIK) yang memberi tombol dukungan akan menaikkan skor prioritas klaster isu.
                Semakin banyak dukungan masyarakat, semakin cepat Dinas menjadwalkan audit fisik dan renovasi!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Panduan Cara Melaporkan yang Benar ── */}
      <section className="bg-[#F8FAFC] py-14 md:py-20 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 mb-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Panduan Pelaporan Warga</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Mekanisme Cara Melaporkan yang Benar
            </h2>
            <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
              Ikuti 4 langkah terstruktur berikut agar laporan ketidaksesuaian fasilitas Anda cepat disetujui
              dan segera ditindaklanjuti oleh verifikator Dinas Pendidikan.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm mb-4">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Pilih Unit &amp; Ruang Spesifik</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Buka <strong>Direktori Sekolah</strong>, pilih sekolah yang dimaksud, dan tentukan fasilitas yang rusak
                  (contoh: <em>"Ruang Kelas 4B"</em> atau <em>"Laboratorium Komputer"</em>), bukan keluhan umum tanpa lokasi.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
                <Search className="h-3.5 w-3.5" /> Pilih dari daftar Dapodik
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm mb-4">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Jelaskan Letak Kerusakan Faktual</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tuliskan deskripsi faktual: bagian mana yang rusak, kapan mulai terjadi, dan bagaimana dampaknya
                  terhadap kegiatan belajar siswa (contoh: <em>"Atap bocor 3 titik, air merembes ke instalasi listrik"</em>).
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Berikan fakta, bukan opini
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm mb-4">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Lampirkan Foto Bukti Otentik</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Unggah foto kondisi fisik asli di lapangan dengan pencahayaan jelas. Foto yang menunjukkan detail
                  kerusakan mempercepat verifikator menyetujui laporan Anda.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" /> Format JPG/PNG foto nyata
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm mb-4">
                  4
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Ajak Komite &amp; Warga Mendukung</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Setelah terbit menjadi klaster isu, bagikan tautan aduan kepada wali murid dan komite sekolah untuk
                  memberikan dukungan (vote). Isu dengan dukungan tinggi diprioritaskan oleh Kadis.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" /> Dorong kuorum dukungan
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kenapa Diperiksa ── */}
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Kenapa laporan diperiksa ke data resmi dulu
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600 text-sm md:text-base leading-relaxed">
            Prinsip ini menjaga agar laporan warga tetap bisa dipercaya dan tidak disalahgunakan sebagai keluhan sepihak.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Data resmi pemerintah</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Diambil dari pangkalan data Dapodik Kemendikdasmen per NPSN, dimutakhirkan tiap semester oleh operator sekolah.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Suara warga yang terverifikasi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Laporan warga melengkapi data resmi dengan kondisi riil, dikelompokkan otomatis supaya isu serupa tidak tercatat berulang.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Identitas pelapor dilindungi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                NIK dan data pribadi dienkripsi sesuai UU PDP No. 27/2022, dan tidak ditampilkan ke publik atau Dinas secara terbuka.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 md:p-12">
            {/* Background image */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=2000&q=80')` }}
            />
            {/* Dark navy overlay */}
            <div className="absolute inset-0 z-0 bg-[#0B3052]/70" />

            {/* Content */}
            {/* Content */}
            <div className="relative z-10 max-w-xl">
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {isAuthenticated
                  ? `Siap berpartisipasi, ${user?.nama}?`
                  : "Ikut menjaga integritas data sekolah di Lamongan"}
              </h3>
              <p className="mt-2 text-slate-300 text-sm md:text-base leading-relaxed">
                {isAuthenticated
                  ? "Akun Anda telah terverifikasi kependudukan (1 NIK = 1 Suara Sah). Laporkan selisih sarana sekolah atau pantau progres audit langsung dari sistem."
                  : "Daftar dengan NIK atau masuk ke akun Anda untuk mulai melaporkan temuan dan memvalidasi sarana sekolah secara objektif."}
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={() => navigate("/laporan/baru")}
                    className="bg-white hover:bg-slate-100 text-[#0B3052] font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Buat Laporan Baru
                  </Button>
                  <Button asChild className="bg-[#0B3052] hover:bg-[#07213A] text-white border border-white/30 font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer">
                    <Link to="/laporan/riwayat">
                      Riwayat Laporan
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/registrasi?redirect=%2Flaporan%2Fbaru&action=report">
                    <Button className="bg-white hover:bg-slate-100 text-[#0B3052] font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer">
                      Daftar Akun Warga
                    </Button>
                  </Link>
                  <Link to="/laporan/riwayat">
                    <Button className="bg-[#0B3052] hover:bg-[#07213A] text-white border border-white/30 font-semibold px-6 py-3.5 h-auto rounded-lg text-sm shadow-sm transition-all cursor-pointer">
                      Riwayat Laporan
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}