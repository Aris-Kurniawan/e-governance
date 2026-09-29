"""
run_ablation.py — Script utama Ablation Study (F3.0b)

Loop 81 kombinasi: A(embedding 3) × B(UMAP 3) × C(HDBSCAN 3) × D(TF-IDF labeling 3)

Caching (reuse sesuai AI_PIPELINE_ABLATION_STUDY.md §6):
  - embedding : 3 hasil unik  (per varian A)
  - UMAP      : 9 hasil unik  (per A × B)
  - HDBSCAN   : 27 hasil unik (per A × B × C)
  - labeling  : tidak di-cache (cepat, 1 detik)
→ Total komputasi berat turun dari 81 run menjadi 3+9+27.

Pakai:
  cd backend
  ./venv/bin/python app/ai_pipeline/experiments/run_ablation.py --limit 1   # smoke test
  ./venv/bin/python app/ai_pipeline/experiments/run_ablation.py            # 81 kombinasi
  ./venv/bin/python app/ai_pipeline/experiments/run_ablation.py --embed A2 # paksa varian tertentu
"""

import argparse
import csv
import json
import os
import sys
import time
from collections import defaultdict
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, "results")
CACHE_DIR = os.path.join(BASE_DIR, "cache")
GROUND_TRUTH_PATH = os.path.join(BASE_DIR, "manual_clusters.json")

# Fingerprint dataset (di-set di main) → memisahkan cache antar versi dokumen
DATA_FP = ""

# Catat varian embedding yang jatuh ke fallback (WAJIB ada di hasil —
# agar A1/A3 yang fallback ke TF-IDF tidak dianggap hasil neural yang valid)
FALLBACK_USED = {}

# Varian komponen (AI_PIPELINE_ABLATION_STUDY.md §2)
VARIANTS_A = ["A1", "A2", "A3"]  # IndoBERT, TF-IDF, MiniLM
VARIANTS_B = ["B1", "B2", "B3"]  # UMAP n=10, tanpa UMAP, UMAP n=5
VARIANTS_C = ["C1", "C2", "C3"]  # HDBSCAN default/sensitif/konservatif
VARIANTS_D = ["D1", "D2", "D3"]  # TF-IDF unigram/uni+bigram/+stopword

HDBSCAN_PARAMS = {
    "C1": {"min_cluster_size": 5, "min_samples": 3},
    "C2": {"min_cluster_size": 3, "min_samples": 2},
    "C3": {"min_cluster_size": 10, "min_samples": 5},
}

UMAP_PARAMS = {
    "B1": {"n_components": 10},
    "B2": None,  # tanpa UMAP
    "B3": {"n_components": 5},
}

STOPWORDS_EXTRA_D3 = [
    "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "ini",
    "itu", "ada", "tidak", "bukan", "juga", "karena", "sudah", "akan",
    "para", "sekolah", "siswa", "murid", "laporan", "sekolahnya",
]


# ---------------------------------------------------------------------------
# Step 1: Persiapan data (laporan per sekolah → 1 dokumen per NPSN)
# ---------------------------------------------------------------------------

def load_documents(include_empty=False):
    """
    Baca laporan dari DB → 1 dokumen per sekolah, sejajar dengan ground truth.

    Sekolah TANPA laporan tidak ikut clustering (default) karena placeholder
    teks identik membuat HDBSCAN hanya memisahkan "ada laporan vs tidak"
    (bukan kategori nyata) → metrics jadi tidak valid.
    Pakai --include-empty untuk memaksa ikut.
    """
    from sqlalchemy import select
    from app.core.database import SessionLocal
    from app.models.laporan import Laporan
    from app.models.sekolah import Sekolah

    gt = json.load(open(GROUND_TRUTH_PATH, encoding="utf-8"))
    gt_labels = {
        npsn: d["assigned_category"]
        for npsn, d in gt["school_details"].items()
    }

    db = SessionLocal()
    try:
        texts_by_school = defaultdict(list)
        rows = db.scalars(select(Laporan)).all()
        for r in rows:
            if r.deskripsi:
                texts_by_school[r.sekolah_npsn].append(r.deskripsi.strip())

        sekolah_rows = db.scalars(select(Sekolah)).all()
        nama_by_npsn = {s.npsn: s.nama for s in sekolah_rows}
    finally:
        db.close()

    docs, y_true, meta = [], [], []
    n_excluded = 0
    for npsn in sorted(gt_labels.keys()):
        texts = texts_by_school.get(npsn, [])
        if not texts and not include_empty:
            n_excluded += 1
            continue
        joined = " ".join(texts)
        if not joined.strip():
            joined = f"sekolah {nama_by_npsn.get(npsn, npsn)} tanpa laporan warga"
        docs.append(joined)
        y_true.append(gt_labels[npsn])
        meta.append({
            "npsn": npsn,
            "nama": nama_by_npsn.get(npsn, ""),
            "jumlah_laporan": len(texts),
        })

    print(f"  {len(docs)} dokumen ikut clustering, {n_excluded} sekolah tanpa laporan dieksklud")
    return docs, y_true, meta


