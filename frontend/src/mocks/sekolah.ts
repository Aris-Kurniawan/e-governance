import type { SekolahDetail, SekolahList } from "@/lib/api/types"

// F2.2 — mock data sekolah. Bentuk objek mengikuti INTERFACES.md §2.
// Nama & NPSN mengikuti format data Dapodik Kecamatan Lamongan.

export const sekolahList: SekolahList[] = [
  { npsn: "20532301", nama: "SDN Lamongan I",        alamat: "Jl. Basuki Rahmat No. 1, Lamongan",      jenjang: "SD",  jumlah_isu_aktif: 3, penanda_masalah: "kritis" },
  { npsn: "20532302", nama: "SDN Lamongan II",       alamat: "Jl. Veteran No. 12, Lamongan",           jenjang: "SD",  jumlah_isu_aktif: 1, penanda_masalah: "perlu_perhatian" },
  { npsn: "20532303", nama: "SDN Sukorejo",          alamat: "Jl. Pendidikan No. 5, Sukorejo",         jenjang: "SD",  jumlah_isu_aktif: 0, penanda_masalah: "aman" },
  { npsn: "20532344", nama: "SDN Tumenggungan",      alamat: "Jl. Kolonel Sutarto No. 8, Lamongan",    jenjang: "SD",  jumlah_isu_aktif: 2, penanda_masalah: "perlu_perhatian" },
  { npsn: "20532361", nama: "SMPN 1 Lamongan",       alamat: "Jl. Ki Sarmidi Mangunsarkoro No. 12",    jenjang: "SMP", jumlah_isu_aktif: 4, penanda_masalah: "kritis" },
  { npsn: "20532362", nama: "SMPN 2 Lamongan",       alamat: "Jl. Sunan Drajat No. 4, Lamongan",       jenjang: "SMP", jumlah_isu_aktif: 1, penanda_masalah: "perlu_perhatian" },
  { npsn: "20532370", nama: "SMPN 3 Lamongan",       alamat: "Jl. Lamongrejo No. 21, Lamongan",        jenjang: "SMP", jumlah_isu_aktif: 0, penanda_masalah: "aman" },
  { npsn: "20532401", nama: "SMAN 1 Lamongan",       alamat: "Jl. Panglima Sudirman No. 5, Lamongan",  jenjang: "SMA", jumlah_isu_aktif: 2, penanda_masalah: "perlu_perhatian" },
  { npsn: "20532402", nama: "SMAN 2 Lamongan",       alamat: "Jl. Raya Deket No. 9, Deket",            jenjang: "SMA", jumlah_isu_aktif: 1, penanda_masalah: "perlu_perhatian" },
  { npsn: "20532410", nama: "SMKN 1 Lamongan",       alamat: "Jl. Jenderal Sudirman No. 47",           jenjang: "SMK", jumlah_isu_aktif: 3, penanda_masalah: "kritis" },
  { npsn: "20532411", nama: "SMKN 2 Lamongan",       alamat: "Jl. Dr. Wahidin No. 33, Lamongan",       jenjang: "SMK", jumlah_isu_aktif: 0, penanda_masalah: "aman" },
  { npsn: "20532420", nama: "SMK Muhammadiyah",      alamat: "Jl. Andansari No. 14, Lamongan",         jenjang: "SMK", jumlah_isu_aktif: 1, penanda_masalah: "perlu_perhatian" },
]

