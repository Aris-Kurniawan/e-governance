"""F3.21 — Audit Log Endpoint."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, RoleChecker
from app.core.database import get_db
from app.models.user import User
from app.models.logs import AuditLog


router = APIRouter(prefix="/audit", tags=["audit"])

require_admin_kepala = RoleChecker(["admin", "kepala_dinas"])


@router.get("/log")
async def get_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin_kepala),
    db: Session = Depends(get_db),
):
    """
    F3.21 — Audit Log (GET /audit/log).
    
    Akses: admin, kepala_dinas
    Paginated audit trail.
    """
    total = db.scalar(select(AuditLog).count()) or 0
    offset = (page - 1) * page_size
    
    logs = db.scalars(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    ).all()
    
    total_pages = (total + page_size - 1) // page_size if total else 1
    
    return {
        "success": True,
        "data": [
            {
                "audit_id": log.id,
                "aksi": log.aksi,
                "actor_user_id": log.actor_user_id,
                "target": log.target,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages,
        }
    }