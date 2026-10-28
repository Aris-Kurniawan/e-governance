"""
F3.3 — Clustering HDBSCAN (per spec, default min_cluster_size=3, min_samples=2 from ablation C2).
"""

import numpy as np
from typing import Optional, Tuple

# Optional import for HDBSCAN
try:
    import hdbscan
except ImportError:
    hdbscan = None


def cluster_texts(
    vectors: np.ndarray,
    min_cluster_size: int = 3,
    min_samples: int = 2,
    **hdbscan_kwargs,
) -> np.ndarray:
    """
    Cluster reduced vectors using HDBSCAN (outlier label = -1).
    
    Args:
        vectors: (n_samples, n_features) array, ideally UMAP‑reduced
        min_cluster_size: default 3 (ablation C2), was 5 in original spec
        min_samples: default 2 (ablation C2), was 3 in original spec
        **hdbscan_kwargs: passed to hdbscan.HDBSCAN
        
    Returns: (n_samples,) integer array of cluster labels; -1 = noise/outlier.
    
    Raises:
        RuntimeError if HDBSCAN not installed.
    """
    if hdbscan is None:
        raise RuntimeError(
            "HDBSCAN library not installed. "
            "Install with: pip install hdbscan"
        )
    
    if vectors.shape[0] == 0:
        return np.array([], dtype=int)
    
    model = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        **hdbscan_kwargs,
    )
    return model.fit_predict(vectors)


def cluster_texts_adaptive(
    vectors: np.ndarray,
    min_cluster_size: int = 3,
    min_samples: int = 2,
    threshold: float = 0.88,
    **hdbscan_kwargs,
) -> np.ndarray:
    """F3.3 + DBG-026 (D-31) — Adaptive clustering.

    - Bila n_samples >= 10: Jalankan HDBSCAN standar (C2).
    - Bila 2 <= n_samples < 10: Jalankan AgglomerativeClustering (cosine distance)
      dengan distance_threshold. Laporan dalam kelompok >= 2 menjadi klaster sah;
      singleton (hanya 1 laporan) ditandai -1 (noise / perlu review).
    - Bila n_samples < 2: Return [-1] (noise/outlier).
    """
    n_samples = vectors.shape[0]
    if n_samples == 0:
        return np.array([], dtype=int)
    if n_samples == 1:
        return np.array([-1], dtype=int)

    if n_samples >= 10:
        return cluster_texts(
            vectors,
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            **hdbscan_kwargs,
        )

    # Fallback Agglomerative untuk sampel mikro (2 <= n < 10)
    from collections import Counter
    from sklearn.cluster import AgglomerativeClustering

    ac = AgglomerativeClustering(
        metric="cosine",
        linkage="average",
        distance_threshold=threshold,
        n_clusters=None,  # type: ignore[arg-type]
    )
    raw_labels = ac.fit_predict(vectors)
    counts = Counter(raw_labels)

    # Remap: kelompok >= 2 dapat id 0, 1, ...; singleton menjadi -1 (noise)
    label_map = {}
    next_id = 0
    final_labels = np.full(n_samples, -1, dtype=int)

    for i, lbl in enumerate(raw_labels):
        if counts[lbl] >= 2:
            if lbl not in label_map:
                label_map[lbl] = next_id
                next_id += 1
            final_labels[i] = label_map[lbl]

    return final_labels

