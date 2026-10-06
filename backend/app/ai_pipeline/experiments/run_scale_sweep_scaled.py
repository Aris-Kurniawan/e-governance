#!/usr/bin/env python3
"""
F3.23 Extended — Scale Sweep with Scaled HDBSCAN Parameters.
Tests whether scaling min_cluster_size proportionally with n resolves NMI fragmentation.
"""

import argparse
import csv
import json
import time
from pathlib import Path
from typing import Dict, List, Any
import numpy as np

from app.ai_pipeline.embedding import embed_texts
from app.ai_pipeline.reduction import reduce_dimensions
from app.ai_pipeline.clustering import cluster_texts
from app.ai_pipeline.labeling import label_clusters
from app.ai_pipeline.experiments.evaluation import evaluate_all

# Configurations
VARIANTS_A = {
    "A1": "indobert",
    "A2": "tfidf",
    "A3": "minilm",
}

VARIANTS_B = {
    "B1": 10,    # UMAP n_components=10
    "B2": None,  # No reduction
}

VARIANT_D = (1, 1)  # D1 unigram


def compute_scaled_hdbscan_params(n: int) -> Dict[str, int]:
    """
    Scale HDBSCAN params proportional to sqrt(n) to keep cluster counts stable.
    Aim: ~5-15 clusters across all n (matching 5 ground-truth categories).
    """
    min_cluster_size = max(3, int(np.sqrt(n)))
    min_samples = max(2, min_cluster_size // 2)
    return {"min_cluster_size": min_cluster_size, "min_samples": min_samples}


def load_dataset(file_path: Path) -> tuple[List[str], List[str], Dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    docs = [d["teks"] for d in data["documents"]]
    y_true = [d["kategori"] for d in data["documents"]]
    return docs, y_true, data.get("metadata", {})


def run_sweep(
    ns: List[int],
    dataset_dir: Path,
    out_dir: Path,
    fresh: bool = False
):
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_rows = []
    
    # Map category names to integer labels for evaluation
    cat_to_id = {
        "ruang_belajar": 0,
        "sanitasi_air": 1,
        "utilitas": 2,
        "akses_lahan": 3,
        "penunjang": 4,
    }

    for n in ns:
        dataset_file = dataset_dir / f"dataset_aug_{n}.json"
        if not dataset_file.exists():
            print(f"[WARN] Dataset {dataset_file} not found, skipping n={n}")
            continue

        hdbscan_params = compute_scaled_hdbscan_params(n)
        print(f"\n{'='*60}\nRunning scale sweep for n = {n} with HDBSCAN params: {hdbscan_params}\n{'='*60}")
        docs, y_true_raw, meta = load_dataset(dataset_file)
        y_true = np.array([cat_to_id.get(c, -1) for c in y_true_raw])

        # Cache embeddings per variant A
        embeddings_cache = {}

        for var_a, method in VARIANTS_A.items():
            print(f"\n[Embed] Running {var_a} ({method}) on {len(docs)} documents...")
            t0 = time.time()
            embeddings = embed_texts(docs, method=method)
            t_embed = time.time() - t0
            embeddings_cache[var_a] = embeddings
            print(f"  Shape: {embeddings.shape}, Time: {t_embed:.2f}s")

            for var_b, n_comp in VARIANTS_B.items():
                run_name = f"{var_a}_{var_b}_Cscaled_D1_n{n}"
                res_file = out_dir / f"{run_name}.json"

                if res_file.exists() and not fresh:
                    print(f"  [SKIP] {run_name} already exists.")
                    with open(res_file, "r") as f:
                        res = json.load(f)
                    summary_rows.append(res["summary"])
                    continue

                t_start = time.time()

                # Dimension reduction
                if n_comp is not None:
                    curr_n_comp = min(n_comp, len(docs) - 2, embeddings.shape[1] - 1)
                    if curr_n_comp >= 2:
                        vectors = reduce_dimensions(embeddings, n_components=curr_n_comp)
                    else:
                        vectors = embeddings
                else:
                    vectors = embeddings

                # Clustering with SCALED params
                labels = cluster_texts(
                    vectors,
                    min_cluster_size=hdbscan_params["min_cluster_size"],
                    min_samples=hdbscan_params["min_samples"]
                )
                n_clusters = len(set(labels)) - (1 if -1 in labels else 0)

                # Labeling
                cluster_meta = label_clusters(docs, labels, ngram_range=VARIANT_D, top_n=5)

                # Metrics
                eval_metrics = evaluate_all(vectors, y_true, labels)

                total_time = time.time() - t_start + t_embed

                summary_data = {
                    "n": n,
                    "variant_a": var_a,
                    "method": method,
                    "variant_b": var_b,
                    "umap": n_comp is not None,
                    "min_cluster_size": hdbscan_params["min_cluster_size"],
                    "min_samples": hdbscan_params["min_samples"],
                    "nmi": round(eval_metrics.get("nmi", 0.0), 4),
                    "ari": round(eval_metrics.get("ari", 0.0), 4),
                    "purity": round(eval_metrics.get("purity", 0.0), 4),
                    "noise_ratio": round(eval_metrics.get("noise_ratio", 0.0), 4),
                    "n_clusters": n_clusters,
                    "runtime_sec": round(total_time, 2)
                }

                summary_rows.append(summary_data)

                # Save detailed JSON
                out_data = {
                    "config": {
                        "n": n,
                        "variant_a": var_a,
                        "variant_b": var_b,
                        "variant_c": "C_scaled",
                        "hdbscan_params": hdbscan_params,
                        "variant_d": "D1"
                    },
                    "metrics": eval_metrics,
                    "n_clusters": n_clusters,
                    "cluster_meta": cluster_meta,
                    "summary": summary_data
                }
                with open(res_file, "w", encoding="utf-8") as f:
                    json.dump(out_data, f, indent=2)

                print(f"  -> {run_name} | NMI: {summary_data['nmi']} | Purity: {summary_data['purity']} | Clusters: {n_clusters} (min_size={hdbscan_params['min_cluster_size']}) | Time: {total_time:.2f}s")

    # Save summary CSV by collecting all json files in out_dir
    csv_file = out_dir / "summary_scale_scaled.csv"
    all_summaries = []
    for json_f in sorted(out_dir.glob("*.json")):
        try:
            with open(json_f, "r", encoding="utf-8") as f:
                d = json.load(f)
                if "summary" in d:
                    all_summaries.append(d["summary"])
        except Exception:
            pass

    if all_summaries:
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            fieldnames = all_summaries[0].keys()
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_summaries)
        print(f"\n[DONE] Saved summary of {len(all_summaries)} runs to {csv_file}")
    else:
        print("\n[WARN] No results found to compile into CSV.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ns", default="45,150,500,1500", help="Comma-separated list of n")
    parser.add_argument("--dataset-dir", type=Path, default=Path(__file__).parent)
    parser.add_argument("--out-dir", type=Path, default=Path(__file__).parent / "results_scale_scaled")
    parser.add_argument("--fresh", action="store_true")
    args = parser.parse_args()

    ns = [int(x.strip()) for x in args.ns.split(",")]
    run_sweep(ns, args.dataset_dir, args.out_dir, args.fresh)


if __name__ == "__main__":
    main()
