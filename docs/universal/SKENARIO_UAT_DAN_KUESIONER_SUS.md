# DOKUMEN USER ACCEPTANCE TESTING (UAT) RESMI
> **Sistem Informasi Manajemen Kerusakan Sarana Prasarana Sekolah (SIMAKIS)**  
> **Dinas Pendidikan Kabupaten Lamongan**  
> **Target Penguji (Acceptance Authority):** Pejabat Pengelola Pengaduan (Verifikator Teknis) & Pejabat Pembina (Kepala Dinas Pendidikan).  
> **Dasar Regulasi & Dokumen Acuan:** `PRD.md` (§8, §11), Permendagri No. 8/2023, SP4N-LAPOR!, `DECISIONS.md` (D-28, D-30, D-32), dan `KONTRAK_REFACTOR_FRONTEND.md`.

---

## 1. LEMBAR PENGESAHAN PENERIMAAN SISTEM (ACCEPTANCE SIGN-OFF)

Pengujian User Acceptance Testing (UAT) ini bertujuan untuk memverifikasi apakah sistem SIMAKIS telah memenuhi seluruh kriteria kelayakan operasional kedinasan, integritas tata kelola SP4N-LAPOR!, dan kesiapan deployment sebelum diserahterimakan kepada Dinas Pendidikan Kabupaten Lamongan.

| Parameter Evaluasi | Rincian Pengujian |
|---|---|
| **Instansi Penguji** | Dinas Pendidikan Kabupaten Lamongan |
| **Aktor Penguji 1** | Pejabat Pengelola Pengaduan / Verifikator Lapangan Sarpras |
| **Aktor Penguji 2** | Kepala Dinas Pendidikan (Pejabat Pembina / Pengarah) |
| **Objek Uji** | Portal Dinas SIMAKIS (`/dinas/*`) & Siklus Tata Kelola Pengaduan Sekolah |
| **Kriteria Kelulusan** | 100% Skenario Kritikal Berstatus **DITERIMA (ACCEPT)** tanpa temuan *Blocker* |

---

## 2. MATRIKS SKENARIO UAT FORMAL KEDINASAN

### Skenario UAT-01: Verifikasi Teknis Klaster Isu Hasil AI & Validasi Lapangan (D-30)
* **ID Skenario:** `UAT-DINAS-01`
* **Target Aktor:** Verifikator Teknis Dinas (`verifikator_dinas`)
* **Dasar Hukum / Bisnis:** Permendagri No. 8/2023 (Wewenang verifikasi teknis/lapangan berada pada Pejabat Pengelola Pengaduan).
* **Kriteria Penerimaan (Acceptance Criteria):**
  1. Verifikator dapat meninjau antrean klaster isu sarpras hasil pengelompokan *Adaptive Cosine Fallback* (D-31) di `/dinas/antrian`.
  2. Sistem menyajikan data pendukung lengkap: skor prioritas KBM ($P_k$), konsensus anggota klaster (Cosine Distance $\le 0.88$), daftar laporan warga anggota, dan komparasi foto fisik *Before & After*.
  3. Tombol **"✓ Sahkan Klaster"** berhasil mengeksekusi `PUT /klaster/{id}/verifikasi?status=terverifikasi` dan memindahkan klaster ke antrean pengerjaan fisik.
  4. Tombol **"✕ Tolak Klaster"** mewajibkan pengisian alasan dinas (validasi `REASON_REQUIRED` 422).
* **Hasil Pengujian:** `[ ] DITERIMA (ACCEPT)    [ ] DITOLAK (REJECT)`
* **Catatan Verifikator:** __________________________________________________

---

### Skenario UAT-02: Tata Kelola Laporan Noise / Anomali Menjadi Aduan Mandiri (D-30 & D-29)
* **ID Skenario:** `UAT-DINAS-02`
* **Target Aktor:** Verifikator Teknis Dinas (`verifikator_dinas`)
* **Dasar Hukum / Bisnis:** Penjaminan hak aduan warga agar laporan non-klaster ($n < 2$ atau teks unik) tidak terbuang dari sistem pengawasan dinas.
* **Kriteria Penerimaan (Acceptance Criteria):**
  1. Verifikator dapat memeriksa laporan terisolasi pada Tab **Aduan Mandiri / Perlu Review** (`GET /laporan/perlu-review`).
  2. Verifikator dapat memvalidasi laporan tersebut menjadi aduan mandiri sah via `PUT /laporan/{id}/status` (`status: "divalidasi"`).
  3. Sistem **TIDAK membuat klaster fiktif/semu** ($n=1$), menjaga integritas formula skor prioritas $P_k$.
  4. Laporan yang divalidasi otomatis muncul di transparansi publik `/laporan/publik` dengan proteksi identitas NIK (D-29).
* **Hasil Pengujian:** `[ ] DITERIMA (ACCEPT)    [ ] DITOLAK (REJECT)`
* **Catatan Verifikator:** __________________________________________________

