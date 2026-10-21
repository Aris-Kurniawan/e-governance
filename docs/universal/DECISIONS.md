# DECISIONS.md — SIMAKIS

> Log keputusan penting beserta alasannya dan alternatif yang ditolak.
> Tujuannya supaya keputusan tidak diulang-ulang atau dibalik diam-diam
> tanpa jejak. Setiap keputusan baru yang mengubah requirement di
> `PRD.md`/`ARCHITECTURE.md` **wajib** dicatat di sini.

---

## Klasterisasi & AI

### D-01: HDBSCAN dipilih, bukan K-Means
**Keputusan:** Algoritma clustering laporan menggunakan HDBSCAN.
**Alasan:** Tidak perlu jumlah klaster ditentukan di awal, dan mendukung
outlier (laporan yang tidak masuk klaster manapun tetap valid, tidak
dipaksa masuk ke klaster terdekat seperti K-Means).
**Alternatif ditolak:** K-Means — mengharuskan jumlah klaster (`k`)
ditentukan di muka, tidak realistis untuk volume & variasi laporan warga
yang tidak diketahui sebelumnya.

### D-02: IndoBERT / sentence transformer multilingual untuk embedding
**Keputusan:** Teks laporan diubah jadi vektor pakai IndoBERT atau
`paraphrase-multilingual-MiniLM`.
**Alasan:** Perlu model yang memahami Bahasa Indonesia untuk laporan warga
berbahasa Indonesia; pipeline dibangun konsisten di atas model ini sejak
awal.
**Status:** *(catatan konsistensi)* Sempat ada rencana entry "kenapa gak
pakai IndoBERT" di draft dokumentasi awal — ini **keliru secara penamaan**,
karena pipeline dari awal sampai sekarang konsisten memakai IndoBERT. Entry
yang benar seharusnya menjelaskan kenapa IndoBERT **dipertahankan**
dibanding alternatif (mis. model multibahasa umum tanpa fine-tune Bahasa
Indonesia), bukan alasan penolakan.

### D-03: TF-IDF untuk labeling klaster, bukan generative AI/RAG
**Keputusan:** Label/kata kunci klaster dihasilkan dari TF-IDF sederhana.
**Alasan:** Cukup untuk kebutuhan label ringkas, menghindari kompleksitas
dan biaya generative AI/RAG yang tidak sepadan untuk kasus ini.

### D-04: Skor dampak KBM adalah lapisan terpisah, bukan input clustering
**Keputusan:** Formula Urgensi KBM dihitung **setelah** klaster terbentuk,
bukan sebagai fitur input ke HDBSCAN.
**Alasan:** Sudah dikonfirmasi ke dosen pengajar. Clustering tetap murni
berbasis kemiripan jenis isu sesuai desain PRD awal; skor dampak KBM adalah
lapisan penilaian tambahan di atas hasil klaster.

### D-05 *(belum lengkap — perlu input kamu)*: Penambahan UMAP ke pipeline
**Keputusan:** Diagram arsitektur terbaru menambahkan UMAP (reduksi
dimensi) antara IndoBERT Embedding dan HDBSCAN Clustering.
**Alasan:** *(belum dicatat — kenapa reduksi dimensi diperlukan sebelum
HDBSCAN? mis. performa, mengurangi curse of dimensionality pada embedding
tinggi-dimensi, dsb.)*
**Status:** Terbuka — isi alasannya begitu kamu punya, biar tidak jadi
keputusan tak berdasar seperti kasus Blockchain di D-09.

---

## Voting & Prioritas

### D-06: Skor prioritas = keparahan data + jumlah suara, bukan vote-only
**Keputusan:** Formula prioritas menggabungkan skor keparahan (dari
Dapodik) dan jumlah suara warga.
**Alasan:** Vote-only berisiko isu ringan tapi ramai mengalahkan isu serius
dengan sedikit vote (mis. karena sekolah terpencil dengan sedikit warga
aktif).

