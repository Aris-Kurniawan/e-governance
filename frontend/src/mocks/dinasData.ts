export interface KlasterIsuDinas {
  id: string
  nomorTiket: string
  judul: string
  sekolah: string
  npsn: string
  kecamatan: string
  kategori: string
  tipeBadge: "Mismatch" | "Kejadian Baru" | "Ditolak"
  skor: number
  prioritasLabel: "PRIORITAS KRITIS" | "TINGGI" | "SEDANG" | "RENDAH"
  laporanWargaCount: number
  dukunganCount: number
  diperbarui: string
  tfidfTag: string
  baselineDapodik: {
    kondisi: string
    tanggalUpdate: string
    volume: string
    detail: string
  }
  faktaLapangan: {
    kondisi: string
    deskripsiFisik: string
    keteranganKbm: string
    dampak: string
  }
  laporanWargaVault: Array<{
    isi: string
    nikMasked: string
    nikFull: string
    namaWarga: string
  }>
  fotoMinio: Array<{
    id: string
    url: string
    caption: string
    timestamp: string
  }>
  auditTrail: Array<{
    waktu: string
    judul: string
    keterangan: string
    status: "selesai" | "proses" | "menunggu"
  }>
}

export const daftarKlasterDinas: KlasterIsuDinas[] = [
  {
    id: "kls-001",
    nomorTiket: "KLS-2026-0891",
    judul: "Kerusakan Atap & Plafon Runtuh Lab Kimia",
    sekolah: "SMAN 1 Sukodadi",
    npsn: "20506255",
    kecamatan: "Kec. Sukodadi",
    kategori: "Sarpras Kritis",
    tipeBadge: "Mismatch",
    skor: 82,
    prioritasLabel: "PRIORITAS KRITIS",
    laporanWargaCount: 8,
    dukunganCount: 142,
    diperbarui: "18 menit lalu",
    tfidfTag: "TF-IDF: structural_failure",
    baselineDapodik: {
      kondisi: "Kondisi: Baik (100%)",
      tanggalUpdate: "Update: 14 Feb 2026",
      volume: "Volume: 1 Unit Terdaftar",
      detail: "Plafon: Beton Komposit",
    },
    faktaLapangan: {
      kondisi: "Kondisi: Rusak Berat",
      deskripsiFisik: "Plafon ambruk ± 24 m²",
      keteranganKbm: "Rembesan air hujan masif",
      dampak: "Aktivitas KBM diliburkan",
    },
    laporanWargaVault: [
      {
        isi: "Atap jebol menimpa meja praktikum siswa kelas XI. Rembesan air hujan mengenai stop kontak mikroskop digital.",
        nikMasked: "•••• •••• 3021",
        nikFull: "3524015809923021",
        namaWarga: "Ahmad Fauzi (Wali Murid XI IPA 2)",
      },
      {
        isi: "Bau zat kimia menyengat akibat ventilasi tertutup puing genting dan eternit yang berjatuhan sejak kemarin sore.",
        nikMasked: "•••• •••• 1104",
        nikFull: "3524012304911104",
        namaWarga: "Dra. Siti Rahayu (Guru Pembina Lab)",
      },
    ],
    fotoMinio: [
      {
        id: "foto-1",
        url: "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=600&q=80",
        caption: "Foto 1: Tampak Struktur Rangka Plafon",
        timestamp: "12 Agu · 08:42",
      },
      {
        id: "foto-2",
        url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80",
        caption: "Foto 2: Area Lantai & Puing Lab Plafon",
        timestamp: "12 Agu · 08:50",
      },
      {
        id: "foto-3",
        url: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=600&q=80",
        caption: "Foto 3: Rembesan Dinding & Sakelar",
        timestamp: "12 Agu · 09:10",
      },
    ],
    auditTrail: [
      {
        waktu: "12 Agu · 09:15",
        judul: "Laporan Pertama Diunggah Warga",
        keterangan: "Melalui Aplikasi Pelaporan Publik SIMAKIS Mobile",
        status: "selesai",
      },
      {
        waktu: "12 Agu · 10:30",
        judul: "Klaster AI Terbentuk (DBSCAN 0.82)",
        keterangan: "Menggabungkan 8 aduan dalam radius 50m lab kimia",
        status: "selesai",
      },
      {
        waktu: "Saat Ini",
        judul: "Menunggu Verifikasi Verifikator Dinas",
        keterangan: "Ditugaskan ke: Bambang H., S.T. (Sarpras)",
        status: "proses",
      },
    ],
  },
  {
    id: "kls-002",
    nomorTiket: "KLS-2026-0887",
    judul: "Kelistrikan Blower Praktik Otomotif",
    sekolah: "SMKN 1 Lamongan",
    npsn: "20506300",
    kecamatan: "Kec. Lamongan",
    kategori: "Kelistrikan Bengkel",
    tipeBadge: "Kejadian Baru",
    skor: 74,
    prioritasLabel: "TINGGI",
    laporanWargaCount: 14,
    dukunganCount: 38,
    diperbarui: "42 menit lalu",
    tfidfTag: "TF-IDF: fire_hazard_elec",
    baselineDapodik: {
      kondisi: "Kondisi: Baik",
      tanggalUpdate: "Update: 20 Jan 2026",
      volume: "Volume: 3 Unit Blower",
      detail: "Panel Daya: 3 Phase Standar",
    },
    faktaLapangan: {
      kondisi: "Kondisi: Korsleting Berat",
      deskripsiFisik: "Kabel panel meleleh & MCB trip berulang",
      keteranganKbm: "Asap tipis di ruang praktik mesin",
      dampak: "Praktik las & mesin dibatasi",
    },
    laporanWargaVault: [
      {
        isi: "Panel blower ruang tune up sering mengeluarkan percikan api saat beban puncak praktek siswa.",
        nikMasked: "•••• •••• 4492",
        nikFull: "3524021105944492",
        namaWarga: "Hendro Wibowo (Teknisi Bengkel)",
      },
    ],
    fotoMinio: [
      {
        id: "foto-4",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
        caption: "Foto 1: Panel Daya Meleleh",
        timestamp: "12 Agu · 07:15",
      },
      {
        id: "foto-5",
        url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
        caption: "Foto 2: Saluran Sirkulasi Blower",
        timestamp: "12 Agu · 07:30",
      },
    ],
    auditTrail: [
      {
        waktu: "11 Agu · 14:00",
        judul: "Insiden Tercatat di Log Bengkel",
        keterangan: "Laporan diteruskan dari pengurus komite kejuruan",
        status: "selesai",
      },
      {
        waktu: "Saat Ini",
        judul: "Inspeksi Teknis Dijadwalkan",
        keterangan: "Tim kelistrikan Cabdin Lamongan diterjunkan",
        status: "proses",
      },
    ],
  },
  {
    id: "kls-003",
    nomorTiket: "KLS-2026-0882",
    judul: "Kerusakan Pipa Air & Saluran Toilet Blok B",
    sekolah: "SMPN 2 Lamongan",
    npsn: "20506198",
    kecamatan: "Kec. Deket",
    kategori: "Sanitasi & Air Bersih",
    tipeBadge: "Mismatch",
    skor: 61,
    prioritasLabel: "SEDANG",
    laporanWargaCount: 6,
    dukunganCount: 24,
    diperbarui: "1 jam lalu",
    tfidfTag: "TF-IDF: plumbing_hygiene",
    baselineDapodik: {
      kondisi: "Kondisi: Baik",
      tanggalUpdate: "Update: 18 Des 2025",
      volume: "Volume: 6 Bilik Berfungsi",
      detail: "Sumber Air: PDAM & Sumur Pompa",
    },
    faktaLapangan: {
      kondisi: "Kondisi: Mampet & Pipa Patah",
      deskripsiFisik: "2 bilik toilet tergenang air keruh",
      keteranganKbm: "Pompa hisap utama mati",
      dampak: "Siswa mengantre panjang saat istirahat",
    },
    laporanWargaVault: [
      {
        isi: "Sudah seminggu toilet blok B lantai dasar tidak ada air bersih mengalir.",
        nikMasked: "•••• •••• 9812",
        nikFull: "3524036709899812",
        namaWarga: "Kurniawati, S.Pd.",
      },
    ],
    fotoMinio: [
      {
        id: "foto-6",
        url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        caption: "Foto 1: Kondisi Saluran Kran",
        timestamp: "11 Agu · 11:20",
      },
    ],
    auditTrail: [
      {
        waktu: "10 Agu · 10:00",
        judul: "Laporan Diterima",
        keterangan: "Dukungan warga mencapai ambang verifikasi",
        status: "selesai",
      },
    ],
  },
  {
    id: "kls-004",
    nomorTiket: "KLS-2026-0870",
    judul: "Keretakan Dinding Ruang Kelas 3B",
    sekolah: "SDN 5 Turi",
    npsn: "20506199",
    kecamatan: "Kec. Turi",
    kategori: "Struktur Gedung",
    tipeBadge: "Mismatch",
    skor: 48,
    prioritasLabel: "SEDANG",
    laporanWargaCount: 4,
    dukunganCount: 19,
    diperbarui: "3 jam lalu",
    tfidfTag: "TF-IDF: wall_fracture",
    baselineDapodik: {
      kondisi: "Kondisi: Baik",
      tanggalUpdate: "Update: 02 Jan 2026",
      volume: "Volume: 1 Ruang Kelas",
      detail: "Struktur: Bata Merah Plester",
    },
    faktaLapangan: {
      kondisi: "Kondisi: Retak Rambut Memanjang",
      deskripsiFisik: "Retak selebar 3mm di bawah kusen jendela",
      keteranganKbm: "Masih aman ditempati",
      dampak: "Perlu pemantauan deformasi tanah",
    },
    laporanWargaVault: [
      {
        isi: "Retakan bertambah panjang sehabis hujan lebat pekan kemarin di sekitar pondasi sisi barat.",
        nikMasked: "•••• •••• 7721",
        nikFull: "3524041208927721",
        namaWarga: "Budi Santoso",
      },
    ],
    fotoMinio: [],
    auditTrail: [],
  },
  {
    id: "kls-005",
    nomorTiket: "KLS-2026-0865",
    judul: "Ventilasi Ruang Perpustakaan Minim",
    sekolah: "SMPN 1 Lamongan",
    npsn: "20506303",
    kecamatan: "Kec. Lamongan",
    kategori: "Kenyamanan Ruang",
    tipeBadge: "Kejadian Baru",
    skor: 35,
    prioritasLabel: "RENDAH",
    laporanWargaCount: 3,
    dukunganCount: 12,
    diperbarui: "5 jam lalu",
    tfidfTag: "TF-IDF: hvac_airflow",
    baselineDapodik: {
      kondisi: "Kondisi: Baik",
      tanggalUpdate: "Update: 15 Jan 2026",
      volume: "Volume: 1 Unit Perpustakaan",
      detail: "Fasilitas: 2 Exhaust Fan",
    },
    faktaLapangan: {
      kondisi: "Kondisi: Pengap & Lembap",
      deskripsiFisik: "Exhaust fan mati, buku berisiko berjamur",
      keteranganKbm: "Siswa kurang nyaman membaca lama",
      dampak: "Diperlukan penggantian sirkulasi udara",
    },
    laporanWargaVault: [],
    fotoMinio: [],
    auditTrail: [],
  },
]

