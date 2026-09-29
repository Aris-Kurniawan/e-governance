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