### D-07: Tidak ada filter domisili pada voting maupun akses data
**Keputusan:** Warga dari luar Kecamatan Lamongan tetap bisa melihat data
dan memberi vote.
**Alasan:** Filter domisili berpotensi diskriminatif terhadap stakeholder
legitimate di luar wilayah (mis. orang tua yang anaknya sekolah di
kecamatan lain, tapi berdomisili di luar).
**Alternatif ditolak:** Verifikasi domisili sebagai syarat vote —
ditolak karena alasan di atas.

### D-08: Anti-buzzer pakai sinyal perilaku, bukan domisili
**Keputusan:** Deteksi buzzer/vote tidak wajar menggunakan umur akun, rate
limiting, dan deteksi lonjakan vote — bukan verifikasi lokasi.
**Alasan:** Konsisten dengan D-07 — mitigasi buzzer tidak boleh memakai
mekanisme yang secara efektif jadi filter domisili terselubung.
**Turunan:** Vote dari akun baru berstatus **"Pending"** sampai melewati
masa verifikasi, baru jadi **"Terhitung"**.

### D-09: Isu bervote rendah tetap tampil sebagai "Menunggu Prioritas"
**Keputusan:** Tidak ada status "Ditolak" atau penghapusan data untuk isu
dengan vote/skor rendah.
**Alasan:** Prinsip akuntabilitas — semua laporan tetap harus bisa dilacak
publik, tidak boleh hilang begitu saja karena kurang populer.

### D-10: Kepala Dinas punya wewenang override prioritas manual
**Keputusan:** Kepala Dinas bisa mengubah urutan prioritas hasil sistem.
**Alasan:** Keputusan kebijakan kadang perlu mempertimbangkan konteks di
luar data (politis, anggaran, urgensi lapangan yang belum masuk data).
**Syarat wajib:** Setiap override harus disertai **catatan alasan** untuk
audit trail — tidak boleh override tanpa jejak.

---

## Kategori Laporan & Cross-Check Data

### D-11: Kategori laporan dibatasi yang bisa di-cross-check
**Keputusan:** Hanya "Infrastruktur/Sarana" dan "Ketersediaan Tenaga
Pengajar" (kuantitas saja, bukan kualitas mengajar) yang dicek silang
dengan data Dapodik. Kategori "Lainnya" terbuka tanpa cross-check.
**Alasan:** Data resmi (Dapodik) hanya punya granularitas untuk dua area
ini; memaksakan cross-check pada kategori lain akan menghasilkan
perbandingan yang tidak valid.

### D-12: Ekstraksi data Dapodik semi-manual, bukan integrasi API otomatis
**Keputusan:** Data Dapodik diambil dari PDF profil per sekolah dan
diunggah manual sebagai CSV oleh Pemerintah ("Ingest CSV Dapodik"),
diproses lewat Pandas Batch Ingestion.
**Alasan:** Dapodik/Referensi Data Kemendikdasmen tidak menyediakan
unduhan massal per sekolah — hanya PDF per sekolah atau agregat provinsi.
Ini juga alasan utama cakupan proyek dibatasi ke 1 kecamatan.

---

## Desain Visual (UI/UX)

### D-13: Arah desain — referensi portal resmi (Bank Mandiri, BPJS Kesehatan)
**Keputusan:** Visual final mengikuti gaya bankmandiri.co.id /
bpjs-kesehatan.go.id — clean, satu warna aksen dominan, shadow lembut
konsisten, ikon flat secukupnya, background section berselang-seling.
**Alternatif ditolak:**
- **GOV.UK / USWDS** — ditolak, dinilai terlalu polos untuk kebutuhan
  visual proyek ini.
- **"Open Design" / hasil generate model GLM** — ditolak, hasil pertama
  dinilai sebagai "AI slop" (gradient dark banner generik, badge
  berlebihan, kemiripan pola bento-grid) dan gaya "Open Design" dinilai
  terlalu playful/cluttered untuk konteks e-gov.

### D-14: Landing Page terpisah dari Dashboard Warga
**Keputusan:** Ada halaman publik (pre-login) khusus untuk
marketing/trust-building dengan hero + CTA + 3 langkah "Cara Melaporkan",
terpisah dari Dashboard Warga yang perlu login.
**Alasan:** Kebutuhan komunikasi ke publik umum (belum tentu warga
terverifikasi) berbeda dari kebutuhan warga yang sudah pakai sistem —
tidak bisa digabung satu halaman.

