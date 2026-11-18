import { Link } from "react-router-dom"
import { Card } from "@/components/ui/card"
import ScrollReveal from "@/components/composite/ScrollReveal"

const STEPS = [
  {
    number: 1,
    title: "Pengumpulan Data",
    desc: "Data Dapodik dikumpulkan dari operator sekolah setiap semester. Laporan warga dikumpulkan secara real-time melalui portal SIMAKIS.",
  },
  {
    number: 2,
    title: "Pengelompokan & Pencocokan",
    desc: "Laporan warga dikelompokkan berdasarkan sekolah dan jenis isu. Setiap laporan dicocokkan dengan data Dapodik untuk memverifikasi kesesuaian.",
  },
  {
    number: 3,
    title: "Verifikasi & Validasi",
    desc: "Tim verifikator dinas memeriksa setiap laporan yang sudah dikelompokkan. Laporan yang terverifikasi masuk ke dalam perhitungan skor prioritas.",
  },
  {
    number: 4,
    title: "Penanganan & Tindak Lanjut",
    desc: "Klaster isu dengan skor prioritas tertinggi ditangani terlebih dahulu oleh dinas pendidikan. Hasil penanganan dilaporkan kembali ke publik.",
  },
]

export default function TentangData() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-border bg-surface-alt">
        <div className="mx-auto max-w-5xl px-6 py-3">
          <nav className="flex items-center gap-2 text-body-sm text-ink-tertiary">
            <Link to="/" className="hover:text-primary">Beranda</Link>
            <span>/</span>
            <span className="font-medium text-ink">Tentang Data</span>
          </nav>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-h1 font-bold text-ink">Tentang Data &amp; Transparansi</h1>
        <p className="mt-2 max-w-2xl text-body text-ink-secondary">
          Pahami sumber data, alur audit, serta batasan sistem sebelum berpartisipasi.
        </p>
      </div>

      {/* ── Dari Mana Data Ini Berasal? ── */}
      <div className="bg-background-alt">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
          <ScrollReveal direction="up" duration={600}>
            <div className="overflow-hidden rounded-2xl bg-primary text-white shadow-sm">
              <div className="px-5 py-6 sm:px-8 sm:py-10">
                <h2 className="text-xl sm:text-h2 font-bold leading-tight">Dari Mana Data Ini Berasal?</h2>
                <p className="mt-2.5 sm:mt-3 max-w-3xl text-xs sm:text-body leading-relaxed text-white/80">
                  SIMAKIS menduetkan dua sumber data untuk menghasilkan informasi yang tidak bisa
                  disediakan oleh satu pihak saja: data resmi periodik dari instansi pemerintah (Dapodik)
                  dan data partisipatif faktual langsung dari laporan warga di lapangan.
                </p>
                <p className="mt-2 sm:mt-4 max-w-3xl text-[11px] sm:text-body-sm leading-relaxed text-white/70">
                  Dengan menggabungkan keduanya, SIMAKIS menghasilkan pemetaan kondisi fasilitas
                  sekolah yang lebih lengkap, akurat, dan adil bagi semua pihak.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* ── 4 Pilar Data (Responsive: Swipe / Snap Carousel di Mobile agar muat 1 layar HP, Grid 2 Kolom di Desktop) ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-10">
        
        {/* Tampilan Mobile (< md): Horizontal Snap Cards dengan Indikator Swipe */}
        <div className="block md:hidden">
          <div className="flex items-center justify-between mb-2 px-1 text-[11px] text-ink-tertiary">
            <span className="font-semibold uppercase tracking-wider text-[10px]">4 Prinsip &amp; Sumber Data</span>
            <span className="text-[10px]">Geser ke samping &rarr;</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar">
            {[
              {
                num: 1,
                title: "Data Resmi Pemerintah (Baseline Dapodik)",
                desc: "Data bersumber dari Dapodik Kemendikdasmen per semester (ruang kelas, kondisi bangunan, sarpras pendukung) sebagai baseline resmi kondisi sekolah.",
              },
              {
                num: 2,
                title: "Laporan Partisipatif Warga (Fakta Lapangan)",
                desc: "Laporan kondisi terkini warga melengkapi data resmi (bukan menggantikan). Setiap aduan dikelompokkan otomatis berbasis AI menurut sekolah & jenis isu.",
              },
              {
                num: 3,
                title: "Pelindungan Data Pribadi (Privasi Sejak Awal)",
                desc: "Identitas pelapor disamarkan dan NIK warga tidak dibuka ke publik sesuai amanat UU PDP No. 27/2022 tentang Pelindungan Data Pribadi.",
              },
              {
                num: 4,
                title: "Siklus Pemutakhiran Data (Audit Berkelanjutan)",
                desc: "Dapodik diperbarui berkala dan laporan warga masuk real-time dalam siklus audit berkelanjutan untuk pemetaan yang selalu mutakhir & transparan.",
              },
            ].map((pilar) => (
              <div
                key={pilar.num}
                className="w-[82vw] max-w-[310px] shrink-0 snap-center rounded-2xl border border-border bg-surface p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary font-bold text-xs">
                    {pilar.num}
                  </div>
                  <h3 className="text-sm font-bold text-ink leading-snug">
                    {pilar.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                    {pilar.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-ink-tertiary">
                  <span>Prinsip #{pilar.num}</span>
                  <span className="font-medium text-primary">SIMAKIS</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tampilan Desktop (>= md): Grid 2 Kolom Lengkap */}
        <div className="hidden md:grid gap-6 md:grid-cols-2">
          <ScrollReveal direction="up" delay={50} duration={500} className="h-full">
            <Card className="h-full p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary font-bold">1</div>
              <h3 className="text-body-lg font-semibold text-ink">Data Resmi Pemerintah (Baseline Dapodik)</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
                Data ini bersumber dari sistem Dapodik Kemendikdasmen yang diisi oleh operator sekolah
                setiap semester. Komponen data meliputi jumlah ruang kelas, kondisi bangunan, rasio
                guru-siswa, serta inventaris fasilitas pendukung kegiatan belajar mengajar. Data ini
                dianggap sebagai baseline resmi kondisi sekolah.
              </p>
            </Card>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={150} duration={500} className="h-full">
            <Card className="h-full p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary font-bold">2</div>
              <h3 className="text-body-lg font-semibold text-ink">Laporan Partisipatif Warga (Fakta Lapangan)</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
                Laporan warga berisi kondisi terkini yang mungkin belum tercatat di Dapodik, misalnya
                kerusakan baru, ketiadaan guru pengajar, atau perubahan fungsi ruangan. Laporan ini
                dijadikan catatan tambahan yang melengkapi data resmi, bukan menggantikannya. Setiap
                laporan yang masuk akan dikelompokkan otomatis berdasarkan sekolah dan jenis isu.
              </p>
            </Card>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={250} duration={500} className="h-full">
            <Card className="h-full p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary font-bold">3</div>
              <h3 className="text-body-lg font-semibold text-ink">Pelindungan Data Pribadi (Privasi Sejak Awal)</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
                Identitas pelapor disamarkan dan hanya digunakan untuk verifikasi hak suara. NIK dan
                data pribadi tidak ditampilkan ke publik atau Dinas secara terbuka. Prinsip ini sesuai
                dengan UU PDP No. 27/2022 tentang Pelindungan Data Pribadi.
              </p>
            </Card>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={350} duration={500} className="h-full">
            <Card className="h-full p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary font-bold">4</div>
              <h3 className="text-body-lg font-semibold text-ink">Siklus Pemutakhiran Data (Audit Berkelanjutan)</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
                Data Dapodik diperbarui setiap semester oleh operator sekolah. Laporan warga masuk
                secara real-time dan dikelompokkan dalam siklus audit berkelanjutan. Hasilnya adalah
                pemetaan kondisi sekolah yang selalu mutakhir dan dapat diverifikasi oleh semua pihak.
              </p>
            </Card>
          </ScrollReveal>
        </div>
      </div>

      {/* ── Bagaimana audit berlangsung? ── */}
      <div className="bg-background-alt">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <ScrollReveal direction="up" duration={600}>
            <div className="text-center md:text-left">
              <h2 className="text-h2 font-bold text-ink">Bagaimana audit berlangsung?</h2>
              <p className="mt-2 max-w-2xl text-body text-ink-secondary">
                Proses audit menggabungkan data resmi dengan laporan warga untuk menghasilkan
                informasi yang akurat dan dapat dipertanggungjawabkan.
              </p>
            </div>
          </ScrollReveal>

          {/* ── Timeline dengan Tali Penghubung (Connected Steps) ── */}
          <div className="relative mt-10 md:mt-12 pl-4 sm:pl-6 space-y-8 before:absolute before:left-[33px] sm:before:left-[41px] before:top-6 before:bottom-6 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-primary/20 before:to-slate-200">
            {STEPS.map((step, idx) => (
              <ScrollReveal
                key={step.number}
                direction="up"
                distance={32}
                delay={idx * 120}
                duration={550}
              >
                <div className="relative flex items-start gap-4 sm:gap-6 group">
                  {/* Lingkaran Nomer (Node Tali) */}
                  <div className="relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white text-body-sm sm:text-base font-extrabold text-primary shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    {step.number}
                  </div>

                  {/* Card Konten Langkah */}
                  <div className="flex-1 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-300">
                    <h3 className="text-body-lg sm:text-lg font-bold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-body-sm sm:text-body text-ink-secondary leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <ScrollReveal direction="up" duration={600}>
          <div className="rounded-xl border border-primary-border bg-primary-light p-6">
            <h3 className="text-body-lg font-semibold text-primary">Data Saat Ini</h3>
            <p className="mt-2 text-body-sm text-ink-secondary">
              62 sekolah terdata, 42 isu fasilitas sudah tuntas ditangani, 6 sekolah
              dengan selisih data terdampak. Data terakhir diperbarui: Semester 1 2026.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}