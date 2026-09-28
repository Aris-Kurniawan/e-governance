"""F3: drop laporan.kategori column (free-text design)

Laporan warga kini teks bebas; kategori infrastruktur ditentukan oleh AI
pipeline dan disimpan di tabel `klaster.kategori`. Kolom `kategori` di
tabel laporan dihapus (Keputusan #1, 2026-09-23). `KATEGORI_ENUM` tetap
ada di app/models/laporan.py karena dipakai oleh model Klaster.

Revision ID: c01f4a7b2d09
Revises: 8cca6e1b2fa3
Create Date: 2026-09-23
"""

from alembic import op
import sqlalchemy as sa


revision: str = "c01f4a7b2d09"
down_revision: str = "8cca6e1b2fa3"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.drop_column("laporan", "kategori")


def downgrade() -> None:
    op.add_column(
        "laporan",
        sa.Column(
            "kategori",
            sa.Enum(
                "ruang_belajar",
                "sanitasi_air",
                "utilitas",
                "akses_lahan",
                "penunjang",
                name="kategori_laporan",
            ),
            nullable=False,
        ),
    )
