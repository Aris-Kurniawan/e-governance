"""Unit test untuk auth endpoints (/auth/register, /auth/login, /auth/refresh, /auth/me)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base
from app.core import pdp

@pytest.fixture
def client():
    # SQLite in-memory + StaticPool: satu koneksi dipakai semua thread TestClient
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


def test_register_success(client):
    response = client.post(
        "/auth/register",
        json={
            "nama": "Warga Test",
            "nik": "3513010101900001",
            "email": "warga@example.com",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert "user_id" in data
    assert data["status_verifikasi"] == "menunggu"


def test_register_invalid_nik_length(client):
    response = client.post(
        "/auth/register",
        json={
            "nama": "Warga Test",
            "nik": "123",  # kurang dari 16 digit
            "email": "warga2@example.com",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 422


def test_login_and_get_me(client):
    # Register dulu
    client.post(
        "/auth/register",
        json={
            "nama": "Login User",
            "nik": "3513010101900002",
            "email": "login@example.com",
            "password": "securepassword123",
        },
    )

    # Login
    login_res = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "securepassword123"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()["data"]
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    assert token_data["role"] == "warga_umum"

    # Get /auth/me pakai access token
    token = token_data["access_token"]
    me_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()["data"]
    assert me_data["email"] == "login@example.com"
    assert "nik" not in me_data  # NIK tidak boleh bocor di respons


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={
            "nama": "Login User",
            "nik": "3513010101900003",
            "email": "wrong@example.com",
            "password": "securepassword123",
        },
    )
    res = client.post(
        "/auth/login",
        json={"email": "wrong@example.com", "password": "salahpassword"},
    )
    assert res.status_code == 401


def test_refresh_token(client):
    client.post(
        "/auth/register",
        json={
            "nama": "Refresh User",
            "nik": "3513010101900004",
            "email": "refresh@example.com",
            "password": "securepassword123",
        },
    )
    login_res = client.post(
        "/auth/login",
        json={"email": "refresh@example.com", "password": "securepassword123"},
    )
    refresh_token = login_res.json()["data"]["refresh_token"]

    refresh_res = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()["data"]
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["role"] == "warga_umum"
    assert new_tokens["status_verifikasi"] == "menunggu"
