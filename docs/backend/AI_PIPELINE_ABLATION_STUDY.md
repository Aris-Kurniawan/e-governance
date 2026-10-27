# AI Pipeline Ablation Study — Testing Framework

> Panduan lengkap untuk melakukan ablation study pada komponen AI pipeline SIMAKIS.
> Tujuan: Menemukan konfigurasi optimal dengan membandingkan variasi setiap komponen terhadap ground truth (manual clustering).

**Update terakhir:** 19 Oktober 2026 — tambahan: §2.1 A4 (Potion/model2vec, rencana), §11 (uji data nyata), §12 (ablation laporan dinamis), catatan misnomer A1

---

## Pendahuluan

AI pipeline SIMAKIS terdiri dari 5 komponen utama:
1. **Embedding** — Konversi teks laporan ke vektor numerik
2. **UMAP** — Reduksi dimensi
3. **HDBSCAN** — Algoritma clustering
4. **TF-IDF Labeling** — Penamaan klaster berdasarkan kata kunci
5. **Scoring** — Perhitungan skor prioritas (pasca-klaster, di luar grid ablation — lihat §10)

Untuk menemukan konfigurasi optimal, kami akan melakukan **ablation study** (pengujian setiap variasi) dan membandingkan hasilnya terhadap **ground truth (manual clustering)** yang dibuat berdasarkan pengetahuan domain.

### 0. Setup & Prerequisites

**0.1 Register Admin User**
- Register akun admin melalui `POST /auth/register` dengan peran `admin`
- Contoh: `NIK: 1234567890123456`, `email: admin@simakis.go.id`
- Pastikan user memiliki role `admin` di database

**0.2 Run CSV Ingest (F2.15)**
- Jalankan `POST /ingest/dapodik` dengan file `sekolah_lamongan_semua.csv`
- Pastikan 62 sekolah berhasil di-ingest ke database
- Verifikasi: `SELECT COUNT(*) FROM sekolah;` → harus 62

**0.3 Seed Dummy Laporan**
- Generate sekitar 100 laporan dummy dengan variasi:
  - `kondisi_dilaporkan`: `baik`, `rusak_ringan`, `rusak_sedang`, `rusak_berat`
  - `deskripsi`: **Teks bebas realistis** (contoh: "Atap ruang kelas 3 bocor saat hujan", "Laboratorium IPA tidak memiliki peralatan praktikum", "WC siswa tersumbat dan berbau tidak sedap", "Listrik sering mati mengganggu proses belajar")
  - **Tidak ada field `kategori`** — AI pipeline akan mengelompokkan berdasarkan teks deskripsi
  - Sebar ke 62 sekolah (1-3 laporan per sekolah)
- Simpan ke database langsung (via `scripts/setup_f300.py`)
- **Catatan:** Data ini untuk ablation study dan pengujian AI pipeline (dalam database) — bukan ground truth manual

**0.4 Verify Database Population**
```bash
# Verifikasi data di database
mysql -u root -p -e "USE simakis; SELECT COUNT(*) AS total_sekolah FROM sekolah; SELECT COUNT(*) AS total_laporan FROM laporan; SELECT COUNT(*) AS total_kondisi FROM kondisi_sarana;"

# Harus mendapatkan:
# total_sekolah: 62
# total_laporan: ≥ 100
# total_kondisi: 62 × (jenis-ruang) 
```

**0.5 Python Dependencies**
Pastikan library berikut terinstall di venv:
```bash
pip install sentence-transformers umap-learn hdbscan scikit-learn python-multipart minio
```
**Cek import sukses:**
```python
import sentence_transformers
import umap_learn
import hdbscan
import sklearn
print("All AI libraries ready")
```

---

## 1. Manual Clustering (Ground Truth)

### 1.1 Tujuan

Membuat "jawaban benar" berdasarkan pengetahuan domain untuk menjadi benchmark evaluasi AI pipeline. Ground truth ini digunakan untuk mengukur akurasi AI clustering dengan metrik NMI, ARI, dan Purity.

### 1.2 Pendekatan

Kelompokkan 62 sekolah ke dalam **5 kategori infrastruktur** berdasarkan masalah yang paling dominan di sekolah tersebut. Kategori ground truth = **hibrida**:

| Kategori | Sumber Data | Dasar Literatur |
|----------|-------------|-----------------|
| `ruang_belajar` | **Dapodik** `kondisi_sarana` | Permendiknas 24/2007 (Permendikbudriset 22/2023) — ruang kelas, perpustakaan, lab |
| `sanitasi_air` | **Dapodik** + laporan warga | UNICEF/WHO JMP WASH in Schools (SDG 4.a.1) — air, sanitasi, hygiene |
| `utilitas` | **Dapodik** + laporan warga | UNICEF/WHO JMP WASH SDG 4.a.1(a,b) — listrik, internet |
| `penunjang` | **Dapodik** `kondisi_sarana` | Permendiknas 24/2007 — UKS, tempat ibadah |
| `akses_lahan` | **Laporan warga** (teks) | Permendiknas 24/2007 (luas lahan) + NCES FCI (site improvements) |

**Metode per sekolah:**
1. **Baca `kondisi_sarana` Dapodik** — hitung jumlah rusak per kategori:
   - `ruang_belajar` ← `ruang_kelas`, `perpustakaan`, `lab_ipa`, `lab_komputer`
   - `sanitasi_air` ← `wc_guru`, `wc_siswa`
   - `penunjang` ← `uks`
2. **Baca laporan teks warga sekolah itu** — tambah skor untuk kategori yang tidak ada di Dapodik:
   - `utilitas` ← laporan tentang listrik/internet (Dapodik hanya punya jenis, bukan kondisi rusak)
   - `akses_lahan` ← laporan tentang jalan/pagar/drainase (tidak ada di Dapodik)
3. **Ambil kategori dominan** (skor tertinggi) → label cluster sekolah
4. **Tie-breaker:** pengetahuan domain (final review sebelum finalisasi)

### 1.3 Contoh Klaster Manual

Sesuai taksonomi 5 kategori infrastruktur:

```
Klaster 0: Ruang Belajar (kelas, lab, perpustakaan)
- SDN 3 Made: 11 ruang_kelas rusak (dominan), 1 perpustakaan rusak, 1 UKS rusak
- SDN 4 Made: 16 ruang_kelas rusak (dominan), 1 lab_komputer rusak, 3 WC rusak

Klaster 1: Sanitasi & Air (WC, air bersih, pembuangan)
- SDX Y: 8 WC siswa rusak berat (dominan), 2 ruang kelas rusak ringan

Klaster 2: Utilitas (listrik, internet, penerangan)
- SDX Z: Laporan warga: "Listrik sering mati, instalasi tua, kabel berbahaya"

Klaster 3: Akses & Lahan (jalan, pagar, drainase)
- SDX W: Laporan warga: "Jalan akses rusak parah, pagar bobol, halaman becek saat hujan"

Klaster 4: Fasilitas Penunjang (UKS, ibadah, olahraga, kantin)
- SDX V: 3 UKS rusak (dominan), tempat ibadah tidak ada
```

### 1.4 Format Output (manual_clusters.json)

