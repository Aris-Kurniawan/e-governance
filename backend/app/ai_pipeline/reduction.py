"""
F3.2 — Reduksi Dimensi UMAP (per spec, default n_components=10 from ablation B1).
"""

import numpy as np
from typing import Optional

# Optional import for UMAP; if not installed, function will raise
try:
    import umap
except ImportError:
    umap = None


def reduce_dimensions(
    embeddings: np.ndarray,
    n_components: int = 10,
    random_state: int = 42,
    **umap_kwargs,
) -> np.ndarray:
    """
    Reduce high‑dimensional embeddings using UMAP (if available) or identity passthrough.
    
    FIX (Factor 2): Guard against spectral initialization crash on small datasets.
    - When n_samples < n_components+2, spectral eigendecomposition fails
    - Fallback: use random initialization or skip UMAP entirely
    
    Args:
        embeddings: (n_samples, n_features) array
        n_components: target dimensionality (default 10 per ablation B1)
        random_state: random seed for reproducibility
        **umap_kwargs: passed to umap.UMAP
        
    Returns: (n_samples, n_components) array (or original if UMAP not installed or n_components >= n_features)
    """
    if embeddings.shape[0] == 0:
        return embeddings
    
    # If n_components equals or exceeds original dims, skip UMAP
    if n_components >= embeddings.shape[1]:
        return embeddings
    
    if umap is None:
        # UMAP not installed; fallback to no reduction (caller must ensure dependencies)
        raise RuntimeError(
            "UMAP library not installed. "
            "Install with: pip install umap-learn"
        )
    
    n_samples = embeddings.shape[0]
    
    # FIX: Guard spectral crash for small datasets
    # spectral init needs eigendecomposition of ~(n_components+1)x(n_components+1) matrix
    # scipy.linalg.eigh fails when k >= n_samples
    if n_samples < n_components + 2:
        # Small dataset: force random init (avoids spectral eigendecomposition)
        umap_kwargs['init'] = 'random'
    
    # Adaptive n_components: can't reduce to k dimensions if k > n_samples-1
    if n_samples < n_components:
        n_components = max(2, n_samples - 1)
    
    reducer = umap.UMAP(
        n_components=n_components,
        random_state=random_state,
        **umap_kwargs,
    )
    return reducer.fit_transform(embeddings)
