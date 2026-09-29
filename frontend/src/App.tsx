import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ErrorBoundary } from "@/components/errors/ErrorBoundary"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import PublicLayout from "@/layouts/PublicLayout"
import AuthLayout from "@/layouts/AuthLayout"
import WargaLayout from "@/layouts/WargaLayout"
import DinasLayout from "@/layouts/DinasLayout"
import Landing from "@/pages/warga/Landing"
import Login from "@/pages/warga/Login"
import Registrasi from "@/pages/warga/Registrasi"
import DashboardWilayah from "@/pages/warga/DashboardWilayah"
import Direktori from "@/pages/warga/Direktori"
import DetailSekolah from "@/pages/warga/DetailSekolah"
import DetailKlaster from "@/pages/warga/DetailKlaster"
import FormLaporan from "@/pages/warga/FormLaporan"
import RiwayatLaporan from "@/pages/warga/RiwayatLaporan"
import TentangData from "@/pages/warga/TentangData"

// Dinas (Pemerintah) Pages
import LoginDinas from "@/pages/dinas/LoginDinas"
import DashboardKadis from "@/pages/dinas/DashboardKadis"
import AntrianValidasi from "@/pages/dinas/AntrianValidasi"
import IngestDataCsv from "@/pages/dinas/IngestDataCsv"
import PetaSebaranDinas from "@/pages/dinas/PetaSebaranDinas"
import TabelVerifikasi from "@/pages/dinas/TabelVerifikasi"
import LaporanSkorKbm from "@/pages/dinas/LaporanSkorKbm"
import LogAuditPdp from "@/pages/dinas/LogAuditPdp"

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-display font-bold text-ink">404</p>
      <p className="text-body-lg font-semibold text-ink">Halaman tidak ditemukan</p>
      <a href="/" className="text-body-sm text-primary hover:underline">Kembali ke Beranda</a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
            {/* Public (Warga) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/tentang" element={<TentangData />} />
              <Route path="/laporan/wilayah" element={<DashboardWilayah />} />
              <Route path="/sekolah" element={<Direktori />} />
              <Route path="/sekolah/:npsn" element={<DetailSekolah />} />
              <Route path="/klaster/:klasterId" element={<DetailKlaster />} />
              <Route path="/laporan/riwayat" element={<RiwayatLaporan />} />
            </Route>

            {/* Auth Warga (Login / Registrasi) */}
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
                  <ProtectedRoute>
                    <FormLaporan />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Dinas (Pemerintah) - Login */}
            <Route path="/dinas/login" element={<LoginDinas />} />

            {/* Dinas (Pemerintah) - Panel Internal & Verifikasi */}
            <Route path="/dinas" element={<DinasLayout />}>
              <Route index element={<DashboardKadis />} />
              <Route path="dashboard" element={<DashboardKadis />} />
              <Route path="antrian" element={<AntrianValidasi />} />
              <Route path="ingest" element={<IngestDataCsv />} />
              <Route path="peta" element={<PetaSebaranDinas />} />
              <Route path="tabel" element={<TabelVerifikasi />} />
              <Route path="skor-kbm" element={<LaporanSkorKbm />} />
              <Route path="log-audit" element={<LogAuditPdp />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}