# TASK_GUIDE.md — Frontend SIMAKIS

> Panduan tugas frontend per fitur berdasarkan `PRD.md`, `ROADMAP.md`,
> `FLOWS.md`, `PAGE_STATES.md`, dan `INTERFACES.md`. Dokumen ini menjadi
> **single source of truth** untuk pekerjaan Dimas (Frontend Engineer).
> Bentuk data apa pun diambil dari `API_CLIENT.md` §3 / `INTERFACES.md` —
> jangan mendefinisikan ulang.

**Update terakhir:** 1 Oktober 2026

---

## Peta Fase & Timeline

| Fase | Minggu | Fokus Frontend |
|------|--------|---------------|
| **Fase 1** | 1–3 | Setup project, token desain, scaffold komponen dasar |
| **Fase 2** | 4–7 | Dashboard Warga, Direktori Sekolah, Form Laporan (mock data) |
| **Fase 3** | 8–11 | Klaster Isu, Voting, Status Pemerintah |
| **Fase 4** | 12–14 | Integrasi FE↔BE, Testing, Finalisasi |

---

## Status Pengerjaan

**Rekap:** Fase 1 & Fase 2 **selesai** · Fase 3 **sebagian** · Fase 4 **belum**.
Status diverifikasi terhadap kode pada 1 Oktober 2026.

| Kode | Task | Status | Catatan |
|------|------|--------|---------|
| F1.1 | Setup Vite + React + TS | Selesai | Deviasi: routing di `src/App.tsx`, folder `src/routes/` hanya `.gitkeep` |
| F1.2 | Token Desain & Tailwind | Selesai | `tailwind.config.js` + `src/styles/globals.css` |
| F1.3 | Install & Generate shadcn/ui | Selesai | 12 komponen di `src/components/ui/` |
| F1.4 | Font Plus Jakarta Sans | Selesai | Via Google Fonts di `index.html` |
| F1.5 | Scaffold Struktur Folder | Selesai | `components/institutional/` & `components/layout/` masih `.gitkeep` |
| F2.1 | API Client Layer | Selesai | `src/lib/api/`: client, types, auth, sekolah, laporan, klaster, errors |
| F2.2 | Mock Data Layer | Selesai | `src/mocks/`: sekolah, sekolahDirektori, klaster, laporan, status, auth, dinasData |
| F2.3 | Layout Warga | Selesai | `WargaLayout` + `PublicLayout` + `AuthLayout` |
| F2.4 | Dashboard Warga | Selesai | `pages/warga/Dashboard.tsx` (+ `DashboardWilayah.tsx`) |
| F2.5 | Direktori Sekolah | Selesai | Termasuk `NumberedPagination` |
| F2.6 | Detail Sekolah | Selesai | 3 kartu sesuai `DECISIONS.md` D-20 |
| F2.7 | Form Laporan | Selesai | — |
| F2.8 | Riwayat Laporan | Selesai | — |
| F2.9 | Page States & Error Boundary | Selesai | `hooks/useFetch.ts`, `components/errors/ErrorBoundary.tsx`, `lib/api/errors.ts` |
| F3.1 | Klaster Isu | **Sebagian** | `DetailKlaster.tsx` sudah ada (badge status, skor prioritas, laporan anggota); `InstitutionalStepper` & halaman list klaster belum ada |
| F3.2 | Voting | **Belum** | Tidak ada UI vote di halaman mana pun — pendukung API/mock sudah siap (lihat detail di bawah) |
| F3.3 | Status Tindak Lanjut | **Belum** | Belum ada halaman/rute status publik per klaster; `useStatusPolling` sudah ada tetapi belum dipakai |
| F3.4 | Portal Pemerintah | **Sebagian** | `DinasLayout` (spesifikasi menyebut `PemerintahLayout`), DashboardKadis, verifikasi klaster §B1 (AntrianValidasi) ✓; override prioritas §B2 & update status §B3 belum |
| F4.1 | Ganti Mock → API Asli | **⚠️ 90%** | `src/lib/api/` dipakai 14 halaman; `src/mocks/` dihapus; build hijau; smoke test 14/14. **Sisa:** 5 halaman masih pakai data demo inline — `DashboardWilayah`, `RiwayatLaporan`, `TabelVerifikasi`, `LaporanSkorKbm`, `LogAuditPdp` (lihat CHANGELOG § *Halaman yang Masih Pakai Data Demo*) |
| F4.2 | Black-box Testing | **Belum** | Belum ada catatan pengujian state `PAGE_STATES.md` |
| F4.3 | Perf & Aksesibilitas | **Belum** | Rute masih import statis (belum lazy-load); audit Lighthouse belum |
| F4.4 | Dokumentasi Final | **Belum** | — |