---

### Skenario UAT-03: Manajemen Progres Fisik Sarpras Dua Jalur (Dual-Track D-32 / DBG-027)
* **ID Skenario:** `UAT-DINAS-03`
* **Target Aktor:** Verifikator Teknis Dinas & Kepala Dinas
* **Dasar Hukum / Bisnis:** Pengawasan bertahap progres fisik renovasi gedung sekolah di lapangan sesuai SOP Penanganan Sarpras.
* **Kriteria Penerimaan (Acceptance Criteria):**
  1. Halaman `/dinas/status` menyajikan pemisahan tegas antara **Track 1 (Klaster Isu Kelompok)** dan **Track 2 (Aduan Mandiri Tervalidasi)**.
  2. Petugas dinas dapat memperbarui status bertahap: *Dalam Antrean Prioritas* $\rightarrow$ *Dalam Pengerjaan Fisik* (`dalam_proses`) $\rightarrow$ *Tuntas/Selesai* (`selesai`).
  3. Pembaruan status aduan mandiri tercatat secara append-only di tabel `laporan_status_log` via `POST /laporan/{id}/tindak-lanjut` tanpa merusak tabel `status_log` klaster.
  4. Status "Tidak Dapat Ditindaklanjuti" wajib menyertakan alasan formal penolakan anggaran.
* **Hasil Pengujian:** `[ ] DITERIMA (ACCEPT)    [ ] DITOLAK (REJECT)`
* **Catatan Verifikator:** __________________________________________________

---

### Skenario UAT-04: Pengawasan Eksekutif Kepala Dinas & Immutability Audit Trail (D-30)
* **ID Skenario:** `UAT-DINAS-04`
* **Target Aktor:** Kepala Dinas Pendidikan (`kepala_dinas`)
* **Dasar Hukum / Bisnis:** Fungsi Pejabat Pembina/Pengarah untuk pengawasan kebijakan, monitoring sebaran geografis, dan akuntabilitas publik.
* **Kriteria Penerimaan (Acceptance Criteria):**
  1. Kepala Dinas dapat memantau indikator agregat di `/dinas/dashboard` (Total Laporan, Klaster AI Aktif, Titik Kritis GIS 62 Sekolah).
  2. Kepala Dinas dapat memantau antrean review di `/dinas/antrian` dalam mode **Read-Only / Pengawasan** (sistem menolak eksekusi `PUT /laporan/{id}/status` oleh akun Kadis dengan status 403 Forbidden demi pemisahan kewenangan teknis).
  3. Seluruh riwayat penanganan sarpras bersifat permanen (*immutable / append-only*) dan tidak dapat dimanipulasi atau dihapus dari UI.
* **Hasil Pengujian:** `[ ] DITERIMA (ACCEPT)    [ ] DITOLAK (REJECT)`
* **Catatan Kepala Dinas:** __________________________________________________

---

### Skenario UAT-05: Kepatuhan Keamanan & Audit Dekripsi Data Pribadi (UU PDP No. 27/2022)
* **ID Skenario:** `UAT-DINAS-05`
* **Target Aktor:** Administrator Sistem & Kepala Dinas
* **Dasar Hukum / Bisnis:** Kepatuhan terhadap UU Perlindungan Data Pribadi No. 27/2022 atas pengelolaan data sensitif masyarakat.
* **Kriteria Penerimaan (Acceptance Criteria):**
  1. Data NIK warga tersimpan terpisah di dalam `pdp_vault` terenkripsi algoritma AES-256-GCM.
  2. Setiap kali petugas dinas membuka/mendekripsi data NIK pelapor untuk verifikasi lapangan, sistem otomatis mencatat log mutlak ke `audit_log` (`GET /audit/pdp-logs`).
  3. Jejak audit mencakup: ID Pegawai yang mengakses, ID Laporan yang dibuka, timestamp presisi, dan alasan keperluan dinas.
* **Hasil Pengujian:** `[ ] DITERIMA (ACCEPT)    [ ] DITOLAK (REJECT)`
* **Catatan Kepala Dinas / Admin:** _________________________________________

---

## 3. BERITA ACARA HASIL UJI TERIMA (ACCEPTANCE SUMMARY)

| No | Modul / Skenario Uji | Status Penerimaan | Catatan / Rekomendasi Dinas |
|:---:|---|:---:|---|
| 1 | Verifikasi Teknis Klaster AI (D-30) | `ACCEPT / REJECT` | |
| 2 | Alur Aduan Mandiri Non-Klaster (D-30/D-29) | `ACCEPT / REJECT` | |
| 3 | Tindak Lanjut Fisik Dual-Track (D-32) | `ACCEPT / REJECT` | |
| 4 | Pengawasan Eksekutif Kepala Dinas | `ACCEPT / REJECT` | |
| 5 | Kepatuhan UU PDP Vault & Audit Trail | `ACCEPT / REJECT` | |