### D-15: Dokumentasi mengikuti struktur proyek Pandu
**Keputusan:** Struktur folder dokumentasi (`universal/`, `frontend/`,
`backend/` dengan file-file spesifik di masing-masing) mengikuti pola yang
sudah dipakai di proyek Pandu.
**Alasan:** Konsistensi lintas proyek tim, tidak perlu merancang ulang
struktur dari nol.

---

## Isu Terbuka / Belum Final

### D-16 *(belum diputuskan)*: Komponen "Blockchain/Ledger Integrity" & "Integrity Hash Audit"
**Konteks:** Muncul di mockup Figma halaman Log Audit PDP, tapi:
- Tidak ada dasarnya di `PRD.md` manapun.
- Tidak muncul di `ARCHITECTURE.md` (diagram resmi tidak menyebut
  blockchain sama sekali).
**Kesimpulan sementara:** Kemungkinan besar artefak dari AI generator
desain, bukan keputusan produk.
**Status:** **Tidak diimplementasikan** sampai dikonfirmasi ulang oleh tim
dan (jika memang mau dipakai) alasannya dicatat resmi di sini sebagai
entry baru.

### D-17 *(belum diputuskan)*: Token warna "success" (hijau)
**Konteks:** `PAGE_STATES.md` butuh badge hijau untuk status "Selesai",
tapi `DESIGN_SYSTEM.md` belum punya token warna hijau resmi dari Figma.
**Status:** Terbuka — perlu ditentukan nilai hex-nya sebelum
`StatusBadge.tsx` dibangun penuh.

### D-18 *(belum diputuskan)*: Mapping warna per kategori chart
**Konteks:** `charts/theme.ts` harus pakai token dari `DESIGN_SYSTEM.md`
(`primary`/`danger`/`warning`), tapi belum ada mapping eksplisit warna per
kategori data (mis. warna tiap jenis fasilitas di `IntegrityHeatmap.tsx`).
**Status:** Terbuka.

### D-19 *(perlu konfirmasi)*: Jalur External Data untuk Dapodik vs MinIO/S3
**Konteks:** Di diagram arsitektur, garis "S3 API" tampak menghubungkan
`Backend` ke box `External Data` yang berisi **dua** item (Dapodik +
MinIO/S3), padahal S3 API secara teknis harusnya hanya relevan untuk
MinIO/S3.
**Kesimpulan sementara (lihat D-12):** Dapodik tetap masuk lewat CSV
manual, bukan S3 API.
**Status:** Perlu konfirmasi eksplisit supaya tidak salah asumsi di
`ARCHITECTURE.md`.

---

## Penyesuaian Tampilan Detail Sekolah v1

### D-20: Kartu Rasio Pendidik & Kapasitas Rombel di-hide di detail sekolah v1
**Keputusan:** Frontend **tidak menampilkan** kartu "Rasio Pendidik" dan "Kapasitas Rombel" pada halaman detail sekolah versi v1.
**Alasan:**
1. Data `jumlah_pd`, `jum_ptk`, `jum_guru`, `rombel` tidak di-ingest dari CSV Dapodik per **scope infrastruktur-only** (Fase 2, keputusan 22‑September‑2026).
2. Database tidak punya kolom untuk data tersebut.
3. API `/sekolah/{npsn}` mengembalikan nilai default `0`/`null` untuk field terkait — menampilkan angka nol akan misleading.
4. **PRD FEAT-001** menyebutkan "data siswa, rasio guru" di profil, tetapi di v1 sengaja di-deviate untuk fokus pada **audit sarana/prasarana** yang datanya valid & di‑ingest.

**Alternatif ditolak:**
- **Mengisi backend dengan data csv** → ditolak untuk v1 karena scope sudah final; opsi bisa dipertimbangkan nanti.
- **Menampilkan kartu dengan placeholder "Data tidak tersedia"** → ditolak karena akan menimbulkan pertanyaan dari user.

