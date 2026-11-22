"""F4.12 — Manajemen Akun (monitoring) — GET /users, GET /users/statistik.

Halaman admin `/dinas/sistem` memakai dua endpoint ini. Sengaja baca-saja:
NIK tidak pernah dirender (D-29), hanya status verifikasi.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import RoleChecker
from app.models.user import ROLE_ENUM, STATUS_VERIFIKASI_ENUM, User


router = APIRouter(prefix="/users", tags=["users"])

require_admin = RoleChecker(["admin"])


@router.get("")
async def list_users(
    role: str | None = Query(None, description="Filter role"),
    status_verifikasi: str | None = Query(None, description="menunggu|terverifikasi|ditolak"),
    q: str | None = Query(None, max_length=100, description="Cari nama atau email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Daftar akun (admin). Tanpa NIK — hanya status verifikasi."""
    if role and role not in ROLE_ENUM:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"role tidak dikenal: {role}",
        )
    if status_verifikasi and status_verifikasi not in STATUS_VERIFIKASI_ENUM:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status_verifikasi tidak dikenal: {status_verifikasi}",
        )

    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if status_verifikasi:
        stmt = stmt.where(User.status_verifikasi == status_verifikasi)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.nama.ilike(like), User.email.ilike(like)))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "data": [
            {
                "user_id": u.id,
                "nama": u.nama,
                "email": u.email,
                "role": u.role,
                "status_verifikasi": u.status_verifikasi,
                "nip": u.nip,
                "sekolah_terkait_npsn": u.sekolah_terkait_npsn,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in rows
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": (total + page_size - 1) // page_size if total else 1,
        },
    }


@router.get("/statistik")
async def statistik_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Jumlah akun per role + jumlah menunggu verifikasi."""
    per_role = dict(
        db.execute(select(User.role, func.count()).group_by(User.role)).all()
    )
    menunggu = db.scalar(
        select(func.count()).select_from(User).where(User.status_verifikasi == "menunggu")
    ) or 0

    return {
        "data": {
            "total": sum(per_role.values()),
            "per_role": {r: per_role.get(r, 0) for r in ROLE_ENUM},
            "menunggu_verifikasi": menunggu,
        }
    }
