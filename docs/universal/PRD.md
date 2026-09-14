# PRD.md — SIMAKIS (Sistem Informasi Masukan dan Klasterisasi Isu Sekolah)

> **Status:** Final v1 — dasar fundamental pengembangan. Semua dokumen lain
> di `universal/`, `frontend/`, dan `backend/` merujuk balik ke sini.
> Perubahan requirement harus tercatat sebagai keputusan resmi di
> `DECISIONS.md`, bukan diedit diam-diam di sini.

**Disusun oleh:** Aris Kurniawan (NIM 3125521004) & Dimas Prayoga (NIM 3125521003)
**Dosen Pengajar:** Amma Liesvarastranta Haz, S.Tr.T., M.T.
**Program Studi:** D3 Teknik Informatika, PSDKU Lamongan — Politeknik Elektronika Negeri Surabaya (PENS)
**Tahun:** 2026

---

## 1. Ringkasan Produk

SIMAKIS adalah aplikasi web yang mendukung partisipasi masyarakat dalam
menyampaikan permasalahan pendidikan di wilayah Kecamatan Lamongan,
Kabupaten Lamongan. Sistem mengintegrasikan data kondisi sekolah resmi,
laporan warga, pengelompokan isu otomatis berbasis AI/NLP, mekanisme voting
prioritas, dan pemantauan tindak lanjut publik dalam satu platform.

---

## 2. Latar Belakang, Tujuan & Target Pengguna

### 2.1 Latar Belakang

Platform data pendidikan resmi (Dapodik, Portal Data Kemendikdasmen)
menyediakan informasi tapi tidak membuka ruang masukan warga secara
langsung. Sebaliknya, platform partisipasi publik (Decidim, CitizenOS)
tidak terhubung ke data pendidikan resmi. Volume laporan warga yang besar
juga sulit dipetakan polanya secara manual. SIMAKIS menjembatani ketiganya:
data resmi + partisipasi warga + AI/NLP untuk klasterisasi + pemantauan
status tindak lanjut.

### 2.2 Tujuan

1. Menyediakan sarana partisipasi masyarakat untuk menyampaikan masukan
   pendidikan secara terstruktur.
2. Mengintegrasikan data pendidikan resmi dengan laporan masyarakat untuk
   gambaran permasalahan yang lebih objektif.
3. Mengidentifikasi dan menentukan prioritas permasalahan melalui
   klasterisasi laporan berbasis AI/NLP, didukung partisipasi warga.
4. Meningkatkan transparansi dan mendukung pengambilan keputusan berbasis
   data melalui status tindak lanjut yang terbuka ke publik.

### 2.3 Target Pengguna

| Role | Deskripsi | Kebutuhan Utama |
|---|---|---|
| Warga Umum | Masyarakat belum terverifikasi | Melihat data & laporan publik secara transparan |
| Warga Terverifikasi | Orang tua/masyarakat dengan akun tervalidasi (mis. via NIK/KK) | Melaporkan isu pendidikan, memberi suara pada prioritas isu |
| Komite Sekolah / Perwakilan Orang Tua | Perwakilan resmi tingkat sekolah | Melaporkan atas nama institusi, akses detail tambahan sekolah terkait |
| Verifikator Dinas | Staf operasional Dinas Pendidikan | Meninjau & memvalidasi klaster isu, memperbarui status tahap awal |
| Kepala Dinas / Pengambil Keputusan | Pejabat pengambil kebijakan | Melihat hasil voting prioritas, override prioritas, memperbarui status tindak lanjut, ekspor laporan |
| Admin Sistem | Tim pengembang/pengelola teknis | Mengelola akun pengguna dan integrasi sumber data |

**Catatan penting (keputusan resmi):** akses membaca data publik (direktori
sekolah, status isu, hasil prioritas) **tidak difilter berdasarkan
domisili** — pengguna dari luar Kecamatan Lamongan tetap bisa melihat dan
memberi vote, karena stakeholder legitimate (mis. orang tua yang anaknya
sekolah di kecamatan lain) tidak boleh didiskriminasi berdasarkan alamat.
Keterkaitan dengan sekolah bersifat **opsional dan self-declared**, bukan
prasyarat.

---

## 3. Fitur Utama & Requirement