**Konsekuensi:**
- Detail sekolah hanya menampilkan:
  1. **Audit Sarpras**: donut chart kondisi fisik sarana + ringkasan total unit.
  2. **Profil Dapodik**: akreditasi, nama kepala sekolah, jenjang, status.
  3. **Isu & Klaster Warga**: empty state sampai Fase D (klasterisasi AI).
- **Field API** `rasio_guru_siswa`, `rasio_spm_terpenuhi`, `jumlah_pd`, `jumlah_ptk`, `jumlah_rombel`, `utilitas_kapasitas_belajar` tetap dikirim backend dengan nilai default, namun **tidak dirender** oleh FE.
- **Catatan kontrak**: Lihat `INTERFACES.md` §2 (Catatan penting untuk implementasi v1) untuk daftar field yang di‑hide serta keterangan unimplemented (`data_resmi`, `ada_sanggahan`).

**Status:** Final (2026‑09‑28).


---

### D-21: Laporan tidak ter-cluster bukan klaster — ditangani manual oleh admin/kepala dinas

**Keputusan:** Outlier HDBSCAN (`-1`) **tidak lagi** diubah menjadi record
`Klaster` ber-label `"Belum Terklasifikasi"`. Laporan yang tidak masuk klaster
manapun tetap disimpan apa adanya (tidak dihapus) dan ditangani lewat **endpoint
fallback** yang hanya bisa diakses `admin` + `kepala_dinas`, lengkap dengan aksi
verifikasi manual per laporan.

> **Menggantikan:** Keputusan #5 "Outlier HDBSCAN (-1) → Opsi A: klaster
> `belum_terklasifikasi` + review verifikator" (`docs/backend/CHANGELOG.md`
> §3.3, 23 Sep 2026) dan `TASK_GUIDE.md` F3.3 "Outlier Handling".

**Alasan:**

1. **Data menyimpang dari metodologi ablation.** `experiments/evaluation.py`
   sudah mengecualikan noise dari NMI/ARI/purity
   (`valid_mask = y_pred != -1`) dan tidak menghitungnya sebagai klaster
   (`n_clusters` mengurangi 1); noise hanya dilaporkan sebagai `noise_ratio`.
   Pipeline produksi justru memaksanya menjadi klaster, sehingga praktik
   produksi tidak lagi mencerminkan eksperimen yang jadi dasar pemilihan
   konfigurasi.
2. **Daftar klaster jadi tidak bermakna.** Audit 8 Okt 2026: **75 dari 100**
   klaster ber-kategori `belum_terklasifikasi` (57 noise + 18 label-fallback),
   mencakup **495 dari 600 laporan (82,5%)**. Hanya 25 klaster (105 laporan)
   yang benar-benar punya kategori valid.
3. **"Wadah buangan per sekolah" menyesatkan.** Karena pipeline berjalan
   per sekolah dengan `min_cluster_size=3`, setiap sekolah yang punya laporan
   yang tidak berdekatan menghasilkan satu klaster `"Belum Terklasifikasi"`.
   Klaster seperti ini bukan temuan, hanya tempat sampah.
4. **Verifikasi klaster tidak bisa dipakai untuknya.** Endpoint
   `PUT /klaster/{id}/verifikasi` bekerja di atas klaster; untuk laporan yang
   memang tidak berklaster, tindakan yang tepat adalah **penilaian manual atas
   laporan itu sendiri**, bukan memaksa klaster palsu.
5. **Labeling failure bukan noise.** 18 klaster sisanya adalah klaster
   **nyata** (3–8 laporan, saling mirip, ber-label TF-IDF) yang hanya gagal
   dipetakan ke 5 kategori oleh heuristic `labeling.py`. Menyembunyikan klaster
   ini perlu tugas terpisah (perbaikan keyword mapping), bukan ikut dibongkar di
   sini.

**Keputusan rinci:**

