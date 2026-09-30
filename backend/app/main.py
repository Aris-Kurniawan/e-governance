"""SIMAKIS Backend — Entry Point.

Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah.
FastAPI application factory.
"""

from fastapi import FastAPI

from app.core.config import settings
from app.routers import auth, sekolah, laporan, upload, ingest, sanggahan, klaster, vote

app = FastAPI(
    title="SIMAKIS API",
    description="Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# Registrasi Router
app.include_router(auth.router)
app.include_router(sekolah.router)
app.include_router(laporan.router)
app.include_router(upload.router)
app.include_router(ingest.router)
app.include_router(sanggahan.router)
app.include_router(klaster.router)
app.include_router(klaster.verifikasi_router)



@app.get("/", tags=["health"])
def root():
    return {"app": settings.APP_NAME, "status": "ok", "version": app.version}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}


# Health check alias
@app.get("/api/health", tags=["health"])
def api_health():
    return {"status": "healthy"}
