"""SIMAKIS Backend — Entry Point.

Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah.
FastAPI application factory.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.routers import auth, sekolah, laporan, upload, ingest, sanggahan, klaster, vote, dashboard, audit

# Kode error standar — INTERFACES.md §0.3
ERROR_CODES = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "ALREADY_VOTED",
    422: "REASON_REQUIRED",
    500: "INTERNAL_ERROR",
}

app = FastAPI(
    title="SIMAKIS API",
    description="Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# ── Amplop respons gagal — INTERFACES.md §0.1 / §0.3 ────────────────────────
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code = ERROR_CODES.get(exc.status_code, "INTERNAL_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = {
        ".".join(str(loc) for loc in err.get("loc", [])): err.get("msg", "")
        for err in exc.errors()
    }
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input tidak valid",
                "details": details,
            }
        },
    )


# ── CORS — hanya untuk pengembangan lokal (frontend Vite :5173 → API :8000) ───
# Produksi dilayani same-origin di belakang reverse proxy, jadi daftar origin
# boleh dikosongkan lewat env `CORS_ORIGINS=[]`.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(vote.router)
app.include_router(dashboard.router)
app.include_router(audit.router)



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
