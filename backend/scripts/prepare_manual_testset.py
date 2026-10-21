"""F4.16 — Pilih 50 laporan test dan siapkan lembar label manual (tanpa LLM).

Dijalankan **sebelum** pelabelan LLM agar Aris menilai deskripsi secara independen
(tanpa melihat label LLM). Pemilihan memakai seed 42 dan ID tetap, sehingga
`prepare_severity_testset.py --test-ids test_50_ids.json` memakai himpunan yang sama.

  cd backend && ./venv/bin/python scripts/prepare_manual_testset.py
  # isi kolom label_manual di app/dataset/severity/test_50.csv
  # setelah label LLM siap:
  ./venv/bin/python scripts/prepare_severity_testset.py \
      --labels app/dataset/severity/labels_llm.jsonl \
      --test-ids app/dataset/severity/test_50_ids.json

Kolom `label_llm` sengaja kosong pada tahap ini.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal  # noqa: E402
from app.models.laporan import Laporan  # noqa: E402

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "app" / "dataset" / "severity"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--test-size", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = args.out_dir / "test_50.csv"
    ids_path = args.out_dir / "test_50_ids.json"
    if not args.force and (csv_path.exists() or ids_path.exists()):
        raise SystemExit("File sudah ada; pakai --force untuk memilih ulang")

    db = SessionLocal()
    try:
        rows = db.execute(select(Laporan).order_by(Laporan.id)).scalars().all()
    finally:
        db.close()

    if len(rows) < args.test_size:
        raise SystemExit(f"Butuh {args.test_size} laporan, ada {len(rows)}")
    rng = random.Random(args.seed)
    test = sorted(rng.sample(rows, args.test_size), key=lambda r: r.id)

    ids_path.write_text(
        json.dumps(sorted(r.id for r in test), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "deskripsi",
                "label_llm",
                "alasan_llm",
                "model",
                "label_manual",
            ],
        )
        writer.writeheader()
        for row in test:
            writer.writerow(
                {
                    "id": row.id,
                    "deskripsi": row.deskripsi,
                    "label_llm": "",
                    "alasan_llm": "",
                    "model": "",
                    "label_manual": "",
                }
            )

    print(f"Test : {len(test)} → {csv_path}")
    print(f"ID   : {ids_path}")
    print("Isi label_manual (baik/rusak_ringan/rusak_sedang/rusak_berat).")


if __name__ == "__main__":
    main()
