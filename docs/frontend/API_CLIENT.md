# API_CLIENT.md — SIMAKIS Frontend

> Panduan teknis pemanggilan API dari sisi frontend. **Bentuk data tidak
> didefinisikan ulang di sini** — dokumen ini hanya menerjemahkan
> `universal/INTERFACES.md` menjadi tipe TypeScript, konfigurasi client, dan
> pola pemakaian di komponen. Kalau ada perbedaan, `INTERFACES.md` menang.

**Update terakhir:** 15 September 2026

---

## 1. Konfigurasi Client

Base URL dari `VITE_API_BASE_URL` (`frontend/SETUP.md` §5), jangan hardcode.

```env
VITE_API_BASE_URL=http://localhost:8000
```

Rekomendasi: satu modul `src/lib/api/` sebagai satu-satunya tempat
`fetch` dipanggil — komponen tidak boleh `fetch` langsung.

```
src/lib/api/
├── client.ts        # fetch wrapper: base URL, auth header, amplop respons
├── types.ts         # tipe dari INTERFACES.md
├── auth.ts          # endpoints /auth/*
├── sekolah.ts       # endpoints /sekolah/*
├── laporan.ts       # endpoints /laporan/*
├── klaster.ts       # endpoints /klaster/*
└── errors.ts        # mapping kode error → pesan UI
```

---

## 2. Amplop Respons

Semua respons sukses (`INTERFACES.md` §0.1):

```ts
interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}
```

Semua respons gagal:

```ts
interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string>;
  };
}
```

### 2.1 Kode Error Standar (`INTERFACES.md` §0.3)

```ts
type ApiErrorCode =
  | "VALIDATION_ERROR"   // 400
  | "UNAUTHORIZED"       // 401
  | "FORBIDDEN"          // 403
  | "NOT_FOUND"          // 404
  | "ALREADY_VOTED"      // 409
  | "REASON_REQUIRED"    // 422
  | "INTERNAL_ERROR";    // 500
```

`REASON_REQUIRED` dan `ALREADY_VOTED` **bukan** kasus langka — keduanya
punya tampilan khusus di `PAGE_STATES.md` (§A3 vote, §C1 alasan wajib), jadi
wajib di-handle eksplisit di UI, bukan cuma tampil toast generik.

---

## 3. Tipe Data (dari INTERFACES.md)

```ts
// ---- Umum ----
export type Jenjang = "SD" | "SMP" | "SMA" | "SMK";
export type Role =
  | "warga_umum"
  | "warga_terverifikasi"
  | "komite_sekolah"
  | "verifikator_dinas"
  | "kepala_dinas"
  | "admin";

// ---- Auth (§1) ----
export interface RegisterRequest {
  nama: string;
  nik: string;              // 16 digit — tidak pernah dikembalikan API
  email: string;
  password: string;
  sekolah_terkait_id?: string | null;
}

export interface RegisterResponse {
  user_id: string;
  status_verifikasi: StatusVerifikasiAkun;
}

export type StatusVerifikasiAkun = "menunggu" | "terverifikasi" | "ditolak";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role: Role;
  status_verifikasi: StatusVerifikasiAkun;
}

// ---- Sekolah (§2) ----
export type PenandaMasalah = "aman" | "perlu_perhatian" | "kritis";

export interface SekolahList {
  npsn: string;
  nama: string;
  alamat: string;
  jenjang: Jenjang;
  jumlah_isu_aktif: number;
  penanda_masalah: PenandaMasalah;
}

export type KondisiSarana = "baik" | "rusak_ringan" | "rusak_sedang" | "rusak_berat";

export interface SekolahDetail {
  npsn: string;
  nama: string;
  alamat: string;
  jenjang: Jenjang;
  data_resmi: {
    sumber: string;                 // "Dapodik"
    tanggal_pembaruan: string;      // ISO date
    rasio_guru_siswa: string;       // "1:20"
    kondisi_sarana: { nama_ruang: string; kondisi: KondisiSarana }[];
  };
  klaster_isu: {
    klaster_id: string;
    kategori: string;
    skor_prioritas: number;
    status: string;
  }[];
}

// ---- Laporan (§4) ----
export type KategoriLaporan =
  | "infrastruktur_sarana"
  | "ketersediaan_tenaga_pengajar"
  | "lainnya";

export interface LaporanRequest {
  sekolah_npsn: string;
  kategori: KategoriLaporan;
  fasilitas_terkait?: string | null;  // wajib bila kategori = infrastruktur_sarana
  deskripsi: string;
}

export interface LaporanResponse {
  laporan_id: string;
  tracking_id: string;
  status: string;                     // "menunggu_verifikasi"
  cross_check: {
    tersedia: boolean;
    data_dapodik: string | null;      // null bila kategori = lainnya
  };
}

// ---- Klaster (§5, §6, §7) ----
export type StatusKlaster =
  | "menunggu_verifikasi"
  | "tidak_terverifikasi"
  | "terverifikasi";

export type StatusPenanganan =
  | "dalam_antrian_prioritas"
  | "dalam_proses"
  | "selesai"
  | "tidak_dapat_ditindaklanjuti";

export interface VoteResponse {
  vote_id: string;
  status_vote: "pending" | "terhitung";   // "pending" = masa tunda verifikasi
}

export interface StatusTindakLanjut {
  status_terkini: StatusPenanganan | "menunggu_verifikasi" | "tidak_terverifikasi";
  riwayat: { status: string; alasan: string | null; timestamp: string }[];
}
```