| Kode | Nama Fitur | Deskripsi | Requirement Utama | Role Terkait |
|---|---|---|---|---|
| FEAT-001 | Direktori & Profil Sekolah | Informasi dan pencarian data sekolah | Pencarian nama/alamat; data siswa, rasio guru, kondisi sarana; sumber & tanggal pembaruan data; penanda potensi masalah | Warga Umum, Warga Terverifikasi |
| FEAT-002 | Dashboard Wilayah | Ringkasan kondisi pendidikan satu wilayah | Jumlah sekolah & klaster aktif; daftar klaster prioritas; sekolah dengan isu terbanyak | Verifikator Dinas, Kepala Dinas |
| FEAT-003 | Pelaporan Isu | Warga melaporkan masalah pada sekolah tertentu | Laporan terhubung ke sekolah; kategori masalah; lampiran foto opsional; riwayat laporan pengguna | Warga Terverifikasi, Komite Sekolah |
| FEAT-004 | Klasterisasi Isu | Pengelompokan laporan berbasis AI/NLP | Pengelompokan otomatis; penyajian sebagai klaster; verifikasi klaster oleh Verifikator | Sistem (AI), Verifikator Dinas |
| FEAT-005 | Voting Prioritas | Dukungan warga terhadap klaster isu | Satu akun satu suara per klaster; status suara Pending/Terhitung; prioritas = keparahan + jumlah suara, bukan domisili | Warga Terverifikasi, Komite Sekolah, Kepala Dinas |
| FEAT-006 | Accountability / Status | Perkembangan tindak lanjut publik | Status Dilaporkan → Diverifikasi → Dalam Proses → Selesai; riwayat status tersimpan; alasan wajib jika tidak ditindaklanjuti | Verifikator Dinas, Kepala Dinas, Publik |

### 3.1 Kategori Laporan (FEAT-003)

Kategori dibatasi pada yang bisa di-cross-check dengan data resmi Dapodik:

- **Infrastruktur/Sarana** — dicek silang terhadap kondisi sarana per ruang di Dapodik.
- **Ketersediaan Tenaga Pengajar** — dicek silang hanya dari sisi kuantitas rasio guru:siswa, **bukan** kualitas mengajar.
- **Lainnya** — kategori terbuka, **tanpa** cross-check data resmi.

---

## 4. Mekanisme Voting & Prioritas (FEAT-005 — detail keputusan)

- **Formula prioritas** = skor keparahan (dari data Dapodik) + jumlah suara.
  Bukan murni berbasis jumlah vote, supaya isu serius dengan sedikit vote
  tidak kalah oleh isu ringan yang ramai divote.
- **Tanpa filter domisili** (lihat §2.3).
- **Anti-buzzer**: menggunakan sinyal perilaku (umur akun, rate limiting,
  deteksi lonjakan vote tidak wajar) — **bukan** verifikasi domisili.
- Vote dari akun baru berstatus **"Pending"** sampai melewati masa
  verifikasi, baru berubah jadi **"Terhitung"**.
- Klaster/isu dengan vote rendah tetap tampil sebagai **"Menunggu
  Prioritas"** — tidak pernah berstatus "Ditolak" atau dihapus.
- **Kepala Dinas memiliki wewenang override** atas urutan prioritas akhir,
  dengan **catatan alasan override wajib diisi** untuk audit trail.

---

## 5. Accountability & Status (FEAT-006 — detail keputusan)

Status yang harus didukung penuh (lihat `FLOWS.md` dan `PAGE_STATES.md`
untuk breakdown UI per kondisi):

`Menunggu Verifikasi → (Perlu Info Tambahan | Tidak Terverifikasi | Terverifikasi) → Dalam Antrian Prioritas → Dalam Proses → (Selesai | Tidak Dapat Ditindaklanjuti)`

Aturan lintas status:

1. Setiap field **"alasan"** (Tidak Terverifikasi, Tidak Dapat
   Ditindaklanjuti, Override Prioritas) **wajib diisi**, tidak boleh submit
   kosong.
2. **Tidak ada status yang menghapus data** — laporan/klaster tetap
   tersimpan dan tampil meski berstatus negatif.
3. Status **"Dalam Proses"** bisa di-update berulang kali (loop) sebelum
   mencapai status akhir — bukan form satu kali pakai.

---

## 6. Sumber Data & Teknologi

### 6.1 Sumber Data

