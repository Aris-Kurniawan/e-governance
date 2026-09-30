"""F3.8, F3.9, F3.10 — AI Clustering & Klaster Verification Endpoints."""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, RoleChecker
from app.core.database import get_db
from app.models.user import User
from app.models.klaster import Klaster, StatusLog
from app.models.laporan import Laporan
from app.models.sekolah import KondisiSarana
from app.ai_pipeline.pipeline import default_pipeline
from app.ai_pipeline.scoring import calculate_priority_score
from app.ai_pipeline.pipeline import default_pipeline
from app.ai_pipeline.scoring import calculate_priority_score


router = APIRouter(prefix="/ai", tags=["ai"])
verifikasi_router = APIRouter(prefix="/klaster", tags=["klaster"])


require_admin_verifikator = RoleChecker(["admin", "verifikator_dinas"])
require_verifikator = RoleChecker(["verifikator_dinas"])


# ─────────────────────────────────────────────────────────────────────────────
# F3.8 — POST /ai/cluster (Manual Clustering Trigger)
# ─────────────────────────────────────────────────────────────────────────────

def run_clustering_sync(db: Session, force_reprocess: bool = False):
    """Inline clustering logic (copied from scripts/run_clustering.py)."""
    if force_reprocess:
        stmt = select(Laporan)
        for lap in db.execute(stmt).scalars():
            lap.klaster_id = None
        db.commit()
    
    stmt = select(Laporan).where(Laporan.klaster_id.is_(None))
    laporan_list = db.execute(stmt).scalars().all()
    
    grouped = {}
    for lap in laporan_list:
        if lap.sekolah_npsn not in grouped:
            grouped[lap.sekolah_npsn] = []
        grouped[lap.sekolah_npsn].append(lap)
    
    total_created = 0
    
    for sekolah_npsn, laps in grouped.items():
        texts = [lap.deskripsi for lap in laps if lap.deskripsi]
        if not texts:
            continue
        
        result = default_pipeline.run(texts)
        labels = result["labels"]
        cluster_meta = result["cluster_meta"]
        
        klaster_map = {}
        for idx, lap in enumerate(laps):
            if lap.deskripsi:
                cluster_id = int(labels[idx])
                if cluster_id not in klaster_map:
                    klaster_map[cluster_id] = []
                klaster_map[cluster_id].append(lap)
        
        for cluster_id_int, laps_in_cluster in klaster_map.items():
            cluster_id_str = str(cluster_id_int)
            meta = cluster_meta.get(cluster_id_str, {})
            label_teks = meta.get("label_teks", "")
            kategori = meta.get("kategori", "belum_terklasifikasi")
            
            if cluster_id_int == -1:
                label_teks = "Belum Terklasifikasi"
                kategori = "belum_terklasifikasi"
            
            kondisi_laporan = [
                {"kondisi_dilaporkan": lap.kondisi_dilaporkan or "baik"}
                for lap in laps_in_cluster
            ]
            
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
            
            votes_count = len(laps_in_cluster)
            skor_prioritas = calculate_priority_score(
                kondisi_laporan=kondisi_laporan,
                kondisi_dapodik=kondisi_dapodik,
                votes=votes_count,
            )
            skor_keparahan = skor_prioritas - votes_count
            
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
            db.flush()
            
            for lap in laps_in_cluster:
                lap.klaster_id = klaster.id
            
            total_created += 1
    
    db.commit()
    return total_created


