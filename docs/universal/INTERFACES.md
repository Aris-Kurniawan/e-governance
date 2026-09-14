# INTERFACES.md — SIMAKIS

> **Sumber kebenaran tunggal** untuk bentuk data yang lewat batas
> frontend↔backend. `frontend/API_CLIENT.md`, `frontend/MOCK_DATA.md`, dan
> `backend/app/schemas/` **wajib** mengikuti dokumen ini — bukan
> mendefinisikan ulang bentuk data sendiri-sendiri. Perubahan apapun di
> sini wajib disepakati Aris & Dimas dulu (lihat `GIT_WORKFLOW.md` §3).

**Base URL (dev):** `http://localhost:8000` (`VITE_API_BASE_URL`, lihat
`frontend/SETUP.md` §5)
**Format:** JSON, `Content-Type: application/json` (kecuali endpoint
upload file — lihat §7).
**Auth:** Bearer JWT di header `Authorization: Bearer <token>` untuk semua
endpoint kecuali yang ditandai **Publik**.

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
    "data_resmi": {
      "sumber": "Dapodik",
      "tanggal_pembaruan": "2026-01-15",
      "rasio_guru_siswa": "1:20",
      "kondisi_sarana": [
        { "nama_ruang": "string", "kondisi": "baik | rusak_ringan | rusak_sedang | rusak_berat" }
      ]
    },
    "klaster_isu": [
      { "klaster_id": "string", "kategori": "string", "skor_prioritas": 0, "status": "string" }
    ]
  }
}
```

---

## 3. Dashboard Wilayah — FEAT-002 (`/dashboard`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/dashboard/wilayah` | `verifikator_dinas`, `kepala_dinas` | Ringkasan kondisi wilayah |

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
| POST | `/laporan/{id}/foto` | Pemilik laporan | Upload foto bukti (`multipart/form-data`, lihat §7) |

**`POST /laporan`** — request:
```json
{
  "sekolah_npsn": "string",
  "kategori": "infrastruktur_sarana | ketersediaan_tenaga_pengajar | lainnya",
  "fasilitas_terkait": "string | null",   // wajib diisi jika kategori = infrastruktur_sarana (PAGE_STATES.md §A4)
  "deskripsi": "string"
}
```
response `201`:
```json
{
  "data": {
    "laporan_id": "string",
    "tracking_id": "string",
    "status": "menunggu_verifikasi",
    "cross_check": {
      "tersedia": true,
      "data_dapodik": "string | null"   // null kalau kategori = lainnya (tidak ada cross-check, PRD.md §3.1)
    }
  }
}
```

---

## 5. Klasterisasi Isu — FEAT-004 (`/klaster`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/klaster` | Publik | List klaster (per sekolah/kategori) |
| GET | `/klaster/{id}` | Publik | Detail klaster + laporan anggota |
| POST | `/klaster/{id}/verifikasi` | `verifikator_dinas` | Tetapkan hasil verifikasi (§B1) |

**`POST /klaster/{id}/verifikasi`** — request:
```json
{
  "hasil": "perlu_info_tambahan | tidak_terverifikasi | terverifikasi",
  "alasan": "string"   // WAJIB jika hasil = tidak_terverifikasi (PAGE_STATES.md §C.1); opsional untuk hasil lain
}
```
response `200`:
```json
{ "data": { "klaster_id": "string", "status": "menunggu_verifikasi | tidak_terverifikasi | terverifikasi" } }
```
Validasi: jika `hasil = tidak_terverifikasi` dan `alasan` kosong → `422 REASON_REQUIRED`.

---

## 6. Voting Prioritas — FEAT-005 (`/klaster/{id}/vote`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/klaster/{id}/vote` | `warga_terverifikasi`, `komite_sekolah` | Vote klaster (satu akun satu suara) |
| GET | `/klaster/{id}/vote/status` | User login | Cek status vote sendiri pada klaster ini |

