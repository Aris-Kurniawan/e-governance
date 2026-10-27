# Hasil Ablation Severity K1–K4 (F4.16 Lapis 2)

> **Status:** K4 selesai dijalankan + dievaluasi ulang di test set 50 (21 Okt 2026).
> **Pelabelan manual DITUNDA ke minggu depan (≥ 28 Okt 2026)** — sebelum mengisi wajib ada
> rubrik (`docs/backend/RUBRIK_LABEL_MANUAL.md`, belum dibuat) **dan** mode blind
> (`test_50_blind.csv`, tanpa kolom `label_llm`), karena Aris sudah mengetahui skor ablation
> sebelum menilai (*anchoring*). Setelah `0/50 → 50/50`, jalankan
> `severity_ablation.py --labels manual` untuk angka final.
> Detail keputusan: `CHANGELOG.md` §3.32 blok "Belum selesai / penghalang".
>
> **Tanggal eksekusi:** 20–21 Oktober 2026 · **Mesin:** WSL2, Python 3.14 (`backend/venv`)
> **Test set:** 50 laporan (`test_50.json`, seed 42, dipilih sebelum label LLM ada)
> **Kebocoran data:** irisan `train_550` ∩ `test_50` = **0** ✅

---

## 1. Hasil utama

| Varian | Metode | Akurasi | Macro-F1 | Waktu | GPU |
|---|---|---|---|---|---|
| **K1** | Aturan kata kunci (`severity.py`) | 48,00% | 0,2467 | instan | — |
| **K2** | TF-IDF + Logistic Regression | 72,00% | 0,5841 | ~detik | — |
| **K3** | TF-IDF + Linear SVM (LinearSVC, linear kernel) | **74,00%** | **0,6100** | ~detik | — |
| **K4** | IndoBERT fine-tune | 70,00% | 0,5722 | 270,8 dtk (latih) | GTX 1650 |

**Pemenang: K3 (TF-IDF + Linear SVM).** Direkomendasikan untuk produksi.

> **Catatan perbandingan:** keempat angka di atas kini diukur pada **test set 50 laporan yang
> sama** (evaluasi ulang K4 pada 21 Okt 2026 dengan `severity_ablation.py --indobert-model`).
> Angka internal per-epoch K4 (§6) berasal dari eval split latih (55 data) dan **tidak
> sebanding** dengan tabel ini.

### Mengapa bukan K4

| Alasan | Keterangan |
|---|---|
| Akurasi lebih rendah | 70,00% vs 74,00% (K3) — selisih **4,0 poin** |
| Butuh GPU | Latihan 270,8 detik; inferensi butuh torch CUDA |
| Model besar | `model.safetensors` **497 MB** — tidak muat di repo |
| Overfit | `eval_loss` naik di epoch 3 sementara akurasi naik |
| Sulit diaudit | 110 juta parameter vs koefisien SVM yang bisa diperiksa |

Argumen terakhir penting untuk e-government: keputusan yang memengaruhi sekolah harus bisa
dijelaskan. Koefisien SVM dapat diperiksa; bobot BERT tidak.

---

## 2. Baseline: tebak-mayoritas

Test set 50 laporan terdistribusi **timpang**: 36 `rusak_ringan`, 6 `baik`, 5 `rusak_berat`,
3 `rusak_sedang`. Model yang **selalu** menjawab "rusak_ringan" mendapat akurasi **72,00%**.

| Varian | Akurasi | Selisih dari baseline |
|---|---|---|
| K1 | 48,00% | **−24,0 poin** |
| K2 | 72,00% | **±0,0 poin** |
| K3 | 74,00% | **+2,0 poin** |
| K4 | 70,00% | **−2,0 poin** |

> ⚠️ **K2 persis setara tebak-mayoritas. K3 hanya +2 poin di atasnya; K4 juga kalah dari baseline.**

Ini temuan yang harus ditulis jujur di skripsi. Akurasi 74% terdengar baik, tetapi lawannya adalah
model tanpa kemampuan apa pun. Yang lebih informatif adalah **Macro-F1** — di situ K3 = 0,6100,
menunjukkan performa tidak merata antar kelas.

Baseline pada skala 600 laporan: `rusak_ringan` 425/600 = **70,8%**.

---

## 3. Distribusi label — akar masalah

| Kelas | 600 laporan | Train 550 | Test 50 |
|---|---|---|---|
| `rusak_ringan` | **425** (70,8%) | 389 | 36 |
| `baik` | 77 (12,8%) | 71 | 6 |
| `rusak_berat` | 52 (8,7%) | 47 | 5 |
| `rusak_sedang` | 46 (7,7%) | 43 | 3 |
| **Total** | 600 | 550 | 50 |