export const ringkasanKpiDinas = {
  sekolahTerdaftar: 24,
  cakupanPersen: 100,
  belumTuntas: 12,
  kenaikanBulanLalu: 3,
  rataSkorPrioritas: 41,
  perubahanSkor: -4,
  kritisSegera: 3,
  sinkronDapodik: "2 hari lalu",
  klasterTerbaru: "14 menit lalu",
}

export const trenBulananIsu = [
  { bulan: "Mar", jumlah: 7 },
  { bulan: "Apr", jumlah: 9 },
  { bulan: "Mei", jumlah: 11 },
  { bulan: "Jun", jumlah: 8 },
  { bulan: "Jul", jumlah: 13 },
  { bulan: "Agu '26", jumlah: 12 },
]

export const distribusiFasilitas = [
  { nama: "Ruang Kelas", jumlah: 8, persen: 40 },
  { nama: "Laboratorium", jumlah: 5, persen: 25 },
  { nama: "Toilet / Sanitasi", jumlah: 4, persen: 20 },
  { nama: "Perpustakaan", jumlah: 2, persen: 10 },
  { nama: "Sarana Olahraga", jumlah: 1, persen: 5 },
]

export const petaMismatchTitik = [
  {
    id: "pin-1",
    sekolah: "SMAN 1 Sukodadi",
    npsn: "20506255",
    kecamatan: "KEC. SUKODADI",
    skor: 82,
    status: "kritis",
    lat: -7.1124,
    lng: 112.3189,
    posX: 54,
    posY: 34,
    fasilitas: "Lab Kimia Utama",
    deskripsi: "Atap bocor & plafon runtuh menimpa meja reagen praktikum. Bahaya konsleting listrik saat hujan deras.",
    dapodikKondisi: "Baik",
    laporanWarga: 8,
    dukunganWarga: 142,
    radius: "1.5 km",
  },
  {
    id: "pin-2",
    sekolah: "SMKN 1 Lamongan",
    npsn: "20506300",
    kecamatan: "Kec. Lamongan",
    skor: 74,
    status: "kritis",
    lat: -7.1235,
    lng: 112.4112,
    posX: 68,
    posY: 58,
    fasilitas: "Bengkel Otomotif Mesin",
    deskripsi: "Panel kelistrikan meleleh dan blower sirkulasi udara padam.",
    dapodikKondisi: "Baik",
    laporanWarga: 14,
    dukunganWarga: 38,
    radius: "2.1 km",
  },
  {
    id: "pin-3",
    sekolah: "SMPN 2 Lamongan",
    npsn: "20506198",
    kecamatan: "Kec. Deket",
    skor: 63,
    status: "sedang",
    lat: -7.1198,
    lng: 112.4285,
    posX: 44,
    posY: 52,
    fasilitas: "Sanitasi & Pipa Air Blok B",
    deskripsi: "Pompa air macet dan pipa pembuangan retak menggenangi lorong.",
    dapodikKondisi: "Rusak Ringan",
    laporanWarga: 6,
    dukunganWarga: 24,
    radius: "1.0 km",
  },
  {
    id: "pin-4",
    sekolah: "SDN 5 Turi",
    npsn: "20506199",
    kecamatan: "KEC. TURI",
    skor: 48,
    status: "sedang",
    lat: -7.0984,
    lng: 112.3512,
    posX: 33,
    posY: 25,
    fasilitas: "Dinding R.Kelas 3B",
    deskripsi: "Retakan plester vertikal memanjang di sisi utara kelas.",
    dapodikKondisi: "Baik",
    laporanWarga: 4,
    dukunganWarga: 19,
    radius: "0.8 km",
  },
  {
    id: "pin-5",
    sekolah: "SMPN 1 Lamongan",
    npsn: "20506303",
    kecamatan: "Kec. Lamongan",
    skor: 35,
    status: "rendah",
    lat: -7.1215,
    lng: 112.4158,
    posX: 24,
    posY: 68,
    fasilitas: "Sirkulasi Udara Perpustakaan",
    deskripsi: "Exhaust fan mati dan ruangan pengap saat kapasitas penuh.",
    dapodikKondisi: "Baik",
    laporanWarga: 3,
    dukunganWarga: 12,
    radius: "0.5 km",
  },
]

