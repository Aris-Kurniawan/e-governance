"""Konfigurasi aplikasi — baca dari environment (.env)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "SIMAKIS"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "mysql+pymysql://user:password@localhost:3306/simakis"

    # Auth
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # PDP Vault
    PDP_ENCRYPTION_KEY: str = ""

    # MinIO / S3
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = "simakis-media"

    # AI Pipeline
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"


settings = Settings()