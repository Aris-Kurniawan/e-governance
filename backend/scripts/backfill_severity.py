"""F4.16 — Backfill severity untuk laporan lama (one-off, aman).

Cron `run_clustering.py` hanya memproses laporan `belum_diproses`. Laporan yang
sudah terklaster sejak sebelum F4.16 tidak akan pernah melewati tahap severity,
sehingga kolom `kondisi_dilaporkan` tetap NULL dan bobot 70% skor KBM hangus.

Skrip ini mengisi **hanya** baris:
- `kondisi_dilaporkan IS NULL`, dan
- `sumber_kondisi IS NULL OR sumber_kondisi != 'warga'`.

Default **dry-run**. Penulisan wajib `--commit`.

  cd backend && ./venv/bin/python scripts/backfill_severity.py
  cd backend && ./venv/bin/python scripts/backfill_severity.py --commit
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from sqlalchemy import or_, select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_pipeline.severity import classify_severity  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.laporan import Laporan  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", action="store_true", help="tulis ke DB")
    parser.add_argument("--batch-size", type=int, default=200)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--method", default="k1")
    args = parser.parse_args()

    if args.method != "k1":
        raise SystemExit("Hanya method k1 yang tersedia")

    db = SessionLocal()
    try:
        stmt = (
            select(Laporan)
            .where(
                Laporan.kondisi_dilaporkan.is_(None),
                or_(
                    Laporan.sumber_kondisi.is_(None),
                    Laporan.sumber_kondisi != "warga",
                ),
            )
            .order_by(Laporan.created_at)
        )
        if args.limit:
            stmt = stmt.limit(args.limit)
        rows = list(db.execute(stmt).scalars().all())
        if not rows:
            print("Tidak ada laporan yang perlu diisi.")
            return

        distribusi: Counter[str] = Counter()
        contoh: list[tuple[str, str]] = []
        for i in range(0, len(rows), args.batch_size):
            batch = rows[i : i + args.batch_size]
            hasil = classify_severity(
                [
                    {
                        "deskripsi": lap.deskripsi or "",
                        "jawaban": (lap.jawaban_konfirmasi or {}).get("jawaban"),
                    }
                    for lap in batch
                ]
            )
            for lap, kondisi in zip(batch, hasil):
                distribusi[kondisi] += 1
                if len(contoh) < 10:
                    contoh.append((lap.id, kondisi))
                if args.commit:
                    lap.kondisi_dilaporkan = kondisi
                    lap.sumber_kondisi = "ai"

        print(f"Kandidat: {len(rows)} laporan")
        for level, jumlah in distribusi.most_common():
            print(f"  {level:>14}: {jumlah}")
        print("Contoh:")
        for laporan_id, kondisi in contoh:
            print(f"  {laporan_id} → {kondisi}")

        if args.commit:
            db.commit()
            print(f"✅ Ditulis: {len(rows)} baris (sumber_kondisi='ai')")
        else:
            print("DRY-RUN — tidak ada perubahan. Jalankan dengan --commit.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
