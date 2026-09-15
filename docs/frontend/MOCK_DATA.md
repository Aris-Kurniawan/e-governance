# MOCK_DATA.md — SIMAKIS Frontend

> Data statis untuk membangun UI sebelum backend terhubung (`frontend/SETUP.md`
> §atas). **Bentuk objek wajib sama dengan** `universal/INTERFACES.md` — begitu
> backend siap, ganti sumber data tanpa mengubah tipe komponen
> (`API_CLIENT.md` §3). Nama sekolah & NPSN diambil dari hasil scraping asli
> Kecamatan Lamongan (`backend/app/dataset/raw/`) supaya UI tidak menampilkan
> data fiktif yang mustahil.

**Update terakhir:** 15 September 2026

---

## 1. Cara Pakai

```
src/mocks/
├── sekolah.ts      # daftar + detail sekolah
├── klaster.ts      # klaster isu
├── laporan.ts      # laporan & riwayat
├── status.ts       # status tindak lanjut
└── auth.ts         # user dummy per role
```

Aturan:

1. **Jangan** import mock langsung di komponen — lewat hook/`api` layer supaya
   pergantian ke API asli cuma mengubah satu tempat.
2. Semua mock **wajib** punya tipe dari `API_CLIENT.md` §3 (`SekolahList`,
   `SekolahDetail`, dst) — mock tanpa tipe cepat basi.
3. Sertakan **kasus tidak-happy** (kritis, tidak_terverifikasi, pending vote),
   bukan cuma data bagus — `PAGE_STATES.md` minta kondisi itu punya tampilan.

---

## 2. Data Riil yang Jadi Basis

Dari scraping Dapodik (`scrape_sekolah_v4.py`, kode kecamatan `050713`):

| Jenjang | Jumlah |
|---|---|
| SD | 37 |
| SMP | 12 |
| SMA | 5 |
| SMK | 8 |
| **Total** | **62** |

Untuk mock, cukup 12–16 sekolah sampel yang tersebar merata antar jenjang —
tidak perlu seluruh 62 (file mock jangan jadi lebih besar dari kode).

---

## 3. Sekolah

### 3.1 List (`GET /sekolah`)

```ts
// src/mocks/sekolah.ts
import type { SekolahList, SekolahDetail } from "@/lib/api/types";

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
];
```

> **Catatan:** NPSN di atas contoh format 8 digit. Saat backend siap, ganti
> dengan NPSN asli dari `sekolah_lamongan_semua.json` — cek dulu apakah
> kolom `npsn` di raw sama panjangnya.

### 3.2 Detail (`GET /sekolah/{npsn}`)

```ts
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
        { nama_ruang: "Ruang Kelas",     kondisi: "rusak_berat"  },
        { nama_ruang: "Laboratorium IPA", kondisi: "rusak_sedang" },
        { nama_ruang: "Perpustakaan",    kondisi: "rusak_ringan" },
        { nama_ruang: "Ruang Guru",      kondisi: "baik"         },
      ],
    },
    klaster_isu: [
      { klaster_id: "kls-001", kategori: "infrastruktur_sarana",         skor_prioritas: 87, status: "terverifikasi" },
      { klaster_id: "kls-002", kategori: "ketersediaan_tenaga_pengajar", skor_prioritas: 45, status: "menunggu_verifikasi" },
    ],
  },
};
```

Untuk sekolah tanpa isu, tetap sediakan satu entri dengan `klaster_isu: []` —
menguji tampilan empty state di Detail Sekolah.

---

## 4. Klaster Isu (`GET /klaster`, `GET /klaster/{id}`)

```ts
export const klasterList = [
  { klaster_id: "kls-001", sekolah_npsn: "20532361", sekolah_nama: "SMPN 1 Lamongan",
    kategori: "infrastruktur_sarana", jumlah_laporan: 7, skor_prioritas: 87,
    status: "terverifikasi" },
  { klaster_id: "kls-002", sekolah_npsn: "20532361", sekolah_nama: "SMPN 1 Lamongan",
    kategori: "ketersediaan_tenaga_pengajar", jumlah_laporan: 3, skor_prioritas: 45,
    status: "menunggu_verifikasi" },
  { klaster_id: "kls-003", sekolah_npsn: "20532410", sekolah_nama: "SMKN 1 Lamongan",
    kategori: "infrastruktur_sarana", jumlah_laporan: 5, skor_prioritas: 72,
    status: "terverifikasi" },
  { klaster_id: "kls-004", sekolah_npsn: "20532301", sekolah_nama: "SDN Lamongan I",
    kategori: "infrastruktur_sarana", jumlah_laporan: 4, skor_prioritas: 68,
    status: "tidak_terverifikasi" },
];
```

`kls-004` sengaja `tidak_terverifikasi` — untuk menguji tampilan badge merah +
**alasan wajib tampil** (`PAGE_STATES.md` §A5).

---

## 5. Laporan

### 5.1 Request & Respons (`POST /laporan`)

```ts
// contoh payload — kategori infrastruktur (ada cross-check)
export const laporanRequestContoh = {
  sekolah_npsn: "20532361",
  kategori: "infrastruktur_sarana",
  fasilitas_terkait: "Ruang Kelas",
  deskripsi: "Plafon ruang kelas 7A bocor dan retak, sudah 2 bulan belum diperbaiki.",
};

export const laporanResponseContoh = {
  laporan_id: "lap-001",
  tracking_id: "SMK-2026-000123",
  status: "menunggu_verifikasi",
  cross_check: {
    tersedia: true,
    data_dapodik: "Ruang Kelas: 12 unit (baik 5, rusak ringan 3, rusak sedang 2, rusak berat 2)",
  },
};
```

