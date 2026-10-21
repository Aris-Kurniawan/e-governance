"""F4.16 — Ablation klasifikasi severity K1–K4.

Metrik: akurasi, macro-F1, confusion matrix (SPEC §10). Dievaluasi pada
test set 50 laporan yang **diperiksa manual**, bukan label seed dev.

Pemakaian:
  # setelah test_50.csv diisi kolom label_manual
  cd backend && ./venv/bin/python scripts/severity_ablation.py --labels manual

  # evaluasi K4 (IndoBERT hasil fine-tuning)
  ... --indobert-model app/dataset/severity/models/indobert

K2/K3 dilatih dari train_550.jsonl (label LLM). K1 tidak dilatih.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.pipeline import make_pipeline
from sklearn.svm import LinearSVC

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_pipeline.severity import LEVELS, classify_severity  # noqa: E402

DEFAULT_DIR = (
    Path(__file__).resolve().parent.parent / "app" / "dataset" / "severity"
)


def baca_train(path: Path) -> tuple[list[str], list[str]]:
    teks: list[str] = []
    label: list[str] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            teks.append(row["deskripsi"])
            label.append(row["kondisi"])
    return teks, label


def baca_test(path: Path, sumber: str) -> tuple[list[str], list[str]]:
    teks: list[str] = []
    label: list[str] = []
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            nilai = (row.get("label_manual") or "").strip()
            if sumber == "llm":
                nilai = row["label_llm"]
            if not nilai:
                raise SystemExit(
                    "Masih ada label_manual kosong. Isi 50 baris dulu, atau "
                    "pakai --labels llm untuk angka SEMENTARA."
                )
            if nilai not in LEVELS:
                raise SystemExit(f"Label tidak valid: {nilai!r} ({row['id']})")
            teks.append(row["deskripsi"])
            label.append(nilai)
    return teks, label


def metrik(y_true: list[str], y_pred: list[str]) -> dict:
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(
            float(
                f1_score(
                    y_true,
                    y_pred,
                    labels=list(LEVELS),
                    average="macro",
                    zero_division=0,
                )
            ),
            4,
        ),
        "confusion_matrix": confusion_matrix(
            y_true, y_pred, labels=list(LEVELS)
        ).tolist(),
        "labels": list(LEVELS),
    }


def prediksi_k4(model_dir: Path, teks: list[str]) -> list[str]:
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    id2label = {int(k): v for k, v in model.config.id2label.items()}
    hasil: list[str] = []
    with torch.no_grad():
        for i in range(0, len(teks), 16):
            batch = teks[i : i + 16]
            enc = tokenizer(
                batch, padding=True, truncation=True, max_length=256, return_tensors="pt"
            )
            logits = model(**enc).logits
            for idx in logits.argmax(dim=-1).tolist():
                hasil.append(id2label[int(idx)])
    return hasil


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=Path, default=DEFAULT_DIR / "train_550.jsonl")
    parser.add_argument("--test", type=Path, default=DEFAULT_DIR / "test_50.csv")
    parser.add_argument("--labels", choices=["manual", "llm"], default="manual")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_DIR / "hasil")
    parser.add_argument("--indobert-model", type=Path, default=None)
    args = parser.parse_args()

    x_train, y_train = baca_train(args.train)
    x_test, y_test = baca_test(args.test, args.labels)

    hasil: dict[str, dict] = {
        "K1_aturan_kata_kunci": metrik(y_test, classify_severity(x_test)),
    }

    k2 = make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True),
        LogisticRegression(max_iter=2000, class_weight="balanced"),
    )
    k2.fit(x_train, y_train)
    hasil["K2_tfidf_logreg"] = metrik(y_test, list(k2.predict(x_test)))

    k3 = make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True),
        LinearSVC(class_weight="balanced"),
    )
    k3.fit(x_train, y_train)
    hasil["K3_tfidf_svm"] = metrik(y_test, list(k3.predict(x_test)))

    if args.indobert_model:
        hasil["K4_indobert"] = metrik(
            y_test, prediksi_k4(args.indobert_model, x_test)
        )

    args.out_dir.mkdir(parents=True, exist_ok=True)
    sumber = "manual" if args.labels == "manual" else "LLM_SEMENTARA"
    (args.out_dir / "ablation_severity.json").write_text(
        json.dumps({"sumber_test": sumber, "n_test": len(y_test), "hasil": hasil}, indent=2),
        encoding="utf-8",
    )

    lines = [
        f"# Ablation Severity (test {len(y_test)} · label {sumber})",
        "",
        "| Varian | Akurasi | Macro-F1 |",
        "|---|---|---|",
    ]
    for nama, nilai in hasil.items():
        lines.append(f"| {nama} | {nilai['accuracy']:.2%} | {nilai['macro_f1']:.4f} |")
    lines.append("")
    for nama, nilai in hasil.items():
        lines.append(f"## {nama} — confusion matrix")
        lines.append("```")
        lines.append("true\\pred " + " ".join(f"{l:>13}" for l in LEVELS))
        for label, row in zip(LEVELS, nilai["confusion_matrix"]):
            lines.append(f"{label:>13} " + " ".join(f"{v:>13}" for v in row))
        lines.append("```")
        lines.append("")
    (args.out_dir / "ablation_severity.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:12]))
    print(f"\nDisimpan: {args.out_dir / 'ablation_severity.json'}")


if __name__ == "__main__":
    main()