```json
{
  "metadata": {
    "created_date": "2026-09-23",
    "total_schools": 62,
    "total_categories": 5,
    "source": "Hibrida: Dapodik kondisi_sarana (3 kategori) + laporan warga teks (2 kategori)"
  },
  "manual_clusters": {
    "c0": {
      "label": "ruang_belajar",
      "description": "Masalah ruang kelas, lab, perpustakaan — atap bocor, lantai retak, meja rusak, lab tidak fungsional",
      "source_dapodik": ["ruang_kelas", "perpustakaan", "lab_ipa", "lab_komputer"],
      "schools": ["20505816", "20505835", ...]  // NPSN list
    },
    "c1": {
      "label": "sanitasi_air",
      "description": "Toilet rusak, air bersih tidak tersedia, saluran pembuangan tersumbat",
      "source_dapodik": ["wc_guru", "wc_siswa"],
      "schools": ["20505824", ...]
    },
    "c2": {
      "label": "utilitas",
      "description": "Listrik padam, instalasi tua, internet mati",
      "source_dapodik": ["sumber_listrik", "akses_internet"],  // dari Dapodik jenis, bukan kondisi
      "source_laporan_warga": true,  // juga dari teks laporan (Dapodik tidak punya data kondisi)
      "schools": ["20505843", ...]
    },
    "c3": {
      "label": "akses_lahan",
      "description": "Jalan akses rusak, pagar rusak, drainase buruk, halaman becek",
      "source_dapodik": [],  // tidak ada di Dapodik
      "source_laporan_warga": true,  // semua dari teks laporan
      "schools": ["20505851", ...]
    },
    "c4": {
      "label": "penunjang",
      "description": "UKS tidak memadai, tempat ibadah rusak, lapangan olahraga rusak",
      "source_dapodik": ["uks"],
      "schools": ["20505867", ...]
    }
  }
}
```

### 1.5 Langkah Implementasi (F3.0a)

1. **Query semua 62 NPSN** dari tabel `sekolah`
2. **Untuk setiap NPSN:**
   - Baca `kondisi_sarana` dari Dapodik → hitung rusak per kategori (dominan = max count)
   - Baca `laporan` dari database → baca teks deskripsi → cari indikasi `utilitas` / `akses_lahan`
   - Tentukan kategori dominan (tie-breaker = domain knowledge)
3. **Simpan hasil ke `app/ai_pipeline/experiments/manual_clusters.json`**
4. **Verifikasi:** Semua 62 NPSN ada di salah satu klaster; distribusi merata (±12-13 per klaster)

**Script:**
```bash
cd backend
./venv/bin/python -c "
from app.models import Sekolah, Laporan, KondisiSarana
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json

# Setup DB connection
engine = create_engine('mysql+pymysql://root:dev123@localhost/simakis')
Session = sessionmaker(bind=engine)
session = Session()

# Build ground truth
ground_truth = {'manual_clusters': {}}

# ... implementasi logika ...

with open('app/ai_pipeline/experiments/manual_clusters.json', 'w') as f:
    json.dump(ground_truth, f, indent=2)

print('Ground truth saved to manual_clusters.json')
"
```

---

## 2. Variasi Komponen untuk Ablation Study

### 2.1 A — Embedding (Konversi Teks → Vektor)

Embedding adalah langkah pertama mengubah teks laporan menjadi angka yang bisa diproses clustering.

#### A1: SBERT Multilingual (paraphrase-multilingual-MiniLM-L12-v2)

> **Catatan Klarifikasi Model:** Di dalam kode dan log awal, varian ini sering dilabeli "IndoBERT" sebagai misnomer historis (`embedding.py` dan `run_ablation.py`). Model fisik yang sebenarnya diunduh dan dieksekusi adalah **`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`** (SBERT Multilingual, 118M parameter, 384 dimensi, ~471 MB). Model IndoBERT asli (`indobenchmark/indobert-base-p1`, 497 MB) hanya digunakan pada klasifikasi severity F4.16 (K4).

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Model transformer pre-trained (Sentence-BERT), menghasilkan vektor 384 dimensi |
| **Kelebihan** | Paham konteks & semantik lintas bahasa termasuk Bahasa Indonesia (multilingual), akurasi tinggi |
| **Kekurangan** | Butuh GPU/RAM (~471 MB), lambat tanpa GPU (~26–30 detik per batch) |
| **Cocok untuk** | Teks panjang (>10 kata), data banyak, butuh pemahaman konteks |
| **Contoh input** | "Atap ruang kelas 3 bocor saat hujan, plafon rusak" |
| **Contoh output** | `[0.023, -0.156, 0.892, ..., -0.341]` (384 angka) |
| **Library** | `sentence-transformers` |

**Ekspektasi hasil:** Klaster paling akurat karena model paham bahwa "atap bocor" dan "plafon rusak" termasuk kategori yang sama (Klaster 0: Ruang Kelas).

**Kode referensi:**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
embeddings = model.encode(texts)  # numpy array (N, 384)
```

---

#### A2: TF-IDF Langsung (Tanpa Embedding Neural)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Hitung frekuensi kata, bobot TF-IDF, tanpa neural network |
| **Kelebihan** | Sangat cepat (<1 detik), tidak butuh GPU, ringan |
| **Kekurangan** | Tidak paham konteks (hanya cocok kata persis), vektor sangat sparse |
| **Cocok untuk** | Teks pendek, data sedikit, resource terbatas |
| **Contoh input** | "Atap ruang kelas 3 bocor saat hujan, plafon rusak" |
| **Contoh output** | `[0, 0, 0.45, 0, 0.32, ..., 0]` (sparse, banyak nol) |
| **Library** | `scikit-learn` (TfidfVectorizer) |

**Ekspektasi hasil:** Klaster kurang akurat karena TF-IDF tidak paham bahwa "atap" dan "plafon" berkaitan. Berguna sebagai baseline untuk perbandingan.

**Kode referensi:**
```python
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(max_features=1000)
embeddings = vectorizer.fit_transform(texts)  # sparse matrix (N, 1000)
```

---

#### A3: MiniLM Tanpa Fine-Tuning

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Model ringan (22 juta parameter), vektor 384 dimensi |
| **Kelebihan** | Lebih cepat dari IndoBERT (~10 detik), kualitas cukup baik |
| **Kekurangan** | Kurang optimal untuk Bahasa Indonesia khusus |
| **Cocok untuk** | Keseimbangan antara kecepatan dan kualitas |
| **Contoh output** | `[0.012, -0.234, 0.765, ..., -0.432]` (384 angka) |
| **Library** | `sentence-transformers` |

**Ekspektasi hasil:** Kualitas sedikit di bawah IndoBERT (A1) tapi lebih cepat. Cocok jika hardware terbatas.

**Kode referensi:**
```python
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)  # numpy array (N, 384)
```

---

#### A4: Potion / model2vec — Embedding Statis Multilingual *(disetujui, siap diimplementasikan)*

| Aspek | Detail |
|-------|--------|
| **Status** | **Disetujui untuk diimplementasikan** — atas saran dosen (21 Okt 2026). `model2vec` sudah terpasang di venv (`pip install model2vec`); model belum ter-cache |
| **Cara kerja** | *Static embedding* (distilasi model2vec): tiap kata punya vektor tetap, dokumen = rata-rata (mean pooling) vektor kata — **tanpa** forward pass transformer, **tanpa** GPU |
| **Model** | `minishlab/potion-multilingual-128M` — multilingual (termasuk Indonesia), ~128 MB |
| **Ditolak** | `mixedbread-ai/mxbai-embed-large-v1` — English-only (tag HF `en`) → tidak layak untuk teks laporan berbahasa Indonesia |
| **Kelebihan** | CPU-only, inferensi statis (tidak dilatih ulang), ringan (~128 MB vs ~471 MB SBERT Multilingual), menangkap kemiripan semantik yang tidak dimiliki TF-IDF |
| **Kekurangan** | Tidak kontekstual (tanpa perhatian lintas kata) → kualitas semantik di bawah SBERT; unduhan model butuh jaringan |
| **Posisi ekspektasi** | Di antara A2 (TF-IDF) dan A1/A3 (SBERT): lebih "paham makna" dari TF-IDF, lebih murah dari MiniLM |
| **Library** | `model2vec` (sudah terpasang) |

**Alur eksekusi A4:**
```
45 dokumen laporan
       │
       ▼
