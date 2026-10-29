# Spesifikasi: Klasifikasi Severity dari Teks Laporan

> **Status:** spesifikasi / usulan — **belum diimplementasikan**, **belum masuk TASK_GUIDE**.
> Dokumen ini berdiri sendiri dan sengaja **tidak disatukan** dengan daftar task F1–F4
> yang sudah ada. Jika disetujui, ia menjadi task baru **F4.13** (butuh persetujuan eksplisit
> pemilik proyek sebelum masuk `TASK_GUIDE.md`).
>
> **Penulis usulan:** sesi diskusi 2026-10-19. **Pemilik keputusan:** Aris.

---

## 1. Masalah yang diselesaikan

`laporan.kondisi_dilaporkan` **tidak pernah diisi oleh form pelaporan warga**.

Bukti (`frontend/src/pages/warga/FormLaporan.tsx:80-84`):

```tsx
await kirimLaporan({
  sekolah_npsn: displayNpsn,
  fasilitas_terkait: lokasiSpesifik || null,
  deskripsi,                          // ← kondisi_dilaporkan TIDAK dikirim
})
```

Field-nya ada di kontrak backend (`LaporanCreateRequest.kondisi_dilaporkan`, opsional) tetapi
FE tidak pernah mengisinya. Radio button di baris 216 file yang sama berada di halaman
**sanggahan demo**, bukan form laporan.

**Akibat berantai:**

| Konsumen | Perilaku saat `kondisi_dilaporkan = NULL` |
|---|---|
| `calculate_kbm_score` (`scoring.py:35`) | `NULL` **dibuang** dari rata-rata → `skor_laporan = 0.0` |
| `calculate_priority_score` (`scoring.py:88`) | `NULL` dipetakan ke `0` (setara `baik`) |

Dua fungsi dalam satu file menangani data yang sama dengan cara berbeda — ini **bug**, bukan
pilihan desain. Konsekuensinya: jika seluruh laporan satu sekolah `NULL`, maka
`skor_laporan = 0.0` dan sekolah tampak "aman" padahal warga melaporkan kerusakan.

Data 600 laporan di DB dev memiliki nilai enum karena di-*seed* lewat `scripts/setup_f300.py`,
bukan karena diisi lewat form.

**Dampak ke shrinkage (§10 `AI_PIPELINE_ABLATION_STUDY.md`):** tanpa
`kondisi_dilaporkan`, komponen `skor_laporan` tidak punya bahan untuk di-*shrink* sama sekali.
Seluruh metode skoring §10 bergantung pada komponen ini.

---

## 2. Ruang lingkup

**Termasuk:**
- Klasifikasi `deskripsi` (teks bebas) → `kondisi_dilaporkan` (4 kelas enum)
- Pengisian otomatis kolom tersebut saat cron clustering berjalan, **hanya bila nilainya `NULL`**
- Kolom penanda asal nilai untuk auditabilitas
- Rencana pengujian (ablation klasifikasi)

**Tidak termasuk:**
- Menambah input severity ke form warga (jalur alternatif, lihat §9)
- Mengubah tahap A/B/C/D pipeline yang sudah ada
- Mengubah bobot skoring (`0.7/0.3`), ambang level, atau rumus shrinkage
- Pelabelan ulang 600 laporan dev yang sudah ada

---

## 3. Posisi terhadap pipeline yang ada

Pipeline lama **tidak diubah**. Empat tahapnya mengerjakan tugas yang berbeda dan tidak dapat
dipakai ulang untuk tugas ini.

| Tahap | Tugas | Level | Keluaran |
|---|---|---|---|
| A2 TF-IDF | representasi teks | batch | matriks 300 dim |
| B1 UMAP | reduksi dimensi | batch | matriks 10 dim |
| C2 HDBSCAN | **clustering** | klaster | `labels[]` |
| D1 labeling | penamaan klaster | klaster | `{label_teks, kategori}` |
| **BARU** | **klasifikasi** | **laporan** | **enum 4 kelas** |

Perbedaan mendasar: pipeline lama menjawab *"laporan mana yang isunya sama"* (level klaster,
unsupervised). Tahap baru menjawab *"satu laporan ini tingkat kerusakannya apa"* (level laporan,
supervised). Tidak ada tahap lama yang bisa dipakai ulang.

Yang perlu diakui: kedua tugas **bergantung pada masukan yang sama** (`laporan.deskripsi`),
tetapi tidak saling mengganggu.

```
A2 → B1 → C2 → D1 → ┬→ (klaster + label)        ← perilaku lama, tidak berubah
                    │
                    └→ severity.py  (BARU)      ← tahap tambahan
```

---

## 4. Definisi modul

**Berkas baru:** `backend/app/ai_pipeline/severity.py`

```python
def classify_severity(texts: List[str]) -> List[str]:
    """Klasifikasi tingkat kerusakan dari teks bebas laporan warga.

    Returns:
        list nilai enum, panjang = len(texts):
        "baik" | "rusak_ringan" | "rusak_sedang" | "rusak_berat"
    """
```

**Kontrak:** idempoten, tanpa efek samping ke DB (pemanggil yang menulis). Bila classifier tidak
yakin, kembalikan kelas mayoritas atau `None` — **jangan menebak acak**; pemanggil memperlakukan
`None` sebagai "tidak terklasifikasi" (lihat §6).

**Pemanggilan** di `pipeline.py` sebagai tahap 5, dan pengisian kolom di
`scripts/run_clustering.py`:

```python
for lap, sev in zip(laporan_list, severities):
    if lap.kondisi_dilaporkan is None:      # jangan timpa isian warga
        lap.kondisi_dilaporkan = sev
        lap.sumber_kondisi = "ai"
```

---

## 5. Sumber label latih — keputusan terbesar, bukan kodenya

Kode modul ini singkat. Kesulitannya adalah **darimana label latih berasal**. Tidak ada dataset
"teks laporan → tingkat kerusakan" yang dilabeli manusia.

