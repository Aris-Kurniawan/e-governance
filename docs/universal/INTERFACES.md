# INTERFACES.md — SIMAKIS

> **Sumber kebenaran tunggal** untuk bentuk data yang lewat batas
> frontend↔backend. `frontend/API_CLIENT.md`, `frontend/MOCK_DATA.md`, dan
> `backend/app/schemas/` **wajib** mengikuti dokumen ini — bukan
> mendefinisikan ulang bentuk data sendiri-sendiri. Perubahan apapun di
> sini wajib disepakati Aris & Dimas dulu (lihat `GIT_WORKFLOW.md` §3).

**Base URL (dev):** `http://localhost:8000` (`VITE_API_BASE_URL`, lihat
`frontend/SETUP.md` §5)
**Format:** JSON, `Content-Type: application/json` (kecuali endpoint
upload file — lihat §10).
**Auth:** Bearer JWT di header `Authorization: Bearer <token>` untuk semua
endpoint kecuali yang ditandai **Publik**.

**Health check (tanpa auth):** `GET /` · `GET /health` · `GET /api/health`
→ `{ "status": "healthy" }` — dipakai Docker Compose `healthcheck` (F4.6).

---

## 0. Konvensi Umum

### 0.1 Amplop Respons

Semua respons sukses:

```json
{
  "data": { /* ... */ },
  "meta": { /* opsional — dipakai untuk pagination */ }
}
```

Semua respons gagal:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Deskripsi human-readable",
    "details": { /* opsional, per-field */ }
  }
}
```

### 0.2 Pagination

Query param: `?page=1&page_size=20` (default `page_size=20`, maks `100`).

```json
"meta": {
  "page": 1,
  "page_size": 20,
  "total_items": 143,
  "total_pages": 8
}
```

Sesuai `UI_COMPONENTS.md` §5 (`NumberedPagination.tsx`) — **tidak ada**
mode cursor/infinite-scroll di API ini.

### 0.3 Kode Error Standar

| `code` | HTTP Status | Kapan dipakai |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `UNAUTHORIZED` | 401 | Token tidak ada/invalid/expired |
| `FORBIDDEN` | 403 | Role tidak punya akses (RBAC) |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `ALREADY_VOTED` | 409 | Vote dobel pada klaster yang sama |
| `REASON_REQUIRED` | 422 | Field alasan wajib tidak diisi (lihat `PAGE_STATES.md` §C1) |
| `UNPROCESSABLE_ENTITY` | 422 | Body di luar enum validasi (mis. `PUT /laporan/{id}/status`, F4.11) |
| `INTERNAL_ERROR` | 500 | Kegagalan tak terduga |

### 0.4 Role (dipakai di field `role` dan enforcement RBAC)

`warga_umum` · `warga_terverifikasi` · `komite_sekolah` · `verifikator_dinas` · `kepala_dinas` · `admin`

---

## 1. Auth (`/auth`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/auth/register` | Publik | Ajukan verifikasi akun warga (NIK/KK) |
| POST | `/auth/login` | Publik | Login, dapat access + refresh token |
| POST | `/auth/refresh` | Publik | Perpanjang access token |
| GET | `/auth/me` | Semua role login | Data akun & role sendiri |

**`POST /auth/register`** — request:
```json
{
  "nama": "string",
  "nik": "string",          // 16 digit — akan dienkripsi AES-256 di PDP Vault, lihat ARCHITECTURE.md §3.2
  "email": "string",
  "password": "string",
  "sekolah_terkait_id": "string | null"   // opsional, self-declared (PRD.md §2.3)
}
```
response `201`:
```json
{ "data": { "user_id": "string", "status_verifikasi": "menunggu" } }
```

**`POST /auth/login`** — request: `{ "email": "string", "password": "string" }`
response `200`:
```json
{
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "role": "warga_terverifikasi",
    "status_verifikasi": "terverifikasi"
  }
}
```

**Catatan PDP:** field `nik` **tidak pernah** dikembalikan dalam respons
API manapun setelah registrasi — hanya disimpan di PDP Vault dan dipakai
internal untuk cross-check, sesuai `ARCHITECTURE.md` §3.2 dan §6.

---

## 2. Direktori & Profil Sekolah — FEAT-001 (`/sekolah`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/sekolah` | Publik | Cari/list sekolah |
| GET | `/sekolah/{npsn}` | Publik | Detail satu sekolah |

**`GET /sekolah?search=&jenjang=&page=`** — response `200`:
```json
{
  "data": [
    {
      "npsn": "string",
      "nama": "string",
      "alamat": "string",
      "jenjang": "SD | SMP | SMA | SMK",
      "jumlah_isu_aktif": 0,
      "penanda_masalah": "aman | perlu_perhatian | kritis"
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 0, "total_pages": 0 }
}
```