# ---------------------------------------------------------------------------
# Komponen pipeline (A/B/C/D) — fallback ringan jika lib belum tersedia
# ---------------------------------------------------------------------------

def embed_texts(texts, variant):
    """A1 IndoBERT / A2 TF-IDF / A3 MiniLM. Return np.ndarray (n_docs, n_features)."""
    if variant == "A2":
        from sklearn.feature_extraction.text import TfidfVectorizer
        vec = TfidfVectorizer(max_features=300, lowercase=True)
        return vec.fit_transform(texts).toarray().astype(np.float32)

    model_name = (
        "paraphrase-multilingual-MiniLM-L12-v2" if variant == "A1"
        else "all-MiniLM-L6-v2"
    )
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        FALLBACK_USED[variant] = False
        return np.asarray(model.encode(texts, show_progress_bar=False), dtype=np.float32)
    except Exception as e:
        print(f"  [warn] {variant} ({model_name}) gagal: {e} → fallback ke TF-IDF")
        FALLBACK_USED[variant] = True
        return embed_texts(texts, "A2")


def reduce_dimensions(vectors, variant_b):
    """B1 n=10 / B2 tanpa UMAP / B3 n=5."""
    params = UMAP_PARAMS[variant_b]
    if params is None:
        return vectors
    try:
        import umap
        reducer = umap.UMAP(n_components=params["n_components"], random_state=42)
        return np.asarray(reducer.fit_transform(vectors), dtype=np.float32)
    except Exception as e:
        print(f"  [warn] UMAP {variant_b} gagal: {e} → fallback tanpa reduksi")
        return vectors


def cluster_vectors(vectors, variant_c):
    """C1/C2/C3 HDBSCAN. Return label per dokumen (-1 = noise)."""
    import hdbscan
    params = HDBSCAN_PARAMS[variant_c]
    model = hdbscan.HDBSCAN(**params)
    return np.asarray(model.fit_predict(vectors))


def label_clusters(labels, texts, variant_d):
    """D1 unigram / D2 unigram+bigram / D3 +stopword tambahan → top terms per klaster."""
    from sklearn.feature_extraction.text import TfidfVectorizer

    ngram = (1, 1) if variant_d == "D1" else ((1, 2) if variant_d == "D2" else (1, 2))
    stop = STOPWORDS_EXTRA_D3 if variant_d == "D3" else None

    result = {}
    unique = sorted(set(labels))
    for c in unique:
        if c == -1:
            result[str(c)] = ["(noise)"]
            continue
        cluster_docs = [t for t, l in zip(texts, labels) if l == c]
        if not cluster_docs:
            result[str(c)] = []
            continue
        try:
            vec = TfidfVectorizer(max_features=1000, ngram_range=ngram, stop_words=stop)
            matrix = vec.fit_transform(cluster_docs)
            scores = np.asarray(matrix.mean(axis=0)).ravel()
            terms = vec.get_feature_names_out()
            top_idx = scores.argsort()[::-1][:5]
            result[str(c)] = [terms[i] for i in top_idx]
        except Exception:
            result[str(c)] = []
    return result


# ---------------------------------------------------------------------------
# Cache layer
# ---------------------------------------------------------------------------

def _cache_path(name):
    os.makedirs(CACHE_DIR, exist_ok=True)
    # fingerprint dataset → cache otomatis invalid saat dokumen berubah
    return os.path.join(CACHE_DIR, f"{DATA_FP}_{name}.npy")


