"""F3.12, F3.13 — Vote Endpoints."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, RoleChecker
from app.core.audit import log_audit
from app.core.database import get_db
from app.models.user import User
from app.models.klaster import Klaster, Vote
from app.models.laporan import Laporan
from app.ai_pipeline.scoring import (
    calculate_score_components,
    hitung_kondisi_dapodik,
)


router = APIRouter(prefix="/vote", tags=["vote"])

require_warga = RoleChecker(["warga_umum", "warga_terverifikasi", "komite_sekolah"])


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

    vote = Vote(klaster_id=klaster_id, user_id=current_user.id, status_vote="terhitung")
    db.add(vote)

    klaster.jumlah_vote_terhitung = (klaster.jumlah_vote_terhitung or 0) + 1
    laporan_list = db.scalars(select(Laporan).where(Laporan.klaster_id == klaster.id)).all()
    kondisi_laporan = [{"kondisi_dilaporkan": lap.kondisi_dilaporkan} for lap in laporan_list]
    # DBG-022: komponen Dapodik wajib dari DB — sebelumnya hardcoded nol sehingga
    # setiap vote menulis ulang skor tanpa bobot 30% Dapodik.
    kondisi_dapodik = hitung_kondisi_dapodik(db, klaster.sekolah_npsn)
    skor_keparahan, skor_prioritas = calculate_score_components(
        kondisi_laporan, kondisi_dapodik, klaster.jumlah_vote_terhitung
    )
    klaster.skor_prioritas = Decimal(str(skor_prioritas))
    klaster.skor_keparahan = Decimal(str(skor_keparahan))

    db.commit()
    return {"data": {"vote_id": vote.id, "status_vote": vote.status_vote}}


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
            "data": {
                "has_voted": False,
                "status_vote": None
            }
        }
    
    return {
        "data": {
            "has_voted": True,
            "status_vote": vote.status_vote,
            "vote_id": vote.id
        }
    }


# F3.14 - Hitung Ulang Skor Prioritas
require_admin = RoleChecker(["admin"])


@router.put("/klaster/{klaster_id}/skor")
async def recalculate_skor(
    klaster_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """F3.14 — Hitung Ulang Skor Prioritas."""
    klaster = db.scalar(select(Klaster).where(Klaster.id == klaster_id))
    if not klaster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klaster tidak ditemukan")

    laporan_list = db.scalars(select(Laporan).where(Laporan.klaster_id == klaster_id)).all()
    kondisi_laporan = [{"kondisi_dilaporkan": lap.kondisi_dilaporkan} for lap in laporan_list]
    # DBG-022: endpoint "hitung ulang" justru merusak data sebelumnya (Dapodik
    # hardcoded nol) — kini query komponen Dapodik yang sebenarnya.
    kondisi_dapodik = hitung_kondisi_dapodik(db, klaster.sekolah_npsn)
    votes = klaster.jumlah_vote_terhitung or 0
    skor_keparahan, skor = calculate_score_components(kondisi_laporan, kondisi_dapodik, votes)

    klaster.skor_prioritas = Decimal(str(skor))
    klaster.skor_keparahan = Decimal(str(skor_keparahan))
    db.commit()

    return {
        "data": {
            "klaster_id": klaster_id,
            "skor_prioritas": float(skor),
            "jumlah_vote_terhitung": votes
        }
    }


# F3.15 - Override Prioritas
require_kepala_dinas = RoleChecker(["kepala_dinas"])


@router.put("/klaster/{klaster_id}/override")
async def override_prioritas(
    klaster_id: str,
    urutan_prioritas: int,
    alasan: str,
    current_user: User = Depends(require_kepala_dinas),
    db: Session = Depends(get_db),
):
    """F3.15 — Override Prioritas oleh Kepala Dinas."""
    if not alasan:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="alasan wajib diisi")

    klaster = db.scalar(select(Klaster).where(Klaster.id == klaster_id))
    if not klaster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klaster tidak ditemukan")

    klaster.urutan_prioritas_override = urutan_prioritas
    klaster.alasan_override = alasan
    # F4.10 (DBG-005): jejak audit override prioritas.
    log_audit(db, current_user.id, "override_prioritas", target=klaster_id)
    db.commit()

    return {
        "data": {
            "klaster_id": klaster_id,
            "urutan_prioritas_override": urutan_prioritas,
            "alasan_override": alasan
        }
    }