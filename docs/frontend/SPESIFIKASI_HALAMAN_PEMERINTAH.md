# PANDUAN SPESIFIKASI HALAMAN PEMERINTAH (DINAS) — BENTO ARCHITECTURE
> Dokumen ini memetakan seluruh 8 halaman portal pemerintah (`/dinas/*`) ke dalam gaya **Bento Grid Architecture**, lengkap dengan struktur layout, kartu bento, tombol aksi, hak akses (RBAC), dan kontrak endpoint API.

---

## 1. PETA MODUL & HALAMAN PEMERINTAH (RBAC D-30)

| No | Nama Halaman | Rute URL | Hak Akses (Role) | Surface Archetype | File Komponen |
|:---:|---|---|---|:---:|---|
| 1 | **Dashboard Kadis** | `/dinas/dashboard` | `admin`, `verifikator_dinas`, `kepala_dinas` | *Monitor* | `DashboardKadis.tsx` |
| 2 | **Antrean Validasi** | `/dinas/antrian` | `admin`, `verifikator_dinas`, `kepala_dinas` | *Operate* | `AntrianValidasi.tsx` |
| 3 | **Laporan Perlu Review** | `/dinas/perlu-review` | `admin`, `verifikator_dinas`, `kepala_dinas` | *Operate* | `LaporanPerluReview.tsx` |
| 4 | **Status Tindak Lanjut** | `/dinas/status` | `admin`, `verifikator_dinas`, `kepala_dinas` | *Operate* | `StatusTindakLanjut.tsx` |
| 5 | **Peta Sebaran Dinas** | `/dinas/peta` | `admin`, `verifikator_dinas`, `kepala_dinas` | *Explore* | `PetaSebaranDinas.tsx` |
| 6 | **Laporan Skor KBM** | `/dinas/skor-kbm` | `admin`, `verifikator_dinas`, `kepala_dinas` | *Compare* | `LaporanSkorKbm.tsx` |
| 7 | **Ingest Data CSV** | `/dinas/ingest` | `admin`, `verifikator_dinas` | *Configure* | `IngestDataCsv.tsx` |
| 8 | **Log Audit PDP Vault** | `/dinas/audit-pdp` | `admin`, `kepala_dinas` | *Monitor* | `LogAuditPdp.tsx` |

---

## 2. DETAIL SPESIFIKASI TIAP HALAMAN (BENTO SPEC)

### HALAMAN 1: DASHBOARD EKSEKUTIF KADIS (`/dinas/dashboard`)
* **Tujuan Halaman:** Memberikan ringkasan eksekutif dan observabilitas sarpras 62 sekolah kepada Kepala Dinas dan pejabat pengambil kebijakan.
* **Susunan Bento Grid:**
  * **Bento Tier 1 (Metrik Kunci Atas):**
    * Kartu 1: Total Aduan Masuk (`616 Laporan`).
    * Kartu 2: Klaster Isu AI Terbentuk (`49 Klaster Sah`).
    * Kartu 3: Aduan Mandiri Butuh Review (`12 Laporan`).
    * Kartu 4: Indeks Integritas Dapodik (`98.4% Normal`).
  * **Bento Tier 2 (Split Spasial & Urgensi):**
    * **Kartu Kiri (w: 58%):** Peta GIS Sebaran Klaster Kritis (Leaflet Engine, marker klaster merah/oranye/hijau).
    * **Kartu Kanan (w: 42%):** Tabel Klaster Prioritas Urgen (Daftar sekolah dengan Skor $P_k \ge 60$ beserta kategori kerusakan).
  * **Bento Tier 3 (Full-Width Card):**
    * Panel Audit Kepatuhan SP4N-LAPOR! & Log Dekripsi Brankas NIK `pdp_vault` (Menampilkan rekam jejak integritas data).
* **Kontrak API & Endpoint:**
  * `GET /dashboard/summary` (Mengambil total laporan, klaster, dan metrik wilayah).
  * `GET /sekolah/peta` (Koordinat latitude/longitude 62 sekolah dan klaster aktif).

---

