"""Model: users & pdp_vault."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid

ROLE_ENUM = (
    "warga_umum",
    "warga_terverifikasi",
    "komite_sekolah",
    "verifikator_dinas",
    "kepala_dinas",
    "admin",
)
STATUS_VERIFIKASI_ENUM = ("menunggu", "terverifikasi", "ditolak")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    nama: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(Enum(*ROLE_ENUM, name="user_role"), default="warga_umum")
    status_verifikasi: Mapped[str] = mapped_column(
        Enum(*STATUS_VERIFIKASI_ENUM, name="status_verifikasi"), default="menunggu"
    )
    sekolah_terkait_npsn: Mapped[str | None] = mapped_column(
        String(20), ForeignKey("sekolah.npsn"), nullable=True
    )

    pdp_vault: Mapped["PdpVault | None"] = relationship(back_populates="user", uselist=False)


class PdpVault(Base, TimestampMixin):
    """Tabel terpisah, terenkripsi AES-256. Hanya app/core/pdp.py yang akses."""

    __tablename__ = "pdp_vault"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), primary_key=True
    )
    nik_encrypted: Mapped[bytes] = mapped_column(LargeBinary(255))

    user: Mapped[User] = relationship(back_populates="pdp_vault")