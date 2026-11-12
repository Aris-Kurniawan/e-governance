# SPESIFIKASI HALAMAN PEMERINTAH (DINAS) — 4 MENU UTAMA REFACTOR
> **SIMAKIS E-Government System** — Dinas Pendidikan Kabupaten Lamongan.
> Dokumen ini adalah arsitektur tunggal untuk implementasi frontend dan konteks AI code generation.
> Seluruh menu telah direduksi dari 8 menu menjadi **3 Menu Utama + 1 Menu Sistem**, dengan pengikatan 100% pada endpoint backend yang sudah ada. **TIDAK ADA penambahan endpoint baru di luar yang sudah terpasang di backend.**

---

## 1. PETA ARSITEKTUR MENU TEREDUKSI & ENDPOINT BINDING

```
MENU UTAMA
├── 1. Overview (/dinas/dashboard)
│     ├── Metrik Agregat Wilayah
│     ├── Peta Spasial Sebaran Sekolah & Klaster (Integrasi Peta)
│     └── Tabel Audit Prioritas KBM (Integrasi Skor KBM)
│
├── 2. Antrean Verifikasi (/dinas/antrian)
│     ├── Tab 1: Klaster Isu Sarpras (Eksisting Antrean)
│     └── Tab 2: Aduan Mandiri / Noise (Integrasi Perlu Review D-30)
│
└── 3. Status Tindak Lanjut (/dinas/status)
      ├── Tab 1: Klaster Isu Sarpras (Eksisting)
      └── Tab 2: Aduan Mandiri Tervalidasi (D-32 / DBG-027)

PENGATURAN & AUDIT (Seksi Bawah)
└── 4. Sistem & Kepatuhan (/dinas/sistem)
      ├── Tab 1: Ingest Data CSV Dapodik & Pemicu AI
      └── Tab 2: Log Audit Enkripsi PDP Vault
```

---

## 2. SPESIFIKASI DETAIL HALAMAN & BINDING ENDPOINT

### MENU 1: OVERVIEW & AUDIT EKSEKUTIF (`/dinas/dashboard`)
* **Role Akses (RBAC):** `admin`, `verifikator_dinas`, `kepala_dinas`
* **Surface Archetype:** *Monitor* (Glanceability, no fluff, observabilitas terfokus).
* **Komponen & Blok UI:**
  1. **Metric Headline Cards (Atas):**
     * Total Laporan Masuk
     * Klaster Isu AI Terbentuk
     * Laporan Butuh Validasi
     * Indeks Integritas Dapodik
  2. **Modul Peta GIS Spasial (Penyatuan dari `PetaSebaranDinas.tsx`):**
     * Visualisasi peta Leaflet 62 sekolah di Kecamatan Lamongan.
     * Pin marker berwarna berdasarkan status keparahan (Merah = Kritis, Oranye = Tinggi, Hijau = Sedang).
  3. **Tabel Audit Prioritas KBM (Penyatuan dari `LaporanSkorKbm.tsx`):**
     * Tabel daftar sekolah prioritas terurut berdasarkan skor $P_k = 0.7 \cdot s_{\text{lap}} + 0.3 \cdot s_{\text{dap}} + V$.
     * Kolom: Nama Sekolah, NPSN, Kategori Kerusakan, Nilai $P_k$, Aksi Lihat Klaster.
* **Binding Endpoint Backend:**
  * `GET /dashboard/summary` — Metrik total laporan, total klaster, dan statistik agregat.
  * `GET /sekolah/peta` — GeoJSON / titik koordinat latitude-longitude 62 sekolah dan status klaster.
  * `GET /klaster?sort_by=skor_prioritas&order=desc&limit=10` — 10 klaster isu paling mendesak.

---

### MENU 2: ANTREAN VERIFIKASI (`/dinas/antrian`)
* **Role Akses (RBAC):** 
  * `verifikator_dinas`, `admin`: Mode Eksekusi (*Read & Write*).
  * `kepala_dinas`: Mode Pengawasan (*Read-Only*, D-30).
* **Surface Archetype:** *Operate* (Master-Detail Split View).
* **Komponen & Blok UI:**
  * **Header Segmented Tab:**
    * **Tab 1: Klaster Isu Sarpras (Kelompok $\ge 2$ Laporan):**
      * Menampilkan antrean hasil *Adaptive Cosine Fallback* (D-31).
      * Master Queue di kiri (daftar klaster urut skor $P_k$).
      * Detail Bento di kanan: identitas sekolah, ringkasan dampak KBM, daftar laporan warga anggota, komparasi foto fisik *Before & After*, serta tombol verifikasi.
    * **Tab 2: Aduan Mandiri / Noise ($n < 2$ / Singleton D-30):**
      * Menampilkan daftar aduan warga yang tidak memenuhi densitas klaster (`klaster_id IS NULL`).
      * Kartu audit teks dan foto laporan individu.
      * Tombol validasi menjadi Aduan Mandiri Sah atau tolak laporan.
* **Binding Endpoint Backend:**
  * **Tab 1 (Klaster):**
    * `GET /klaster?status_verifikasi=menunggu_verifikasi` — Mengambil daftar klaster antrean.
    * `GET /klaster/{id}` — Detail klaster beserta laporan anggota dan foto.
    * `PUT /klaster/{id}/verifikasi?status=terverifikasi&alasan={alasan}` — Tombol **"Sahkan Klaster"**.
    * `PUT /klaster/{id}/verifikasi?status=ditolak&alasan={alasan}` — Tombol **"Tolak Klaster"** (alasan wajib).
  * **Tab 2 (Aduan Mandiri):**
    * `GET /laporan/perlu-review` — Mengambil daftar laporan noise / anomali.
    * `PUT /laporan/{id}/status` — Payload `{"status": "divalidasi"}` (validasi jadi aduan mandiri) atau `{"status": "ditolak"}`.