Distribusi ini **tidak wajar**. Laporan warga (self-selection) memang cenderung melaporkan masalah,
tetapi bukan berarti 70,8% kerusakan tergolong *ringan*. Kemungkinan besar ada **kesalahan sistematis
pada prompt pelabelan** — lihat §4.

Indikasi tambahan: **`rusak_sedang` hanya 46 dari 600 (7,7%)**, lebih sedikit dari `rusak_berat` (52).
Secara fisik aneh — kerusakan sedang seharusnya lebih umum daripada kerusakan berat.

---

## 4. Temuan kritis: 165 label meragukan

Dari 600 laporan, **249** deskripsinya menyebut kata bermuatan keparahan — `bahaya`, `keselamatan`,
`mengganggu`, `menghambat`, `tidak layak`, `tidak aman`, `rawan`, `kritis`. Distribusi labelnya:

| Label yang diberikan | Jumlah |
|---|---|
| **`rusak_ringan`** | **165** ← 66% |
| `baik` | 33 |
| `rusak_berat` | 31 |
| `rusak_sedang` | 20 |

**Dua pertiga laporan yang menyebut bahaya atau dampak ke KBM dilabeli `rusak_ringan`.**

Contoh nyata dari `labels_llm.jsonl`:

| Deskripsi | Label |
|---|---|
| "Tidak ada air bersih di WC sekolah, siswa kesulitan. **berbahaya bagi keselamatan siswa**" | `rusak_ringan` |
| "Tidak ada ruang guru yang memadai. **mengganggu kegiatan belajar mengajar**" | `rusak_ringan` |
| "Instalasi listrik belum sesuai **standar keamanan**. mengganggu kegiatan belajar mengajar" | `rusak_ringan` |
| "Area bermain anak **tidak layak dan berbahaya**" | `rusak_ringan` |
| "Kantin sekolah **tidak aman** dan tidak higienis" | `rusak_ringan` |
| "Area parkir **tidak aman**" | `rusak_ringan` |

### Penyebab

Aturan prompt `severity-llm-v1` — dikutip dari field `alasan` LLM sendiri:

> *"Laporan hanya menyebut kekurangan fasilitas air bersih tanpa tingkat kerusakan fisik; sesuai
> aturan, pilih tingkat paling ringan yang didukung teks."*

Aturan "kekurangan fasilitas → pilih tingkat paling ringan" **memisahkan kerusakan fisik dari dampak
KBM**. Padahal proyek ini justru dibangun untuk mengukur **dampak ke kegiatan belajar mengajar**
— lihat `AGENTS.md` dan `PROJECT_CONTEXT.md`.

Konsekuensi: sekolah tanpa air bersih, tanpa kantin layak, atau dengan instalasi listrik tidak aman
semuanya tampak "ringan" — dan skor KBM-nya rendah. Justru isu yang paling menghambat belajar
menjadi yang paling diabaikan.

### Model pelabel

`am/amanai/deepseek-v4-flash` — model kecil/cepat. Cocok untuk 600 permintaan, tetapi lebih rentan
pada kasus ambigu. Spesifikasi §17.1 butir 5 mewajibkan pencatatan model; ini terpenuhi
(`model` + `prompt_version` + `labeled_at` ada di setiap baris).

---

## 5. Confusion matrix K3 (varian terbaik)

```
true\pred          baik  rusak_ringan  rusak_sedang   rusak_berat
         baik         5             1             0             0
 rusak_ringan         6            28             2             0
 rusak_sedang         0             1             2             0
  rusak_berat         0             1             2             2
```

Bacaan:

| Masalah | Bukti |
|---|---|
| `rusak_sedang` nyaris tidak terdeteksi | hanya 2 dari 3 benar (test set memang cuma 3) |
| `rusak_berat` sering jatuh ke `rusak_sedang` | 2 dari 5 salah |
| `baik` → `rusak_ringan` | 1 dari 6 salah |
| Diagonal `rusak_ringan` mendominasi | 28 dari 37 — inilah sumber akurasi 74% |

**Akurasi tinggi berasal dari kelas mayoritas.** Untuk kelas minoritas performanya lemah.

Confusion matrix K2 hampir identik dengan K3; K1 jauh lebih buruk (`rusak_ringan` 22/36,
`rusak_sedang` 1/3).

---

## 6. Detail latihan K4