**`GET /sekolah/{npsn}`** — response `200`:
```json
{
  "data": {
    "npsn": "string",
    "nama": "string",
    "alamat": "string",
    "jenjang": "string",
    "status_sekolah": "Negeri | Swasta",
    "lintang": -7.1173967,
    "bujur": 112.3937566,
    "akreditasi": "string | null",
    "nama_kepsek": "string | null",
    "jumlah_isu_aktif": 12,
    "penanda_masalah": "aman | perlu_perhatian | kritis",
    "lintang": -7.1192083,
    "bujur": 112.4181,
    "rasio_guru_siswa": "1:16",
    "rasio_spm_terpenuhi": true,
    "jumlah_pd": 642,
    "jumlah_ptk": 40,
    "jumlah_rombel": 28,
    "utilitas_kapasitas_belajar": 89.4,
    "data_resmi": {
      "sumber": "Dapodik",
      "tanggal_pembaruan": "2026-09-13",
      "tanggal_verifikasi_baseline": "2026-08-01"
    },
    "kondisi_sarana": [
      {
        "nama_ruang": "Ruang Kelas",
        "jumlah": 30,
        "baik": 20,
        "rusak_ringan": 0,
        "rusak_sedang": 0,
        "rusak_berat": 10,
        "perlu_verifikasi": false,
        "ada_sanggahan": false
      },
      {
        "nama_ruang": "Perpustakaan",
        "jumlah": 1,
        "baik": 1,
        "rusak_ringan": 0,
        "rusak_sedang": 0,
        "rusak_berat": 0,
        "perlu_verifikasi": false,
        "ada_sanggahan": false
      }
    ],
    "ringkasan_sarpras": {
      "total_unit": 38,
      "total_baik": 30,
      "total_rusak_ringan": 5,
      "total_rusak_sedang": 0,
      "total_rusak_berat": 3
    },
    "klaster_isu": [
      { "klaster_id": "string", "kategori": "string", "skor_prioritas": 0, "status": "string" }
    ]
  }
}
```

**Catatan penting untuk implementasi v1 (september 2026):**
- `data_resmi` blok (sumber, tanggal_pembaruan, tanggal_verifikasi_baseline) **tidak diimplementasi di v1** — field ini tidak dikirim oleh backend meskipun ada di schema. Datanya tersedia di kolom `sekolah.sumber_data` dan `sekolah.tanggal_pembaruan_data` di DB.
- `ada_sanggahan` pada setiap item `kondisi_sarana` **tidak diimplementasi di v1** — field ini tidak dikirim oleh backend meskipun ada di contoh response. Endpoint untuk menghitung ada sanggahan tersedia di `GET /sekolah/{npsn}/sanggahan`.
- `penanda_masalah` di response saat ini mengembalikan `"normal"` (bukan `aman | perlu_perhatian | kritis` seperti di kontrak). Nilai threshold dan logika perhitungan belum diputuskan — lihat `INTERFACES.md` §11.
- `jumlah_isu_aktif` saat ini selalu `0` — belum dihitung oleh backend.
- **Field berikut dikirim dengan nilai default (null/0) dan tidak dirender di frontend v1** karena data Dapodik tidak di-ingest per scope infrastruktur-only:
  - `rasio_guru_siswa` → `null`
  - `rasio_spm_terpenuhi` → `false`
  - `jumlah_pd`, `jumlah_ptk`, `jumlah_rombel` → `0`
  - `utilitas_kapasitas_belajar` → `0.0`
  > **Penjelasan scope:** Platform SIMAKIS v1 fokus pada **infrastructure advocacy** — laporan isu terkait kondisi fisik sarana/prasarana. Data jumlah siswa, guru, dan rombel tidak di-ingest dari Dapodik karena tidak terkait langsung dengan ketersediaan infrastruktur.
- Frontend v1 hanya menampilkan:
  - **Audit Sarpras**: kartu ringkasan kondisi sarana (donut chart + detail per ruang)
  - **Profil Dapodik**: akreditasi, nama kepala sekolah, jenjang, status sekolah
  - **Isu & Klaster Warga**: empty state sampai Fase D (klasterisasi AI)

**Catatan teknis (umum):**
- `kondisi_sarana` berbentuk **agregat per jenis ruang** (bukan per ruang
  individual) — mengikuti bentuk data Dapodik yang memang agregat.
