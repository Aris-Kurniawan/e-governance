"""Konfigurasi aplikasi — baca dari environment (.env)."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path ke direktori backend (e-goverment/backend)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[".env", str(BACKEND_DIR / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "SIMAKIS"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./simakis_local.db"

    # Auth
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # PPP Vault
    PDP_ENCRYPTION_KEY: str = ""

    # MinIO / S3
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = "simakis-media"

    # AI Pipeline
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"

settings = Settings()
