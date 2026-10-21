"""Model: laporan & laporan_foto."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid

KATEGORI_ENUM = (
    "ruang_belajar",
    "sanitasi_air",
    "utilitas",
    "akses_lahan",
    "penunjang",
    "belum_terklasifikasi",
)
KONDISI_ENUM = ("baik", "rusak_ringan", "rusak_sedang", "rusak_berat")
STATUS_SANGGHAN_ENUM = ("menunggu", "divalidasi", "ditolak")

# F4.14 (D-24 lanjutan, SPEC §17.2): asal nilai `kondisi_dilaporkan`.
# `warga` BUKAN input dropdown warga — hanya koreksi manusia (verifikator)
# yang tidak boleh ditimpa cron AI. NULL = belum ada sumber.
SUMBER_KONDISI_ENUM = ("ai", "warga")
# F4.14: status alur konfirmasi severity (lapis 1, F4.15). NULL = laporan lama.
STATUS_KONFIRMASI_ENUM = ("menunggu", "terjawab", "dilewati")


class Laporan(Base, TimestampMixin):
    __tablename__ = "laporan"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tracking_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    sekolah_npsn: Mapped[str] = mapped_column(String(20), ForeignKey("sekolah.npsn"))
    # kategori DIHAPUS (Keputusan #1, 2026-09-23): laporan teks bebas; kategori hanya di klaster.
    # KATEGORI_ENUM tetap dipertahankan di modul ini karena dipakai model Klaster.
    fasilitas_terkait: Mapped[str | None] = mapped_column(String(255), nullable=True)
    kondisi_dilaporkan: Mapped[str | None] = mapped_column(
        Enum(*KONDISI_ENUM, name="kondisi_dilaporkan"), nullable=True
    )
    # F4.14: provenance + status konfirmasi. Tanpa server_default — 600 baris
    # lama tetap NULL (bukan "menunggu"); laporan baru di-set di router.
    sumber_kondisi: Mapped[str | None] = mapped_column(
        Enum(*SUMBER_KONDISI_ENUM, name="sumber_kondisi"), nullable=True
    )
    status_konfirmasi: Mapped[str | None] = mapped_column(
        Enum(*STATUS_KONFIRMASI_ENUM, name="status_konfirmasi"), nullable=True
    )
    # F4.15: jawaban mentah + waktu proses, untuk audit & fitur lapis 2.
    # Bentuk: {"jawaban": [{"kode": "...", "nilai": "..."}], "diproses_pada": "..."}
    jawaban_konfirmasi: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    deskripsi: Mapped[str] = mapped_column(Text)
    klaster_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("klaster.id"), nullable=True
    )
    status_sanggahan: Mapped[str] = mapped_column(
        Enum(*STATUS_SANGGHAN_ENUM, name="status_sanggahan"), default="menunggu"
    )

    # F4.7 (D-21): penanda anti-loop — laporan noise HDBSCAN tidak lagi jadi
    # record Klaster; cron 02:00 memilih laporan dari kolom ini, bukan
    # klaster_id IS NULL (yang juga cocok dengan laporan noise).
    hasil_klasterisasi: Mapped[str] = mapped_column(
        Enum("belum_diproses", "terklaster", "noise", name="hasil_klasterisasi"),
        nullable=False,
        default="belum_diproses",
        server_default="belum_diproses",
    )

    foto: Mapped[list["LaporanFoto"]] = relationship(back_populates="laporan")


class LaporanFoto(Base, TimestampMixin):
    __tablename__ = "laporan_foto"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    laporan_id: Mapped[str] = mapped_column(String(36), ForeignKey("laporan.id"))
    storage_key: Mapped[str] = mapped_column(String(500))  # path di MinIO/S3

    laporan: Mapped[Laporan] = relationship(back_populates="foto")