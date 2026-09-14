# ARCHITECTURE.md — SIMAKIS

> Diturunkan langsung dari diagram arsitektur resmi tim. Dokumen ini
> menjelaskan komponen, batas tanggung jawab, dan alur data — bukan
> mendesain ulang. Kontrak data pasti (request/response schema) ada di
> `INTERFACES.md`, bukan di sini.

---

## 1. Gambaran Umum

Sistem terdiri dari 3 blok utama:

1. **User Client** — SPA React dengan pola **MVC**, dua persona View
   (Publik/Warga dan Pemerintah) berbagi Model yang sama.
2. **Backend Services (Python 3)** — FastAPI sebagai API Gateway & Core
   Logic, MySQL sebagai database utama (dengan vault terenkripsi khusus
   data pribadi), dan Modul AI Pipeline yang berjalan async.
3. **External Data** — Dapodik Kemendikdasmen (sumber data resmi) dan
   MinIO/S3 (object storage untuk media terenkripsi).

Komunikasi Client ↔ Backend: **HTTPS (REST API), otorisasi via Bearer JWT.**

---

## 2. Client Architecture (Pola MVC)

### View — Publik/Warga

| Bagian | Isi |
|---|---|
| **Input** | Credentials (login), Deskripsi teks (isi laporan), Foto bukti (lampiran), Voting Isu |
| **Output** | Matriks 2D HeatMap Sarana, Peta Wilayah, User Profile & History, Pelacak Progres Laporan |

### View — Pemerintah

| Bagian | Isi |
|---|---|
| **Input** | Ingest CSV Dapodik, Validasi Isu, Ubah Status/Tracing Isu, Log Audit |
| **Output** | Dashboard Eksekutif, Tabel Verifikasi Mismatch, GeoJSON Peta Mismatch, Laporan Skor Dampak (KBM) |

### Model — Process (dipakai bersama kedua View)

- **React Router & RBAC Guard** — proteksi route berbasis role di sisi
  client, sinkron dengan RBAC di backend (bukan pengganti, cuma UX gate).
- **Client State & Cache** — state management + caching data yang sering
  diakses (mengurangi round-trip API berulang).
- **ECharts** — layer rendering visualisasi data (dipetakan lebih detail
  ke komponen chart spesifik di `frontend/UI_COMPONENTS.md`).

---

## 3. Backend Architecture (Python 3)

### 3.1 FastAPI — API Gateway & Core Logic

- **Gateway Core** — routing, validasi request, orkestrasi antar service
  internal (DB, AI Pipeline, storage eksternal).
- **RBAC (Role Based Access Control)** — enforcement hak akses per role
  (Warga Umum, Warga Terverifikasi, Komite Sekolah, Verifikator Dinas,
  Kepala Dinas, Admin Sistem — lihat `PRD.md` §2.3) di level endpoint.

### 3.2 MySQL Database

- **MySQL_DB** — tabel operasional utama: users, roles, sekolah, laporan,
  klaster, vote, log status accountability (lihat `PRD.md` §6.2).
- **PDP Vault** — sub-penyimpanan terpisah, **terenkripsi AES-256**,
  khusus untuk data pribadi sensitif (NIK). Akses ke vault ini melalui
  jalur **"Pengecekan PDP & Enkripsi"** dari FastAPI sebelum data personal
  disimpan atau dibaca — tidak pernah diakses langsung tanpa lewat lapisan
  ini.

### 3.3 Modul AI Pipeline (async, terpisah dari request-response utama)

Alur pipeline berurutan:

```
IndoBERT Embedding → UMAP → HDBSCAN Clustering → TF-IDF Labelling → Formula Urgensi KBM → Skor Prioritas
```

| Tahap | Fungsi |
|---|---|
| IndoBERT Embedding | Mengubah teks laporan jadi vektor embedding (Bahasa Indonesia) |
| **UMAP** | Reduksi dimensi embedding sebelum clustering — *step baru, belum ada di versi PRD sebelumnya, catat alasannya di `DECISIONS.md`* |
| HDBSCAN Clustering | Pengelompokan laporan tanpa perlu jumlah klaster ditentukan di awal, mendukung outlier |
| TF-IDF Labelling | Pemberian label/kata kunci klaster (bukan generative AI/RAG) |
| Formula Urgensi KBM | Lapisan skoring dampak KBM — **terpisah setelah klaster terbentuk**, bukan input ke HDBSCAN (sudah dikonfirmasi ke dosen) |
| Skor Prioritas | Output akhir: skor keparahan (Dapodik) + jumlah suara (lihat `PRD.md` §4) |

