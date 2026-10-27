import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFetch } from "@/hooks/useFetch"
import { useAuth } from "@/context/AuthContext"
import { riwayatLaporan } from "@/lib/api/laporan"
import { ROLE_LABEL } from "@/lib/api/types"

/**
 * Dashboard Saya (`/dashboard`) — ringkasan AKUN & LAPORAN PRIBADI warga.
 *
 * Bukan dashboard wilayah (data agregat sekolah se-Kecamatan → `/laporan/wilayah`
 * `DashboardWilayah.tsx`, atau direktori `/sekolah`). Halaman ini menjawab
 * pertanyaan "bagaimana kabar laporan saya?": KPI pribadi dari
 * `GET /laporan/riwayat`, riwayat terbaru, status akun, dan CTA melapor.
 */

/** Badge status_sanggahan laporan pribadi (enum backend: menunggu/divalidasi/ditolak). */
const STATUS_SANGGHAN_STYLE: Record<string, { box: string; label: string }> = {
  menunggu: {
    box: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Menunggu Validasi Dinas",
  },
  divalidasi: {
    box: "bg-emerald-50 text-emerald-800 border-emerald-200",
    label: "Tervalidasi",
  },
  ditolak: {
    box: "bg-rose-50 text-rose-800 border-rose-200",
    label: "Ditolak",
  },
}

const STATUS_AKUN_STYLE: Record<string, { box: string; label: string }> = {
  terverifikasi: { box: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Terverifikasi" },
  menunggu: { box: "bg-amber-50 text-amber-700 border-amber-200", label: "Menunggu Verifikasi" },
  ditolak: { box: "bg-rose-50 text-rose-700 border-rose-200", label: "Ditolak" },
}

function formatTanggal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

export default function Dashboard() {
  const { user } = useAuth()
  // page_size 50 = batas backend; KPI per-status dihitung dari yang termuat.
  const { state: riwayatState } = useFetch(() => riwayatLaporan({ page_size: 50 }))

  const items = riwayatState.status === "success" ? riwayatState.data.data : []
  const totalPribadi =
    riwayatState.status === "success" ? riwayatState.data.meta.total_items : 0
  const terbaru = items.slice(0, 5)

  const hitung = (status: string) => items.filter((i) => i.status_sanggahan === status).length
  const akunMeta = STATUS_AKUN_STYLE[user?.status_verifikasi ?? "menunggu"] ?? STATUS_AKUN_STYLE.menunggu

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Sapaan + Status Akun */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-ink">Halo, {user?.nama?.split(" ")[0] ?? "Warga"} 👋</h1>
          <p className="mt-1 text-body text-ink-secondary">
            Ringkasan laporan temuan sarpras yang pernah kamu kirim.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 font-semibold text-ink-secondary">
            {user ? ROLE_LABEL[user.role] : "Warga"}
          </span>
          <span className={`rounded-lg border px-3 py-1.5 font-semibold ${akunMeta.box}`}>
            Akun {akunMeta.label}
          </span>
        </div>
      </div>

      {/* KPI Pribadi */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard value={totalPribadi} label="Total laporan saya" accent="text-ink" />
        <KpiCard value={riwayatState.status === "success" ? hitung("menunggu") : "—"} label="Menunggu validasi" accent="text-amber-700" />
        <KpiCard value={riwayatState.status === "success" ? hitung("divalidasi") : "—"} label="Tervalidasi" accent="text-emerald-700" />
        <KpiCard value={riwayatState.status === "success" ? hitung("ditolak") : "—"} label="Ditolak" accent="text-rose-700" />
      </div>
      {totalPribadi > items.length && (
        <p className="mt-2 text-xs text-ink-tertiary">
          Angka menunggu/tervalidasi/ditolak dihitung dari {items.length} laporan yang dimuat
          (total {totalPribadi}).
        </p>
      )}

      {/* Riwayat Laporan Terbaru */}
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
          {riwayatState.status === "success" && items.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-body-sm font-medium text-ink-secondary">Belum ada laporan.</p>
              <p className="mt-1 text-xs text-ink-tertiary">
                Mulai laporkan temuan sarpras sekolah untuk mendukung audit partisipatif.
              </p>
              <Link to="/laporan/baru" className="mt-4 inline-block">
                <Button className="bg-primary text-white hover:bg-primary/90">Laporkan Temuan</Button>
              </Link>
            </div>
          )}
          {riwayatState.status === "success" && items.length > 0 && (
            <div className="space-y-3">
              {terbaru.map((item) => {
                const st = STATUS_SANGGHAN_STYLE[item.status_sanggahan] ?? {
                  box: "bg-surface-alt text-ink-secondary border-border",
                  label: item.status_sanggahan,
                }
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-ink">{item.sekolah_npsn}</p>
                      <p className="text-xs text-ink-tertiary">
                        {item.tracking_id} &middot; {formatTanggal(item.created_at)}
                        {item.fasilitas_terkait ? ` · ${item.fasilitas_terkait}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.konfirmasi_perlu_dijawab && (
                        <Link to="/laporan/riwayat" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                          Perlu Jawab Konfirmasi
                        </Link>
                      )}
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${st.box}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-8 flex gap-3">
        <Link to="/laporan/baru">
          <Button className="bg-primary text-white hover:bg-primary/90">Laporkan Isu</Button>
        </Link>
        <Link to="/laporan/wilayah">
          <Button variant="outline">Lihat Dashboard Wilayah</Button>
        </Link>
      </div>
    </div>
  )
}

function KpiCard({ value, label, accent }: { value: number | string; label: string; accent?: string }) {
  return (
    <Card className="p-5 shadow-sm">
      <p className={`text-display font-bold tabular-nums ${accent ?? "text-ink"}`}>{value}</p>
      <p className="mt-1 text-body-sm text-ink-secondary">{label}</p>
    </Card>
  )
}