| Opsi | Cara | Kelemahan |
|---|---|---|
| **S1 — Semi-supervised dari seed** | Pakai 600 laporan dev yang `kondisi_dilaporkan`-nya sudah terisi | **Tidak valid.** Label seed dibuat acak/uniform (`baik 154 · ringan 147 · sedang 145 · berat 154`), jadi model dilatih memprediksi keacakan → akurasi tampak bagus, tidak bermakna |
| **S2 — Weak supervision (aturan kata kunci)** | Kamus kata → kelas (`"ambruk/runtuh"` → berat, `"retak halus"` → ringan), jadikan label awal, latih classifier | Akurasi tidak bisa melampaui akurasi aturan itu sendiri. Tapi **jujur** dan bisa dijadikan baseline |
| **S3 — LLM sebagai guru** | LLM melabeli 600 laporan → jadi data latih | Butuh biaya API; wajib validasi manual pada sampel (mis. 50 laporan) supaya bisa dilaporkan akurasinya |
| **S4 — Pelabelan manual terbatas** | Aris (dan/atau dosen) melabeli 100–150 laporan secara manual | Paling valid, paling mahal waktu. Standar emas untuk evaluasi |

**Rekomendasi:** **S4 untuk *test set* + S2 untuk *baseline*.** Labeli manual 100–150 laporan
sebagai test set (tidak pernah dipakai melatih), lalu bandingkan metode. Ini memberi angka
akurasi yang bisa dipertanggungjawabkan tanpa klaim berlebihan.

**S1 dilarang** dipakai sebagai dasar klaim akurasi apa pun.

---

## 6. Penanganan kasus tepi

| Kasus | Perilaku yang diusulkan |
|---|---|
| `deskripsi` kosong / `NULL` | Jangan klasifikasi; biarkan `kondisi_dilaporkan` `NULL`, `sumber_kondisi` `NULL` |
| `deskripsi` < 20 karakter | Sama seperti di atas (ambang minimum form) |
| `kondisi_dilaporkan` sudah terisi | **Jangan timpa.** Nilai warga selalu menang |
| Classifier tidak yakin | Kembalikan `None` → tidak mengisi. **Jangan default ke `baik`** |
| Teks di luar domain (spam, uji coba) | Kelas `None` + catat di log |

**Aturan penting:** `None` harus diperlakukan sama di **kedua** fungsi scoring. Perbaikan ini
harus dikerjakan lebih dulu, terlepas dari apakah klasifikasi severity jadi diimplementasikan
(lihat §7).

---

## 7. Perbaikan pendahulu (wajib, terpisah dari fitur ini)

Bug perilaku `NULL` yang tidak konsisten harus diperbaiki **sebelum** apa pun:

```
calculate_kbm_score       : NULL dibuang dari rata-rata
calculate_priority_score  : NULL dianggap 0 (= "baik")
```

Pilih satu semantik dan terapkan di keduanya. Rekomendasi: **buang `NULL`** (jangan anggap
"baik"), karena laporan tanpa kondisi bukan berarti kondisi baik.

Perbaikan ini **bukan bagian dari fitur klasifikasi** dan sebaiknya jadi commit terpisah.

---

## 8. Skema basis data

Satu kolom baru (opsional tetapi disarankan untuk audit):

| Kolom | Tipe | Nilai | Alasan |
|---|---|---|---|
| `laporan.sumber_kondisi` | ENUM NULLABLE | `warga` / `ai` | Menelusuri asal nilai; memungkinkan audit & pembandingan kualitas |

Tanpa kolom ini, nilai hasil AI dan nilai isian warga **tidak dapat dibedakan** — sehingga
klaim akurasi tidak dapat diverifikasi dan kesalahan AI tidak dapat ditarik kembali.

Memerlukan migrasi Alembic + regen `database/simakis.sql` + pembaruan `DATABASE_SCHEMA.md`
dan `INTERFACES.md`.

---

## 9. Alternatif yang dipertimbangkan

| Alternatif | Alasan tidak dipilih sebagai jalur utama |
|---|---|
| **Menambah input severity ke form warga** | Mengubah kontrak FE↔BE (perlu koordinasi Dimas). Juga rapuh: warga sering tidak memahami istilah teknis `rusak_ringan/sedang/berat`; yang melapor justru cenderung memilih yang paling berat |
| **Membiarkan `NULL`** (status quo) | `skor_laporan` tidak bermakna, seluruh §10 tidak dapat dijalankan. Bukan pilihan |
| **Memakai `fasilitas_terkait` sebagai proksi severity** | Tidak ada hubungan logis antara nama ruang dan tingkat kerusakan |

Jalur form warga **tidak ditiadakan** — ia tetap valid sebagai pelengkap (nilai warga menang
bila ada). Yang ditolak adalah menjadikannya **satu-satunya** sumber.

---

## 10. Rencana pengujian

Karena ini tugas **klasifikasi**, metriknya berbeda dari ablation clustering (yang memakai
NMI/ARI/Purity). Di sini: **akurasi, macro-F1, confusion matrix**.

Rencana ablation klasifikasi (blok baru, **terpisah** dari blok A/B/C/D):

| Varian | Metode |
|---|---|
| **K1** | Aturan kata kunci (baseline, weak supervision) |
| **K2** | TF-IDF + Logistic Regression |
| **K3** | TF-IDF + SVM |
| **K4** | IndoBERT fine-tune (bila waktu & data cukup) |

Dievaluasi pada **test set berlabel manual** (§5, S4) — bukan pada data seed.

Dua pertanyaan yang harus dijawab angka ini:
1. Apakah K2/K3/K4 benar-benar mengalahkan K1? Kalau tidak, aturan kata kunci sudah cukup dan
   kompleksitas tambahan tidak sepadan.
2. Berapa akurasi yang dibutuhkan agar `skor_kbm` tetap stabil? (analisis sensitivitas — bila
   akurasi 70%, berapa sekolah yang berpindah level?)

---

## 11. Dampak & biaya