| Kategori | Item | Detail |
|---|---|---|
| Data Resmi | Dapodik (per NPSN) | Rasio guru:siswa, kondisi sarana per ruang (Baik/Rusak Ringan/Sedang/Berat), Indikator Kualitas Data (IKD). Format PDF per sekolah, tidak ada unduhan massal — dasar pembatasan cakupan pilot ke 1 kecamatan |
| Data Partisipatif | Laporan warga | Teks bebas + kategori + lampiran foto opsional, disimpan sebagai data internal aplikasi |
| Keterbatasan | Frekuensi update | Periodik per semester, bukan real-time |
| Keterbatasan | Granularitas | Agregat per jenis fasilitas, bukan per unit ruang bernomor; lokasi ruang spesifik opsional dari warga |

Catatan tambahan: Referensi Data Kemendikdasmen hanya bisa diunduh massal
di level agregat provinsi, tidak per sekolah — sehingga ekstraksi tetap
mengandalkan PDF profil per sekolah dari Dapodik.

### 6.2 Tech Stack

| Kategori | Item | Detail |
|---|---|---|
| Frontend | Framework | React 18 (Vite + TypeScript) + Tailwind CSS + shadcn/ui |
| Frontend | Chart & Peta | Apache ECharts (`echarts-for-react`), Leaflet (`react-leaflet`) + tile OSM |
| Backend | Framework | Python (FastAPI) |
| Backend | Fungsi | REST API auth/RBAC, manajemen laporan, endpoint clustering, endpoint voting |
| Database | Sistem | MySQL/PostgreSQL |
| Database | Entitas utama | users, roles, sekolah, laporan, klaster, vote, log status accountability |
| Modul AI | Embedding teks | IndoBERT / sentence transformer multilingual (paraphrase-multilingual-MiniLM) |
| Modul AI | Algoritma clustering | HDBSCAN — tidak perlu jumlah klaster ditentukan di awal, mendukung outlier |
| Modul AI | Labeling klaster | TF-IDF sederhana (kata kunci) — **bukan** generative AI/RAG |

**Catatan klarifikasi (menjawab potensi kebingungan di DECISIONS.md):**
skor dampak KBM (Kegiatan Belajar Mengajar) adalah **lapisan skoring
terpisah setelah klaster terbentuk**, bukan fitur input ke HDBSCAN.
Clustering murni berbasis kemiripan jenis isu sesuai desain PRD ini.

---

## 7. Ruang Lingkup & Batasan

| Kategori | Deskripsi |
|---|---|
| **In-Scope** | Aplikasi web responsif untuk jenjang SD/SMP/SMA/SMK di Kec. Lamongan, Kab. Lamongan; pelaporan isu oleh warga terverifikasi tertaut ke sekolah spesifik; AI clustering NLP Bahasa Indonesia; voting warga; panel review Dinas; update status tindak lanjut |
| **Out-of-Scope** | Aplikasi mobile native (iOS/Android); jenjang/wilayah di luar SD–SMK Kecamatan Lamongan; integrasi API otomatis ke Dapodik/Kemendikdasmen (ekstraksi tetap semi-manual); notifikasi warga real-time; moderasi konten otomatis |
| **Batasan (Constraints)** | Waktu pengerjaan 14 minggu, tim 2 orang pengembang; pengambilan data semi-manual (tidak ada fitur unduhan massal); data resmi periodik per semester, bukan real-time; seluruh data operasional wajib bersumber dari sistem nasional Indonesia |

---

## 8. Success Metrics

| Area | Metrik | Target |
|---|---|---|
| Fungsionalitas | Black-box testing (input-output, jalur normal & gagal) | Seluruh skenario uji kritikal berstatus **lulus** |
| Kualitas Klasterisasi | Silhouette Score / Davies-Bouldin Index + validasi manual manusia | Skor metrik positif dan mayoritas klaster dinilai relevan oleh Verifikator |
| Usability | System Usability Scale (SUS), kuesioner 10 butir | Skor akhir **> 70** (kategori "Good") |
| Penerimaan Sistem | User Acceptance Testing (UAT) | Diterima oleh perwakilan target pengguna (Verifikator/Kepala Dinas) |

---

## 9. User Stories (ringkas per role)

- **Sebagai Warga Umum**, saya ingin melihat kondisi sekolah dan status isu
  tanpa perlu login, supaya saya bisa memantau transparansi tanpa hambatan.
- **Sebagai Warga Terverifikasi**, saya ingin melaporkan masalah pada
  sekolah tertentu dengan kategori yang jelas, supaya laporan saya bisa
  dicek silang dengan data resmi bila relevan.
- **Sebagai Warga Terverifikasi**, saya ingin memberi vote pada klaster
  isu yang saya anggap penting, supaya prioritas penanganan
  mencerminkan urgensi riil, bukan cuma keparahan data.
