"""F3.21 — Audit Logger untuk aksi sensitif."""

from sqlalchemy.orm import Session

from app.models.logs import AuditLog


def log_audit(
    db: Session,
    actor_user_id: str,
    aksi: str,
    target: str | None = None,
):
    """
    Catat aksi sensitif ke audit_log.
    
    Aksi yang di-log:
    - Akses PDP Vault (encrypt/decrypt NIK)
    - Override prioritas oleh Kepala Dinas
    - Perubahan status klaster
    - Login/logout
    """
    audit = AuditLog(
        actor_user_id=actor_user_id,
        aksi=aksi,
        target=target,
    )
    db.add(audit)

    return audit