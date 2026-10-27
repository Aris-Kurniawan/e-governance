"""Test regresi DBG-021 + DBG-022 — skor klaster tanpa back-calc & Dapodik aktif.

DBG-022: `create_vote` dan endpoint F3.14 dulu memakai `kondisi_dapodik` hardcode
nol → setiap vote menghapus komponen Dapodik 30% dari `skor_keparahan`.
DBG-021: skor tersimpan adalah snapshot; wajib bisa direproduksi dari sumber
saat ini (laporan + kondisi_sarana + votes) lewat `calculate_score_components`.
"""

import pytest

from app.ai_pipeline.scoring import (
    calculate_priority_score,
    calculate_score_components,
    hitung_kondisi_dapodik,
)
from app.models.laporan import Laporan
from app.models.sekolah import KondisiSarana

from test_blackbox import login, auth, make_klaster, make_laporan, make_sekolah, make_user


def _seed_sarana(db, sekolah_npsn: str) -> None:
    """10 ruang: 5 rusak berat, 5 baik → skor_dapodik = 50."""
    db.add(
        KondisiSarana(
            sekolah_npsn=sekolah_npsn,
            nama_ruang="ruang_kelas",
            jumlah=10,
            kondisi_baik=5,
            kondisi_rusak_ringan=0,
            kondisi_rusak_sedang=0,
            kondisi_rusak_berat=5,
        )
    )
    db.commit()


class TestHitungKondisiDapodik:
    def test_kosong_bila_tanpa_sarana(self, db_session):
        sekolah = make_sekolah(db_session)
        assert hitung_kondisi_dapodik(db_session, sekolah.npsn) == {
            "total": 0,
            "berat": 0,
            "sedang": 0,
            "ringan": 0,
        }

    def test_agregasi_benar(self, db_session):
        sekolah = make_sekolah(db_session)
        _seed_sarana(db_session, sekolah.npsn)
        hasil = hitung_kondisi_dapodik(db_session, sekolah.npsn)
        assert hasil == {"total": 10, "berat": 5, "sedang": 0, "ringan": 0}


class TestVotePertahankanDapodik:
    """Regresi DBG-022: vote tidak boleh menghapus komponen Dapodik 30%."""

    def test_create_vote_mempertahankan_komponen_dapodik(
        self, test_client, db_session
    ):
        user = make_user(db_session, role="warga_terverifikasi")
        sekolah = make_sekolah(db_session)
        _seed_sarana(db_session, sekolah.npsn)
        laporan = make_laporan(db_session, user, sekolah)
        laporan.kondisi_dilaporkan = "rusak_berat"
        db_session.commit()
        klaster = make_klaster(db_session, sekolah)
        laporan.klaster_id = klaster.id
        db_session.commit()

        token = login(test_client, user.email)
        r = test_client.post(
            "/vote", params={"klaster_id": klaster.id}, headers=auth(token)
        )
        assert r.status_code == 200, r.text

        db_session.refresh(klaster)
        # Laporan rusak_berat (100) + Dapodik 50 → keparahan = 0.7*100 + 0.3*50 = 85
        assert float(klaster.skor_keparahan or 0) == pytest.approx(85.0, abs=0.01)
        # prioritas = keparahan + 1 vote
        assert float(klaster.skor_prioritas or 0) == pytest.approx(86.0, abs=0.01)

    def test_endpoint_hitung_ulang_f314_mempertahankan_dapodik(
        self, test_client, db_session
    ):
        """PUT /vote/klaster/{id}/skor dulu MENGERUSAK (Dapodik → nol)."""
        admin = make_user(db_session, role="admin")
        user = make_user(db_session, role="warga_terverifikasi")
        sekolah = make_sekolah(db_session)
        _seed_sarana(db_session, sekolah.npsn)
        laporan = make_laporan(db_session, user, sekolah)
        laporan.kondisi_dilaporkan = "rusak_berat"
        db_session.commit()
        klaster = make_klaster(db_session, sekolah)
        klaster.jumlah_vote_terhitung = 6
        db_session.commit()
        laporan.klaster_id = klaster.id
        db_session.commit()

        token = login(test_client, admin.email)
        r = test_client.put(
            f"/vote/klaster/{klaster.id}/skor", headers=auth(token)
        )
        assert r.status_code == 200, r.text

        db_session.refresh(klaster)
        # Bukan 0.7*100 = 70 (kasus Dapodik nol), melainkan 85 dengan Dapodik 50.
        assert float(klaster.skor_keparahan or 0) == pytest.approx(85.0, abs=0.01)
        assert float(klaster.skor_prioritas or 0) == pytest.approx(91.0, abs=0.01)


class TestSkorTersimpanReproducible:
    """Regresi DBG-021: skor tersimpan == hitung ulang dari sumber saat ini."""

    def test_klaster_baru_konsisten_dengan_hitung_ulang(
        self, test_client, db_session
    ):
        """Vote menulis skor → rerun hitung ulang harus mereproduksi nilai yang sama.

        Ini inti skrip `recompute_skor.py`: selisih ≤ 0,01 berarti idempoten
        (dan setelah `--commit`, dry-run ulang menghasilkan 0 perubahan).
        """
        user = make_user(db_session, role="warga_terverifikasi")
        sekolah = make_sekolah(db_session)
        _seed_sarana(db_session, sekolah.npsn)
        laporan = make_laporan(db_session, user, sekolah)
        laporan.kondisi_dilaporkan = "rusak_sedang"
        db_session.commit()
        klaster = make_klaster(db_session, sekolah)
        laporan.klaster_id = klaster.id
        db_session.commit()

        token = login(test_client, user.email)
        r = test_client.post(
            "/vote", params={"klaster_id": klaster.id}, headers=auth(token)
        )
        assert r.status_code == 200, r.text
        db_session.refresh(klaster)

        # Hitung ulang dari sumber (pola identik skrip recompute_skor.py).
        rows = (
            db_session.query(Laporan)
            .filter(Laporan.klaster_id == klaster.id)
            .all()
        )
        kondisi = [{"kondisi_dilaporkan": lap.kondisi_dilaporkan} for lap in rows]
        dapo = hitung_kondisi_dapodik(db_session, sekolah.npsn)
        kep, pri = calculate_score_components(
            kondisi, dapo, klaster.jumlah_vote_terhitung or 0
        )

        assert float(klaster.skor_keparahan or 0) == pytest.approx(kep, abs=0.01)
        assert float(klaster.skor_prioritas or 0) == pytest.approx(pri, abs=0.01)


class TestKontrakLama:
    """calculate_priority_score wajib tetap float dan konsisten (test_scoring_null)."""

    def test_priority_adalah_komponen_kedua(self):
        kondisi = [{"kondisi_dilaporkan": "rusak_berat"}]
        dapo = {"total": 10, "berat": 5, "sedang": 0, "ringan": 0}
        kep, pri = calculate_score_components(kondisi, dapo, votes=3)
        lama = calculate_priority_score(kondisi, dapo, votes=3)
        assert isinstance(lama, float)
        assert lama == pytest.approx(pri)
        assert kep == pytest.approx(pri - 3)  # prioritas - votes == keparahan (D-07)
