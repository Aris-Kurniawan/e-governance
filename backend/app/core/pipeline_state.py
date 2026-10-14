"""F4.10 (DBG-004) — State file pipeline clustering.

Catat kapan terakhir kali pipeline clustering dijalankan (cron script
atau trigger API) agar GET /ai/status melaporkan `last_run` nyata,
bukan string hardcoded.

File: backend/pipeline_state.json — runtime state, di-gitignore.
"""

import json
from datetime import datetime
from pathlib import Path

# backend/app/core/pipeline_state.py -> parents[2] = backend/
STATE_FILE = Path(__file__).resolve().parents[2] / "pipeline_state.json"

_EMPTY = {
    "last_run": None,
    "source": None,
    "status": None,
    "klaster_created": None,
    "message": None,
}


def record_pipeline_run(
    source: str, status: str, klaster_created: int, message: str
) -> None:
    """Tulis state run terakhir. Gagal tulis TIDAK boleh menjatuhkan pipeline."""
    payload = {
        "last_run": datetime.now().isoformat(timespec="seconds"),
        "source": source,  # "script" (cron/manual) | "api" (POST /ai/cluster)
        "status": status,  # "ok" | "error"
        "klaster_created": klaster_created,
        "message": message,
    }
    try:
        STATE_FILE.write_text(
            json.dumps(payload, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        pass


def read_pipeline_run() -> dict:
    """Baca state run terakhir; file hilang/rusak -> semua None."""
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return dict(_EMPTY)
        return {**_EMPTY, **data}
    except (OSError, json.JSONDecodeError):
        return dict(_EMPTY)
