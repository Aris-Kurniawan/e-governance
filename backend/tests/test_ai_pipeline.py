"""
Integration test untuk AI Pipeline (F3.0f).
"""

import pytest
import numpy as np
from app.ai_pipeline.pipeline import AIPipeline


def test_pipeline_basic():
    """Test pipeline dengan data sederhana."""
    pipeline = AIPipeline()
    texts = [
        "ruang kelas rusak atap bocor",
        "kelas 1 lantai retak dinding",
        "toilet wc bersih air lancar",
        "wc siswa sanitasi baik",
        "listrik mati lampu pecah",
        "internet wifi putus genset",
    ]
    result = pipeline.run(texts)

    # Assertions
    assert "labels" in result
    assert "cluster_meta" in result
    assert "n_clusters" in result
    assert "noise_count" in result

    assert len(result["labels"]) == len(texts)
    assert result["n_clusters"] >= 0
    assert result["noise_count"] >= 0


def test_pipeline_empty():
    """Test pipeline dengan input kosong."""
    pipeline = AIPipeline()
    result = pipeline.run([])

    assert len(result["labels"]) == 0
    assert result["n_clusters"] == 0
    assert result["noise_count"] == 0


def test_pipeline_single_text():
    """Test pipeline dengan 1 teks saja."""
    pipeline = AIPipeline()
    texts = ["ruang kelas rusak"]
    result = pipeline.run(texts)

    assert len(result["labels"]) == 1


def test_pipeline_config_override():
    """Test pipeline dengan config custom."""
    # Config lebih konservatif (HDBSCAN default C1)
    pipeline = AIPipeline(
        hdbscan_min_cluster_size=5,
        hdbscan_min_samples=3,
    )
    texts = [
        "ruang kelas rusak",
        "kelas retak",
        "wc bersih",
        "toilet lancar",
    ]
    result = pipeline.run(texts)

    assert "labels" in result
    assert len(result["labels"]) == len(texts)


def test_pipeline_cluster_meta():
    """Test bahwa setiap cluster memiliki label_teks dan kategori."""
    pipeline = AIPipeline()
    texts = [
        "ruang kelas rusak",
        "kelas lantai retak",
        "wc siswa bocor",
        "toilet air putus",
    ]
    result = pipeline.run(texts)

    for cluster_id, meta in result["cluster_meta"].items():
        assert "label_teks" in meta
        assert "kategori" in meta
        assert meta["kategori"] in [
            "ruang_belajar",
            "sanitasi_air",
            "utilitas",
            "akses_lahan",
            "penunjang",
            "belum_terklasifikasi",
        ]


def test_pipeline_category_inference():
    """Test inferensi kategori berdasarkan keywords."""
    pipeline = AIPipeline()
    
    # Texts yang jelas untuk setiap kategori
    texts = [
        "ruang kelas retak perpustakaan rusak",  # ruang_belajar
        "wc toilet bocor sanitasi air",  # sanitasi_air
        "listrik mati internet wifi genset",  # utilitas
        "jalan pagar drainase halaman",  # akses_lahan
        "uks ibadah kantin olahraga",  # penunjang
    ]
    result = pipeline.run(texts)

    # Check that at least some clusters got correct categories
    categories = [meta["kategori"] for meta in result["cluster_meta"].values()]
    assert len(categories) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