Sediakan **3 varian respons** sesuai `PAGE_STATES.md` §A4:

| Kategori | `cross_check.tersedia` | `data_dapodik` |
|---|---|---|
| `infrastruktur_sarana` | `true` | ringkasan kondisi ruang |
| `ketersediaan_tenaga_pengajar` | `true` | rasio guru:siswa |
| `lainnya` | `false` | `null` |

### 5.2 Riwayat (`GET /laporan/riwayat`)

```ts
export const laporanRiwayat = [
  { laporan_id: "lap-001", tracking_id: "SMK-2026-000123", sekolah_nama: "SMPN 1 Lamongan",
    kategori: "infrastruktur_sarana", status: "dalam_proses", tanggal: "2026-02-10" },
  { laporan_id: "lap-002", tracking_id: "SMK-2026-000124", sekolah_nama: "SMKN 1 Lamongan",
    kategori: "infrastruktur_sarana", status: "selesai", tanggal: "2026-01-28" },
  { laporan_id: "lap-003", tracking_id: "SMK-2026-000125", sekolah_nama: "SMAN 1 Lamongan",
    kategori: "lainnya", status: "tidak_dapat_ditindaklanjuti", tanggal: "2026-01-15" },
];
```

---

## 6. Status Tindak Lanjut (`GET /klaster/{id}/status`)

Cakup **semua 6 status** di `PAGE_STATES.md` §A5 — satu object per status,
supaya badge & stepper bisa diuji tanpa menunggu backend:

```ts
export const statusContoh = {
  menunggu_verifikasi: {
    status_terkini: "menunggu_verifikasi",
    riwayat: [{ status: "menunggu_verifikasi", alasan: null, timestamp: "2026-02-01T09:00:00+07:00" }],
  },
  tidak_terverifikasi: {
    status_terkini: "tidak_terverifikasi",
    riwayat: [
      { status: "menunggu_verifikasi", alasan: null, timestamp: "2026-02-01T09:00:00+07:00" },
      { status: "tidak_terverifikasi", alasan: "Laporan duplikat dengan klaster kls-003.", timestamp: "2026-02-03T10:30:00+07:00" },
    ],
  },
  dalam_antrian_prioritas: { /* ... */ },
  dalam_proses:           { /* ... */ },
  selesai:                { /* ... */ },
  tidak_dapat_ditindaklanjuti: {
    status_terkini: "tidak_dapat_ditindaklanjuti",
    riwayat: [
      { status: "dalam_proses", alasan: null, timestamp: "2026-02-05T08:00:00+07:00" },
      { status: "tidak_dapat_ditindaklanjuti", alasan: "Lahan terdampak belum jelas status kepemilikannya.", timestamp: "2026-02-20T14:00:00+07:00" },
    ],
  },
};
```

Perhatikan dua status yang **wajib** punya `alasan` terisi — dipakai menguji
`PAGE_STATES.md` §C1.

---

## 7. Vote

```ts
export const voteContoh = {
  sukses_terhitung: { vote_id: "v-001", status_vote: "terhitung" },
  sukses_pending:   { vote_id: "v-002", status_vote: "pending" },   // masa tunda verifikasi
};
```

`status_vote: "pending"` harus tampil badge **"Menunggu Masa Tunda"**, bukan
"Sudah Vote" (`PAGE_STATES.md` §A3). Mock `409 ALREADY_VOTED` juga disediakan
untuk menguji tombol disabled.

---

## 8. User Dummy (Auth)

```ts
export const usersContoh = {
  warga_umum:              { nama: "Budi Santoso",   role: "warga_umum",              status_verifikasi: "menunggu" },
  warga_terverifikasi:     { nama: "Siti Aminah",    role: "warga_terverifikasi",     status_verifikasi: "terverifikasi" },
  komite_sekolah:          { nama: "Ahmad Fauzi",    role: "komite_sekolah",          status_verifikasi: "terverifikasi" },
  verifikator_dinas:       { nama: "Dewi Lestari",   role: "verifikator_dinas",       status_verifikasi: "terverifikasi" },
  kepala_dinas:            { nama: "H. Suprapto",    role: "kepala_dinas",            status_verifikasi: "terverifikasi" },
  admin:                   { nama: "Rizky Pratama",  role: "admin",                   status_verifikasi: "terverifikasi" },
};
```

`warga_umum` (belum terverifikasi) penting untuk menguji `PAGE_STATES.md` §A1
(halaman informasi publik + CTA "Ajukan Verifikasi Akun") dan §A3 (vote masih
`pending`).

---

## 9. Aturan Konsistensi

1. **Nama sekolah & NPSN** boleh dikarang untuk sampel, tapi **formatnya** harus
   sama dengan data Dapodik asli. Jangan pakai nama sekolah luar Lamongan.
2. **Skor prioritas** 0–100 (skala keparahan + vote, `PRD.md` §4) — jangan
   pakai angka di luar rentang itu.
3. **Timestamp** selalu ISO 8601 dengan offset `+07:00`.
4. Kalau `INTERFACES.md` berubah, **mock ini ikut diubah di commit yang sama**
   — mock yang drift dari kontrak lebih berbahaya daripada tidak ada mock.

---

## 10. Yang Belum Diputuskan

Mewarisi `INTERFACES.md` §11 — mock boleh menebak sementara, tapi beri
komentar `// TODO(kontrak):` di kode:

- [ ] Ambang batas `penanda_masalah`.
- [ ] Durasi masa tunda vote (`pending` → `terhitung`).
- [ ] Struktur `GET /dashboard/wilayah` untuk Dashboard Warga — endpoint yang
      ada saat ini hanya untuk role dinas (`INTERFACES.md` §3).
