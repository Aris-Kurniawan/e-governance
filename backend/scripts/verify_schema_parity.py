"""F4.9 — Verifikasi parity skema: model SQLAlchemy vs database.

Menangkap dua kelas masalah yang pernah terjadi di proyek ini:
1. ENUM drift — model punya nilai yang tidak ada di migrasi/DB
   (kasus F4.9: `klaster.kategori` 5 vs 6 nilai -> fresh install gagal).
2. Kolom hilang — DB ketinggalan migrasi (kasus lama: `Unknown column
   'hasil_klasterisasi'`).

Pemakaian:
  # mode default: uji jalur PRODUKSI sesungguhnya (fresh DB -> alembic upgrade head)
  ./venv/bin/python scripts/verify_schema_parity.py

  # bandingkan DB yang sudah ada (mis. live / dump impor) tanpa migrasi
  ./venv/bin/python scripts/verify_schema_parity.py --db mysql+pymysql://root:dev123@localhost/simakis

Exit code 0 = parity OK; 1 = ada drift (detail dicetak per kolom).
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import uuid
from pathlib import Path

from sqlalchemy import Enum, create_engine, inspect
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.models import Base  # noqa: E402 — daftarkan semua model

TEMP_DB_PREFIX = "simakis_parity_check"


def model_columns():
    """{(tabel, kolom): {"type": tipe_kolom, "enums": [...] | None}}"""
    out = {}
    for table in Base.metadata.tables.values():
        for col in table.columns:
            enums = list(col.type.enums) if isinstance(col.type, Enum) else None
            out[(table.name, col.name)] = {"type": type(col.type).__name__, "enums": enums}
    return out


def db_columns(engine, schema: str | None):
    insp = inspect(engine)
    out = {}
    for table in insp.get_table_names(schema=schema):
        for col in insp.get_columns(table, schema=schema):
            enums = None
            t = col["type"]
            if isinstance(t, Enum) or getattr(t, "enums", None):
                enums = list(getattr(t, "enums", []) or [])
            else:
                # MySQL ENUM dari information_schema via SQLAlchemy terekspresi
                # sebagai sqlalchemy.dialects.mysql.ENUM — punya atribut .enums
                enums = list(t.enums) if hasattr(t, "enums") else None
            out[(table, col["name"])] = {"type": type(t).__name__, "enums": enums}
    return out


def compare(model, db):
    problems = []
    for key, spec in model.items():
        if key not in db:
            problems.append(f"KOLOM MODEL TIDAK ADA DI DB : {key[0]}.{key[1]}")
            continue
        if spec["enums"] is not None:
            db_enums = db[key]["enums"]
            if db_enums is None:
                problems.append(
                    f"DB BUKAN ENUM (model ENUM)   : {key[0]}.{key[1]} model={spec['enums']}"
                )
            elif db_enums != spec["enums"]:
                problems.append(
                    f"ENUM DRIFT                   : {key[0]}.{key[1]}\n"
                    f"    model : {spec['enums']}\n"
                    f"    db    : {db_enums}"
                )
    for key in db:
        if key not in model:
            # alembic_version adalah tabel milik alembic, bukan model aplikasi.
            if key[0] == "alembic_version":
                continue
            problems.append(f"KOLOM DB TIDAK ADA DI MODEL  : {key[0]}.{key[1]}")
    return problems


def fresh_install_check():
    """Bangun DB temp dari nol lewat `alembic upgrade head`, lalu bandingkan."""
    import pymysql
    from sqlalchemy.engine import make_url

    temp_name = f"{TEMP_DB_PREFIX}_{uuid.uuid4().hex[:8]}"
    parsed = make_url(settings.DATABASE_URL)
    temp_url = parsed.set(database=temp_name).render_as_string(hide_password=False)

    admin = pymysql.connect(
        host=parsed.host or "localhost",
        user=parsed.username,
        password=parsed.password or "",
        port=parsed.port or 3306,
    )
    cur = admin.cursor()
    try:
        cur.execute(f"CREATE DATABASE {temp_name} CHARACTER SET utf8mb4")
        print(f"[1/3] DB temp dibuat: {temp_name}")

        env = dict(os.environ, DATABASE_URL=temp_url)
        proc = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=str(Path(__file__).resolve().parent.parent),
            env=env,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            print("[2/3] alembic upgrade head GAGAL:")
            print(proc.stdout[-2000:])
            print(proc.stderr[-2000:])
            return 1
        print("[2/3] alembic upgrade head dari nol → OK")

        engine = create_engine(temp_url)
        problems = compare(model_columns(), db_columns(engine, None))
        engine.dispose()
    finally:
        cur.execute(f"DROP DATABASE IF EXISTS {temp_name}")
        admin.close()
        print(f"[3/3] DB temp {temp_name} di-drop")

    report(problems)
    return 1 if problems else 0


def existing_db_check(url: str):
    engine = create_engine(url)
    schema = engine.url.database
    problems = compare(model_columns(), db_columns(engine, schema))
    engine.dispose()
    report(problems)
    return 1 if problems else 0


def report(problems):
    if not problems:
        n = len(model_columns())
        print(f"PARITY OK — {n} kolom model cocok dengan DB (termasuk semua ENUM).")
        return
    print(f"DRIFT DITEMUKAN ({len(problems)}):")
    for p in problems:
        print(" -", p)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        help="URL DB yang sudah ada untuk dibandingkan (tanpa alembic). "
        "Default: fresh-install check via alembic upgrade head.",
    )
    args = parser.parse_args()
    if args.db:
        return existing_db_check(args.db)
    return fresh_install_check()


if __name__ == "__main__":
    raise SystemExit(main())
