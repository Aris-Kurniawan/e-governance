"""Router untuk endpoint Sekolah."""

from collections import defaultdict
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.ai_pipeline.scoring import calculate_kbm_score, compute_prior, kbm_level
from app.core.config import settings
from app.core.database import get_db
from app.models.laporan import Laporan
from app.models.sekolah import KondisiSarana, Sekolah
from app.schemas.sekolah import (
    KondisiSaranaResponse,
    SekolahListResponse,
    SekolahResponse,
    SekolahDetailResponse,
)

router = APIRouter(prefix="/sekolah", tags=["sekolah"])


# F4.11 / D-23 (DBG-007): penanda_masalah diturunkan dari level Skor KBM
# (F4.8/D-22) — ambang: <40 aman | 40–69 perlu_perhatian | ≥70 kritis.
PENANDA_BY_LEVEL = {
    "kritis": "kritis",
    "tinggi": "perlu_perhatian",
    "sedang": "perlu_perhatian",
    "rendah": "aman",
}
_KOSONG = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}


def _penanda_isu_per_sekolah(
    db: Session, npsns: list[str]
) -> dict[str, tuple[str, int]]:
    """D-23: (penanda_masalah, jumlah_isu_aktif) untuk daftar NPSN.

    - penanda: level Skor KBM — rumus & skala identik dengan
      `GET /laporan/skor-kbm` (agregasi tanpa filter `sumber`, sama persis).
    - jumlah_isu_aktif: laporan warga berstatus selain `ditolak`
      (menunggu + divalidasi = isu yang masih berdiri).
    """
    if not npsns:
        return {}

    laps_per: dict[str, list] = defaultdict(list)
    isu_per: dict[str, int] = defaultdict(int)
    # D-24: prior WAJIB global, bukan per halaman. Query sengaja tanpa
    # `.where(npsn IN ...)` agar penanda di halaman 1/2 dan detail tidak
    # berbeda (pelajaran DBG-007/DBG-008).
    for npsn, kondisi, status_sanggahan in db.execute(
        select(
            Laporan.sekolah_npsn,
            Laporan.kondisi_dilaporkan,
            Laporan.status_sanggahan,
        )
    ).all():
        laps_per[npsn].append(kondisi)
        if status_sanggahan != "ditolak":
            isu_per[npsn] += 1

    prior = compute_prior(laps_per)

    dapodik_per: dict[str, dict] = defaultdict(lambda: dict(_KOSONG))
    for npsn, jumlah, berat, sedang, ringan in db.execute(
        select(
            KondisiSarana.sekolah_npsn,
            KondisiSarana.jumlah,
            KondisiSarana.kondisi_rusak_berat,
            KondisiSarana.kondisi_rusak_sedang,
            KondisiSarana.kondisi_rusak_ringan,
        ).where(KondisiSarana.sekolah_npsn.in_(npsns))
    ).all():
        d = dapodik_per[npsn]
        d["total"] += jumlah or 0
        d["berat"] += berat or 0
        d["sedang"] += sedang or 0
        d["ringan"] += ringan or 0

    out: dict[str, tuple[str, int]] = {}
    for npsn in npsns:
        k = calculate_kbm_score(
            laps_per.get(npsn, []),
            dapodik_per.get(npsn, dict(_KOSONG)),
            prior=prior,
            k=settings.SHRINKAGE_K,
        )
        out[npsn] = (
            PENANDA_BY_LEVEL[kbm_level(k["skor_kbm"])],
            isu_per.get(npsn, 0),
        )
    return out


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

    # F4.11 (DBG-007/009): penanda & isu dihitung nyata; koordinat diekspos.
    hitung = _penanda_isu_per_sekolah(db, [s.npsn for s in schools])

    return {
        "data": [
            SekolahResponse(
                npsn=s.npsn,
                nama=s.nama,
                alamat=s.alamat,
                jenjang=s.jenjang,
                status_sekolah=s.status_sekolah,
                lintang=float(s.lintang) if s.lintang is not None else None,
                bujur=float(s.bujur) if s.bujur is not None else None,
                jumlah_isu_aktif=hitung[s.npsn][1],
                penanda_masalah=hitung[s.npsn][0],
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

    # F4.11 (DBG-007/009): penanda & isu dihitung nyata; koordinat diekspos.
    penanda, isu_aktif = _penanda_isu_per_sekolah(db, [npsn])[npsn]

    return {"data": SekolahDetailResponse(
        npsn=sekolah.npsn,
        nama=sekolah.nama,
        alamat=sekolah.alamat,
        jenjang=sekolah.jenjang,
        status_sekolah=sekolah.status_sekolah,
        lintang=float(sekolah.lintang) if sekolah.lintang is not None else None,
        bujur=float(sekolah.bujur) if sekolah.bujur is not None else None,
        jumlah_isu_aktif=isu_aktif,
        penanda_masalah=penanda,
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