export const dataCsvRawSample = [
  {
    npsn: "20506255",
    nama: "SMAN 1 Sukodadi",
    jenjang: "SMA",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "Baik",
    perpus: "Baik",
    catatan: "Sinkron Dapodik V.2026.a",
    status: "Valid",
  },
  {
    npsn: "20506198",
    nama: "SMPN 2 Lamongan",
    jenjang: "SMP",
    rKelas: "Baik",
    toilet: "Rusak Ringan",
    lab: "Baik",
    perpus: "Baik",
    catatan: "Pemeliharaan rutin",
    status: "Valid",
  },
  {
    npsn: "",
    nama: "SDN Sukomulyo 2",
    jenjang: "SD",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "-",
    perpus: "-",
    catatan: "Warning: NPSN tidak boleh kosong",
    status: "Gagal",
    isError: true,
  },
  {
    npsn: "20506300",
    nama: "SMKN 1 Lamongan",
    jenjang: "SMK",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "Rusak Ringan",
    perpus: "Baik",
    catatan: "Bengkel otomotif",
    status: "Valid",
  },
  {
    npsn: "20506199",
    nama: "SDN 5 Turi",
    jenjang: "SD",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "Baik",
    perpus: "Baik",
    catatan: "Valid",
    status: "Valid",
  },
  {
    npsn: "20506214",
    nama: "SMPN 1 Babat",
    jenjang: "SMP",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "Baik",
    perpus: "Baik",
    catatan: "Sinkronisasi berkala",
    status: "Valid",
  },
  {
    npsn: "20506288",
    nama: "SDN Sendangagung 1",
    jenjang: "SD",
    rKelas: "Baik",
    toilet: "Rusak Sedang",
    lab: "-",
    perpus: "Baik",
    catatan: "Menunggu DAK 2026",
    status: "Valid",
  },
  {
    npsn: "20506240",
    nama: "SMAS Muhammadiyah 1 Babat",
    jenjang: "SMA",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "Baik",
    perpus: "Baik",
    catatan: "Dapodik swasta",
    status: "Valid",
  },
  {
    npsn: "20506312",
    nama: "SMPN 1 Paciran",
    jenjang: "SMP",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "Baik",
    perpus: "Baik",
    catatan: "Verifikasi kepala lab",
    status: "Valid",
  },
  {
    npsn: "20506177",
    nama: "SDN Moropelang",
    jenjang: "SD",
    rKelas: "Baik",
    toilet: "Baik",
    lab: "-",
    perpus: "Baik",
    catatan: "Sinkron via operator",
    status: "Valid",
  },
]

