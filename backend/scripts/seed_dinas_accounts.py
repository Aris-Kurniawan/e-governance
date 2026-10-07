"""Seed akun dinas untuk pengembangan & pengujian alur verifikasi.

Jalankan: cd backend && ./venv/bin/python scripts/seed_dinas_accounts.py

Kenapa perlu: endpoint verifikasi/override klaster dibatasi RBAC
(`INTERFACES.md` §5, §7) sehingga hanya peran `verifikator_dinas` dan
`kepala_dinas` yang boleh acting. Basis data pengembangan hanya berisi akun
`admin`, sehingga alur verifikasi tidak dapat diuji tanpa akun peran khusus.

Script ini idempotent — aman dijalankan berulang; akun yang sudah ada dilewati.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import hash_password
from app.core.pdp import simpan_nik
from app.models.user import User

# ─── Akun dev (kredensial ini hanya untuk lingkungan lokal) ──────────────
AKUN = [
    {
        "email": "verifikator@simakis.id",
        "password": "Verifikator123!",
        "nama": "Verifikator Dinas Sarpras",
        "role": "verifikator_dinas",
        "nik": "3524010202020002",
    },
    {
        "email": "kepala.dinas@simakis.id",
        "password": "KepalaDinas123!",
        "nama": "Kepala Dinas Pendidikan Lamongan",
        "role": "kepala_dinas",
        "nik": "3524010303030003",
    },
]


def upsert(db: Session, spec: dict) -> User:
    """Buat akun bila belum ada; perbarui password bila sudah ada."""
    user = db.scalar(select(User).where(User.email == spec["email"]))
    if user:
        user.password_hash = hash_password(spec["password"])
        user.role = spec["role"]
        user.status_verifikasi = "terverifikasi"
        db.commit()
        db.refresh(user)
        print(f"  [UPDATE] {spec['email']} | role: {spec['role']} | password direset")
        return user

    user = User(
        nama=spec["nama"],
        email=spec["email"],
        password_hash=hash_password(spec["password"]),
        role=spec["role"],
        status_verifikasi="terverifikasi",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    simpan_nik(db, user.id, spec["nik"])
    print(f"  [CREATE] {spec['email']} | password: {spec['password']} | role: {spec['role']}")
    return user


def main() -> None:
    print("=" * 62)
    print("SEED AKUN DINAS (verifikator_dinas & kepala_dinas)")
    print("=" * 62)
    print(f"Database: {settings.DATABASE_URL.split('@')[-1]}")

    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        print("\nMembuat/memperbarui akun dinas...")
        for spec in AKUN:
            upsert(db, spec)

        print("\nVerifikasi akun dinas di database:")
        for spec in AKUN:
            row = db.scalar(select(User).where(User.email == spec["email"]))
            if row is None:
                print(f"  [GAGAL] {spec['email']} tidak ditemukan")
            else:
                print(f"  [OK] {row.email:<26} role={row.role:<18} status={row.status_verifikasi}")

    print("\n" + "=" * 62)
    print("SELESAI — login di http://localhost:5173 memakai kredensial di atas,")
    print("atau lewat API: POST /auth/login")
    print("=" * 62)


if __name__ == "__main__":
    main()