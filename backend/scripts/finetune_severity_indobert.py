"""F4.16 — K4: fine-tuning IndoBERT untuk klasifikasi severity.

Dijalankan SETELAH `train_550.jsonl` ada (label LLM) dan test manual siap.
Skrip ini tidak dijalankan otomatis oleh cron.

  cd backend && ./venv/bin/python scripts/finetune_severity_indobert.py \
      --out app/dataset/severity/models/indobert

Butuh ~GPU/CPU lama + unduhan model dasar. Evaluasi akhir tetap memakai
`severity_ablation.py --indobert-model ... --labels manual`.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, f1_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_pipeline.severity import LEVELS  # noqa: E402

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "app" / "dataset" / "severity"


def baca_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=Path, default=DEFAULT_DIR / "train_550.jsonl")
    parser.add_argument("--base-model", default="indobenchmark/indobert-base-p1")
    parser.add_argument("--out", type=Path, default=DEFAULT_DIR / "models" / "indobert")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--grad-accum", type=int, default=1)
    parser.add_argument("--max-length", type=int, default=192)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--bf16", action="store_true", help="GPU Ampere+ (lebih stabil dari fp16)")
    args = parser.parse_args()

    import torch
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        Trainer,
        TrainingArguments,
    )

    if args.bf16 and not torch.cuda.is_bf16_supported():
        raise SystemExit("GPU tidak mendukung bf16; pakai fp16/default")
    print(
        "Device:",
        torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "| bf16:", torch.cuda.is_bf16_supported() if torch.cuda.is_available() else False,
    )

    label2id = {label: i for i, label in enumerate(LEVELS)}
    id2label = {i: label for label, i in label2id.items()}
    rows = baca_jsonl(args.train)
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=len(LEVELS),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,
    )

    class SeverityDataset(torch.utils.data.Dataset):
        def __init__(self, items: list[dict]):
            self.enc = tokenizer(
                [r["deskripsi"] for r in items],
                truncation=True,
                max_length=args.max_length,
                padding="max_length",
            )
            self.labels = [label2id[r["kondisi"]] for r in items]

        def __len__(self) -> int:
            return len(self.labels)

        def __getitem__(self, idx: int) -> dict:
            item = {k: torch.tensor(v[idx]) for k, v in self.enc.items()}
            item["labels"] = torch.tensor(self.labels[idx])
            return item

    acak = random.Random(42)
    indeks = list(range(len(rows)))
    acak.shuffle(indeks)
    n_eval = max(1, int(len(rows) * 0.1))
    eval_idx = set(indeks[:n_eval])
    train_items = [r for i, r in enumerate(rows) if i not in eval_idx]
    eval_items = [r for i, r in enumerate(rows) if i in eval_idx]

    from collections import Counter

    jumlah = Counter(label2id[r["kondisi"]] for r in train_items)
    bobot = torch.tensor(
        [len(train_items) / (len(LEVELS) * jumlah.get(i, 1)) for i in range(len(LEVELS))],
        dtype=torch.float,
    )

    class WeightedTrainer(Trainer):
        def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
            labels = inputs.pop("labels")
            outputs = model(**inputs)
            loss = torch.nn.functional.cross_entropy(
                outputs.logits, labels, weight=bobot.to(outputs.logits.device)
            )
            return (loss, outputs) if return_outputs else loss

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        pred = np.argmax(logits, axis=-1)
        return {
            "accuracy": accuracy_score(labels, pred),
            "macro_f1": f1_score(labels, pred, average="macro", zero_division=0),
        }

    training = TrainingArguments(
        output_dir=str(args.out / "_checkpoints"),
        eval_strategy="epoch",
        save_strategy="no",
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        logging_steps=20,
        report_to=[],
        fp16=torch.cuda.is_available() and not args.bf16,
        bf16=args.bf16,
        dataloader_num_workers=0,
    )
    trainer = WeightedTrainer(
        model=model,
        args=training,
        train_dataset=SeverityDataset(train_items),
        eval_dataset=SeverityDataset(eval_items),
        compute_metrics=compute_metrics,
    )
    trainer.train()
    print(trainer.evaluate())

    args.out.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(args.out))
    tokenizer.save_pretrained(str(args.out))
    print(f"Model disimpan: {args.out}")


if __name__ == "__main__":
    main()
