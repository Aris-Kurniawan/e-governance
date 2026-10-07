"""F4.2 — Black-box Testing (backend-side).

Uji fungsi TANPA melihat internal kode: happy path, error handling, edge cases.
Memakai fixture conftest (DB terpisah simakis_test) — produksi tidak disentuh.

Jalankan: cd backend && ./venv/bin/python -m pytest tests/test_blackbox.py -q
"""

import uuid

import pytest

from app.core.deps import hash_password
from app.models.user import User
from app.models.sekolah import Sekolah
from app.models.laporan import Laporan
from app.models.klaster import Klaster


# ─────────────────────────────────────────────────────────────────────────────
# Helpers (seed data via db_session)
# ─────────────────────────────────────────────────────────────────────────────

def make_user(db, role="warga_terverifikasi") -> User:
    user = User(
        email=f"bb_{role}_{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password"),
        role=role,
        nama=f"Blackbox {role}",
        status_verifikasi="terverifikasi",
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


def make_sekolah(db, npsn: str | None = None) -> Sekolah:
    sekolah = Sekolah(
        npsn=npsn or str(99000000 + (uuid.uuid4().int % 999999)),
        nama="SMP Negeri Blackbox",
        jenjang="SMP",
    )
    db.add(sekolah)
    db.commit()
    db.refresh(sekolah)
    return sekolah


def make_laporan(db, user: User, sekolah: Sekolah) -> Laporan:
    laporan = Laporan(
        tracking_id=f"LAP-BB-{uuid.uuid4().hex[:8].upper()}",
        user_id=user.id,
        sekolah_npsn=sekolah.npsn,
        deskripsi="Atap kelas bocor parah saat hujan besar minggu lalu",
    )
    db.add(laporan)
    db.commit()
    db.refresh(laporan)
    return laporan


def make_klaster(db, sekolah: Sekolah, kategori="ruang_belajar") -> Klaster:
    klaster = Klaster(
        label="Kerusakan Atap Kelas",
        kategori=kategori,
        sekolah_npsn=sekolah.npsn,
        skor_prioritas=12.5,
    )
    db.add(klaster)
    db.commit()
    db.refresh(klaster)
    return klaster


