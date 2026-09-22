"""Router untuk endpoint Laporan."""

import secrets
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.laporan import Laporan, LaporanFoto
from app.models.sekolah import Sekolah
from app.models.user import User
from app.schemas.laporan import (
    LaporanCreateRequest,
    LaporanResponse,
    LaporanDetailResponse,
    LaporanListResponse,
)

router = APIRouter(prefix="/laporan", tags=["laporan"])


def generate_tracking_id() -> str:
    """Generate unique tracking ID."""
    return f"LAP-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


@router.post("", status_code=status.HTTP_201_CREATED, response_model=LaporanResponse)
def create_laporan(
    payload: LaporanCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Buat laporan baru."""
    # Cek sekolah ada
    sekolah = db.scalar(select(Sekolah).where(Sekolah.npsn == payload.sekolah_npsn))
    if not sekolah:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sekolah dengan NPSN {payload.sekolah_npsn} tidak ditemukan",
        )

    tracking_id = generate_tracking_id()
    while db.scalar(select(Laporan).where(Laporan.tracking_id == tracking_id)):
        tracking_id = generate_tracking_id()

    laporan = Laporan(
        tracking_id=tracking_id,
        user_id=user.id,
        sekolah_npsn=payload.sekolah_npsn,
        kategori=payload.kategori,
        fasilitas_terkait=payload.fasilitas_terkait,
        kondisi_dilaporkan=payload.kondisi_dilaporkan,
        deskripsi=payload.deskripsi,
        status_sanggahan="menunggu",
    )

    db.add(laporan)
    db.commit()
    db.refresh(laporan)

    return LaporanResponse(
        id=laporan.id,
        tracking_id=laporan.tracking_id,
        user_id=laporan.user_id,
        sekolah_npsn=laporan.sekolah_npsn,
        kategori=laporan.kategori,
        fasilitas_terkait=laporan.fasilitas_terkait,
        kondisi_dilaporkan=laporan.kondisi_dilaporkan,
        deskripsi=laporan.deskripsi,
        status_sanggahan=laporan.status_sanggahan,
        created_at=laporan.created_at,
    )


@router.get("/riwayat", response_model=LaporanListResponse)
def riwayat_laporan(
    page: int = Query(1, ge=1, description="Halaman"),
    page_size: int = Query(10, ge=1, le=50, description="Jumlah per halaman"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Riwayat laporan user sendiri."""
    query = select(Laporan).where(Laporan.user_id == user.id)

    # Hitung total
    total_items = db.scalar(select(func.count()).select_from(query.subquery()))
    total_pages = ceil(total_items / page_size) if total_items else 1

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Laporan.created_at.desc())

    laporans = db.scalars(query).all()

    return LaporanListResponse(
        data=[
            LaporanResponse(
                id=l.id,
                tracking_id=l.tracking_id,
                user_id=l.user_id,
                sekolah_npsn=l.sekolah_npsn,
                kategori=l.kategori,
                fasilitas_terkait=l.fasilitas_terkait,
                kondisi_dilaporkan=l.kondisi_dilaporkan,
                deskripsi=l.deskripsi,
                status_sanggahan=l.status_sanggahan,
                created_at=l.created_at,
            )
            for l in laporans
        ],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        },
    )


@router.get("/{laporan_id}", response_model=LaporanDetailResponse)
def detail_laporan(
    laporan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Detail laporan (hanya pemilik dan dinas yang bisa akses)."""
    laporan = db.scalar(select(Laporan).where(Laporan.id == laporan_id))

    if not laporan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laporan dengan ID {laporan_id} tidak ditemukan",
        )

    # Cek hak akses: pemilik atau dinas
    is_owner = laporan.user_id == user.id
    is_dinas = user.role in ["verifikator_dinas", "kepala_dinas", "admin"]

    if not (is_owner or is_dinas):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pemilik laporan atau petugas dinas yang bisa melihat detail",
        )

    # Ambil data sekolah
    sekolah = db.scalar(select(Sekolah).where(Sekolah.npsn == laporan.sekolah_npsn))
    sekolah_data = None
    if sekolah:
        sekolah_data = {
            "npsn": sekolah.npsn,
            "nama": sekolah.nama,
            "jenjang": sekolah.jenjang,
        }

    # Ambil foto
    foto_list = db.scalars(
        select(LaporanFoto).where(LaporanFoto.laporan_id == laporan_id)
    ).all()
    foto_data = [
        {"id": f.id, "storage_key": f.storage_key, "created_at": f.created_at}
        for f in foto_list
    ]

    return LaporanDetailResponse(
        id=laporan.id,
        tracking_id=laporan.tracking_id,
        user_id=laporan.user_id,
        sekolah_npsn=laporan.sekolah_npsn,
        kategori=laporan.kategori,
        fasilitas_terkait=laporan.fasilitas_terkait,
        kondisi_dilaporkan=laporan.kondisi_dilaporkan,
        deskripsi=laporan.deskripsi,
        status_sanggahan=laporan.status_sanggahan,
        created_at=laporan.created_at,
        sekolah=sekolah_data,
        foto=foto_data,
    )