### HALAMAN 2: ANTREAN VALIDASI KLASTER (`/dinas/antrian`)
* **Tujuan Halaman:** Meja kerja verifikasi teknis klaster isu sarpras hasil pengelompokan AI sebelum masuk tahap penganggaran.
* **Susunan Bento Grid:**
  * **Bento Tier 1 (Hero Klaster & 2×2 Metrik):**
    * **Hero Card (Kiri):** Identitas sekolah terpilih, foto gedung, badge tingkat urgensi, dan tombol berita acara.
    * **2×2 Metric Grid (Kanan):** Waktu aduan terakhir, Skor KBM ($P_k$), konsensus anggota klaster (Cosine Distance 0.88), dan jadwal tim peninjau.
  * **Bento Tier 2 (Infrastructure Journey Pipeline):**
    * Stepper 7 tahap: Aduan Masuk $\rightarrow$ Sanitasi PDP $\rightarrow$ Klasterisasi AI $\rightarrow$ **Verifikasi Dinas (Aktif)** $\rightarrow$ Penetapan RKT $\rightarrow$ Pengerjaan Fisik $\rightarrow$ Selesai.
  * **Bento Tier 3 (Tabel Riwayat & Modul Komparasi Fisik):**
    * **Kartu Kiri (Tabel):** Daftar 4–5 laporan warga anggota klaster, verifikasi de-identifikasi NIK.
    * **Kartu Kanan (Before & After Slider):** Komparasi foto aduan pelapor vs arsip Dapodik, toggle sudut pandang, banner analisis AI, dan tombol aksi.
* **Kontrak API & Endpoint:**
  * `GET /klaster` (Mengambil daftar klaster dengan filter status).
  * `GET /klaster/{id}` (Detail klaster dan anggota aduannya).
  * `PUT /klaster/{id}/verifikasi?status=terverifikasi&alasan={alasan}` (Tombol `✓ Sahkan Klaster` — Khusus Verifikator).
  * `PUT /klaster/{id}/verifikasi?status=ditolak&alasan={alasan}` (Tombol `✕ Tolak Klaster`).

---

### HALAMAN 3: LAPORAN PERLU REVIEW / NOISE (`/dinas/perlu-review`)
* **Tujuan Halaman:** Meninjau aduan warga yang diklasifikasikan sebagai *noise / singleton* oleh algoritma AI ($n < 2$ atau anomali teks).
* **Susunan Bento Grid:**
  * **Bento Tier 1 (Filter Toolbar & Metrik Review):**
    * 3 Kartu Ringkasan: *Aduan Perlu Ditinjau (12)*, *Aduan Dijadikan Mandiri (8)*, *Aduan Ditolak (4)*.
    * Toolbar filter berdasarkan fasilitas (Toilet, Plafon, Atap, Halaman).
  * **Bento Tier 2 (Split Detail & Audit Form):**
    * **Kartu Kiri (Tabel Aduan Noise):** Menampilkan tiket pelaporan (misal `LAP-20261028-9D3B1E29` UKS SDN 1 Kramat).
    * **Kartu Kanan (Review Drawer):** Foto bukti aduan warga, hasil ekstraksi kata kunci AI, dan form penetapan aduan.
* **Kontrak API & Endpoint:**
  * `GET /laporan/perlu-review` (Mengambil daftar laporan dengan `klaster_id IS NULL`).
  * `PUT /laporan/{id}/status` (Payload: `{"status": "divalidasi"}` untuk promosi jadi Aduan Mandiri, atau `{"status": "ditolak"}`).

---

### HALAMAN 4: STATUS TINDAK LANJUT DUAL-TRACK (`/dinas/status`)
* **Tujuan Halaman:** Memperbarui progres fisik perbaikan sarpras di lapangan sesuai arsitektur **Dual-Track D-32**.
* **Susunan Bento Grid:**
  * **Bento Tier 1 (Segmented Dual-Track Selector):**
    * Tab 1: **Track Klaster Isu Sarpras (Kelompok)** — untuk klaster $\ge 2$ laporan.
    * Tab 2: **Track Aduan Mandiri Tervalidasi (D-32)** — untuk laporan tervalidasi non-klaster.
  * **Bento Tier 2 (4 Kolom Progress Pipeline):**
    * Kolom 1: *Dalam Antrean Prioritas*
    * Kolom 2: *Sedang Dikerjakan (Fisik di Sekolah)*
    * Kolom 3: *Pekerjaan Selesai (100% BAST)*
    * Kolom 4: *Tidak Dapat Ditindaklanjuti (Dilengkapi Alasan)*
    * Setiap kartu tugas memuat tombol **`Update Log Status`**.