- `rasio_guru_siswa` = `jumlah_pd / jumlah_ptk`, `rasio_spm_terpenuhi` =
  rasio memenuhi standar jenjang (SD/SMA 1:20, SMP 1:25).
- `utilitas_kapasitas_belajar` = `(jumlah_rombel × 32) / jumlah_pd × 100`.
- `ada_sanggahan` = ada laporan warga (`status_sanggahan = menunggu` atau
  `divalidasi`) menargetkan `nama_ruang` tersebut.
- `perlu_verifikasi` = data Dapodik inkonsisten (`jumlah kondisi > jumlah
  unit`) — lihat `backend/DATABASE_SCHEMA.md` §5.
- **Aturan render FE** — FE **tidak boleh** merender angka `0`/`null` dari
  field yang ditandai "tidak diimplementasi di v1" di atas sebagai angka
  valid (mis. menampilkan "0 Rombongan Belajar"). Field tersebut di-hide,
  bukan ditampilkan sebagai angka nol.
- **Endpoint sanggahan** — warga melaporkan kondisi berbeda dari Dapodik
  langsung dari kartu fasilitas (lihat §4.1).

---

## 2.1 Sanggahan Sarpras (`/sekolah/{npsn}/sanggahan`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/laporan` | `warga_terverifikasi`, `komite_sekolah` | Kirim sanggahan (via laporan biasa, teks bebas; `fasilitas_terkait=nama_ruang` terisi otomatis dari kartu, `kondisi_dilaporkan=...`) |
| GET | `/sekolah/{npsn}/sanggahan` | Publik | Riwayat sanggahan untuk satu sekolah |

**Catatan:** tombol "Sanggah Data Ini" di kartu fasilitas mengarah ke
`POST /laporan` dengan `fasilitas_terkait` terisi otomatis dan
`kondisi_dilaporkan` dipilih warga. **Tidak ada** endpoint terpisah untuk
sanggahan — memakai jalur laporan yang sama (`PRD.md` §3.1, cross-check
Dapodik).

---

## 3. Dashboard Wilayah — FEAT-002 (`/dashboard`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/dashboard/prioritas` | Publik | List klaster urut skor prioritas (opsional `?status=&limit=`) |
| GET | `/dashboard/wilayah` | `admin`, `verifikator_dinas`, `kepala_dinas` | Ringkasan kondisi wilayah (F4.11: `admin` dulu 403) |

response `200`:
```json
{
  "data": {
    "jumlah_sekolah": 0,
    "jumlah_klaster_aktif": 0,
    "klaster_prioritas": [
      { "klaster_id": "string", "sekolah_nama": "string", "skor_prioritas": 0 }
    ],
    "sekolah_isu_terbanyak": [
      { "npsn": "string", "nama": "string", "jumlah_isu": 0 }
    ]
  }
}
```

---

## 4. Pelaporan Isu — FEAT-003 (`/laporan`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/laporan` | `warga_terverifikasi`, `komite_sekolah` | Kirim laporan baru |
| GET | `/laporan/riwayat` | `warga_terverifikasi`, `komite_sekolah` | Riwayat laporan milik sendiri |
| GET | `/laporan/{id}` | Pemilik laporan, `verifikator_dinas`, `kepala_dinas` | Detail satu laporan |
| POST | `/upload/laporan?laporan_id={id}` | Pemilik laporan | Upload foto bukti (`multipart/form-data`, field `file` — lihat §10) |
| GET | `/laporan/perlu-review` | `admin`, `kepala_dinas` | Daftar laporan perlu verifikasi manual (F4.7/D-21): tanpa klaster **ATAU** klaster kategori `belum_terklasifikasi` — envelope `{data, meta}` §0.2 (`page`, `page_size` default 20 maks 100) |
| PUT | `/laporan/{id}/status` | `admin`, `kepala_dinas` | Update `status_sanggahan` — verifikasi manual per laporan (F4.7/D-21) |
| GET | `/laporan/skor-kbm` | `admin`, `verifikator_dinas`, `kepala_dinas` | Skor dampak KBM per sekolah (F4.8/D-22) — seluruh 62 sekolah, diurutkan skor DESC |
| GET | `/laporan/{id}/konfirmasi` | Pemilik laporan | Ambil pertanyaan konfirmasi severity yang dipilih AI (§4.2) |
| POST | `/laporan/{id}/konfirmasi` | Pemilik laporan | Kirim jawaban konfirmasi severity (§4.3) |

**`POST /laporan`** — request:
```json
{
  "sekolah_npsn": "string",
  "fasilitas_terkait": "string | null",
  "kondisi_dilaporkan": "baik | rusak_ringan | rusak_sedang | rusak_berat | null",
  "deskripsi": "string"
}
```
response `201`:
```json
{
  "data": {
    "laporan_id": "string",
    "tracking_id": "string",
    "status": "menunggu",
    "created_at": "ISO8601"
  }
}
```

