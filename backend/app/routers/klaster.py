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
            "data": {
                "klaster_created": total,
                "message": f"Clustering triggered. Created {total} klaster.",
            }
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
        "data": {
            "unclustered_laporan": unclustered,
            "total_klaster": total_klaster,
            "last_run": "N/A (no cron log yet)",
            "message": "Pipeline status",
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# F4.5 — GET /klaster (List) & GET /klaster/{id} (Detail Klaster + Anggota)
# ─────────────────────────────────────────────────────────────────────────────

def _klaster_to_dict(k: Klaster) -> dict:
    return {
        "klaster_id": k.id,
        "label": k.label,
        "kategori": k.kategori,
        "sekolah_npsn": k.sekolah_npsn,
        "skor_keparahan": float(k.skor_keparahan) if k.skor_keparahan is not None else None,
        "skor_prioritas": float(k.skor_prioritas) if k.skor_prioritas is not None else None,
        "jumlah_vote_terhitung": k.jumlah_vote_terhitung,
        "status_verifikasi": k.status_verifikasi,
        "status_penanganan": k.status_penanganan,
        "urutan_prioritas_override": k.urutan_prioritas_override,
    }


@verifikasi_router.get("")
async def list_klaster(
    sekolah_npsn: str | None = None,
    kategori: str | None = None,
    status_verifikasi: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    """F4.5 — List klaster (publik), filter opsional + pagination (INTERFACES §0.2)."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    stmt = select(Klaster)
    count_stmt = select(func.count()).select_from(Klaster)
    if sekolah_npsn:
        stmt = stmt.where(Klaster.sekolah_npsn == sekolah_npsn)
        count_stmt = count_stmt.where(Klaster.sekolah_npsn == sekolah_npsn)
    if kategori:
        stmt = stmt.where(Klaster.kategori == kategori)
        count_stmt = count_stmt.where(Klaster.kategori == kategori)
    if status_verifikasi:
        stmt = stmt.where(Klaster.status_verifikasi == status_verifikasi)
        count_stmt = count_stmt.where(Klaster.status_verifikasi == status_verifikasi)

    total_items = db.scalar(count_stmt) or 0
    rows = db.scalars(
        stmt.order_by(Klaster.skor_prioritas.is_(None), Klaster.skor_prioritas.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "data": [_klaster_to_dict(k) for k in rows],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": (total_items + page_size - 1) // page_size,
        },
    }


@verifikasi_router.get("/{klaster_id}")
async def get_klaster_detail(
    klaster_id: str,
    db: Session = Depends(get_db),
):
    """F4.5 — Detail klaster + daftar laporan anggota (publik)."""
    klaster = db.scalar(select(Klaster).where(Klaster.id == klaster_id))
    if not klaster:
        raise HTTPException(status_code=404, detail="Klaster tidak ditemukan")

    from app.models.sekolah import Sekolah
    sekolah = db.scalar(select(Sekolah).where(Sekolah.npsn == klaster.sekolah_npsn))

    laporan_rows = db.scalars(
        select(Laporan)
        .where(Laporan.klaster_id == klaster_id)
        .order_by(Laporan.created_at.desc())
    ).all()

    data = _klaster_to_dict(klaster)
    data["sekolah_nama"] = sekolah.nama if sekolah else None
    data["created_at"] = klaster.created_at.isoformat() if klaster.created_at else None
    data["laporan"] = [
        {
            "laporan_id": lap.id,
            "fasilitas_terkait": lap.fasilitas_terkait,
            "kondisi_dilaporkan": lap.kondisi_dilaporkan,
            "deskripsi": lap.deskripsi,
            "created_at": lap.created_at.isoformat() if lap.created_at else None,
        }
        for lap in laporan_rows
    ]
    return {"data": data}


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
        "data": {
            "klaster_id": klaster_id,
            "status": status,
            "message": f"Klaster {klaster_id} verified with status {status}",
        }
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
        "data": {
            "klaster_id": klaster_id,
            "status": status,
            "message": f"Status updated to {status}",
        }
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
        "data": [
            {
                "status": log.status,
                "alasan": log.alasan,
                "timestamp": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }