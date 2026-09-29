import type { KategoriLaporan, LaporanRequest, LaporanResponse, RiwayatLaporanItem } from "@/lib/api/types"

export const laporanRequestContoh: LaporanRequest = {
  sekolah_npsn: "20532361",
  kategori: "infrastruktur_sarana",
  fasilitas_terkait: "Ruang Kelas",
  deskripsi: "Plafon ruang kelas 7A bocor dan retak, sudah 2 bulan belum diperbaiki.",
}

// 3 varian respons sesuai PAGE_STATES.md §A4
const laporanResponseInfrastruktur: LaporanResponse = {
  laporan_id: "lap-001",
  tracking_id: "SMK-2026-000123",
  status: "menunggu_verifikasi",
  cross_check: {
    tersedia: true,
    data_dapodik: "Ruang Kelas: 12 unit (baik 5, rusak ringan 3, rusak sedang 2, rusak berat 2)",
  },
}

const laporanResponseTenagaPengajar: LaporanResponse = {
  laporan_id: "lap-006",
  tracking_id: "SMK-2026-000140",
  status: "menunggu_verifikasi",
  cross_check: {
    tersedia: true,
    data_dapodik: "Rasio guru:siswa 1:22 di data Dapodik (target 1:20).",
  },
}

const laporanResponseLainnya: LaporanResponse = {
  laporan_id: "lap-007",
  tracking_id: "SMK-2026-000141",
  status: "menunggu_verifikasi",
  cross_check: {
    tersedia: false,
    data_dapodik: null,
  },
}

export function pilihResponsLaporan(kategori: KategoriLaporan): LaporanResponse {
  if (kategori === "infrastruktur_sarana") return laporanResponseInfrastruktur
  if (kategori === "ketersediaan_tenaga_pengajar") return laporanResponseTenagaPengajar
  return laporanResponseLainnya
}

export const laporanRiwayat: RiwayatLaporanItem[] = [
  { laporan_id: "lap-001", tracking_id: "SMK-2026-000123", sekolah_nama: "SMPN 1 Lamongan",
    kategori: "infrastruktur_sarana", status: "dalam_proses", tanggal: "2026-02-10" },
  { laporan_id: "lap-002", tracking_id: "SMK-2026-000124", sekolah_nama: "SMKN 1 Lamongan",
    kategori: "infrastruktur_sarana", status: "selesai", tanggal: "2026-01-28" },
  { laporan_id: "lap-003", tracking_id: "SMK-2026-000125", sekolah_nama: "SMAN 1 Lamongan",
    kategori: "lainnya", status: "tidak_dapat_ditindaklanjuti", tanggal: "2026-01-15" },
  { laporan_id: "lap-008", tracking_id: "SMK-2026-000142", sekolah_nama: "SMPN 2 Lamongan",
    kategori: "ketersediaan_tenaga_pengajar", status: "dalam_antrian_prioritas", tanggal: "2026-01-03" },
  { laporan_id: "lap-009", tracking_id: "SMK-2026-000143", sekolah_nama: "SMAN 2 Lamongan",
    kategori: "ketersediaan_tenaga_pengajar", status: "tidak_terverifikasi", tanggal: "2025-12-20" },
]