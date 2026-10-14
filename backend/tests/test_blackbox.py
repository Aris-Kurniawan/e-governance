"""F4.2 — Black-box Testing (backend-side).

Uji fungsi TANPA melihat internal kode: happy path, error handling, edge cases.
Memakai fixture conftest (DB terpisah simakis_test) — produksi tidak disentuh.

Jalankan: cd backend && ./venv/bin/python -m pytest tests/test_blackbox.py -q
"""

import uuid

import pytest

from app.core.deps import hash_password
from app.models.user import User
from app.models.sekolah import Sekolah, KondisiSarana
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


# ─────────────────────────────────────────────────────────────────────────────
# 11. F4.7 (D-21) — Klaster tanpa "Belum Terklasifikasi" + endpoint fallback
# ─────────────────────────────────────────────────────────────────────────────

class TestFallbackReviewF47:
    def test_list_klaster_default_sembunyikan_belum_terklasifikasi(
        self, test_client, db_session
    ):
        sekolah = make_sekolah(db_session)
        valid = make_klaster(db_session, sekolah, kategori="ruang_belajar")
        fallback = make_klaster(db_session, sekolah, kategori="belum_terklasifikasi")

        # Default: klaster label-fallback tidak tampil
        r = test_client.get(
            "/klaster",
            params={"sekolah_npsn": sekolah.npsn, "page_size": 100},
        )
        assert r.status_code == 200
        ids = {k["klaster_id"] for k in r.json()["data"]}
        assert valid.id in ids
        assert fallback.id not in ids
        assert "belum_terklasifikasi" not in {
            k["kategori"] for k in r.json()["data"]
        }

        # Eksplisit ?kategori=belum_terklasifikasi tetap dilayani (debug/admin)
        r2 = test_client.get(
            "/klaster",
            params={
                "sekolah_npsn": sekolah.npsn,
                "kategori": "belum_terklasifikasi",
                "page_size": 100,
            },
        )
        assert r2.status_code == 200
        assert {k["klaster_id"] for k in r2.json()["data"]} == {fallback.id}

    def test_detail_klaster_tetap_bisa_diakses(self, test_client, db_session):
        sekolah = make_sekolah(db_session)
        fallback = make_klaster(db_session, sekolah, kategori="belum_terklasifikasi")
        r = test_client.get(f"/klaster/{fallback.id}")
        assert r.status_code == 200
        assert r.json()["data"]["kategori"] == "belum_terklasifikasi"

    def test_perlu_review_rbac(self, test_client, db_session):
        # Anonim → 401
        assert test_client.get("/laporan/perlu-review").status_code == 401

        warga = make_user(db_session, role="warga_terverifikasi")
        token = login(test_client, warga.email)
        assert (
            test_client.get("/laporan/perlu-review", headers=auth(token)).status_code
            == 403
        )

        veri = make_user(db_session, role="verifikator_dinas")
        token = login(test_client, veri.email)
        assert (
            test_client.get("/laporan/perlu-review", headers=auth(token)).status_code
            == 403
        )

        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/laporan/perlu-review", headers=auth(token))
        assert r.status_code == 200

    def test_perlu_review_isi_dan_envelope(self, test_client, db_session):
        user = make_user(db_session)
        sekolah = make_sekolah(db_session)

        # (1) laporan noise: tanpa klaster → ikut
        lap_noise = make_laporan(db_session, user, sekolah)
        # (2) laporan di klaster label-fallback → ikut
        klaster_fb = make_klaster(db_session, sekolah, kategori="belum_terklasifikasi")
        lap_fb = make_laporan(db_session, user, sekolah)
        lap_fb.klaster_id = klaster_fb.id
        db_session.commit()
        # (3) laporan di klaster valid → TIDAK ikut
        klaster_valid = make_klaster(db_session, sekolah, kategori="ruang_belajar")
        lap_valid = make_laporan(db_session, user, sekolah)
        lap_valid.klaster_id = klaster_valid.id
        db_session.commit()

        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get(
            "/laporan/perlu-review",
            params={"page_size": 100},
            headers=auth(token),
        )
        assert r.status_code == 200
        body = r.json()
        assert set(body.keys()) >= {"data", "meta"}
        assert set(body["meta"]) >= {
            "page",
            "page_size",
            "total_items",
            "total_pages",
        }

        ids = {item["id"] for item in body["data"]}
        assert lap_noise.id in ids
        assert lap_fb.id in ids
        assert lap_valid.id not in ids

        item_fb = next(i for i in body["data"] if i["id"] == lap_fb.id)
        assert item_fb["klaster"] == {
            "id": klaster_fb.id,
            "label": "Kerusakan Atap Kelas",
            "kategori": "belum_terklasifikasi",
        }
        assert item_fb["sekolah_nama"] == sekolah.nama
        assert item_fb["status_sanggahan"] == "menunggu"

        item_noise = next(i for i in body["data"] if i["id"] == lap_noise.id)
        assert item_noise["klaster"] is None
        assert body["meta"]["total_items"] >= 2

    def test_put_status_rbac_dan_update(self, test_client, db_session):
        owner = make_user(db_session)
        sekolah = make_sekolah(db_session)
        lap = make_laporan(db_session, owner, sekolah)

        # Anonim → 401
        r = test_client.put(
            f"/laporan/{lap.id}/status", json={"status": "divalidasi"}
        )
        assert r.status_code == 401

        # Warga (bukan admin/kepala) → 403
        token = login(test_client, owner.email)
        r = test_client.put(
            f"/laporan/{lap.id}/status",
            json={"status": "divalidasi"},
            headers=auth(token),
        )
        assert r.status_code == 403

        # Admin → 200 & nilai berubah
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.put(
            f"/laporan/{lap.id}/status",
            json={"status": "divalidasi"},
            headers=auth(token),
        )
        assert r.status_code == 200
        body = r.json()
        assert body["data"]["id"] == lap.id
        assert body["data"]["status_sanggahan"] == "divalidasi"
        assert lap.status_sanggahan == "divalidasi"

        # Kepala dinas juga berhak → 200
        kepala = make_user(db_session, role="kepala_dinas")
        token = login(test_client, kepala.email)
        r = test_client.put(
            f"/laporan/{lap.id}/status",
            json={"status": "ditolak"},
            headers=auth(token),
        )
        assert r.status_code == 200
        assert r.json()["data"]["status_sanggahan"] == "ditolak"

    def test_put_status_invalid_422(self, test_client, db_session):
        owner = make_user(db_session)
        sekolah = make_sekolah(db_session)
        lap = make_laporan(db_session, owner, sekolah)
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)

        r = test_client.put(
            f"/laporan/{lap.id}/status",
            json={"status": "bukan_status_valid"},
            headers=auth(token),
        )
        assert r.status_code == 422

    def test_put_status_404(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.put(
            f"/laporan/{uuid.uuid4()}/status",
            json={"status": "divalidasi"},
            headers=auth(token),
        )
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"


# ─────────────────────────────────────────────────────────────────────────────
# 12. F4.8 (D-22) — GET /laporan/skor-kbm
# ─────────────────────────────────────────────────────────────────────────────

class TestSkorKbmF48:
    def test_skor_kbm_rbac(self, test_client, db_session):
        # Anonim → 401
        assert test_client.get("/laporan/skor-kbm").status_code == 401

        warga = make_user(db_session, role="warga_terverifikasi")
        token = login(test_client, warga.email)
        assert test_client.get("/laporan/skor-kbm", headers=auth(token)).status_code == 403

        # verifikator_dinas & admin berhak (asumsi RBAC F4.8)
        veri = make_user(db_session, role="verifikator_dinas")
        token = login(test_client, veri.email)
        assert test_client.get("/laporan/skor-kbm", headers=auth(token)).status_code == 200

        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        assert test_client.get("/laporan/skor-kbm", headers=auth(token)).status_code == 200

    def test_skor_kbm_shape_dan_bound(self, test_client, db_session):
        make_sekolah(db_session)  # jamin minimal 1 sekolah (test ini harus mandiri)
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/laporan/skor-kbm", headers=auth(token))
        assert r.status_code == 200

        body = r.json()["data"]
        ringkasan = body["ringkasan"]
        assert set(ringkasan) == {
            "rata_rata_skor",
            "sekolah_kritis",
            "total_laporan",
            "ruang_rusak_berat",
            "distribusi_kondisi",
            "dampak_per_jenis_ruang",
        }
        assert set(ringkasan["distribusi_kondisi"]) == {
            "baik",
            "rusak_ringan",
            "rusak_sedang",
            "rusak_berat",
        }
        # total_laporan = semua baris; distribusi hanya 4 nilai enum
        # (kondisi NULL tidak dihitung di mana pun)
        assert sum(ringkasan["distribusi_kondisi"].values()) <= ringkasan[
            "total_laporan"
        ]
        # tiap jenis ruang punya angka, urut rusak_berat descending
        berat_list = [j["rusak_berat"] for j in ringkasan["dampak_per_jenis_ruang"]]
        assert berat_list == sorted(berat_list, reverse=True)
        for jenis in ringkasan["dampak_per_jenis_ruang"]:
            assert set(jenis) == {"nama_ruang", "rusak_berat", "jumlah"}

        sekolah_rows = body["sekolah"]
        assert len(sekolah_rows) > 0
        skor_list = [s["skor_kbm"] for s in sekolah_rows]
        assert skor_list == sorted(skor_list, reverse=True)
        for s in sekolah_rows:
            assert 0 <= s["skor_kbm"] <= 100
            assert s["level"] in ("kritis", "tinggi", "sedang", "rendah")
            assert set(s) == {
                "npsn",
                "nama",
                "skor_kbm",
                "level",
                "skor_laporan",
                "skor_dapodik",
                "jumlah_laporan",
                "laporan_rusak_berat",
            }

    def test_skor_kbm_formula_deterministik(self, test_client, db_session):
        """0.7×AVG(severity) + 0.3×dapodik, skala 0–100, level per D-22."""
        user = make_user(db_session)

        # Sekolah A: 1 laporan rusak_berat (100), tanpa data Dapodik
        # → 0.7×100 + 0.3×0 = 70.0 → kritis (batas bawah)
        sek_a = make_sekolah(db_session)
        lap_a = make_laporan(db_session, user, sek_a)
        lap_a.kondisi_dilaporkan = "rusak_berat"

        # Sekolah B: 1 laporan rusak_sedang (66), Dapodik 10/10 rusak berat (100)
        # → 0.7×66 + 0.3×100 = 46.2 + 30 = 76.2
        sek_b = make_sekolah(db_session)
        lap_b = make_laporan(db_session, user, sek_b)
        lap_b.kondisi_dilaporkan = "rusak_sedang"
        db_session.add(
            KondisiSarana(
                sekolah_npsn=sek_b.npsn,
                nama_ruang="ruang_kelas",
                jumlah=10,
                kondisi_baik=0,
                kondisi_rusak_ringan=0,
                kondisi_rusak_sedang=0,
                kondisi_rusak_berat=10,
            )
        )
        db_session.commit()

        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        r = test_client.get("/laporan/skor-kbm", headers=auth(token))
        assert r.status_code == 200
        rows = {s["npsn"]: s for s in r.json()["data"]["sekolah"]}

        a = rows[sek_a.npsn]
        assert a["skor_kbm"] == 70.0
        assert a["level"] == "kritis"
        assert a["jumlah_laporan"] == 1
        assert a["laporan_rusak_berat"] == 1

        b = rows[sek_b.npsn]
        assert b["skor_kbm"] == 76.2
        assert b["skor_laporan"] == 66.0
        assert b["skor_dapodik"] == 100.0
        assert b["level"] == "kritis"


# ─────────────────────────────────────────────────────────────────────────────
# 10. F4.10 — Audit aktif (DBG-005) & status pipeline (DBG-004)
# ─────────────────────────────────────────────────────────────────────────────

def _audit_rows(client, token) -> list[dict]:
    """Ambil baris audit (admin/kepala_dinas) — helper asersi F4.10."""
    r = client.get("/audit/log", params={"page_size": 100}, headers=auth(token))
    assert r.status_code == 200, r.text
    return r.json()["data"]


class TestAuditAktifF410:
    """DBG-005: log_audit() harus benar-benar terpanggil di aksi sensitif."""

    def test_login_meninggalkan_audit(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        rows = _audit_rows(test_client, token)
        assert any(
            r["aksi"] == "login"
            and r["actor_user_id"] == admin.id
            and r["target"] == admin.email
            for r in rows
        )

    def test_register_vault_meninggalkan_audit(self, test_client, db_session):
        email = f"bb_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = test_client.post(
            "/auth/register",
            json={
                "nama": "Blackbox Register",
                "nik": "3524010101990001",
                "email": email,
                "password": "password123",
            },
        )
        assert r.status_code == 201, r.text
        user_id = r.json()["data"]["user_id"]

        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)
        rows = _audit_rows(test_client, token)
        assert any(
            x["aksi"] == "akses_pdp_vault"
            and x["actor_user_id"] == user_id
            and x["target"] == "encrypt_nik"
            for x in rows
        )

    def test_verifikasi_status_sanggahan_teraudit(self, test_client, db_session):
        admin = make_user(db_session, role="admin")
        warga = make_user(db_session)
        sek = make_sekolah(db_session)
        lap = make_laporan(db_session, warga, sek)

        token = login(test_client, admin.email)
        r = test_client.put(
            f"/laporan/{lap.id}/status",
            json={"status": "divalidasi"},
            headers=auth(token),
        )
        assert r.status_code == 200, r.text
        rows = _audit_rows(test_client, token)
        assert any(
            x["aksi"] == "verifikasi_status_sanggahan" and x["target"] == lap.id
            for x in rows
        )

    def test_verifikasi_klaster_teraudit(self, test_client, db_session):
        veri = make_user(db_session, role="verifikator_dinas")
        admin = make_user(db_session, role="admin")
        sek = make_sekolah(db_session)
        kl = make_klaster(db_session, sek)

        token_v = login(test_client, veri.email)
        r = test_client.put(
            f"/klaster/{kl.id}/verifikasi",
            params={"status": "terverifikasi"},
            headers=auth(token_v),
        )
        assert r.status_code == 200, r.text

        token_a = login(test_client, admin.email)
        rows = _audit_rows(test_client, token_a)
        assert any(
            x["aksi"] == "verifikasi_klaster" and x["target"] == kl.id
            for x in rows
        )

    def test_override_prioritas_teraudit(self, test_client, db_session):
        kepala = make_user(db_session, role="kepala_dinas")
        sek = make_sekolah(db_session)
        kl = make_klaster(db_session, sek)

        token = login(test_client, kepala.email)
        r = test_client.put(
            f"/vote/klaster/{kl.id}/override",
            params={"urutan_prioritas": 5, "alasan": "darurat banjir"},
            headers=auth(token),
        )
        assert r.status_code == 200, r.text
        rows = _audit_rows(test_client, token)
        assert any(
            x["aksi"] == "override_prioritas" and x["target"] == kl.id
            for x in rows
        )


