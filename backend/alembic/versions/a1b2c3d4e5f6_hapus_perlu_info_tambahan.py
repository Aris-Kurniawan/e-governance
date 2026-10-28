"""Hapus nilai enum perlu_info_tambahan dari klaster & status_log

Status `perlu_info_tambahan` (tombol "Tandai Kejadian Baru" di Antrian
Validasi) tidak dipakai dalam alur bisnis dan membingungkan petugas.
Nilai dihapus dari enum kolom `klaster.status_verifikasi` dan
`status_log.status`.

Data existing: 0 baris memakai `perlu_info_tambahan` (diverifikasi via
query live sebelum migrasi dibuat). MySQL strict mode menolak UPDATE
dengan nilai di luar enum, jadi baris lama (jika ada) dikembalikan ke
`menunggu_verifikasi` sebelum MODIFY.

Revision ID: a1b2c3d4e5f6
Revises: 63a2411c6508
Create Date: 2026-10-28
"""

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "63a2411c6508"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        # SQLite (lingkungan test) tidak punya tipe ENUM fisik; tabel dibuat
        # ulang dari model SQLAlchemy dengan nilai enum terbaru.
        return

    # Kembalikan baris lama (jika ada) ke antrean sebelum nilai dihapus
    # dari definisi enum (strict mode menolak nilai di luar enum).
    op.execute(
        "UPDATE klaster SET status_verifikasi = 'menunggu_verifikasi' "
        "WHERE status_verifikasi = 'perlu_info_tambahan'"
    )
    op.execute(
        "UPDATE status_log SET status = 'menunggu_verifikasi' "
        "WHERE status = 'perlu_info_tambahan'"
    )

    # MySQL mewajibkan daftar nilai enum lengkap saat MODIFY.
    op.execute(
        "ALTER TABLE klaster MODIFY status_verifikasi ENUM("
        "'menunggu_verifikasi',"
        "'tidak_terverifikasi',"
        "'terverifikasi'"
        ") NOT NULL"
    )
    op.execute(
        "ALTER TABLE status_log MODIFY status ENUM("
        "'menunggu_verifikasi',"
        "'tidak_terverifikasi',"
        "'terverifikasi',"
        "'dalam_antrian_prioritas',"
        "'dalam_proses',"
        "'selesai',"
        "'tidak_dapat_ditindaklanjuti'"
        ") NOT NULL"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        return
    op.execute(
        "ALTER TABLE klaster MODIFY status_verifikasi ENUM("
        "'menunggu_verifikasi',"
        "'perlu_info_tambahan',"
        "'tidak_terverifikasi',"
        "'terverifikasi'"
        ") NOT NULL"
    )
    op.execute(
        "ALTER TABLE status_log MODIFY status ENUM("
        "'menunggu_verifikasi',"
        "'perlu_info_tambahan',"
        "'tidak_terverifikasi',"
        "'terverifikasi',"
        "'dalam_antrian_prioritas',"
        "'dalam_proses',"
        "'selesai',"
        "'tidak_dapat_ditindaklanjuti'"
        ") NOT NULL"
    )