def cached_embed(docs, variant):
    if variant == "A2":
        FALLBACK_USED["A2"] = False  # TF-IDF memang baseline — bukan fallback
    path = _cache_path(f"embed_{variant}")
    flag_path = path + ".fallback.json"
    if os.path.exists(path):
        # pulihkan status fallback dari cache (run sebelumnya)
        if os.path.exists(flag_path):
            with open(flag_path, encoding="utf-8") as f:
                FALLBACK_USED[variant] = json.load(f)
        else:
            FALLBACK_USED.setdefault(variant, None)  # unknown (cache lama)
        return np.load(path)
    arr = embed_texts(docs, variant)
    np.save(path, arr)
    with open(flag_path, "w", encoding="utf-8") as f:
        json.dump(FALLBACK_USED.get(variant, False), f)
    return arr


def cached_reduce(vectors, variant_a, variant_b):
    if variant_b == "B2":
        return vectors  # tanpa UMAP — tidak perlu cache
    path = _cache_path(f"reduce_{variant_a}_{variant_b}")
    if os.path.exists(path):
        return np.load(path)
    arr = reduce_dimensions(vectors, variant_b)
    np.save(path, arr)
    return arr


def cached_cluster(vectors, variant_a, variant_b, variant_c):
    path = _cache_path(f"cluster_{variant_a}_{variant_b}_{variant_c}")
    if os.path.exists(path):
        return np.load(path)
    labels = cluster_vectors(vectors, variant_c)
    np.save(path, labels)
    return labels


# ---------------------------------------------------------------------------
# Eksekusi satu kombinasi
# ---------------------------------------------------------------------------

