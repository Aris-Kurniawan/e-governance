"""Regresi endpoint tindak lanjut laporan non-klaster."""

import uuid

from app.core.deps import hash_password
from app.models.laporan import Laporan
from app.models.sekolah import Sekolah
from app.models.user import User


def _user(db, role: str) -> User:
    user = User(
        email=f"tindak_{role}_{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password"),
        role=role,
        nama="Pengguna Uji",
        status_verifikasi="terverifikasi",
    )
    db.add(user)
    db.commit()
    return user


def _token(client, user: User) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": user.email, "password": "password"})
    assert response.status_code == 200
    access_token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def _laporan(db, user: User) -> Laporan:
    sekolah = Sekolah(
        npsn=str(90000000 + (uuid.uuid4().int % 999999)),
        nama="Sekolah Uji",
        jenjang="SMP",
    )
    db.add(sekolah)
    db.flush()
    laporan = Laporan(
        tracking_id=f"LAP-TL-{uuid.uuid4().hex[:8].upper()}",
        user_id=user.id,
        sekolah_npsn=sekolah.npsn,
        deskripsi="Laporan noise untuk diuji tindak lanjutnya",
        hasil_klasterisasi="noise",
    )
    db.add(laporan)
    db.commit()
    return laporan


def test_tindak_lanjut_noise_dapat_diulang_dan_tercatat(test_client, db_session):
    pemilik = _user(db_session, "warga_terverifikasi")
    laporan = _laporan(db_session, pemilik)
    verifikator = _user(db_session, "verifikator_dinas")
    headers = _token(test_client, verifikator)

    for alasan in ("Mulai pemeriksaan", "Material telah dikirim"):
        response = test_client.post(
            f"/laporan/{laporan.id}/tindak-lanjut",
            params={"status": "dalam_proses", "alasan": alasan},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "dalam_proses"

    riwayat = test_client.get(
        f"/laporan/{laporan.id}/riwayat-tindak-lanjut", headers=headers
    )
    assert riwayat.status_code == 200
    assert len(riwayat.json()["data"]) == 2


def test_tindak_lanjut_menolak_admin_dan_alasan_kosong(test_client, db_session):
    pemilik = _user(db_session, "warga_terverifikasi")
    laporan = _laporan(db_session, pemilik)
    admin = _user(db_session, "admin")
    verifikator = _user(db_session, "verifikator_dinas")

    forbidden = test_client.post(
        f"/laporan/{laporan.id}/tindak-lanjut",
        params={"status": "selesai"},
        headers=_token(test_client, admin),
    )
    assert forbidden.status_code == 403

    alasan_kosong = test_client.post(
        f"/laporan/{laporan.id}/tindak-lanjut",
        params={"status": "tidak_dapat_ditindaklanjuti"},
        headers=_token(test_client, verifikator),
    )
    assert alasan_kosong.status_code == 422
    assert alasan_kosong.json()["error"]["code"] == "REASON_REQUIRED"
