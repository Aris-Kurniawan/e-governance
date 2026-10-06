"""
F3.4 — Labeling TF-IDF (per spec, default unigram from ablation D1).
"""

from typing import Dict, List, Tuple
import numpy as np

# Optional import for TF‑IDF vectorizer
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except ImportError:
    TfidfVectorizer = None


def label_clusters(
    texts: List[str],
    labels: np.ndarray,
    ngram_range: Tuple[int, int] = (1, 1),
    stop_words: List[str] = None,
    top_n: int = 5,
) -> Dict[str, Dict[str, str]]:
    """
    Assign a textual label (top keywords) and inferred infrastructure category to each cluster.
    
    Args:
        texts: original texts, length = len(labels)
        labels: cluster labels from HDBSCAN (-1 = noise)
        ngram_range: default (1,1) = unigram (D1)
        stop_words: optional list of stop words (D3 would add extra stopwords)
        top_n: number of top terms per cluster
        
    Returns: dict {
        cluster_id: { "label_teks": "term1 term2 term3", "kategori": "ruang_belajar" | ... }
    }
    """
    if TfidfVectorizer is None:
        raise RuntimeError("scikit‑learn not installed (TfidfVectorizer missing)")
    
    unique_labels = set(labels)
    result = {}
    
    for cl_id in unique_labels:
        if cl_id == -1:
            result[str(cl_id)] = {
                "label_teks": "(noise/outlier)",
                "kategori": "belum_terklasifikasi",
            }
            continue
        
        mask = labels == cl_id
        cluster_docs = [t for t, m in zip(texts, mask) if m]
        if not cluster_docs:
            result[str(cl_id)] = {"label_teks": "", "kategori": "belum_terklasifikasi"}
            continue
        
        # TF‑IDF top terms
        vec = TfidfVectorizer(
            max_features=1000,
            ngram_range=ngram_range,
            stop_words=stop_words,
        )
        matrix = vec.fit_transform(cluster_docs)
        scores = np.asarray(matrix.mean(axis=0)).ravel()
        terms = vec.get_feature_names_out()
        top_idx = scores.argsort()[::-1][:top_n]
        top_terms = [terms[i] for i in top_idx]
        label_teks = " ".join(top_terms)
        
        # Map to infrastructure category (simple keyword lookup)
        kategori = _infer_category(top_terms)
        
        result[str(cl_id)] = {
            "label_teks": label_teks,
            "kategori": kategori,
        }
    
    return result


def _infer_category(top_terms: List[str]) -> str:
    """Heuristic mapping of top TF‑IDF terms to 5 infrastructure categories."""
    # Case‑insensitive matching
    term_str = " ".join(top_terms).lower()
    
    # Check each category pattern
    if any(k in term_str for k in ["kelas", "ruang", "lab", "perpus", "perpustakaan"]):
        return "ruang_belajar"
    if any(k in term_str for k in ["wc", "toilet", "air", "sanitasi", "kamar mandi"]):
        return "sanitasi_air"
    if any(k in term_str for k in ["listrik", "internet", "penerangan", "lampu", "genset"]):
        return "utilitas"
    if any(k in term_str for k in ["jalan", "pagar", "drainase", "halaman", "akses"]):
        return "akses_lahan"
    if any(k in term_str for k in ["uks", "ibadah", "olahraga", "lapangan", "kantin"]):
        return "penunjang"
    
    # Default: not enough signal
    return "belum_terklasifikasi"
