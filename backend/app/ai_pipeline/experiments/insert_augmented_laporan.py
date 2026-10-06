#!/usr/bin/env python3
"""
Insert augmented laporan (dataset_aug_n.json) into database.
Assigns each laporan to a random sekolah (NPSN) from existing 62.
"""
import sys
import json
import random
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.sekolah import Sekolah
from app.models.laporan import Laporan
from app.models.user import User
from datetime import datetime

# kondisi enum values
KONDISI_ENUM = ["baik", "rusak_ringan", "rusak_sedang", "rusak_berat"]

def insert_augmented(n=500, seed=42):
    dataset_path = Path(__file__).parent / f"dataset_aug_{n}.json"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    with Session(engine) as session:
        # Get all sekolah NPSN
        sekolah_ids = session.scalars(select(Sekolah.npsn)).all()
        if not sekolah_ids:
            raise ValueError("No sekolah found in DB. Run F4.0 re-seed first.")
        
        # Get admin user ID (for created_by)
        admin = session.scalar(select(User).where(User.email == "admin@simakis.id"))
        if not admin:
            admin = session.scalar(select(User).where(User.role == "admin"))
        admin_id = admin.id if admin else None
        
        random.seed(seed)
        batch = []
        for i, doc in enumerate(data["documents"]):
            npsn = random.choice(sekolah_ids)
            laporan = Laporan(
                id=str(uuid.uuid4()),
                tracking_id=f"TRK-AUG-{n}-{i:04d}",
                user_id=admin_id,
                sekolah_npsn=npsn,
                fasilitas_terkait="Fasilitas Umum",
                kondisi_dilaporkan=random.choice(KONDISI_ENUM),
                deskripsi=doc["teks"],
                created_at=datetime.now(),
                klaster_id=None
            )
            batch.append(laporan)
            if len(batch) >= 100:
                session.add_all(batch)
                session.commit()
                batch.clear()
        if batch:
            session.add_all(batch)
            session.commit()
        
        # Verify count
        from sqlalchemy import func
        total = session.scalar(select(func.count()).select_from(Laporan))
        print(f"Inserted {len(data['documents'])} augmented laporan.")
        print(f"Total laporan in DB now: {total}")

if __name__ == "__main__":
    import sys
    import sqlalchemy
    
    try:
        insert_augmented(500)
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)