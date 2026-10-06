"""
Fungsi Evaluasi untuk Ablation Study AI Pipeline (F3.0b).
Menghitung internal metrics (tanpa ground truth) dan external metrics (vs manual_clusters.json).
"""

import numpy as np
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    adjusted_rand_score,
    normalized_mutual_info_score,
    homogeneity_completeness_v_measure
)
from sklearn.metrics.cluster import contingency_matrix


def calculate_purity(y_true, y_pred):
    """
    Menghitung Purity clustering (0.0 sampai 1.0).
    Formula: sum(max(contingency_matrix)) / total_samples
    """
    if len(y_true) == 0 or len(y_pred) == 0:
        return 0.0
    
    # Abaikan noise point jika ada (-1 di hdbscan/clustering)
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    valid_mask = y_pred != -1
    if not np.any(valid_mask):
        return 0.0
        
    y_true_valid = y_true[valid_mask]
    y_pred_valid = y_pred[valid_mask]
    
    if len(y_true_valid) == 0:
        return 0.0

    matrix = contingency_matrix(y_true_valid, y_pred_valid)
    return np.sum(np.amax(matrix, axis=0)) / np.sum(matrix)


def evaluate_internal(embeddings, labels):
    """
    Menghitung internal clustering metrics.
    - Silhouette Score (higher is better, range [-1, 1])
    - Davies-Bouldin Score (lower is better, range [0, inf])
    """
    # Abaikan noise (-1) untuk kalkulasi internal metrics jika ada
    embeddings = np.array(embeddings)
    labels = np.array(labels)
    
    valid_mask = labels != -1
    if np.sum(valid_mask) < 3 or len(set(labels[valid_mask])) < 2:
        return {
            "silhouette": -1.0,
            "davies_bouldin": 999.0
        }

    emb_valid = embeddings[valid_mask]
    lbl_valid = labels[valid_mask]

    try:
        sil = float(silhouette_score(emb_valid, lbl_valid))
    except Exception:
        sil = -1.0

    try:
        db = float(davies_bouldin_score(emb_valid, lbl_valid))
    except Exception:
        db = 999.0

    return {
        "silhouette": sil,
        "davies_bouldin": db
    }


def evaluate_external(y_true, y_pred):
    """
    Menghitung external clustering metrics vs ground truth.
    - Adjusted Rand Index (ARI)
    - Normalized Mutual Information (NMI)
    - Purity
    - Homogeneity, Completeness, V-measure
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    noise_ratio = float(np.sum(y_pred == -1) / len(y_pred)) if len(y_pred) > 0 else 1.0

    # Handle noise points (-1) untuk external metrics
    valid_mask = y_pred != -1
    if not np.any(valid_mask) or len(set(y_pred[valid_mask])) < 2:
        return {
            "ari": 0.0,
            "nmi": 0.0,
            "purity": 0.0,
            "homogeneity": 0.0,
            "completeness": 0.0,
            "v_measure": 0.0,
            "noise_ratio": noise_ratio
        }

    y_t = y_true[valid_mask]
    y_p = y_pred[valid_mask]

    try:
        ari = float(adjusted_rand_score(y_t, y_p))
    except Exception:
        ari = 0.0

    try:
        nmi = float(normalized_mutual_info_score(y_t, y_p))
    except Exception:
        nmi = 0.0

    try:
        purity = float(calculate_purity(y_t, y_p))
    except Exception:
        purity = 0.0

    try:
        hom, comp, v_meas = homogeneity_completeness_v_measure(y_t, y_p)
    except Exception:
        hom, comp, v_meas = 0.0, 0.0, 0.0

    return {
        "ari": ari,
        "nmi": nmi,
        "purity": purity,
        "homogeneity": float(hom),
        "completeness": float(comp),
        "v_measure": float(v_meas),
        "noise_ratio": noise_ratio
    }


def evaluate_all(embeddings, y_true, y_pred):
    """
    Menjalankan seluruh metrik evaluasi (internal & external).
    """
    internal = evaluate_internal(embeddings, y_pred)
    external = evaluate_external(y_true, y_pred)
    
    return {**internal, **external}
