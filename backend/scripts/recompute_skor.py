"""DBG-021 — Hitung ulang skor keparahan & prioritas semua klaster (one-off).

Skor klaster disimpan sebagai snapshot saat klaster dibuat / saat vote terakhir.
Bila data Dapodik (`kondisi_sarana`) masuk SETELAH itu, snapshot menjadi basi —
klaster `5dda3ac6` tersimpan 55,86 padahal hitung ulang 75,66 (selisih 19,8 =
0,3 × 66). Skrip ini menghitung ulang SEMUA klaster dari sumber saat ini
(laporan `kondisi_dilaporkan` + `kondisi_sarana` + `jumlah_vote_terhitung`)
memakai `calculate_score_components` (tanpa back-calc).

Default **dry-run**. Penulisan wajib `--commit`. Idempoten: rerun setelah
`--commit` → 0 klaster berubah.

  cd backend && ./venv/bin/python scripts/recompute_skor.py
  cd backend && ./venv/bin/python scripts/recompute_skor.py --commit
"""

from __future__ import annotations

import argparse
import sys
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_pipeline.scoring import (  # noqa: E402
    calculate_score_components,
    hitung_kondisi_dapodik,
)
from app.core.database import SessionLocal  # noqa: E402
from app.models.klaster import Klaster  # noqa: E402
from app.models.laporan import Laporan  # noqa: E402

TOLERANSI = 0.01


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", action="store_true", help="tulis ke DB")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        klasters = list(db.execute(select(Klaster)).scalars())
        if not klasters:
            print("Tidak ada klaster.")
            return

        berubah: list[tuple[str, float, float, float, float]] = []
        for klaster in klasters:
            laporan_list = db.scalars(
                select(Laporan).where(Laporan.klaster_id == klaster.id)
            ).all()
            kondisi_laporan = [
                {"kondisi_dilaporkan": lap.kondisi_dilaporkan} for lap in laporan_list
            ]
            kondisi_dapodik = hitung_kondisi_dapodik(db, klaster.sekolah_npsn)
            skor_keparahan, skor_prioritas = calculate_score_components(
                kondisi_laporan,
                kondisi_dapodik,
                klaster.jumlah_vote_terhitung or 0,
            )

            lama_kep = float(klaster.skor_keparahan or 0)
            lama_pri = float(klaster.skor_prioritas or 0)
            if (
                abs(lama_kep - skor_keparahan) > TOLERANSI
                or abs(lama_pri - skor_prioritas) > TOLERANSI
            ):
                berubah.append((klaster.id, lama_kep, skor_keparahan, lama_pri, skor_prioritas))
                if args.commit:
                    klaster.skor_keparahan = Decimal(str(skor_keparahan))
                    klaster.skor_prioritas = Decimal(str(skor_prioritas))

        delta_max = max(
            (abs(b[2] - b[1]) for b in berubah), default=0.0
        )
        print(f"Klaster diperiksa : {len(klasters)}")
        print(f"Berubah          : {len(berubah)} (delta keparahan max {delta_max:.2f})")
        if berubah:
            print(f"{'id':<40} {'kep lama':>9} {'kep baru':>9} {'pri lama':>9} {'pri baru':>9}")
            for cid, lama_k, baru_k, lama_p, baru_p in berubah:
                print(
                    f"{cid:<40} {lama_k:>9.2f} {baru_k:>9.2f} "
                    f"{lama_p:>9.2f} {baru_p:>9.2f}"
                )

        if args.commit:
            db.commit()
            print(f"✅ Ditulis: {len(berubah)} klaster.")
        else:
            print("DRY-RUN — tidak ada perubahan. Jalankan dengan --commit.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
