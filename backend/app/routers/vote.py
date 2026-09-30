"""F3.12, F3.13 — Vote Endpoints."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, RoleChecker
from app.core.database import get_db
from app.models.user import User
from app.models.klaster import Klaster, Vote
from app.models.laporan import Laporan
from app.ai_pipeline.scoring import calculate_priority_score


router = APIRouter(prefix="/vote", tags=["vote"])

require_warga = RoleChecker(["warga_terverifikasi", "komite_sekolah"])


@router.post("")
async def create_vote(
    klaster_id: str,
    current_user: User = Depends(require_warga),
    db: Session = Depends(get_db),
):
    """F3.12 — Vote Baru."""
    klaster = db.scalar(select(Klaster).where(Klaster.id == klaster_id))
    if not klaster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klaster tidak ditemukan")

    existing = db.scalar(
        select(Vote).where(Vote.klaster_id == klaster_id, Vote.user_id == current_user.id)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sudah vote di klaster ini")

    vote = Vote(klaster_id=klaster_id, user_id=current_user.id, status_vote="pending")
    db.add(vote)

    klaster.jumlah_vote_terhitung = (klaster.jumlah_vote_terhitung or 0) + 1
    laporan_list = db.scalars(select(Laporan).where(Laporan.klaster_id == klaster_id)).all()
    kondisi_laporan = [{"kondisi_dilaporkan": lap.kondisi_dilaporkan or "baik"} for lap in laporan_list]
    kondisi_dapodik = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}
    skor = calculate_priority_score(kondisi_laporan, kondisi_dapodik, klaster.jumlah_vote_terhitung)
    klaster.skor_prioritas = Decimal(str(skor))
    klaster.skor_keparahan = Decimal(str(skor - klaster.jumlah_vote_terhitung))

    db.commit()
    return {"success": True, "data": {"vote_id": vote.id, "status_vote": vote.status_vote}}


@router.get("/status/{klaster_id}")
async def get_vote_status(
    klaster_id: str,
    current_user: User = Depends(require_warga),
    db: Session = Depends(get_db),
):
    """F3.13 — Cek Status Vote."""
    vote = db.scalar(
        select(Vote).where(Vote.klaster_id == klaster_id, Vote.user_id == current_user.id)
    )
    
    if not vote:
        return {
            "success": True,
            "data": {
                "has_voted": False,
                "status_vote": None
            }
        }
    
    return {
        "success": True,
        "data": {
            "has_voted": True,
            "status_vote": vote.status_vote,
            "vote_id": vote.id
        }
    }
