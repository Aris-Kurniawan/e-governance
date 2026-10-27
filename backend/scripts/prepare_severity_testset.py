"""F4.16 — Pisahkan label LLM menjadi train 550 + test 50 (manual).

50 laporan dipilih acak (seed tetap) dan **tidak boleh** dipakai melatih.
Skrip menulis:
- ``train_550.jsonl``
- ``test_50.csv``  (kolom ``label_manual`` kosong untuk diisi Aris)
- ``test_50.json`` (salinan mesin)

Pemakaian:
  cd backend && ./venv/bin/python scripts/prepare_severity_testset.py
  # lalu isi kolom label_manual (salah satu: baik/rusak_ringan/rusak_sedang/rusak_berat)
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_pipeline.severity import LEVELS  # noqa: E402

DEFAULT_DIR = (
    Path(__file__).resolve().parent.parent / "app" / "dataset" / "severity"
)


def baca_jsonl(path: Path) -> list[dict]:
    baris: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                baris.append(json.loads(line))
    return baris


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--labels", type=Path, default=DEFAULT_DIR / "labels_llm.jsonl")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--test-size", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--test-ids", type=Path, default=None)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    data = baca_jsonl(args.labels)
    if len(data) < args.test_size + 1:
        raise SystemExit(f"Butuh minimal {args.test_size + 1} label, ada {len(data)}")

    salah = [r["id"] for r in data if r.get("kondisi") not in LEVELS]
    if salah:
        raise SystemExit(f"{len(salah)} label di luar enum, contoh: {salah[:3]}")
    if len({r["id"] for r in data}) != len(data):
        raise SystemExit("Ada ID duplikat di file label")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    train_path = args.out_dir / "train_550.jsonl"
    test_csv = args.out_dir / "test_50.csv"
    test_json = args.out_dir / "test_50.json"
    if not args.force and any(p.exists() for p in (train_path, test_csv, test_json)):
        raise SystemExit("Output sudah ada; pakai --force untuk menimpa")

    if args.test_ids and args.test_ids.exists():
        ids = json.loads(args.test_ids.read_text(encoding="utf-8"))
        test_ids = set(ids)
        if len(test_ids) != args.test_size:
            raise SystemExit(
                f"{args.test_ids} berisi {len(test_ids)} ID, bukan {args.test_size}"
            )
        hilang = test_ids - {r["id"] for r in data}
        if hilang:
            raise SystemExit(f"{len(hilang)} ID test belum punya label LLM")
        test = [r for r in data if r["id"] in test_ids]
    else:
        rng = random.Random(args.seed)
        test = rng.sample(data, args.test_size)
        test_ids = {r["id"] for r in test}
    test.sort(key=lambda r: r["id"])
    train = [r for r in data if r["id"] not in test_ids]

    # Jangan menghapus label manual yang sudah diisi Aris.
    manual: dict[str, str] = {}
    if test_csv.exists():
        with test_csv.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                nilai = (row.get("label_manual") or "").strip()
                if nilai:
                    manual[row["id"]] = nilai

    with train_path.open("w", encoding="utf-8") as f:
        for row in train:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    with test_csv.open("w", encoding="utf-8", newline="") as f:
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
                    "id": row["id"],
                    "deskripsi": row["deskripsi"],
                    "label_llm": row["kondisi"],
                    "alasan_llm": row.get("alasan", ""),
                    "model": row.get("model", ""),
                    "label_manual": manual.get(row["id"], ""),
                }
            )

    test_json.write_text(
        json.dumps(test, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"Train : {len(train)} → {train_path}")
    print(f"Test  : {len(test)} → {test_csv}")
    print("Isi kolom label_manual lalu jalankan severity_ablation.py --labels manual")


if __name__ == "__main__":
    main()
