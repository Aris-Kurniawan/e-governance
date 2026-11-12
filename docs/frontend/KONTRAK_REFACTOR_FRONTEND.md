# PANDUAN KONTRAK FRONTEND REFACTOR (SIMAKIS)
> Dokumen ini adalah acuan penguncian fungsi (*Contract Lock*) sebelum merombak tampilan UI frontend.
> Semua rute, tombol aksi, payload, hak akses (RBAC), dan endpoint API di bawah ini **WAJIB DIPERTAHANKAN** agar tidak merusak fungsionalitas sistem.

---

## 1. PETA RUTE & HAK AKSES (RBAC GUARD)

| Rute URL | Komponen Halaman | Hak Akses (Role) | Keterangan Navigasi |
|---|---|---|---|
| `/` | `Landing.tsx` | Publik | Beranda pengenalan SIMAKIS |
| `/login` | `Login.tsx` | Publik / Tamu | Login khusus warga |
| `/registrasi` | `Registrasi.tsx` | Publik / Tamu | Pendaftaran warga 2-step (Step 1 NIK, Step 2 Akun) |
| `/dashboard` | `Dashboard.tsx` | Warga (`warga_umum`, `warga_terverifikasi`) | Ringkasan wilayah & aksi cepat warga |
| `/wilayah` | `DashboardWilayah.tsx` | Publik / Warga | Peta sebaran isu & tabel isu wilayah |
| `/sekolah` | `Direktori.tsx` | Publik / Warga | Direktori 62 sekolah se-Kec. Lamongan |
| `/sekolah/:npsn` | `DetailSekolah.tsx` | Publik / Warga | 3 Tab: Audit Sarpras, Profil Dapodik, Isu Warga |
| `/laporan/baru` | `FormLaporan.tsx` | Login Warga | Form kirim laporan (Sanitasi EXIF + Modal Severity) |
| `/laporan/riwayat` | `RiwayatLaporan.tsx` | Login Warga | Tab 1: Aduan Saya, Tab 2: Transparansi Publik |
| `/klaster` | `DaftarKlaster.tsx` | Publik / Warga | Daftar klaster isu sarpras terverifikasi |
| `/klaster/:klasterId` | `DetailKlaster.tsx` | Publik / Warga | Detail klaster, daftar laporan anggota, tombol vote |
| `/klaster/:klasterId/status` | `StatusTindakLanjutWarga.tsx` | Publik / Warga | Stepper visual progres fisik untuk publik |
| `/tentang-data` | `TentangData.tsx` | Publik | Penjelasan metodologi AI & privasi PDP |
| `/dinas/login` | `LoginDinas.tsx` | Publik / Dinas | Gerbang masuk pegawai dinas |
| `/dinas/dashboard` | `DashboardKadis.tsx` | `admin`, `verifikator_dinas`, `kepala_dinas` | Metrik eksekutif, peta interaktif, & ringkasan KBM |
| `/dinas/antrian` | `AntrianValidasi.tsx` | `admin`, `verifikator_dinas`, `kepala_dinas` | Meja verifikasi klaster (Verifikator aksi, Kadis read-only) |
| `/dinas/perlu-review` | `LaporanPerluReview.tsx` | `admin`, `verifikator_dinas`, `kepala_dinas` | Laporan noise/anomali hasil AI (D-30: Verifikator aksi) |
| `/dinas/status` | `StatusTindakLanjut.tsx` | `admin`, `verifikator_dinas`, `kepala_dinas` | Pengelolaan status fisik pengerjaan proyek |
| `/dinas/peta` | `PetaSebaranDinas.tsx` | `admin`, `verifikator_dinas`, `kepala_dinas` | Pemetaan spasial klaster & sekolah |
| `/dinas/skor-kbm` | `LaporanSkorKbm.tsx` | `admin`, `verifikator_dinas`, `kepala_dinas` | Tabel audit dampak KBM (Shrinkage Bayes) |
| `/dinas/ingest` | `IngestDataCsv.tsx` | `admin`, `verifikator_dinas` | Unggah data Dapodik & pemicu klasterisasi AI |
| `/dinas/audit-pdp` | `LogAuditPdp.tsx` | `admin`, `kepala_dinas` | Log akses de-enkripsi brankas NIK warga |

---

## 2. INVENTARIS TOMBOL AKSI & ENDPOINT (WIRING MATRIX)

### A. Alur Warga (Citizen Flow)

#### 1. Registrasi & Login (`Login.tsx`, `Registrasi.tsx`)
- **Tombol "Lanjut ke Data Akun" (Step 1):** Validasi NIK 16 digit lokal.
- **Tombol "Buat Akun" (Step 2):**
  - **Endpoint:** `POST /auth/register`
  - **Payload:** `{ nama, email, password, nik, sekolah_terkait_npsn }`
- **Tombol "Masuk":**
  - **Endpoint:** `POST /auth/login`
  - **Payload:** `{ email, password }`
  - **Penyimpanan Token:** Simpan ke `localStorage.getItem("simakis_access_token")`.

