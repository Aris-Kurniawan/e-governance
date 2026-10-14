"""Router untuk endpoint Laporan."""

import secrets
from collections import defaultdict
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.ai_pipeline.scoring import calculate_kbm_score, kbm_level
from app.core.deps import get_current_user, RoleChecker
from app.core.audit import log_audit
from app.core.database import get_db
from app.models.klaster import Klaster
from app.models.laporan import Laporan, LaporanFoto, STATUS_SANGGHAN_ENUM
from app.models.sekolah import Sekolah, KondisiSarana
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
    current_user: User = Depends(require_review),
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
    # F4.10 (DBG-005): jejak audit verifikasi status sanggahan.
    log_audit(db, current_user.id, "verifikasi_status_sanggahan", target=laporan_id)
    db.commit()
    db.refresh(laporan)

    return {
        "data": {
            "id": laporan.id,
            "tracking_id": laporan.tracking_id,
            "status_sanggahan": laporan.status_sanggahan,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# F4.8 (D-22) — Skor dampak KBM per sekolah + ringkasan
# ─────────────────────────────────────────────────────────────────────────────

require_skor_kbm = RoleChecker(["admin", "verifikator_dinas", "kepala_dinas"])


@router.get("/skor-kbm")
def laporan_skor_kbm(
    db: Session = Depends(get_db),
    _: User = Depends(require_skor_kbm),
):
    """F4.8 (D-22) — Skor dampak KBM per sekolah (skala 0–100) + ringkasan.

    skor_kbm = 0.7 × AVG(severity laporan warga)
             + 0.3 × Σ(weight × kondisi_rusak) / Σ(jumlah Dapodik)
    (lihat `calculate_kbm_score` di ai_pipeline/scoring.py).
    """
    # Laporan per sekolah — 600 baris, dikelompokkan di memori.
    laporan_rows = db.execute(
        select(Laporan.sekolah_npsn, Laporan.kondisi_dilaporkan)
    ).all()
    laporan_per_sekolah: dict[str, list[str | None]] = defaultdict(list)
    for npsn, kondisi in laporan_rows:
        laporan_per_sekolah[npsn].append(kondisi)

    # Kondisi sarpras Dapodik per sekolah + agregat global per jenis ruang.
    sarana_rows = db.execute(
        select(
            KondisiSarana.sekolah_npsn,
            KondisiSarana.nama_ruang,
            KondisiSarana.jumlah,
            KondisiSarana.kondisi_rusak_berat,
            KondisiSarana.kondisi_rusak_sedang,
            KondisiSarana.kondisi_rusak_ringan,
        )
    ).all()
    kosong = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}
    dapodik_per_sekolah: dict[str, dict[str, int]] = defaultdict(lambda: dict(kosong))
    per_jenis: dict[str, dict[str, int]] = defaultdict(
        lambda: {"rusak_berat": 0, "jumlah": 0}
    )
    for npsn, nama_ruang, jumlah, berat, sedang, ringan in sarana_rows:
        d = dapodik_per_sekolah[npsn]
        d["total"] += jumlah or 0
        d["berat"] += berat or 0
        d["sedang"] += sedang or 0
        d["ringan"] += ringan or 0
        j = per_jenis[nama_ruang]
        j["rusak_berat"] += berat or 0
        j["jumlah"] += jumlah or 0

    # Skor tiap sekolah (semua sekolah, bukan hanya yang punya laporan).
    sekolah_data = []
    for sek in db.scalars(select(Sekolah)).all():
        laps = laporan_per_sekolah.get(sek.npsn, [])
        k = calculate_kbm_score(
            laps, dapodik_per_sekolah.get(sek.npsn, dict(kosong))
        )
        sekolah_data.append(
            {
                "npsn": sek.npsn,
                "nama": sek.nama,
                "skor_kbm": k["skor_kbm"],
                "level": kbm_level(k["skor_kbm"]),
                "skor_laporan": k["skor_laporan"],
                "skor_dapodik": k["skor_dapodik"],
                "jumlah_laporan": len(laps),
                "laporan_rusak_berat": sum(1 for s in laps if s == "rusak_berat"),
            }
        )
    sekolah_data.sort(key=lambda row: row["skor_kbm"], reverse=True)

    # Ringkasan global.
    distribusi = {"baik": 0, "rusak_ringan": 0, "rusak_sedang": 0, "rusak_berat": 0}
    for laps in laporan_per_sekolah.values():
        for kondisi in laps:
            if kondisi in distribusi:
                distribusi[kondisi] += 1

    dampak_per_jenis = [
        {"nama_ruang": nama, **jumlah}
        for nama, jumlah in sorted(
            per_jenis.items(), key=lambda kv: kv[1]["rusak_berat"], reverse=True
        )
    ]

    return {
        "data": {
            "ringkasan": {
                "rata_rata_skor": round(
                    sum(row["skor_kbm"] for row in sekolah_data) / len(sekolah_data),
                    1,
                )
                if sekolah_data
                else 0.0,
                "sekolah_kritis": sum(
                    1 for row in sekolah_data if row["level"] == "kritis"
                ),
                "total_laporan": len(laporan_rows),
                "ruang_rusak_berat": sum(v["rusak_berat"] for v in per_jenis.values()),
                "distribusi_kondisi": distribusi,
                "dampak_per_jenis_ruang": dampak_per_jenis,
            },
            "sekolah": sekolah_data,
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