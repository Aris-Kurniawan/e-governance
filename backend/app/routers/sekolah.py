"""Router untuk endpoint Sekolah."""

from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.sekolah import KondisiSarana, Sekolah
from app.schemas.sekolah import (
    KondisiSaranaResponse,
    SekolahListResponse,
    SekolahResponse,
    SekolahDetailResponse,
)

router = APIRouter(prefix="/sekolah", tags=["sekolah"])


@router.get("", response_model=SekolahListResponse)
def list_sekolah(
    search: Optional[str] = Query(None, description="Cari nama sekolah"),
    jenjang: Optional[str] = Query(None, description="Filter jenjang: SD, SMP, SMA, SMK"),
    page: int = Query(1, ge=1, description="Halaman"),
    page_size: int = Query(10, ge=1, le=100, description="Jumlah per halaman"),
    db: Session = Depends(get_db),
):
    """Daftar sekolah dengan filter dan pagination."""
    query = select(Sekolah)

    # Filter search
    if search:
        query = query.where(Sekolah.nama.ilike(f"%{search}%"))

    # Filter jenjang
    if jenjang:
        query = query.where(Sekolah.jenjang == jenjang.upper())

    # Hitung total
    total_items = db.scalar(select(func.count()).select_from(query.subquery()))
    total_pages = ceil(total_items / page_size) if total_items else 1

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Sekolah.nama)

    schools = db.scalars(query).all()

    return {
        "data": [
            SekolahResponse(
                npsn=s.npsn,
                nama=s.nama,
                alamat=s.alamat,
                jenjang=s.jenjang,
                status_sekolah=s.status_sekolah,
                jumlah_isu_aktif=0,
                penanda_masalah="normal",
            )
            for s in schools
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        },
    }


@router.get("/{npsn}")
def get_sekolah(npsn: str, db: Session = Depends(get_db)):
    """Detail sekolah + kondisi sarana (agregat per jenis ruang)."""
    sekolah = db.scalar(select(Sekolah).where(Sekolah.npsn == npsn))

    if not sekolah:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sekolah dengan NPSN {npsn} tidak ditemukan",
        )

    # Ambil kondisi sarana
    sarana_list = db.scalars(
        select(KondisiSarana).where(KondisiSarana.sekolah_npsn == npsn)
    ).all()

    # Bangun ringkasan sarpras
    total_unit = sum(s.jumlah for s in sarana_list)
    total_baik = sum(s.kondisi_baik for s in sarana_list)
    total_rusak_ringan = sum(s.kondisi_rusak_ringan for s in sarana_list)
    total_rusak_sedang = sum(s.kondisi_rusak_sedang for s in sarana_list)
    total_rusak_berat = sum(s.kondisi_rusak_berat for s in sarana_list)

    return {"data": SekolahDetailResponse(
        npsn=sekolah.npsn,
        nama=sekolah.nama,
        alamat=sekolah.alamat,
        jenjang=sekolah.jenjang,
        status_sekolah=sekolah.status_sekolah,
        akreditasi=sekolah.akreditasi,
        nama_kepsek=sekolah.nama_kepsek,
        rasio_guru_siswa=sekolah.data_resmi[0].rasio_guru_siswa
        if sekolah.data_resmi
        else None,
        rasio_spm_terpenuhi=sekolah.data_resmi[0].indikator_kualitas_data == "terpenuhi"
        if sekolah.data_resmi
        else False,
        jumlah_pd=0,  # Perlu data tambahan dari scraping
        jumlah_ptk=0,
        jumlah_rombel=0,
        utilitas_kapasitas_belajar=0.0,
        kondisi_sarana=[
            KondisiSaranaResponse(
                id=s.id,
                nama_ruang=s.nama_ruang,
                jumlah=s.jumlah,
                kondisi_baik=s.kondisi_baik,
                kondisi_rusak_ringan=s.kondisi_rusak_ringan,
                kondisi_rusak_sedang=s.kondisi_rusak_sedang,
                kondisi_rusak_berat=s.kondisi_rusak_berat,
                sumber=s.sumber,
                perlu_verifikasi=s.perlu_verifikasi,
            )
            for s in sarana_list
        ],
        ringkasan_sarpras={
            "total_unit": total_unit,
            "total_baik": total_baik,
            "total_rusak_ringan": total_rusak_ringan,
            "total_rusak_sedang": total_rusak_sedang,
            "total_rusak_berat": total_rusak_berat,
        },
        klaster_isu=[],
    )}