**Konfigurasi:**
```
base model   : indobenchmark/indobert-base-p1
epochs       : 3
batch size   : 16
max length   : 128
class weight : ya (WeightedTrainer, cross_entropy berbobot)
presisi      : fp16 (otomatis — CUDA terdeteksi)
GPU          : NVIDIA GeForce GTX 1650, compute 7.5 (Turing), 4,29 GB VRAM
akselerator  : accelerate 1.15.0
```

**Progres per epoch — indikasi overfit** (eval internal `trainer.evaluate()` pada split
validasi 10% data latih = **55 laporan**, bukan test set 50):

| Epoch | eval_loss | Akurasi | Macro-F1 |
|---|---|---|---|
| 1 | 1,057 | 21,82% | 0,3682 |
| 2 | 0,781 | 52,73% | 0,4890 |
| 3 | **0,7925** ↑ | 67,27% | 0,5414 |

`eval_loss` **naik** dari 0,781 ke 0,7925 saat akurasi ikut naik — model mulai menghafal data
latih. Menambah epoch akan memperburuk, bukan memperbaiki.

**Evaluasi test set 50 (sebanding dengan K1–K3, 21 Okt 2026):** akurasi **70,00%**,
macro-F1 **0,5722** — tetap di bawah K3 (74,00% / 0,6100) dan di bawah baseline
tebak-mayoritas (72,00%). Angka inilah yang dipakai di tabel §1.

**Waktu:** 270,8 detik (4,5 menit) untuk 93 langkah/epoch × 3 epoch = ~2,74 detik/langkah.

**Catatan teknis:**
- `bf16: True` pada header log adalah **flag argumen**, bukan konfirmasi presisi bf16. GTX 1650
  (Turing) tidak punya bf16; yang aktif adalah fp16. Sudah diverifikasi dari log.
- Peringatan `num_labels=4 incompatible with id2label map of length 5` — tidak berbahaya, model
  dasar punya 5 label bawaan.
- `classifier.weight MISSING` — normal, layer klasifikasi baru dibuat dan dilatih dari nol.
- Model tersimpan di `app/dataset/severity/models/indobert/` (**497 MB**) — **jangan di-commit**.

---

## 7. Lingkungan GPU (WSL)

`pytorch.org` dari lokasi Aris hanya **~70 KB/s**, dan wheel `cu124`/`cu126` berhenti di `cp313`
sedangkan venv memakai `cp314`. Solusinya **mirror Tsinghua**, yang menyediakan `torch 2.14.1`
`cp314` sudah berbundel CUDA 13.

```bash
cd backend
./venv/bin/pip install torch \
  --index-url https://pypi.tuna.tsinghua.edu.cn/simple \
  --trusted-host pypi.tuna.tsinghua.edu.cn
```

| Item | Nilai |
|---|---|
| Kecepatan mirror terukur | 350 KB/s – 2,2 MB/s |
| Total unduhan | ~3–4 GB |
| Paket terbesar | `torch` 554 MB · `nvidia-cudnn-cu13` 553 MB · `nvidia-cusparselt-cu13` 170 MB |
| Hasil | `torch 2.14.1+cu130` |
| Driver Windows | `CUDA Version: 13.1` → cocok dengan `cu130` |

Verifikasi lolos:
```
torch : 2.14.1+cu130 | cuda build : 13.0 | cuda avail : True
gpu   : NVIDIA GeForce GTX 1650 | compute 7.5 | VRAM 4,29 GB
uji matmul di GPU: OK
```

> ⚠️ `requirements.txt` masih mem-pin `torch==2.14.0` (CPU). **Jangan jalankan
> `pip install -r requirements.txt`** setelah memasang wheel CUDA — torch CPU akan terpasang kembali
> dan GPU hilang.

---

## 8. Kesimpulan

1. **K3 (TF-IDF + Linear SVM) dipakai untuk produksi** — akurasi tertinggi (74,00%), tanpa GPU,
   model ringan, dan dapat diaudit. `SEVERITY_METHOD="k3"` adalah pilihan yang benar.

2. **K4 (IndoBERT) tidak layak.** Akurasi lebih rendah (70,00%), butuh GPU, model 497 MB, overfit,
   dan sulit dijelaskan. Satu-satunya alasan memakainya adalah bila nanti ditambah data latih
   (≥1.000 per kelas) — saat itu kesimpulannya bisa berubah.

3. **Kendala utama bukan algoritma, melainkan kualitas label.** Semua varian berbagi label yang
   sama; 70,8% menumpuk di `rusak_ringan` dan 165 label meragukan. Mengganti classifier tidak akan
   memperbaiki masalah yang berasal dari label.

