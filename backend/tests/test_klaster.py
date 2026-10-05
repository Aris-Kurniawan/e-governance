"""Tests for F3.6-F3.10: Klaster router & AI pipeline endpoints."""

import pytest

from app.core.deps import hash_password
from app.models.user import User
from app.models.klaster import Klaster, StatusLog
from app.models.laporan import Laporan
from app.models.sekolah import Sekolah


def create_test_user(db_session, role="warga_terverifikasi"):
    import uuid
    user = User(
        email=f"test_{role}_{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password"),
        role=role,
        nama="Test User",
        status_verifikasi="terverifikasi",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def login(test_client, email):
    resp = test_client.post("/auth/login", json={"email": email, "password": "password"})
    return resp.json()["data"]["access_token"]


class TestKlasterRouter:
    """Test F3.8-F3.10 klaster endpoints."""
    
    def test_get_status_unauthorized(self, test_client):
        response = test_client.get("/ai/status")
        assert response.status_code == 401
    
    def test_trigger_cluster_unauthorized(self, test_client):
        response = test_client.post("/ai/cluster")
        assert response.status_code == 401
    
    def test_verify_klaster_unauthorized(self, test_client):
        response = test_client.put("/klaster/some-id/verifikasi", json={"status": "terverifikasi"})
        assert response.status_code == 401
    
    def test_trigger_cluster_admin(self, test_client, db_session):
        user = create_test_user(db_session, role="admin")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.post("/ai/cluster")
        assert response.status_code == 200
        data = response.json()
        assert "klaster_created" in data["data"]
    
    def test_trigger_cluster_verifikator(self, test_client, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.post("/ai/cluster")
        assert response.status_code == 200
    
    def test_trigger_cluster_warga_forbidden(self, test_client, db_session):
        user = create_test_user(db_session, role="warga_terverifikasi")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.post("/ai/cluster")
        assert response.status_code == 403
    
    def test_get_status_admin(self, test_client, db_session):
        user = create_test_user(db_session, role="admin")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.get("/ai/status")
        assert response.status_code == 200
        data = response.json()
        assert "unclustered_laporan" in data["data"]
        assert "total_klaster" in data["data"]
    
    def test_verify_klaster_not_found(self, test_client, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.put("/klaster/klaster-id-xyz/verifikasi?status=terverifikasi")
        assert response.status_code == 404
    
    def test_verify_klaster_missing_alasan(self, test_client, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.put("/klaster/klaster-id-xyz/verifikasi?status=tidak_terverifikasi")
        assert response.status_code == 400
        assert "alasan wajib" in response.json()["error"]["message"]
    
    def test_verify_klaster_invalid_status(self, test_client, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(test_client, user.email)
        test_client.headers["Authorization"] = f"Bearer {token}"
        
        response = test_client.put("/klaster/klaster-id-xyz/verifikasi?status=invalid_status&alasan=test")
        assert response.status_code == 400