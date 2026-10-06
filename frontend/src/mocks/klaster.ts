import type { KlasterDetail, KlasterIsu, VoteResponse } from "@/lib/api/types"

export const klasterList: KlasterIsu[] = [
  { klaster_id: "kls-001", sekolah_npsn: "20532361", sekolah_nama: "SMPN 1 Lamongan",
    kategori: "infrastruktur_sarana", jumlah_laporan: 7, skor_prioritas: 87, status: "terverifikasi" },
  { klaster_id: "kls-002", sekolah_npsn: "20532361", sekolah_nama: "SMPN 1 Lamongan",
    kategori: "ketersediaan_tenaga_pengajar", jumlah_laporan: 3, skor_prioritas: 45, status: "menunggu_verifikasi" },
  { klaster_id: "kls-003", sekolah_npsn: "20532410", sekolah_nama: "SMKN 1 Lamongan",
    kategori: "infrastruktur_sarana", jumlah_laporan: 5, skor_prioritas: 72, status: "terverifikasi" },
  { klaster_id: "kls-004", sekolah_npsn: "20532301", sekolah_nama: "SDN Lamongan I",
    kategori: "infrastruktur_sarana", jumlah_laporan: 4, skor_prioritas: 68, status: "tidak_terverifikasi" },
]

export const klasterDetailMap: Record<string, KlasterDetail> = {
  "kls-001": {
    klaster_id: "kls-001",
    sekolah_npsn: "20532361",
    sekolah_nama: "SMPN 1 Lamongan",
    kategori: "infrastruktur_sarana",
    jumlah_laporan: 7,
    skor_prioritas: 87,
    status: "terverifikasi",
    laporan_anggota: [
      { laporan_id: "lap-001", tracking_id: "SMK-2026-000123", deskripsi: "Plafon ruang kelas 7A bocor dan retak, sudah 2 bulan belum diperbaiki.", tanggal: "2026-02-10" },
      { laporan_id: "lap-004", tracking_id: "SMK-2026-000130", deskripsi: "Atap ruang kelas 8B ambrol saat hujan lebat.", tanggal: "2026-02-14" },
    ],
  },
  "kls-002": {
    klaster_id: "kls-002",
    sekolah_npsn: "20532361",
    sekolah_nama: "SMPN 1 Lamongan",
    kategori: "ketersediaan_tenaga_pengajar",
    jumlah_laporan: 3,
    skor_prioritas: 45,
    status: "menunggu_verifikasi",
    laporan_anggota: [
      { laporan_id: "lap-006", tracking_id: "SMK-2026-000140", deskripsi: "Rasio guru:siswa 1:22, di atas standar SPM 1:20 untuk jenjang SMP.", tanggal: "2026-02-16" },
      { laporan_id: "lap-010", tracking_id: "SMK-2026-000144", deskripsi: "Praktikum IPA terhambat karena satu kelas praktikum tanpa pendamping tetap.", tanggal: "2026-02-19" },
    ],
  },
  "kls-003": {
    klaster_id: "kls-003",
    sekolah_npsn: "20532410",
    sekolah_nama: "SMKN 1 Lamongan",
    kategori: "infrastruktur_sarana",
    jumlah_laporan: 5,
    skor_prioritas: 72,
    status: "terverifikasi",
    laporan_anggota: [
      { laporan_id: "lap-002", tracking_id: "SMK-2026-000124", deskripsi: "Mesin bubut di bengkel otomotif mati total, praktik siswa terhambat.", tanggal: "2026-01-28" },
    ],
  },
  "kls-004": {
    klaster_id: "kls-004",
    sekolah_npsn: "20532301",
    sekolah_nama: "SDN Lamongan I",
    kategori: "infrastruktur_sarana",
    jumlah_laporan: 4,
    skor_prioritas: 68,
    status: "tidak_terverifikasi",
    laporan_anggota: [
      { laporan_id: "lap-005", tracking_id: "SMK-2026-000135", deskripsi: "Kelas 2A kekurangan meja belajar.", tanggal: "2026-02-02" },
    ],
  },
}

export const voteContoh: VoteResponse = {
  vote_id: "v-001",
  status_vote: "terhitung",
}

export const votePendingContoh: VoteResponse = {
  vote_id: "v-002",
  status_vote: "pending",
}

// TODO(kontrak): durasi masa tunda vote (pending -> terhitung) belum ditentukan.
export const CATATAN_MASA_TUNDA_VOTE = "Vote tersimpan sebagai Menunggu Masa Tunda hingga verifikasi akun selesai."