| Aspek | Ketentuan |
|---|---|
| Noise HDBSCAN (`-1`) | Tidak dibuatkan record `Klaster`; laporan ditandai `hasil_klasterisasi = 'noise'` dengan `klaster_id = NULL` |
| Klaster ber-kategori `belum_terklasifikasi` (label fallback) | Record & laporan **dipertahankan**, tetapi **disembunyikan** dari default `GET /klaster`; tetap dapat diakses via `?kategori=belum_terklasifikasi` eksplisit atau `GET /klaster/{id}` |
| Laporan yang perlu ditinjau | `GET /laporan/perlu-review` — `klaster_id IS NULL` **atau** `klaster.kategori = 'belum_terklasifikasi'` |
| Aksi verifikasi manual | `PUT /laporan/{laporan_id}/status` → `status_sanggahan` (`menunggu` / `divalidasi` / `ditolak`) |
| RBAC | `admin` + `kepala_dinas` saja |
| Anti-loop | Kolom `laporan.hasil_klasterisasi` (`belum_diproses` / `terklaster` / `noise`) menjadi penanda "sudah diproses"; query cron memakai penanda ini, **bukan** `klaster_id IS NULL` |
| Laporan | **Tidak pernah dihapus** oleh proses ini |

**Konsekuensi:**

- Ada endpoint baru di kontrak API (`INTERFACES.md` §2) → pembaruan ringan bagi
  FE: semua angka turunan `GET /klaster` berubah (100 → 25 klaster pada data
  dev).
- Field `kategori = belum_terklasifikasi` **tetap ada** di enum DB (dibutuhkan
  untuk klaster label-fallback yang masih tersimpan), tetapi tidak lagi
  dihasilkan oleh noise HDBSCAN.
- Setelah F4.7, cron harian 02:00 WIB hanya memproses laporan dengan
  `hasil_klasterisasi = 'belum_diproses'`.

**Status:** Disetujui (8 Okt 2026) — spesifikasi implementasi di
`docs/backend/TASK_GUIDE.md` **F4.7**.

---

### D-22: Skor dampak KBM per sekolah — formula, level, dan widget pengganti data fiktif

**Status:** Disetujui (Aris, 13 Okt 2026) — implementasi F4.8.

**Masalah:** Halaman `LaporanSkorKbm.tsx` (FE) berisi 3 array hardcoded —
skor per sekolah, "dampak per kategori fasilitas" dengan jumlah siswa fiktif,
dan tren bulanan — yang tidak punya padanan backend. Field `jumlah_pd`/
`jum_ptk` sengaja tidak di-ingest (scope infrastruktur-only, AGENTS.md),
sehingga angka "siswa terdampak" mustahil dihitung.

**Keputusan:**

| Aspek | Ketentuan |
|---|---|
| Formula | `skor_kbm = 0.7 × AVG(severity laporan warga) + 0.3 × Σ(weight × kondisi_rusak) / Σ(jumlah Dapodik)`, skala 0–100 |
| Bobot severity | Sama dengan `scoring.py` (D-07): baik=0, ringan=33, sedang=66, berat=100 |
| Level | ≥70 `kritis`, 50–69 `tinggi`, 40–49 `sedang`, <40 `rendah` |
| Endpoint | `GET /laporan/skor-kbm` (dideklarasikan **sebelum** `GET /laporan/{id}`), respons `{data: {ringkasan, sekolah}}`, `sekolah` urut `skor_kbm` DESC |
| RBAC | `admin`, `verifikator_dinas`, `kepala_dinas` (asumsi awal; Aris dapat memveto) |
| Cakupan | Semua sekolah (62), bukan hanya yang punya laporan; sekolah tanpa laporan → skor 0 |
| Kolom baru DB | **Tidak ada** — dihitung on-the-fly (600 laporan + 304 baris `kondisi_sarana`) |

**Widget FE diganti (data fiktif → data nyata):**