<!-- KONFIRMASI -->
**TAMBAHAN** — field `konfirmasi` pada respons `201` (lihat §4.1):

```json
{
  "data": {
    "laporan_id": "string",
    "tracking_id": "string",
    "status": "menunggu",
    "created_at": "ISO8601",
    "konfirmasi": {
      "perlu_konfirmasi": true,
      "jumlah_pertanyaan": 4,
      "kedaluwarsa_pada": "ISO8601 (created_at + 24 jam)"
    }
  }
}
```
- `perlu_konfirmasi: false` bila AI tidak menemukan pola kerusakan (mis. deskripsi terlalu umum).
- Field ini **aditif** — FE lama yang mengabaikannya tetap berfungsi.
- Rincian: `docs/backend/SPEC_SEVERITY_KLASIFIKASI.md` §19.2.

**`GET /laporan/perlu-review`** — response `200` (F4.7, D-21):
```json
{
  "data": [
    {
      "id": "string",
      "tracking_id": "string",
      "sekolah_npsn": "string",
      "sekolah_nama": "string | null",
      "fasilitas_terkait": "string | null",
      "kondisi_dilaporkan": "baik | rusak_ringan | rusak_sedang | rusak_berat | null",
      "deskripsi": "string",
      "status_sanggahan": "menunggu | divalidasi | ditolak",
      "created_at": "ISO8601",
      "klaster": { "id": "string", "label": "string | null", "kategori": "string" } | null
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 0, "total_pages": 0 }
}
```
Seleksi: `laporan.klaster_id IS NULL` (laporan noise, 398) **ATAU**
`klaster.kategori = 'belum_terklasifikasi'` (klaster label-fallback, 97) → **495 laporan**.
`klaster: null` bila laporan tidak punya klaster (noise).

**`PUT /laporan/{id}/status`** — request body (F4.7, D-21):
```json
{ "status": "menunggu | divalidasi | ditolak" }
```
- `status` di luar enum → `422 UNPROCESSABLE_ENTITY`
- Laporan tidak ada → `404 NOT_FOUND`
- Tanpa token → `401`; role selain `admin` / `kepala_dinas` → `403`

response `200`:
```json
{ "data": { "id": "string", "tracking_id": "string", "status_sanggahan": "string" } }
```
Keterbatasan v1: **belum ada field alasan** (`status_log` terikat FK klaster — butuh kolom baru, task terpisah).


**`GET /laporan/skor-kbm`** — response `200` (F4.8, D-22):
```json
{
  "data": {
    "ringkasan": {
      "rata_rata_skor": 44.4,
      "sekolah_kritis": 1,
      "total_laporan": 600,
      "ruang_rusak_berat": 129,
      "distribusi_kondisi": { "baik": 154, "rusak_ringan": 147, "rusak_sedang": 145, "rusak_berat": 154 },
      "dampak_per_jenis_ruang": [
        { "nama_ruang": "ruang_kelas", "rusak_berat": 77, "jumlah": 769 }
      ]
    },
    "sekolah": [
      {
        "npsn": "20506507",
        "nama": "SD NEGERI 2 SENDANGREJO",
        "skor_kbm": 76.4,
        "level": "kritis",
        "skor_laporan": 66.3,
        "skor_dapodik": 100.0,
        "jumlah_laporan": 3,
        "laporan_rusak_berat": 1
      }
    ]
  }
}
```
- `skor_kbm` = `0.7×AVG(severity laporan)` + `0.3×Σ(weight×kondisi_rusak)/Σ(jumlah Dapodik)`, skala 0–100, 1 desimal.
  Weight kondisi: `baik=0`, `rusak_ringan=33`, `rusak_sedang=66`, `rusak_berat=100`.
- `level`: `≥70 kritis` · `50–69 tinggi` · `40–49 sedang` · `<40 rendah`.
- `total_laporan` menghitung **semua** baris laporan termasuk `kondisi_dilaporkan IS NULL`.
- `dampak_per_jenis_ruang` diurutkan `rusak_berat` DESC; `nama_ruang` nilai mentah Dapodik (bukan label tampilan).
- `sekolah` seluruh 62 sekolah, diurutkan `skor_kbm` DESC. Tanpa token → `401`; role selain `admin` / `verifikator_dinas` / `kepala_dinas` → `403`.

### 4.1 Konfirmasi Severity — Ringkasan

