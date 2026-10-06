"""
F3.1 — Embedding Teks (per spec TASK_GUIDE, but default set to A2 TF-IDF via ablation results).
"""

from typing import List, Union
import numpy as np

# Optional imports for different embedding methods
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


def embed_texts(texts: List[str], method: str = "tfidf") -> np.ndarray:
    """
    Embed a list of texts using specified method.
    
    Methods:
      - "tfidf": TF‑IDF 300‑dimensional (A2, ablation winner)
      - "indobert": paraphrase‑multilingual‑MiniLM‑L12‑v2 (A1)
      - "minilm": all‑MiniLM‑L6‑v2 (A3)
    
    Returns: (n_texts, n_features) float array.
    """
    if method == "tfidf":
        from sklearn.feature_extraction.text import TfidfVectorizer
        vec = TfidfVectorizer(max_features=300, lowercase=True)
        return vec.fit_transform(texts).toarray().astype(np.float32)
    
    if method in ("indobert", "minilm"):
        if SentenceTransformer is None:
            raise RuntimeError("sentence_transformers not installed")
        model_name = (
            "paraphrase-multilingual-MiniLM-L12-v2" if method == "indobert"
            else "all-MiniLM-L6-v2"
        )
        model = SentenceTransformer(model_name)
        return np.asarray(model.encode(texts, show_progress_bar=False), dtype=np.float32)
    
    raise ValueError(f"Unknown embedding method: {method}")
