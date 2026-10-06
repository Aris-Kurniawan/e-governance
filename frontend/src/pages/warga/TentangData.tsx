import { Link } from "react-router-dom"
import { Card } from "@/components/ui/card"

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
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="overflow-hidden rounded-xl bg-primary text-white shadow-sm">
            <div className="px-8 py-10">
              <h2 className="text-h2 font-bold">Dari Mana Data Ini Berasal?</h2>
              <p className="mt-3 max-w-3xl text-body leading-relaxed text-white/80">
                SIMAKIS menduetkan dua sumber data untuk menghasilkan informasi yang tidak bisa
                disediakan oleh satu pihak saja. Sumber pertama bersifat resmi, bersifat periodik,
                dan berasal dari laporan institusional pemerintah. Sumber kedua bersifat partisipatif,
                real-time, dan berasal dari laporan warga secara langsung.
              </p>
              <p className="mt-4 max-w-3xl text-body-sm leading-relaxed text-white/70">
                Dengan menggabungkan keduanya, SIMAKIS menghasilkan pemetaan kondisi fasilitas
                sekolah yang lebih lengkap, akurat, dan adil bagi semua pihak.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Cards ── */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">1</div>
            <h3 className="text-body-lg font-semibold text-ink">Data Resmi Pemerintah (Baseline Dapodik)</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Data ini bersumber dari sistem Dapodik Kemendikdasmen yang diisi oleh operator sekolah
              setiap semester. Komponen data meliputi jumlah ruang kelas, kondisi bangunan, rasio
              guru-siswa, serta inventaris fasilitas pendukung kegiatan belajar mengajar. Data ini
              dianggap sebagai baseline resmi kondisi sekolah.
            </p>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">2</div>
            <h3 className="text-body-lg font-semibold text-ink">Laporan Partisipatif Warga (Fakta Lapangan)</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Laporan warga berisi kondisi terkini yang mungkin belum tercatat di Dapodik, misalnya
              kerusakan baru, ketiadaan guru pengajar, atau perubahan fungsi ruangan. Laporan ini
              dijadikan catatan tambahan yang melengkapi data resmi, bukan menggantikannya. Setiap
              laporan yang masuk akan dikelompokkan otomatis berdasarkan sekolah dan jenis isu.
            </p>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">3</div>
            <h3 className="text-body-lg font-semibold text-ink">Pelindungan Data Pribadi (Privasi Sejak Awal)</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Identitas pelapor disamarkan dan hanya digunakan untuk verifikasi hak suara. NIK dan
              data pribadi tidak ditampilkan ke publik atau Dinas secara terbuka. Prinsip ini sesuai
              dengan UU PDP No. 27/2022 tentang Pelindungan Data Pribadi.
            </p>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">4</div>
            <h3 className="text-body-lg font-semibold text-ink">Siklus Pemutakhiran Data (Audit Berkelanjutan)</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Data Dapodik diperbarui setiap semester oleh operator sekolah. Laporan warga masuk
              secara real-time dan dikelompokkan dalam siklus audit berkelanjutan. Hasilnya adalah
              pemetaan kondisi sekolah yang selalu mutakhir dan dapat diverifikasi oleh semua pihak.
            </p>
          </Card>
        </div>
      </div>

      {/* ── Bagaimana audit berlangsung? ── */}
      <div className="bg-background-alt">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-h2 font-bold text-ink">Bagaimana audit berlangsung?</h2>
          <p className="mt-2 max-w-2xl text-body text-ink-secondary">
            Proses audit menggabungkan data resmi dengan laporan warga untuk menghasilkan
            informasi yang akurat dan dapat dipertanggungjawabkan.
          </p>

          <div className="mt-8 space-y-6">
            <Step number={1} title="Pengumpulan Data"
              desc="Data Dapodik dikumpulkan dari operator sekolah setiap semester. Laporan warga dikumpulkan secara real-time melalui portal SIMAKIS." />
            <Step number={2} title="Pengelompokan & Pencocokan"
              desc="Laporan warga dikelompokkan berdasarkan sekolah dan jenis isu. Setiap laporan dicocokkan dengan data Dapodik untuk memverifikasi kesesuaian." />
            <Step number={3} title="Verifikasi & Validasi"
              desc="Tim verifikator dinas memeriksa setiap laporan yang sudah dikelompokkan. Laporan yang terverifikasi masuk ke dalam perhitungan skor prioritas." />
            <Step number={4} title="Penanganan & Tindak Lanjut"
              desc="Klaster isu dengan skor prioritas tertinggi ditangani terlebih dahulu oleh dinas pendidikan. Hasil penanganan dilaporkan kembali ke publik." />
          </div>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-primary-border bg-primary-light p-6">
          <h3 className="text-body-lg font-semibold text-primary">Data Saat Ini</h3>
          <p className="mt-2 text-body-sm text-ink-secondary">
            62 sekolah terdata, 42 isu fasilitas sudah tuntas ditangani, 6 sekolah
            dengan selisih data terdampak. Data terakhir diperbarui: Semester 1 2026.
          </p>
        </div>
      </div>
    </div>
  )
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary text-body-sm font-bold text-primary">
        {number}
      </div>
      <div>
        <h3 className="text-body-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-body-sm text-ink-secondary">{desc}</p>
      </div>
    </div>
  )
}