def run_one(combo, docs, y_true, embeddings_cache):
    """combo = (A, B, C, D). Return dict hasil evaluasi."""
    a, b, c, d = combo
    t0 = time.time()

    vectors = embeddings_cache[a]
    reduced = cached_reduce(vectors, a, b)
    labels = cached_cluster(reduced, a, b, c)
    cluster_terms = label_clusters(labels.tolist(), docs, d)

    from app.ai_pipeline.experiments.evaluation import evaluate_all
    metrics = evaluate_all(vectors, y_true, labels.tolist())

    n_clusters = len(set(l for l in labels.tolist() if l != -1))
    runtime = round(time.time() - t0, 2)

    return {
        "config": f"{a}_{b}_{c}_{d}",
        "variants": {"embedding": a, "reduction": b, "clustering": c, "labeling": d},
        "embedding_fallback": FALLBACK_USED.get(a),
        "data_fingerprint": DATA_FP,
        "n_docs": len(docs),
        "metrics": metrics,
        "n_clusters": int(n_clusters),
        "cluster_labels": cluster_terms,
        "runtime_sec": runtime,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

CSV_COLUMNS = [
    "config", "data_fingerprint", "n_docs", "embedding_fallback",
    "A", "B", "C", "D", "n_clusters", "runtime_sec",
    "silhouette", "davies_bouldin", "ari", "nmi", "purity",
    "homogeneity", "completeness", "v_measure", "noise_ratio",
]


def _flatten_result(res):
    """Konversi 1 file hasil JSON → 1 baris summary_report.csv."""
    v = res.get("variants", {})
    m = res.get("metrics", {})
    row = {
        "config": res.get("config", ""),
        "data_fingerprint": res.get("data_fingerprint", ""),
        "n_docs": res.get("n_docs", ""),
        "embedding_fallback": res.get("embedding_fallback", ""),
        "A": v.get("embedding", ""),
        "B": v.get("reduction", ""),
        "C": v.get("clustering", ""),
        "D": v.get("labeling", ""),
        "n_clusters": res.get("n_clusters", ""),
        "runtime_sec": res.get("runtime_sec", ""),
    }
    for key in ["silhouette", "davies_bouldin", "ari", "nmi", "purity",
                "homogeneity", "completeness", "v_measure", "noise_ratio"]:
        val = m.get(key, "")
        row[key] = round(val, 4) if isinstance(val, (int, float)) else val
    return row


def rebuild_summary_csv():
    """REBUILD summary_report.csv dari results/*.json (satu baris per config).

    Tidak membaca CSV lama → kebal data basi/merge conflict.
    """
    all_rows = []
    for name in sorted(os.listdir(RESULTS_DIR)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(RESULTS_DIR, name), encoding="utf-8") as f:
            all_rows.append(_flatten_result(json.load(f)))

    csv_path = os.path.normpath(os.path.join(RESULTS_DIR, "..", "summary_report.csv"))
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(all_rows)
    return csv_path, all_rows


def main():
    global DATA_FP
    parser = argparse.ArgumentParser(description="Ablation study 81 kombinasi (F3.0b)")
    parser.add_argument("--limit", type=int, default=0, help="Jalankan N kombinasi pertama (0 = semua)")
    parser.add_argument("--embed", type=str, default=None, help="Paksa varian embedding (A1/A2/A3)")
    parser.add_argument("--fresh", action="store_true", help="Abaikan cache")
    parser.add_argument("--include-empty", action="store_true",
                        help="Sertakan sekolah tanpa laporan (default: eksklud)")
    args = parser.parse_args()

    if args.fresh and os.path.isdir(CACHE_DIR):
        import shutil
        shutil.rmtree(CACHE_DIR)

    os.makedirs(RESULTS_DIR, exist_ok=True)

    print("=== Ablation Study F3.0b ===")
    print("Step 1: Muat dokumen (laporan per sekolah) + ground truth ...")
    docs, y_true, meta = load_documents(include_empty=args.include_empty)
    print(f"  distribusi ground truth: "
          f"{dict((k, y_true.count(k)) for k in sorted(set(y_true)))}")

    # Fingerprint dataset → cache terpisah per versi dokumen
    import hashlib
    DATA_FP = hashlib.md5("\x00".join(docs).encode("utf-8")).hexdigest()[:8]
    print(f"  data fingerprint: {DATA_FP}")

    print("Step 2: Embedding (di-cache per varian A) ...")
    variants_a = [args.embed] if args.embed else VARIANTS_A
    embeddings_cache = {}
    for a in variants_a:
        t = time.time()
        embeddings_cache[a] = cached_embed(docs, a)
        fb = FALLBACK_USED.get(a)
        fb_note = "" if fb is False else ("  [FALLBACK→TF-IDF!]" if fb else "  [fallback unknown]")
        print(f"  {a}: shape={embeddings_cache[a].shape} ({time.time()-t:.1f}s){fb_note}")
    if any(FALLBACK_USED.get(a) for a in variants_a):
        print("  PERINGATAN: ada embedding yang FALLBACK ke TF-IDF — "
              "varian A1/A3 tidak valid untuk perbandingan sampai model terunduh!")

    print("Step 3: Loop kombinasi (B × C × D) ...")
    combos = [(a, b, c, d)
              for a in variants_a
              for b in VARIANTS_B
              for c in VARIANTS_C
              for d in VARIANTS_D]
    if args.limit:
        combos = combos[: args.limit]

    results = []
    for i, combo in enumerate(combos, 1):
        res = run_one(combo, docs, y_true, embeddings_cache)
        results.append(res)

        out_path = os.path.join(RESULTS_DIR, f"{res['config']}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2, ensure_ascii=False)

        m = res["metrics"]
        print(f"  [{i}/{len(combos)}] {res['config']}  "
              f"n_cluster={res['n_clusters']}  NMI={m['nmi']:.3f}  ARI={m['ari']:.3f}  "
              f"({res['runtime_sec']}s)")

    # Summary report: REBUILD dari results/*.json (satu baris per config, selalu konsisten)
    csv_path, all_rows = rebuild_summary_csv()

    # Top 5 berdasarkan NMI (seluruh baris di summary_report, bukan hanya run ini)
    def _nmi(row):
        try:
            return float(row["nmi"])
        except (TypeError, ValueError):
            return -1.0

    top = sorted(all_rows, key=_nmi, reverse=True)[:5]
    print("\n=== Top 5 (NMI, semua run) ===")
    for r in top:
        print(f"  {r['config']}  NMI={_nmi(r):.4f}  ARI={float(r['ari']):.4f}  "
              f"purity={float(r['purity']):.4f}  noise={float(r['noise_ratio']):.3f}")

    # Peringatan embedding fallback (A1/A3 tidak valid jika jatuh ke TF-IDF)
    fb = [r["config"] for r in all_rows if r.get("embedding_fallback") is True]
    if fb:
        print(f"\n  [PERINGATAN] {len(fb)} kombinasi memakai embedding FALLBACK "
              f"(A1/A3 → TF-IDF) — tidak valid untuk perbandingan A!")

    print(f"\nSelesai: {len(results)} kombinasi")
    print(f"  JSON : {RESULTS_DIR}/<config>.json")
    print(f"  CSV  : {csv_path}")


if __name__ == "__main__":
    main()
