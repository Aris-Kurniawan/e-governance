"""Model: laporan & laporan_foto."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid

KATEGORI_ENUM = ("infrastruktur_sarana", "ketersediaan_tenaga_pengajar", "lainnya")
KONDISI_ENUM = ("baik", "rusak_ringan", "rusak_sedang", "rusak_berat")
STATUS_SANGGHAN_ENUM = ("menunggu", "divalidasi", "ditolak")


class Laporan(Base, TimestampMixin):
    __tablename__ = "laporan"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tracking_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    sekolah_npsn: Mapped[str] = mapped_column(String(20), ForeignKey("sekolah.npsn"))
    kategori: Mapped[str] = mapped_column(Enum(*KATEGORI_ENUM, name="kategori_laporan"))
    fasilitas_terkait: Mapped[str | None] = mapped_column(String(255), nullable=True)
    kondisi_dilaporkan: Mapped[str | None] = mapped_column(
        Enum(*KONDISI_ENUM, name="kondisi_dilaporkan"), nullable=True
    )
    deskripsi: Mapped[str] = mapped_column(Text)
    klaster_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("klaster.id"), nullable=True
    )
    status_sanggahan: Mapped[str] = mapped_column(
        Enum(*STATUS_SANGGHAN_ENUM, name="status_sanggahan"), default="menunggu"
    )

    foto: Mapped[list["LaporanFoto"]] = relationship(back_populates="laporan")


class LaporanFoto(Base, TimestampMixin):
    __tablename__ = "laporan_foto"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    laporan_id: Mapped[str] = mapped_column(String(36), ForeignKey("laporan.id"))
    storage_key: Mapped[str] = mapped_column(String(500))  # path di MinIO/S3

    laporan: Mapped[Laporan] = relationship(back_populates="foto")