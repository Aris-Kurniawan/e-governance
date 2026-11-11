import os
import sys
import subprocess
from pathlib import Path
from sqlalchemy import create_engine, inspect, text

# Pastikan import model SIMAKIS
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings

def dump_mysql_data(output_file: str):
    """
    Mengekstrak data dari MySQL lokal ke format SQL INSERT statements yang kompatibel dengan PostgreSQL.
    """
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    # Urutan tabel disesuaikan dengan foreign key dependencies
    tables_order = [
        "users",
        "sekolah",
        "kondisi_sarana",
        "klaster",
        "laporan",
        "status_log",
        "laporan_status_log",
        "vote",
        "sanggahan",
        "audit_log",
        "pdp_vault",
        "ingest_log"
    ]

    existing_tables = inspector.get_table_names()
    ordered_tables = [t for t in tables_order if t in existing_tables]
    # Tambahkan tabel lain jika ada yang terlewat
    for t in existing_tables:
        if t not in ordered_tables and t != "alembic_version":
            ordered_tables.append(t)

    print(f"[*] Mengekstrak data dari {len(ordered_tables)} tabel...")

    with engine.connect() as conn, open(output_file, "w", encoding="utf-8") as f:
        f.write("-- DUMP DATA SIMAKIS: MySQL -> PostgreSQL (Supabase)\n")
        f.write("SET session_replication_role = 'replica'; -- Nonaktifkan sementara FK check\n\n")

        for table in ordered_tables:
            res = conn.execute(text(f"SELECT * FROM `{table}`")).mappings().all()
            print(f"  - Tabel {table}: {len(res)} baris")
            if not res:
                continue

            f.write(f"-- Data untuk tabel: {table}\n")
            cols = list(res[0].keys())
            cols_str = ", ".join([f'"{c}"' for c in cols])

            for row in res:
                vals = []
                for c in cols:
                    val = row[c]
                    if val is None:
                        vals.append("NULL")
                    elif isinstance(val, (int, float)):
                        vals.append(str(val))
                    elif isinstance(val, bool):
                        vals.append("TRUE" if val else "FALSE")
                    elif isinstance(val, bytes):
                        # Hex format untuk byte/binary (misal password/pdp)
                        vals.append(f"'\\x{val.hex()}'")
                    elif isinstance(val, dict) or isinstance(val, list):
                        import json
                        escaped = json.dumps(val).replace("'", "''")
                        vals.append(f"'{escaped}'")
                    else:
                        escaped = str(val).replace("'", "''")
                        vals.append(f"'{escaped}'")

                f.write(f"INSERT INTO \"{table}\" ({cols_str}) VALUES ({', '.join(vals)}) ON CONFLICT DO NOTHING;\n")
            f.write("\n")

        f.write("SET session_replication_role = 'default'; -- Aktifkan kembali FK check\n")

    print(f"[+] Dump data sukses disimpan di: {output_file}")

if __name__ == "__main__":
    out = os.path.join(BACKEND_DIR, "scripts", "dump_data_for_supabase.sql")
    dump_mysql_data(out)
