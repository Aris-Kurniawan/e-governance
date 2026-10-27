"""F4.15: kolom `laporan.jawaban_konfirmasi` (JSON NULLABLE)

Menyimpan jawaban mentah konfirmasi severity + waktu diproses, untuk audit
dan sebagai fitur lapis 2 (`severity.py`). Tanpa backfill — laporan lama NULL.

Bentuk: ``{"jawaban": [{"kode": "...", "nilai": "..."}], "diproses_pada": "..."}``

Revision ID: b7d15c4e9a02
Revises: f4a14b7c9e21
Create Date: 2026-10-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7d15c4e9a02"
down_revision: Union[str, Sequence[str], None] = "f4a14b7c9e21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, column: str) -> bool:
    return bool(
        bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_schema = DATABASE() "
                "AND table_name = 'laporan' "
                "AND column_name = :kolom"
            ),
            {"kolom": column},
        ).scalar()
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    if not _has_column(bind, "jawaban_konfirmasi"):
        op.add_column(
            "laporan", sa.Column("jawaban_konfirmasi", sa.JSON(), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    if _has_column(bind, "jawaban_konfirmasi"):
        op.drop_column("laporan", "jawaban_konfirmasi")
