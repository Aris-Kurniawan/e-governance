"""Model: sekolah, sekolah_data_resmi, kondisi_sarana."""

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid

JENJANG_ENUM = ("SD", "SMP", "SMA", "SMK")
SUMBER_SARANA_ENUM = ("dapodik", "laporan_warga")


class Sekolah(Base, TimestampMixin):
    __tablename__ = "sekolah"

    npsn: Mapped[str] = mapped_column(String(20), primary_key=True)
    sekolah_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    nama: Mapped[str] = mapped_column(String(255))
    alamat: Mapped[str | None] = mapped_column(String(500), nullable=True)
    jenjang: Mapped[str] = mapped_column(Enum(*JENJANG_ENUM, name="jenjang"))
    status_sekolah: Mapped[str | None] = mapped_column(
        Enum("Negeri", "Swasta", name="status_sekolah"), nullable=True
    )
    kecamatan: Mapped[str | None] = mapped_column(String(255), nullable=True)
    desa_kelurahan: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lintang: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    bujur: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    akreditasi: Mapped[str | None] = mapped_column(String(5), nullable=True)
    nama_kepsek: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sumber_data: Mapped[str | None] = mapped_column(String(50), default="Dapodik")
    tanggal_pembaruan_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    tanggal_verifikasi_baseline: Mapped[date | None] = mapped_column(Date, nullable=True)

    data_resmi: Mapped[list["SekolahDataResmi"]] = relationship(back_populates="sekolah")
    kondisi_sarana: Mapped[list["KondisiSarana"]] = relationship(back_populates="sekolah")


class SekolahDataResmi(Base, TimestampMixin):
    __tablename__ = "sekolah_data_resmi"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    sekolah_npsn: Mapped[str] = mapped_column(String(20), ForeignKey("sekolah.npsn"))
    rasio_guru_siswa: Mapped[str | None] = mapped_column(String(20), nullable=True)
    indikator_kualitas_data: Mapped[str | None] = mapped_column(String(50), nullable=True)

    sekolah: Mapped[Sekolah] = relationship(back_populates="data_resmi")


class KondisiSarana(Base, TimestampMixin):
    """Agregat per jenis ruang (bukan per ruang individual)."""

    __tablename__ = "kondisi_sarana"
    __table_args__ = (
        UniqueConstraint("sekolah_npsn", "nama_ruang", "sumber", name="uq_sarana_per_jenis"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    sekolah_npsn: Mapped[str] = mapped_column(String(20), ForeignKey("sekolah.npsn"))
    nama_ruang: Mapped[str] = mapped_column(String(255))
    jumlah: Mapped[int] = mapped_column(Integer, default=0)
    kondisi_baik: Mapped[int] = mapped_column(Integer, default=0)
    kondisi_rusak_ringan: Mapped[int] = mapped_column(Integer, default=0)
    kondisi_rusak_sedang: Mapped[int] = mapped_column(Integer, default=0)
    kondisi_rusak_berat: Mapped[int] = mapped_column(Integer, default=0)
    sumber: Mapped[str] = mapped_column(
        Enum(*SUMBER_SARANA_ENUM, name="sumber_sarana"), default="dapodik"
    )

    sekolah: Mapped[Sekolah] = relationship(back_populates="kondisi_sarana")

    @property
    def perlu_verifikasi(self) -> bool:
        """True kalau data Dapodik inkonsisten (total kondisi > jumlah unit)."""
        total = (
            self.kondisi_baik
            + self.kondisi_rusak_ringan
            + self.kondisi_rusak_sedang
            + self.kondisi_rusak_berat
        )
        return total > self.jumlah