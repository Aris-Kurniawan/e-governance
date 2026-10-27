# Arsitektur Sistem (System Architecture Design) — SIMAKIS

Dokumen ini menyajikan gambaran umum arsitektur sistem (*system architecture design*) SIMAKIS (Sistem Informasi Manajemen Akuntabilitas & Klasterisasi Isu Sekolah) yang mencakup layer antarmuka, backend API, keamanan privasi (PDP), AI clustering pipeline, serta integrasi data.

---

## 1. Diagram Tingkat Tinggi Arsitektur (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER CLIENT (Frontend SPA)                         │
│  React + TypeScript + Vite + Tailwind CSS (Pola Model-View-Controller)     │
│                                                                             │
│  [View: Publik / Warga]                    [View: Pemerintah / Dinas]       │
│  • Direktori & Peta Sekolah                • Dashboard Kadis & Wilayah      │
│  • Form Laporan + Lapis 1 Konfirmasi       • Antrian Validasi AI Pipeline   │
│  • Voting & Pelacak Status Penanganan      • Verifikasi Mismatch & Ingest   │
│  ───────────────────────────────────┬───────────────────────────────────────│
│                                     │ HTTPS / REST API                      │
│                                     │ Bearer JWT Token                      │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND CORE (FastAPI / Python 3)                     │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ API Gateway & Router  │  │ RBAC & Auth Guard     │  │ PDP Security    │  │
│  │ (FastAPI Endpoints)   │  │ (Warga/Dinas/Admin)   │  │ (AES-256 / NIK) │  │
│  └──────────┬────────────┘  └───────────┬───────────┘  └────────┬────────┘  │
│             │                           │                       │           │
│             └─────────────────────┬─────┴───────────────────────┘           │
│                                   ▼                                         │
│                 ┌───────────────────────────────────┐                       │
│                 │  Database Relasional (MySQL 8.4)  │                       │
│                 │  • Data Operasional & Sekolah     │                       │
│                 │  • Laporan Warga & Klaster        │                       │
│                 │  • Vault Terenkripsi (PDP NIK)    │                       │
│                 │  • Log Audit & Riwayat Status     │                       │
│                 └─────────────────┬─────────────────┘                       │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     ASYNCHRONOUS AI PIPELINE         │  │     STORAGE & INTEGRASI DATA      │
│     (Clustering & Severity Engine)   │  │                                   │
│                                      │  │ • MinIO / S3 Object Storage       │
│ 1. Text Representation (A2):         │  │   - Media Bukti Laporan Warga     │
│    TF-IDF 300 Dimensi                │  │   - Metadata Stripping (Privasi)  │
│ 2. Dimensionality Reduction (B1):    │  │                                   │
│    UMAP (n_components=10)            │  │ • Dapodik Ingestion Engine        │
│ 3. Density-Based Clustering (C2):    │  │   - Batch Parser Pandas (CSV)     │
│    HDBSCAN (min_size=3, samples=2)   │  │   - Sinkronisasi Kondisi Sarpras  │
│ 4. Cluster Keyphrase Extraction (D1):│  │                                   │
│    TF-IDF Unigram                    │  │ • Cron Scheduler (02:00 WIB)      │
│ 5. Severity Engine (F4.16 K3):       │  │   - Re-clustering Periodik        │
│    LinearSVC (Akurasi 74%)           │  │   - Kalkulasi Agregat Wilayah     │
│ 6. Prioritas & Shrinkage (F4.12):    │  └───────────────────────────────────┘
│    Empirical Bayes (K=5) + 30% Dapo  │
└──────────────────────────────────────┘
```

---

## 2. Rincian Layer Arsitektur

### 2.1 User Client (Presentation Layer)
- **Framework & Teknologi:** React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Leaflet (Visualisasi Spasial), Radix UI/shadcn.
- **Pola MVC Sisi Klien:**
  - **View Publik (Warga):** Eksplorasi direktori sekolah, submit laporan fasilitas sekolah, konfirmasi tingkat kerusakan lapis 1, dan voting isu sarpras.
  - **View Pemerintah (Dinas/Kadis):** Peta sebaran spasial, antrian peninjauan klaster isu yang dihasilkan AI, matriks rekapitulasi sekolah, dan audit log penanganan.
  - **Model/Controller:** Autentikasi JWT terpusat, RBAC guard per rute, penanganan state data, dan validasi kontrak antarmuka API.

### 2.2 Backend Application (Core Logic Layer)
- **Framework:** FastAPI (Python 3.14/WSL).
- **Komponen Utama:**
  - **API Gateway & Routing:** Router modular (`/auth`, `/sekolah`, `/laporan`, `/klaster`, `/vote`, `/ingest`).
  - **Role-Based Access Control (RBAC):** Proteksi akses data tingkat per-request sesuai persona (`warga`, `dinas`, `admin`).
  - **Lapisan Keamanan & PDP (Pelindungan Data Pribadi):** Penanganan NIK pelapor menggunakan enkripsi AES-256 pada sub-penyimpanan vault khusus; data pelapor dide-identifikasi sebelum diproses ke layer publik atau analitik.

### 2.3 Data Storage Layer
- **Relational Database:** MySQL 8.4 native.
  - Menyimpan data tabular: metadata sekolah (NPSN, nama, koordinat), kondisi sarpras Dapodik, laporan warga, voting, penugasan klaster, dan log audit pergerakan status.
  - Skema dikelola secara terstruktur dengan migrasi otomatis Alembic.
- **Object Storage (MinIO / AWS S3 Compatible):**
  - Penyimpanan file media foto bukti laporan.
  - **Metadata Stripping:** Informasi sensitif (seperti data EXIF GPS pada foto kamera) dibersihkan sebelum disimpan ke bucket publik guna menjaga privasi pelapor.

### 2.4 Asynchronous AI & Analytical Pipeline Layer
Komponen komputasi berat dijalankan secara terjadwal/asinkron (*background task*) agar tidak menghambat respons API utama:
1. **Representasi Fitur & Embedding:**
   - Klasterisasi teks laporan menggunakan representasi **TF-IDF 300 dimensi** (terpilih melalui ablation study 81 kombinasi mengungguli neural model besar pada data lokal).
2. **Proyeksi Dimensi (UMAP):**
   - Mereduksi vektor ke 10 dimensi untuk mempertahankan relasi semantik lokal antar laporan sebelum masuk ke klasterisasi.
3. **Klasterisasi Berbasis Densitas (HDBSCAN):**
   - Mengelompokkan laporan secara adaptif tanpa menentukan $k$ di awal, memisahkan laporan valid ke dalam kelompok masalah serta menandai noise (-1).
4. **Ekstraksi Label Klaster (TF-IDF Unigram):**
   - Menghasilkan ringkasan kata kunci dominan sebagai identitas topik klaster.
5. **Severity Classification Engine (Lapis 2):**
   - Mengklasifikasikan tingkat keparahan laporan (*baik*, *rusak ringan*, *rusak sedang*, *rusak berat*) menggunakan model terlatih **LinearSVC** (Akurasi 74% pada evaluasi 50 test set).
6. **Formula Prioritas KBM & Bayesian Shrinkage:**
   - Menghitung skor urgensi sekolah dengan formula bobot: $70\% \text{ Laporan Warga} + 30\% \text{ Skor Dapodik}$.
   - Menerapkan *Empirical Bayes Shrinkage* ($K=5$) untuk mencegah lonjakan skor ekstrem pada sekolah dengan jumlah laporan yang sangat sedikit ($n \le 3$).

---

## 3. Karakteristik & Keunggulan Desain Sistem

| Karakteristik | Implementasi di SIMAKIS | Manfaat Teknis |
|---|---|---|
| **Pemisahan Beban (Decoupled)** | AI Pipeline dan Ingest data dijalankan asinkron dari API Gateway | Waktu respon API tetap instan (< 100 ms) bagi pengguna publik |
| **Kepatuhan Privasi (PDP Compliance)** | Vault NIK terenkripsi AES-256 + EXIF stripping pada foto | Kepatuhan terhadap UU PDP dan perlindungan identitas warga pelapor |
| **Berdasar Bukti Empiris (Data-Driven)** | Arsitektur ML divalidasi lewat Ablation Study (81 run klastering + 4 varian severity) | Tidak memakai model berat tanpa justifikasi; efisien sumber daya komputasi |
| **Keseimbangan Penilaian** | Gabungan data formal (Dapodik) dan partisipatif (Laporan Warga & Vote) | Mencegah manipulasi peringkat sekaligus memvalidasi ketidaksesuaian (*mismatch*) |
