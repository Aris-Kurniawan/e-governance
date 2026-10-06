"""Router untuk sanggahan data sekolah."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from math import ceil

from app.core.database import get_db
from app.models.laporan import Laporan
from app.models.sekolah import Sekolah

router = APIRouter(prefix="/sekolah", tags=["sekolah"])


@router.get("/{npsn}/sanggahan")
def riwayat_sanggahan_sekolah(
    npsn: str,
    page: int = Query(1, ge=1, description="Halaman"),
    page_size: int = Query(10, ge=1, le=50, description="Jumlah per halaman"),
    db: Session = Depends(get_db),
):
    """Riwayat sanggahan data untuk sekolah tertentu."""
    # Cek sekolah ada
    sekolah = db.scalar(select(Sekolah).where(Sekolah.npsn == npsn))
    if not sekolah:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sekolah dengan NPSN {npsn} tidak ditemukan",
        )

    # Query laporan sanggahan untuk sekolah ini
    query = select(Laporan).where(
        (Laporan.sekolah_npsn == npsn) & (Laporan.status_sanggahan != "menunggu")
    )

    # Hitung total
    total_items = db.scalar(select(func.count()).select_from(query.subquery()))
    total_pages = ceil(total_items / page_size) if total_items else 1

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Laporan.created_at.desc())

    sanggahans = db.scalars(query).all()

    return {
        "data": [
            {
                "id": s.id,
                "tracking_id": s.tracking_id,
                "fasilitas_terkait": s.fasilitas_terkait,
                "kondisi_dilaporkan": s.kondisi_dilaporkan,
                "deskripsi": s.deskripsi,
                "status_sanggahan": s.status_sanggahan,
                "created_at": s.created_at,
            }
            for s in sanggahans
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        },
    }