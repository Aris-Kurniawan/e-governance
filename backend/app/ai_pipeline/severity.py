"""F4.16 — Klasifikasi severity dari teks (lapis 2).

Fungsi utama: ``classify_severity(texts) -> list[str]``. Jalur ekstraksi dan
pemetaan dipisah:

- ``deteksi_gejala_teks``  → sinyal dari deskripsi (K1: aturan kata kunci)
- ``severity_dari_jawaban`` → jawaban konfirmasi lapis 1 (selalu menang)
- ``gabung_severity``      → nilai enum final

Baseline K1 **bukan** model terlatih. Ini pembanding wajib untuk ablation
K1–K4 (`scripts/severity_ablation.py`). Label latih berasal dari LLM +
verifikasi manual 50 sampel (SPEC §17.1); label seed `setup_f300.py` dilarang.
"""

from __future__ import annotations

from typing import Iterable, Sequence

from app.ai_pipeline.question_bank import cari_pilihan

LEVELS = ("baik", "rusak_ringan", "rusak_sedang", "rusak_berat")
URUT = {level: i for i, level in enumerate(LEVELS)}

# Definisi wajib disertakan saat melabeli dengan LLM (SPEC §17.1 butir 2).
DEFINISI = {
    "baik": "Tidak ada kerusakan yang teramati; komponen berfungsi normal.",
    "rusak_ringan": (
        "Kerusakan ringan/sangat ringan: cat mengelupas, retak rambut, "
        "goresan, atau kerusakan pada ≤30% komponen."
    ),
    "rusak_sedang": (
        "Kerusakan sedang: bocor meluas, retak lebar, penutup terlepas "
        "sebagian, atau kerusakan pada 31–45% komponen."
    ),
    "rusak_berat": (
        "Kerusakan berat/sangat berat: runtuh, ambruk, melendut sangat besar, "
        "komponen tidak berfungsi, atau kerusakan pada >45% komponen."
    ),
}

# K1 — aturan kata kunci. Urutan tidak menentukan hasil; jumlah kecocokan
# menentukan, tie-breaker = level lebih parah.
RULES: dict[str, tuple[str, ...]] = {
    "rusak_berat": (
        "runtuh",
        "ambruk",
        "hancur",
        "terbakar",
        "tertekuk",
        "miring",
        "bergeser",
        "besi terlihat",
        "selimut beton",
        "tidak berfungsi sama sekali",
        "mati total",
        "putus total",
        "patah",
        "pecah",
        "jatuh",
        "parah",
        "sangat berat",
        "darurat",
    ),
    "rusak_sedang": (
        "bocor",
        "tiris",
        "retak lebar",
        "retakan lebar",
        "melendut",
        "melengkung",
        "terkelupas meluas",
        "tersumbat",
        "menggenang",
        "genangan",
        "keropos",
        "lapuk",
        "tidak bisa ditutup",
        "lepas dari rangka",
        "terlepas sebagian",
        "tidak ada air",
        "tidak ada listrik",
        "tidak ada toilet",
    ),
    "rusak_ringan": (
        "retak",
        "mengelupas",
        "tergores",
        "gores",
        "berjamur",
        "lumut",
        "warna berubah",
        "kotor",
        "kusam",
        "tidak memadai",
        "tidak cukup",
        "belum sesuai",
        "tidak aman",
        "sebagian mati",
        "tidak berfungsi sebagian",
    ),
    "baik": (
        "tidak ada kerusakan",
        "tidak ada masalah",
        "kondisi baik",
        "masih baik",
        "berfungsi normal",
        "normal",
    ),
}

# Frasa yang membalik klaim "baik" (mis. "tidak ada air bersih").
PENGECUALI_BAIK = (
    "tidak ada air",
    "tidak ada listrik",
    "tidak ada akses",
    "tidak ada toilet",
    "tidak berfungsi",
    "tidak normal",
    "kurang normal",
)


def _normalisasi(text: str) -> str:
    return " ".join((text or "").lower().split())


def deteksi_gejala_teks(deskripsi: str) -> tuple[str | None, tuple[str, ...]]:
    """K1: kembalikan (level, kata kunci yang cocok) dari satu deskripsi."""
    teks = _normalisasi(deskripsi)
    if not teks:
        return None, ()

    skor: dict[str, int] = {}
    cocok: dict[str, list[str]] = {}
    for level, frasa_list in RULES.items():
        hits = [frasa for frasa in frasa_list if frasa in teks]
        if not hits:
            continue
        if level == "baik" and any(p in teks for p in PENGECUALI_BAIK):
            continue
        skor[level] = len(hits)
        cocok[level] = hits

    if not skor:
        return None, ()
    level = max(skor, key=lambda l: (skor[l], URUT[l]))
    return level, tuple(cocok[level])


def severity_dari_jawaban(jawaban: Sequence[dict] | None) -> str | None:
    """Ambil severity tertinggi dari jawaban konfirmasi (lapis 1)."""
    if not jawaban:
        return None
    tingkat: list[str] = []
    for item in jawaban:
        if not isinstance(item, dict):
            continue
        pilihan = cari_pilihan(str(item.get("kode", "")), str(item.get("nilai", "")))
        if pilihan and pilihan.get("tingkat") in URUT:
            tingkat.append(pilihan["tingkat"])
    if not tingkat:
        return None
    return max(tingkat, key=lambda l: URUT[l])


def gabung_severity(
    dari_teks: str | None, dari_jawaban: str | None
) -> str:
    """Jawaban warga menang; bila tidak ada jawaban, pakai teks.

    Default ``rusak_ringan`` bila tidak ada sinyal sama sekali: laporan dibuat
    karena ada masalah, tetapi ini **asumsi**, bukan hasil klasifikasi. Alasan
    default dicatat di ``explain``.
    """
    if dari_jawaban is not None:
        return dari_jawaban
    if dari_teks is not None:
        return dari_teks
    return "rusak_ringan"


def explain(deskripsi: str, jawaban: Sequence[dict] | None = None) -> dict:
    """Penjelasan singkat untuk audit/verifikasi manual."""
    dari_teks, kata = deteksi_gejala_teks(deskripsi)
    dari_jawaban = severity_dari_jawaban(jawaban)
    final = gabung_severity(dari_teks, dari_jawaban)
    if dari_jawaban is not None:
        alasan = f"jawaban konfirmasi: {dari_jawaban}"
    elif dari_teks is not None:
        alasan = f"kata kunci: {', '.join(kata)}"
    else:
        alasan = "tidak ada sinyal; default rusak_ringan"
    return {
        "kondisi": final,
        "sumber": "jawaban" if dari_jawaban else ("teks" if dari_teks else "default"),
        "alasan": alasan,
        "kata_kunci": list(kata),
    }


def classify_severity(
    texts: Iterable[str | dict],
    jawaban: Sequence[dict] | None = None,
) -> list[str]:
    """Klasifikasi batch. Menerima string atau dict ``{"deskripsi", "jawaban"}``.

    ``jawaban`` level-batch hanya dipakai untuk input string; untuk input dict,
    jawaban per-item diambil dari ``item["jawaban"]``.
    """
    hasil: list[str] = []
    for item in texts:
        if isinstance(item, dict):
            hasil.append(
                gabung_severity(
                    deteksi_gejala_teks(item.get("deskripsi", ""))[0],
                    severity_dari_jawaban(item.get("jawaban")),
                )
            )
        else:
            hasil.append(
                gabung_severity(
                    deteksi_gejala_teks(item)[0],
                    severity_dari_jawaban(jawaban),
                )
            )
    return hasil