#### 2. Pelaporan Sarpras (`FormLaporan.tsx` & `ModalFormLaporan.tsx`)
> ⚠️ **Catatan Penting:** SIMAKIS memiliki **dua jalur pelaporan** (halaman penuh & modal popup di `DetailSekolah.tsx`). Keduanya wajib mempertahankan logika yang sama!
- **Tombol "Kirim Laporan":**
  - **Prasyarat:** Hapus metadata GPS foto di browser (`stripExif()`), max 5MB.
  - **Endpoint 1:** `POST /laporan`  
    **Payload:** `{ sekolah_npsn, fasilitas_terkait, deskripsi, kondisi_dilaporkan, lokasi_ruang }`
  - **Endpoint 2 (Jika ada foto):** `POST /upload/laporan?laporan_id={id}` (Multipart form).
  - **Trigger Otomatis:** Jika respon `konfirmasi.perlu_konfirmasi == true`, **WAJIB buka modal `PertanyaanKonfirmasi` secara otomatis**.
- **Tombol "Kirim Jawaban" (Modal Severity):**
  - **Endpoint:** `POST /laporan/{id}/konfirmasi`
  - **Payload:** `{ jawaban: [{ pertanyaan_id, pilihan_id }] }`

#### 3. Voting Warga (`DaftarKlaster.tsx`, `DetailKlaster.tsx`, `DashboardWilayah.tsx`)
- **Tombol "Vote Dukung Isu":**
  - **Syarat Role:** Buka untuk `warga_umum`, `warga_terverifikasi`, `komite_sekolah` (D-28). Tolak akun staf dinas (403).
  - **Endpoint:** `POST /vote`
  - **Payload:** `{ klaster_id }`
  - **Feedback UI:** Tombol seketika berubah menjadi *"Sudah Vote"* (centang hijau) tanpa menunggu delay.

---

### B. Alur Dinas & Pemerintahan (Government Flow)

#### 1. Antrean Validasi Klaster (`AntrianValidasi.tsx` & `TabelVerifikasi.tsx`)
- **Tombol "Verifikasi Klaster":**
  - **Hak Akses:** Hanya `verifikator_dinas` dan `admin` (Kadis hanya *Mode Pengawasan*).
  - **Endpoint:** `PUT /klaster/{id}/verifikasi?status=terverifikasi&alasan={alasan}`
- **Tombol "Tolak Klaster":**
  - **Endpoint:** `PUT /klaster/{id}/verifikasi?status=ditolak&alasan={alasan}`  
  *(Alasan penolakan wajib diisi).*

#### 2. Review Laporan Noise / Anomali (`LaporanPerluReview.tsx`)
- **Tombol "Validasi" (Jadikan Aduan Mandiri Sah):**
  - **Hak Akses:** Hanya `verifikator_dinas` dan `admin` (D-30).
  - **Endpoint:** `PUT /laporan/{id}/status`
  - **Payload:** `{ status: "divalidasi" }`
- **Tombol "Tolak Laporan":**
  - **Endpoint:** `PUT /laporan/{id}/status`
  - **Payload:** `{ status: "ditolak" }`

#### 3. Pembaruan Status Tindak Lanjut Fisik (`StatusTindakLanjut.tsx`)
> ⚠️ **Pembaruan D-32 (Dual-Track Workflow):** Halaman ini menangani pembaruan status pengerjaan sarpras.
- **Track 1: Untuk Klaster Isu (Kelompok):**
  - **Endpoint:** `POST /klaster/{id}/status?status={status}&alasan={alasan}`
  - **Pilihan Status:** `dalam_antrian_prioritas` | `dalam_proses` | `selesai` | `tidak_dapat_ditindaklanjuti`.
  - **Riwayat Log:** `GET /klaster/{id}/riwayat`
- **Track 2: Untuk Aduan Mandiri / Noise Tervalidasi (D-32):**
  - **Endpoint:** `POST /laporan/{id}/tindak-lanjut?status={status}&alasan={alasan}`
  - **Pilihan Status:** `dalam_antrian_prioritas` | `dalam_proses` | `selesai` | `tidak_dapat_ditindaklanjuti`.
  - **Riwayat Log:** `GET /laporan/{id}/riwayat-tindak-lanjut`

#### 4. Sinkronisasi Dapodik & Trigger AI (`IngestDataCsv.tsx`)
- **Tombol "Mulai Ingesti CSV":**
  - **Endpoint:** `POST /ingest/dapodik` (Multipart file `.csv`).
- **Tombol "Jalankan Klasterisasi AI":**
  - **Endpoint:** `POST /ai/cluster?force_reprocess={true/false}`

---

## 3. CHECKLIST INTEGRITAS SEBELUM MEROMBAK UI

Saat mengganti tema CSS, kartu visual, atau layout form:
1. [ ] **Pertahankan ID input form:** Input form login (`email`, `password`) dan laporan (`sekolah_npsn`, `deskripsi`) jangan diubah nama kuncinya.
2. [ ] **Auth Token Header:** Klien HTTP (`src/lib/api/client.ts`) harus tetap menyisipkan header `Authorization: Bearer <token>`.
3. [ ] **Role Protection:** Jangan hapus komponen pembungkus `<ProtectedRoute allowedRoles={[...]}>` di `App.tsx`.
4. [ ] **Modal Severity Auto-Open:** Pastikan flag respons `res.konfirmasi?.perlu_konfirmasi` tetap di-listen di state React untuk memicu dialog pertanyaan.
5. [ ] **Format Tracking ID:** Tampilan ID tiket pelaporan (`LAP-YYYYMMDD-XXXX`) harus tetap dapat disalin (*copyable*) oleh pengguna.
