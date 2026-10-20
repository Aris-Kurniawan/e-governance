"""
F3.5 — Formula Urgensi KBM + Skor Prioritas (per spec TASK_GUIDE + DECISIONS.md D-07).
F4.8 — Skor KBM per sekolah (DECISIONS.md D-22).
"""

from typing import List, Dict, Optional

# Bobot severity per kondisi — dipakai bersama oleh skor prioritas (D-07)
# dan skor KBM (D-22).
SEVERITY_MAP = {
    "baik": 0,
    "rusak_ringan": 33,
    "rusak_sedang": 66,
    "rusak_berat": 100,
}


def calculate_kbm_score(
    kondisi_laporan: List[Optional[str]],
    kondisi_dapodik: Dict[str, int],
) -> Dict[str, float]:
    """F4.8 (D-22): Skor dampak KBM satu sekolah, skala 0–100.

        skor_kbm = 0.7 * AVG(severity laporan warga)
                 + 0.3 * Σ(weight × kondisi_rusak) / Σ(jumlah)

    Args:
        kondisi_laporan: daftar nilai `laporan.kondisi_dilaporkan`
            (None / di luar enum tidak dihitung).
        kondisi_dapodik: {"total": int, "berat": int, "sedang": int, "ringan": int}

    Returns:
        {"skor_kbm": float, "skor_laporan": float, "skor_dapodik": float}
    """
    severities = [SEVERITY_MAP[s] for s in kondisi_laporan if s in SEVERITY_MAP]
    skor_laporan = sum(severities) / len(severities) if severities else 0.0

    total = kondisi_dapodik.get("total", 0)
    if total > 0:
        skor_dapodik = (
            kondisi_dapodik.get("berat", 0) * 100
            + kondisi_dapodik.get("sedang", 0) * 66
            + kondisi_dapodik.get("ringan", 0) * 33
        ) / total
    else:
        skor_dapodik = 0.0

    skor_kbm = 0.7 * skor_laporan + 0.3 * skor_dapodik
    return {
        "skor_kbm": round(skor_kbm, 1),
        "skor_laporan": round(skor_laporan, 1),
        "skor_dapodik": round(skor_dapodik, 1),
    }


def kbm_level(skor: float) -> str:
    """F4.8 (D-22): kategori level dari skor KBM 0–100."""
    if skor >= 70:
        return "kritis"
    if skor >= 50:
        return "tinggi"
    if skor >= 40:
        return "sedang"
    return "rendah"


def calculate_priority_score(
    kondisi_laporan: List[Dict],
    kondisi_dapodik: Dict[str, int],
    votes: int,
) -> float:
    """
    Calculate final priority score for a cluster.
    
    Formula (DECISIONS.md D-07):
      skor_keparahan = 0.7 * skor_laporan + 0.3 * skor_dapodik
      skor_prioritas = skor_keparahan + votes
    
    Args:
        kondisi_laporan: list of dicts with key "kondisi_dilaporkan" ∈ {"baik", "rusak_ringan", "rusak_sedang", "rusak_berat"}
        kondisi_dapodik: dict { "total": int, "berat": int, "sedang": int, "ringan": int }
        votes: jumlah vote warga (dari tabel Vote)
        
    Returns: skor_prioritas (float, range ~0–200+)
    """
    # Skor dari laporan warga (average severity)
    # NULL / nilai di luar enum = "tidak ada data", BUKAN "kondisi baik" → dibuang.
    # Aturan ini wajib identik dengan calculate_kbm_score (lihat
    # docs/backend/SPEC_SEVERITY_KLASIFIKASI.md §17.3).
    severities = [
        SEVERITY_MAP[lap.get("kondisi_dilaporkan")]
        for lap in kondisi_laporan
        if lap.get("kondisi_dilaporkan") in SEVERITY_MAP
    ]
    skor_laporan = sum(severities) / len(severities) if severities else 0.0

    
    # Skor dari Dapodik (weighted sum / total fasilitas)
    total = kondisi_dapodik.get("total", 0)
    if total > 0:
        berat = kondisi_dapodik.get("berat", 0) * 100
        sedang = kondisi_dapodik.get("sedang", 0) * 66
        ringan = kondisi_dapodik.get("ringan", 0) * 33
        skor_dapodik = (berat + sedang + ringan) / total
    else:
        skor_dapodik = 0.0
    
    # Gabungan (70% laporan warga, 30% Dapodik)
    skor_keparahan = 0.7 * skor_laporan + 0.3 * skor_dapodik
    
    # Skor prioritas final (keparahan + vote)
    skor_prioritas = skor_keparahan + votes
    
    return skor_prioritas
