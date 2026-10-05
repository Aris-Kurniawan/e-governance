"""F3.6 — Cron Script: Run AI clustering job on unclustered laporan per school.

Jalankan: cd backend && ./venv/bin/python scripts/run_clustering.py

Atau tambah ke crontab:
  0 2 * * * cd /path/to/e-goverment/backend && ./venv/bin/python scripts/run_clustering.py >> logs/clustering.log 2>&1
"""

import sys
from datetime import datetime
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.laporan import Laporan
from app.models.klaster import Klaster
from app.models.sekolah import Sekolah
from app.ai_pipeline.pipeline import default_pipeline
from app.ai_pipeline.scoring import calculate_priority_score


def get_unclustered_laporan_by_school(db: Session) -> dict[str, list[Laporan]]:
    """
    Group unclustered laporan (klaster_id IS NULL) by sekolah_npsn.
    
    Returns: { sekolah_npsn: [Laporan, ...], ... }
    """
    stmt = select(Laporan).where(Laporan.klaster_id.is_(None))
    laporan_list = db.execute(stmt).scalars().all()
    
    grouped = {}
    for lap in laporan_list:
        if lap.sekolah_npsn not in grouped:
            grouped[lap.sekolah_npsn] = []
        grouped[lap.sekolah_npsn].append(lap)
    
    return grouped


def run_clustering_job():
    """Main clustering cron job.
    
    FIX (Factor 1): Per-school transaction scoping.
    - Commit after each school succeeds → rollback only affects current school
    - Failed schools are retried in next cron run
    """
    db = SessionLocal()
    start_time = datetime.now()
    total_klaster_created = 0
    
    try:
        print(f"[{start_time}] Starting clustering job...")
        
        grouped = get_unclustered_laporan_by_school(db)
        
        if not grouped:
            print(f"[{datetime.now()}] No unclustered laporan. Exiting.")
            return
        
        total_laporan = sum(len(laps) for laps in grouped.values())
        print(f"[{datetime.now()}] Found {total_laporan} unclustered laporan across {len(grouped)} schools.")
        
        # Process each school
        for sekolah_npsn, laporan_list in grouped.items():
            print(f"\n[{datetime.now()}] Processing {sekolah_npsn}: {len(laporan_list)} laporan...")
            
            # Extract texts WITH index tracking (FIX: prevent index misalignment)
            texts_with_idx = [(i, lap.deskripsi) for i, lap in enumerate(laporan_list) 
                              if lap.deskripsi]
            texts = [t for _, t in texts_with_idx]
            
            if not texts:
                print(f"  ⚠️  No valid text to cluster for {sekolah_npsn}. Skipping.")
                continue
            
            # Run pipeline
            try:
                result = default_pipeline.run(texts)
                labels = result["labels"]
                cluster_meta = result["cluster_meta"]
                n_clusters = result["n_clusters"]
                noise_count = result["noise_count"]
                
                print(f"  ✓ Pipeline complete: {n_clusters} clusters, {noise_count} noise.")
                
                # Map laporan index to cluster_id (using text_idx, not raw idx)
                klaster_map = {}  # { cluster_id: [Laporan, ...] }
                
                for text_idx, (lap_idx, _) in enumerate(texts_with_idx):
                    cluster_id = int(labels[text_idx])
                    if cluster_id not in klaster_map:
                        klaster_map[cluster_id] = []
                    klaster_map[cluster_id].append(laporan_list[lap_idx])
                
                # Create Klaster records
                for cluster_id_int, laps_in_cluster in klaster_map.items():
                    cluster_id_str = str(cluster_id_int)
                    meta = cluster_meta.get(cluster_id_str, {})
                    label_teks = meta.get("label_teks", "")
                    kategori = meta.get("kategori", "belum_terklasifikasi")
                    
                    # Handle noise cluster (-1)
                    if cluster_id_int == -1:
                        label_teks = "Belum Terklasifikasi"
                        kategori = "belum_terklasifikasi"
                    
                    # Calculate scores
                    kondisi_laporan = [
                        {"kondisi_dilaporkan": lap.kondisi_dilaporkan or "baik"}
                        for lap in laps_in_cluster
                    ]
                    
                    # Get kondisi_sarana for this school
                    from app.models.sekolah import KondisiSarana
                    stmt_sarana = select(KondisiSarana).where(
                        KondisiSarana.sekolah_npsn == sekolah_npsn
                    )
                    sarana_list = db.execute(stmt_sarana).scalars().all()
                    
                    kondisi_dapodik = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}
                    for sarana in sarana_list:
                        kondisi_dapodik["total"] += sarana.jumlah or 0
                        kondisi_dapodik["berat"] += sarana.kondisi_rusak_berat or 0
                        kondisi_dapodik["sedang"] += sarana.kondisi_rusak_sedang or 0
                        kondisi_dapodik["ringan"] += sarana.kondisi_rusak_ringan or 0
                    
                    votes_count = len(laps_in_cluster)  # Each report = 1 vote weight (simplified)
                    
                    skor_prioritas = calculate_priority_score(
                        kondisi_laporan=kondisi_laporan,
                        kondisi_dapodik=kondisi_dapodik,
                        votes=votes_count,
                    )
                    
                    skor_keparahan = skor_prioritas - votes_count  # Back-calculate
                    
                    # Create Klaster
                    klaster = Klaster(
                        label=label_teks if label_teks else None,
                        kategori=kategori,
                        sekolah_npsn=sekolah_npsn,
                        skor_keparahan=Decimal(str(skor_keparahan)),
                        jumlah_vote_terhitung=votes_count,
                        skor_prioritas=Decimal(str(skor_prioritas)),
                        status_verifikasi="menunggu_verifikasi",
                    )
                    db.add(klaster)
                    db.flush()  # Get klaster.id
                    
                    # Update laporan.klaster_id
                    for lap in laps_in_cluster:
                        lap.klaster_id = klaster.id
                    
                    total_klaster_created += 1
                    print(f"  ✓ Created klaster {klaster.id}: {kategori} ({len(laps_in_cluster)} laporan)")
                
                # FIX (Factor 1): Commit per sekolah — rollback only affects this school
                db.commit()
                
            except Exception as e:
                print(f"  ✗ Error processing {sekolah_npsn}: {e}")
                db.rollback()  # ← Only this school is lost; next school proceeds normally
                continue
        
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n[{datetime.now()}] ✓ Clustering job complete!")
        print(f"  Created {total_klaster_created} klaster in {elapsed:.1f}s")
        
    except Exception as e:
        print(f"[{datetime.now()}] ✗ Job failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_clustering_job()
