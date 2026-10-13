"""Router untuk endpoint Laporan."""

import secrets
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, RoleChecker
from app.core.database import get_db
from app.models.klaster import Klaster
from app.models.laporan import Laporan, LaporanFoto, STATUS_SANGGHAN_ENUM
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


@router.post("", status_code=status.HTTP_201_CREATED)
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
        fasilitas_terkait=payload.fasilitas_terkait,
        kondisi_dilaporkan=payload.kondisi_dilaporkan,
        deskripsi=payload.deskripsi,
        status_sanggahan="menunggu",
    )

    db.add(laporan)
    db.commit()
    db.refresh(laporan)

    return {"data": LaporanResponse(
        id=laporan.id,
        tracking_id=laporan.tracking_id,
        user_id=laporan.user_id,
        sekolah_npsn=laporan.sekolah_npsn,
        fasilitas_terkait=laporan.fasilitas_terkait,
        kondisi_dilaporkan=laporan.kondisi_dilaporkan,
        deskripsi=laporan.deskripsi,
        status_sanggahan=laporan.status_sanggahan,
        created_at=laporan.created_at,
    )}


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


# ─────────────────────────────────────────────────────────────────────────────
# F4.7 (D-21) — Fallback laporan tanpa klaster → verifikasi manual
# admin/kepala_dinas (pengganti klaster "Belum Terklasifikasi")
# ─────────────────────────────────────────────────────────────────────────────

require_review = RoleChecker(["admin", "kepala_dinas"])


class LaporanStatusUpdateRequest(BaseModel):
    """Body PUT /laporan/{id}/status.

    Keterbatasan v1: tanpa field alasan (status_log terikat FK klaster NOT
    NULL — butuh kolom baru, task terpisah).
    """

    status: str


@router.get("/perlu-review")
def laporan_perlu_review(
    page: int = Query(1, ge=1, description="Halaman"),
    page_size: int = Query(20, ge=1, le=100, description="Jumlah per halaman"),
    db: Session = Depends(get_db),
    _: User = Depends(require_review),
):
    """F4.7 (D-21) — Daftar laporan yang perlu verifikasi manual.

    Seleksi: `laporan.klaster_id IS NULL` (laporan noise HDBSCAN yang tidak
    punya record klaster) **ATAU** `klaster.kategori = 'belum_terklasifikasi'`
    (klaster label-fallback yang disembunyikan dari `GET /klaster` default).
    """
    filter_clause = or_(
        Laporan.klaster_id.is_(None),
        Klaster.kategori == "belum_terklasifikasi",
    )

    total_items = (
        db.scalar(
            select(func.count())
            .select_from(Laporan)
            .outerjoin(Klaster, Laporan.klaster_id == Klaster.id)
            .where(filter_clause)
        )
        or 0
    )

    rows = db.execute(
        select(Laporan, Klaster, Sekolah)
        .outerjoin(Klaster, Laporan.klaster_id == Klaster.id)
        .outerjoin(Sekolah, Laporan.sekolah_npsn == Sekolah.npsn)
        .where(filter_clause)
        .order_by(Laporan.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "data": [
            {
                "id": lap.id,
                "tracking_id": lap.tracking_id,
                "sekolah_npsn": lap.sekolah_npsn,
                "sekolah_nama": sek.nama if sek else None,
                "fasilitas_terkait": lap.fasilitas_terkait,
                "kondisi_dilaporkan": lap.kondisi_dilaporkan,
                "deskripsi": lap.deskripsi,
                "status_sanggahan": lap.status_sanggahan,
                "created_at": lap.created_at.isoformat() if lap.created_at else None,
                "klaster": (
                    {"id": kl.id, "label": kl.label, "kategori": kl.kategori}
                    if kl
                    else None
                ),
            }
            for lap, kl, sek in rows
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": (total_items + page_size - 1) // page_size,
        },
    }


@router.put("/{laporan_id}/status")
def update_laporan_status(
    laporan_id: str,
    payload: LaporanStatusUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_review),
):
    """F4.7 (D-21) — Verifikasi manual per laporan oleh admin/kepala_dinas.

    Update kolom `status_sanggahan` (menunggu | divalidasi | ditolak).
    Nilai di luar enum ditolak 422 (divalidasi manual, bukan Pydantic —
    handler global mengubah error validasi Pydantic menjadi 400).
    """
    if payload.status not in STATUS_SANGGHAN_ENUM:
        raise HTTPException(
            status_code=422,
            detail=f"status harus salah satu dari {list(STATUS_SANGGHAN_ENUM)}",
        )

    laporan = db.scalar(select(Laporan).where(Laporan.id == laporan_id))
    if not laporan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laporan dengan ID {laporan_id} tidak ditemukan",
        )

    laporan.status_sanggahan = payload.status
    db.add(laporan)
    db.commit()
    db.refresh(laporan)

    return {
        "data": {
            "id": laporan.id,
            "tracking_id": laporan.tracking_id,
            "status_sanggahan": laporan.status_sanggahan,
        }
    }


@router.get("/{laporan_id}")
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

    return {"data": LaporanDetailResponse(
        id=laporan.id,
        tracking_id=laporan.tracking_id,
        user_id=laporan.user_id,
        sekolah_npsn=laporan.sekolah_npsn,
        fasilitas_terkait=laporan.fasilitas_terkait,
        kondisi_dilaporkan=laporan.kondisi_dilaporkan,
        deskripsi=laporan.deskripsi,
        status_sanggahan=laporan.status_sanggahan,
        created_at=laporan.created_at,
        sekolah=sekolah_data,
        foto=foto_data,
    )}