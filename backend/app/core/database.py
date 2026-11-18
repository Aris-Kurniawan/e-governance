"""Database engine & session factory."""

from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Normalisasi URL Railway / PaaS:
# Railway MySQL menyediakan URL berformat `mysql://...`.
# SQLAlchemy membutuhkan dialek driver eksplisit `mysql+pymysql://...`.
db_url = settings.DATABASE_URL
if db_url.startswith("mysql://"):
    db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# pool_pre_ping: hindari koneksi mati (MySQL idle timeout).
# connect_args check_same_thread: False diperlukan untuk SQLite lokal.
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
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