| Berkas / area | Perubahan | Jenis |
|---|---|---|
| `app/ai_pipeline/severity.py` | baru | tambahan |
| `app/ai_pipeline/pipeline.py` | +1 panggilan tahap | tambahan |
| `scripts/run_clustering.py` | +3 baris pengisian kolom | tambahan |
| `app/ai_pipeline/scoring.py` | samakan perilaku `NULL` | **perbaikan bug** |
| Migrasi Alembic | +1 kolom `sumber_kondisi` | perubahan skema |
| `docs/backend/DATABASE_SCHEMA.md` | +1 kolom | dokumen |
| `docs/universal/INTERFACES.md` | +`sumber_kondisi` di respons | kontrak FE↔BE |
| `database/simakis.sql` | regen | artefak |
| Dataset label manual | 100–150 laporan | **pekerjaan manual** |
| Blok ablation K1–K4 | baru | pengujian |

**Yang TIDAK berubah:** A1–A3, B1–B3, C1–C3, D1–D3, bobot `0.7/0.3`, ambang level
`70/50/40`, rumus shrinkage, skema `klaster`.

**Tidak butuh GPU** untuk K1–K3; K4 hanya bila IndoBERT fine-tune dijalankan.

---

## 12. Risiko & batasan

| Risiko | Keterangan |
|---|---|
| **Bias pelaporan** | Warga melapor saat ada masalah (*self-selection*). Model dilatih pada distribusi yang berat sebelah — akurasi di data nyata bisa lebih rendah dari test set |
| **Label seed acak** | 17% laporan dev akan tetap `NULL` dan tidak dapat dipakai mengukur apa pun |
| **Kesalahan AI tidak dapat ditarik** | Bila `sumber_kondisi` tidak ditambahkan, laporan yang salah nilai tidak dapat diidentifikasi |
| **Overclaim** | Akurasi pada test set kecil (100–150) tidak boleh digeneralisasi ke populasi laporan Lamongan |
| **Kompetisi dengan jalur warga** | Bila kelak form warga mengisi severity, model AI hanya berperan sebagai *fallback* — nilai tambahnya mengecil |

---

## 13. Rekomendasi akhir

**Bertahap, tidak sekaligus:**

1. **Sekarang** — perbaiki inkonsistensi `NULL` di `scoring.py` (§7). Ini bug, terlepas dari
   fitur ini.
2. **Sebelum implementasi** — putuskan sumber label latih (§5). Tanpa ini, mengukur akurasi
   tidak bermakna dan klaim apa pun di skripsi tidak dapat dipertanggungjawabkan.
3. **Implementasi minimal** — S2 (aturan kata kunci) sebagai baseline yang jujur, dipasang
   sebagai tahap 5 pipeline.
4. **Baru naik kelas** — K2/K3/K4 hanya bila baseline terbukti kurang.
5. **Selalu** — tambahkan `sumber_kondisi` bila nilai AI menyentuh DB produksi.

**Kontribusi yang bisa diklaim di skripsi:** bukan "kode klasifikasi", melainkan
*tabel ablation K1–K4 dengan angka akurasi pada test set berlabel manual* — itu bagian yang
punya nilai metodologis.

---

## 15. Lapis 1 — Pertanyaan Konfirmasi Adaptif

> **Keputusan pemilik proyek (2026-10-20):** Pilihan 1 = **A** (nama awam + tabel pemetaan).
> Pilihan 2 = **B** (pertanyaan struktural berbasis pemicu). Waktu pemunculan = **setelah laporan terkirim**.

### 15.1 Konsep

Lapis 1 bukan form yang harus diisi sebelum mengirim. Ia adalah **konfirmasi setelah laporan
tersimpan**: warga menulis deskripsi + foto seperti biasa → tekan kirim → laporan sudah masuk →
AI memilih 4 pertanyaan yang relevan dengan isi laporan → warga menjawab (boleh dilewati).

Alasan urutan ini dipilih:

| Alasan | Keterangan |
|---|---|
| Laporan tidak pernah hilang | Warga yang berhenti di tengah pertanyaan tetap punya laporan tersimpan |
| Ada jalur mundur | `kondisi_dilaporkan` dapat diisi dari `deskripsi` saja bila warga tidak menjawab — lapis 1 menaikkan akurasi, bukan menjadi syarat mutlak |
| AI punya bahan | Pertanyaan dipilih setelah AI membaca deskripsi, bukan ditebak sebelum ada isi |

Itu sebabnya AI **tidak** memilih pertanyaan dari nol. Ia memilih dari **bank pertanyaan** yang
disiapkan manusia:

```
bank pertanyaan (manusia, di repo)
        ↓
AI membaca deskripsi → memilih 4 pertanyaan relevan
        ↓
warga menjawab (opsional)
        ↓
severity.py menggabungkan deskripsi + jawaban → kondisi_dilaporkan
```

**AI hanya memilih, tidak mengarang.** Ini memindahkan risiko dari "AI mengarang pertanyaan
aneh" ke "AI salah memilih kategori" — kesalahan yang jauh lebih mudah dideteksi dan diperbaiki.
Efek samping: pertanyaan tidak mungkin mengandung istilah teknis yang tidak dipahami warga,
karena semua kalimat sudah ditulis dan ditinjau manusia.

### 15.2 Struktur pertanyaan per laporan (4 pertanyaan)

| # | Pertanyaan | Sumber | Jumlah |
|---|---|---|---|
| 1 | "Bagian mana yang rusak?" | pilihan nama awam (§15.3) | 1 |
| 2–4 | Gejala bertingkat untuk bagian terpilih | bank gejala (§15.4) | 3 |

Gejala disusun **berjenjang dari yang paling parah**. Warga diarahkan memilih gejala **tertinggi
yang dia lihat** (bukan ceklis semua). Begitu satu gejala dijawab "ya", gejala di bawahnya yang
lebih ringan dilewati.

### 15.3 Pilihan 1 = A — Nama awam + tabel pemetaan

Warga memilih dari **8 nama awam**; dokumen dan sistem menyimpan nama teknis.

