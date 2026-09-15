"""Model: ingest_job & audit_log."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, gen_uuid

INGEST_STATUS_ENUM = ("diproses", "selesai", "gagal")


class IngestJob(Base, TimestampMixin):
    __tablename__ = "ingest_job"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    file_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(
        Enum(*INGEST_STATUS_ENUM, name="ingest_status"), default="diproses"
    )
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    baris_diproses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    baris_gagal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    aksi: Mapped[str] = mapped_column(String(255))
    actor_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)