# TASK_GUIDE.md — Frontend SIMAKIS

> Panduan tugas frontend per fitur berdasarkan `PRD.md`, `ROADMAP.md`,
> `FLOWS.md`, `PAGE_STATES.md`, dan `INTERFACES.md`. Dokumen ini menjadi
> **single source of truth** untuk pekerjaan Dimas (Frontend Engineer).
> Bentuk data apa pun diambil dari `API_CLIENT.md` §3 / `INTERFACES.md` —
> jangan mendefinisikan ulang.

**Update terakhir:** 21 Oktober 2026

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
| F3.1 | Klaster Isu | **✅ Selesai** | `DetailKlaster.tsx` + `InstitutionalStepper` (`components/composite/`, ekspor `tahapDariStatus`) + halaman list `DaftarKlaster.tsx` (rute `/klaster`, filter kategori, `NumberedPagination`) + nav "Klaster Isu" (Public/Warga) |
| F3.2 | Voting | **✅ Selesai** | UI vote di `DetailKlaster.tsx`: dialog konfirmasi → `POST /vote`, badge pending **Menunggu Masa Tunda** / **Sudah Vote**, `409 ALREADY_VOTED` → tombol disabled, `401` → `/login?redirect=…` (smoke live 21 Okt 2026: status → vote → duplikat 409 ✓) |
| F3.3 | Status Tindak Lanjut | **✅ Selesai** | `StatusTindakLanjutWarga.tsx` (rute `/klaster/:klasterId/status`) — `useStatusPolling` 15s, 8 status, alasan wajib tampil, stepper, timeline riwayat |
| F3.4 | Portal Pemerintah | **✅ Selesai** | §B1 AntrianValidasi ✓ · §B2 override prioritas di `TabelVerifikasi.tsx` (dialog alasan wajib, `REASON_REQUIRED`/`FORBIDDEN`, badge `override #N`) · §B3 loop `dalam_proses` di `StatusTindakLanjut.tsx` (dialog tetap terbuka) — smoke live 21 Okt 2026: override 200/422-alasan/403-verifikator ✓ |
| F4.1 | Ganti Mock → API Asli | **✅ 100%** | `src/lib/api/` dipakai 19 halaman; `src/mocks/` dihapus; build hijau; smoke test 14/14 + 4 halaman lanjutan + `LaporanSkorKbm` (13 Okt 2026, endpoint `GET /laporan/skor-kbm` F4.8/D-22 live). Halaman sebelumnya di-wire 8 Okt 2026: `DashboardWilayah`, `RiwayatLaporan`, `TabelVerifikasi`, `LogAuditPdp` (lihat CHANGELOG § *Halaman yang Masih Pakai Data Demo*) |
| F4.2 | Black-box Testing | **Sebagian** | Smoke API live 21 Okt 2026 (lihat CHANGELOG § *Catatan Black-box F4.2*): perlu-review/skor-kbm/ai-status/vote/override/PUT status ✓ · **sisa**: uji state UI browser (`PAGE_STATES.md` A1–B3, loading/empty/error) |
| F4.3 | Perf & Aksesibilitas | **Sebagian** | ✅ Lazy-load semua rute `React.lazy` + `Suspense` (App.tsx; Landing eager) — chunk per halaman terbentuk, `index` utama 321 kB · sisa: audit Lighthouse (target ≥ 90) |
| F4.4 | Dokumentasi Final | **Sebagian** | TASK_GUIDE (tabel + checklist) & CHANGELOG sinkron 21 Okt 2026; `INTERFACES.md` §4.1–§4.4 dikunci · sisa: audit sinkron dokumen `docs/frontend/` lain (FLOWS, STRUKTUR_MODULAR, UI_COMPONENTS) terhadap kode final |
| F4.13 | Konfirmasi Severity Pasca-Laporan | **Sebagian (FE ✅ 100%)** | T1–T6 kode + kontrak selesai: types + `getKonfirmasi`/`postKonfirmasi`, `PertanyaanKonfirmasi.tsx`, banner+modal `FormLaporan`, badge Riwayat, `INTERFACES` §4.1–§4.4 DRAFT dilepas + §11.1 dicentang · **tertunda**: smoke live (endpoint `GET/POST /laporan/{id}/konfirmasi` belum ada di `backend/app/routers/laporan.py`) |

### Detail Task Tertunda (belum selesai / terlewat)

