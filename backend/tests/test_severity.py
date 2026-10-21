"""F4.16 — unit test baseline severity K1 + guard integrasi cron."""

from __future__ import annotations

from importlib.machinery import SourceFileLoader
from importlib.util import module_from_spec, spec_from_loader
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.ai_pipeline.severity import (
    DEFINISI,
    LEVELS,
    classify_severity,
    deteksi_gejala_teks,
    explain,
    gabung_severity,
    severity_dari_jawaban,
)


def test_definisi_empat_level_lengkap():
    assert set(DEFINISI) == set(LEVELS)
    assert all(DEFINISI[level] for level in LEVELS)


@pytest.mark.parametrize(
    "teks,harapan",
    [
        ("Atap ruang kelas runtuh menimpa meja", "rusak_berat"),
        ("Atap bocor dan plafon melendut saat hujan", "rusak_sedang"),
        ("Cat dinding mengelupas dan berjamur", "rusak_ringan"),
        ("Kondisi ruang kelas masih baik", "baik"),
        ("", "rusak_ringan"),  # default terdokumentasi, bukan hasil klasifikasi
    ],
)
def test_k1_kata_kunci(teks, harapan):
    if teks:
        assert deteksi_gejala_teks(teks)[0] == harapan
    else:
        assert deteksi_gejala_teks(teks)[0] is None
    assert classify_severity([teks]) == [harapan]


def test_k1_tie_breaker_level_lebih_parah():
    # "bocor" (sedang) + "runtuh" (berat) → menang yang lebih parah.
    assert deteksi_gejala_teks("Plafon bocor lalu runtuh")[0] == "rusak_berat"


def test_pengecuali_baik():
    # "normal" tidak boleh menang saat ada negasi kerusakan.
    assert deteksi_gejala_teks("Kondisi air tidak normal, tidak ada air bersih")[0] != "baik"


def test_jawaban_konfirmasi_menang_atas_teks():
    jawaban = [{"kode": "gejala_atap", "nilai": "g4"}]
    assert severity_dari_jawaban(jawaban) == "rusak_berat"
    assert classify_severity(
        [{"deskripsi": "Cat dinding mengelupas", "jawaban": jawaban}]
    ) == ["rusak_berat"]


def test_jawaban_tidak_ada_gejala_jadi_baik():
    assert severity_dari_jawaban(
        [{"kode": "gejala_atap", "nilai": "g0"}]
    ) == "baik"
    assert gabung_severity("rusak_berat", "baik") == "baik"


def test_explain_mencatat_alasan():
    hasil = explain("Dinding retak lebar dan plesteran jatuh")
    assert hasil["kondisi"] == "rusak_sedang" or hasil["kondisi"] == "rusak_berat"
    assert hasil["sumber"] == "teks"
    assert hasil["kata_kunci"]


def _muat_run_clustering(nama: str):
    path = Path(__file__).resolve().parent.parent / "scripts" / "run_clustering.py"
    loader = SourceFileLoader(nama, str(path))
    spec = spec_from_loader(nama, loader)
    assert spec is not None
    modul = module_from_spec(spec)
    loader.exec_module(modul)
    return modul


def test_guard_cron_tidak_menimpa_koreksi_warga_dan_nilai_existing():
    modul = _muat_run_clustering("run_clustering_f416")

    baris = [
        SimpleNamespace(
            deskripsi="Atap runtuh",
            kondisi_dilaporkan=None,
            sumber_kondisi="warga",  # koreksi manusia — jangan disentuh
            jawaban_konfirmasi=None,
        ),
        SimpleNamespace(
            deskripsi="Atap bocor",
            kondisi_dilaporkan="rusak_sedang",  # sudah ada nilai
            sumber_kondisi="ai",
            jawaban_konfirmasi=None,
        ),
        SimpleNamespace(
            deskripsi="Dinding retak",
            kondisi_dilaporkan=None,
            sumber_kondisi=None,
            jawaban_konfirmasi=None,
        ),
        SimpleNamespace(
            deskripsi="Cat mengelupas",
            kondisi_dilaporkan=None,
            sumber_kondisi=None,
            jawaban_konfirmasi={"jawaban": [{"kode": "gejala_dinding", "nilai": "g4"}]},
        ),
    ]

    jumlah = modul.apply_severity(baris)

    assert jumlah == 2
    assert baris[0].kondisi_dilaporkan is None
    assert baris[0].sumber_kondisi == "warga"
    assert baris[1].kondisi_dilaporkan == "rusak_sedang"
    assert baris[2].kondisi_dilaporkan == "rusak_ringan"
    assert baris[2].sumber_kondisi == "ai"
    assert baris[3].kondisi_dilaporkan == "rusak_berat"
    assert baris[3].sumber_kondisi == "ai"


def test_guard_tanpa_kandidat():
    modul = _muat_run_clustering("run_clustering_f416_empty")

    baris = [
        SimpleNamespace(
            deskripsi="Atap runtuh",
            kondisi_dilaporkan=None,
            sumber_kondisi="warga",
            jawaban_konfirmasi=None,
        )
    ]
    assert modul.apply_severity(baris) == 0