---

### MENU 3: STATUS TINDAK LANJUT (`/dinas/status`)
* **Role Akses (RBAC):** `admin`, `verifikator_dinas`, `kepala_dinas`
* **Surface Archetype:** *Operate* (Dual-Track Progress Pipeline).
* **Komponen & Blok UI:**
  * **Header Dual-Track Selector (D-32):**
    * **Tab 1: Klaster Isu Sarpras (Kelompok)** — Alur penanganan klaster resmi.
    * **Tab 2: Aduan Mandiri Tervalidasi (D-32)** — Alur penanganan laporan non-klaster hasil verifikasi.
  * **Kanban / Stepper Kolom 4 Status Penanganan:**
    1. Kolom: *Dalam Antrean Prioritas* (`dalam_antrian_prioritas`)
    2. Kolom: *Dalam Pengerjaan Fisik* (`dalam_proses`)
    3. Kolom: *Selesai / Tuntas* (`selesai`)
    4. Kolom: *Tidak Dapat Ditindaklanjuti* (`tidak_dapat_ditindaklanjuti`)
  * **Modal Update Status Fisik:**
    * Dropdown pilihan status baru.
    * Input textarea alasan perubahan status (wajib diisi untuk status batal/selesai).
    * Jejak riwayat perubahan status terdahulu (append-only timeline).
* **Binding Endpoint Backend:**
  * **Track 1 (Klaster):**
    * `GET /klaster` — Filter `status_penanganan`.
    * `POST /klaster/{id}/status?status={status}&alasan={alasan}` — Update progres fisik klaster.
    * `GET /klaster/{id}/riwayat` — Log riwayat penanganan klaster (`status_log`).
  * **Track 2 (Aduan Mandiri D-32):**
    * `GET /laporan/publik` — Menampilkan daftar aduan mandiri tervalidasi.
    * `POST /laporan/{id}/tindak-lanjut?status={status}&alasan={alasan}` — Update progres fisik aduan mandiri (`laporan_status_log`).
    * `GET /laporan/{id}/riwayat-tindak-lanjut` — Log riwayat penanganan aduan mandiri.

---

### MENU 4: SISTEM & KEPATUHAN (`/dinas/sistem`)
* **Role Akses (RBAC):**
  * Ingest CSV & AI: `admin`, `verifikator_dinas`.
  * Audit PDP Vault: `admin`, `kepala_dinas`.
* **Surface Archetype:** *Configure & Compliance*.
* **Komponen & Blok UI:**
  * **Tab 1: Ingest Data CSV & AI Engine Status (Penyatuan `IngestDataCsv.tsx`):**
    * Form drag-and-drop unggah file `dapodik.csv` semesteran.
    * Panel Observabilitas AI: status batch cron terakhir, metrik coverage rate (target 60-85%), jumlah klaster vs noise.
    * Tombol tunggal pemicu batch: **"Jalankan Klasterisasi AI Sekarang"**.
  * **Tab 2: Log Audit Kepatuhan PDP Vault (Penyatuan `LogAuditPdp.tsx`):**
    * Banner status brankas enkripsi NIK (AES-256-GCM kepatuhan UU PDP No. 27/2022).
    * Tabel audit trail append-only: Timestamp, User Pegawai yang mengakses, ID Laporan yang dibuka, Alasan kedinasan.
* **Binding Endpoint Backend:**
  * `POST /ingest/dapodik` — Unggah file CSV Dapodik (Multipart Form-Data).
  * `POST /ai/cluster?force_reprocess={true/false}` — Memicu kalkulasi UMAP + Adaptive Cosine.
  * `GET /audit/pdp-logs` — Menampilkan log akses dekripsi data NIK pelapor.

---

## 3. RINGKASAN PEMETAAN KONTRAK ENDPOINT KE KOMPONEN BARU

| File Komponen Frontend Baru | Endpoint Backend yang Dikonsumsi | Method | Keterangan Fungsi |
|---|---|:---:|---|
| `pages/dinas/DashboardKadis.tsx` | `/dashboard/summary`<br>`/sekolah/peta`<br>`/klaster` | GET<br>GET<br>GET | Ringkasan wilayah, peta spasial GIS, dan tabel prioritas KBM |
| `pages/dinas/AntrianValidasi.tsx` | `/klaster`<br>`/klaster/{id}`<br>`/klaster/{id}/verifikasi`<br>`/laporan/perlu-review`<br>`/laporan/{id}/status` | GET<br>GET<br>PUT<br>GET<br>PUT | Meja kerja verifikasi gabungan klaster sah dan aduan mandiri noise |
| `pages/dinas/StatusTindakLanjut.tsx` | `/klaster`<br>`/klaster/{id}/status`<br>`/klaster/{id}/riwayat`<br>`/laporan/publik`<br>`/laporan/{id}/tindak-lanjut`<br>`/laporan/{id}/riwayat-tindak-lanjut` | GET<br>POST<br>GET<br>GET<br>POST<br>GET | Pengelolaan progres fisik pengerjaan sarpras dua jalur (D-32) |
| `pages/dinas/SistemKepatuhan.tsx` | `/ingest/dapodik`<br>`/ai/cluster`<br>`/audit/pdp-logs` | POST<br>POST<br>GET | Ingest CSV semesteran, observabilitas AI, dan audit log UU PDP |