| Nama awam (ditampilkan ke warga) | Komponen teknis (Kemendikbud) |
|---|---|
| Plafon / langit-langit | `plafond` + `rangka plafond` |
| Atap | `penutup atap` + `struktur rangka` + `gording` |
| Dinding | `dinding` |
| Lantai | `lantai` + `pelat lantai` |
| Pintu / jendela | `jendela (kaca)` + `pintu` + `kusen` |
| Listrik / lampu | `instalasi listrik` |
| Air / kran / WC | `instalasi air` |
| Saluran air kotor | `drainase limbah` |

Dua komponen dokumen — **finishing** dan **pondasi/kolom/balok** — tidak muncul sebagai pilihan
karena alasan berbeda:

- `finishing` tercakup di dalam pilihan lain (cat dinding → "Dinding"; cat plafon → "Plafon");
  tidak berguna sebagai pilihan mandiri
- pondasi/kolom/balok tertutup dinding dan tidak dapat diamati warga → lihat §15.5

**Ekstensi lokal — Meja / kursi / perabot** (komponen ke-9, ditambahkan 27 Okt 2026): perabot bukan
komponen gedung pada tabel Kemendikbud, tetapi "meja & kursi rusak" adalah isu paling umum pada
dataset clustering SIMAKIS. Tanpa komponen ini, deskripsi perabot tidak pernah terdeteksi sehingga
`perlu_konfirmasi` selalu `false` dan warga tidak pernah melihat pertanyaan konfirmasi. Label
awam: **Meja / kursi / perabot**; pemetaan teknis: `meja`, `kursi`, `perabot kelas`, `furnitur`.

### 15.4 Bank pertanyaan gejala

Setiap baris diturunkan dari tabel "Kriteria Penentuan Tingkat Kerusakan" di
*Analisis Tingkat Kerusakan Bangunan* (Dirjen PAUDDIKDASMEN). Frasa di kolom **gejala**
sengaja memakai kata yang warga pahami; kolom **rujukan** menautkannya kembali ke baris definitif
dokumen, sehingga setiap pertanyaan dapat dipertanggungjawabkan saat sidang.

**Plafon**

| Gejala (pertanyaan ke warga) | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah ada bagian plafon yang sudah jatuh? | Rusak Sangat Berat | "Rangka langit-langit runtuh" |
| Apakah plafon terlihat melengkung atau melendut ke bawah? | Rusak Berat | "Penutup langit-langit melendut sangat besar…" |
| Apakah ada bagian plafon yang sudah lepas dari rangkanya? | Rusak Sedang | "Penutup bukaan langit-langit terlepas" |
| Apakah cat plafon terlihat mengelupas meluas? | Rusak Ringan | "Perubahan pada lapisan cat meluas" |

**Atap**

| Gejala | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah rangka atap sudah runtuh atau tertekuk? | Rusak Sangat Berat | "Rangka atap runtuh · Komponen struktur tertekuk" |
| Apakah penutup atap melendut sangat besar? | Rusak Berat | "Penutup atap melendut sangat besar…" |
| Apakah ada bocoran yang meluas saat hujan? | Rusak Sedang | "Bocoran meluas" |
| Apakah ada genteng yang terlepas dari dudukannya? | Rusak Sangat Ringan | "Genteng terlepas dari dudukannya" |

**Dinding**

| Gejala | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah ada bagian dinding yang runtuh? | Rusak Sangat Berat | "Dinding runtuh" |
| Apakah plesteran dinding terkelupas meluas dan berlumut? | Rusak Berat | "Lapisan terkelupas meluas, berlumut…" |
| Apakah retakan dinding sudah lebar atau dinding partisi terlepas? | Rusak Sedang | "Dinding retakan meluas (1-2 mm)…" |
| Apakah retakan permukaan dinding terlihat jelas? | Rusak Ringan | "Retakan permukaan dinding terlihat jelas" |

**Lantai**

| Gejala | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah lantai sudah meledak atau terlepas? | Rusak Sangat Berat | "Lantai meledak, terlepas" |
| Apakah lantai melendut atau retak sampai tembus? | Rusak Berat | "Lantai melendut, retak tembus…" |
| Apakah penutup lantai sebagian terlepas? | Rusak Sedang | "Penutup lantai sebagian terlepas" |
| Apakah penutup lantai tergores? | Rusak Sangat Ringan | "Penutup lantai gores" |

**Pintu / jendela**

| Gejala | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah rangka pintu/jendela keropos dimakan rayap? | Rusak Sangat Berat | "…kusen keropos dimakan rayap" |
| Apakah rangka pintu/jendela keropos akibat air? | Rusak Berat | "Rangka bukaan atau kusen keropos akibat air" |
| Apakah kaca pintu/jendela sudah retak lebar? | Rusak Sedang | "Penutup bukaan (retak lebar)" |
| Apakah warna rangka pintu/jendela mulai berubah? | Rusak Sangat Ringan | "Perubahan warna pada sebagian lapisan warna rangka" |

**Listrik / lampu**

> Dokumen asli memakai **ambang biaya** (5%, 20-50%, >50% dari biaya instalasi baru) yang tidak
> dapat diamati warga. Kolom gejala di bawah adalah terjemahan ke pengamatan visual — inilah
> contoh paling jelas mengapa lapis 1 diperlukan.

| Gejala | Tingkat resmi | Rujukan dokumen (ambang biaya) |
|---|---|---|
| Apakah seluruh ruangan tidak berlistrik? | Rusak Sangat Berat | ">50% dari instalasi baru · seluruh armatur rusak" |
| Apakah beberapa ruangan gelap karena listrik mati? | Rusak Berat | ">50% dari instalasi baru" |
| Apakah ada kabel terkelupas atau percikan api? | Rusak Sedang | "20-50% dari biaya instalasi baru" |
| Apakah beberapa lampu/kontak tidak berfungsi? | Rusak Ringan | "5-20% dari biaya instalasi baru" |

**Air / kran / WC**

