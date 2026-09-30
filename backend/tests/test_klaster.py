"""Tests for F3.6-F3.10: Klaster router & AI pipeline endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, engine
from app.core.deps import hash_password
from app.models.base import Base
from app.models.user import User
from app.models.klaster import Klaster, StatusLog
from app.models.laporan import Laporan
from app.models.sekolah import Sekolah


client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_test_user(db, role="warga_terverifikasi"):
    import uuid
    user = User(
        email=f"test_{role}_{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password"),
        role=role,
        nama="Test User",
        status_verifikasi="terverifikasi",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client, email):
    resp = client.post("/auth/login", json={"email": email, "password": "password"})
    return resp.json()["data"]["access_token"]


class TestKlasterRouter:
    """Test F3.8-F3.10 klaster endpoints."""
    
    def test_get_status_unauthorized(self):
        response = client.get("/ai/status")
        assert response.status_code == 401
    
    def test_trigger_cluster_unauthorized(self):
        response = client.post("/ai/cluster")
        assert response.status_code == 401
    
    def test_verify_klaster_unauthorized(self):
        response = client.put("/klaster/some-id/verifikasi", json={"status": "terverifikasi"})
        assert response.status_code == 401
    
    def test_trigger_cluster_admin(self, db_session):
        user = create_test_user(db_session, role="admin")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.post("/ai/cluster")
        assert response.status_code == 200
        data = response.json()
        assert "klaster_created" in data["data"]
    
    def test_trigger_cluster_verifikator(self, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.post("/ai/cluster")
        assert response.status_code == 200
    
    def test_trigger_cluster_warga_forbidden(self, db_session):
        user = create_test_user(db_session, role="warga_terverifikasi")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.post("/ai/cluster")
        assert response.status_code == 403
    
    def test_get_status_admin(self, db_session):
        user = create_test_user(db_session, role="admin")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.get("/ai/status")
        assert response.status_code == 200
        data = response.json()
        assert "unclustered_laporan" in data["data"]
        assert "total_klaster" in data["data"]
    
    def test_verify_klaster_not_found(self, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.put("/klaster/klaster-id-xyz/verifikasi?status=terverifikasi")
        assert response.status_code == 404
    
    def test_verify_klaster_missing_alasan(self, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.put("/klaster/klaster-id-xyz/verifikasi?status=tidak_terverifikasi")
        assert response.status_code == 400
        assert "alasan wajib" in response.json()["error"]["message"]
    
    def test_verify_klaster_invalid_status(self, db_session):
        user = create_test_user(db_session, role="verifikator_dinas")
        token = login(client, user.email)
        client.headers["Authorization"] = f"Bearer {token}"
        
        response = client.put("/klaster/klaster-id-xyz/verifikasi?status=invalid_status&alasan=test")
        assert response.status_code == 400