StaticModel.from_pretrained("minishlab/potion-multilingual-128M").encode(teks)
       │   → vektor dense (dimensi ~256), CPU-only, tidak dilatih ulang
       ▼
UMAP B1/B2/B3  +  HDBSCAN C1/C2/C3  (dikontrol sama dengan A1–A3)
       │
       ▼
NMI, ARI, Purity, Noise ratio  →  dibandingkan tabel ABLATION_RESULTS.md
```

**Implementasi yang harus dikerjakan:**
1. Tambah branch `method="potion"` di `embedding.py` — lazy load `StaticModel`, fallback ke TF-IDF bila model tidak tersedia (konsisten dengan guard `FALLBACK_USED` di `run_ablation.py`).
2. Tambah `"potion"` ke `VARIANTS_A` di `run_ablation.py` → 27 kombinasi baru (A4 × B1–B3 × C1–C3 × D1–D3).
3. Jalankan 27 kombinasi → bandingkan NMI/ARI/Purity/Noise/waktu dengan A1–A3.
4. Tambah baris A4 ke tabel `ABLATION_RESULTS.md` (jangan timpa tabel 81 kombinasi lama — beri label terpisah).
5. Keputusan adopsi: bila A4 menang → ganti default `pipeline.py` + catat di `DECISIONS.md` (D-24+); bila kalah → tetap A2, hasil A4 tetap dilaporkan.

**Target tabel perbandingan setelah A4 selesai:**

| Kode | Model | Ukuran | NMI terbaik | Waktu | GPU? |
|------|-------|--------|-------------|-------|------|
| A1 | `paraphrase-multilingual-MiniLM-L12-v2` | ~278 MB | 0,2311 | — | Opsional |
| A2 | TF-IDF 300 fitur | ~0 MB | **0,3874** ← production | ~detik | Tidak |
| A3 | `all-MiniLM-L6-v2` | ~90 MB | 0,3555 | — | Opsional |
| **A4** | `potion-multilingual-128M` | ~128 MB | 0,1958 (seimbang) / 0,4413* (noise 88.7%) | <1 detik | **Tidak** |

**Catatan penamaan (penting untuk laporan).** A1 di dokumen ini dinamai "IndoBERT", tetapi model yang benar-benar dipakai adalah `paraphrase-multilingual-MiniLM-L12-v2` (SBERT multilingual, ±118M parameter, 384 dimensi) — **bukan** IndoBERT. `embedding.py:35` menyebutnya `"indobert"` sebagai misnomer historis. Model IndoBERT asli (`indobenchmark/indobert-base-p1`, bare MLM+NSP tanpa pooling head) maupun SBERT Indonesia (`firqaaa/indo-sentence-bert-base`, 768 dimensi) **belum pernah diuji** di proyek ini — jangan mengklaim keduanya sebagai hasil ablation.

---

### 2.2 B — UMAP (Dimensionality Reduction)

UMAP mengurangi dimensi vektor embedding dari 384 → N dimensi sebelum masuk HDBSCAN, untuk meningkatkan kualitas clustering.

#### B1: Dengan UMAP (n_components=10)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Proyeksikan vektor 384D ke 10D, menjaga struktur lokal |
| **Kelebihan** | Meningkatkan kualitas clustering, mengurangi noise |
| **Kekurangan** | Menambah satu layer komputasi (~5 detik), parameter perlu di-tune |
| **Cocok untuk** | Vektor embedding berdimensi tinggi (>100) |
| **Parameter** | `n_components=10`, `metric='cosine'`, `n_neighbors=15` |
| **Library** | `umap-learn` |

**Ekspektasi hasil:** Klaster lebih terpisah karena UMAP menghilangkan noise dan menjaga struktur data.

**Kode referensi:**
```python
from umap import UMAP

reducer = UMAP(n_components=10, metric='cosine', n_neighbors=15)
reduced = reducer.fit_transform(embeddings)  # numpy array (N, 10)
```

---

#### B2: Tanpa UMAP (Langsung ke HDBSCAN)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Vektor 384D langsung dimasukkan ke HDBSCAN |
| **Kelebihan** | Lebih simpel, satu layer komputasi kurang |
| **Kekurangan** | HDBSCAN bisa kesulitan dengan data berdimensi tinggi (curse of dimensionality) |
| **Cocok untuk** | Vektor embedding sudah rendah dimensi (<50) |

**Ekspektasi hasil:** Klaster mungkin kurang akurat atau noise tinggi karena HDBSCAN bekerja lebih baik di dimensi rendah.

---

#### B3: UMAP n_components=5

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Proyeksikan ke 5D (lebih agresif dari B1) |
| **Kelebihan** | Lebih cepat dari B1, lebih agresif mengurangi noise |
| **Kekurangan** | Bisa kehilangan informasi terlalu banyak |
| **Cocok untuk** | Data dengan noise tinggi |

**Ekspektasi hasil:** Bisa lebih baik dari B1 jika data sangat noisy, atau lebih buruk jika informasi penting hilang.

---

### 2.3 C — HDBSCAN (Clustering)

HDBSCAN menentukan klaster mana yang masuk ke kelompok mana. Parameter min_cluster_size dan min_samples kritis untuk kualitas hasil.

#### C1: min_cluster_size=5, min_samples=3 (Default)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Klaster minimal 5 data, setiap klaster minimal 3 titik tetangga |
| **Kelebihan** | Seimbang antara jumlah klaster dan ukuran klaster |
| **Kekurangan** | Default mungkin tidak optimal untuk semua data |
| **Cocok untuk** | Dataset sedang (50-500 data) |
| **Library** | `hdbscan` |

**Ekspektasi hasil:** ~5-10 klaster dengan ukuran seimbang.

**Kode referensi:**
```python
from hdbscan import HDBSCAN

