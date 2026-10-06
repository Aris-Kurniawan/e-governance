"""
F3.5 — Formula Urgensi KBM + Skor Prioritas (per spec TASK_GUIDE + DECISIONS.md D-07).
"""

from typing import List, Dict, Optional


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
    # Severity mapping per laporan
    severity_map = {
        "baik": 0,
        "rusak_ringan": 33,
        "rusak_sedang": 66,
        "rusak_berat": 100,
    }
    
    # Skor dari laporan warga (average severity)
    if kondisi_laporan:
        severities = [severity_map.get(lap.get("kondisi_dilaporkan", "baik"), 0) for lap in kondisi_laporan]
        skor_laporan = sum(severities) / len(severities)
    else:
        skor_laporan = 0.0
    
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
