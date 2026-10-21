"""DBG-013: kolom `users.nip` (VARCHAR(30) NULLABLE)

Menyimpan NIP resmi pegawai pemerintah (dinas/verifikator/kepala dinas/admin)
agar profil pada antarmuka dinas dan cetak dokumen resmi bersifat dinamis
sesuai pengguna yang terautentikasi (bukan hardcoded 'Bambang H., S.T.').

Revision ID: 63a2411c6508
Revises: b7d15c4e9a02
Create Date: 2026-10-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "63a2411c6508"
down_revision: Union[str, Sequence[str], None] = "b7d15c4e9a02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, column: str) -> bool:
    return bool(
        bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_schema = DATABASE() "
                "AND table_name = 'users' "
                "AND column_name = :kolom"
            ),
            {"kolom": column},
        ).scalar()
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    if not _has_column(bind, "nip"):
        op.add_column(
            "users", sa.Column("nip", sa.String(30), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    if _has_column(bind, "nip"):
        op.drop_column("users", "nip")