| Gejala | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah kran dan pompa air tidak berfungsi sama sekali? | Rusak Sangat Berat | "Pompa-pompa rusak total, motor terbakar…" |
| Apakah pipa utama bocor atau beberapa kran mati? | Rusak Berat | "…pipa utama bocor… beberapa keran tidak berfungsi" |
| Apakah pompa atau keran perlu diganti/diperbaiki? | Rusak Sedang | "Pompa, motor, pipa, dan keran rusak…" |
| Apakah ada kebocoran kecil di kran atau pipa yang terlihat? | Rusak Sangat Ringan | "Kebocoran pipa terbatas ditempat yang terlihat…" |

**Saluran air kotor**

| Gejala | Tingkat resmi | Rujukan dokumen |
|---|---|---|
| Apakah saluran air kotor tersumbat total atau pipa pecah? | Rusak Sangat Berat | "Pipa riser patah atau pecah… sump pump rusak…" |
| Apakah saluran air kotor tersumbat dan menggenang? | Rusak Sedang | "Pipa cabang… patah atau pecah… tersumbat" |
| Apakah ada pipa saluran yang pecah atau tersumbat? | Rusak Sangat Ringan | "Sebagian pipa cabang pecah atau rusak atau tersumbat" |

**Meja / kursi / perabot** (ekstensi lokal, ditambahkan 27 Okt 2026)

> Komponen ini bukan bagian dari tabel Kemendikbud; ditambahkan karena "meja & kursi rusak"
> adalah isu paling umum pada dataset SIMAKIS. Rujukan ditandai sebagai "ekstensi lokal" untuk
> transparansi dalam sidang verifikasi.

| Gejala | Tingkat resmi | Rujukan |
|---|---|---|
| Apakah ada meja atau kursi yang patah atau roboh sehingga tidak bisa dipakai? | Rusak Sangat Berat | Ekstensi lokal — di luar tabel Kemendikbud §15.3 |
| Apakah banyak meja atau kursi yang miring, longgar, atau permukaannya terkelupas? | Rusak Berat | Ekstensi lokal — di luar tabel Kemendikbud §15.3 |
| Apakah ada meja atau kursi yang goyang atau permukaannya tergores? | Rusak Sedang | Ekstensi lokal — di luar tabel Kemendikbud §15.3 |
| Apakah permukaan meja atau kursi banyak tergores atau catnya memudar? | Rusak Ringan | Ekstensi lokal — di luar tabel Kemendikbud §15.3 |

### 15.5 Pilihan 2 = B — Pertanyaan struktural berbasis pemicu

Komponen **pondasi, kolom, dan balok** tertutup plesteran/cat atau tertanam di tanah. Warga tidak
dapat mengamatinya. Menanyakannya secara tetap menghasilkan tebakan — data yang **terlihat
seperti data** tetapi sebenarnya karangan, dan itu lebih berbahaya daripada kosong.

**Aturan:** pertanyaan struktural hanya dimunculkan bila `deskripsi` memuat pemicu.

| Pemicu (kata/frasa di deskripsi) | Komponen yang ditanyakan |
|---|---|
| bangunan miring, bangunan goyang, bangunan bergeser | pondasi, kolom |
| dinding retak besar, retakan lebar, retakan memanjang | kolom, balok |
| plesteran/beton jatuh, selimut beton hancur, besi terlihat | kolom, balok |
| langit-langit turun, lantai naik/menggelembung | balok, pelat lantai |
| bangunan ambruk, bangunan runtuh | pondasi, kolom, balok |

Bila tidak ada pemicu → komponen struktural **tidak ditanyakan**, dan sistem mencatatnya sebagai
`tidak_dievaluasi`. Ini jujur: lebih baik mengaku tidak memeriksa daripada menerima jawaban tebakan.

Alasan penyaring ini bekerja: masalah struktur bersifat dramatis. Bila sebuah bangunan benar-benar
punya masalah kolom, warga **akan** menyebutnya di deskripsi (retakan besar, bangunan miring).
Bila tidak disebut, kemungkinan besar memang tidak ada masalah yang terlihat.

### 15.6 Kasus tepi lapis 1

| Kasus | Perilaku |
|---|---|
| Warga melewati semua pertanyaan | Laporan tetap sah; `kondisi_dilaporkan` diisi dari deskripsi saja (lapis 2); status konfirmasi `dilewati` |
| Warga menjawab sebagian | Jawaban yang ada dipakai; sisanya `NULL` |
| Deskripsi menyebut 2 komponen | Pertanyaan dibagi antar komponen (mis. 2 + 2) |
| Deskripsi tidak menyebut komponen apa pun | Pertanyaan 1 (pilih bagian) ditampilkan; sisanya dipilih AI setelah warga memilih |
| Jawaban warga bertentangan dengan deskripsi | **Jawaban warga menang.** Warga melihat langsung; AI tidak |
| Warga menjawab semua "tidak" | Berarti `baik` — perbedaan penting antara "tidak ada gejala" dan "tidak menjawab" |

### 15.7 Status konfirmasi

Perlu status tambahan pada laporan agar cron tahu mana yang masih perlu diproses ulang:

| Nilai | Arti |
|---|---|
| `menunggu` | laporan baru dikirim, pertanyaan belum dijawab |
| `terjawab` | warga menjawab minimal pertanyaan 1 |
| `dilewati` | warga tidak menjawab dalam batas waktu (mis. 24 jam) → diproses dari deskripsi saja |

Nama kolom dan enum final ditentukan saat implementasi dan masuk `DATABASE_SCHEMA.md` +
`INTERFACES.md`.

---

## 16. Keputusan yang dibutuhkan dari pemilik proyek