### Detail Task Tertunda (belum selesai / terlewat)

- [ ] **F3.2 — Voting** *(belum dikerjakan)*: target halaman **Detail Klaster Isu**
  (`src/pages/warga/DetailKlaster.tsx`, rute `/klaster/:klasterId`, `PAGE_STATES.md §A3`).
  Wajib: tombol **Vote** → konfirmasi → **Vote Tercatat**; akun masa tunda → badge
  **Menunggu Masa Tunda** (bukan "Sudah Vote"); `409 ALREADY_VOTED` → tombol
  **Sudah Vote** (disabled). Pendukung sudah tersedia: `lib/api/klaster.ts`
  (`voteKlaster()`, `api.vote(id)`), type `VoteResponse`, mock `voteContoh` /
  `votePendingContoh` (`mocks/klaster.ts`).
- [ ] **F3.3 — Status Tindak Lanjut** *(belum dikerjakan)*: halaman status publik
  per klaster, 6 status + alasan wajib (`PAGE_STATES.md §A5`), memakai
  `useStatusPolling` (sudah tersedia, belum dipakai halaman mana pun).
- [ ] **F3.1 — sisa**: komponen `InstitutionalStepper` (folder
  `src/components/institutional/` masih `.gitkeep`) dan daftar/list klaster isu
  sebagai tampilan sendiri (saat ini hanya widget di Dashboard Wilayah & kartu 3
  Detail Sekolah).
- [ ] **F3.4 — sisa**: override prioritas (`PAGE_STATES.md §B2` — tombol kolom
  AKSI di `TabelVerifikasi.tsx` saat ini belum punya handler) dan update status
  penanganan + loop "masih berlangsung" (§B3).
- [x] **F4.1 — Ganti Mock → API Asli**: ✅ selesai — seluruh pemakaian `src/mocks/` diganti
  `src/lib/api/` tanpa mengubah struktur komponen.
- [ ] **F4.2 — Black-box Testing**: uji manual seluruh state `PAGE_STATES.md`
  (normal & gagal).
- [ ] **F4.3 — Perf & Aksesibilitas**: lazy-load route, audit Lighthouse
  (target aksesibilitas ≥ 90).
- [ ] **F4.4 — Dokumentasi Final**: sinkronkan seluruh dokumen `docs/frontend/`
  dengan kode final.

> Penanda: `[ ]` = tertunda, `[x]` = selesai. Audit terakhir 1 Oktober 2026.

---

## FASE 1 — Persiapan (Minggu 1–3)

### F1.1 — Setup Project Vite + React + TypeScript

| Item | Keterangan |
|------|-----------|
| Stack | React 18 SPA, Vite, TypeScript (`frontend/SETUP.md` §2) |
| Routing | React Router — folder `src/routes/` |
| Scripts | `dev`, `build`, `preview`, `lint` (`frontend/SETUP.md` §7) |

**Deliverable:** `npm run dev` jalan tanpa error di `localhost:5173`.

---

### F1.2 — Token Desain & Tailwind Config

Ikuti `UI_COMPONENTS.md` §1 persis (warna, font, radius, spacing, shadow).

**Deliverable:** `tailwind.config.js` + `globals.css` dengan token institusi.

---

### F1.3 — Install & Generate shadcn/ui

