import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { listSekolah } from "@/lib/api/sekolah"
import { riwayatLaporan } from "@/lib/api/laporan"
import StatusBadge from "@/components/composite/StatusBadge"
import { isLoggedIn } from "@/lib/api/auth"

const badgeColors: Record<string, string> = {
  // Backend v1 selalu mengirim "normal" (AGENTS.md §Scope). Nilai lain
  // sudah ada di kontrak §2 tapi belum dihitung backend — tetap ditangani.
  normal: "bg-primary-light text-primary",
  aman: "bg-primary-light text-primary",
  perlu_perhatian: "bg-warning-light text-warning-text",
  kritis: "bg-danger-light text-danger-text",
}

function formatTanggal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

export default function Dashboard() {
  const { state: sekolahState } = useFetch(() => listSekolah({ page_size: 12 }))
  const { state: riwayatState } = useFetch(() => riwayatLaporan({ page_size: 5 }), [isLoggedIn()])

  const sekolahData = sekolahState.status === "success" ? sekolahState.data.data : []
  const totalSekolah =
    sekolahState.status === "success" ? sekolahState.data.meta.total_items : 0
  const riwayatData = riwayatState.status === "success" ? riwayatState.data.data : []

  // Agregat KPI — semua dari data nyata, bukan angka hardcode.
  const totalKritis = sekolahData.filter((s) => s.penanda_masalah === "kritis").length
  const totalIsu = sekolahData.reduce((acc, s) => acc + s.jumlah_isu_aktif, 0)
  const isuSelesai = sekolahData.filter((s) => s.penanda_masalah === "aman").length

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-h1 font-bold text-ink">Dashboard Warga</h1>
      <p className="mt-1 text-body text-ink-secondary">Ringkasan kondisi sekolah di Kecamatan Lamongan.</p>

      {/* KPI Row */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard value={totalSekolah} label="Sekolah terdata" />
        <KpiCard value={totalKritis} label="Sekolah kritis" />
        <KpiCard value={totalIsu} label="Isu aktif" />
        <KpiCard value={isuSelesai} label="Isu sudah tuntas" />
      </div>

      {/* Riwayat Laporan */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-body-lg font-semibold">Riwayat Laporan Terbaru</CardTitle>
          <Link to="/laporan/riwayat">
            <Button variant="ghost" size="sm">Lihat Semua</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {riwayatState.status === "loading" && <p className="text-body-sm text-ink-tertiary">Memuat data...</p>}
          {riwayatState.status === "error" && (
            <p className="text-body-sm text-ink-tertiary">
              {riwayatState.code === "UNAUTHORIZED"
                ? "Login untuk melihat riwayat laporan kamu."
                : riwayatState.message}
            </p>
          )}
          {riwayatState.status === "success" && (
            <div className="space-y-3">
              {riwayatData.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-body-sm font-medium text-ink">{item.sekolah_npsn}</p>
                    <p className="text-xs text-ink-tertiary">{item.tracking_id} &middot; {formatTanggal(item.created_at)}</p>
                  </div>
                  <StatusBadge status={item.status_sanggahan as "dalam_proses"} />
                </div>
              ))}
            </div>
          )}
          {riwayatState.status === "empty" && <p className="text-body-sm text-ink-tertiary">Belum ada laporan.</p>}
        </CardContent>
      </Card>

      {/* Daftar Sekolah Ringkas */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-body-lg font-semibold">Daftar Sekolah</CardTitle>
          <Link to="/sekolah">
            <Button variant="ghost" size="sm">Lihat Direktori</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {sekolahState.status === "loading" && <p className="text-body-sm text-ink-tertiary">Memuat data...</p>}
          {sekolahState.status === "error" && (
            <p className="text-body-sm text-ink-tertiary">{sekolahState.message}</p>
          )}
          {sekolahState.status === "success" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sekolahData.slice(0, 6).map((s) => (
                <Link key={s.npsn} to={`/sekolah/${s.npsn}`} className="group">
                  <div className="rounded-lg border border-border p-4 transition-shadow hover:shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-body-sm font-semibold text-ink group-hover:text-primary">{s.nama}</p>
                        <p className="mt-0.5 text-xs text-ink-tertiary">{s.jenjang} &middot; {s.alamat}</p>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${badgeColors[s.penanda_masalah] ?? badgeColors.normal}`}>
                        {s.jumlah_isu_aktif} isu
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-8 flex gap-3">
        <Link to="/laporan/baru">
          <Button className="bg-primary text-white hover:bg-primary/90">Laporkan Isu</Button>
        </Link>
        <Link to="/sekolah">
          <Button variant="outline">Lihat Direktori</Button>
        </Link>
      </div>
    </div>
  )
}

function KpiCard({ value, label }: { value: number; label: string }) {
  return (
    <Card className="p-5 shadow-sm">
      <p className="text-display font-bold text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-body-sm text-ink-secondary">{label}</p>
    </Card>
  )
}