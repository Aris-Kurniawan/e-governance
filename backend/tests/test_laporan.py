"""Regression test untuk kontrak POST /laporan tanpa field `kategori`.

Fase A (Keputusan #1, 2026-09-23): laporan adalah teks bebas — field
`kategori` dihapus. Test ini mengunci bahwa endpoint menerima request
tanpa `kategori` (AI yang menentukan kategori di tabel klaster).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Seed satu sekolah (FK target laporan) + user via register/login
    from app.models.sekolah import Sekolah

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestingSessionLocal() as db:
        db.add(Sekolah(npsn="20505816", nama="SDN Test", jenjang="SD"))
        db.commit()

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def _login(client):
    client.post(
        "/auth/register",
        json={
            "nama": "Pelapor Laporan",
            "nik": "3513010101900099",
            "email": "pelapor.laporan@example.com",
            "password": "securepassword123",
        },
    )
    r = client.post(
        "/auth/login",
        json={"email": "pelapor.laporan@example.com", "password": "securepassword123"},
    )
    return r.json()["data"]["access_token"]


def test_create_laporan_tanpa_kategori(client):
    token = _login(client)
    res = client.post(
        "/laporan",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "sekolah_npsn": "20505816",
            "deskripsi": "Atap ruang kelas bocor saat hujan sehingga kegiatan belajar terganggu",
        },
    )
    assert res.status_code == 201, res.text
    # Envelope { data: ... } sesuai INTERFACES.md §0.1 (diperbaiki di F4.2/F4.4)
    body = res.json()["data"]
    assert "kategori" not in body, "Field kategori tidak boleh ada di response laporan"
    assert body["sekolah_npsn"] == "20505816"
    assert "bocor" in body["deskripsi"].lower()


def test_create_laporan_menolak_kategori_kalau_dikirim(client):
    token = _login(client)
    # Kirim field kategori sekalipun -> harus diabaikan/tidak valid (schema tanpa kategori)
    res = client.post(
        "/laporan",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "sekolah_npsn": "20505816",
            "kategori": "ruang_belajar",
            "deskripsi": "Meja kelas banyak yang rusak",
        },
    )
    assert res.status_code == 201, res.text
    # kategori tidak disimpan karena tidak ada di schema
    assert "kategori" not in res.json()["data"]