---

## 4. Autentikasi & Token

Mengikuti `INTERFACES.md` §0: Bearer JWT di header `Authorization`.

```ts
// client.ts — inti
async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: { auth?: boolean } = { auth: true },
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.auth) {
    const token = accessTokenStore.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body as ApiErrorBody);
  return body as ApiResponse<T>;
}
```

**Aturan token:**

| Hal | Ketentuan |
|---|---|
| Simpan access token | In-memory (variabel modul), **bukan** `localStorage` — mengurangi risiko XSS |
| Refresh token | `POST /auth/refresh` saat 401, lalu ulangi request sekali |
| Gagal refresh | Hapus token, redirect ke Landing (`PAGE_STATES.md` §A1) |
| Upload foto | `multipart/form-data`, **jangan** set `Content-Type` manual |

> Catatan: `DECISIONS.md` D-* soal refresh token masih tercatat sebagai
> item terbuka di `backend/TASK_GUIDE.md` — struktur token di atas mengikuti
> `INTERFACES.md` §1 yang sudah menyertakan `refresh_token` di respons login.

---

## 5. Peta Pemakaian per Halaman

| Halaman | Endpoint | Catatan |
|---|---|---|
| Landing / Cek Akun | `GET /auth/me` | Belum login → langsung tampil mode publik |
| Dashboard Warga | `GET /sekolah?page=` | Sumber kartu ringkasan; lihat `MOCK_DATA.md` |
| Direktori Sekolah | `GET /sekolah` | Pagination angka eksplisit (`NumberedPagination.tsx`) |
| Detail Sekolah | `GET /sekolah/{npsn}` | `data_resmi` = box Dapodik (`ComparisonBox.tsx`) |
| Form Laporan | `POST /laporan` | Respons `cross_check` dipakai di state setelah kirim |
| Riwayat Laporan | `GET /laporan/riwayat` | |
| Detail Klaster | `GET /klaster/{id}` | |
| Vote | `POST /klaster/{id}/vote`, `GET /klaster/{id}/vote/status` | `409 ALREADY_VOTED` → tombol "Sudah Vote" disabled |
| Status Tindak Lanjut | `GET /klaster/{id}/status` | Riwayat append-only → render `InstitutionalStepper` |

---

## 6. Pola Wajib

### 6.1 Loading, Error, Empty

Setiap fetch punya **3 state** minimum (bukan cuma happy path):

```ts
type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; code: ApiErrorCode; message: string }
  | { status: "empty" }
  | { status: "success"; data: T };
```

### 6.2 Polling untuk status yang berubah

Loop status penanganan (`FLOWS.md` §2 catatan) → refetch berkala pada
komponen status, **bukan** reload halaman penuh. Cukup satu hook
`useStatusPolling(klasterId)`.

### 6.3 Field alasan wajib

`alasan` dan `alasan_override` **wajib** di client-side juga
(`PAGE_STATES.md` §C1) — tombol submit disabled sampai terisi, tapi tetap
tangani `422 REASON_REQUIRED` dari backend (validasi tidak boleh hanya di
client).

---

## 7. Yang Belum Diputuskan

Selaras dengan `INTERFACES.md` §11 — jangan diasumsikan di kode:

- [ ] Batas ukuran & jumlah foto per laporan.
- [ ] Masa tunda verifikasi vote (berapa lama `pending` → `terhitung`).
- [ ] Ambang batas `penanda_masalah` (`aman/perlu_perhatian/kritis`).
- [ ] Rate limit anti-buzzer.
- [ ] Apakah perlu refresh-token rotation (`backend/TASK_GUIDE.md` item terbuka).