```bash
npx shadcn@latest add button card badge input select checkbox table tabs dialog sheet alert avatar
```

Ikuti `UI_COMPONENTS.md` §3 — **jangan edit manual** file di `components/ui/`.

**Deliverable:** Komponen shadcn dasar ter-generate.

---

### F1.4 — Font Plus Jakarta Sans

Ikuti `frontend/SETUP.md` §4 — muat via Google Fonts / local.

**Deliverable:** Font termuat (cek DevTools → Network → Fonts).

---

### F1.5 — Scaffold Struktur Folder

```
src/
├── components/{ui, institutional, composite, charts, map, layout}/
├── layouts/
├── pages/{warga, pemerintah}/
├── routes/
├── styles/globals.css
├── lib/api/           # API_CLIENT.md §1
└── mocks/             # MOCK_DATA.md §1
```

**Deliverable:** Folder kosong + alias path siap.

---

## FASE 2 — Fitur Dasar (Minggu 4–7)

> Target fokus: **Dashboard Warga** + halaman pendukung. Semua data dari
> `MOCK_DATA.md` dulu (mode UI-only, `frontend/SETUP.md` §atas), kecuali
> disebut berbeda. Endpoint backend yang belum ada → tandai `TODO(kontrak)`.

### F2.1 — API Client Layer

Buat `src/lib/api/` sesuai `API_CLIENT.md` §1 (client, types, auth, sekolah,
laporan, klaster, errors).

**Deliverable:** `client.ts` + `types.ts` lengkap dari `INTERFACES.md`.

---

### F2.2 — Mock Data Layer

Buat `src/mocks/` sesuai `MOCK_DATA.md` §1 (sekolah, klaster, laporan, status,
auth).

**Deliverable:** Semua mock ber-tipe + kasus tidak-happy disertakan
(`MOCK_DATA.md` §9).

---

### F2.3 — Layout Warga (`WargaLayout`)

Di `src/layouts/WargaLayout.tsx` (`UI_COMPONENTS.md` §8):
- Header + nav publik (Warga) — tanpa sidebar
- `PublicLayout` untuk Landing/Login/Registrasi

**Deliverable:** Navigasi antar halaman warga jalan.

---

### F2.4 — Dashboard Warga

Halaman `src/pages/warga/Dashboard.tsx`. Isi sesuai `MOCK_DATA.md` — karena
`GET /dashboard/wilayah` hanya untuk role dinas (`INTERFACES.md` §3), versi
warga memakai agregat dari daftar sekolah + klaster:

| Section | Data | Sumber |
|---|---|---|
| KPI row | 4 kartu: total sekolah, total isu, sekolah kritis, klaster diproses | `MOCK_DATA.md` |
| Riwayat laporan terbaru | 3–5 baris | `src/mocks/laporan.ts` |
| Daftar sekolah (ringkas) | 6–8 kartu, filter jenjang | `src/mocks/sekolah.ts` |
| CTA | "Laporkan Isu" + "Lihat Direktori" | — |

**State yang wajib di-handle** (`PAGE_STATES.md` §A1, §A5):
- Belum login: tampil info publik + CTA "Ajukan Verifikasi Akun"
- Sudah login & terverifikasi: dashboard penuh
- Status laporan "Tidak Terverifikasi" / "Tidak Dapat Ditindaklanjuti" → kartu
  menampilkan alasan
- `loading`, `error`, `empty`

**Deliverable:** Dashboard warga tampil dari mock, responsif 320–1440px.

---

### F2.5 — Direktori Sekolah

Halaman `src/pages/warga/Direktori.tsx`:
- Grid/list sekolah + filter jenjang + search
- Pagination **angka eksplisit** (`NumberedPagination`, `UI_COMPONENTS.md` §5)
- Kartu: nama, alamat, jenjang, `jumlah_isu_aktif`, badge `penanda_masalah`
  (`aman/perlu_perhatian/kritis`)

**State wajib:** `loading`, `error`, `empty` (search tak ada hasil).