clusterer = HDBSCAN(min_cluster_size=5, min_samples=3)
labels = clusterer.fit_predict(vectors)  # numpy array of labels (-1=outlier)
```

---

#### C2: min_cluster_size=3, min_samples=2 (Sensitif)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Klaster minimal 3 data, lebih sensitif menemukan klaster kecil |
| **Kelebihan** | Menemukan klaster yang lebih spesifik/niche |
| **Kekurangan** | Bisa terlalu banyak klaster kecil, noise tinggi |
| **Cocok untuk** | Ingin menemukan pola spesifik/niche |

**Ekspektasi hasil:** ~10-15 klaster, beberapa mungkin sangat kecil (3-4 data). Mungkin banyak outlier.

---

#### C3: min_cluster_size=10, min_samples=5 (Konservatif)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Klaster minimal 10 data, hanya klaster besar yang terbentuk |
| **Kelebihan** | Klaster lebih robust, mengurangi noise |
| **Kekurangan** | Bisa kehilangan klaster kecil tapi penting |
| **Cocok untuk** | Ingin klaster besar dan general |

**Ekspektasi hasil:** ~3-5 klaster besar, banyak data masuk outlier (-1).

---

### 2.4 D — TF-IDF Labeling (Penamaan Klaster)

TF-IDF digunakan untuk memberi label/nama pada klaster berdasarkan kata kunci. Ini adalah post-processing setelah clustering.

#### D1: Unigram Only

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Hanya kata tunggal (1 kata) sebagai fitur |
| **Kelebihan** | Simpel, interpretabel |
| **Kekurangan** | Bisa kehilangan konteks frasa |
| **Contoh label** | "atap", "rusak", "guru" |
| **Library** | `scikit-learn` (TfidfVectorizer) |

**Ekspektasi hasil:** Label klaster sederhana tapi kurang spesifik. Misal: Klaster 0 diberi label "atap" atau "rusak".

**Kode referensi:**
```python
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(ngram_range=(1, 1), max_features=100)
tfidf_matrix = vectorizer.fit_transform(cluster_texts)
top_terms = vectorizer.get_feature_names_out()[tfidf_matrix.toarray().argsort()[:,-3:]]
```

---

#### D2: Unigram + Bigram

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Kata tunggal + pasangan kata (2 kata berurutan) |
| **Kelebihan** | Menangkap frasa seperti "ruang kelas", "guru tetap" |
| **Kekurangan** | Lebih kompleks, bisa ada noise dari bigram jarang |
| **Contoh label** | "atap bocor", "ruang kelas", "guru tetap" |

**Ekspektasi hasil:** Label klaster lebih deskriptif dan akurat. Misal: Klaster 0 diberi label "atap bocor" atau "ruang kelas rusak".

**Kode referensi:**
```python
vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=100)
```

---

#### D3: Dengan Stopword Removal Tambahan

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Hapus kata umum (yang, di, ke, dari, untuk, dll) + kata domain umum |
| **Kelebihan** | Label hanya menampilkan kata bermakna |
| **Kekurangan** | Perlu daftar stopword yang tepat untuk konteks pendidikan |
| **Contoh stopword tambahan** | "sekolah", "siswa", "ruang" (terlalu umum di dataset pendidikan) |

**Ekspektasi hasil:** Label klaster lebih fokus pada masalah spesifik. Misal: Klaster 0 diberi label "bocor" atau "rusak berat" (bukan "ruang bocor").

**Kode referensi:**
```python
stopwords_custom = {'sekolah', 'siswa', 'ruang', 'dan', 'yang', 'di', 'dari', ...}
vectorizer = TfidfVectorizer(stop_words=list(stopwords_custom), max_features=100)
```

---

## 3. Metric Evaluasi

Untuk membandingkan hasil clustering AI vs ground truth, gunakan metrik berikut:

### 3.1 Internal Metrics (Tanpa Ground Truth)

| Metric | Formula | Interpretasi | Cocok untuk |
|--------|---------|--------------|-------------|
| **Silhouette Score** | [-1, 1] | Semakin tinggi semakin baik. 1 = sempurna, 0 = ambigu, -1 = salah | Evaluasi internal, cepat |
| **Davies-Bouldin Index** | [0, ∞] | Semakin rendah semakin baik | Perbandingan antar config |
| **Calinski-Harabasz Index** | [0, ∞] | Semakin tinggi semakin baik | Evaluasi internal |

**Kode referensi:**
```python
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score

silhouette = silhouette_score(vectors, labels)
davies_bouldin = davies_bouldin_score(vectors, labels)
calinski_harabasz = calinski_harabasz_score(vectors, labels)
```

---

### 3.2 External Metrics (vs Ground Truth)

| Metric | Formula | Interpretasi | Cocok untuk |
|--------|---------|--------------|-------------|
| **Purity** | [0, 1] | % klaster yang sesuai manual. 1 = sempurna | Evaluasi presisi vs ground truth |
| **NMI** (Normalized Mutual Information) | [0, 1] | Similaritas klaster AI vs manual. 1 = identik | Evaluasi informativeness |
| **ARI** (Adjusted Rand Index) | [-1, 1] | Kesamaan pasangan data. 1 = identik, 0 = random | Evaluasi robustness |
| **Homogeneity, Completeness, V-measure** | [0, 1] | Homogenitas (klaster pure) + Completeness (semua data sejenis dalam klaster) | Evaluasi balance |

**Kode referensi:**
```python
from sklearn.metrics import purity_score, normalized_mutual_info_score, adjusted_rand_score
from sklearn.metrics import homogeneity_score, completeness_score, v_measure_score

purity = purity_score(manual_labels, ai_labels)
nmi = normalized_mutual_info_score(manual_labels, ai_labels)
ari = adjusted_rand_score(manual_labels, ai_labels)
homogeneity = homogeneity_score(manual_labels, ai_labels)
completeness = completeness_score(manual_labels, ai_labels)
v_measure = v_measure_score(manual_labels, ai_labels)
```

---

### 3.3 Manual Review (Kualitatif)

Selain metrik, lakukan manual review:

| Aspek | Pertanyaan |
|-------|-----------|
| **Label Relevansi** | Apakah label klaster (dari TF-IDF) cocok dengan isi klaster? |
| **Separasi Klaster** | Apakah klaster terpisah dengan jelas, atau ada overlap? |
| **Outlier Handling** | Apakah outlier (-1) masuk akal, atau ada error? |
| **Interpretability** | Mudah dijelaskan ke stakeholder? |

---

## 4. Struktur File & Direktori

```
app/ai_pipeline/
├── experiments/
│   ├── __init__.py
│   ├── run_ablation.py              # Script utama ablation study
│   ├── evaluation.py                # Fungsi evaluasi (silhouette, purity, NMI, ARI)
│   ├── manual_clusters.json         # Ground truth dari manual clustering
│   ├── results/                     # Hasil percobaan (auto-generated)
│   │   ├── A1_B1_C1_D1.json        # Kombinasi parameter
│   │   ├── A1_B1_C1_D2.json
│   │   ├── A1_B1_C2_D1.json
│   │   └── ...
│   └── summary_report.csv           # Summary semua percobaan
├── embedding.py                     # F3.1 (fungsi embed_texts)
├── reduction.py                     # F3.2 (fungsi reduce_dimensions)
├── clustering.py                    # F3.3 (fungsi cluster_texts)
├── labeling.py                      # F3.4 (fungsi label_clusters)
├── scoring.py                       # F3.5 (fungsi calculate_priority_score)
└── pipeline.py                      # Pipeline utama (komponen terbaik)
```

---

## 5. Alur Kerja Ablation Study

```
Step 1: Persiapan Data
├── List semua 62 NPSN
├── Baca laporan tiap sekolah dari DB
└── Simpan ke temporary file

Step 2: Manual Clustering (Kamu)
├── Kelompokkan 62 sekolah manual
├── Buat manual_clusters.json
└── Verifikasi

Step 3: Jalankan run_ablation.py
├── Loop semua kombinasi (A1-A3 × B1-B3 × C1-C3 × D1-D3)
│   ├── Run embedding (A)
│   ├── Run reduction (B)
│   ├── Run clustering (C)
│   ├── Run labeling (D)
│   ├── Hitung metrics (internal + external)
│   └── Simpan ke results/{config}.json
└── Generate summary_report.csv