**Integrasi dengan FastAPI/MySQL:**
- **Async Task Queue** — job clustering dijalankan async, tidak blocking
  request API utama.
- **Read Raw Teks & Clusters** — AI Pipeline membaca data mentah dari
  MySQL.
- **Write Clustered Groups** — hasil klaster ditulis kembali ke MySQL.

---

## 4. External Data & Integrasi

### 4.1 Dapodik Kemendikdasmen

- **Bukan** integrasi API otomatis (konsisten dengan `PRD.md` §7 — item
  ini eksplisit out-of-scope).
- Jalur masuk data: Pemerintah melakukan **"Ingest CSV Dapodik"** secara
  manual lewat View Pemerintah → diproses lewat **Pandas Batch Ingestion**
  → masuk ke backend/MySQL.
- *(Asumsi berdasarkan pembacaan diagram — tolong konfirmasi kalau ada
  jalur otomatis lain yang dimaksud dari box "External Data".)*

### 4.2 MinIO/S3 — Encrypted Media Storage

- Menyimpan **foto bukti** laporan warga (lampiran opsional di FEAT-003).
- Akses via **S3 API**.
- Alur: backend melakukan **"Striping Metadata & Upload"** — metadata
  file dipisah dari isi sebelum upload, isi media disimpan terenkripsi di
  MinIO/S3.

---

## 5. Alur Data — Ringkasan per Skenario

### 5.1 Warga mengirim laporan (dengan foto)

1. Client (View Publik Warga) kirim `POST` laporan via HTTPS + Bearer JWT.
2. FastAPI Gateway validasi & routing → simpan data laporan ke MySQL.
3. Jika ada foto bukti → upload ke MinIO/S3 lewat S3 API, metadata
   disimpan terpisah di MySQL.
4. Laporan mentah masuk antrian AI Pipeline (async) untuk clustering.

### 5.2 Ingest data Dapodik oleh Pemerintah

1. Petugas upload CSV lewat View Pemerintah ("Ingest CSV Dapodik").
2. Backend proses via **Pandas Batch Ingestion**.
3. Data personal (jika ada, mis. NIK) dicek & dienkripsi (AES-256) sebelum
   masuk **PDP Vault**; data non-personal masuk tabel MySQL biasa.
4. Hasil ingestion dipakai untuk cross-check (mismatch) terhadap laporan
   warga → ditampilkan di **Tabel Verifikasi Mismatch** & **GeoJSON Peta
   Mismatch**.

### 5.3 Klasterisasi & prioritas

1. AI Pipeline baca teks mentah dari MySQL (async, via task queue).
2. Jalankan IndoBERT → UMAP → HDBSCAN → TF-IDF → Formula Urgensi KBM →
   Skor Prioritas.
3. Tulis hasil klaster & skor kembali ke MySQL.
4. Verifikator Dinas meninjau lewat View Pemerintah sebelum klaster
   tampil resmi ke publik (lihat `FLOWS.md` §2, `PAGE_STATES.md` §B1).

---

## 6. Keamanan

- **Autentikasi**: Bearer JWT di setiap request REST API.
- **Otorisasi**: RBAC di level FastAPI Gateway, dicerminkan sebagai route
  guard di client (bukan satu-satunya lapisan proteksi).
- **Data pribadi (NIK)**: wajib lewat PDP Vault, terenkripsi AES-256,
  tidak pernah disimpan plaintext di tabel MySQL biasa.
- **Media**: disimpan di MinIO/S3 terenkripsi, bukan di server aplikasi
  langsung.

---

## 7. Catatan Terbuka (perlu konfirmasi/tindak lanjut)

- **UMAP** ditambahkan ke pipeline AI — belum ada entry alasannya di
  `DECISIONS.md`, perlu ditambahkan (mis. kenapa reduksi dimensi
  diperlukan sebelum HDBSCAN pada embedding IndoBERT).
- Arah panah antara **External Data** dan **Backend** untuk item Dapodik
  vs MinIO belum 100% jelas dari diagram (S3 API tampak menyatukan
  keduanya) — perlu konfirmasi apakah Dapodik benar-benar hanya lewat
  CSV manual atau ada komponen lain yang terhubung otomatis.
- Konsisten dengan `UI_COMPONENTS.md`: komponen **"Blockchain/Ledger
  Integrity"** dan **"Integrity Hash Audit"** di mockup Figma **tidak
  muncul** di diagram arsitektur resmi ini — memperkuat dugaan itu
  artefak AI generator, bukan bagian arsitektur sesungguhnya.