# ─────────────────────────────────────────────────────────────────────────────
# 1. Health & amplop respons gagal (error handling)
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthAndErrorEnvelope:
    def test_health_ok(self, test_client):
        assert test_client.get("/health").status_code == 200

    def test_api_health_ok(self, test_client):
        resp = test_client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_401_envelope(self, test_client):
        resp = test_client.get("/laporan/riwayat")
        assert resp.status_code == 401
        err = resp.json()["error"]
        assert err["code"] == "UNAUTHORIZED"
        assert "message" in err

    def test_404_envelope(self, test_client):
        resp = test_client.get(f"/klaster/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"

    def test_validation_error_envelope(self, test_client):
        resp = test_client.post("/auth/register", json={"nama": "X", "nik": "123"})
        assert resp.status_code == 400
        err = resp.json()["error"]
        assert err["code"] == "VALIDATION_ERROR"
        assert "details" in err


# ─────────────────────────────────────────────────────────────────────────────
# 2. Auth — happy path & gagal (jalur normal + jalur gagal)
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthFlow:
    def test_register_login_me_refresh(self, test_client):
        email = f"flow_{uuid.uuid4().hex[:8]}@example.com"
        r = test_client.post("/auth/register", json={
            "nama": "Warga Flow", "nik": "3513010101900001",
            "email": email, "password": "rahasia123",
        })
        assert r.status_code == 201, r.text

        r = test_client.post("/auth/login", json={"email": email, "password": "rahasia123"})
        assert r.status_code == 200
        tokens = r.json()["data"]
        assert tokens["access_token"] and tokens["refresh_token"]

        r = test_client.get("/auth/me", headers=auth(tokens["access_token"]))
        assert r.status_code == 200
        assert r.json()["data"]["email"] == email

        r = test_client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        assert r.status_code == 200
        assert r.json()["data"]["access_token"]

    def test_login_wrong_password(self, test_client):
        r = test_client.post("/auth/login", json={"email": "tidak@ada.com", "password": "salah"})
        assert r.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# 3. Direktori sekolah (publik)
# ─────────────────────────────────────────────────────────────────────────────

class TestSekolahPublic:
    def test_list_sekolah_envelope_meta(self, test_client, db_session):
        make_sekolah(db_session)
        r = test_client.get("/sekolah")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert set(body["meta"]) >= {"page", "page_size", "total_items", "total_pages"}

    def test_sekolah_page_size_100_diterima(self, test_client):
        """INTERFACES.md §0.2 — page_size maks 100 (regresi: pernah le=50)."""
        r = test_client.get("/sekolah", params={"page_size": 100})
        assert r.status_code == 200, r.text
        assert r.json()["meta"]["page_size"] == 100

    def test_search_sekolah(self, test_client, db_session):
        make_sekolah(db_session)
        r = test_client.get("/sekolah", params={"search": "Blackbox"})
        assert r.status_code == 200
        assert any("Blackbox" in s["nama"] for s in r.json()["data"])

    def test_detail_sekolah_found(self, test_client, db_session):
        sekolah = make_sekolah(db_session)
        r = test_client.get(f"/sekolah/{sekolah.npsn}")
        assert r.status_code == 200
        assert r.json()["data"]["npsn"] == sekolah.npsn

    def test_detail_sekolah_not_found(self, test_client):
        r = test_client.get("/sekolah/00000000")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"

    def test_pagination_edge_page_zero(self, test_client):
        r = test_client.get("/sekolah", params={"page": 0})
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_sanggahan_sekolah_empty_list(self, test_client, db_session):
        sekolah = make_sekolah(db_session)
        r = test_client.get(f"/sekolah/{sekolah.npsn}/sanggahan")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Pelaporan — jalur normal, gagal, edge case
# ─────────────────────────────────────────────────────────────────────────────

class TestLaporanFlow:
    def test_create_unauthorized(self, test_client):
        r = test_client.post("/laporan", json={"sekolah_npsn": "12345678", "deskripsi": "x"})
        assert r.status_code == 401

    def test_create_happy_path(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        token = login(test_client, user.email)
        r = test_client.post("/laporan", headers=auth(token), json={
            "sekolah_npsn": sekolah.npsn,
            "kondisi_dilaporkan": "rusak_berat",
            "deskripsi": "Plafon runtuh di ruang kelas 4B",
        })
        assert r.status_code == 201, r.text
        assert r.json()["data"]["tracking_id"].startswith("LAP-")

    def test_create_sekolah_tidak_ada_404(self, test_client, db_session):
        user = make_user(db_session)
        token = login(test_client, user.email)
        r = test_client.post("/laporan", headers=auth(token), json={
            "sekolah_npsn": "00000000", "deskripsi": "tes",
        })
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"

    def test_riwayat_hanya_laporan_sendiri(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        make_laporan(db_session, user, sekolah)
        token = login(test_client, user.email)
        r = test_client.get("/laporan/riwayat", headers=auth(token))
        assert r.status_code == 200
        assert r.json()["meta"]["total_items"] == 1

    def test_detail_owner_ok(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        lap = make_laporan(db_session, user, sekolah)
        token = login(test_client, user.email)
        r = test_client.get(f"/laporan/{lap.id}", headers=auth(token))
        assert r.status_code == 200
        assert r.json()["data"]["tracking_id"] == lap.tracking_id

    def test_detail_bukan_pemilik_403(self, test_client, db_session):
        owner = make_user(db_session)
        other = make_user(db_session)
        sekolah = make_sekolah(db_session)
        lap = make_laporan(db_session, owner, sekolah)
        token = login(test_client, other.email)
        r = test_client.get(f"/laporan/{lap.id}", headers=auth(token))
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "FORBIDDEN"

    def test_detail_tidak_ada_404(self, test_client, db_session):
        user = make_user(db_session)
        token = login(test_client, user.email)
        r = test_client.get(f"/laporan/{uuid.uuid4()}", headers=auth(token))
        assert r.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# 5. Klaster — endpoint publik baru (F4.5)
# ─────────────────────────────────────────────────────────────────────────────

class TestKlasterPublic:
    def test_list_klaster_envelope(self, test_client, db_session):
        sekolah = make_sekolah(db_session)
        make_klaster(db_session, sekolah)
        r = test_client.get("/klaster")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert set(body["meta"]) >= {"page", "page_size", "total_items", "total_pages"}

    def test_list_klaster_filter_kategori(self, test_client, db_session):
        sekolah = make_sekolah(db_session)
        make_klaster(db_session, sekolah, kategori="sanitasi_air")
        r = test_client.get("/klaster", params={"kategori": "sanitasi_air"})
        assert r.status_code == 200
        assert all(k["kategori"] == "sanitasi_air" for k in r.json()["data"])

    def test_detail_klaster_dengan_laporan(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        lap = make_laporan(db_session, user, sekolah)
        klaster = make_klaster(db_session, sekolah)
        lap.klaster_id = klaster.id
        db_session.commit()

        r = test_client.get(f"/klaster/{klaster.id}")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["klaster_id"] == klaster.id
        assert data["sekolah_nama"] == sekolah.nama
        assert len(data["laporan"]) == 1

    def test_detail_klaster_404(self, test_client):
        r = test_client.get(f"/klaster/{uuid.uuid4()}")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Voting — happy path, duplikat, RBAC, edge
# ─────────────────────────────────────────────────────────────────────────────

class TestVoteFlow:
    def test_vote_unauthorized(self, test_client):
        r = test_client.post("/vote", params={"klaster_id": "x"})
        assert r.status_code == 401

    def test_vote_klaster_tidak_ada_404(self, test_client, db_session):
        user = make_user(db_session)
        token = login(test_client, user.email)
        r = test_client.post("/vote", params={"klaster_id": str(uuid.uuid4())}, headers=auth(token))
        assert r.status_code == 404

    def test_vote_happy_dan_duplikat_409(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, user.email)

        r = test_client.post("/vote", params={"klaster_id": klaster.id}, headers=auth(token))
        assert r.status_code == 200, r.text
        assert r.json()["data"]["vote_id"]

        r = test_client.post("/vote", params={"klaster_id": klaster.id}, headers=auth(token))
        assert r.status_code == 409
        assert r.json()["error"]["code"] == "ALREADY_VOTED"

    def test_vote_status(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, user.email)

        r = test_client.get(f"/vote/status/{klaster.id}", headers=auth(token))
        assert r.json()["data"]["has_voted"] is False

        test_client.post("/vote", params={"klaster_id": klaster.id}, headers=auth(token))
        r = test_client.get(f"/vote/status/{klaster.id}", headers=auth(token))
        assert r.json()["data"]["has_voted"] is True

    def test_override_warga_forbidden_403(self, test_client, db_session):
        user = make_user(db_session)  # warga_terverifikasi
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, user.email)
        r = test_client.put(
            f"/vote/klaster/{klaster.id}/override",
            params={"urutan_prioritas": 1, "alasan": "penting"},
            headers=auth(token),
        )
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "FORBIDDEN"

    def test_override_kepala_tanpa_alasan_422(self, test_client, db_session):
        kepala = make_user(db_session, role="kepala_dinas")
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, kepala.email)
        r = test_client.put(
            f"/vote/klaster/{klaster.id}/override",
            params={"urutan_prioritas": 1, "alasan": ""},
            headers=auth(token),
        )
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "REASON_REQUIRED"

    def test_skor_recalc_admin(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, admin.email)
        r = test_client.put(f"/vote/klaster/{klaster.id}/skor", headers=auth(token))
        assert r.status_code == 200
        assert r.json()["data"]["skor_prioritas"] is not None


# ─────────────────────────────────────────────────────────────────────────────
# 7. Verifikasi & status klaster (RBAC + validasi)
# ─────────────────────────────────────────────────────────────────────────────

class TestVerifikasiStatus:
    def test_verifikasi_warga_forbidden_403(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, user.email)
        r = test_client.put(
            f"/klaster/{klaster.id}/verifikasi",
            params={"status": "terverifikasi"},
            headers=auth(token),
        )
        assert r.status_code == 403

    def test_verifikasi_invalid_status_400(self, test_client, db_session):
        verifikator = make_user(db_session, role="verifikator_dinas")
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, verifikator.email)
        r = test_client.put(
            f"/klaster/{klaster.id}/verifikasi",
            params={"status": "ngasal"},
            headers=auth(token),
        )
        assert r.status_code == 400

    def test_verifikasi_tanpa_alasan_400(self, test_client, db_session):
        verifikator = make_user(db_session, role="verifikator_dinas")
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, verifikator.email)
        r = test_client.put(
            f"/klaster/{klaster.id}/verifikasi",
            params={"status": "tidak_terverifikasi"},
            headers=auth(token),
        )
        assert r.status_code == 400

    def test_verifikasi_happy_path(self, test_client, db_session):
        verifikator = make_user(db_session, role="verifikator_dinas")
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, verifikator.email)
        r = test_client.put(
            f"/klaster/{klaster.id}/verifikasi",
            params={"status": "terverifikasi"},
            headers=auth(token),
        )
        assert r.status_code == 200
        assert r.json()["data"]["status"] == "terverifikasi"

    def test_status_update_alasan_wajib_422(self, test_client, db_session):
        verifikator = make_user(db_session, role="verifikator_dinas")
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        token = login(test_client, verifikator.email)
        r = test_client.post(
            f"/klaster/{klaster.id}/status",
            params={"status": "tidak_dapat_ditindaklanjuti"},
            headers=auth(token),
        )
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "REASON_REQUIRED"

    def test_riwayat_status_publik(self, test_client, db_session):
        sekolah = make_sekolah(db_session)
        klaster = make_klaster(db_session, sekolah)
        r = test_client.get(f"/klaster/{klaster.id}/riwayat")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)


