"""F4: tambah nilai enum perlu_info_tambahan ke klaster.status_verifikasi

Endpoint `PUT /klaster/{id}/verifikasi` menerima status `perlu_info_tambahan`
(INTERFACES.md §5, tombol "Tandai Kejadian Baru" di halaman Antrian Validasi),
tetapi kolom `klaster.status_verifikasi` di MySQL hanya punya 3 nilai
(menunggu_verifikasi, tidak_terverifikasi, terverifikasi). Akibatnya setiap
permintaan dengan status itu gagal di level database:

    pymysql.err.DataError: (1265, "Data truncated for column
    'status_verifikasi' at row 1")  ->  HTTP 500

Nilai yang sama sudah ada di enum `status_log.status` sejak migrasi awal,
jadi hanya kolom `klaster` yang tertinggal. Nilai baru disisipkan setelah
`menunggu_verifikasi` supaya urutannya sama dengan `STATUS_KLASTER_ENUM`
di app/models/klaster.py.

Revision ID: d4f8c2a91e05
Revises: c01f4a7b2d09
Create Date: 2026-10-07
"""

from alembic import op
import sqlalchemy as sa


revision: str = "d4f8c2a91e05"
down_revision: str = "c01f4a7b2d09"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        # SQLite (lingkungan test) tidak punya tipe ENUM fisik; tabel dibuat
        # ulang dari model SQLAlchemy dengan nilai enum terbaru.
        return
    # MySQL mewajibkan daftar nilai enum lengkap saat MODIFY.
    op.execute(
        "ALTER TABLE klaster MODIFY status_verifikasi ENUM("
        "'menunggu_verifikasi',"
        "'perlu_info_tambahan',"
        "'tidak_terverifikasi',"
        "'terverifikasi'"
        ") NOT NULL"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        return
    # Baris dengan nilai perlu_info_tambahan dikembalikan dulu ke antrean
    # sebelum nilai dihapus dari definisi enum (strict mode menolak NULL/keluar).
    op.execute(
        "UPDATE klaster SET status_verifikasi = 'menunggu_verifikasi' "
        "WHERE status_verifikasi = 'perlu_info_tambahan'"
    )
    op.execute(
        "ALTER TABLE klaster MODIFY status_verifikasi ENUM("
        "'menunggu_verifikasi',"
        "'tidak_terverifikasi',"
        "'terverifikasi'"
        ") NOT NULL"
    )