**Deliverable:** Direktori sekolah dari mock, filter & search jalan.

---

### F2.6 — Detail Sekolah

Halaman `src/pages/warga/DetailSekolah.tsx` (`GET /sekolah/{npsn}`):
- Header: nama, alamat, jenjang, badge status
- **Kartu 1 — Audit Sarpras**: ringkasan kondisi sarana (donut chart: total unit, persentase baik/rusak ringan/sedang/berat) + daftar detail per jenis ruang (nama, jumlah, kondisi breakdown, tombol "Sanggah" jika perlu_verifikasi=true)
- **Kartu 2 — Profil Dapodik**: akreditasi (badge), nama kepala sekolah, jenjang, status sekolah (badge)
- **Kartu 3 — Isu & Klaster Warga**: daftar `klaster_isu` (klik → detail klaster); empty state "Belum ada isu terdeteksi" sampai Fase D
- Tombol "Laporkan Isu" → navigasi ke Form Laporan
- **Empty state sarpras**: sekolah tanpa data kondisi sarana → tampil pesan "Data sarana tidak tersedia"

**Catatan scope v1:** Field `rasio_guru_siswa`, `jumlah_pd/ptk/rombel`, `utilitas_kapasitas_belajar` **tidak ditampilkan** (data tidak di-ingest per scope infrastruktur-only). Lihat `DECISIONS.md` D-20.

**Deliverable:** Detail sekolah tampil dari mock (3 kartu utama: Audit + Profil + Isu).

---

### F2.7 — Form Laporan

Halaman `src/pages/warga/FormLaporan.tsx`:
- Field: sekolah (prefilled dari context), kategori, fasilitas, deskripsi
- **Kondisi kategori** (`PAGE_STATES.md` §A4):
  - `infrastruktur_sarana` → dropdown fasilitas + card data Dapodik pembanding
  - `ketersediaan_tenaga_pengajar` → info rasio guru:siswa, tanpa dropdown
  - `lainnya` → tanpa card pembanding
- Validasi client: `fasilitas_terkait` wajib bila kategori infrastruktur;
  deskripsi tidak kosong
- Submit → state "Laporan Berhasil Dikirim" + `tracking_id` + tombol ke
  "Riwayat Laporan"

**State wajib:** 3 varian `cross_check` (`MOCK_DATA.md` §5.1), `loading`,
`error` (toast dari `errors.ts`).

**Deliverable:** Form + state kirim sukses dari mock.

---

### F2.8 — Riwayat Laporan

Halaman `src/pages/warga/RiwayatLaporan.tsx`:
- Tabel/daftar laporan milik sendiri (`MOCK_DATA.md` §5.2)
- Status badge konsisten untuk tiap status (`PAGE_STATES.md` §A5)
- Klik baris → detail laporan

**Deliverable:** Riwayat laporan dari mock.

---

### F2.9 — Page States & Error Boundary

- Server state handling umum: hook `useFetch`/`useStatusPolling`
  (`API_CLIENT.md` §6.1, §6.2)
- Error boundary: `INTERNAL_ERROR`, `NOT_FOUND`, network failure → tampilan
  error ramah + tombol retry
- `errors.ts`: mapping kode `ApiErrorCode` → teks UI

**Deliverable:** Semua halaman punya state loading/error/empty yang konsisten.

---

## FASE 3 — Fitur Lanjutan (Minggu 8–11)

> Ringkas — detail mengikuti `PAGE_STATES.md` saat dikerjakan.

### F3.1 — Klaster Isu

**Deliverable:** List + detail klaster isu (badge status, skor prioritas,
laporan anggota, `InstitutionalStepper`).

---

### F3.2 — Voting

**Deliverable:** Tombol vote + state: `pending` (badge "Menunggu Masa Tunda"),
`terhitung`, `ALREADY_VOTED` (disabled) — `PAGE_STATES.md` §A3.

---

### F3.3 — Status Tindak Lanjut