class TestStatusPipelineF410:
    """DBG-004: /ai/status hitung belum_diproses + last_run dari state file."""

    def test_unclustered_hitung_belum_diproses_bukan_null(
        self, test_client, db_session
    ):
        from sqlalchemy import func, select

        from app.models.laporan import Laporan as Lap

        admin = make_user(db_session, role="admin")
        warga = make_user(db_session)
        sek = make_sekolah(db_session)

        # Regresi bug lama: noise dengan klaster_id NULL ikut terhitung.
        lap_noise = make_laporan(db_session, warga, sek)
        lap_noise.hasil_klasterisasi = "noise"
        db_session.commit()
        make_laporan(db_session, warga, sek)  # belum_diproses

        expected = db_session.scalar(
            select(func.count())
            .select_from(Lap)
            .where(Lap.hasil_klasterisasi == "belum_diproses")
        )
        total_lap = db_session.scalar(select(func.count()).select_from(Lap))

        token = login(test_client, admin.email)
        r = test_client.get("/ai/status", headers=auth(token))
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["unclustered_laporan"] == expected
        # Bukti noise (klaster_id NULL) tidak lagi dihitung:
        assert data["unclustered_laporan"] <= total_lap - 1

    def test_last_run_dari_state_file(self, test_client, db_session):
        from app.core.pipeline_state import (
            STATE_FILE,
            read_pipeline_run,
            record_pipeline_run,
        )

        admin = make_user(db_session, role="admin")
        token = login(test_client, admin.email)

        # State hilang → fallback string (kontrak FE: last_run selalu string).
        if STATE_FILE.exists():
            STATE_FILE.unlink()
        r = test_client.get("/ai/status", headers=auth(token))
        assert r.json()["data"]["last_run"] == "N/A (belum pernah tercatat)"

        # State ada → last_run = timestamp nyata + status run.
        record_pipeline_run("test", "ok", 3, "fixture run")
        r = test_client.get("/ai/status", headers=auth(token))
        data = r.json()["data"]
        assert data["last_run"] == read_pipeline_run()["last_run"]
        assert data["last_run_status"] == "ok"
