"""Pengujian Keamanan Validasi Input (Penetration & Fuzzing Protection).

Menguji pembatasan karakter dan payload berbahaya (SQLi, XSS, DoS string bomb, format bypass).
Sesuai kontrak INTERFACES.md §0.3, validasi schema yang gagal mengembalikan HTTP 400 VALIDATION_ERROR.
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

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestAuthInputSecurity:
    """Uji proteksi input endpoint /auth."""

    def test_register_nik_contains_letters_rejected_400(self, client):
        """NIK mengandung huruf atau karakter non-angka harus ditolak 400 VALIDATION_ERROR."""
        payload = {
            "nama": "Pelamar Uji",
            "nik": "351301010190000a",  # ada huruf
            "email": "uji_nik_huruf@example.com",
            "password": "Password123!",
        }
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_register_nik_sqli_payload_rejected_400(self, client):
        """NIK berupa SQL injection string harus ditolak 400 VALIDATION_ERROR oleh schema."""
        payload = {
            "nama": "Hacker",
            "nik": "' OR 1=1 -- 1234",
            "email": "sqli@example.com",
            "password": "Password123!",
        }
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_register_nik_xss_payload_rejected_400(self, client):
        """NIK berupa tag XSS harus ditolak 400 VALIDATION_ERROR."""
        payload = {
            "nama": "Hacker",
            "nik": "<script>alert(1)",
            "email": "xss@example.com",
            "password": "Password123!",
        }
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_register_password_dos_bomb_rejected_400(self, client):
        """Password string raksasa (>128 char) untuk membebani bcrypt harus ditolak 400 VALIDATION_ERROR."""
        payload = {
            "nama": "Bcrypt Attacker",
            "nik": "3513010101900001",
            "email": "dos_pwd@example.com",
            "password": "A" * 5000,
        }
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_register_nama_oversized_rejected_400(self, client):
        """Nama > 100 karakter harus ditolak 400 VALIDATION_ERROR."""
        payload = {
            "nama": "A" * 150,
            "nik": "3513010101900001",
            "email": "oversized_nama@example.com",
            "password": "Password123!",
        }
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_login_password_bomb_rejected_400(self, client):
        """Login dengan password string raksasa (>128 char) harus ditolak 400 VALIDATION_ERROR."""
        payload = {
            "email": "user@example.com",
            "password": "B" * 2000,
        }
        res = client.post("/auth/login", json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"


class TestLaporanInputSecurity:
    """Uji proteksi input endpoint /laporan."""

    def _setup_auth(self, client):
        reg_res = client.post(
            "/auth/register",
            json={
                "nama": "Pelapor Sah",
                "nik": "3513010101900009",
                "email": "pelapor_sah@example.com",
                "password": "Password123!",
            },
        )
        assert reg_res.status_code == 201

        login_res = client.post(
            "/auth/login",
            json={"email": "pelapor_sah@example.com", "password": "Password123!"},
        )
        token = login_res.json()["data"]["access_token"]
        return token

    def test_laporan_npsn_non_numeric_rejected_400(self, client):
        """NPSN sekolah harus 8 digit numerik; teks/simbol ditolak 400 VALIDATION_ERROR."""
        token = self._setup_auth(client)
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "sekolah_npsn": "NPSN1234",  # ada huruf
            "deskripsi": "Atap kelas runtuh",
        }
        res = client.post("/laporan", headers=headers, json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_laporan_npsn_xss_rejected_400(self, client):
        """NPSN berupa script XSS ditolak 400 VALIDATION_ERROR."""
        token = self._setup_auth(client)
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "sekolah_npsn": "<script>",
            "deskripsi": "Atap kelas runtuh",
        }
        res = client.post("/laporan", headers=headers, json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_laporan_deskripsi_oversized_rejected_400(self, client):
        """Deskripsi melebihi 2500 karakter ditolak 400 VALIDATION_ERROR."""
        token = self._setup_auth(client)
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "sekolah_npsn": "20505816",
            "deskripsi": "X" * 3000,
        }
        res = client.post("/laporan", headers=headers, json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_laporan_fasilitas_oversized_rejected_400(self, client):
        """Fasilitas terkait melebihi 150 karakter ditolak 400 VALIDATION_ERROR."""
        token = self._setup_auth(client)
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "sekolah_npsn": "20505816",
            "fasilitas_terkait": "F" * 200,
            "deskripsi": "Atap kelas runtuh",
        }
        res = client.post("/laporan", headers=headers, json=payload)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"