| Widget lama (fiktif) | Pengganti |
|---|---|
| "Siswa terdampak" (KPI) | "Ruang rusak berat (Dapodik)" = 129 |
| "Jam KBM hilang / minggu" (KPI) | "Total laporan warga" = 600 |
| Tren bulanan (AreaTrendChart + badge "+29 poin") | **Distribusi kondisi laporan**: baik 154 / ringan 147 / sedang 145 / berat 154 |
| Badge "NAIK 12%" | **Dihapus** — tidak ada data deret waktu (semua 600 laporan dev dibuat 5 Okt 2026) |
| Pilih semester (3 opsi) | Teks statis "Data per Oktober 2026" |
| Chart "Dampak per Kategori Fasilitas" (jumlah siswa fiktif) | **"Rusak Berat per Jenis Fasilitas"** — 7 nilai `nama_ruang` dari `kondisi_sarana` (ruang_kelas 77, wc_siswa 31, wc_guru 14, uks 2, perpustakaan 2, lab_ipa 2, lab_komputer 1; total 129) |
| Kolom tabel "Jam KBM Hilang" & "Siswa Terdampak" | **"LAPORAN"** (`jumlah_laporan`) & **"RUSAK BERAT"** (`laporan_rusak_berat`) |
| Klaim footer "SIMAKIS-AI v2 … jadwal aktif KBM semester" | Copy jujur: 70% severity laporan warga + 30% kondisi sarpras Dapodik |

**Konsekuensi:**

- `GET /laporan/skor-kbm` masuk kontrak `INTERFACES.md` §4.
- Skor murni on-the-fly — tanpa tabel materialisasi; perubahan laporan/Dapodik
  langsung tercerminkan tanpa migrasi.
- Tren deret waktu sengaja tidak dijanjikan; butuh keputusan terpisah bila
  kelak ada data temporal yang valid.

**Status:** Disetujui (13 Okt 2026) — implementasi F4.8.


### D-23: penanda_masalah & jumlah_isu_aktif — turunan Skor KBM dan laporan aktif

**Status:** Disetujui implisit (Aris, 14 Okt 2026 — instruksi menyelesaikan DBG-007); formula dapat ditinjau ulang.

**Masalah:** `GET /sekolah` selalu mengirim `penanda_masalah="normal"` (di luar kontrak §2) dan `jumlah_isu_aktif=0` — filter Direktori, KPI "Sekolah kritis", dan badge status FE mati; papan hijau padahal ada 129 ruang rusak berat (DBG-007).

**Keputusan:**

| Aspek | Nilai |
|---|---|
| `penanda_masalah` | diturunkan dari level Skor KBM (D-22): `kritis` (≥70) → `kritis`; `tinggi`/`sedang` (40–69) → `perlu_perhatian`; `rendah` (<40) → `aman` |
| `jumlah_isu_aktif` | jumlah laporan warga sekolah dengan `status_sanggahan != 'ditolak'` (menunggu + divalidasi = isu masih berdiri) |
| Sumber perhitungan | identik dengan `GET /laporan/skor-kbm` — on-the-fly, tanpa kolom/migrasi baru |
| Cakupan | `GET /sekolah` (list, per halaman) dan `GET /sekolah/{npsn}` (detail) |

**Konsekuensi:** nilai `"normal"` tidak lagi dikirim; distribusi live (62 sekolah): `perlu_perhatian` 39 · `aman` 22 · `kritis` 1. Update baris Scope FINAL di `AGENTS.md` memerlukan persetujuan terpisah.

### D-24: Shrinkage Skor KBM + Penanda Mismatch — `K = 5` kebijakan, estimasi ulang sebelum produksi

**Status:** ✅ Diimplementasikan (F4.12, 20 Okt 2026). Disetujui Aris, 19 Okt 2026.

**Masalah:** `skor_laporan` (D-22) adalah rata-rata biasa severity, sehingga sekolah berdata sedikit mudah bernilai ekstrem: `SD NEGERI 2 SENDANGREJO` (n=3) mendapat `skor_kbm` **76,4** (peringkat 1, `kritis`) dari `skor_laporan` 66,3, vs `SD MUHAMMADIYAH 1 LAMONGAN` (n=13) `skor_kbm` 52,0. Sampel 3 laporan diperlakukan setara 13 laporan.

**Keputusan:**