> ✅ **Disetujui 20 Okt 2026** (Aris & Dimas, §11.1) — §4.1–§4.4 sah sebagai dasar implementasi.

Konteks: form laporan warga **tidak** meminta warga memilih tingkat kerusakan (terlalu subjektif).
Sebagai gantinya, setelah laporan tersimpan, warga diberi maksimal **4 pertanyaan konfirmasi**
yang dipilih AI dari bank pertanyaan tetap (diturunkan dari dokumen Kemendikbud). Jawaban warga
dipakai bersama teks deskripsi untuk menentukan `kondisi_dilaporkan`.

Sifat: **opsional, tidak memblokir apa pun.** Laporan tetap sah bila tidak dijawab. Bila tidak
dijawab, `kondisi_dilaporkan` tetap diisi dari deskripsi saja, dan `status_konfirmasi` menjadi
`dilewati` setelah 24 jam.

Spesifikasi lengkap (bank pertanyaan, aturan berjenjang, pemicu struktural):
`docs/backend/SPEC_SEVERITY_KLASIFIKASI.md` §15.

### 4.2 `GET /laporan/{id}/konfirmasi`

Akses: **pemilik laporan** (`403` untuk selainnya) · Tanpa token → `401` · Laporan tidak ada → `404`.

response `200`:
```json
{
  "data": {
    "laporan_id": "string",
    "status": "menunggu | terjawab | dilewati",
    "jumlah_terjawab": 0,
    "pertanyaan": [
      {
        "kode": "bagian",
        "teks": "Bagian mana yang rusak?",
        "tipe": "pilih_satu",
        "pilihan": [
          { "kode": "plafon",        "label": "Plafon / langit-langit" },
          { "kode": "atap",          "label": "Atap" },
          { "kode": "dinding",       "label": "Dinding" },
          { "kode": "lantai",        "label": "Lantai" },
          { "kode": "pintu_jendela", "label": "Pintu / jendela" },
          { "kode": "listrik",       "label": "Listrik / lampu" },
          { "kode": "air",           "label": "Air / kran / WC" },
          { "kode": "drainase",      "label": "Saluran air kotor" }
        ]
      },
      {
        "kode": "gejala",
        "teks": "Pilih yang paling berat yang Anda lihat:",
        "tipe": "pilih_satu_bertingkat",
        "urutan": "dari_terparah",
        "lewati_bila_terjawab": true,
        "pilihan": [
          { "kode": "g4", "label": "string", "tingkat": "rusak_berat" },
          { "kode": "g3", "label": "string", "tingkat": "rusak_sedang" },
          { "kode": "g2", "label": "string", "tingkat": "rusak_ringan" },
          { "kode": "g1", "label": "string", "tingkat": "baik" }
        ]
      }
    ]
  }
}
```

Catatan bentuk:

- `tipe: "pilih_satu_bertingkat"` + `urutan: "dari_terparah"` + `lewati_bila_terjawab: true`
  memberitahu FE untuk menerapkan aturan **"jawab satu gejala → lewati gejala yang lebih ringan"**.
  Aturan penerapannya di FE; kontrak ini hanya menyatakan bahwa aturannya berlaku, agar kedua sisi
  tidak berbeda tafsir.
- `label` memakai **nama awam**. Pemetaan ke istilah teknis Kemendikbud ada di BE
  (`SPEC_SEVERITY_KLASIFIKASI.md` §15.3).
- `tingkat` diisi nilai enum resmi agar FE dapat memakai warna/kategori yang sudah ada.
- `status: "terjawab"` atau `"dilewati"` → `pertanyaan: []`.
- Pertanyaan struktural (pondasi/kolom/balok) hanya muncul bila deskripsi memuat pemicu
  (`SPEC_SEVERITY_KLASIFIKASI.md` §15.5); bila tidak ada pemicu, komponen itu tidak ditanyakan.

### 4.3 `POST /laporan/{id}/konfirmasi`

Akses: **pemilik laporan**.

request:
```json
{
  "jawaban": [
    { "kode": "bagian", "nilai": "plafon" },
    { "kode": "gejala", "nilai": "g3" }
  ]
}
```

response `200`:
```json
{
  "data": {
    "status": "terjawab | dilewati",
    "kondisi_dilaporkan": "baik | rusak_ringan | rusak_sedang | rusak_berat | null",
    "sumber_kondisi": "ai | warga | null",
    "diproses_pada": "ISO8601"
  }
}
```

Ketentuan:

