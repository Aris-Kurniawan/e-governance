"""Tambah tindak lanjut dan riwayat untuk laporan non-klaster.

Laporan noise yang tervalidasi tidak dibuatkan Klaster semu. Status penanganan
disimpan pada tabel laporan, sedangkan setiap pembaruan dicatat append-only di
laporan_status_log.

Revision ID: e5f6a7b8c9d0
Revises: b7d15c4e9a02
Create Date: 2026-11-03
"""

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: str | None = "b7d15c4e9a02"
branch_labels: str | None = None
depends_on: str | None = None


_STATUS = sa.Enum(
    "dalam_antrian_prioritas",
    "dalam_proses",
    "selesai",
    "tidak_dapat_ditindaklanjuti",
    name="status_penanganan_laporan",
)
_LOG_STATUS = sa.Enum(
    "dalam_antrian_prioritas",
    "dalam_proses",
    "selesai",
    "tidak_dapat_ditindaklanjuti",
    name="laporan_status_log_status",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return

    # Idempotent: run sebelumnya bisa gagal di tengah (MySQL DDL
    # non-transactional) — mis. kolom sudah masuk tapi CREATE TABLE belum.
    inspector = sa.inspect(bind)
    if "status_penanganan" not in {
        c["name"] for c in inspector.get_columns("laporan")
    }:
        op.add_column(
            "laporan",
            sa.Column("status_penanganan", _STATUS, nullable=True),
        )

    if not inspector.has_table("laporan_status_log"):
        # charset/collate eksplisit: tabel existing memakai utf8mb4_unicode_ci,
        # sedangkan default DB (utf8mb4_0900_ai_ci) membuat FK ke
        # laporan.id/users.id ditolak MySQL (error 3780 incompatible).
        op.create_table(
            "laporan_status_log",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("laporan_id", sa.String(length=36), nullable=False),
            sa.Column("status", _LOG_STATUS, nullable=False),
            sa.Column("alasan", sa.Text(), nullable=True),
            sa.Column("actor_user_id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["laporan_id"], ["laporan.id"]),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
            mysql_charset="utf8mb4",
            mysql_collate="utf8mb4_unicode_ci",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return

    op.drop_table("laporan_status_log")
    op.drop_column("laporan", "status_penanganan")
