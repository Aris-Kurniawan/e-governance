import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFetch } from "@/hooks/useFetch"
import { detailSekolah } from "@/lib/api/sekolah"
import { kirimLaporan } from "@/lib/api/laporan"
import ComparisonBox from "@/components/composite/ComparisonBox"
import type { KategoriLaporan, SekolahDetail } from "@/lib/api/types"

export default function FormLaporan() {
  const [searchParams] = useSearchParams()
  const npsnParam = searchParams.get("sekolah") ?? ""

  const [npsn, setNpsn] = useState(npsnParam)
  const [kategori, setKategori] = useState<KategoriLaporan>("infrastruktur_sarana")
  const [fasilitas, setFasilitas] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [loading, setLoading] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [errorGagal, setErrorGagal] = useState<string | null>(null)

  const { state: sekolahState } = useFetch(
    () => (npsn.trim() ? detailSekolah(npsn.trim()) : Promise.resolve(null as unknown as SekolahDetail)),
    [npsn]
  )
  const sekolah = sekolahState.status === "success" ? sekolahState.data : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!npsn || !deskripsi) return
    if (kategori === "infrastruktur_sarana" && !fasilitas) return
    setLoading(true)
    try {
      const res = await kirimLaporan({
        sekolah_npsn: npsn,
        fasilitas_terkait: fasilitas || null,
        deskripsi,
      })
      setTrackingId(res.tracking_id)
      setErrorGagal(null)
    } catch (err) {
      setErrorGagal(err instanceof Error ? err.message : "Gagal mengirim laporan.")
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (trackingId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-3xl text-primary">✓</div>
        <h1 className="text-h2 font-bold text-ink">Laporan Berhasil Dikirim</h1>
        <p className="mt-2 text-body text-ink-secondary">Laporan kamu sudah diterima dan sedang menunggu verifikasi.</p>
        <p className="mt-4 text-body-sm text-ink-tertiary">Tracking ID: <span className="font-semibold text-ink tabular-nums">{trackingId}</span></p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild className="bg-primary text-white hover:bg-primary/90 cursor-pointer">
            <Link to="/laporan/riwayat">Lihat Riwayat Laporan</Link>
          </Button>
          <Button asChild variant="outline" className="cursor-pointer">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/laporan/wilayah"
        onClick={(e) => {
          if (window.history.length > 1) {
            e.preventDefault()
            window.history.back()
          }
        }}
        className="text-body-sm text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
      >
        &larr; Kembali
      </Link>
      <h1 className="mt-4 text-h1 font-bold text-ink">Form Laporan</h1>
      <p className="mt-1 text-body text-ink-secondary">Isi laporan kondisi fasilitas sekolah berdasarkan data resmi Dapodik.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Sekolah */}
        <div>
          <label className="text-body-sm font-medium text-ink">NPSN Sekolah <span className="text-danger-text">*</span></label>
          <Input value={npsn} onChange={(e) => setNpsn(e.target.value)} placeholder="Masukkan NPSN sekolah" className="mt-1" />
          {sekolah && <p className="mt-1 text-xs text-ink-tertiary">{sekolah.nama} &middot; {sekolah.jenjang}</p>}
        </div>

        {/* Kategori */}
        <div>
          <label className="text-body-sm font-medium text-ink">Kategori Laporan <span className="text-danger-text">*</span></label>
          <div className="mt-2 space-y-2">
            {([
              { value: "infrastruktur_sarana", label: "Infrastruktur / Sarana" },
              { value: "ketersediaan_tenaga_pengajar", label: "Ketersediaan Tenaga Pengajar" },
              { value: "lainnya", label: "Lainnya" },
            ] as const).map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/50">
                <input
                  type="radio"
                  name="kategori"
                  value={opt.value}
                  checked={kategori === opt.value}
                  onChange={() => setKategori(opt.value)}
                  className="accent-primary"
                />
                <span className="text-body-sm text-ink">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Fasilitas (hanya untuk infrastruktur) */}
        {kategori === "infrastruktur_sarana" && (
          <div>
            <label className="text-body-sm font-medium text-ink">Fasilitas Terkait <span className="text-danger-text">*</span></label>
            <Input value={fasilitas} onChange={(e) => setFasilitas(e.target.value)} placeholder="Contoh: Ruang Kelas, Laboratorium IPA" className="mt-1" />
          </div>
        )}

        {/* Deskripsi */}
        <div>
          <label className="text-body-sm font-medium text-ink">Deskripsi Laporan <span className="text-danger-text">*</span></label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={4}
            placeholder="Jelaskan kondisi fasilitas yang ingin dilaporkan..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-body-sm placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Cross-check box — data pembanding dari Dapodik (backend §2).
            Rasio guru:siswa sengaja disembunyikan saat null: backend v1 belum
            punya data tersebut (AGENTS.md §Scope FINAL). */}
        {sekolah && (
          <ComparisonBox title="Data Dapodik Pembanding" source="Sumber: Dapodik">
            <p className="text-body-sm text-ink-secondary">
              {sekolah.ringkasan_sarpras.total_unit > 0 ? (
                <>
                  Total {sekolah.ringkasan_sarpras.total_unit} unit sarpras,{" "}
                  {sekolah.ringkasan_sarpras.total_baik} dalam kondisi baik.{" "}
                  {sekolah.kondisi_sarana
                    .slice(0, 4)
                    .map((k) => `${k.nama_ruang} (${k.jumlah} unit)`)
                    .join(", ")}
                  .
                </>
              ) : (
                "Belum ada data kondisi sarana untuk sekolah ini."
              )}
            </p>
          </ComparisonBox>
        )}
        {errorGagal && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-light px-3 py-2 text-body-sm text-danger-text">
            {errorGagal}
          </p>
        )}

        <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={loading || !npsn || !deskripsi}>
          {loading ? "Mengirim Laporan..." : "Kirim Laporan"}
        </Button>
      </form>
    </div>
  )
}