- [x] **F3.2 — Voting**: ✅ — UI vote di `DetailKlaster.tsx` (`PAGE_STATES.md §A3`):
  dialog konfirmasi → `POST /vote?klaster_id=…`; hasil `pending` → badge **Menunggu
  Masa Tunda**; `409 ALREADY_VOTED` → tombol **Sudah Vote** (disabled); `401` →
  `/login?redirect=…`. Smoke live 21 Okt 2026 (status → vote → duplikat 409 ✓).
  Catatan: mock `voteContoh`/`votePendingContoh` sudah tidak ada (mock dihapus F4.1).
- [x] **F3.3 — Status Tindak Lanjut**: ✅ — `pages/warga/StatusTindakLanjutWarga.tsx`,
  rute `/klaster/:klasterId/status`, 8 status + alasan wajib (`PAGE_STATES.md §A5`),
  `useStatusPolling` 15 detik, timeline `GET /klaster/{id}/riwayat` append-only.
- [x] **F3.1 — sisa**: ✅ — `InstitutionalStepper` di `src/components/composite/`
  (bukan `institutional/` yang `.gitkeep` — mengikuti pemakaian nyata) + halaman
  `src/pages/warga/DaftarKlaster.tsx` (rute `/klaster`).
- [x] **F3.4 — sisa**: ✅ — override prioritas (`§B2`) di `TabelVerifikasi.tsx`
  (tombol kolom AKSI → dialog alasan wajib, badge `override #N`, handle
  `REASON_REQUIRED`/`FORBIDDEN`) dan loop status (`§B3`) di `StatusTindakLanjut.tsx`
  (`dalam_proses` membuka dialog kembali, bukan state akhir).
- [x] **F4.1 — Ganti Mock → API Asli**: ✅ 100% — seluruh pemakaian `src/mocks/` diganti
  `src/lib/api/` tanpa mengubah struktur komponen. `LaporanSkorKbm` di-wire 13 Okt 2026
  (`GET /laporan/skor-kbm`, F4.8/D-22).
- [ ] **F4.2 — Black-box Testing**: uji manual seluruh state `PAGE_STATES.md`
  (normal & gagal). **Progres 21 Okt 2026**: smoke API live selesai (hasil di
  `CHANGELOG.md` § *Catatan Black-box F4.2*) — termasuk perbaikan `alembic upgrade
  head` (DB ketinggalan → `GET /laporan/perlu-review` 500 Unknown column
  `hasil_klasterisasi`, kini 200). Sisa: eksplorasi state UI per perintah uji.
- [ ] **F4.3 — Perf & Aksesibilitas**: **lazy-load route ✅ 21 Okt 2026**
  (`React.lazy` + `Suspense` di `App.tsx`, seluruh halaman kecuali Landing);
  sisa audit Lighthouse (target aksesibilitas ≥ 90).
- [ ] **F4.4 — Dokumentasi Final**: sinkronkan seluruh dokumen `docs/frontend/`
  dengan kode final. **Progres 21 Okt 2026**: tabel Status + checklist ini +
  `CHANGELOG.md` sinkron; `INTERFACES.md` §4.1–§4.4 dikunci (DRAFT dilepas);
  sisa audit dokumen lain (FLOWS, STRUKTUR_MODULAR, UI_COMPONENTS, MOCK_DATA —
  `MOCK_DATA.md` kemungkinan usang karena `src/mocks/` sudah dihapus).

> Penanda: `[ ]` = tertunda, `[x]` = selesai. Audit terakhir 1 Oktober 2026.

### F4.13 — Konfirmasi Severity Pasca-Laporan (Lapis 1) — ✅ FE SELESAI

> **Status 21 Okt 2026:** FE T1–T6 selesai (types + API layer, `PertanyaanKonfirmasi`,
> integrasi `FormLaporan`, badge `RiwayatLaporan`, build hijau, kontrak dikunci).
> **Tertunda:** smoke live — endpoint backend `GET/POST /laporan/{id}/konfirmasi`
> belum diimplement (`backend/app/routers/laporan.py`), sehingga alur jawab
> diverifikasi dari kontrak saja (GET → 404 `NOT_FOUND` tertangani UI dengan ramah).
> Task code mengikuti penomoran `SPEC_SEVERITY_KLASIFIKASI.md` §16 (butir 1).
> **Sumber kebenaran:** kontrak `INTERFACES.md` §4.1–§4.4 (**dikunci 20 Okt 2026**) ·
> spesifikasi `SPEC_SEVERITY_KLASIFIKASI.md` §15, §19.

#### Konteks & Prinsip

