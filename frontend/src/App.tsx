import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { ErrorBoundary } from "@/components/errors/ErrorBoundary"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import PublicLayout from "@/layouts/PublicLayout"
import AuthLayout from "@/layouts/AuthLayout"
import WargaLayout from "@/layouts/WargaLayout"
import DinasLayout from "@/layouts/DinasLayout"
import Landing from "@/pages/warga/Landing"

// ── F4.3 — lazy-load halaman per rute (React.lazy + Suspense) ────────────────
// Landing tetap eager sebagai entry utama; sisanya terpotong jadi chunk terpisah
// sehingga bundle awal jauh lebih kecil (turunkan peringatan chunk > 500 kB).
const Login = lazy(() => import("@/pages/warga/Login"))
const Registrasi = lazy(() => import("@/pages/warga/Registrasi"))
const DashboardWilayah = lazy(() => import("@/pages/warga/DashboardWilayah"))
const Direktori = lazy(() => import("@/pages/warga/Direktori"))
const DetailSekolah = lazy(() => import("@/pages/warga/DetailSekolah"))
const DetailKlaster = lazy(() => import("@/pages/warga/DetailKlaster"))
const FormLaporan = lazy(() => import("@/pages/warga/FormLaporan"))
const RiwayatLaporan = lazy(() => import("@/pages/warga/RiwayatLaporan"))
const TentangData = lazy(() => import("@/pages/warga/TentangData"))
const DaftarKlaster = lazy(() => import("@/pages/warga/DaftarKlaster"))
const StatusTindakLanjutWarga = lazy(() => import("@/pages/warga/StatusTindakLanjutWarga"))

// Dinas (Pemerintah) Pages
const LoginDinas = lazy(() => import("@/pages/dinas/LoginDinas"))
const DashboardKadis = lazy(() => import("@/pages/dinas/DashboardKadis"))
const AntrianValidasi = lazy(() => import("@/pages/dinas/AntrianValidasi"))
const IngestDataCsv = lazy(() => import("@/pages/dinas/IngestDataCsv"))
const PetaSebaranDinas = lazy(() => import("@/pages/dinas/PetaSebaranDinas"))
const TabelVerifikasi = lazy(() => import("@/pages/dinas/TabelVerifikasi"))
const StatusTindakLanjut = lazy(() => import("@/pages/dinas/StatusTindakLanjut"))
const LaporanSkorKbm = lazy(() => import("@/pages/dinas/LaporanSkorKbm"))
const LogAuditPdp = lazy(() => import("@/pages/dinas/LogAuditPdp"))
const LaporanPerluReview = lazy(() => import("@/pages/dinas/LaporanPerluReview"))

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-display font-bold text-ink">404</p>
      <p className="text-body-lg font-semibold text-ink">Halaman tidak ditemukan</p>
      <a href="/" className="text-body-sm text-primary hover:underline">Kembali ke Beranda</a>
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <span className="inline-flex items-center gap-2 text-body-sm font-medium text-ink-tertiary">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Memuat halaman…
      </span>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public (Warga) */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/tentang" element={<TentangData />} />
                <Route path="/laporan/wilayah" element={<DashboardWilayah />} />
                <Route path="/sekolah" element={<Direktori />} />
                <Route path="/sekolah/:npsn" element={<DetailSekolah />} />
                <Route path="/klaster" element={<DaftarKlaster />} />
                <Route path="/klaster/:klasterId" element={<DetailKlaster />} />
                <Route path="/klaster/:klasterId/status" element={<StatusTindakLanjutWarga />} />
                <Route path="/laporan/riwayat" element={<RiwayatLaporan />} />
                <Route path="/laporan/publik" element={<RiwayatLaporan />} />
              </Route>

              {/* Auth Warga (Login / Registrasi) — shell split-dark */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/registrasi" element={<Registrasi />} />
              </Route>

              {/* Warga (terotentikasi & dilindungi) */}
              <Route element={<WargaLayout />}>
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardWilayah />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/laporan/baru"
                  element={
                    <ProtectedRoute allowedRoles={["warga_umum", "warga_terverifikasi", "komite_sekolah"]}>
                      <FormLaporan />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Dinas (Pemerintah) - Login */}
              <Route path="/dinas/login" element={<LoginDinas />} />

              {/* Dinas (Pemerintah) - Panel Internal & Verifikasi */}
              <Route
                path="/dinas"
                element={
                  <ProtectedRoute loginPath="/dinas/login" allowedRoles={["admin", "verifikator_dinas", "kepala_dinas"]}>
                    <DinasLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardKadis />} />
                <Route path="dashboard" element={<DashboardKadis />} />
                <Route path="antrian" element={<AntrianValidasi />} />
                <Route path="perlu-review" element={<LaporanPerluReview />} />
                <Route path="ingest" element={<IngestDataCsv />} />
                <Route path="peta" element={<PetaSebaranDinas />} />
                <Route path="tabel" element={<TabelVerifikasi />} />
                <Route path="status" element={<StatusTindakLanjut />} />
                <Route path="tindak-lanjut" element={<StatusTindakLanjut />} />
                <Route path="skor-kbm" element={<LaporanSkorKbm />} />
                <Route path="log-audit" element={<LogAuditPdp />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}