4. **Kontribusi metodologis yang bisa diklaim:** tabel ablation empat varian dengan angka akurasi
   pada test set independen, **beserta baseline tebak-mayoritas** sebagai pembanding. Menyertakan
   baseline adalah yang membuat angka itu bermakna — tanpa itu, "74%" terlihat lebih baik daripada
   kenyataannya.

---

## 9. Langkah yang direkomendasikan

| Prioritas | Tindakan | Alasan |
|---|---|---|
| **1** | Buat `docs/backend/RUBRIK_LABEL_MANUAL.md` (definisi `severity.py:25` + daftar periksa + aturan ambigu + penanda `ragu`) | **Ditunda ke minggu depan (≥ 28 Okt 2026)** — tanpa rubrik, penilaian manual subjektif |
| **2** | Isi 50 label **mode blind** via `test_50_blind.csv` (tanpa kolom `label_llm`) | Aris sudah mengetahui skor ablation → risiko *anchoring*; isian lama disimpan sebagai `v1` sebagai pembanding |
| **3** | Tinjau aturan prompt "kekurangan fasilitas → ringan" | Akar 165 label meragukan; perbaiki sebelum dipakai ground truth |
| **4** | Bila aturan diperbaiki → label ulang 600 dengan model lebih kuat | Distribusi lebih seimbang → ablation jadi bermakna |
| **5** | Jalankan `severity_ablation.py --labels manual` | Angka final untuk skripsi |
| **6** | Nyalakan `SEVERITY_ENABLED=true` setelah label disetujui | Cron mulai mengisi `kondisi_dilaporkan` |

### Keterbatasan yang wajib ditulis di skripsi

- **50 sampel terlalu kecil** untuk generalisasi ke populasi sekolah Lamongan.
- **Bias self-selection** — warga melapor saat ada masalah, sehingga kelas `baik` (12,8%) mungkin
  lebih kecil dari kenyataan. Classifier tidak bisa memperbaiki bias ini.
- **Label LLM belum diverifikasi manusia.** Angka di dokumen ini menggambarkan *kesepakatan model
  dengan LLM*, bukan *akurasi terhadap kebenaran*. Setelah 50 label manual terisi, angkanya
  kemungkinan turun.
- **Dua bias pada verifikasi manual yang harus diakui:** (1) penilaian dilakukan **setelah** skor
  ablation diketahui → risiko *anchoring* ke label LLM/prediksi model; (2) rencana awal tanpa
  rubrik baku → risiko subjektivitas antar-baris. Mitigasi disepakati 21 Okt 2026: rubrik tertulis
  sebelum menilai + isi ulang mode blind (`test_50_blind.csv`) + perbandingan isian `v1` vs `v2`
  sebagai ukuran anchoring. Bila mitigasi tidak dijalankan, angka `--labels manual` wajib
  ditandai *"penilaian tunggal verifikator tanpa rubrik, dalam kondisi tidak buta"*.
- **Test set 3 sampel untuk `rusak_sedang`** — terlalu kecil untuk klaim apa pun tentang kelas itu.

---

## 10. Berkas terkait

| Berkas | Isi |
|---|---|
| `backend/app/dataset/severity/labels_llm.jsonl` | 600 label LLM (kunci `kondisi`, `alasan`, `model`) |
| `backend/app/dataset/severity/train_550.jsonl` | data latih |
| `backend/app/dataset/severity/test_50.json` | data uji (50 entri) |
| `backend/app/dataset/severity/test_50.csv` | lembar verifikasi manual — kolom `label_manual` **kosong** |
| `backend/app/dataset/severity/test_50_ids.json` | 50 ID tetap (anti-bias) |
| `backend/app/dataset/severity/hasil/ablation_severity.json` | hasil ablation mentah (K1–K4, n=50) |
| `backend/app/dataset/severity/hasil/ablation_severity.md` | ringkasan + confusion matrix |
| `backend/app/dataset/severity/models/indobert/` | model K4 (**497 MB**, jangan di-commit) |
| `backend/scripts/finetune_severity_indobert.py` | skrip latih K4 |
| `backend/scripts/severity_ablation.py` | skrip ablation |
| `backend/app/ai_pipeline/severity.py` | implementasi K1 untuk produksi |

**Referensi dokumen proyek:** `docs/backend/CHANGELOG.md` §3.32 ·
`docs/backend/TASK_GUIDE.md` F4.16 · `docs/backend/SPEC_SEVERITY_KLASIFIKASI.md` §17