| Aspek | Ketentuan |
|---|---|
| Formula laporan | `λ = n/(n+K)`; `skor_laporan = λ × rata-rata severity + (1−λ) × prior` |
| `K` | **5** — **kebijakan** (lihat butir Dasar K), bukan hasil estimasi data |
| `prior` | **dinamis** per request: `Σ(rata-rata_sekolah × n) / Σ n`; live = 49,7 |
| `n = 0` | `skor_laporan = 0` — aturan cakupan D-22 dipertahankan (**bukan** prior) |
| Dapodik, bobot, level | tidak berubah: `0.7/0.3`; ≥70 / 50 / 40 |
| Mismatch | `skor_laporan ≥ 50 AND skor_dapodik == 0` — penanda saja, skor tidak diubah |
| Tampilan mismatch | halaman **Skor KBM** saja; tidak mengubah `penanda_masalah` |
| Sumber kebenaran | dua call site (`routers/laporan.py`, `routers/sekolah.py`) memakai **helper prior yang sama**, dihitung **global** (bukan per halaman) |

**Dasar K (ringkas; lengkap di `AI_PIPELINE_ABLATION_STUDY.md` §10.4.1):**

- Rumus adalah *credibility theory* Bühlmann: `Z = n/(n+K)`, `K = EPV/VHM`; bentuk sama dengan *Bayesian average* IMDb (`m`).
- Tafsir K: titik 50% kredibilitas · jumlah "laporan bayangan" · konservatisme.
- **`K = 5` adalah kebijakan**, analog IMDb `m = 25.000` — bukan angka hasil hitungan.
- Data dev tidak bisa memvalidasi K: `EPV = 1420,8`, `VHM = −2,5` → `K` tak terdefinisi; validasi silang menurun monoton ke "prior saja" (`K=5 → MSE 1485,3` vs `K=∞ → 1415,9`).
- Aturan baku: `VHM ≤ 0` → kredibilitas 0 (tarik penuh ke prior).

**Gate produksi (wajib):**

1. Hitung ulang `K = EPV/VHM` dari laporan riil + bandingkan dengan `K` hasil validasi silang.
2. Bila `VHM ≤ 0`, nyatakan peringkat per-sekolah tidak bermakna (skor = prior) atau dokumentasikan alasan mempertahankan kebijakan.
3. Catat hasil estimasi, tanggal, dan jumlah laporan pada dokumentasi rilis.
4. `K` disimpan sebagai parameter konfigurasi (default 5), bukan literal tersebar di kode.

**Dampak terukur (data live, 62 sekolah, 600 laporan):** 8 sekolah berpindah level; `kritis` 1 → 0; distribusi `rendah 22 · sedang 21 · tinggi 18 · kritis 1` → `22 / 22 / 18 / 0`; kepekaan K=3 → 6, K=5 → 8, K=10 → 16; 13 sekolah `skor_dapodik = 0`, **5** di antaranya mismatch setelah shrinkage (set sama dengan sebelum shrinkage: SDN KEPATIHAN, SMP MUHAMMADIYAH 2, SD MUHAMMADIYAH 1, SMAS MUHAMMADIYAH 4, SD ISLAM ZAWIYAH AL-AZHAR).

**Implementasi (F4.12, 20 Okt 2026):** `SHRINKAGE_K = 5` di `core/config.py`; `compute_prior`, `is_mismatch`, `estimate_k` di `ai_pipeline/scoring.py`; dua call site (`routers/laporan.py`, `routers/sekolah.py`) memakai prior global yang sama. Live: `prior = 49,7`, `k = 5`, `jumlah_mismatch = 5`, `estimate_k() = None` (VHM ≤ 0). 135 test lulus.

**Konsekuensi:** kontrak `INTERFACES.md` bertambah field `prior`, `k`, `mismatch`, `jumlah_mismatch`; tidak ada migrasi DB (tetap on-the-fly); `calculate_priority_score` (level klaster) tidak disentuh.

---

### D-25: Konfirmasi Severity Lapis 1 — bank pertanyaan tetap, kontrak final backend

**Status:** ✅ Backend diimplementasikan (F4.15, 20 Okt 2026). Modal FE menunggu Dimas.

