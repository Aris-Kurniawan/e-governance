"""
Test unit untuk evaluation.py (F3.0b — Ablation Framework).
"""

import numpy as np
import pytest

from app.ai_pipeline.experiments.evaluation import (
    calculate_purity,
    evaluate_internal,
    evaluate_external,
    evaluate_all,
)


def _perfect_split():
    """2 klaster sempurna sesuai ground truth."""
    y_true = ["a"] * 10 + ["b"] * 10
    labels = [0] * 10 + [1] * 10
    embeddings = np.vstack([
        np.zeros((10, 5)),
        np.ones((10, 5)),
    ])
    return embeddings, y_true, labels


def test_purity_perfect():
    y_true = ["a"] * 10 + ["b"] * 10
    labels = [0] * 10 + [1] * 10
    assert calculate_purity(y_true, labels) == pytest.approx(1.0)


def test_purity_single_cluster():
    y_true = ["a"] * 10 + ["b"] * 10
    labels = [0] * 20
    # semua masuk 1 klaster → purity = proporsi kelas mayoritas (10/20)
    assert calculate_purity(y_true, labels) == pytest.approx(0.5)


def test_purity_empty_input():
    assert calculate_purity([], []) == 0.0


def test_evaluate_internal_perfect():
    emb, _, labels = _perfect_split()
    m = evaluate_internal(emb, labels)
    assert m["silhouette"] == pytest.approx(1.0)
    assert m["davies_bouldin"] == pytest.approx(0.0)


def test_evaluate_internal_all_noise():
    emb = np.zeros((10, 5))
    m = evaluate_internal(emb, [-1] * 10)
    assert m["silhouette"] == -1.0
    assert m["davies_bouldin"] == 999.0


def test_evaluate_external_perfect():
    _, y_true, labels = _perfect_split()
    m = evaluate_external(y_true, labels)
    assert m["ari"] == pytest.approx(1.0)
    assert m["nmi"] == pytest.approx(1.0)
    assert m["purity"] == pytest.approx(1.0)
    assert m["v_measure"] == pytest.approx(1.0)
    assert m["noise_ratio"] == 0.0


def test_evaluate_external_all_noise():
    y_true = ["a"] * 10 + ["b"] * 10
    m = evaluate_external(y_true, [-1] * 20)
    assert m["nmi"] == 0.0
    assert m["noise_ratio"] == 1.0


def test_evaluate_external_noise_ratio_partial():
    y_true = ["a"] * 10 + ["b"] * 10
    labels = [0] * 10 + [-1] * 10
    m = evaluate_external(y_true, labels)
    assert m["noise_ratio"] == pytest.approx(0.5)


def test_evaluate_all_keys():
    emb, y_true, labels = _perfect_split()
    m = evaluate_all(emb, y_true, labels)
    for key in ["silhouette", "davies_bouldin", "ari", "nmi", "purity",
                "homogeneity", "completeness", "v_measure", "noise_ratio"]:
        assert key in m