- Bukan form sebelum kirim. Alurnya: **warga kirim laporan → 201 → AI memilih
  maksimal 4 pertanyaan relevan dari bank pertanyaan → warga menjawab (opsional)
  → jawaban + deskripsi → `kondisi_dilaporkan`**.
- **Prinsip mutlak:** konfirmasi **opsional, tidak memblokir**. Laporan tetap sah
  tanpa dijawab; desain tidak boleh memaksa (SPEC §19.6).
- **Jawaban warga selalu menang** atas ekstraksi AI dari deskripsi (SPEC §15.6).
- Skala 24 jam: lewat batas → `status_konfirmasi = dilewati`,
  `kondisi_dilaporkan` diisi dari deskripsi saja.

#### Gate (wajib lulus sebelum coding)

- [x] **5 keputusan kontrak dijawab** (INTERFACES §11.1 / SPEC §19.7) — 20 Okt 2026:
      sekali GET · field `kode` · endpoint terpisah · flip `dilewati` lazy saat
      diakses · verifikator TIDAK boleh ubah jawaban warga.
- [x] `INTERFACES.md` §4.1–§4.4 **dikunci** (label DRAFT dilepas) — Aris & Dimas.
- [ ] Endpoint backend `GET/POST /laporan/{id}/konfirmasi` **live** untuk smoke
      test (implementasi lapis 1, SPEC §18 item 5) — **belum ada di `laporan.py`**.

#### Tahapan Pengerjaan

**T1 — API layer** (`lib/api/types.ts`, `lib/api/laporan.ts`)
- Type baru: `KonfirmasiInfo` (`perlu_konfirmasi, jumlah_pertanyaan,
  kedaluwarsa_pada`), `KonfirmasiPertanyaan` (`kode, teks,
  tipe: "pilih_satu" | "pilih_satu_bertingkat", urutan?,
  lewati_bila_terjawab?, pilihan: {kode,label,tingkat?}[]`),
  `KonfirmasiDetail`, `KonfirmasiHasil`.
- Extend `LaporanResponse` + `RiwayatLaporanItem` dengan field aditif:
  `konfirmasi?`, `sumber_kondisi?`, `status_konfirmasi?`,
  `konfirmasi_perlu_dijawab?` (semua optional — FE tahan bila backend belum
  mengirim).
- Fungsi: `getKonfirmasi(laporanId)`, `postKonfirmasi(laporanId, jawaban)`
  (POST dengan `jawaban: []` = lewati). Handle `409 CONFLICT` → ApiError khusus
  "sudah pernah dijawab".

**T2 — Komponen `PertanyaanKonfirmasi`** (baru, `components/warga/`)
- **Q bagian** (`pilih_satu`): radio 8 nama awam sesuai kontrak (Plafon, Atap,
  Dinding, Lantai, Pintu/jendela, Listrik, Air, Drainase).
- **Q gejala** (`pilih_satu_bertingkat`, `urutan: dari_terparah`,
  `lewati_bila_terjawab: true`): daftar dari terparah ke teringan; **aturan di
  FE**: begitu satu gejala dipilih, opsi di bawahnya disembunyikan/di-disable
  (warna tingkat memakai field `tingkat` yang sudah enum resmi).
- Tombol global **"Lewati semua pertanyaan"** selalu terlihat (SPEC §19.6) →
  POST `jawaban: []` → tutup.
- Layout: modal/step di atas layar sukses; gaya selaras FormLaporan
  (rounded-xl, slate).

**T3 — Integrasi `FormLaporan.tsx`**
- Layar sukses → baca `res.konfirmasi?.perlu_konfirmasi`:
  - `true` → banner: "AI menemukan pola pada deskripsimu — jawab 4 pertanyaan
    singkat agar tingkat kerusakan lebih akurat (±1 menit)" + tombol **Jawab
    Sekarang** / **Lewati**.
  - `false`/absen → tampil tanpa banner.
- Modal konfirmasi menutup → perbarui state ringkas ("Terjawab"/"Dilewati").
- Error path: `401` redirect login, `403`/`404` pesan ramah, `409` → tutup
  modal + info "sudah pernah dijawab".

**T4 — `RiwayatLaporan.tsx`**
- Badge status konfirmasi per baris (`konfirmasi_perlu_dijawab` /
  `status_konfirmasi`): **"Perlu dikonfirmasi"** (klik → lanjutkan jawab,
  selama < 24 jam), "Terjawab", "Dilewati".
- Toleran field hilang (backend belum kirim) → tidak render badge apa pun.

**T5 — Kasus tepi (wajib tercakup)**