* **Kontrak API & Endpoint:**
  * **Track 1 (Klaster):**
    * `GET /klaster` (Filter status penanganan).
    * `POST /klaster/{id}/status?status={status}&alasan={alasan}`
    * `GET /klaster/{id}/riwayat`
  * **Track 2 (Aduan Mandiri D-32):**
    * `GET /laporan/publik`
    * `POST /laporan/{id}/tindak-lanjut?status={status}&alasan={alasan}`
    * `GET /laporan/{id}/riwayat-tindak-lanjut`

---

### HALAMAN 5: PETA SEBARAN DINAS (`/dinas/peta`)
* **Tujuan Halaman:** Analisis spasial kondisi sekolah se-Kecamatan Lamongan berbasis GIS interaktif.
* **Susunan Bento Grid:**
  * **Bento Utama (w: 75%):** Kanvas peta layar penuh interaktif dengan layer toggle (Batas Wilayah, Titik Sekolah, Zona Merah Kerusakan Kritis).
  * **Sidebar Bento Panel (w: 25%):** Ringkasan wilayah terpilih (NPSN, jumlah ruang rusak berat, statistik perbaikan berjalan).
* **Kontrak API & Endpoint:**
  * `GET /sekolah/peta` (Data GeoJSON sekolah & status kerusakan).

---

### HALAMAN 6: LAPORAN SKOR KBM (`/dinas/skor-kbm`)
* **Tujuan Halaman:** Transparansi audit perhitungan matematis formula DSRM Peffers dan shrinkage Bayes untuk penentuan prioritas bantuan.
* **Susunan Bento Grid:**
  * **Bento Tier 1:** Rumus breakdown bobot ($P_k = 0.7 \cdot s_{\text{lap}} + 0.3 \cdot s_{\text{dap}} + V$) dan distribusi desil keparahan.
  * **Bento Tier 2:** Tabel kalkulasi detail tiap sekolah: kolom $s_{\text{lap}}$, kolom $s_{\text{dap}}$, bobot voting $V$, dan skor akhir $P_k$.
* **Kontrak API & Endpoint:**
  * `GET /klaster/skor-audit` (Rincian variabel pembentuk skor prioritas).

---

### HALAMAN 7: INGEST DATA CSV DAPODIK (`/dinas/ingest`)
* **Tujuan Halaman:** Unggah data profil sarpras semesteran dari Dapodik dan eksekusi klasterisasi AI batch.
* **Susunan Bento Grid:**
  * **Kartu Kiri:** Drag-and-drop file uploader `.csv` Dapodik dengan verifikasi schema header otomatis.
  * **Kartu Kanan:** Panel pemicu klasterisasi AI (Tombol `Jalankan Klasterisasi AI Batch`) beserta log eksekusi UMAP & HDBSCAN.
* **Kontrak API & Endpoint:**
  * `POST /ingest/dapodik` (Multipart form-data CSV).
  * `POST /ai/cluster?force_reprocess=false` (Memicu kalkulasi pengelompokan teks laporan).

---

### HALAMAN 8: LOG AUDIT PDP VAULT (`/dinas/audit-pdp`)
* **Tujuan Halaman:** Kepatuhan terhadap UU Perlindungan Data Pribadi No. 27/2022 untuk mencatat siapa saja pegawai yang mendekripsi data NIK warga.
* **Susunan Bento Grid:**
  * **Bento Tier 1:** Status status brankas enkripsi (Kunci AES-256-GCM, total 15 NIK terproteksi, 0 kebocoran).
  * **Bento Tier 2:** Tabel append-only log akses: Waktu, User ID Pegawai, ID Laporan yang Dibuka, Alasan Keperluan Dinas.
* **Kontrak API & Endpoint:**
  * `GET /audit/pdp-logs` (Khusus role `admin` dan `kepala_dinas`).
