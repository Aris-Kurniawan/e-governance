"""F4.14: kolom provenance kondisi + status konfirmasi pada `laporan`

Menambah dua kolom ENUM NULLABLE:

- `sumber_kondisi`  : `ai` | `warga` — asal nilai `kondisi_dilaporkan`.
  `warga` hanya untuk koreksi manusia (verifikator), supaya cron AI tidak
  menimpa koreksi tersebut. Laporan lama tetap NULL ("belum ada sumber").
- `status_konfirmasi`: `menunggu` | `terjawab` | `dilewati` — status alur
  konfirmasi severity (lapis 1). Laporan lama tetap NULL.

Tanpa `server_default`: 600 baris existing tidak di-backfill. Laporan baru
mendapat `status_konfirmasi = 'menunggu'` dari `POST /laporan`.

Idempoten: bila kolom sudah ada (DB live / hasil impor dump), upgrade no-op.

Revision ID: f4a14b7c9e21
Revises: d3cb7888ff94
Create Date: 2026-10-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f4a14b7c9e21"
down_revision: Union[str, Sequence[str], None] = "d3cb7888ff94"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SUMBER_KONDISI = sa.Enum("ai", "warga", name="sumber_kondisi")
_STATUS_KONFIRMASI = sa.Enum(
    "menunggu", "terjawab", "dilewati", name="status_konfirmasi"
)


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
        # SQLite (lingkungan test) membuat tabel dari model via create_all;
        # tidak ada ENUM fisik yang perlu di-ALTER.
        return

    if not _has_column(bind, "sumber_kondisi"):
        op.add_column(
            "laporan", sa.Column("sumber_kondisi", _SUMBER_KONDISI, nullable=True)
        )
    if not _has_column(bind, "status_konfirmasi"):
        op.add_column(
            "laporan",
            sa.Column("status_konfirmasi", _STATUS_KONFIRMASI, nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return

    if _has_column(bind, "status_konfirmasi"):
        op.drop_column("laporan", "status_konfirmasi")
    if _has_column(bind, "sumber_kondisi"):
        op.drop_column("laporan", "sumber_kondisi")
