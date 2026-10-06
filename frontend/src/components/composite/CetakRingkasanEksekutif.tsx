import {
  ringkasanKpiDinas,
  daftarKlasterDinas,
  trenBulananIsu,
  distribusiFasilitas,
} from "@/mocks/dinasData"

export interface CetakRingkasanEksekutifProps {
  semester: string
}

const thClass =
  "border border-slate-400 px-2 py-1.5 text-left text-[10px] font-extrabold uppercase tracking-wider"
const tdClass = "border border-slate-400 px-2 py-1.5 text-[11px]"

export const CetakRingkasanEksekutif = ({ semester }: CetakRingkasanEksekutifProps) => {
  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const totalIsu = trenBulananIsu.reduce((a, b) => a + b.jumlah, 0)

  return (
    <div className="hidden print:block text-black text-[11px] leading-relaxed [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      {/* ── Kop Surat Resmi ── */}
      <div className="flex items-center gap-4 border-b-[3px] border-black pb-3">
        <img src="/logo-simakis.png" alt="Logo SIMAKIS" className="h-16 w-16 object-contain shrink-0" />
        <div className="flex-1 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase">Pemerintah Kabupaten Lamongan</p>
          <h1 className="text-lg font-extrabold uppercase tracking-wide">Dinas Pendidikan</h1>
          <p className="text-[10px]">
            Sub-Bagian Perencanaan &amp; Sarana Prasarana · Kabupaten Lamongan, Jawa Timur
          </p>
        </div>
        <div className="h-16 w-16 shrink-0" aria-hidden />
      </div>

      {/* ── Judul Dokumen ── */}
      <div className="text-center py-4">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">
          Laporan Ringkasan Eksekutif Kecamatan Lamongan
        </h2>
        <p className="text-[11px] mt-1">
          Periode: <strong>{semester}</strong>
        </p>
        <p className="text-[10px] text-slate-700 mt-0.5">
          Dicetak pada {tanggalCetak} · Oleh: Bambang H., S.T. (Verifikator Sarpras)
        </p>
      </div>

      {/* ── A. Ringkasan Indikator ── */}
      <section className="mt-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
          A. Ringkasan Indikator Utama
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className={thClass}>Indikator</th>
              <th className={thClass}>Nilai</th>
              <th className={thClass}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tdClass}>Sekolah Terdaftar</td>
              <td className={`${tdClass} font-bold tabular-nums`}>{ringkasanKpiDinas.sekolahTerdaftar} sekolah</td>
              <td className={tdClass}>Cakupan {ringkasanKpiDinas.cakupanPersen}% data Dapodik</td>
            </tr>
            <tr>
              <td className={tdClass}>Belum Tuntas Ditindaklanjuti</td>
              <td className={`${tdClass} font-bold tabular-nums`}>{ringkasanKpiDinas.belumTuntas} isu</td>
              <td className={tdClass}>Naik {ringkasanKpiDinas.kenaikanBulanLalu} dari bulan lalu</td>
            </tr>
            <tr>
              <td className={tdClass}>Rata-rata Skor Prioritas</td>
              <td className={`${tdClass} font-bold tabular-nums`}>{ringkasanKpiDinas.rataSkorPrioritas} / 100</td>
              <td className={tdClass}>
                {ringkasanKpiDinas.perubahanSkor} poin dari periode sebelumnya (membaik)
              </td>
            </tr>
            <tr>
              <td className={tdClass}>Isu Kritis Segera</td>
              <td className={`${tdClass} font-bold tabular-nums`}>{ringkasanKpiDinas.kritisSegera} isu</td>
              <td className={tdClass}>Skor &gt; 70 — butuh tindakan segera</td>
            </tr>
            <tr>
              <td className={tdClass}>Sinkronisasi Dapodik</td>
              <td className={`${tdClass} font-bold`}>{ringkasanKpiDinas.sinkronDapodik}</td>
              <td className={tdClass}>Klaster terbaru diproses {ringkasanKpiDinas.klasterTerbaru}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── B. Isu Prioritas Tertinggi ── */}
      <section className="mt-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
          B. Isu Prioritas Tertinggi (5 Teratas)
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className={thClass}>No.</th>
              <th className={thClass}>Sekolah / NPSN</th>
              <th className={thClass}>Kategori Isu</th>
              <th className={`${thClass} text-center`}>Skor</th>
              <th className={`${thClass} text-center`}>Laporan</th>
              <th className={thClass}>Prioritas</th>
            </tr>
          </thead>
          <tbody>
            {daftarKlasterDinas.slice(0, 5).map((k, idx) => (
              <tr key={k.id}>
                <td className={`${tdClass} text-center tabular-nums`}>{idx + 1}</td>
                <td className={tdClass}>
                  <strong>{k.sekolah}</strong>
                  <br />
                  <span className="font-mono text-[10px]">NPSN {k.npsn} · {k.nomorTiket}</span>
                </td>
                <td className={tdClass}>{k.kategori}</td>
                <td className={`${tdClass} text-center font-extrabold tabular-nums`}>{k.skor}</td>
                <td className={`${tdClass} text-center tabular-nums`}>{k.laporanWargaCount}</td>
                <td className={`${tdClass} font-bold`}>{k.prioritasLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── C. Tren Isu Baru per Bulan ── */}
      <section className="mt-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
          C. Tren Isu Baru per Bulan
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className={thClass}>Bulan</th>
              {trenBulananIsu.map((t) => (
                <th key={t.bulan} className={`${thClass} text-center`}>
                  {t.bulan}
                </th>
              ))}
              <th className={`${thClass} text-center`}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${tdClass} font-bold`}>Jumlah Isu</td>
              {trenBulananIsu.map((t) => (
                <td key={t.bulan} className={`${tdClass} text-center tabular-nums`}>
                  {t.jumlah}
                </td>
              ))}
              <td className={`${tdClass} text-center font-extrabold tabular-nums`}>{totalIsu}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── D. Distribusi Fasilitas Bermasalah ── */}
      <section className="mt-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
          D. Distribusi Jenis Fasilitas Bermasalah
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className={thClass}>Jenis Fasilitas</th>
              <th className={`${thClass} text-center`}>Jumlah Isu</th>
              <th className={`${thClass} text-center`}>Persentase</th>
            </tr>
          </thead>
          <tbody>
            {distribusiFasilitas.map((d) => (
              <tr key={d.nama}>
                <td className={tdClass}>{d.nama}</td>
                <td className={`${tdClass} text-center tabular-nums`}>{d.jumlah}</td>
                <td className={`${tdClass} text-center tabular-nums`}>{d.persen}%</td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className={`${tdClass} font-extrabold`}>Total</td>
              <td className={`${tdClass} text-center font-extrabold tabular-nums`}>
                {distribusiFasilitas.reduce((a, b) => a + b.jumlah, 0)}
              </td>
              <td className={`${tdClass} text-center font-extrabold tabular-nums`}>100%</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Catatan Kaki & Tanda Tangan ── */}
      <div className="mt-5 pt-2 border-t border-black text-[10px] text-slate-700">
        Dokumen ini dihasilkan otomatis oleh sistem <strong>SIMAKIS v2</strong> menggunakan data Dapodik
        Kemendikbudristek dan verifikasi lapangan. Klasifikasi prioritas mengacu pada standar sarpras
        Permendikbudristek No. 22/2023. Dilindungi UU No. 27/2022 tentang Pelindungan Data Pribadi.
      </div>

      <div className="mt-6 flex justify-between text-[11px]">
        <div className="text-center">
          <p>Mengetahui,</p>
          <p>Kepala Dinas Pendidikan Kab. Lamongan</p>
          <div className="h-16" />
          <p className="border-t border-black pt-1 font-bold">………………………………</p>
        </div>
        <div className="text-center">
          <p>Lamongan, {tanggalCetak}</p>
          <p>Verifikator Sarpras</p>
          <div className="h-16" />
          <p className="border-t border-black pt-1 font-bold">Bambang H., S.T.</p>
          <p className="text-[10px] font-mono">NIP. 19820415 200801 1 009</p>
        </div>
      </div>
    </div>
  )
}

export default CetakRingkasanEksekutif