# ─────────────────────────────────────────────────────────────────────────────
# 8. Dashboard (publik) & audit (RBAC)
# ─────────────────────────────────────────────────────────────────────────────

class TestDashboardAudit:
    def test_dashboard_prioritas_publik(self, test_client):
        r = test_client.get("/dashboard/prioritas")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_dashboard_wilayah_tanpa_token_401(self, test_client):
        # Spec F3.22 / PRD FEAT-002: akses dinas saja
        r = test_client.get("/dashboard/wilayah")
        assert r.status_code == 401

    def test_dashboard_wilayah_dinas_ok(self, test_client, db_session):
        user = make_user(db_session, role="verifikator_dinas")
        token = login(test_client, user.email)
        r = test_client.get("/dashboard/wilayah", headers=auth(token))
        assert r.status_code == 200

    def test_audit_warga_forbidden_403(self, test_client, db_session):
        user = make_user(db_session)
        token = login(test_client, user.email)
        r = test_client.get("/audit/log", headers=auth(token))
        assert r.status_code == 403

    def test_audit_admin_ok(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/audit/log", headers=auth(token))
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_audit_pagination_edge_101(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/audit/log", params={"page_size": 101}, headers=auth(token))
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 9. AI pipeline & upload (RBAC + edge, tanpa dependensi infra luar)
# ─────────────────────────────────────────────────────────────────────────────

class TestAIUpload:
    def test_ai_status_warga_forbidden_403(self, test_client, db_session):
        user = make_user(db_session)
        token = login(test_client, user.email)
        r = test_client.get("/ai/status", headers=auth(token))
        assert r.status_code == 403

    def test_ai_status_admin_ok(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/ai/status", headers=auth(token))
        assert r.status_code == 200
        body = r.json()["data"]
        assert "unclustered_laporan" in body and "total_klaster" in body

    def test_upload_unauthorized(self, test_client):
        r = test_client.post(
            "/upload/laporan", params={"laporan_id": "x"},
            files={"file": ("a.png", b"\x89PNG", "image/png")},
        )
        assert r.status_code == 401

    def test_upload_laporan_tidak_ada_404(self, test_client, db_session):
        user = make_user(db_session)
        token = login(test_client, user.email)
        r = test_client.post(
            "/upload/laporan",
            params={"laporan_id": str(uuid.uuid4())},
            headers=auth(token),
            files={"file": ("a.png", b"\x89PNG", "image/png")},
        )
        assert r.status_code == 404

    def test_upload_bukan_pemilik_403(self, test_client, db_session):
        owner = make_user(db_session)
        other = make_user(db_session)
        sekolah = make_sekolah(db_session)
        lap = make_laporan(db_session, owner, sekolah)
        token = login(test_client, other.email)
        r = test_client.post(
            "/upload/laporan",
            params={"laporan_id": lap.id},
            headers=auth(token),
            files={"file": ("a.png", b"\x89PNG", "image/png")},
        )
        assert r.status_code == 403
