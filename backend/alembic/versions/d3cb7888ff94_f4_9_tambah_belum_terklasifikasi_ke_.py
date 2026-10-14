"""F4.9: tambah value 'belum_terklasifikasi' ke enum klaster.kategori

Revisi 8cca6e1b2fa3 hanya membuat ENUM5 nilai (tanpa 'belum_terklasifikasi'),
padahal KATEGORI_ENUM di app/models/laporan.py punya 6 nilai dan pipeline
(F3.x label-fallback, F4.7) menulis kategori 'belum_terklasifikasi'. DB live
sudah 6 nilai (diubah di luar alembic), sehingga selisih ini tak pernah
terlihat sampai ada fresh install mengikuti SETUP.md §5 (alembic upgrade head
dari nol) -> insert 18 klaster label-fallback gagal (MySQL 1265/1366).

Idempoten: kalau enum sudah memuat 'belum_terklasifikasi' (DB live / hasil
impor dump database/simakis.sql), skip — upgrade jadi no-op.

Downgrade membuang nilai kembali ke 5 — GAGAL bila masih ada baris memakai
'belum_terklasifikasi' (backfill/hapus dulu baris tersebut sebelum downgrade).

Revision ID: d3cb7888ff94
Revises: a7f3c91e5b2d
Create Date: 2026-10-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d3cb7888ff94"
down_revision: Union[str, Sequence[str], None] = "a7f3c91e5b2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ENUM_5 = "'ruang_belajar','sanitasi_air','utilitas','akses_lahan','penunjang'"
_ENUM_6 = _ENUM_5 + ",'belum_terklasifikasi'"


def _kolom_kategori_type(bind) -> str:
    row = bind.execute(
        sa.text(
            "SELECT COLUMN_TYPE FROM information_schema.columns "
            "WHERE table_schema = DATABASE() "
            "AND table_name = 'klaster' "
            "AND column_name = 'kategori'"
        )
    ).scalar()
    return row or ""


def upgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        # SQLite (lingkungan test) tidak punya tipe ENUM fisik; tabel dibuat
        # ulang dari model SQLAlchemy yang sudah memuat 6 nilai.
        return

    # Idempoten: DB live / dump impor sudah 6 nilai — jangan di-ALTER lagi.
    if "belum_terklasifikasi" in _kolom_kategori_type(op.get_bind()):
        return

    # Hanya menambah value di akhir daftar -> aman untuk data existing
    # (MySQL tidak menyusun ulang value lama). Collation mengikuti default
    # tabel (utf8mb4_unicode_ci), sama seperti kolom sekarang.
    op.execute(
        f"ALTER TABLE klaster MODIFY kategori ENUM({_ENUM_6}) NOT NULL"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        return

    # PERINGATAN: MySQL menolak/mengosongkan value yang dibuang bila masih
    # dipakai data. Backfill/hapus dulu baris kategori='belum_terklasifikasi'
    # (18 klaster saat ini) sebelum downgrade.
    op.execute(
        f"ALTER TABLE klaster MODIFY kategori ENUM({_ENUM_5}) NOT NULL"
    )
