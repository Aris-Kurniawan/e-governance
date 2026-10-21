"""F4.16 — Pelabelan severity 600 laporan dengan LLM (SPEC §17.1).

Aturan yang dipatuhi:
- satu laporan = satu permintaan
- prompt memuat 4 definisi tingkat Kemendikbud
- minta alasan singkat
- output terkunci ke 4 nilai enum
- catat nama + versi model

Pemakaian:
  export LLM_API_KEY=...
  export LLM_MODEL=gpt-4o-mini            # atau model provider Anda
  export LLM_BASE_URL=https://api.openai.com/v1
  cd backend && ./venv/bin/python scripts/label_severity_llm.py

Resume otomatis: ID yang sudah ada di `--out` dilewati. Hasil JSONL ditulis
append per baris, jadi aman dihentikan kapan saja.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_pipeline.severity import DEFINISI, LEVELS  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.laporan import Laporan  # noqa: E402

PROMPT_VERSION = "severity-llm-v1"
DEFAULT_OUT = (
    Path(__file__).resolve().parent.parent
    / "app"
    / "dataset"
    / "severity"
    / "labels_llm.jsonl"
)

SYSTEM_PROMPT = """Anda ahli penilaian kerusakan bangunan sekolah dasar/menengah di Indonesia.
Tugas: tentukan SATU tingkat kerusakan yang paling didukung oleh deskripsi laporan warga.

Gunakan definisi resmi berikut (jangan memakai ambang sendiri):
- baik: {baik}
- rusak_ringan: {rusak_ringan}
- rusak_sedang: {rusak_sedang}
- rusak_berat: {rusak_berat}

Aturan:
1. Pilih tepat satu nilai: baik, rusak_ringan, rusak_sedang, atau rusak_berat.
2. Jangan mengarang kerusakan yang tidak disebut.
3. Bila deskripsi hanya menyebut kekurangan fasilitas tanpa tingkat kerusakan fisik,
   pilih tingkat paling ringan yang masih didukung teks.
4. Jawab HANYA JSON valid: {{"kondisi": "...", "alasan": "..."}}.
""".format(**DEFINISI)


def muat_sudah_ada(path: Path) -> set[str]:
    if not path.exists():
        return set()
    selesai: set[str] = set()
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                selesai.add(json.loads(line)["id"])
            except (json.JSONDecodeError, KeyError):
                continue
    return selesai


def _parse_kondisi(content: str) -> dict:
    """Ambil JSON dari jawaban model, termasuk bila dibungkus ```json."""
    teks = content.strip()
    if teks.startswith("```"):
        teks = teks.split("```")[1]
        teks = teks.removeprefix("json").strip()
    try:
        data = json.loads(teks)
    except json.JSONDecodeError:
        awal, akhir = teks.find("{"), teks.rfind("}")
        if awal < 0 or akhir <= awal:
            raise
        data = json.loads(teks[awal : akhir + 1])
    kondisi = str(data.get("kondisi", "")).strip().lower().replace(" ", "_")
    if kondisi not in LEVELS:
        raise ValueError(f"Label di luar enum: {kondisi!r}")
    return {"kondisi": kondisi, "alasan": str(data.get("alasan", ""))[:500]}


def _respons_json(resp: httpx.Response) -> dict:
    """Proxy ini mengembalikan JSON + ``data: [DONE]`` (text/event-stream)."""
    teks = resp.text.strip()
    if "data: [DONE]" in teks:
        kepala = teks.split("data: [DONE]")[0].strip()
        try:
            return json.loads(kepala)
        except json.JSONDecodeError:
            teks = kepala
    try:
        return json.loads(teks)
    except json.JSONDecodeError:
        pass
    for line in teks.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        payload = line.removeprefix("data:").strip()
        if payload in ("", "[DONE]"):
            continue
        data = json.loads(payload)
        if data.get("choices"):
            return data
    raise ValueError("Respons LLM tidak berisi choices")


def panggil_llm(
    client: httpx.Client,
    base_url: str,
    api_key: str,
    model: str,
    deskripsi: str,
    retries: int = 4,
) -> dict:
    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Deskripsi laporan:\n{deskripsi}\n\nKembalikan JSON.",
            },
        ],
    }
    terakhir: Exception | None = None
    for percobaan in range(retries):
        try:
            resp = client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            if resp.status_code in (429, 500, 502, 503, 504):
                raise httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp
                )
            resp.raise_for_status()
            content = _respons_json(resp)["choices"][0]["message"]["content"]
            return _parse_kondisi(content)
        except Exception as exc:  # noqa: BLE001 — retry semua error sementara
            terakhir = exc
            time.sleep(1.5 * (percobaan + 1))
    raise RuntimeError(f"Gagal setelah {retries} percobaan: {terakhir}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--delay", type=float, default=0.2)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    api_key = os.getenv("LLM_API_KEY", "")
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("LLM_MODEL", "")
    if not args.dry_run and (not api_key or not model):
        raise SystemExit("LLM_API_KEY dan LLM_MODEL wajib di-set (atau pakai --dry-run)")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    selesai = muat_sudah_ada(args.out)

    db = SessionLocal()
    try:
        laporan = db.execute(select(Laporan).order_by(Laporan.id)).scalars().all()
    finally:
        db.close()

    belum = [lap for lap in laporan if lap.id not in selesai]
    if args.limit:
        belum = belum[: args.limit]
    print(f"Total {len(laporan)} laporan · sudah {len(selesai)} · akan diproses {len(belum)}")

    if args.dry_run:
        for lap in belum[:5]:
            print(f"- {lap.id}: {lap.deskripsi[:100]}")
        print(f"Model: {model or '(belum di-set)'} · prompt {PROMPT_VERSION}")
        return

    with args.out.open("a", encoding="utf-8") as out, httpx.Client(timeout=90) as client:
        for i, lap in enumerate(belum, 1):
            hasil = panggil_llm(client, base_url, api_key, model, lap.deskripsi)
            record = {
                "id": lap.id,
                "deskripsi": lap.deskripsi,
                "kondisi": hasil["kondisi"],
                "alasan": hasil["alasan"],
                "model": model,
                "prompt_version": PROMPT_VERSION,
                "labeled_at": datetime.now(timezone.utc).isoformat(),
            }
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
            out.flush()
            print(f"[{i}/{len(belum)}] {lap.id} → {hasil['kondisi']}")
            time.sleep(args.delay)


if __name__ == "__main__":
    main()
