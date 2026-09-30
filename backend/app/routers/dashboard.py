"""F3.19, F3.22 — Dashboard Endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.klaster import Klaster
from app.models.sekolah import Sekolah


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/prioritas")
async def get_dashboard_prioritas(
    status: str | None = Query(None, description="Filter status: terverifikasi, menunggu_verifikasi, etc"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    F3.19 — Dashboard Prioritas.
    
    GET /dashboard/prioritas
    Akses: Publik (Klaster belum terverifikasi tampil dengan badge — Keputusan #4)
    """
    query = select(Klaster, Sekolah).join(
        Sekolah, Klaster.sekolah_npsn == Sekolah.npsn
    )
    
    if status:
        query = query.where(Klaster.status_verifikasi == status)
    
    query = query.order_by(Klaster.skor_prioritas.desc().nullslast()).limit(limit)
    
    results = db.execute(query).all()
    
    return {
        "success": True,
        "data": [
            {
                "klaster_id": k.id,
                "label": k.label,
                "kategori": k.kategori,
                "sekolah_npsn": k.sekolah_npsn,
                "sekolah_nama": s.nama,
                "skor_prioritas": float(k.skor_prioritas) if k.skor_prioritas else 0.0,
                "status_verifikasi": k.status_verifikasi,
                "badge": "menunggu_verifikasi" if k.status_verifikasi == "menunggu_verifikasi" else None,
            }
            for k, s in results
        ]
    }


@router.get("/wilayah")
async def get_dashboard_wilayah(
    db: Session = Depends(get_db),
):
    """
    F3.22 — Dashboard Wilayah.
    
    GET /dashboard/wilayah
    Akses: Publik (Ringkasan kondisi kecamatan Lamongan)
    """
    # Hitung jumlah sekolah
    total_sekolah = db.scalar(select(func.count()).select_from(Sekolah)) or 0
    
    # Hitung jumlah klaster aktif
    total_klaster = db.scalar(
        select(func.count()).select_from(Klaster).where(
            Klaster.status_verifikasi.in_(["terverifikasi", "menunggu_verifikasi"])
        )
    ) or 0
    
    # Top 5 klaster prioritas
    top_klaster_q = select(Klaster, Sekolah).join(
        Sekolah, Klaster.sekolah_npsn == Sekolah.npsn
    ).order_by(Klaster.skor_prioritas.desc().nullslast()).limit(5)
    top_klaster = db.execute(top_klaster_q).all()
    
    # Sekolah dengan isu terbanyak
    top_sekolah_q = select(
        Sekolah.npsn, Sekolah.nama, func.count(Klaster.id).label("jumlah_isu")
    ).join(Klaster, Klaster.sekolah_npsn == Sekolah.npsn).group_by(
        Sekolah.npsn, Sekolah.nama
    ).order_by(func.count(Klaster.id).desc()).limit(5)
    top_sekolah = db.execute(top_sekolah_q).all()
    
    return {
        "success": True,
        "data": {
            "jumlah_sekolah": total_sekolah,
            "jumlah_klaster_aktif": total_klaster,
            "klaster_prioritas": [
                {
                    "klaster_id": k.id,
                    "sekolah_nama": s.nama,
                    "skor_prioritas": float(k.skor_prioritas) if k.skor_prioritas else 0.0
                }
                for k, s in top_klaster
            ],
            "sekolah_isu_terbanyak": [
                {"npsn": n, "nama": nama, "jumlah_isu": count}
                for n, nama, count in top_sekolah
            ]
        }
    }