**Deliverable:** Halaman status publik per klaster, 6 status + alasan wajib
(`PAGE_STATES.md` §A5), pakai `useStatusPolling`.

---

### F3.4 — Portal Pemerintah

**Deliverable:** `PemerintahLayout` (sidebar + strip aksen), dashboard kadis,
verifikasi klaster (`PAGE_STATES.md` §B1), override prioritas (§B2), update
status penanganan (§B3, loop "masih berlangsung").

---

## FASE 4 — Integrasi & Finalisasi (Minggu 12–14)

> **Sebelum mulai F4.1:** baca `docs/universal/GIT_WORKFLOW.md` §5a —
> alur merge ke branch `development` + aturan resolusi konflik (kontrak
> `INTERFACES.md` mengikuti kode backend; docs ikut milik masing-masing pihak).

### F4.1 — Ganti Mock → API Asli ✅ SELESAI (2026-10-07)

**Deliverable:** Semua `src/mocks/` diganti `src/lib/api/` tanpa mengubah
struktur komponen. Cek ulang `API_CLIENT.md` §4 (token) & §5 (per halaman).

**Hasil eksekusi:**
- Lapis API baru `src/lib/api/` (client, errors, types, auth, sekolah, laporan,
  klaster, vote, dashboard) + `src/lib/utils.ts` untuk helper `cn()`.
- 14 halaman dimigrasikan: warga (Dashboard, Direktori, DetailSekolah,
  FormLaporan, DetailKlaster, ModalFormLaporan, Login) & dinas (AntrianValidasi,
  DinasLayout, DashboardKadis, PetaSebaranDinas, CetakRingkasanEksekutif,
  IngestDataCsv). `AuthContext` memakai login/`GET /auth/me` sungguhan.
- `src/mocks/` (7 berkas) dihapus; tidak ada lagi import `@/mocks/*`.
- Verifikasi: `npm run build` (tsc + vite) sukses, 2323 modul; smoke test
  kontrak terhadap backend hidup **14/14 lulus**.
- **9 deviasi kontrak / gap data** ditemukan dan dicatat di
  `docs/frontend/CHANGELOG.md` § *Catatan Deviasi Kontrak & Gap Data* — perlu
  keputusan Aris + Dimas sebelum mengubah `INTERFACES.md`.

---

### F4.2 — Black-box Testing

**Deliverable:** Semua state `PAGE_STATES.md` diuji manual — normal & gagal.

---

### F4.3 — Perf & Aksesibilitas

**Deliverable:** Audit Lighthouse (target aksesibilitas ≥ 90), lazy-load route.

---

### F4.4 — Dokumentasi Final

**Deliverable:** `frontend/` docs sinkron dengan kode final.

---

## Dependencies antar Task

```
F1.1 → F1.3 (project dulu, baru shadcn)
F1.2 → F2.4-F2.9 (token desain dibutuhkan semua halaman)
F1.5 → F2.1, F2.2 (folder lib/mocks dulu)
F2.1 → F2.4-F2.9 (types dibutuhkan semua halaman)
F2.2 → F2.4-F2.9 (mock data dibutuhkan semua halaman)
F2.3 → F2.4-F2.8 (layout sebelum halaman)
F2.4 → F2.5, F2.6 (dashboard menautkan direktori/detail)
F2.6 → F2.7 (detail sekolah menautkan form laporan)
```

---

## Catatan Terbuka

- [ ] `GET /dashboard/wilayah` (`INTERFACES.md` §3) hanya role dinas — Dashboard
      Warga belum punya endpoint khusus. Alternatif: backend tambah
      `GET /dashboard/warga` (perlu persetujuan kontrak, §0) atau warga pakai
      agregat `GET /sekolah` + `GET /klaster`.
- [ ] Ambang batas `penanda_masalah` masih tebakan (`INTERFACES.md` §11).
- [ ] Masa tunda vote belum ditentukan (`DECISIONS.md` D-08, `INTERFACES.md` §11).
- [ ] Pola refresh token / JWT rotation masih item terbuka backend.