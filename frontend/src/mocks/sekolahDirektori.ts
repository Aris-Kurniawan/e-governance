export interface SekolahDirektoriStat {
  label: string
  val: string
  desc: string
  valueClass?: string
  descClass?: string
}

export interface SekolahDirektoriTemuan {
  tipe: "kritis" | "minor" | "sesuai"
  judul: string
  deskripsi: string
}

export interface SekolahDirektoriItem {
  npsn: string
  nama: string
  jenjang: "SD" | "SMP" | "SMA" | "SMK" | "MI" | "MTs"
  alamat: string
  status: "Selisih Kritis" | "Selisih Minor" | "Data Sesuai"
  statusBadge: string
  audit: string
  stats: SekolahDirektoriStat[]
  temuan: SekolahDirektoriTemuan
}

// ── Data Baseline (turunan deterministik dari item direktori) ──
export interface FasilitasBaseline {
  nama: string
  jumlah: string
  kondisi: string
  tipe: "baik" | "ringan" | "berat" | "sanggahan"
  catatan?: string
}

export interface SekolahBaseline {
  npsn: string
  nama: string
  jenjang: string
  alamat: string
  status: SekolahDirektoriItem["status"]
  statusBadge: string
  audit: string
  akreditasi: string
  kepalaSekolah: string
  email: string
  kodeWilayah: string
  tahunAjaran: string
  rasioGuruSiswa: string
  rasioSpamTeks: string
  rasioTerpenuhi: boolean
  jumlahPesertaDidik: number
  jumlahPendidik: number
  jumlahRombel: number
  utilitas: number
  totalUnit: number
  totalBaik: number
  persenBaik: number
  persenRingan: number
  persenBerat: number
  fasilitas: FasilitasBaseline[]
  temuan: SekolahDirektoriTemuan
  dokumentasiTahun: string
  faktaCatatan: string
  faktaLabel: string
}

// Hash sederhana dari NPSN → angka stabil (agar tiap sekolah punya variasi konsisten)
function hashNpsn(npsn: string): number {
  let h = 0
  for (let i = 0; i < npsn.length; i++) {
    h = (h * 31 + npsn.charCodeAt(i)) % 100000
  }
  return h
}

// Pool nama kepala sekolah (mock deterministik per NPSN) — Kartu 2 Profil Dapodik (TASK_GUIDE F2.6)
const NAMA_KEPALA_SEKOLAH = [
  "Drs. H. Sutrisno, M.Pd.",
  "Dra. Sri Wahyuni, M.M.Pd.",
  "Drs. Bambang Setiawan, M.Pd.",
  "Siti Aminah, S.Pd., M.M.Pd.",
  "Drs. Agus Prasetyo, M.Pd.",
  "Hj. Nurul Khotimah, S.Pd., M.Pd.",
  "Drs. Endra Wijaya, M.M.Pd.",
  "Retno Widyawati, S.Pd., M.Pd.",
]

