"""Model: klaster, vote, status_log."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid
from app.models.laporan import KATEGORI_ENUM

STATUS_KLASTER_ENUM = ("menunggu_verifikasi", "tidak_terverifikasi", "terverifikasi")
STATUS_PENANGANAN_ENUM = (
    "dalam_antrian_prioritas",
    "dalam_proses",
    "selesai",
    "tidak_dapat_ditindaklanjuti",
)
STATUS_VOTE_ENUM = ("pending", "terhitung")
STATUS_LOG_ENUM = (
    "menunggu_verifikasi",
    "perlu_info_tambahan",
    "tidak_terverifikasi",
    "terverifikasi",
    "dalam_antrian_prioritas",
    "dalam_proses",
    "selesai",
    "tidak_dapat_ditindaklanjuti",
)


class Klaster(Base, TimestampMixin):
    __tablename__ = "klaster"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    kategori: Mapped[str] = mapped_column(Enum(*KATEGORI_ENUM, name="kategori_klaster"))
    sekolah_npsn: Mapped[str] = mapped_column(String(20), ForeignKey("sekolah.npsn"))
    skor_keparahan: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    jumlah_vote_terhitung: Mapped[int] = mapped_column(Integer, default=0)
    skor_prioritas: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    urutan_prioritas_override: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alasan_override: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_verifikasi: Mapped[str] = mapped_column(
        Enum(*STATUS_KLASTER_ENUM, name="status_klaster"), default="menunggu_verifikasi"
    )
    status_penanganan: Mapped[str | None] = mapped_column(
        Enum(*STATUS_PENANGANAN_ENUM, name="status_penanganan"), nullable=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    votes: Mapped[list["Vote"]] = relationship(back_populates="klaster")
    status_logs: Mapped[list["StatusLog"]] = relationship(back_populates="klaster")


class Vote(Base, TimestampMixin):
    __tablename__ = "vote"
    __table_args__ = (
        UniqueConstraint("klaster_id", "user_id", name="uq_vote_per_klaster_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    klaster_id: Mapped[str] = mapped_column(String(36), ForeignKey("klaster.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    status_vote: Mapped[str] = mapped_column(
        Enum(*STATUS_VOTE_ENUM, name="status_vote"), default="pending"
    )

    klaster: Mapped[Klaster] = relationship(back_populates="votes")


class StatusLog(Base, TimestampMixin):
    """Append-only — tidak ada UPDATE/DELETE dari aplikasi."""

    __tablename__ = "status_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    klaster_id: Mapped[str] = mapped_column(String(36), ForeignKey("klaster.id"))
    status: Mapped[str] = mapped_column(Enum(*STATUS_LOG_ENUM, name="status_log_status"))
    alasan: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    klaster: Mapped[Klaster] = relationship(back_populates="status_logs")