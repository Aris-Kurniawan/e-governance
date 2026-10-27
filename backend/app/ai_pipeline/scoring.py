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

# D-24: kekuatan prior pada shrinkage skor laporan. Kebijakan, bukan estimasi
# data (lihat AI_PIPELINE_ABLATION_STUDY.md §10.4.1). Dapat dioverride lewat
# `settings.SHRINKAGE_K` oleh pemanggil.
SHRINKAGE_K = 5

# D-24: mismatch = laporan warga tinggi tetapi Dapodik menyatakan tidak ada
# kerusakan. Penanda saja — skor tidak diubah.
MISMATCH_SKOR_LAPORAN = 50


def _severities(kondisi_laporan: List[Optional[str]]) -> List[int]:
    """Nilai severity untuk enum valid; NULL / nilai asing dibuang."""
    return [SEVERITY_MAP[s] for s in kondisi_laporan if s in SEVERITY_MAP]


def compute_prior(laporan_per_sekolah: Dict[str, List[Optional[str]]]) -> float:
    """Prior global D-24: Σ(mean_sekolah × n) / Σn — dihitung dari enum valid.

    Karena Σ(mean × n) = Σ(nilai), cukup menjumlahkan seluruh severity.
    `n = 0` tidak menambah pembilang maupun penyebut. Mengembalikan nilai
    mentah (belum dibulatkan); pemanggil yang membulatkan untuk respons.
    """
    total_n = 0
    total_severity = 0
    for laporan in laporan_per_sekolah.values():
        nilai = _severities(laporan)
        total_n += len(nilai)
        total_severity += sum(nilai)
    return total_severity / total_n if total_n else 0.0


def is_mismatch(skor_laporan: float, skor_dapodik: float) -> bool:
    """D-24: laporan warga tinggi (≥50) tetapi Dapodik menyatakan 0 kerusakan."""
    return skor_laporan >= MISMATCH_SKOR_LAPORAN and skor_dapodik == 0


def estimate_k(
    laporan_per_sekolah: Dict[str, List[Optional[str]]],
) -> Optional[float]:
    """Estimasi K = EPV/VHM (method of moments, Bühlmann) untuk gate produksi.

    Mengembalikan `None` bila data tidak cukup atau `VHM <= 0` — pada kondisi
    itu kredibilitas 0 (skor = prior) dan peringkat per-sekolah tidak bermakna.
    Nilai ini TIDAK dipakai sebagai default produksi; `K = 5` tetap kebijakan
    sampai laporan riil tersedia (D-24).
    """
    stats: List[tuple[int, float, float]] = []  # (n, mean, variance)
    total_n = 0
    total_severity = 0
    for laporan in laporan_per_sekolah.values():
        nilai = _severities(laporan)
        n = len(nilai)
        if n == 0:
            continue
        mean = sum(nilai) / n
        variance = (
            sum((v - mean) ** 2 for v in nilai) / (n - 1) if n > 1 else 0.0
        )
        stats.append((n, mean, variance))
        total_n += n
        total_severity += sum(nilai)

    if total_n == 0 or len(stats) < 2:
        return None

    derajat_bebas = sum(n - 1 for n, _, _ in stats)
    if derajat_bebas <= 0:
        return None

    epv = sum((n - 1) * var for n, _, var in stats) / derajat_bebas
    grand_mean = total_severity / total_n
    m = len(stats)

    pembilang = (
        sum(n * (mean - grand_mean) ** 2 for n, mean, _ in stats)
        - (m - 1) * epv
    )
    penyebut = total_n - sum(n * n for n, _, _ in stats) / total_n
    if penyebut <= 0:
        return None

    vhm = pembilang / penyebut
    if vhm <= 0:
        return None
    return epv / vhm


def calculate_kbm_score(
    kondisi_laporan: List[Optional[str]],
    kondisi_dapodik: Dict[str, int],
    prior: Optional[float] = None,
    k: int = SHRINKAGE_K,
) -> Dict[str, float]:
    """F4.8 (D-22) + F4.12 (D-24): Skor dampak KBM satu sekolah, skala 0–100.

        skor_laporan = λ × mean + (1−λ) × prior,  λ = n/(n+K)
        skor_kbm     = 0.7 × skor_laporan + 0.3 × skor_dapodik

    Args:
        kondisi_laporan: daftar nilai `laporan.kondisi_dilaporkan`
            (None / di luar enum tidak dihitung).
        kondisi_dapodik: {"total": int, "berat": int, "sedang": int, "ringan": int}
        prior: prior global dari `compute_prior`; `None` = perilaku lama
            (tanpa shrinkage) untuk kompatibilitas.
        k: kekuatan prior (default SHRINKAGE_K = 5).

    Returns:
        {"skor_kbm": float, "skor_laporan": float, "skor_dapodik": float}
    """
    severities = _severities(kondisi_laporan)
    n = len(severities)
    mean_severity = sum(severities) / n if n else 0.0

    if n == 0:
        # D-22: tanpa laporan = tanpa klaim, bukan ditarik ke prior.
        skor_laporan = 0.0
    elif prior is None or k <= 0:
        skor_laporan = mean_severity
    else:
        lam = n / (n + k)
        skor_laporan = lam * mean_severity + (1 - lam) * prior

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


def hitung_kondisi_dapodik(db, sekolah_npsn: str) -> Dict[str, int]:
    """Agregasi `KondisiSarana` sekolah → {"total","berat","sedang","ringan"}.

    DBG-022: logika ini sebelumnya terduplikasi di `routers/klaster.py` dan
    `scripts/run_clustering.py`, sementara `routers/vote.py` (create_vote +
    endpoint F3.14) memakai dict nol → vote menghapus komponen Dapodik 30%.
    Satu sumber kebenaran di sini dipakai SEMUA call site penulisan skor.
    """
    from sqlalchemy import select  # lazy: hindari circular import saat import modul

    from app.models.sekolah import KondisiSarana

    stmt = select(KondisiSarana).where(KondisiSarana.sekolah_npsn == sekolah_npsn)
    kondisi_dapodik = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}
    for sarana in db.execute(stmt).scalars():
        kondisi_dapodik["total"] += sarana.jumlah or 0
        kondisi_dapodik["berat"] += sarana.kondisi_rusak_berat or 0
        kondisi_dapodik["sedang"] += sarana.kondisi_rusak_sedang or 0
        kondisi_dapodik["ringan"] += sarana.kondisi_rusak_ringan or 0
    return kondisi_dapodik


def calculate_score_components(
    kondisi_laporan: List[Dict],
    kondisi_dapodik: Dict[str, int],
    votes: int,
) -> tuple:
    """Kembalikan (skor_keparahan, skor_prioritas) — D-07 tanpa back-calc.

    DBG-021: `calculate_priority_score` hanya mengembalikan `skor_prioritas`,
    sehingga pemanggil harus menghitung mundur `skor_keparahan =
    skor_prioritas - votes`. Aritmetikanya benar, tetapi menyamarkan sebab
    saat salah satu komponen basi. Kedua nilai kini dihitung langsung.
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

    return skor_keparahan, skor_prioritas


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
    # Kontrak lama DIPERTAHANKAN (test_scoring_null bergantung) — untuk
    # pemanggil yang butuh kedua komponen tanpa hitung mundur, pakai
    # `calculate_score_components` (DBG-021).
    return calculate_score_components(kondisi_laporan, kondisi_dapodik, votes)[1]