| # | Pertanyaan | Opsi | Status |
|---|---|---|---|
| 1 | Diterima sebagai task, atau hanya catatan? | F4.13 di `TASK_GUIDE.md` / tetap dokumen mandiri | **belum** |
| 2 | Sumber label latih | S2 / S3 / S4 / kombinasi | ✅ **S3 (LLM) + sampel verifikasi manual (§18.1)** |
| 3 | Tambah kolom `sumber_kondisi`? | ya / tidak | ✅ **ya (§18.2)** |
| 4 | Apakah form warga juga ditambah input severity? | ya (paralel) / tidak (AI saja) | ✅ **tidak — AI saja (§18.2)** |
| 5 | Semantik `NULL` di scoring | dibuang (rekomendasi) / dianggap `baik` | ✅ **dibuang (§18.3)** |
| 6 | Nama komponen untuk warga | awam + tabel pemetaan / teknis langsung | ✅ **A (awam)** |
| 7 | Pertanyaan struktural (pondasi/kolom/balok) | selalu / berbasis pemicu | ✅ **B (pemicu)** |
| 8 | Waktu pemunculan pertanyaan | sebelum kirim / setelah kirim | ✅ **setelah kirim** |
| 9 | Jumlah pertanyaan per laporan | 3 / 4 / 5 | ✅ **4** |
| 10 | Bank pertanyaan diturunkan dari | dokumen Kemendikbud / dirancang bebas | ✅ **Kemendikbud (§15.4)** |
| 11 | Verifikasi sampel label LLM | tidak ada / 50 sampel acak | ✅ **50 sampel (§18.1)** |

Sembilan dari sebelas keputusan sudah ditetapkan. Yang tersisa hanya **#1** (status dokumen
ini: task resmi atau catatan mandiri) — keputusan itu diambil belakangan, tidak menghambat
implementasi.

---

## 17. Keputusan yang ditetapkan (2026-10-20)

> **Pemilik keputusan:** Aris. Semua butir di bawah sudah final.

### 17.1 Poin 2 — Sumber label latih: LLM (S3) + verifikasi sampel

Pelabelan manual 100–150 laporan **ditolak** karena beban waktu dianggap terlalu besar.
Sebagai gantinya:

```
600 laporan
├─ 550  → dilabeli LLM          → data latih
└─ 50   → dilabeli LLM → DIPERIKSA MANUAL oleh Aris → test set
```

**Aturan yang mengikat:**

| Butir | Ketentuan |
|---|---|
| Sampel verifikasi | **50 laporan**, dipilih **acak**, diperiksa sendiri oleh Aris (~1 jam) |
| Test set | 50 laporan itu **TIDAK BOLEH** dipakai melatih — fungsinya mengukur akurasi LLM |
| Angka yang dilaporkan | Kecocokan pada 50 sampel (mis. 42/50 → akurasi label LLM 84%). Ini batas atas akurasi kerasifikasi apa pun yang dilatih dari label tersebut |
| S1 (label seed dev) | **tetap dilarang.** Label `setup_f300.py` dibuat acak/uniform (154/147/145/154) — melatih dari itu = melatih model menebak keacakan |

**Ketentuan prompt pelabelan LLM** (wajib dipatuhi agar hasil konsisten):

1. **Satu laporan, satu permintaan.** Jangan mengirim 600 sekaligus.
2. **Sertakan 4 definisi tingkat** dari dokumen Kemendikbud (§15.4 rujukan) di dalam prompt —
   supaya LLM memakai rujukan yang sama, bukan penilaian bebasnya.
3. **Minta alasan singkat** per label — agar pola kesalahan dapat dilihat saat pemeriksaan sampel.
4. **Output terkunci** ke satu dari 4 nilai enum. Tidak boleh "mungkin sedang" atau nilai ganda.
5. **Catat nama model + versi** yang dipakai melabeli. Label dari model berbeda tidak boleh
   dicampur dalam satu dataset.

**Batasan yang harus dilaporkan jujur:** 50 sampel tidak cukup untuk generalisasi ke seluruh
populasi laporan Lamongan. Angka akurasi LLM hanya berlaku sebagai *estimasi kasar*, dan
keterbatasan ini wajib ditulis di laporan/skripsi, bukan disembunyikan.

### 17.2 Poin 3 — Kolom `sumber_kondisi` ditambahkan

**Yang mengisi `kondisi_dilaporkan` adalah AI**, bukan warga. Warga hanya menjawab pertanyaan
konfirmasi (§15); AI yang menerjemahkan jawaban + deskripsi menjadi nilai severity.

Kolom `laporan.sumber_kondisi` tetap **wajib ditambahkan**, dengan makna:

| Nilai | Kapan diisi | Siapa yang mengisi |
|---|---|---|
| `ai` | pengisian otomatis oleh cron (`severity.py`) | sistem |
| `warga` | koreksi manusia saat verifikasi (mis. verifikator dinas menilai ulang) | verifikator |
| `NULL` | belum ada nilai sama sekali | — |

**Penting:** `warga` BUKAN berarti warga mengisi dropdown severity. Warga tidak pernah
melihat atau mengisi kolom ini. Nilai `warga` hanya muncul bila ada **manusia (verifikator)
mengoreksi** hasil AI saat verifikasi — dan koreksi itu harus ditandai supaya cron berikutnya
tidak menimpanya.

Alasan kolom ini tidak dapat dilewati:

| Tanpa kolom | Dengan kolom |
|---|---|
| Nilai AI & koreksi manusia tak terbedakan | Dapat dipisah kapan saja |
| Akurasi AI tidak dapat dihitung | Dihitung via filter `sumber_kondisi = 'ai'` |
| Salah nilai AI tidak dapat ditarik | Perbaiki hanya baris bertanda `'ai'` |
| Koreksi manusia bisa tertimpa cron | Cron hanya menulis bila `sumber_kondisi != 'warga'` |

**Batas waktu:** kolom ini harus ada **sebelum** lapis 2 menulis apa pun ke DB. Setelah AI
terlanjur menulis nilai tanpa penanda, baris-baris itu **tidak dapat ditandai lagi** — tidak ada
cara mengetahui mana yang hasil AI.

Implementasi: migrasi Alembic + regen `database/simakis.sql` + baris baru di
`DATABASE_SCHEMA.md` dan `INTERFACES.md`.