| Kasus | Respons |
|---|---|
| Menjawab sebagian | `200`, `status: "terjawab"`, nilai dari jawaban yang ada |
| `jawaban: []` (warga melewati) | `200`, `status: "dilewati"` |
| Sudah pernah dijawab | `409 CONFLICT` — tidak boleh menimpa |
| Bukan pemilik laporan | `403` |
| Laporan tidak ada | `404` |
| `kode` / `nilai` tidak dikenal | `422 UNPROCESSABLE_ENTITY` |

**Jawaban warga selalu menang** atas hasil ekstraksi AI dari deskripsi.

### 4.4 Field Baru pada Respons Laporan

| Endpoint | Field baru | Nilai |
|---|---|---|
| `GET /laporan/riwayat` | `sumber_kondisi` | `ai` / `warga` / `null` |
| `GET /laporan/riwayat` | `status_konfirmasi` | `menunggu` / `terjawab` / `dilewati` |
| `GET /laporan/{id}` | idem | idem |
| `GET /laporan/perlu-review` | idem | idem |
| `GET /laporan/riwayat` | `konfirmasi_perlu_dijawab` | `boolean` — memudahkan FE menandai laporan yang belum dikonfirmasi |

Makna `sumber_kondisi`: **`warga` BUKAN berarti warga mengisi dropdown severity.** Warga tidak
pernah melihat kolom ini. `warga` hanya muncul bila manusia (mis. verifikator dinas) mengoreksi
hasil AI saat verifikasi — dan koreksi itu harus ditandai agar cron berikutnya tidak menimpanya
(`SPEC_SEVERITY_KLASIFIKASI.md` §17.2).

---

---

## 5. Klasterisasi Isu — FEAT-004 (`/klaster`, `/ai`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/klaster` | Publik | List klaster (filter `?sekolah_npsn=&kategori=&status_verifikasi=&page=&page_size=`) — default **tanpa** kategori `belum_terklasifikasi` (F4.7) |
| GET | `/klaster/{id}` | Publik | Detail klaster + daftar laporan anggota |
| PUT | `/klaster/{id}/verifikasi` | `verifikator_dinas` | Tetapkan hasil verifikasi (param **query**: `status`, `alasan`) |
| GET | `/klaster/{id}/riwayat` | Publik | Riwayat status (append-only) — lihat §7 |
| POST | `/ai/cluster` | `admin`, `verifikator_dinas` | Trigger clustering manual (`?force_reprocess=true` opsional) |
| GET | `/ai/status` | `admin`, `verifikator_dinas` | Status pipeline — `unclustered_laporan` = jumlah `hasil_klasterisasi='belum_diproses'`, `total_klaster`, `last_run` + `last_run_status` dari run terakhir (F4.10) |

**`GET /klaster`** — response `200`:
```json
{
  "data": [
    {
      "klaster_id": "string",
      "label": "string | null",
      "kategori": "ruang_belajar | sanitasi_air | utilitas | akses_lahan | penunjang | belum_terklasifikasi",
      "sekolah_npsn": "string",
      "skor_keparahan": 0,
      "skor_prioritas": 0,
      "jumlah_vote_terhitung": 0,
      "status_verifikasi": "menunggu_verifikasi | tidak_terverifikasi | terverifikasi",
      "status_penanganan": "string | null",
      "urutan_prioritas_override": "int | null"
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 0, "total_pages": 0 }
}
```
Urut `skor_prioritas` descending (null di akhir). `page_size` maks 100.

F4.7 (D-21): default **menyembunyikan** klaster kategori `belum_terklasifikasi`
(18 klaster label-fallback; total 43 klaster → 25 tampil). Parameter
`?kategori=belum_terklasifikasi` **eksplisit tetap dilayani** (debug/admin), dan
`GET /klaster/{id}` tidak berubah — akses by-ID tetap bisa. Klaster noise HDBSCAN
tidak lagi dibuat sebagai record; 398 laporan noise (tanpa `klaster_id`) hanya
dibaca lewat `GET /laporan/perlu-review` (§4).

**`GET /klaster/{id}`** — response `200`:
```json
{
  "data": {
    "klaster_id": "string",
    "label": "string | null",
    "kategori": "string",
    "sekolah_npsn": "string",
    "sekolah_nama": "string | null",
    "skor_keparahan": 0,
    "skor_prioritas": 0,
    "jumlah_vote_terhitung": 0,
    "status_verifikasi": "string",
    "status_penanganan": "string | null",
    "urutan_prioritas_override": "int | null",
    "created_at": "ISO8601",
    "laporan": [
      {
        "laporan_id": "string",
        "fasilitas_terkait": "string | null",
        "kondisi_dilaporkan": "string | null",
        "deskripsi": "string",
        "created_at": "ISO8601"
      }
    ]
  }
}
```
Klaster tidak ada → `404 NOT_FOUND`.