@router.post("/cluster")
async def trigger_clustering(
    force_reprocess: bool = False,
    _: User = Depends(require_admin_verifikator),
    db: Session = Depends(get_db),
):
    """F3.8 — Trigger clustering job (manual/fallback)."""
    try:
        total = run_clustering_sync(db, force_reprocess=force_reprocess)
        return {
            "success": True,
            "message": f"Clustering triggered. Created {total} klaster.",
            "data": {"klaster_created": total}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# F3.9 — GET /ai/status (Pipeline Status)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_clustering_status(
    _: User = Depends(require_admin_verifikator),
    db: Session = Depends(get_db),
):
    """F3.9 — Get pipeline status (last run, unclustered count)."""
    stmt = select(func.count()).select_from(select(Laporan).where(Laporan.klaster_id.is_(None)).subquery())
    unclustered = db.scalar(stmt) or 0
    
    stmt_klaster = select(func.count()).select_from(Klaster)
    total_klaster = db.scalar(stmt_klaster) or 0
    
    return {
        "success": True,
        "message": "Pipeline status",
        "data": {
            "unclustered_laporan": unclustered,
            "total_klaster": total_klaster,
            "last_run": "N/A (no cron log yet)",
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# F3.10 — PUT /klaster/{id}/verifikasi (Cluster Verification)
# ─────────────────────────────────────────────────────────────────────────────

@verifikasi_router.put("/{klaster_id}/verifikasi")
async def verify_klaster(
    klaster_id: str,
    status: str,
    alasan: str | None = None,
    current_user: User = Depends(require_verifikator),
    db: Session = Depends(get_db),
):
    """
    F3.10 — Verifikasi klaster oleh verifikator_dinas.
    
    Status: "terverifikasi" | "tidak_terverifikasi" | "perlu_info_tambahan"
    Alasan wajib jika status != "terverifikasi"
    """
    valid_status = ["terverifikasi", "tidak_terverifikasi", "perlu_info_tambahan"]
    if status not in valid_status:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_status}")
    
    if status != "terverifikasi" and not alasan:
        raise HTTPException(status_code=400, detail="alasan wajib jika status != terverifikasi")
    
    stmt = select(Klaster).where(Klaster.id == klaster_id)
    klaster = db.execute(stmt).scalar()
    
    if not klaster:
        raise HTTPException(status_code=404, detail="Klaster not found")
    
    klaster.status_verifikasi = status
    klaster.updated_at = datetime.now()
    db.add(klaster)
    
    status_log = StatusLog(
        klaster_id=klaster_id,
        status=status,
        alasan=alasan,
        actor_user_id=current_user.id,
    )
    db.add(status_log)
    db.commit()
    
    return {
        "success": True,
        "message": f"Klaster {klaster_id} verified with status {status}",
        "data": {"klaster_id": klaster_id, "status": status}
    }


# F3.17 - Update Status
require_verif_kepala = RoleChecker(["verifikator_dinas", "kepala_dinas"])


@verifikasi_router.post("/{klaster_id}/status")
async def update_status(
    klaster_id: str,
    status: str,
    alasan: str | None = None,
    current_user: User = Depends(require_verif_kepala),
    db: Session = Depends(get_db),
):
    """F3.17 — Update Status."""
    valid_status = [
        "menunggu_verifikasi", "perlu_info_tambahan", "tidak_terverifikasi",
        "terverifikasi", "dalam_antrian_prioritas", "dalam_proses",
        "selesai", "tidak_dapat_ditindaklanjuti",
    ]
    if status not in valid_status:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_status}")

    if status in ["tidak_terverifikasi", "tidak_dapat_ditindaklanjuti"] and not alasan:
        raise HTTPException(status_code=422, detail="alasan wajib untuk status ini")

    klaster = db.scalar(select(Klaster).where(Klaster.id == klaster_id))
    if not klaster:
        raise HTTPException(status_code=404, detail="Klaster tidak ditemukan")

    klaster.status_penanganan = status
    klaster.updated_at = datetime.now()
    db.add(klaster)
    log = StatusLog(
        klaster_id=klaster_id,
        status=status,
        alasan=alasan,
        actor_user_id=current_user.id,
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Status updated to {status}",
        "data": {"klaster_id": klaster_id, "status": status}
    }


# F3.18 — GET /klaster/{id}/riwayat (Riwayat Status)
@verifikasi_router.get("/{klaster_id}/riwayat")
async def get_riwayat_status(
    klaster_id: str,
    db: Session = Depends(get_db),
):
    """F3.18 — Riwayat Status."""
    logs = db.scalars(
        select(StatusLog).where(StatusLog.klaster_id == klaster_id).order_by(StatusLog.created_at.desc())
    ).all()
    
    return {
        "success": True,
        "data": [
            {
                "status": log.status,
                "alasan": log.alasan,
                "timestamp": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }