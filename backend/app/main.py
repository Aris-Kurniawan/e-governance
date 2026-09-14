"""SIMAKIS Backend — Entry Point.

Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah.
FastAPI application factory.
"""

from fastapi import FastAPI

from app.core.config import settings

app = FastAPI(
    title="SIMAKIS API",
    description="Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)


@app.get("/", tags=["health"])
def root():
    return {"app": settings.APP_NAME, "status": "ok", "version": app.version}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}