**Keputusan:**

| Aspek | Ketentuan |
|---|---|
| Bentuk pertanyaan | maksimal 4: 1 `bagian` + maksimal 3 `gejala_<komponen>` |
| Bank | 8 komponen nama awam × gejala bertingkat + opsi `g0` "tidak ada gejala" |
| Pemilih | deterministik dari kata kunci deskripsi; AI tidak mengarang kalimat |
| Struktural | `gejala_struktur` hanya bila pemicu §15.5 muncul |
| Ambil pertanyaan | satu `GET` (bukan bertahap) |
| Field | `kode` + `nilai`; kode gejala `gejala_<komponen>` |
| Penyimpanan | `laporan.jawaban_konfirmasi` JSON (audit + fitur lapis 2) |
| Kedaluwarsa | 24 jam, transisi **lazy** saat endpoint diakses |
| Jawaban | severity tertinggi menang; `g0` → `baik`; jawaban warga menang atas teks |
| `sumber_kondisi` | `ai` (AI menerjemahkan jawaban → enum), bukan `warga` |
| Verifikator | tidak dapat mengubah jawaban warga pada endpoint ini |

**Konsekuensi:** laporan lama (`status_konfirmasi IS NULL`) dianggap `dilewati` dan tidak
ditawari konfirmasi ulang; `POST` kedua → `409 CONFLICT`; kode/nilai asing → `422`.

---

### D-26: Sumber label severity — LLM 550 + verifikasi manual 50; K1 sebagai baseline

**Status:** ⏳ Kerangka + ablation K1–K4 selesai (K3 menang 74,00% test set; label LLM);
**verifikasi manual 50 ditunda ke minggu depan (≥ 28 Okt 2026)** — lihat Amandemen di bawah.

**Keputusan:**

| Aspek | Ketentuan |
|---|---|
| Label latih | 550 laporan dari LLM (satu permintaan per laporan) |
| Test set | 50 laporan acak (seed 42), **tidak** dipakai melatih |
| Verifikasi | 50 label LLM diperiksa manual Aris; `label_manual` di `test_50.csv` |
| Prompt | 4 definisi Kemendikbud + alasan + output terkunci + catat model/versi |
| Dilarang | label seed `setup_f300.py` (acak/uniform) |
| Baseline | K1 aturan kata kunci; pembanding K2 LogReg, K3 SVM, K4 IndoBERT |
| Metrik | akurasi, macro-F1, confusion matrix |
| Integrasi cron | guard `kondisi_dilaporkan IS NULL` + `sumber_kondisi != 'warga'`; set `ai` |
| Gate | `SEVERITY_ENABLED=false` sampai ablation selesai — jangan menimpa 600 baris dengan baseline mentah |

**Keterbatasan wajib dilaporkan:** 50 sampel tidak cukup untuk generalisasi; akurasi LLM pada
sampel adalah batas atas classifier, bukan akurasi populasi.

**Amandemen (21 Okt 2026 — keputusan Aris):** verifikasi manual **ditunda ke minggu depan
(≥ 28 Okt 2026)** dan wajib memenuhi 3 syarat agar angka `--labels manual` dapat dipakai:

1. **Rubrik dulu** — buat `docs/backend/RUBRIK_LABEL_MANUAL.md` (definisi `severity.py:25` +
   daftar periksa pengambil keputusan + aturan ambigu + penanda `ragu`); tanpa rubrik penilaian
   subjektif.
2. **Mode blind** — isi lewat `test_50_blind.csv` tanpa kolom `label_llm`; Aris sudah mengetahui
   skor ablation sebelumnya (risiko *anchoring*); isian awal disimpan sebagai `label_manual_v1`
   untuk mengukur anchoring.
3. **Rerun final** — `severity_ablation.py --labels manual --indobert-model app/dataset/severity/models/indobert`
   setelah `50/50`, lalu update `CHANGELOG.md` §3.32 + `ABLATION_SEVERITY_RESULTS.md`.

Dua bias (isi setelah tahu skor; tanpa rubrik) wajib ditulis jujur di bagian metodologi skripsi.