**`PUT /klaster/{id}/verifikasi`** — param **query** (bukan body JSON):
`?status=terverifikasi|tidak_terverifikasi|perlu_info_tambahan&alasan=string`

- `status` tidak valid → `400 VALIDATION_ERROR`
- `status != terverifikasi` tanpa `alasan` → `400 VALIDATION_ERROR`
- Klaster tidak ada → `404 NOT_FOUND`

response `200`:
```json
{ "data": { "klaster_id": "string", "status": "string", "message": "string" } }
```

**`POST /ai/cluster`** — response `200`:
```json
{ "data": { "klaster_created": 0, "message": "Clustering triggered. Created N klaster." } }
```
Pipeline inline memakai konfigurasi optimal ablation (A2+B1+C2+D1).

---

## 6. Voting Prioritas — FEAT-005 (`/vote`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/vote?klaster_id={id}` | `warga_terverifikasi`, `komite_sekolah` | Vote klaster (satu akun satu suara) |
| GET | `/vote/status/{klaster_id}` | User login | Cek status vote sendiri pada klaster ini |
| PUT | `/vote/klaster/{id}/skor` | `admin` | Hitung ulang skor prioritas klaster |
| PUT | `/vote/klaster/{id}/override?urutan_prioritas=&alasan=` | `kepala_dinas` | Override urutan prioritas manual (lihat §7) |

**`POST /vote`** — param **query**: `klaster_id` (tidak butuh body, cukup auth)
response `200`:
```json
{
  "data": {
    "vote_id": "string",
    "status_vote": "pending | terhitung"
    // "pending" jika akun masih dalam masa tunda verifikasi (DECISIONS.md D-08)
  }
}
```
Klaster tidak ada → `404 NOT_FOUND`. Jika sudah pernah vote → `409 ALREADY_VOTED`.

**`GET /vote/status/{klaster_id}`** — response `200`:
```json
{
  "data": {
    "has_voted": true,
    "status_vote": "pending | terhitung | null",
    "vote_id": "string | null"
  }
}
```

**`PUT /vote/klaster/{id}/skor`** — tanpa param; hitung ulang `skor_prioritas`
dari laporan anggota + jumlah vote →
`{ "data": { "klaster_id": "string", "skor_prioritas": 0, "jumlah_vote_terhitung": 0 } }`

**Skor prioritas** (dibaca lewat `GET /klaster/{id}`, field `skor_prioritas`)
dihitung backend sebagai `skor_keparahan_dapodik + jumlah_vote_terhitung`
(`PRD.md` §4) — **tidak ada endpoint untuk menghitung manual di sisi
client**, murni angka hasil dari backend.

---

## 7. Accountability / Status — FEAT-006 (`/klaster/{id}/status`, `/vote/.../override`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/klaster/{id}/status?status=&alasan=` | `verifikator_dinas`, `kepala_dinas` | Update status penanganan / verifikasi (bisa dipanggil berulang) |
| GET | `/klaster/{id}/riwayat` | Publik | Riwayat status tindak lanjut (append-only) |
| PUT | `/vote/klaster/{id}/override?urutan_prioritas=&alasan=` | `kepala_dinas` | Override urutan prioritas manual |

**`PUT /vote/klaster/{id}/override`** — param **query**:
- `urutan_prioritas` (int, wajib)
- `alasan` (string, wajib — PRD.md §4, PAGE_STATES.md §B2)

Tanpa `alasan` → `422 REASON_REQUIRED`.

response `200`:
```json
{ "data": { "klaster_id": "string", "urutan_prioritas_override": 1, "alasan_override": "string" } }
```

**`POST /klaster/{id}/status`** — param **query**:
- `status` (wajib): `menunggu_verifikasi | perlu_info_tambahan | tidak_terverifikasi | terverifikasi | dalam_antrian_prioritas | dalam_proses | selesai | tidak_dapat_ditindaklanjuti`
- `alasan` (opsional — **wajib** jika `status` = `tidak_terverifikasi` atau `tidak_dapat_ditindaklanjuti`)

Status tidak valid → `400 VALIDATION_ERROR`; `alasan` kosong untuk status
tersebut → `422 REASON_REQUIRED`; klaster tidak ada → `404 NOT_FOUND`.

response `200`:
```json
{ "data": { "klaster_id": "string", "status": "string", "message": "Status updated to ..." } }
```
**Catatan penting:** endpoint ini **bisa dipanggil berulang kali** untuk
`status = dalam_proses` (loop, `FLOWS.md` §2, `PAGE_STATES.md` §B3/§C.3)
— frontend tidak boleh mem-build ini sebagai form sekali submit.

