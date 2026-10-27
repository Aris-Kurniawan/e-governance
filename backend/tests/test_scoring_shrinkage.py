"""Test unit F4.12 (D-24): shrinkage skor laporan, prior global, mismatch, estimate_k.

Aturan yang dijaga:
  - prior = Σ(mean_sekolah × n) / Σn, hanya enum valid (NULL/asing dibuang)
  - skor_laporan = λ × mean + (1−λ) × prior, λ = n/(n+K)
  - n = 0 → skor_laporan 0 (tidak ditarik ke prior)
  - mismatch dihitung dari skor_laporan SETELAH shrinkage + skor_dapodik
"""

import pytest

from app.ai_pipeline.scoring import (
    SHRINKAGE_K,
    calculate_kbm_score,
    compute_prior,
    estimate_k,
    is_mismatch,
)

DAPO_KOSONG = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}


def test_konstanta_k_default_lima():
    assert SHRINKAGE_K == 5


def test_prior_dibobot_jumlah_laporan_dan_mengabaikan_null():
    laporan = {
        "a": ["rusak_berat"],              # 100, n=1
        "b": ["rusak_sedang", "baik"],     # 66+0, n=2
        "c": [None, "bukan_enum"],         # dibuang
        "d": [],                           # n=0
    }
    # b: mean 33, n=2 → (100×1 + 33×2) / 3 = 166/3 = 55.333...
    assert compute_prior(laporan) == pytest.approx(166 / 3)


def test_prior_nol_bila_tidak_ada_laporan_valid():
    assert compute_prior({"a": [None], "b": []}) == 0.0


def test_shrinkage_formula():
    # n=1, mean 100, prior 50, K=5 → λ=1/6
    hasil = calculate_kbm_score(
        ["rusak_berat"], DAPO_KOSONG, prior=50.0, k=5
    )
    assert hasil["skor_laporan"] == round(1 / 6 * 100 + 5 / 6 * 50, 1)  # 58.3


def test_nol_laporan_tetap_nol_bukan_prior():
    hasil = calculate_kbm_score([], {"total": 10, "berat": 10}, prior=90.0, k=5)
    assert hasil["skor_laporan"] == 0.0
    assert hasil["skor_dapodik"] == 100.0
    assert hasil["skor_kbm"] == 30.0


def test_prior_none_mempertahankan_perilaku_lama():
    hasil = calculate_kbm_score(["rusak_sedang"], DAPO_KOSONG, prior=None)
    assert hasil["skor_laporan"] == 66.0
    assert hasil["skor_kbm"] == round(0.7 * 66, 1)


def test_k_nol_berarti_tanpa_shrinkage():
    hasil = calculate_kbm_score(["rusak_sedang"], DAPO_KOSONG, prior=10.0, k=0)
    assert hasil["skor_laporan"] == 66.0


def test_is_mismatch():
    assert is_mismatch(50.0, 0.0) is True
    assert is_mismatch(49.9, 0.0) is False
    assert is_mismatch(80.0, 10.0) is False


def test_estimate_k_method_of_moments():
    # a: 0,33 (mean 16.5); b: 66,100 (mean 83) → EPV 561.25, VHM 1930.5.
    k = estimate_k({"a": ["baik", "rusak_ringan"], "b": ["rusak_sedang", "rusak_berat"]})
    assert k == pytest.approx(561.25 / 1930.5)


def test_estimate_k_none_bila_data_kurang():
    assert estimate_k({}) is None
    assert estimate_k({"a": ["rusak_berat"], "b": ["baik"]}) is None


def test_estimate_k_none_bila_vhm_nol_atau_negatif():
    # Semua sekolah bernilai sama → variasi antar-sekolah 0 → VHM ≤ 0.
    assert estimate_k(
        {
            "a": ["rusak_sedang", "rusak_sedang"],
            "b": ["rusak_sedang", "rusak_sedang"],
        }
    ) is None