**`POST /klaster/{id}/vote`** — request: `{}` (tidak butuh body, cukup auth)
response `201`:
```json
{
  "data": {
    "vote_id": "string",
    "status_vote": "pending | terhitung"
    // "pending" jika akun masih dalam masa tunda verifikasi (DECISIONS.md D-08)
  }
}
```
Jika sudah pernah vote → `409 ALREADY_VOTED`.

**Skor prioritas** (dibaca lewat `GET /klaster/{id}`, field `skor_prioritas`)
dihitung backend sebagai `skor_keparahan_dapodik + jumlah_vote_terhitung`
(`PRD.md` §4) — **tidak ada endpoint untuk menghitung manual di sisi
client**, murni angka hasil dari backend.

---

## 7. Accountability / Status — FEAT-006 (`/klaster/{id}/status`, `/prioritas`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/klaster/{id}/status` | Publik | Riwayat status tindak lanjut (append-only) |
| PATCH | `/klaster/{id}/prioritas` | `kepala_dinas` | Override urutan prioritas manual |
| PATCH | `/klaster/{id}/penanganan` | `verifikator_dinas` (petugas) | Update status penanganan |

**`PATCH /klaster/{id}/prioritas`** — request:
```json
{
  "urutan_prioritas_baru": 1,
  "alasan_override": "string"   // WAJIB (PRD.md §4, PAGE_STATES.md §B2)
}
```
Kosong → `422 REASON_REQUIRED`.

**`PATCH /klaster/{id}/penanganan`** — request:
```json
{
  "hasil": "selesai | masih_berlangsung | tidak_dapat_ditindaklanjuti",
  "catatan": "string | null",   // opsional untuk "masih_berlangsung"
  "alasan": "string | null"     // WAJIB jika hasil = tidak_dapat_ditindaklanjuti
}
```
response `200`:
```json
{ "data": { "klaster_id": "string", "status_penanganan": "string", "updated_at": "ISO8601" } }
```
**Catatan penting:** endpoint ini **bisa dipanggil berulang kali** untuk
`hasil = masih_berlangsung` (loop, `FLOWS.md` §2, `PAGE_STATES.md` §B3/§C.3)
— frontend tidak boleh mem-build ini sebagai form sekali submit.

**`GET /klaster/{id}/status`** — response `200`:
```json
{
  "data": {
    "status_terkini": "menunggu_verifikasi | tidak_terverifikasi | dalam_antrian_prioritas | dalam_proses | selesai | tidak_dapat_ditindaklanjuti",
    "riwayat": [
      { "status": "string", "alasan": "string | null", "timestamp": "ISO8601" }
    ]
  }
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

- Endpoint: `POST /laporan/{id}/foto`
- `Content-Type: multipart/form-data`, field `file` (image, maks — *tentukan
  batas ukuran, belum diputuskan, lihat §11*)
- Disimpan ke MinIO/S3 (`ARCHITECTURE.md` §4.2, §5.1) — response hanya
  berisi referensi, **bukan** data biner:
```json
{ "data": { "foto_id": "string", "url": "string" } }
```

---

## 11. Yang Belum Diputuskan (perlu diisi sebelum implementasi final)

- **Batas ukuran & jumlah foto bukti per laporan** — belum ada angka
  resmi (§10).
- **Masa tunda verifikasi vote** (`DECISIONS.md` D-08) — durasinya belum
  ditentukan (berapa hari/jam sebelum status berubah dari `pending` ke
  `terhitung`).
- **Format `penanda_masalah`** di `GET /sekolah` (§2) — nilai
  `aman/perlu_perhatian/kritis` masih tebakan, ambang batasnya belum
  ditentukan dari data Dapodik.
- **Rate limit spesifik** untuk anti-buzzer (`DECISIONS.md` D-08) — belum
  ada angka konkret (berapa vote/menit dianggap mencurigakan).
- Endpoint ini belum dicoba terhadap `backend/app/dataset/scraping/` yang
  asli (lihat `GIT_WORKFLOW.md` §2) — begitu tersedia, cek apakah field
  hasil scraping cocok dengan `data_resmi` di §2.
