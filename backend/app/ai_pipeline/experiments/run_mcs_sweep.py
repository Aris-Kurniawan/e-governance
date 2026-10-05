#!/usr/bin/env python3
"""
F3.23b — Sweep min_cluster_size terhadap skala data.

Tujuan: NMI pada sweep pertama (C2 tetap min_cluster_size=3) anjlok saat n
membesar karena HDBSCAN memfragmentasi data (191 klaster untuk 5 kategori
ground truth). Di sini min_cluster_size di-sweep pada tiap skala untuk
meng cari parameter yang adil per-skala.

Efisiensi: embedding dihitung sekali per (n, varian A); UMAP sekali per
(n, varian A, B1); hanya HDBSCAN+evaluasi yang diulang per min_cluster_size.

CLI:
  ./venv/bin/python -m app.ai_pipeline.experiments.run_mcs_sweep
  ./venv/bin/python -m app.ai_pipeline.experiments.run_mcs_sweep --ns 45,150 --fresh
"""

import argparse
import csv
import json
import time
from pathlib import Path
from typing import Dict, List

import numpy as np

from app.ai_pipeline.embedding import embed_texts
from app.ai_pipeline.reduction import reduce_dimensions
from app.ai_pipeline.clustering import cluster_texts
from app.ai_pipeline.experiments.evaluation import evaluate_all

VARIANTS_A = {"A1": "indobert", "A2": "tfidf", "A3": "minilm"}
VARIANTS_B = {"B1": 10, "B2": None}

# Grid min_cluster_size; min_samples = max(2, mcs // 2)
MCS_GRID = [3, 5, 8, 12, 20, 30, 50, 80]

CAT_TO_ID = {
    "ruang_belajar": 0,
    "sanitasi_air": 1,
    "utilitas": 2,
    "akses_lahan": 3,
    "penunjang": 4,
}

HERE = Path(__file__).parent


def load_dataset(n: int):
    with open(HERE / f"dataset_aug_{n}.json", encoding="utf-8") as f:
        data = json.load(f)
    docs = [d["teks"] for d in data["documents"]]
    y_true = np.array([CAT_TO_ID[d["kategori"]] for d in data["documents"]])
    return docs, y_true


def compile_csv(out_dir: Path) -> None:
    rows = []
    for jf in sorted(out_dir.glob("*.json")):
        with open(jf, encoding="utf-8") as f:
            rows.extend(json.load(f)["runs"])
    if not rows:
        print("[WARN] tidak ada hasil untuk disusun CSV")
        return
    rows.sort(key=lambda r: (r["n"], r["variant_a"], r["variant_b"], r["min_cluster_size"]))
    csv_file = out_dir / "summary_mcs_sweep.csv"
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"[DONE] {len(rows)} run -> {csv_file}")


def run(ns: List[int], out_dir: Path, fresh: bool) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    for n in ns:
        docs, y_true = load_dataset(n)
        print(f"\n{'='*64}\nn={n}  docs={len(docs)}\n{'='*64}")

        for var_a, method in VARIANTS_A.items():
            t0 = time.time()
            emb = embed_texts(docs, method=method)
            print(f"[{var_a}/{method}] embed {emb.shape} in {time.time()-t0:.1f}s")

            for var_b, n_comp in VARIANTS_B.items():
                # UMAP sekali per (n, A, B1) — dipakai ulang untuk semua mcs
                if n_comp is not None:
                    k = min(n_comp, len(docs) - 2, emb.shape[1] - 1)
                    vectors = reduce_dimensions(emb, n_components=k) if k >= 2 else emb
                else:
                    vectors = emb

                runs: List[Dict] = []
                for mcs in MCS_GRID:
                    if mcs > len(docs) // 5:  # klaster minimal harus >= 5 kategori
                        continue
                    min_samples = max(2, mcs // 2)
                    t = time.time()
                    labels = cluster_texts(
                        vectors, min_cluster_size=mcs, min_samples=min_samples
                    )
                    m = evaluate_all(vectors, y_true, labels)
                    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
                    run_row = {
                        "n": n,
                        "variant_a": var_a,
                        "method": method,
                        "variant_b": var_b,
                        "umap": n_comp is not None,
                        "min_cluster_size": mcs,
                        "min_samples": min_samples,
                        "nmi": round(float(m.get("nmi", 0.0)), 4),
                        "ari": round(float(m.get("ari", 0.0)), 4),
                        "purity": round(float(m.get("purity", 0.0)), 4),
                        "noise_ratio": round(float(m.get("noise_ratio", 0.0)), 4),
                        "n_clusters": n_clusters,
                        "runtime_sec": round(time.time() - t, 2),
                    }
                    runs.append(run_row)
                    print(
                        f"   mcs={mcs:>3} min_samples={min_samples:>2} | "
                        f"NMI {run_row['nmi']:.4f} | purity {run_row['purity']:.4f} | "
                        f"klaster {n_clusters:>3} | {run_row['runtime_sec']}s"
                    )

                out_file = out_dir / f"{var_a}_{var_b}_n{n}.json"
                if fresh or not out_file.exists():
                    with open(out_file, "w", encoding="utf-8") as f:
                        json.dump({"config": {"n": n, "variant_a": var_a,
                                              "variant_b": var_b}, "runs": runs}, f, indent=2)

    compile_csv(out_dir)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ns", default="45,150,500,1500")
    p.add_argument("--out-dir", type=Path, default=HERE / "results_mcs_sweep")
    p.add_argument("--fresh", action="store_true")
    args = p.parse_args()
    run([int(x) for x in args.ns.split(",")], args.out_dir, args.fresh)


if __name__ == "__main__":
    main()