**Keputusan Akhir UAT:**  
`[ ] SISTEM DITERIMA PENUH (GO-LIVE)`  
`[ ] DITERIMA DENGAN CATATAN MINOR (NON-BLOCKER)`  
`[ ] DITOLAK / PERLU PERBAIKAN STRUKTURAL`

Lamongan, ___________________ 2026

**Menyetujui,**  
**Kepala Dinas Pendidikan Kab. Lamongan**



*( _____________________________________ )*  
NIP. ....................................................

Kuesioner ini mengacu pada standar baku **John Brooke (1986)** yang disyaratkan pada **PRD SIMAKIS §8 & §11** dengan target skor akhir **SUS > 70 (Kategori "Good / Acceptable")**.

### Petunjuk Pengisian untuk Responden:
Berikan penilaian Anda terhadap sistem SIMAKIS secara jujur berdasarkan pengalaman setelah menyelesaikan skenario pengetasan di atas. Pilih angka **1 sampai 5**:
* **1** = Sangat Tidak Setuju (STS)
* **2** = Tidak Setuju (TS)
* **3** = Ragu-Ragu / Netral (N)
* **4** = Setuju (S)
* **5** = Sangat Setuju (SS)

---

### Tabel Butir Pertanyaan SUS (10 Butir Baku):

| No | Pernyataan Instrumen Evaluasi | STS (1) | TS (2) | N (3) | S (4) | SS (5) |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **Q1** | Saya berpikir akan sering menggunakan sistem SIMAKIS ini untuk pemantauan/pelaporan sarpras sekolah. | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q2** | Saya merasa sistem SIMAKIS ini terlalu rumit untuk digunakan. *(Reverse)* | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q3** | Saya merasa antarmuka sistem SIMAKIS mudah untuk digunakan. | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q4** | Saya merasa membutuhkan bantuan teknis dari orang lain untuk dapat menggunakan sistem ini. *(Reverse)* | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q5** | Saya merasa fungsi dan fitur-fitur di dalam sistem ini terintegrasi dengan sangat baik. | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q6** | Saya merasa ada terlalu banyak hal yang tidak konsisten pada sistem ini. *(Reverse)* | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q7** | Saya membayangkan kebanyakan orang akan dapat mempelajari sistem ini dengan sangat cepat. | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q8** | Saya merasa sistem ini sangat membingungkan saat digunakan. *(Reverse)* | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q9** | Saya merasa sangat percaya diri saat menggunakan sistem ini. | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Q10** | Saya harus belajar banyak hal terlebih dahulu sebelum saya dapat mengoperasikan sistem ini. *(Reverse)* | [ ] | [ ] | [ ] | [ ] | [ ] |

---

### Rumus Kalkulasi Skor Akhir SUS (Standar PRD §8):
Untuk menghitung skor akhir (Skala 0 – 100):
1. **Pertanyaan Bernomor Ganjil (Q1, Q3, Q5, Q7, Q9):**  
   $$\text{Skor Kontribusi} = \text{Pilihan Nilai} - 1$$
2. **Pertanyaan Bernomor Genap (Q2, Q4, Q6, Q8, Q10):**  
   $$\text{Skor Kontribusi} = 5 - \text{Pilihan Nilai}$$
3. **Skor Total SUS:**  
   $$\text{Skor Akhir SUS} = (\sum \text{Skor Kontribusi Q1 s.d Q10}) \times 2.5$$
4. **Target Kelulusan Evaluasi PRD:** $\text{Skor Akhir} > 70.0$ (Grade B / Kategori "Good").

---

# BAGIAN III: KUESIONER KUALITATIF & TRANSPARANSI DATA (PELENGKAP)

Selain 10 butir SUS kuantitatif, responden diberikan 3 pertanyaan terbuka untuk mendukung bab evaluasi dokumen skripsi/jurnal:

1. **Tingkat Kepercayaan Privasi (UU PDP):**  
   *"Apakah adanya jaminan pembersihan metadata GPS pada foto dan perlindungan NIK membuat Anda merasa aman saat menyampaikan laporan kerusakan sekolah?"*  
   `[ ] Sangat Aman   [ ] Cukup Aman   [ ] Kurang Aman`  
   *Catatan Tambahan:* __________________________________________________

2. **Kejelasan Pengelompokan Isu (AI Clustering):**  
   *(Khusus Dinas)*: *"Bagaimana penilaian Anda terhadap ketepatan AI dalam menyatukan laporan-laporan sejenis menjadi 1 klaster isu sarpras?"*  
   `[ ] Sangat Akurat   [ ] Cukup Akurat   [ ] Kurang Akurat`  
   *Catatan Tambahan:* __________________________________________________

3. **Umpan Balik Perbaikan Antarmuka:**  
   *"Bagian antarmuka atau tombol mana yang menurut Anda masih membingungkan dan perlu diperbaiki?"*  
   *Jawaban:* ____________________________________________________________