export const sekolahDetail: Record<string, SekolahDetail> = {
  "20532361": {
    npsn: "20532361",
    nama: "SMPN 1 Lamongan",
    alamat: "Jl. Ki Sarmidi Mangunsarkoro No. 12, Lamongan",
    jenjang: "SMP",
    data_resmi: {
      sumber: "Dapodik",
      tanggal_pembaruan: "2026-01-15",
      rasio_guru_siswa: "1:22",
      kondisi_sarana: [
        { nama_ruang: "Ruang Kelas",       kondisi: "rusak_berat" },
        { nama_ruang: "Laboratorium IPA",  kondisi: "rusak_sedang" },
        { nama_ruang: "Perpustakaan",      kondisi: "rusak_ringan" },
        { nama_ruang: "Ruang Guru",        kondisi: "baik" },
      ],
    },
    klaster_isu: [
      { klaster_id: "kls-001", kategori: "infrastruktur_sarana",         skor_prioritas: 87, status: "terverifikasi" },
      { klaster_id: "kls-002", kategori: "ketersediaan_tenaga_pengajar", skor_prioritas: 45, status: "menunggu_verifikasi" },
    ],
  },
  "20532303": {
    npsn: "20532303",
    nama: "SDN Sukorejo",
    alamat: "Jl. Pendidikan No. 5, Sukorejo",
    jenjang: "SD",
    data_resmi: {
      sumber: "Dapodik",
      tanggal_pembaruan: "2026-01-09",
      rasio_guru_siswa: "1:18",
      kondisi_sarana: [
        { nama_ruang: "Ruang Kelas",     kondisi: "baik" },
        { nama_ruang: "Ruang Guru",      kondisi: "rusak_ringan" },
      ],
    },
    klaster_isu: [],
  },
  "20532410": {
    npsn: "20532410",
    nama: "SMKN 1 Lamongan",
    alamat: "Jl. Jenderal Sudirman No. 47",
    jenjang: "SMK",
    data_resmi: {
      sumber: "Dapodik",
      tanggal_pembaruan: "2026-01-20",
      rasio_guru_siswa: "1:25",
      kondisi_sarana: [
        { nama_ruang: "Bengkel Otomotif", kondisi: "rusak_berat" },
        { nama_ruang: "Ruang Kelas",      kondisi: "rusak_sedang" },
        { nama_ruang: "Ruang Guru",       kondisi: "baik" },
      ],
    },
    klaster_isu: [
      { klaster_id: "kls-003", kategori: "infrastruktur_sarana", skor_prioritas: 72, status: "terverifikasi" },
    ],
  },
  "20532301": {
    npsn: "20532301",
    nama: "SDN Lamongan I",
    alamat: "Jl. Basuki Rahmat No. 1, Lamongan",
    jenjang: "SD",
    data_resmi: {
      sumber: "Dapodik",
      tanggal_pembaruan: "2026-01-12",
      rasio_guru_siswa: "1:21",
      kondisi_sarana: [
        { nama_ruang: "Ruang Kelas",  kondisi: "rusak_berat" },
        { nama_ruang: "Ruang Guru",   kondisi: "rusak_sedang" },
      ],
    },
    klaster_isu: [
      { klaster_id: "kls-004", kategori: "infrastruktur_sarana", skor_prioritas: 68, status: "tidak_terverifikasi" },
    ],
  },
}

// Helper filter+paginate meniru GET /sekolah?search=&jenjang=&page=
export function listMockSekolah(
  source: SekolahList[],
  filter: { search?: string; jenjang?: "SD" | "SMP" | "SMA" | "SMK" | "semua"; page?: number; page_size?: number },
): { data: SekolahList[]; meta: { page: number; page_size: number; total_items: number; total_pages: number } } {
  const pageSize = filter.page_size ?? 6
  let rows = source.filter((s) => {
    const matchJenjang = !filter.jenjang || filter.jenjang === "semua" || s.jenjang === filter.jenjang
    const matchSearch =
      !filter.search ||
      s.nama.toLowerCase().includes(filter.search.toLowerCase()) ||
      s.alamat.toLowerCase().includes(filter.search.toLowerCase()) ||
      s.npsn.includes(filter.search)
    return matchJenjang && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages)
  const start = (page - 1) * pageSize
  rows = rows.slice(start, start + pageSize)

  return {
    data: rows,
    meta: { page, page_size: pageSize, total_items: source.length, total_pages: totalPages },
  }
}