**Keputusan terkait — form warga TIDAK ditambah input severity.** Jalur satu-satunya adalah
pertanyaan konfirmasi (§15) → AI. Ini menegaskan keputusan #4 dan menutup opsi "form dropdown
severity" secara permanen untuk v1.

### 17.3 Poin 5 — Semantik `NULL` dibuang dari rata-rata

**Bug yang diperbaiki.** Dua fungsi di `app/ai_pipeline/scoring.py` memperlakukan `NULL` berbeda:

| Fungsi | Baris | Perlakuan lama | Perlakuan baru |
|---|---|---|---|
| `calculate_kbm_score` | `scoring.py:35` | dibuang dari rata-rata | **tetap** — sudah benar |
| `calculate_priority_score` | `scoring.py:88` | dipetakan ke `0` (= "baik") | **diubah** — dibuang dari rata-rata |

**Aturan final (berlaku di KEDUA fungsi):**

> `NULL` berarti **"tidak ada data"**, bukan **"kondisi baik"**. Laporan tanpa nilai enum
> dibuang dari perhitungan rata-rata; tidak pernah dihitung sebagai `0`.

Konsekuensi yang harus ditangani:

| Kasus | Perilaku yang benar |
|---|---|
| Sebagian laporan `NULL` | Rata-rata dari laporan yang bernilai saja |
| **Semua** laporan satu sekolah `NULL` | `mean = 0` karena **tidak ada data** — bukan karena "semua baik". Perbedaan alasan ini harus terlihat di UI/log, bukan disamarkan jadi skor 0 biasa |
| Nilai di luar enum | diperlakukan sama seperti `NULL` (dibuang) |
| `skor_prioritas` pada klaster dengan semua laporan `NULL` | `skor_keparahan = 0.3 × skor_dapodik` saja (komponen laporan tidak berkontribusi), vote tetap ditambahkan |

**Urutan pengerjaan:** perbaikan ini **paling awal** dan berdiri sendiri — tidak butuh data baru,
tidak butuh keputusan desain, tidak butuh koordinasi FE. Estimasi ~1 jam + test.

**Test yang perlu ditambahkan:** kasus semua-`NULL` pada kedua fungsi, untuk mencegah regresi
ke perilaku lama.

---

## 18. Urutan implementasi yang disetujui

| # | Pekerjaan | Ketergantungan | Estimasi |
|---|---|---|---|
| 1 | Perbaiki semantik `NULL` di `scoring.py` (§17.3) | — | ~1 jam |
| 2 | Tambah kolom `sumber_kondisi` + migrasi (§17.2) | — | ~1 jam |
| 3 | LLM melabeli 600 laporan (§17.1) | mesin/waktu | ~1 jam mesin |
| 4 | Periksa 50 sampel secara manual (§17.1) | #3 | ~1 jam |
| 5 | Implementasi lapis 1 (bank pertanyaan + pemilih) | #1, #2 | — |
| 6 | Implementasi lapis 2 (`severity.py`) | #3, #4, #5 | — |
| 7 | Ablation K1–K4 pada test set (§10) | #6 | — |

Item **1** dan **2** tidak saling bergantung dan dapat dikerjakan hari ini.

---

## 19. Usulan Kontrak FE↔BE (bahan diskusi dengan FE)

> **Status:** USULAN — **belum disetujui, `INTERFACES.md` belum disentuh.**
> Dokumen ini hanya menyiapkan bahan agar pembahasan dengan Dimas (FE) bisa langsung
> membahas bentuk konkret, bukan mulai dari nol. Setelah disepakati, barulah
> `docs/universal/INTERFACES.md` diperbarui.

### 19.1 Empat perubahan kontrak

| # | Perubahan | Alasan |
|---|---|---|
| 1 | `POST /laporan` — respons menyertakan `konfirmasi` | FE perlu tahu ada pertanyaan untuk ditampilkan |
| 2 | **Baru:** `GET /laporan/{id}/konfirmasi` | Mengambil daftar pertanyaan yang dipilih AI |
| 3 | **Baru:** `POST /laporan/{id}/konfirmasi` | Mengirim jawaban warga |
| 4 | Field `sumber_kondisi` di respons laporan | FE dapat menampilkan asal nilai (AI / verifikator) |

### 19.2 `POST /laporan` — tambahan pada respons

```json
{
  "data": {
    "id": "...",
    "tracking_id": "...",
    "konfirmasi": {
      "perlu_konfirmasi": true,
      "jumlah_pertanyaan": 4,
      "kedaluwarsa_pada": "2026-10-21T08:30:00+07:00"
    }
  }
}
```

- `perlu_konfirmasi: false` bila AI tidak menemukan pola kerusakan (mis. deskripsi terlalu umum)
- `kedaluwarsa_pada` = `created_at` + 24 jam; setelah itu status jadi `dilewati`

### 19.3 `GET /laporan/{id}/konfirmasi` — daftar pertanyaan

RBAC: pemilik laporan saja (`403` untuk selainnya).

```json
{
  "data": {
    "laporan_id": "...",
    "status": "menunggu",
    "pertanyaan": [
      {
        "kode": "bagian",
        "teks": "Bagian mana yang rusak?",
        "tipe": "pilih_satu",
        "pilihan": [
          { "kode": "plafon",  "label": "Plafon / langit-langit" },
          { "kode": "atap",    "label": "Atap" },
          { "kode": "dinding", "label": "Dinding" },
          { "kode": "lantai",  "label": "Lantai" },
          { "kode": "pintu_jendela", "label": "Pintu / jendela" },
          { "kode": "listrik", "label": "Listrik / lampu" },
          { "kode": "air",     "label": "Air / kran / WC" },
          { "kode": "drainase","label": "Saluran air kotor" }
        ]
      },
      {
        "kode": "gejala",
        "teks": "Pilih yang paling berat yang Anda lihat:",
        "tipe": "pilih_satu_bertingkat",
        "urutan": "dari_terparah",
        "lewati_bila_terjawab": true,
        "pilihan": [
          { "kode": "g4", "label": "Ada bagian yang sudah jatuh",     "tingkat": "rusak_berat" },
          { "kode": "g3", "label": "Terlihat melengkung/melendut",    "tingkat": "rusak_sedang" },
          { "kode": "g2", "label": "Sudah lepas dari rangkanya",      "tingkat": "rusak_ringan" },
          { "kode": "g1", "label": "Cat mengelupas meluas",           "tingkat": "baik" }
        ]
      }
    ],
    "jumlah_terjawab": 0
  }
}
```