Step 4: Analisis Hasil
├── Buka summary_report.csv
├── Sort by NMI/ARI (external metrics)
├── Identifikasi top 5 konfigurasi
└── Manual review hasil top 5

Step 5: Pilih Konfigurasi Optimal
├── Diskusikan dengan dosen
├── Pilih 1 config terbaik
└── Update pipeline.py dengan config terbaik

Step 6: Dokumentasi
├── Tulis laporan hasil ablation study
├── Buat visualisasi perbandingan metric
└── Simpan ke docs/backend/ABLATION_RESULTS.md
```

---

## 6. Estimasi Jumlah & Waktu Percobaan

### 6.1 Kombinasi Parameter

| Variabel | Jumlah Opsi |
|----------|------------|
| Embedding (A) | 4 (A1, A2, A3, **A4**) |
| UMAP (B) | 3 (B1, B2, B3) |
| HDBSCAN (C) | 3 (C1, C2, C3) |
| TF-IDF (D) | 3 (D1, D2, D3) |
| **Total kombinasi awal** | 3 × 3 × 3 × 3 = **81** (sudah selesai) |
| **Tambahan A4** | 1 × 3 × 3 × 3 = **27** kombinasi baru |
| **Total keseluruhan** | **108** kombinasi |

> **Catatan (21 Okt 2026):** A4 (Potion/model2vec) **disetujui** atas saran dosen. 27 kombinasi A4 wajib dilaporkan **terpisah** dari 81 kombinasi asli agar tabel lama tetap dapat direproduksi — jangan timpa baris A1–A3 di `ABLATION_RESULTS.md`.

### 6.2 Estimasi Waktu Per Kombinasi

| Komponen | Waktu (CPU only) | Waktu (GPU) |
|----------|------------------|------------|
| Embedding A1 (IndoBERT/MiniLM multilingual) | ~30 detik | ~5 detik |
| Embedding A2 (TF-IDF) | ~1 detik | - |
| Embedding A3 (MiniLM small) | ~10 detik | ~2 detik |
| **Embedding A4 (Potion static)** | **~2–5 detik** | **- (CPU-only)** |
| UMAP | ~5 detik | - |
| HDBSCAN | ~2 detik | - |
| TF-IDF Labeling | ~1 detik | - |
| Evaluasi Metrics | ~2 detik | - |
| **Total per kombinasi** | **~40 detik (worst case A1)** | **~10 detik** |
| **Total 81 kombinasi** | **~54 menit (CPU)** | **~13.5 menit (GPU)** |

**Rekomendasi:** Gunakan GPU jika tersedia untuk mempercepat.

---

## 7. Ringkasan Ekspektasi Hasil

| Kombinasi | Kualitas | Kecepatan | Catatan |
|-----------|----------|-----------|---------|
| A1+B1+C1+D2 | ⭐⭐⭐⭐⭐ | Lambat | Full pipeline dengan IndoBERT + Bigram (kemungkinan terbaik) |
| A2+B1+C1+D1 | ⭐⭐ | Cepat | Baseline tanpa neural network |
| A3+B2+C2+D2 | ⭐⭐⭐⭐ | Sedang | Kompromi resource vs kualitas |
| A1+B2+C3+D1 | ⭐⭐⭐ | Sedang | Klaster besar, label sederhana (robust) |
| A2+B2+C2+D3 | ⭐⭐⭐ | Cepat | TF-IDF lightweight + custom stopword |

---

## 8. Next Steps

1. **Step 1 (Hari 1):** Buat `manual_clusters.json` dengan manual clustering 62 sekolah
2. **Step 2 (Hari 2-3):** Implementasikan `run_ablation.py` dan `evaluation.py`
3. **Step 3 (Hari 4):** Jalankan ablation study (54 menit ~ 2 jam dengan overhead)
4. **Step 4 (Hari 5):** Analisis hasil, manual review top 5 config
5. **Step 5 (Hari 6):** Update `pipeline.py` dengan config terbaik
6. **Step 6 (Hari 7):** Dokumentasi hasil

**Total estimasi: 1 minggu** (termasuk implementasi kode).

---

## 9. Augmentasi Data & Eksperimen Skala (F3.23)

> **Latar belakang.** Ablation awal (bagian 1–8) dijalankan pada **45 dokumen**
> yang dibangun dari **54 kalimat template** (`scripts/setup_f300.py`). Karena
> teksnya sangat berulang, hasilnya bias: TF-IDF menang telak, sedangkan
> IndoBERT/MiniLM tidak menunjukkan kekuatannya (butuh variasi makna & skala).
> Saran dosen: bandingkan **jumlah laporan sedikit vs banyak**. Bagian ini
> mendesain dataset laporan sarpras yang **bervariasi kosakata** dan **ber-
> skala**, untuk memetakan kurva NMI TF-IDF vs neural.

### 9.1 Kenapa data sebelumnya tidak adil untuk neural

- Kosakata efektif hanya **54 kalimat unik** (10–14 per kategori).
- 100 laporan = random pick dari pool itu → tiap kalimat dipakai ulang 1–2×.
- 45 dokumen ablation = gabungan kalimat yang sama per sekolah.
- Akibatnya: pengelompokan "mudah" karena dokumen se-kategori literal identik;
  neural tidak punya variasi semantik yang dibutuhkan untuk bersinar.

### 9.2 Sumber variasi teks

| Level | Teknik | Contoh (kategori ruang_belajar) |
|-------|--------|--------------------------------|
| Struktur | Balik urutan kalimat | "Atap kelas bocor saat hujan, plafon rusak" → "Plafon rusak, atap kelas bocor saat hujan" |
| Sinonim | Ganti kata dengan makna sama | "rusak" → "pecah/hancur" ; "bocor" → "rembes" |
| Gaya | Formal ↔ kasual | "Atap ruang kelas mengalami kebocoran" ↔ "Atap kelasnya udah bocor tiap hujan" |
| Gabung | Satukan 2 topik se-kategori | "atap bocor" + "lantai keramik pecah" → 1 laporan |
| Konteks | Tambah lokasi/keparahan | "...berbahaya bagi siswa dan mengganggu KBM" |

### 9.3 Skala data (sweep)

```
n = 45 → 150 → 500 → 1.500
```

Untuk tiap n, jalankan kombinasi:
- **A2** (TF-IDF)  vs  **A1/A3** (IndoBERT/MiniLM)
- **B1** (UMAP n=10) + **C2** (HDBSCAN min_cluster_size=3, min_samples=2)
- Ukur **NMI & purity** vs ground truth.

**Output:** tabel/grafik NMI vs jumlah laporan per metode → titik crossover
(jumlah laporan di mana neural menyusul / mendekati TF-IDF).

### 9.4 Ground truth

Variasi yang dihasilkan **menjaga label kategori template induk** → label
otomatis. Ini independen terhadap representasi (bukan dari fitur model), jadi
tidak menimbulkan bias melingkar.

### 9.5 Ruang lingkup & fase lanjutan

- **Task ini (F3.23):** template baru + generator augmentasi + dataset + sweep.
- **Fase lanjutan (di luar F3.23):** fine-tuning IndoBERT/MiniLM di data domain
  untuk benar-benar "melatih" model — baru di titik inilah neural berpeluang
  mengungguli TF-IDF.

### 9.6 Deliverable

- `app/ai_pipeline/experiments/generate_augmented.py` (generator variasi)
- Pool template diperluas (54 → ±150–250 unik)
- Output augmentasi per n (`dataset_aug_{n}.json`)
- Hasil sweep (`results/` + ringkasan)

---

## 10. Metode Perhitungan Skor Keparahan & Skor KBM

> **Status:** ✅ **diimplementasikan (F4.12, 20 Okt 2026)** di `app/ai_pipeline/scoring.py`
> (`compute_prior`, `calculate_kbm_score`, `is_mismatch`, `estimate_k`), dipakai dua call site
> (`routers/laporan.py`, `routers/sekolah.py`). Tidak butuh migrasi DB (tetap on-the-fly).

### 10.1 Posisi dalam pipeline (bukan komponen ablation)

Skoring adalah **lapisan setelah klaster terbentuk**, bukan input ke HDBSCAN
(`PRD.md` §6.2, `DECISIONS.md` D-04). Karena itu ia **tidak** punya varian
A/B/C/D dan **tidak diuji** dalam ablation study §1–§8:

```
laporan.deskripsi → A2 (TF-IDF) → B1 (UMAP) → C2 (HDBSCAN) → D1 (label)
                                                                    ↓
                                                    ← skoring (§10 ini)
