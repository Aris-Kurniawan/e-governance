"""
Pipeline AI Utama (F3.0f) — Mengintegrasikan komponen dengan konfigurasi optimal
hasil dari Ablation Study (A2 + B1 + C2 + D1).

Konfigurasi Default:
  - Embedding : TF‑IDF 300‑features (A2)
  - Reduksi   : UMAP n_components=10 (B1)
  - Clustering: HDBSCAN min_cluster_size=3, min_samples=2 (C2)
  - Labeling  : Unigram TF‑IDF (D1)
"""

from typing import List, Dict, Tuple, Optional
import numpy as np

from app.ai_pipeline.embedding import embed_texts
from app.ai_pipeline.reduction import reduce_dimensions
from app.ai_pipeline.clustering import cluster_texts
from app.ai_pipeline.labeling import label_clusters


class AIPipeline:
    """Orchestrator for the full SIMAKIS AI pipeline."""

    def __init__(
        self,
        embed_method: str = "tfidf",  # A2
        umap_components: int = 10,   # B1
        hdbscan_min_cluster_size: int = 3,  # C2
        hdbscan_min_samples: int = 2,       # C2
        label_ngram_range: Tuple[int, int] = (1, 1),  # D1
        label_top_n: int = 5,
    ):
        self.embed_method = embed_method
        self.umap_components = umap_components
        self.hdbscan_min_cluster_size = hdbscan_min_cluster_size
        self.hdbscan_min_samples = hdbscan_min_samples
        self.label_ngram_range = label_ngram_range
        self.label_top_n = label_top_n

    def run(
        self,
        texts: List[str],
    ) -> Dict:
        """
        Execute full clustering and labeling pipeline on a list of input texts.

        Args:
            texts: list of texts to cluster

        Returns: dict with keys:
            - labels: np.ndarray of cluster ids per text (-1 = noise)
            - cluster_meta: dict { cluster_id: { label_teks: str, kategori: str } }
            - n_clusters: int (excluding noise)
            - noise_count: int
        """
        if not texts:
            return {
                "labels": np.array([]),
                "cluster_meta": {},
                "n_clusters": 0,
                "noise_count": 0,
            }

        # Handle edge case: 1 sample → cannot cluster, assign label 0
        if len(texts) == 1:
            labels = np.array([0], dtype=int)
            cluster_meta = {"0": {"label_teks": texts[0][:50], "kategori": "belum_terklasifikasi"}}
            return {
                "labels": labels,
                "cluster_meta": cluster_meta,
                "n_clusters": 1,
                "noise_count": 0,
            }

        # 1. Embedding
        embeddings = embed_texts(texts, method=self.embed_method)

        # 2. Dimensionality reduction (if applicable)
        if embeddings.shape[0] > self.umap_components and embeddings.shape[1] > self.umap_components:
            reduced = reduce_dimensions(
                embeddings,
                n_components=self.umap_components,
            )
        else:
            reduced = embeddings

        # 3. Clustering
        labels = cluster_texts(
            reduced,
            min_cluster_size=self.hdbscan_min_cluster_size,
            min_samples=self.hdbscan_min_samples,
        )

        # 4. Labeling & category inference
        cluster_meta = label_clusters(
            texts=texts,
            labels=labels,
            ngram_range=self.label_ngram_range,
            top_n=self.label_top_n,
        )

        n_clusters = len(set(labels) - {-1})
        noise_count = int(np.sum(labels == -1))

        return {
            "labels": labels,
            "cluster_meta": cluster_meta,
            "n_clusters": n_clusters,
            "noise_count": noise_count,
        }


# Default pipeline instance with optimal config
default_pipeline = AIPipeline()