**`GET /klaster/{id}/riwayat`** — response `200`:
```json
{
  "data": [
    { "status": "string", "alasan": "string | null", "timestamp": "ISO8601" }
  ]
}
```
Riwayat **append-only** — tidak ada endpoint `DELETE` untuk status
manapun (`DECISIONS.md` D-09, `PAGE_STATES.md` §C.2).

---

## 8. Ingest Data Dapodik (Pemerintah) (`/ingest`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/ingest/dapodik` | `admin`, `verifikator_dinas` | Upload CSV hasil scraping/parsing Dapodik |
| GET | `/ingest/riwayat` | `admin`, `verifikator_dinas` | Riwayat proses ingestion |

**`POST /ingest/dapodik`** — `multipart/form-data`, field `file` (CSV).
Diproses async lewat **Pandas Batch Ingestion** (`ARCHITECTURE.md` §5.2) —
response `202`:
```json
{ "data": { "ingest_job_id": "string", "status": "diproses" } }
```
Status job dicek lewat `GET /ingest/riwayat` (list, termasuk yang sedang
berjalan).

---

## 9. Log Audit PDP (`/audit`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/audit/log` | `admin`, `kepala_dinas` | Log audit akses/perubahan data PDP |

response `200` (paginated, lihat §0.2):
```json
{
  "data": [
    {
      "audit_id": "string",
      "aksi": "string",
      "actor_role": "string",
      "target": "string",
      "timestamp": "ISO8601"
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 0, "total_pages": 0 }
}
```

**Catatan penting:** endpoint ini **tidak** menyertakan field terkait
"Blockchain/Ledger Integrity" atau "Integrity Hash Audit" — lihat
`DECISIONS.md` D-16, komponen tersebut belum resmi dan tidak
diimplementasikan sampai ada keputusan lanjutan.

---

## 10. Upload File (Foto Bukti)

- Endpoint: `POST /upload/laporan?laporan_id={id}` dan `DELETE /upload/{storage_key}`
- `Content-Type: multipart/form-data`, field `file` (image, maks — *tentukan
  batas ukuran, belum diputuskan, lihat §11*)
- Akses: pemilik laporan atau `verifikator_dinas`/`kepala_dinas`/`admin`
- Hapus: `DELETE /upload/{storage_key}` (param path = key hasil upload)
- Disimpan ke MinIO/S3 (`ARCHITECTURE.md` §4.2, §5.1) — response hanya
  berisi referensi, **bukan** data biner:
```json
{ "data": { "foto_id": "string", "url": "string" } }
```
- `laporan_id` tidak ada → `404 NOT_FOUND`; bukan pemilik → `403 FORBIDDEN`

---

## 11. Yang Belum Diputuskan (perlu diisi sebelum implementasi final)

### 11.1 Kontrak Konfirmasi Severity ✅ **[Disetujui 20 Okt 2026]**

Lima butir berikut disepakati bersama FE (Dimas) — §4.1–§4.4 di atas terkunci sebagai kontrak
(lihat `docs/backend/SPEC_SEVERITY_KLASIFIKASI.md` §19.7):

- [x] Pertanyaan konfirmasi diambil **sekali** — satu `GET` memuat seluruh pertanyaan (tanpa bertahap).
- [x] Nama field **`kode`** (bukan `gejala_id`) — konsisten dua sisi.
- [x] Endpoint konfirmasi **terpisah** (§4.2 `GET` / §4.3 `POST`) — tidak digabung ke `GET /laporan/{id}`.
- [x] Batas waktu 24 jam → status `dilewati` di-flip **lazy saat diakses** (bukan oleh cron).
- [x] Verifikator **TIDAK boleh** mengubah jawaban warga (koreksi kondisi terjadi di jalur verifikasi dengan penanda `sumber_kondisi`).

- **Batas ukuran & jumlah foto bukti per laporan** — belum ada angka
  resmi (§10).
- **Masa tunda verifikasi vote** (`DECISIONS.md` D-08) — durasinya belum
  ditentukan (berapa hari/jam sebelum status berubah dari `pending` ke
  `terhitung`).
- **Rate limit spesifik** untuk anti-buzzer (`DECISIONS.md` D-08) — belum
  ada angka konkret (berapa vote/menit dianggap mencurigakan).
- Endpoint ini belum dicoba terhadap `backend/app/dataset/scraping/` yang
  asli (lihat `GIT_WORKFLOW.md` §2) — begitu tersedia, cek apakah field
  hasil scraping cocok dengan `data_resmi` di §2.
