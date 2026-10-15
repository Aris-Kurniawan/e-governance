"""F4.7 (D-21): tambah laporan.hasil_klasterisasi + backfill anti-loop

Klasterisasi tanpa "Belum Terklasifikasi": pipeline tidak lagi membuat record
Klaster untuk label noise HDBSCAN (-1); 57 klaster noise dihapus dan 398
laporannya ditandai `noise` (klaster_id = NULL). 18 klaster label-fallback
(kategori belum_terklasifikasi) tetap ada tapi disembunyikan dari daftar
default `GET /klaster`.

Kolom `hasil_klasterisasi` WAJIB, bukan opsional: tanpa penanda ini, laporan
noise (klaster_id = NULL) akan terpilih lagi oleh cron 02:00 WIB besok ->
re-clustering -> noise lagi -> loop tiap hari.

Backfill berurutan karena FK `laporan.klaster_id -> klaster.id` default
RESTRICT (FK harus dilepas sebelum induknya dihapus).

Revision ID: a7f3c91e5b2d
Revises: d4f8c2a91e05
Create Date: 2026-10-13
"""

from alembic import op
import sqlalchemy as sa


revision: str = "a7f3c91e5b2d"
down_revision: str = "d4f8c2a91e05"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        # SQLite (lingkungan test) tidak punya tipe ENUM fisik; tabel dibuat
        # ulang dari model SQLAlchemy dengan kolom/enum terbaru.
        return

    # Idempoten: DB live bisa saja sudah mendapat kolom ini lewat percobaan
    # sebelumnya (ERROR: duplicate column jika dijalankan dua kali).
    exists = op.get_bind().execute(
        sa.text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = DATABASE() "
            "AND table_name = 'laporan' "
            "AND column_name = 'hasil_klasterisasi'"
        )
    ).scalar()
    if not exists:
        op.add_column(
            "laporan",
            sa.Column(
                "hasil_klasterisasi",
                sa.Enum(
                    "belum_diproses",
                    "terklaster",
                    "noise",
                    name="hasil_klasterisasi",
                ),
                nullable=False,
                server_default="belum_diproses",
            ),
        )

    # Backfill berurutan (FK RESTRICT):
    # 1) lepas 398 laporan noise dari klaster noise
    op.execute(
        "UPDATE laporan "
        "SET hasil_klasterisasi = 'noise', klaster_id = NULL "
        "WHERE klaster_id IN (SELECT id FROM klaster WHERE label = 'Belum Terklasifikasi')"
    )
    # 2) hapus 57 klaster noise (aman: status_log & vote 0 referensi)
    op.execute("DELETE FROM klaster WHERE label = 'Belum Terklasifikasi'")
    # 3) sisa laporan yang masih menempel = klaster valid / label-fallback
    op.execute(
        "UPDATE laporan SET hasil_klasterisasi = 'terklaster' "
        "WHERE klaster_id IS NOT NULL"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "mysql":
        return
    # 57 klaster noise sudah terhapus permanen (label unigram tidak bisa
    # direkonstruksi); downgrade hanya mengembalikan skema kolom.
    op.drop_column("laporan", "hasil_klasterisasi")