export const riwayatIngestDapodik = [
  {
    waktu: "24 Okt 2025 • 08:30 WIB",
    berkas: "dapodik_sarpras_wilayah_tengah.csv",
    baris: 142,
    status: "Berhasil",
    pengunggah: "Bambang H., S.T.",
  },
  {
    waktu: "12 Okt 2025 • 14:15 WIB",
    berkas: "dapodik_sarpras_kec_babat_v2.csv",
    baris: 88,
    status: "Gagal Sebagian (3 Error)",
    pengunggah: "Siti Aminah, M.Pd.",
  },
  {
    waktu: "28 Sep 2025 • 10:02 WIB",
    berkas: "rekap_dapodik_sarpras_pantura_q3.csv",
    baris: 210,
    status: "Berhasil",
    pengunggah: "Bambang H., S.T.",
  },
  {
    waktu: "15 Agu 2025 • 16:40 WIB",
    berkas: "master_sarpras_ganjil_awal_tahun.csv",
    baris: 415,
    status: "Berhasil",
    pengunggah: "Ir. Hendro Kusumo",
  },
  {
    waktu: "02 Agu 2025 • 11:20 WIB",
    berkas: "sarpras_koreksi_kec_karangbinangun.csv",
    baris: 32,
    status: "Gagal Sebagian (1 Error)",
    pengunggah: "Bambang H., S.T.",
  },
]
