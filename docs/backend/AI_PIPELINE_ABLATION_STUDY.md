# AI Pipeline Ablation Study — Testing Framework

> Panduan lengkap untuk melakukan ablation study pada komponen AI pipeline SIMAKIS.
> Tujuan: Menemukan konfigurasi optimal dengan membandingkan variasi setiap komponen terhadap ground truth (manual clustering).

**Update terakhir:** 21 September 2026

---

## Pendahuluan

AI pipeline SIMAKIS terdiri dari 5 komponen utama:
1. **Embedding** — Konversi teks laporan ke vektor numerik
2. **UMAP** — Reduksi dimensi
2. **HDBSCAN** — Algoritma clustering
3. **TF-IDF Labeling** — Penamaan klaster berdasarkan kata kunci
4. **Scoring** — Perhitungan skor prioritas

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

#### A1: IndoBERT (paraphrase-multilingual-MiniLM-L12-v2)

| Aspek | Detail |
|-------|--------|
| **Cara kerja** | Model transformer pre-trained, menghasilkan vektor 384 dimensi |
| **Kelebihan** | Paham konteks & semantik Bahasa Indonesia (multilingual), akurasi tinggi |
| **Kekurangan** | Butuh GPU/RAM besar (~2GB), lambat tanpa GPU (~30 detik per batch) |
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
| Embedding (A) | 3 (A1, A2, A3) |
| UMAP (B) | 3 (B1, B2, B3) |
| HDBSCAN (C) | 3 (C1, C2, C3) |
| TF-IDF (D) | 3 (D1, D2, D3) |
| **Total kombinasi** | **3 × 3 × 3 × 3 = 81** |

### 6.2 Estimasi Waktu Per Kombinasi

| Komponen | Waktu (CPU only) | Waktu (GPU) |
|----------|------------------|------------|
| Embedding A1 (IndoBERT) | ~30 detik | ~5 detik |
| Embedding A2 (TF-IDF) | ~1 detik | - |
| Embedding A3 (MiniLM) | ~10 detik | ~2 detik |
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

## Referensi

- HDBSCAN docs: https://hdbscan.readthedocs.io/
- UMAP docs: https://umap-learn.readthedocs.io/
- Sentence-Transformers: https://www.sbert.net/
- Scikit-learn metrics: https://scikit-learn.org/stable/modules/model_evaluation.html
- Paper HDBSCAN: https://arxiv.org/abs/1911.02282