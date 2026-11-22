"""F4.12 — Uji endpoint manajemen akun (GET /users, GET /users/statistik).

Jalankan: cd backend && ./venv/bin/python -m pytest tests/test_users_admin.py -q
"""

import uuid

from app.core.deps import hash_password
from app.models.user import User


def make_user(db, role="warga_terverifikasi", status_verifikasi="terverifikasi", nama=None) -> User:
    user = User(
        email=f"usr_{role}_{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password"),
        role=role,
        nama=nama or f"Akun {role}",
        status_verifikasi=status_verifikasi,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client, email) -> str:
    resp = client.post("/auth/login", json={"email": email, "password": "password"})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def auth(token) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestUsersList:
    def test_admin_dapat_daftar_akun_dan_nik_tidak_dirender(self, test_client, db_session):
        """D-29: endpoint akun tidak boleh memuat NIK."""
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)

        r = test_client.get("/users", headers=auth(token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "data" in body and "meta" in body
        assert body["meta"]["page"] == 1
        assert body["meta"]["total_items"] >= 1
        for row in body["data"]:
            assert "nik" not in row
            assert "nik_encrypted" not in row
            assert "password_hash" not in row

    def test_verifikator_dan_kepala_dan_warga_403(self, test_client, db_session):
        for role in ("verifikator_dinas", "kepala_dinas", "warga_terverifikasi", "warga_umum"):
            u = make_user(db_session, role=role)
            token = login(test_client, u.email)
            r = test_client.get("/users", headers=auth(token))
            assert r.status_code == 403, f"{role} seharusnya 403, dapat {r.status_code}"

    def test_tanpa_token_401(self, test_client):
        assert test_client.get("/users").status_code == 401

    def test_filter_role(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        make_user(db_session, role="komite_sekolah")
        token = login(test_client, admin.email)

        r = test_client.get("/users", params={"role": "komite_sekolah"}, headers=auth(token))
        assert r.status_code == 200
        rows = r.json()["data"]
        assert rows and all(row["role"] == "komite_sekolah" for row in rows)

    def test_filter_status_menunggu(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        make_user(db_session, role="warga_umum", status_verifikasi="menunggu")
        token = login(test_client, admin.email)

        r = test_client.get("/users", params={"status_verifikasi": "menunggu"}, headers=auth(token))
        assert r.status_code == 200
        rows = r.json()["data"]
        assert rows and all(row["status_verifikasi"] == "menunggu" for row in rows)

    def test_pencarian_nama(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        unik = f"Zulfa{uuid.uuid4().hex[:6]}"
        make_user(db_session, role="warga_umum", nama=unik)
        token = login(test_client, admin.email)

        r = test_client.get("/users", params={"q": unik}, headers=auth(token))
        assert r.status_code == 200
        rows = r.json()["data"]
        assert len(rows) == 1 and rows[0]["nama"] == unik

    def test_role_tidak_dikenal_422(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/users", params={"role": "superadmin"}, headers=auth(token))
        assert r.status_code == 422


class TestUsersStatistik:
    def test_admin_dapat_statistik_per_role(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        make_user(db_session, role="warga_umum")
        token = login(test_client, admin.email)

        r = test_client.get("/users/statistik", headers=auth(token))
        assert r.status_code == 200, r.text
        data = r.json()["data"]
        assert data["total"] >= 2
        assert data["per_role"]["admin"] >= 1
        assert data["per_role"]["warga_umum"] >= 1
        assert "menunggu_verifikasi" in data

    def test_verifikator_403(self, test_client, db_session):
        verif = make_user(db_session, role="verifikator_dinas")
        token = login(test_client, verif.email)
        assert test_client.get("/users/statistik", headers=auth(token)).status_code == 403
