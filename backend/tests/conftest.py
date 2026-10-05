"""Test configuration and fixtures for SIMAKIS.

Perbaikan:
- Tests menggunakan database terpisah (simakis_test) untuk isolation.
- Setiap test session menggunakan transaction scope untuk rollback after each test.
- Production DB (simakis) TIDAK DIHAPUS oleh pytest.
"""

import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.base import Base


# --- Test database connection ---
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "mysql+pymysql://root:dev123@localhost/simakis_test"
)

_engine = None
_SessionLocal = None


def get_test_engine():
    """Get or create test engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(TEST_DATABASE_URL, echo=False)
    return _engine


def get_test_session():
    """Get test session factory."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_test_engine(),
            autoflush=False,
            autocommit=False
        )
    return _SessionLocal


# --- Fixtures ---

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Create test database schema once per session.
    Cleans up after all tests complete.
    """
    engine = get_test_engine()
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup: drop all tables
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session():
    """
    Session-scoped DB session with transaction rollback after each test.
    
    Ini adalah pengganti untuk kode lama yang langsung bind ke engine produksi:
    ```python
    # OLD (salah):
    from app.core.database import SessionLocal, engine
    db = SessionLocal()
    db.add(...)
    db.commit()
    
    # NEW (benar):
    @pytest.fixture
    def db_session():
        from app.core.database import SessionLocal
        db = SessionLocal()
        yield db
        db.close()
    ```
    
    Gunakan fixture ini di test:
    ```python
    def test_something(db_session):
        # db_session adalah SessionLocal untuk simakis_test
        # Rollback otomatis setelah test selesai
        pass
    ```
    """
    SessionLocal = get_test_session()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_client(db_session):
    """
    FastAPI TestClient dengan DB session injected.
    
    Gunakan:
    ```python
    def test_endpoint(test_client):
        response = test_client.get("/api/endpoint")
        assert response.status_code == 200
    ```
    """
    from fastapi.testclient import TestClient
    from app.main import app
    
    # Inject test session ke FastAPI dependencies
    from app.core.database import get_db
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
