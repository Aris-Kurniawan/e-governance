import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, inspect, text

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings

def export_clean_mysql_dump(output_file: str):
    """
    Mengekspor data operasional MySQL SIMAKIS yang siap diimpor ke Cloud MySQL (Aiven / TiDB).
    Mempertahankan data sekolah (62), sarpras (304), klaster (49), laporan contoh (10 terpilih),
    akun dinas & warga, serta mereset log sampah / testing sementara.
    """
    engine = create_engine(settings.DATABASE_URL)

    print(f"[*] Menghubungkan ke database lokal: {settings.DATABASE_URL.split('@')[-1]}")

    tables_order = [
        "users",
        "sekolah",
        "kondisi_sarana",
        "klaster",
        "laporan",
        "pdp_vault"
    ]

    with engine.connect() as conn, open(output_file, "w", encoding="utf-8") as f:
        f.write("-- ========================================================\n")
        f.write("-- DUMP DATA OPERASIONAL SIMAKIS (UNTUK CLOUD DEPLOYMENT)\n")
        f.write("-- Format: Native MySQL 8.x (Aiven / TiDB Cloud Compatible)\n")
        f.write("-- ========================================================\n\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

        for table in tables_order:
            # Batasi laporan contoh agar tidak membawa noise uji coba ekstrem
            query = f"SELECT * FROM `{table}`"
            if table == "laporan":
                # Ambil 50 laporan representatif yang terhubung ke klaster sah
                query = "SELECT * FROM `laporan` WHERE `klaster_id` IS NOT NULL LIMIT 50"
            elif table == "klaster":
                query = "SELECT * FROM `klaster` LIMIT 49"

            res = conn.execute(text(query)).mappings().all()
            print(f"  - Tabel `{table}`: {len(res)} baris disiapkan")

            if not res:
                continue

            f.write(f"-- Data untuk tabel: {table} ({len(res)} baris)\n")
            cols = list(res[0].keys())
            cols_str = ", ".join([f"`{c}`" for c in cols])

            for row in res:
                vals = []
                for c in cols:
                    val = row[c]
                    if val is None:
                        vals.append("NULL")
                    elif isinstance(val, (int, float)):
                        vals.append(str(val))
                    elif isinstance(val, bool):
                        vals.append("1" if val else "0")
                    elif isinstance(val, bytes):
                        vals.append(f"X'{val.hex()}'")
                    elif isinstance(val, (dict, list)):
                        import json
                        escaped = json.dumps(val).replace("\\", "\\\\").replace("'", "\\'")
                        vals.append(f"'{escaped}'")
                    else:
                        escaped = str(val).replace("\\", "\\\\").replace("'", "\\'")
                        vals.append(f"'{escaped}'")

                f.write(f"INSERT INTO `{table}` ({cols_str}) VALUES ({', '.join(vals)}) ON DUPLICATE KEY UPDATE `{cols[0]}`=`{cols[0]}`;\n")
            f.write("\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

    print(f"\n[+] Dump SQL siap pakai berhasil dibuat di: {output_file}")

if __name__ == "__main__":
    out_path = os.path.join(BACKEND_DIR, "scripts", "simakis_clean_mysql_cloud.sql")
    export_clean_mysql_dump(out_path)