Catatan bentuk:

- `tipe: "pilih_satu_bertingkat"` memberi tahu FE untuk menerapkan aturan **"jawab satu → lewati yang di bawahnya"**. Aturan itu di sisi FE, bukan BE — tapi kontraknya harus menyatakannya agar kedua sisi tidak berbeda tafsir.
- Label pakai **nama awam** (§15.3). Tabel pemetaan ke istilah teknis Kemendikbud tetap di BE.
- Field `tingkat` sengaja diisi nilai resmi (`rusak_berat`, dst.) supaya FE bisa memakai warna/kategori yang sudah ada tanpa pemetaan baru.

### 19.4 `POST /laporan/{id}/konfirmasi` — kirim jawaban

Request:

```json
{
  "jawaban": [
    { "kode": "bagian", "nilai": "plafon" },
    { "kode": "gejala", "nilai": "g3" }
  ]
}
```

Respons:

```json
{
  "data": {
    "status": "terjawab",
    "kondisi_dilaporkan": "rusak_sedang",
    "sumber_kondisi": "ai",
    "diproses_pada": "2026-10-20T14:05:00+07:00"
  }
}
```

Ketentuan:

| Kasus | Respons |
|---|---|
| Warga menjawab sebagian | `200`, `status: "terjawab"`, nilai dari jawaban yang ada |
| Warga mengirim `jawaban: []` | `200`, `status: "dilewati"` |
| Sudah pernah dijawab | `409 CONFLICT` — tidak boleh menimpa |
| Laporan bukan miliknya | `403` |
| Laporan tidak ada | `404` |

**Nilai warga selalu menang** atas hasil ekstraksi AI dari deskripsi (§15.6).

### 19.5 Perubahan pada kontrak laporan yang sudah ada

| Endpoint | Field baru | Keterangan |
|---|---|---|
| `GET /laporan/{id}` | `sumber_kondisi` | `"ai"` / `"warga"` / `null` |
| `GET /laporan/{id}` | `status_konfirmasi` | `"menunggu"` / `"terjawab"` / `"dilewati"` |
| `GET /laporan/perlu-review` | idem | agar verifikator melihat mana yang belum terkonfirmasi |

### 19.6 Dampak ke pekerjaan FE (perlu dibahas dengan Dimas)

| Pekerjaan FE | Perkiraan besar |
|---|---|
| Modal / halaman konfirmasi setelah laporan terkirim | sedang |
| Komponen pilih-satu (8 nama awam) | kecil |
| Komponen gejala bertingkat + aturan "lewati yang di bawah" | sedang |
| Tombol "Lewati" yang jelas terlihat | kecil |
| Penanganan tab ditutup sebelum dijawab (unsaved state) | kecil |
| Badge `sumber_kondisi` di halaman detail laporan | kecil |

Yang perlu ditegaskan ke FE: **konfirmasi bersifat opsional dan tidak memblokir apa pun.** Laporan tetap sah tanpa dijawab. Ini penting supaya desainnya tidak memaksa warga mengisi.

### 19.7 Yang belum diputuskan di kontrak

| # | Pertanyaan | Opsi |
|---|---|---|
| 1 | Pertanyaan diambil sekali (satu `GET`) atau bertahap per jawaban? | sekali / bertahap |
| 2 | Nama field `kode` vs `gejala_id`? | bebas, asal konsisten |
| 3 | Endpoint terpisah, atau digabung ke `GET /laporan/{id}`? | terpisah / digabung |
| 4 | Batas waktu 24 jam — siapa yang mengubah status ke `dilewati`? | cron / saat diakses |
| 5 | Apakah verifikator bisa mengubah jawaban warga? | ya / tidak |

Kelima butir ini ditentukan bersama FE sebelum `INTERFACES.md` diperbarui.

---

## 20. Rujukan

**Internal repo:**
- `docs/backend/AI_PIPELINE_ABLATION_STUDY.md` §10 — metode skoring yang bergantung pada
  `kondisi_dilaporkan`
- `docs/backend/ABLATION_RESULTS.md` — preseden format ablation (tabel varian & metrik)
- `docs/universal/DECISIONS.md` D-06 — skor prioritas = keparahan + vote
- `docs/universal/DECISIONS.md` D-22 — skor dampak KBM per sekolah
- `backend/app/ai_pipeline/scoring.py:18,67` — dua fungsi dengan perilaku `NULL` berbeda
- `frontend/src/pages/warga/FormLaporan.tsx:80-84` — bukti field tidak dikirim

**Eksternal (sumber bank pertanyaan §15.4):**
- Direktorat Jenderal PAUDDIKDASMEN, Kemendikbud. *Analisis Tingkat Kerusakan Bangunan*
  (Rapat Koordinasi Dapodik). Tabel "Kriteria Penentuan Tingkat Kerusakan" untuk 12 komponen:
  pondasi, kolom, balok/pelat lantai, atap, dinding, plafond, jendela (kaca)/pintu/kusen,
  lantai, instalasi listrik, instalasi air, drainase limbah, finishing.
  Sumber lokal: `disdik.bekasikota.go.id/download/file/Kualitas_Sarana_dan_Prasarana.pdf`
- Permen PU No. 24 Tahun 2008 — definisi kerusakan ringan/sedang/berat (dikutip di dokumen di atas)
- Kemendikdasmen. *Panduan Sarpras Dapodik* — ambang tingkat kerusakan
  (ringan 1–30%, sedang 31–45%, berat 46–100%)