| Kasus | Perilaku UI |
|---|---|
| Tab ditutup sebelum dijawab | Laporan tetap ada; badge di riwayat mengarahkan menjawab selama < 24 jam |
| Jawab sebagian | Kirim yang ada (kontrak: `200, terjawab`) |
| Semua jawaban "tidak"/gejala terendah | Tetap sah → `baik` |
| `kedaluwarsa_pada` lewat | Sembunyikan aksi jawab; badge jadi "Dilewati" |
| Status `terjawab`/`dilewati` dari GET | `pertanyaan: []` → jangan render pilihan kosong |

**T6 — Verifikasi**
- `npm run build:frontend` hijau.
- Smoke backend live: register/login → kirim laporan deskripsi spesifik → 201
  berkonfirmasi `perlu_konfirmasi: true` → jawab → cek `kondisi_dilaporkan`
  berubah di `GET /laporan/riwayat` → jawab ulang → `409`.
- Uji lewati, uji 403 (bukan pemilik).
- Update baris F4.13 di tabel Status + `docs/frontend/CHANGELOG.md`.

#### File yang Disentuh

| File | Aksi |
|---|---|
| `src/lib/api/types.ts` | type konfirmasi + extend laporan |
| `src/lib/api/laporan.ts` | `getKonfirmasi`, `postKonfirmasi` |
| `src/components/warga/PertanyaanKonfirmasi.tsx` | **baru** — modal pertanyaan |
| `src/pages/warga/FormLaporan.tsx` | banner + integrasi modal |
| `src/pages/warga/RiwayatLaporan.tsx` | badge status konfirmasi |
| `docs/frontend/TASK_GUIDE.md`, `CHANGELOG.md` | dokumentasi (akhir) |

#### Estimasi (adaptasi SPEC §19.6)

| Item | Besar |
|---|---|
| API layer + types | kecil |
| Komponen pilih-satu | kecil |
| Gejala bertingkat + aturan lewati | **sedang** |
| Integrasi FormLaporan + banner | sedang |
| Badge riwayat + edge cases | kecil |
| **Total** | **±2–3 hari kerja FE**, terhitung setelah gate lulus |

#### Rekomendasi 5 Keputusan Terbuka (bahan diskusi Aris–Dimas — **belum final**)

| # | Pertanyaan | Rekomendasi FE | Alasan |
|---|---|---|---|
| 1 | Sekali GET atau bertahap? | **Sekali GET** (sesuai draft §19.3); GET-ulang sekali hanya bila pertanyaan bagian belum terjawab dan AI belum bisa pilih gejala | Max 4 pertanyaan, tanpa state server per tahap |
| 2 | `kode` vs `gejala_id`? | **`kode`** | Sudah dipakai konsisten di draft §19.3/§19.4 |
| 3 | Terpisah atau gabung `GET /laporan/{id}`? | **Terpisah** | Respons laporan tetap ringan; concern campur (data vs alur konfirmasi) |
| 4 | 24 jam → cron atau saat diakses? | **Saat diakses** (lazy flip ke `dilewati` saat GET konfirmasi/riwayat) | Tanpa cron baru; state selalu akurat saat dibaca |
| 5 | Verifikator boleh ubah jawaban warga? | **Tidak** | Konsisten "jawaban warga menang"; koreksi lewat jalur `sumber_kondisi` terpisah |

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

### F4.1 — Ganti Mock → API Asli ✅ 100% (2026-10-07, dilanjutkan 2026-10-08, selesai 2026-10-13)

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

**Lanjutan 2026-10-08 — 4 halaman terakhir:**
- `DashboardWilayah.tsx`, `RiwayatLaporan.tsx`, `TabelVerifikasi.tsx`, dan
  `LogAuditPdp.tsx` di-wire ke API nyata; data contoh inline dihapus.
- Kolom/filter yang tidak punya sumber data di backend ikut dibuang
  (detailnya di `docs/frontend/CHANGELOG.md` § *F4.1 (lanjutan)*), dan tipe
  `DashboardWilayah` + `AuditLogEntry` di `lib/api/types.ts` dikoreksi agar
  cocok dengan respons backend.
- Verifikasi: `tsc --noEmit` bersih, `npm run build` sukses, smoke test
  Chromium 4 halaman tanpa crash/console error.
- **Sisa 1 halaman:** `LaporanSkorKbm.tsx` — terblokir keputusan kontrak, selesai 13 Okt 2026
  setelah F4.8 (`GET /laporan/skor-kbm`, D-22) di-backend; halaman di-wire
  penuh ke data live (F4.1 → 100%).

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