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
