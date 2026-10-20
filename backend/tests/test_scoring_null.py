"""Test regresi: perilaku NULL di scoring.py harus identik antara
calculate_kbm_score dan calculate_priority_score.

Aturan (SPEC_SEVERITY_KLASIFIKASI.md §17.3):
  NULL / nilai di luar enum = "tidak ada data", BUKAN "kondisi baik" -> dibuang.
"""
import pytest

from app.ai_pipeline.scoring import (
    SEVERITY_MAP,
    calculate_kbm_score,
    calculate_priority_score,
)

DAPO_KOSONG = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}


def _laporan(*kondisi):
    return [{"kondisi_dilaporkan": k} for k in kondisi]


# --- calculate_kbm_score -------------------------------------------------


def test_kbm_semua_null_tidak_dianggap_baik():
    """Semua laporan NULL -> skor_laporan 0 karena TIDAK ADA DATA.

    Nilai akhirnya sama dengan 'semua baik' (0.0), tapi test ini menjaga
    agar perilakunya tetap lewat jalur 'tanpa data', bukan jalur 'dianggap baik'.
    """
    hasil = calculate_kbm_score([None, None, None], DAPO_KOSONG)
    assert hasil["skor_laporan"] == 0.0


def test_kbm_null_dibuang_dari_rata_rata():
    """NULL tidak menarik rata-rata turun, karena tidak ikut dihitung."""
    # 2 laporan rusak_berat (100). NULL tidak boleh menurunkan rata-rata.
    hasil = calculate_kbm_score(["rusak_berat", None, "rusak_berat"], DAPO_KOSONG)
    assert hasil["skor_laporan"] == 100.0


def test_kbm_nilai_di_luar_enum_dibuang():
    hasil = calculate_kbm_score(["rusak_sedang", "entah_apa", ""], DAPO_KOSONG)
    assert hasil["skor_laporan"] == SEVERITY_MAP["rusak_sedang"]


# --- calculate_priority_score --------------------------------------------


def test_priority_semua_null_tidak_dianggap_baik():
    """Regresi utama: dulu NULL dipetakan ke 0 (= 'baik').

    Sekarang NULL dibuang, sehingga skor_keparahan hanya dari komponen Dapodik.
    """
    dapo = {"total": 10, "berat": 5, "sedang": 0, "ringan": 0}
    skor = calculate_priority_score(_laporan(None, None), dapo, votes=0)
    # 0.7 * 0 (tanpa data) + 0.3 * 50 (5/10 rusak berat) = 15.0
    assert skor == pytest.approx(15.0)


def test_priority_null_dibuang_dari_rata_rata():
    # 2 laporan rusak_berat + 1 NULL -> rata-rata tetap 100, bukan 66.67
    skor = calculate_priority_score(
        _laporan("rusak_berat", None, "rusak_berat"), DAPO_KOSONG, votes=0
    )
    assert skor == pytest.approx(0.7 * 100.0)


def test_priority_nilai_di_luar_enum_dibuang():
    skor = calculate_priority_score(
        _laporan("rusak_sedang", "tidak_dikenal"), DAPO_KOSONG, votes=0
    )
    assert skor == pytest.approx(0.7 * SEVERITY_MAP["rusak_sedang"])


def test_priority_kondisi_laporan_kosong():
    """List kosong (bukan NULL per-item) tetap aman."""
    skor = calculate_priority_score([], DAPO_KOSONG, votes=3)
    assert skor == pytest.approx(3.0)  # hanya vote


# --- konsistensi antar fungsi -------------------------------------------


def test_kedua_fungsi_konsisten_pada_data_yang_sama():
    """Aturan inti §17.3: kedua fungsi wajib sepakat soal NULL."""
    kondisi = ["rusak_sedang", None, None, "rusak_ringan"]
    kbm = calculate_kbm_score(kondisi, DAPO_KOSONG)
    prio = calculate_priority_score(_laporan(*kondisi), DAPO_KOSONG, votes=0)
    # skor_keparahan pada priority = 0.7 * skor_laporan (Dapodik kosong)
    assert prio == pytest.approx(0.7 * kbm["skor_laporan"])