- **Sebagai Verifikator Dinas**, saya ingin meninjau klaster hasil AI dan
  memvalidasi/menolak/meminta info tambahan, supaya kesalahan model tidak
  langsung berdampak ke publik.
- **Sebagai Kepala Dinas**, saya ingin bisa mengoverride urutan prioritas
  sistem dengan alasan tercatat, supaya keputusan kebijakan tetap bisa
  mempertimbangkan konteks di luar data.
- **Sebagai Kepala Dinas**, saya ingin melihat riwayat status tindak
  lanjut yang tidak bisa dihapus, supaya akuntabilitas publik terjaga.
- **Sebagai Petugas pelaksana**, saya ingin memperbarui status "Dalam
  Proses" berkali-kali tanpa membuat laporan baru, supaya progres bisa
  dipantau bertahap.

---

## 10. Alur Sistem

Alur lengkap (dengan seluruh decision node) didokumentasikan dalam Mermaid
di `FLOWS.md`, dan breakdown state UI per kondisi ada di `PAGE_STATES.md`.
Ringkasan dua alur utama:

- **Alur Warga**: buka sistem → cek status verifikasi akun → pilih sekolah
  → lihat data & isu → (lihat klaster & opsional vote) **atau** (isi &
  kirim laporan) → pantau status tindak lanjut.
- **Alur Pemerintah/Petugas**: login → tinjau klaster isu → tetapkan hasil
  verifikasi (Perlu Info Tambahan / Tidak Terverifikasi / Terverifikasi) →
  pantau partisipasi warga → tinjau prioritas (pakai skor sistem atau
  override manual) → laksanakan tindak lanjut → update status hingga akhir
  (Selesai / Tidak Dapat Ditindaklanjuti).

---

## 11. Validation & Testing Method

| Metode | Cakupan | Kriteria Sukses |
|---|---|---|
| Black-box testing | Uji fungsi sistem tanpa melihat kode internal, jalur normal & gagal | Seluruh skenario kritikal lulus |
| Evaluasi klasterisasi | Silhouette Score / Davies-Bouldin Index + validasi manual manusia | Skor metrik positif, mayoritas klaster relevan |
| SUS (System Usability Scale) | Kuesioner 10 butir ke pengguna | Skor akhir > 70 |
| UAT | Uji penerimaan oleh perwakilan target pengguna | Diterima tanpa temuan blocker |

---

## 12. Timeline & Risiko

### 12.1 Timeline (14 Minggu)

1. **Persiapan** — Aris: desain DB, API & parsing Dapodik; Dimas: wireframe UI & setup frontend.
2. **Fitur Dasar** — Aris: API Direktori, Auth & Laporan; Dimas: UI Dashboard & Form Isu.
3. **Fitur Lanjutan** — Aris: AI, API Voting, RBAC & update status; Dimas: UI Klaster, Voting & Status Publik.
4. **Integrasi & Finalisasi** — Kolaborasi penuh integrasi full-stack; pengujian (black-box, SUS, UAT); perbaikan bug; finalisasi dokumentasi.

### 12.2 Risiko Pengembangan

| Kategori | Rincian Risiko & Dampak |
|---|---|
| Sumber Daya & Waktu (Manajerial) | Tim hanya 2 orang, waktu 14 minggu — rentan mengganggu fase integrasi bila ada keterlambatan |
| Ekstraksi Data (Teknis) | Dapodik tidak punya unduhan massal → parsing PDF semi-manual → cakupan dibatasi 1 kecamatan |
| Akurasi AI (Performa Model) | Model NLP berisiko membentuk klaster tidak relevan; mitigasi: Verifikator Dinas tetap meninjau sampel manual |
| Sifat Data Resmi (Operasional) | Update data resmi periodik per semester, bukan real-time → potensi kesenjangan data vs kondisi lapangan → sistem bergantung pada partisipasi warga untuk menutup gap |

---

## 13. Isu Terbuka (belum final, jangan diimplementasikan)

- Komponen **"Blockchain/Ledger Integrity"** dan **"Integrity Hash Audit"**
  muncul di mockup Figma halaman Log Audit PDP tapi **tidak punya dasar**
  di PRD ini maupun `ARCHITECTURE.md`. Kemungkinan besar artefak dari AI
  generator desain. **Jangan diimplementasikan** sampai dikonfirmasi ulang
  dan (jika memang dipakai) dicatat resmi di `DECISIONS.md`.
