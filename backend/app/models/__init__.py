"""Registrasi semua model — import agar terdaftar di Base.metadata."""

from app.models.base import Base, TimestampMixin, gen_uuid, utcnow
from app.models.klaster import Klaster, StatusLog, Vote
from app.models.laporan import Laporan, LaporanFoto
from app.models.logs import AuditLog, IngestJob
from app.models.sekolah import KondisiSarana, Sekolah, SekolahDataResmi
from app.models.user import PdpVault, User

__all__ = [
    "Base",
    "TimestampMixin",
    "gen_uuid",
    "utcnow",
    "User",
    "PdpVault",
    "Sekolah",
    "SekolahDataResmi",
    "KondisiSarana",
    "Laporan",
    "LaporanFoto",
    "Klaster",
    "Vote",
    "StatusLog",
    "IngestJob",
    "AuditLog",
]