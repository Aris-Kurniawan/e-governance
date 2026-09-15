"""Database engine & session factory."""

from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# pool_pre_ping: hindari koneksi mati (MySQL idle timeout).
# connect_args check_same_thread: False diperlukan untuk SQLite lokal.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — satu session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