```

Konsekuensi metodologis: konfigurasi A2+B1+C2+D1 dipilih lewat NMI/purity,
sedangkan bobot skoring dipilih lewat **expert judgment + literatur**. Dua
mekanisme pemilihan yang berbeda — jangan dicampur saat menulis laporan.

### 10.2 Skala severity laporan warga

| `kondisi_dilaporkan` | Severity |
|---|---|
| `baik` | 0 |
| `rusak_ringan` | 33 |
| `rusak_sedang` | 66 |
| `rusak_berat` | 100 |

**Dasar:** interpolasi linear ordinal, `severity(i) = i / (n − 1) × 100` untuk
`i = 0…3` dan `n = 4` tingkat. Keluarga angka yang sama dipakai Kementerian
Pendidikan untuk penilaian kerusakan bangunan sekolah — Dirjen PAUDDIKDASMEN
memakai `0.2 / 0.4 / 0.6 / 0.8` (`= i/5`, empat tingkat) dalam
*"Analisis Tingkat Kerusakan Bangunan"*. Jadi 33/66/100 **bukan angka
sembarang**, melainkan pemetaan linear yang sama pada skala 0–100.

Nilai `None` atau di luar enum **dibuang dari rata-rata**, bukan dihitung 0
(`scoring.py` `calculate_kbm_score`).

### 10.3 Komponen Dapodik

```
skor_dapodik = Σ(berat×100 + sedang×66 + ringan×33) / Σ(jumlah seluruh ruang)
```

Pembilang = ruang rusak berbobot; penyebut = **seluruh** ruang termasuk yang
baik. Skala 0–100. Definisi 4 tingkat kerusakan mengacu Panduan Sarpras
Dapodik (Kemendikdasmen), yang juga menetapkan ambang resmi:

| Tingkat | Ambang bobot kerusakan |
|---|---|
| Rusak Ringan | 1–30% |
| Rusak Sedang | 31–45% |
| Rusak Berat | 46–100% |

### 10.4 Shrinkage komponen laporan (yang diterapkan)

**Masalah:** rata-rata severity dari 3 laporan diperlakukan setara dengan
rata-rata dari 15 laporan. Pada data live, sekolah peringkat 1
(SDN 2 SENDANGREJO) mendapat `skor_kbm = 76.4` dari **n = 3**, sementara
SMK MUHAMMADIYAH 4 dengan **n = 15** mendapat 21.7.

**Solusi:** shrinkage empirical Bayes terhadap prior global.

```
λ            = n / (n + K)
prior        = Σ(skor_laporan_i × n_i) / Σ(n_i)        # dibobot jumlah laporan
skor_laporan = λ × mean_severity + (1 − λ) × prior
```

- `n` = jumlah laporan sekolah dengan enum valid
- `K` = kekuatan prior, **default 5** — **kebijakan, bukan estimasi data**
  (dasar lengkap di §10.4.1). Nilai uji alternatif: 3 (permisif), 10 (konservatif).
- `prior = 49.7` pada data live (62 sekolah, 600 laporan), **dihitung ulang per request**
- `n = 0` → `skor_laporan = 0` (aturan cakupan D-22: tanpa laporan = tanpa klaim;
  **bukan** ditarik ke prior)

### 10.4.1 Dasar parameter K — kebijakan, wajib dihitung ulang

**Asal metode.** Bentuk shrinkage di §10.4 identik dengan *credibility theory*
Bühlmann (1967): `Z = n / (n + K)` dengan `K = EPV / VHM`, yaitu rasio
*expected value of process variance* (variasi **di dalam** sekolah) terhadap
*variance of hypothetical means* (variasi **antar**-sekolah). Bentuk yang sama
dipakai sebagai *Bayesian average* pada peringkat IMDb:
`WR = (v/(v+m))·R + (m/(v+m))·C`, sehingga `m` IMDb setara `K` kita.

**Tiga tafsir K** (dipakai konsisten di dokumen ini):

1. **Titik 50%** — saat `n = K`, data sekolah dan prior berbobot sama
   (CAS: *"K can be thought of as the criteria for half credibility"*).
2. **Laporan bayangan** — formula setara menambahkan `K` laporan fiktif
   bernilai `prior` ke `n` laporan nyata.
3. **Konservatisme** — makin besar K, makin kecil bobot data sekolah.

**Status angka 5: kebijakan, bukan hasil estimasi.**
`K = 5` **tidak** dihitung dari data dev. Angka ini ditetapkan sebagai ambang
kebijakan ("±5 laporan sebelum data sekolah dipercaya"), analog dengan IMDb
yang menetapkan `m = 25.000` sebagai *"minimum ratings required to be listed"* —
juga angka pilihan manusia, bukan estimasi. Praktik lain menyarankan heuristik
berbeda (mis. kuartil-1 jumlah vote), yang justru menegaskan **tidak ada nilai
K universal**.

**Apa kata data dev (jangan diklaim sebagai validasi K).**
Method of moments pada 62 sekolah / 600 laporan: `EPV = 1420,8`,
`VHM = −2,5` → `K = EPV/VHM` **tidak terdefinisi**. Aturan baku credibility:
bila `VHM ≤ 0`, kredibilitas = 0 (tarik penuh ke prior). Validasi silang
(prediksi laporan yang disisihkan) juga menurun monoton menuju "prior saja":
`K=0 → MSE 1593,4 · K=5 → 1485,3 · K=50 → 1420,0 · K=∞ → 1415,9`.
Penyebabnya: data dev **sintetis** (600 laporan dibuat 5 Okt 2026, sebaran
severity hampir seragam), sehingga variasi antar-sekolah ≈ 0. Artinya `K = 5`
masih **lebih percaya data** daripada yang didukung data dev — wajar untuk data
sintetis, tetapi **bukan bukti bahwa 5 benar**.

**Syarat sebelum produksi (gate):**

1. Hitung ulang `K` dari laporan riil dengan `K = EPV/VHM` (method of moments),
   lalu bandingkan dengan `K` yang meminimalkan error validasi silang.
2. Bila `VHM ≤ 0` → set kredibilitas 0 (skor = prior) **atau** pertahankan
   kebijakan dengan catatan eksplisit; jangan menyajikan peringkat per-sekolah
   sebagai bermakna.
3. Simpan hasil estimasi + tanggal + jumlah laporan pada dokumentasi rilis.
4. `K = 5` tetap menjadi *default* sampai langkah 1–3 dijalankan; nilai `K`
   disimpan sebagai parameter konfigurasi, bukan tersebar sebagai literal di kode.

**Batasan yang wajib disebut saat presentasi:** laporan warga *self-selected*
(bukan sampel acak), skala severity hanya 4 nilai, dan prior idealnya
per-jenjang (SD/SMP/SMK) bila jumlah laporan per jenjang memadai.

### 10.5 Formula final

```
skor_laporan  = shrinkage(mean_severity, n, prior, K)
skor_dapodik  = Σ(berat×100 + sedang×66 + ringan×33) / Σ(jumlah ruang)
skor_kbm      = 0.7 × skor_laporan + 0.3 × skor_dapodik
```

**Dasar pembobotan:** Simple Additive Weighting (SAW) — Machado & Santos (2024)
memakai SAW dengan bobot diturunkan lewat Delphi untuk evaluasi performa
bangunan sekolah (71 subkriteria → 12 kriteria → 2 dimensi, `SCORE = Σ(skor
berbobot) / jumlah kriteria berlaku`). Bobot `0.7 / 0.3` adalah **expert
judgment tim**, bukan hasil AHP/Delphi — jika ditanya, nyatakan demikian.

Indikasi arah (bukan justifikasi bobot): Barrett et al. (2015) menemukan
parameter *naturalness* ruang kelas (cahaya, suhu, kualitas udara) menyumbang
~50% dampak desain terhadap progres belajar dari total 16% variansi yang
terjelaskan — konsisten dengan memberi bobot dominan pada persepsi pengguna
ruang (laporan warga) dibanding agregat Dapodik.

**Level:**

| `skor_kbm` | Level |
|---|---|
| ≥ 70 | `kritis` |
| 50–69 | `tinggi` |
| 40–49 | `sedang` |
| < 40 | `rendah` |

Turunan ke `sekolah.penanda_masalah` (D-23): `kritis` → `kritis`;
`tinggi`/`sedang` → `perlu_perhatian`; `rendah` → `aman`.

### 10.6 Flag mismatch (bukan bagian skor)

13 dari 62 sekolah punya `skor_dapodik = 0.0` (seluruh ruang kondisi baik),
sehingga `skor_kbm` maksimum mereka **70.0** — secara struktural tidak mungkin
mencapai `kritis`. Contoh: SD MUHAMMADIYAH 1 LAMONGAN, `skor_laporan` 74,2 (sebelum shrinkage) → **67,4**
(setelah shrinkage) tetapi `skor_kbm` hanya **47,2** karena Dapodik 0.

Ini **bukan bug** dan **tidak boleh** diperbaiki dengan mengubah bobot —
ini sinyal mismatch antara laporan warga dan Dapodik, yaitu inti mekanisme
"Sanggah Data" (D-20). Ditangani lewat flag terpisah:

```python
mismatch = skor_laporan >= 50 and skor_dapodik == 0
```

Sekolah `mismatch = True` masuk panel verifikator sebagai kandidat sanggahan.
Skor tidak dinaikkan artifisial.

### 10.7 Hasil uji pada data live (62 sekolah, K = 5)

| Sekolah | n | `skor_kbm` sekarang | Setelah shrinkage | Level |
|---|---|---|---|---|
| SDN 2 SENDANGREJO | 3 | 76.4 | **69.2** | `kritis` → `tinggi` |
| SDN 1 MADE | 7 | 40.9 | 38.8 | `sedang` → `rendah` |
| SDN KEPATIHAN | 10 | 53.5 | 47.3 | `tinggi` → `sedang` |
| SMP NEGERI 3 LAMONGAN | 12 | 53.4 | 48.2 | `tinggi` → `sedang` |
| SMP MURNI SUNAN DRAJAT | 10 | 47.7 | 50.0 | `sedang` → `tinggi` |
| SDN 1 SUKOMULYO | 8 | 39.8 | 44.3 | `rendah` → `sedang` |
| SDN TLOGOANYAR | 13 | 49.8 | 50.5 | `sedang` → `tinggi` |
| SD MUHAMMADIYAH 1 | 13 | 52.0 | 47.2 | `tinggi` → `sedang` |

**8 dari 62 sekolah berpindah level.** Distribusi berubah dari
`rendah 22 · sedang 21 · tinggi 18 · kritis 1` menjadi
`rendah 22 · sedang 22 · tinggi 18 · kritis 0` — tidak ada lagi sekolah
berlevel `kritis` yang dasarnya 3 sampel.

### 10.8 Alternatif yang ditolak

| Kandidat | Alasan ditolak |
|---|---|
| **Facility Condition Index (NCES)** | Butuh `cost to correct` + `replacement value`; proyek infrastruktur-only, data biaya tidak tersedia. NCES sendiri menolak pembobotan ordinal: *"aggregating these measurements would require a complex (and highly subjective) weighting formula"* → alternatifnya biaya perbaikan. |
| **Formula per-komponen Kemendikbud** (`Σbobot komponen / Σtotal`, mis. kolom/balok/atap) | Butuh data per komponen (lebar retak, tulangan terlihat). Dapodik hanya menyediakan agregat per jenis ruang. |
| **AHP penuh** | Butuh kuesioner pakar + uji consistency ratio. Layak bila ada waktu; belum dijalankan sehingga **tidak boleh diklaim**. |
| **Vote-only** | Ditolak di D-06 — isu ringan tapi ramai mengalahkan isu serius. |

### 10.9 Parameter yang dapat diuji (bukan bagian ablation A/B/C/D)

| Parameter | Default | Alternatif | Efek |
|---|---|---|---|
| `K` (kekuatan prior) | 5 | 3 / 10 | Kecil → responsif terhadap n kecil; besar → konservatif |
| `prior` | 49.7 (dinamis dari data) | konstanta 50 | Dinamis lebih tahan terhadap drift data |
| Bobot laporan : Dapodik | 0.7 : 0.3 | 0.5 : 0.5, 0.8 : 0.2 | Sensitivitas bisa dilaporkan sebagai analisis, bukan diubah di produksi |

Jika parameter ini diuji, laporkan sebagai **analisis sensitivitas skoring** —
terpisah dari tabel ablation A/B/C/D, karena metriknya berbeda (bukan NMI,
melainkan pergeseran level & peringkat sekolah).

---

## 11. Uji Klasterisasi dengan Data Nyata

> **Status:** rencana — belum diimplementasikan. Suite test saat ini
> (`backend/tests/test_ai_pipeline.py`, `backend/tests/test_evaluation.py`) hanya
> memakai **teks sintetis pendek**.

**Masalah.** Pipeline belum pernah diuji ujung-ke-ujung terhadap laporan nyata di
dalam test otomatis. Penurunan kualitas atau crash pada data riil (600 laporan,
variasi panjang teks, teks kosong, noise) tidak akan tertangkap suite 112 test
yang ada.

**Rencana:**
1. Test integrasi baru (mis. `backend/tests/test_cluster_real_cases.py`): seed
   laporan nyata → jalankan `default_pipeline.run(...)`.
2. Assertion — menguji **ketahanan**, bukan akurasi (akurasi = domain ablation §2–§9):
   - tidak ada exception pada 600 dokumen;
   - ≥ 2 klaster terbentuk;
   - semua label `kategori` termasuk enum yang sah;
   - setiap laporan berakhir `terklaster` atau `noise` (tidak ada yang hilang);
   - rasio noise di bawah ambang longgar (mis. < 60%) — sekadar alarm, bukan target.
3. Tandai `@pytest.mark.integration` bila runtime > 30 detik; target suite ≥ 113.
4. Opsional: cek determinisme (run ulang pada data yang sama → label identik).

**Batas lingkup.** Test ini menjawab *"apakah pipeline tahan data nyata"*, bukan
*"apakah klasternya bagus"* — pertanyaan kedua tetap dijawab lewat NMI/purity §3.2.
Jangan menaruh ambang NMI di test integrasi: itu membuat suite rapuh dan menduplikasi
peran ablation.

---

## 12. Ablation dengan Laporan Dinamis

> **Status:** rencana — sebagian infrastruktur sudah ada (§9), tetapi belum ada
> alur "data live → evaluasi ulang".

**Situasi sekarang.**

| Aspek | Kondisi |
|---|---|
| Sumber dokumen | `run_ablation.py::load_documents` membaca **DB** (dinamis) |
| Cache | fingerprint dataset → cache otomatis invalid saat dokumen berubah (`run_ablation.py:210-216`) |
| Ground truth | `manual_clusters.json` **statis** — 5 klaster, 62 `school_details`, 27 `tie_breaker_cases` (`metadata.created_date = 2026-09-29`) |
| Akibat | Laporan baru tanpa label GT **tidak** ikut terukur NMI/ARI/purity → evaluasi eksternal hanya mencakup subset lama, sementara bagian internal (silhouette/DB/CH) tetap mengukur seluruh data |

Catatan data: distribusi GT aktual **tidak merata** — `ruang_belajar 37 · sanitasi_air 13 ·
penunjang 2 · utilitas 4 · akses_lahan 6` — berbeda dari harapan "±12–13 per
klaster" di §1.5. Jika GT dianotasi ulang, seimbangkan atau jelaskan
ketidakseimbangan ini secara eksplisit di laporan.

**Opsi penanganan** (butuh keputusan pemilik proyek):

| Opsi | Isi | Trade-off |
|---|---|---|
| **A (rekomendasi)** | Re-run pada data live; GT lama dipakai hanya untuk subset ber-label, cakupan dicatat eksplisit (mis. 45/600) | Cepat & jujur soal cakupan; subset bisa tidak representatif |
| **B** | Anotasi GT baru tiap batch laporan | Akurasi tertinggi; kerja manual berulang |
| **C** | Pakai jalur augmentasi §9 (`dataset_aug_{45,150,500,1500}.json`, `run_mcs_sweep.py`, `run_scale_sweep*.py`) | Menguji sensitivitas skala komponen; tetap berbasis template, bukan teks warga asli |

**Aturan pelaporan.** Saat menjalankan ulang, laporkan juga `data_fingerprint`,
`n_docs`, dan flag `embedding_fallback` (`run_ablation.py:280, 383, 424`). Bila
A1/A3 jatuh ke TF-IDF, hasilnya **tidak valid** untuk klaim perbandingan neural dan
harus dikeluarkan dari tabel perbandingan — bukan disamarkan.

**Deliverable:** tabel NMI/ARI/purity + waktu per konfigurasi pada data live,
disertai catatan cakupan GT, ditambahkan ke `ABLATION_RESULTS.md` (bukan menimpa
tabel lama — beri label tanggal/fingerprint).

---

## Referensi

**Ablation & pipeline:**
- HDBSCAN docs: https://hdbscan.readthedocs.io/
- UMAP docs: https://umap-learn.readthedocs.io/
- Sentence-Transformers: https://www.sbert.net/
- Scikit-learn metrics: https://scikit-learn.org/stable/modules/model_evaluation.html
- Paper HDBSCAN: https://arxiv.org/abs/1911.02282

**Metode skoring (§10):**
- Machado, E. L. & Santos, A. P. L. (2024). School buildings performance evaluation
  method (SC-BPE Method). *Revista de Gestão e Secretariado*, 15(11), 1–27.
  DOI: `10.7769/gesec.v15i11.4437` — dasar SAW + pembobotan Delphi.
- Direktorat Jenderal PAUDDIKDASMEN, Kemendikbud. *Analisis Tingkat Kerusakan
  Bangunan* (Rapat Koordinasi Dapodik) — bobot komponen 0.2/0.4/0.6/0.8 dan
  rumus `Σ(bobot rusak) / Σ(bobot total) × 100%`.
- Kemendikdasmen. *Panduan Sarpras Dapodik* — ambang tingkat kerusakan
  (ringan 1–30%, sedang 31–45%, berat 46–100%); perhitungan mengacu formulir PUPR.
- Barrett, P., Davies, F., Zhang, Y. & Barrett, L. (2015). The impact of classroom
  design on pupils' learning: Final results of a holistic, multi-level analysis.
  *Building and Environment*, 89, 118–133. DOI: `10.1016/j.buildenv.2015.02.013`
  — 153 kelas, 27 sekolah, 3766 murid; 7 parameter desain menjelaskan 16%
  variasi progres belajar; *naturalness* ~50% dari dampak.
- *Synthesizing the Effect of Building Condition Quality on Academic Performance*
  (2016). *Education Finance and Policy*, 11(1), 97–123.
  DOI: `10.1162/edfp_a_00181` — meta-analisis; semi-partial `r = 0.10`,
  bivariate `r = 0.12` (efek kecil tapi signifikan).
- NCES. *Planning Guide for Maintaining School Facilities*, Ch. 3 —
  `FCI = Cost to Correct Deficiencies / Current Facility Replacement Value`.
  https://nces.ed.gov/pubs2003/fim/ch_3.asp

**Dasar parameter K (§10.4.1):**
- Bühlmann, H. (1967). Experience rating and credibility. *ASTIN Bulletin*,
  4(3), 199–207 — `Z = n/(n+K)`, `K = EPV/VHM`.
- Society of Actuaries, *Credibility Models* — estimasi EPV/VHM; `K` sebagai
  "criteria for half credibility"; aturan `VHM ≤ 0 → Z = 0`.
  https://www.soa.org/globalassets/assets/files/edu/c-24-05.pdf
- Casualty Actuarial Society (2015). *Credibility for Pricing Loss Ratios and
  Loss Costs* — estimator nonparametrik EPV (2.1) dan VHM (2.2).
  https://www.casact.org/sites/default/files/database/forum_15fforum_korn.pdf
- IMDb. *Ratings FAQ — Top Rated 250 weighted rating* (`m` = minimum ratings
  required; `C` = mean rating). https://help.imdb.com/article/imdb/featured-content/ratings-faq/G67Y87TFYYP6TWAV
- Cross Validated. *What are good resources on Bayesian rating?* — `m` tidak
  punya nilai universal (saran: kuartil-1 jumlah vote).
  https://stats.stackexchange.com/questions/189658/what-are-good-resources-on-bayesian-rating
- Efron, B. & Morris, C. (1975). Data analysis using Stein's estimator and its
  generalizations. *JASA*, 70(350), 311–319 — dasar shrinkage/empirical Bayes.
- Paper HDBSCAN: https://arxiv.org/abs/1911.02282