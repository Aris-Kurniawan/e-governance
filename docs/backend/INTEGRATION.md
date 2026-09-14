# INTEGRATION.md — SIMAKIS Backend

> Detail integrasi ke sumber eksternal: Dapodik (data resmi) dan MinIO/S3
> (media). Untuk kontrak endpoint internal API, lihat `INTERFACES.md` —
> dokumen ini soal bagaimana data dari luar sistem masuk, bukan bentuk
> API SIMAKIS sendiri.

---

## 1. Integrasi Dapodik

### 1.1 Kenapa Bukan API Otomatis

Dapodik/Referensi Data Kemendikdasmen **tidak menyediakan unduhan massal
per sekolah** — hanya PDF profil per sekolah atau agregat provinsi
(`PRD.md` §6.1, §7). Integrasi API otomatis ke Dapodik/Kemendikdasmen
eksplisit **out-of-scope** (`PRD.md` §7). Karena itu jalur masuk data
adalah semi-manual: scraping/parsing → CSV → ingest manual oleh Pemerintah.

### 1.2 Alur Pengambilan Data

```
Scraping (Playwright) → Parsing PDF profil sekolah → Struktur data (CSV) →
Upload manual oleh Pemerintah ("Ingest CSV Dapodik") →
Pandas Batch Ingestion → sekolah / sekolah_data_resmi / kondisi_sarana (MySQL)
```

**Lokasi kode:** `app/dataset/scraping/`, `app/dataset/parsing/`,
`app/dataset/ingestion/` (`GIT_WORKFLOW.md` §2).

> **Status:** struktur ini masih berdasarkan catatan sebelumnya, **belum**
> dicocokkan dengan kode scraping asli yang kamu punya. Begitu file itu
> dibagikan, bagian §1.2–§1.4 di dokumen ini perlu direvisi supaya sesuai
> nama fungsi/parameter yang benar-benar dipakai — jangan anggap detail
> di bawah final.

### 1.3 Scraping (Playwright)

- Target: halaman profil sekolah per NPSN di portal Dapodik.
- Karena data hanya tersedia sebagai PDF per sekolah, scraping kemungkinan
  hanya **mengambil/mengunduh file PDF**, bukan scraping HTML biasa —
  parsing sesungguhnya terjadi di tahap berikutnya (§1.4).
- Cakupan dibatasi ke sekolah-sekolah di Kecamatan Lamongan (`PRD.md`
  §7) — daftar NPSN target perlu sumber tetap (mis. file daftar NPSN awal),
  belum didokumentasikan dari mana daftar ini berasal.

### 1.4 Parsing PDF

Field yang perlu diekstrak dari tiap PDF (sesuai `DATABASE_SCHEMA.md`
§3–§5):
- Rasio guru:siswa
- Kondisi sarana per ruang (Baik / Rusak Ringan / Rusak Sedang / Rusak
  Berat)
- Indikator Kualitas Data (IKD)
- Tanggal pembaruan data

### 1.5 Ingestion (Pandas Batch Ingestion)

- Petugas Pemerintah upload CSV hasil parsing lewat
  `POST /ingest/dapodik` (`INTERFACES.md` §8).
- Diproses **async** — job dicatat di tabel `ingest_job`
  (`DATABASE_SCHEMA.md` §11), status bisa dicek lewat
  `GET /ingest/riwayat`.
- Validasi per baris: NPSN harus valid & terdaftar; baris gagal dicatat
  di `ingest_job.baris_gagal`, **tidak** membatalkan seluruh batch (baris
  valid lain tetap masuk).

### 1.6 Cross-Check dengan Laporan Warga

Data resmi hasil ingest inilah yang dipakai untuk cross-check kategori
`infrastruktur_sarana` dan `ketersediaan_tenaga_pengajar` di
`POST /laporan` (`INTERFACES.md` §4, `PRD.md` §3.1). Hasil mismatch antara
laporan warga dan data resmi ditampilkan di **Tabel Verifikasi Mismatch**
dan **GeoJSON Peta Mismatch** (`ARCHITECTURE.md` §5.2).

---

## 2. Integrasi MinIO / S3

### 2.1 Fungsi

Menyimpan **foto bukti** laporan warga (`INTERFACES.md` §10) secara
terenkripsi — bukan disimpan di server aplikasi langsung
(`ARCHITECTURE.md` §4.2, §6).

### 2.2 Konfigurasi

Lihat `backend/SETUP.md` §4 & §6 untuk environment variable dan setup
lokal (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`,
`MINIO_BUCKET`).

### 2.3 Alur Upload

```
Client kirim foto (multipart) → FastAPI terima →
"Striping Metadata & Upload": metadata (nama file, ukuran, tipe)
disimpan terpisah di MySQL (tabel laporan_foto) →
isi file diupload ke MinIO/S3 via S3 API (boto3) →
response ke client cuma berisi foto_id + url referensi, bukan data biner
```

### 2.4 Yang Belum Diputuskan

- Batas ukuran/format foto yang diterima (`INTERFACES.md` §11) — belum
  ada angka resmi.
- Apakah `url` yang dikembalikan ke client berupa presigned URL
  sementara atau URL publik permanen — perlu diputuskan berdasarkan
  kebutuhan privasi foto bukti (bisa jadi berisi info sensitif lokasi).
- Retensi/lifecycle file di MinIO/S3 (apakah foto disimpan selamanya atau
  ada batas waktu) belum dibahas.

---

## 3. Ringkasan Ketergantungan Eksternal

| Integrasi | Otomatis? | Async? | Wajib Online Saat Runtime? |
|---|---|---|---|
| Dapodik (scraping+parsing) | Tidak (semi-manual) | Ya (job scraping terpisah dari runtime API) | Tidak — hasil sudah berupa data di MySQL |
| Ingest CSV → MySQL | Manual trigger, proses otomatis | Ya | Tidak, hanya saat proses ingest jalan |
| MinIO/S3 (foto) | Ya, tiap upload laporan | Tidak (sinkron per-request) | **Ya** — kalau MinIO down, upload foto gagal (laporan teks tetap bisa terkirim tanpa foto, perlu dipastikan tidak saling blocking) |