// Ambil angka pertama dari string seperti "28 Ruang", "4 Lab", "1:16", "18"
function angkaPertama(val: string): number | null {
  const m = val.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function buildFasilitas(item: SekolahDirektoriItem): FasilitasBaseline[] {
  const h = hashNpsn(item.npsn)
  const list: FasilitasBaseline[] = []

  item.stats.forEach((st, idx) => {
    const label = st.label
    const val = st.val
    if (/ruang kelas/i.test(label)) {
      const total = angkaPertama(val) ?? 12
      const rusakBerat = item.status === "Selisih Kritis" ? Math.max(1, Math.round(total * 0.1)) : 0
      const rusakRingan = item.status === "Selisih Minor" ? Math.max(1, Math.round(total * 0.12)) : (item.status === "Selisih Kritis" ? 2 : 0)
      const baik = Math.max(0, total - rusakBerat - rusakRingan)
      list.push({
        nama: "Ruang Kelas",
        jumlah: `${total} ruang`,
        kondisi: rusakBerat > 0 ? `${rusakBerat} rusak berat` : rusakRingan > 0 ? `${rusakRingan} rusak ringan` : "Kondisi baik",
        tipe: rusakBerat > 0 ? "berat" : rusakRingan > 0 ? "ringan" : "baik",
        catatan: `${total} ruang · ${baik} baik`,
      })
    } else if (/lab|bengkel|multimedia|komputer/i.test(label)) {
      const mismatch = /mismatch/i.test(val) || /mismatch/i.test(st.desc)
      list.push({
        nama: label,
        jumlah: val,
        kondisi: mismatch ? "Ada ketidaksesuaian" : "Fungsi penuh",
        tipe: mismatch ? "sanggahan" : "baik",
        catatan: st.desc,
      })
    } else if (/rasio/i.test(label)) {
      list.push({
        nama: "Rasio Guru:Siswa",
        jumlah: val,
        kondisi: /optimal|baik|ideal|memenuhi/i.test(st.desc) ? "Memenuhi SPM" : "Perlu perhatian",
        tipe: /optimal|baik|ideal|memenuhi/i.test(st.desc) ? "baik" : "ringan",
        catatan: st.desc,
      })
    } else if (/sanitasi|toilet/i.test(label)) {
      const rusak = /rusak|perlu|macet|tersumbat/i.test(st.desc)
      list.push({
        nama: "Sanitasi / Toilet",
        jumlah: val,
        kondisi: rusak ? st.desc : "Standar higienis",
        tipe: rusak ? "ringan" : "baik",
        catatan: st.desc,
      })
    } else if (/perpustakaan/i.test(label)) {
      list.push({
        nama: "Perpustakaan",
        jumlah: val,
        kondisi: "Tercatat kondisi baik",
        tipe: "baik",
        catatan: st.desc,
      })
    } else if (/uks/i.test(label)) {
      list.push({
        nama: "Ruang UKS",
        jumlah: val,
        kondisi: "Tercatat kondisi baik",
        tipe: "baik",
        catatan: st.desc,
      })
    } else if (/lapangan|olahraga|aula/i.test(label)) {
      list.push({
        nama: label,
        jumlah: val,
        kondisi: "Fasilitas memadai",
        tipe: "baik",
        catatan: st.desc,
      })
    } else if (/disabilitas|inklusi/i.test(label)) {
      list.push({
        nama: "Akses Disabilitas",
        jumlah: val,
        kondisi: "Jalur ramp tersedia",
        tipe: "baik",
        catatan: st.desc,
      })
    } else {
      list.push({
        nama: label,
        jumlah: val,
        kondisi: "Tercatat kondisi baik",
        tipe: "baik",
        catatan: st.desc,
      })
    }

    // Tambahan standar bila belum ada
    if (idx === item.stats.length - 1) {
      if (!list.some((f) => f.nama === "Ruang UKS")) {
        list.push({ nama: "Ruang UKS", jumlah: "1 unit", kondisi: "Tercatat kondisi baik", tipe: "baik" })
      }
      if (!list.some((f) => f.nama === "Perpustakaan")) {
        list.push({ nama: "Perpustakaan", jumlah: "1 unit", kondisi: "Tercatat kondisi baik", tipe: "baik" })
      }
    }
  })

  // Sisipkan flag sanggahan pada item pertama bila status bukan "Data Sesuai"
  if (item.status === "Selisih Kritis" && list.length > 0) {
    list[list.length - 1] = { ...list[list.length - 1], tipe: "sanggahan", catatan: (list[list.length - 1].catatan || "") + " · Ada sanggahan warga" }
  }

  // Variasi kecil berbasis hash agar tidak identik
  if (h % 2 === 0 && !list.some((f) => f.nama === "Lapangan Olahraga")) {
    list.push({ nama: "Lapangan Olahraga", jumlah: "1 unit", kondisi: "Fasilitas memadai", tipe: "baik" })
  }

  return list
}

export function buildSekolahBaseline(item: SekolahDirektoriItem): SekolahBaseline {
  const h = hashNpsn(item.npsn)
  const kelasStat = item.stats.find((s) => /ruang kelas/i.test(s.label))
  const totalUnit = kelasStat ? angkaPertama(kelasStat.val) ?? 12 : 12

  const persenBerat = item.status === "Selisih Kritis" ? 8 : 0
  const persenRingan = item.status === "Selisih Minor" ? 14 : item.status === "Selisih Kritis" ? 14 : 0
  const persenBaik = 100 - persenBerat - persenRingan

  const totalBaik = Math.round((totalUnit * persenBaik) / 100)

  const rasioStat = item.stats.find((s) => /rasio/i.test(s.label))
  const rasio = rasioStat?.val ?? (item.jenjang === "SD" || item.jenjang === "MI" ? "1:18" : "1:15")

  const pendidik = 12 + (h % 30)
  const peserta = Math.round(
    pendidik * (parseInt(rasio.split(":")[1] || "18", 10)),
  )
  const rombel = Math.max(6, Math.round(totalUnit * 0.7))
  const utilitas = Math.min(98, 78 + (h % 18))

  return {
    npsn: item.npsn,
    nama: item.nama,
    jenjang: item.jenjang,
    alamat: item.alamat,
    status: item.status,
    statusBadge: item.statusBadge,
    audit: item.audit,
    akreditasi: item.status === "Data Sesuai" ? "A" : "B",
    kepalaSekolah: NAMA_KEPALA_SEKOLAH[h % NAMA_KEPALA_SEKOLAH.length],
    email: `info@${item.nama.toLowerCase().replace(/[^a-z0-9]+/g, "")}.sch.id`,
    kodeWilayah: "35.24.12",
    tahunAjaran: "2025/2026",
    rasioGuruSiswa: rasio,
    rasioSpamTeks: `Ambang batas standar pelayanan minimal Kemendikbud: maksimal 1:20 untuk jenjang ${item.jenjang}.`,
    rasioTerpenuhi: parseInt(rasio.split(":")[1] || "18", 10) <= 20,
    jumlahPesertaDidik: peserta,
    jumlahPendidik: pendidik,
    jumlahRombel: rombel,
    utilitas,
    totalUnit,
    totalBaik,
    persenBaik,
    persenRingan,
    persenBerat,
    fasilitas: buildFasilitas(item),
    temuan: item.temuan,
    dokumentasiTahun: "2024",
    faktaCatatan:
      item.temuan.tipe === "sesuai"
        ? "Tidak ditemukan selisih pada audit partisipatif terakhir. Data Dapodik dan hasil pantauan warga sinkron."
        : "Dilaporkan oleh warga/komite terverifikasi dan sedang dalam proses peninjauan Dinas.",
    faktaLabel:
      item.temuan.tipe === "sesuai"
        ? "Terverifikasi Sesuai"
        : item.temuan.tipe === "kritis"
        ? "Temuan Kritis Warga"
        : "Selisih Minor Warga",
  }
}

export function getSekolahBaseline(npsn: string): SekolahBaseline | undefined {
  const item = sekolahDirektoriList.find((s) => s.npsn === npsn)
  return item ? buildSekolahBaseline(item) : undefined
}

export const sekolahDirektoriList: SekolahDirektoriItem[] = [
  {
    npsn: "20506281",
    nama: "SMAN 1 Sukodadi",
    jenjang: "SMA",
    alamat: "Jl. Raya Sukodadi No. 42, Kec. Lamongan",
    status: "Selisih Kritis",
    statusBadge: "1 Selisih Kritis",
    audit: "2 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "28", desc: "Kondisi Baik" },
      { label: "Laboratorium", val: "4 Lab", desc: "1 Mismatch", valueClass: "text-rose-700", descClass: "text-rose-600 font-bold" },
      { label: "Rasio Guru", val: "1:16", desc: "Optimal", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "kritis",
      judul: "Temuan Partisipatif",
      deskripsi: "Laboratorium Kimia dialihfungsikan menjadi gudang logistik, belum terbarui di Dapodik semester ini."
    }
  },
  {
    npsn: "20506312",
    nama: "SMPN 2 Lamongan",
    jenjang: "SMP",
    alamat: "Jl. Ki Sarmidi Mangunsarkoro No. 8, Lamongan",
    status: "Selisih Minor",
    statusBadge: "1 Selisih Minor",
    audit: "5 hari lalu",
    stats: [
      { label: "Ruang Kelas Aktif", val: "24 Ruang", desc: "Standar Sarpras" },
      { label: "Status Sanitasi", val: "Perlu Audit", desc: "2 Bilik Rusak Ringan", valueClass: "text-amber-800", descClass: "text-amber-700 font-semibold" }
    ],
    temuan: {
      tipe: "minor",
      judul: "Verifikasi Lapangan",
      deskripsi: "Sarana sanitasi siswa blok selatan dilaporkan 2 dari 6 bilik air kran tersumbat."
    }
  },
  {
    npsn: "20506199",
    nama: "SDN 5 Turi",
    jenjang: "SD",
    alamat: "Desa Wangunrejo, Perbatasan Kec. Turi & Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "12 Ruang", desc: "Lengkap 100%", descClass: "text-emerald-700 font-semibold" },
      { label: "Perpustakaan", val: "1 Unit", desc: "Akreditasi B" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Hasil audit komite sekolah dan data input Dapodik sinkron tanpa selisih sarpras."
    }
  },
  {
    npsn: "20506450",
    nama: "SMKN 1 Lamongan",
    jenjang: "SMK",
    alamat: "Jl. Jenderal Sudirman No. 105, Lamongan",
    status: "Selisih Minor",
    statusBadge: "1 Selisih Minor",
    audit: "3 hari lalu",
    stats: [
      { label: "Ruang Kelas Teori", val: "36 Ruang", desc: "Kapasitas 1.280 Siswa" },
      { label: "Bengkel Praktik", val: "6 Bengkel", desc: "1 Unit Renovasi", descClass: "text-amber-700 font-semibold" }
    ],
    temuan: {
      tipe: "minor",
      judul: "Pembaruan Lapangan",
      deskripsi: "Bengkel Otomotif unit 2 sedang pemeliharaan instalasi listrik, tercatat siap pakai di sistem pusat."
    }
  },
  {
    npsn: "20532301",
    nama: "SDN Lamongan I",
    jenjang: "SD",
    alamat: "Jl. Basuki Rahmat No. 1, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "3 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "18 Ruang", desc: "Kondisi Terawat", descClass: "text-emerald-700 font-semibold" },
      { label: "Sanitasi", val: "8 Bilik", desc: "Standar Higienis" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Pemutakhiran sarana semester ganjil terverifikasi serasi antara operator dan paguyuban kelas."
    }
  },
  {
    npsn: "20532302",
    nama: "SDN Lamongan II",
    jenjang: "SD",
    alamat: "Jl. Veteran No. 12, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "4 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "14 Ruang", desc: "Kondisi Baik", descClass: "text-emerald-700 font-semibold" },
      { label: "Rasio Guru", val: "1:18", desc: "Memenuhi SPM" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Seluruh fasilitas belajar aktif beroperasi sesuai laporan pemeliharaan BOS semester ini."
    }
  },
  {
    npsn: "20532303",
    nama: "SDN Sukorejo",
    jenjang: "SD",
    alamat: "Jl. Pendidikan No. 5, Sukorejo, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "12 Ruang", desc: "Kondisi Optimal", descClass: "text-emerald-700 font-semibold" },
      { label: "Lapangan Olahraga", val: "1 Unit", desc: "Fasilitas Memadai" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Audit fisik komite mencatat sarana belajar mengajar sesuai 100% dengan pangkalan data Dapodik."
    }
  },
  {
    npsn: "20532344",
    nama: "SDN Tumenggungan",
    jenjang: "SD",
    alamat: "Jl. Kolonel Sutarto No. 8, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "2 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "16 Ruang", desc: "Standar SPM" },
      { label: "UKS & Sanitasi", val: "Baik", desc: "Air Bersih Mengalir", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Hasil verifikasi inventaris sarana ruang kelas terdata lengkap tanpa catatan anomali."
    }
  },
  {
    npsn: "20532350",
    nama: "SDN Jetis I",
    jenjang: "SD",
    alamat: "Jl. Jetis Indah No. 15, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "5 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "12 Ruang", desc: "Lengkap 100%", descClass: "text-emerald-700 font-semibold" },
      { label: "Perpustakaan", val: "1 Unit", desc: "Ramah Anak" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Pencocokan data sarpras berkala tidak menemukan selisih antara laporan warga dan pusat."
    }
  },
  {
    npsn: "20532355",
    nama: "SDN Made I",
    jenjang: "SD",
    alamat: "Jl. Panglima Sudirman No. 88, Made, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "15 Ruang", desc: "Kondisi Baik" },
      { label: "Akses Disabilitas", val: "Tersedia", desc: "Jalur Ramp Sesuai", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Fasilitas inklusi dan sanitasi siswa baru telah tercatat valid di sistem Dapodik pusat."
    }
  },
  {
    npsn: "20532358",
    nama: "SDN Sidoharjo I",
    jenjang: "SD",
    alamat: "Jl. Sunan Giri No. 24, Sidoharjo, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "4 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "12 Ruang", desc: "Standar Pelayanan", descClass: "text-emerald-700 font-semibold" },
      { label: "Rasio Guru", val: "1:17", desc: "Ideal" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Laporan periodik sarana sekolah selaras dengan cek fisik lapangan tim pengawas distrik."
    }
  },
  {
    npsn: "60718291",
    nama: "MIN 1 Lamongan",
    jenjang: "MI",
    alamat: "Jl. Raya Banjarmendalan No. 3, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "6 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "18 Ruang", desc: "Kondisi Prima", descClass: "text-emerald-700 font-semibold" },
      { label: "Lab Komputer", val: "24 PC", desc: "Jaringan Aktif" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Data Emis Kemenag dan baseline sinkron dengan pantauan wali murid."
    }
  },
  {
    npsn: "60718295",
    nama: "MIS Ma'arif Lamongan",
    jenjang: "MI",
    alamat: "Jl. Kusuma Bangsa No. 10, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "12 Ruang", desc: "Terawat Penuh" },
      { label: "Sanitasi", val: "6 Bilik", desc: "Air Bersih Optimal", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Hasil verifikasi partisipatif membuktikan fasilitas sanitasi dan kelas berfungsi optimal."
    }
  },
  {
    npsn: "20532361",
    nama: "SMPN 1 Lamongan",
    jenjang: "SMP",
    alamat: "Jl. Ki Sarmidi Mangunsarkoro No. 12, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "3 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "30 Ruang", desc: "Kondisi Baik" },
      { label: "Lab IPA & TIK", val: "4 Lab", desc: "Fungsi Penuh", descClass: "text-emerald-700 font-semibold" },
      { label: "Rasio Guru", val: "1:15", desc: "Sangat Optimal" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Seluruh sarana laboratorium IPA dan TIK telah diverifikasi aktif beroperasi sesuai jadwal."
    }
  },
  {
    npsn: "20532370",
    nama: "SMPN 3 Lamongan",
    jenjang: "SMP",
    alamat: "Jl. Lamongrejo No. 21, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "24 Ruang", desc: "Standar Sarpras" },
      { label: "Perpustakaan", val: "Digital", desc: "Akreditasi A", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Data Dapodik dan temuan monitoring pengawas kecamatan berkesesuaian tanpa selisih."
    }
  },
  {
    npsn: "20532375",
    nama: "SMPN 4 Lamongan",
    jenjang: "SMP",
    alamat: "Jl. Pahlawan No. 45, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "2 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "21 Ruang", desc: "Kondisi Terjaga" },
      { label: "Sanitasi", val: "14 Bilik", desc: "Standar Adiwiyata", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Sarana toilet dan pengolahan limbah ramah lingkungan berfungsi sesuai kriteria mutu."
    }
  },
  {
    npsn: "20582910",
    nama: "MTsN 1 Lamongan",
    jenjang: "MTs",
    alamat: "Jl. Veteran No. 30, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "5 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "27 Ruang", desc: "Kondisi Baik" },
      { label: "Laboratorium", val: "3 Lab", desc: "Kelayakan Tinggi", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Hasil audit lapangan paguyuban madrasah selaras dengan rilis data pusat Kemenag."
    }
  },
  {
    npsn: "20582915",
    nama: "MTs Ma'arif Lamongan",
    jenjang: "MTs",
    alamat: "Jl. Sunan Kalijaga No. 18, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Kelas", val: "15 Ruang", desc: "Standar SPM" },
      { label: "Multimedia", val: "1 Unit", desc: "Tersedia", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Inventaris fasilitas belajar terverifikasi akurat tanpa pelaporan anomali sarana."
    }
  },
  {
    npsn: "20532401",
    nama: "SMAN 1 Lamongan",
    jenjang: "SMA",
    alamat: "Jl. Panglima Sudirman No. 5, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "2 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "33 Ruang", desc: "Kondisi Prima" },
      { label: "Laboratorium", val: "6 Lab", desc: "Standar Unggulan", descClass: "text-emerald-700 font-semibold" },
      { label: "Rasio Guru", val: "1:14", desc: "Sangat Baik" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Seluruh ruang sains, bahasa, dan komputer terdata sinkron dan berstatus SPM Unggul."
    }
  },
  {
    npsn: "20532402",
    nama: "SMAN 2 Lamongan",
    jenjang: "SMA",
    alamat: "Jl. Raya Deket No. 9, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "4 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "30 Ruang", desc: "Kondisi Terawat" },
      { label: "Aula & Olahraga", val: "Lengkap", desc: "Standar Provinsi", descClass: "text-emerald-700 font-semibold" },
      { label: "Rasio Guru", val: "1:15", desc: "Optimal" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Audit partisipatif berkala menunjukkan fasilitas belajar mengajar terawat baik."
    }
  },
  {
    npsn: "20532405",
    nama: "SMAN 3 Lamongan",
    jenjang: "SMA",
    alamat: "Jl. Veteran No. 55, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "6 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "24 Ruang", desc: "Kondisi Baik" },
      { label: "Perpustakaan", val: "Digital", desc: "Akreditasi A", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Pencatatan sarana ruang belajar dan sanitasi siswa memenuhi SPM tanpa anomali."
    }
  },
  {
    npsn: "20532411",
    nama: "SMKN 2 Lamongan",
    jenjang: "SMK",
    alamat: "Jl. Dr. Wahidin No. 33, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "3 hari lalu",
    stats: [
      { label: "Ruang Teori", val: "32 Ruang", desc: "Kondisi Prima" },
      { label: "Bengkel & Lab", val: "5 Unit", desc: "Operasional Penuh", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Audit peralatan praktik kejuruan dan mesin bubut sinkron dengan inventaris resmi."
    }
  },
  {
    npsn: "20532420",
    nama: "SMK Muhammadiyah 1 Lamongan",
    jenjang: "SMK",
    alamat: "Jl. Andansari No. 14, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "1 minggu lalu",
    stats: [
      { label: "Ruang Teori", val: "20 Ruang", desc: "Kondisi Baik" },
      { label: "Lab Komputer", val: "3 Lab", desc: "Jaringan Fiber", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Fasilitas praktikum komputer dan lab jaringan telah dikonfirmasi sesuai standar industri."
    }
  },
  {
    npsn: "20583010",
    nama: "MAN 1 Lamongan",
    jenjang: "SMA",
    alamat: "Jl. Veteran No. 42, Lamongan",
    status: "Data Sesuai",
    statusBadge: "Data Sesuai",
    audit: "5 hari lalu",
    stats: [
      { label: "Ruang Kelas", val: "30 Ruang", desc: "Kondisi Baik" },
      { label: "Asrama & Lab", val: "Lengkap", desc: "Akreditasi Unggul", descClass: "text-emerald-700 font-semibold" }
    ],
    temuan: {
      tipe: "sesuai",
      judul: "Integritas Penuh",
      deskripsi: "Verifikasi sarana asrama dan laboratorium sains terpadu sesuai standar akreditasi A."
    }
  }
]
