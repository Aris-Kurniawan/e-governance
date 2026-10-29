"""Router untuk endpoint Laporan."""

import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.ai_pipeline.question_bank import (
    KOMPONEN,
    cari_pilihan,
    pilih_pertanyaan,
    severity_tertinggi,
)
from app.ai_pipeline.scoring import (
    calculate_kbm_score,
    compute_prior,
    is_mismatch,
    kbm_level,
)
from app.core.config import settings
from app.core.deps import get_current_user, RoleChecker
from app.core.audit import log_audit
from app.core.exceptions import ApiError
from app.core.database import get_db
from app.models.klaster import Klaster
from app.models.laporan import Laporan, LaporanFoto, STATUS_SANGGHAN_ENUM
from app.models.sekolah import Sekolah, KondisiSarana
from app.models.user import User
from app.schemas.laporan import (
    KonfirmasiRequest,
    KonfirmasiRingkas,
    LaporanCreateRequest,
    LaporanResponse,
    LaporanDetailResponse,
    LaporanListResponse,
)

router = APIRouter(prefix="/laporan", tags=["laporan"])


def generate_tracking_id() -> str:
    """Generate unique tracking ID."""
    return f"LAP-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


def _laporan_fields(laporan: Laporan, klaster: Klaster | None = None) -> dict:
    """Field respons laporan yang dipakai POST, riwayat, dan detail (F4.14)."""
    status_pen = None
    if klaster and klaster.status_penanganan:
        status_pen = klaster.status_penanganan
    elif getattr(laporan, "status_penanganan", None):
        status_pen = laporan.status_penanganan
    elif laporan.status_sanggahan == "divalidasi":
        status_pen = "dalam_antrian_prioritas"
    elif laporan.status_sanggahan == "ditolak":
        status_pen = "tidak_dapat_ditindaklanjuti"
    elif laporan.status_sanggahan == "menunggu":
        status_pen = "menunggu_verifikasi"

    return {
        "id": laporan.id,
        "tracking_id": laporan.tracking_id,
        "user_id": laporan.user_id,
        "sekolah_npsn": laporan.sekolah_npsn,
        "fasilitas_terkait": laporan.fasilitas_terkait,
        "kondisi_dilaporkan": laporan.kondisi_dilaporkan,
        "sumber_kondisi": laporan.sumber_kondisi,
        "status_konfirmasi": laporan.status_konfirmasi,
        "konfirmasi_perlu_dijawab": laporan.status_konfirmasi == "menunggu",
        "deskripsi": laporan.deskripsi,
        "status_sanggahan": laporan.status_sanggahan,
        "created_at": laporan.created_at,
        "klaster_id": laporan.klaster_id,
        "status_penanganan": status_pen,
    }


# ── F4.15 — konfirmasi severity (lapis 1) ────────────────────────────────────

KONFIRMASI_TTL = timedelta(hours=24)


def _naive_utc(value: datetime | None) -> datetime | None:
    """Samakan datetime SQLite/MySQL (naive) dengan jam UTC untuk perbandingan."""
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _kedaluwarsa_pada(laporan: Laporan) -> datetime | None:
    dibuat = _naive_utc(laporan.created_at)
    return dibuat + KONFIRMASI_TTL if dibuat else None


def _konfirmasi_ringkas(laporan: Laporan) -> KonfirmasiRingkas:
    pertanyaan = pilih_pertanyaan(laporan.deskripsi)
    return KonfirmasiRingkas(
        perlu_konfirmasi=len(pertanyaan) > 1,
        jumlah_pertanyaan=len(pertanyaan),
        kedaluwarsa_pada=_kedaluwarsa_pada(laporan),
    )


def _expire_konfirmasi(laporan: Laporan, db: Session) -> bool:
    """Transisi lazy `menunggu` → `dilewati` setelah 24 jam (opsi kontrak #4)."""
    if laporan.status_konfirmasi != "menunggu":
        return False
    batas = _kedaluwarsa_pada(laporan)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if batas is not None and now >= batas:
        laporan.status_konfirmasi = "dilewati"
        db.commit()
        db.refresh(laporan)
        return True
    return False


def _laporan_milik(db: Session, laporan_id: str, user: User) -> Laporan:
    laporan = db.scalar(select(Laporan).where(Laporan.id == laporan_id))
    if not laporan:
        raise ApiError(
            404, "NOT_FOUND", f"Laporan dengan ID {laporan_id} tidak ditemukan"
        )
    if laporan.user_id != user.id:
        raise ApiError(
            403, "FORBIDDEN", "Konfirmasi hanya dapat diakses pemilik laporan"
        )
    return laporan


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
        # F4.14: laporan baru menunggu konfirmasi severity (opsional, F4.15).
        status_konfirmasi="menunggu",
    )

    db.add(laporan)
    db.commit()
    db.refresh(laporan)

    return {
        "data": LaporanResponse(
            **_laporan_fields(laporan),
            konfirmasi=_konfirmasi_ringkas(laporan),
        )
    }


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
    klaster_ids = [l.klaster_id for l in laporans if l.klaster_id]
    klaster_map = {}
    if klaster_ids:
        klasters = db.scalars(select(Klaster).where(Klaster.id.in_(klaster_ids))).all()
        klaster_map = {k.id: k for k in klasters}

    return LaporanListResponse(
        data=[LaporanResponse(**_laporan_fields(l, klaster_map.get(l.klaster_id))) for l in laporans],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# DBG-023 (D-29) — Aduan Mandiri Tervalidasi Publik
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/publik", response_model=LaporanListResponse)
def list_laporan_publik(
    page: int = Query(1, ge=1, description="Halaman"),
    page_size: int = Query(20, ge=1, le=100, description="Jumlah per halaman"),
    sekolah_npsn: str | None = Query(None, description="Filter NPSN sekolah"),
    db: Session = Depends(get_db),
):
    """DBG-023 (D-29) — Daftar aduan mandiri tervalidasi untuk transparansi publik.

    Menampilkan laporan yang divalidasi dinas (status_sanggahan = 'divalidasi')
    dan tidak masuk klaster AI (klaster_id IS NULL). Terbuka untuk umum (publik).
    """
    stmt = select(Laporan).where(
        Laporan.status_sanggahan == "divalidasi",
        Laporan.klaster_id.is_(None),
    )
    if sekolah_npsn:
        stmt = stmt.where(Laporan.sekolah_npsn == sekolah_npsn)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_items = db.scalar(count_stmt) or 0
    total_pages = ceil(total_items / page_size) if total_items else 1

    offset = (page - 1) * page_size
    query = stmt.offset(offset).limit(page_size).order_by(Laporan.created_at.desc())
    laporans = db.scalars(query).all()

    # De-identifikasi user_id demi kepatuhan PDP di ranah publik
    data_list: list[LaporanResponse] = []
    for l in laporans:
        fields = _laporan_fields(l)
        fields["user_id"] = ""
        data_list.append(LaporanResponse(**fields))

    return LaporanListResponse(
        data=data_list,
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# F4.7 (D-21) / D-30 — Fallback laporan tanpa klaster → verifikasi manual
# GET: admin/verifikator_dinas/kepala_dinas (pengawasan)
# PUT: admin/verifikator_dinas (eksekusi verifikasi teknis)
# ─────────────────────────────────────────────────────────────────────────────

require_review_read = RoleChecker(["admin", "verifikator_dinas", "kepala_dinas"])
require_review_write = RoleChecker(["admin", "verifikator_dinas"])


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
    _: User = Depends(require_review_read),
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
                "sumber_kondisi": lap.sumber_kondisi,
                "status_konfirmasi": lap.status_konfirmasi,
                "konfirmasi_perlu_dijawab": lap.status_konfirmasi == "menunggu",
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
    current_user: User = Depends(require_review_write),
):
    """F4.7 (D-21) / D-30 — Verifikasi manual per laporan oleh admin/verifikator_dinas.

    Update kolom `status_sanggahan` (menunggu | divalidasi | ditolak).
    Nilai di luar enum ditolak 422 (divalidasi manual, bukan Pydantic —
    handler global mengubah error validasi Pydantic menjadi 400).
    """
    if payload.status not in STATUS_SANGGHAN_ENUM:
        # F4.11 (DBG-011): code eksplisit — kontrak INTERFACES §4 mewajibkan
        # `422 UNPROCESSABLE_ENTITY`, bukan `REASON_REQUIRED` (peta status 422).
        raise ApiError(
            status_code=422,
            code="UNPROCESSABLE_ENTITY",
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

    # D-24: prior global — satu sumber untuk semua sekolah pada request ini.
    prior = compute_prior(laporan_per_sekolah)

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
            laps,
            dapodik_per_sekolah.get(sek.npsn, dict(kosong)),
            prior=prior,
            k=settings.SHRINKAGE_K,
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
                "mismatch": is_mismatch(k["skor_laporan"], k["skor_dapodik"]),
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
                "jumlah_mismatch": sum(
                    1 for row in sekolah_data if row["mismatch"]
                ),
                "prior": round(prior, 1),
                "k": settings.SHRINKAGE_K,
                "total_laporan": len(laporan_rows),
                "ruang_rusak_berat": sum(v["rusak_berat"] for v in per_jenis.values()),
                "distribusi_kondisi": distribusi,
                "dampak_per_jenis_ruang": dampak_per_jenis,
            },
            "sekolah": sekolah_data,
        }
    }


@router.get("/{laporan_id}/konfirmasi")
def get_konfirmasi(
    laporan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """F4.15 — pertanyaan konfirmasi severity untuk pemilik laporan.

    Sekali ambil (opsi kontrak #1). Laporan lama (`status_konfirmasi IS NULL`)
    dianggap `dilewati`; laporan yang sudah lewat 24 jam ditransisikan malas.
    """
    laporan = _laporan_milik(db, laporan_id, user)
    _expire_konfirmasi(laporan, db)

    status_konfirmasi = laporan.status_konfirmasi or "dilewati"
    if status_konfirmasi == "menunggu":
        pertanyaan = pilih_pertanyaan(laporan.deskripsi)
    else:
        pertanyaan = []

    jawaban = (laporan.jawaban_konfirmasi or {}).get("jawaban", [])
    return {
        "data": {
            "laporan_id": laporan.id,
            "status": status_konfirmasi,
            "jumlah_terjawab": len(jawaban),
            "pertanyaan": pertanyaan,
        }
    }


@router.post("/{laporan_id}/konfirmasi")
def post_konfirmasi(
    laporan_id: str,
    payload: KonfirmasiRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """F4.15 — simpan jawaban, hitung severity, kunci laporan (409 bila ulang).

    `jawaban: []` = warga melewati. Nilai warga selalu menang atas ekstraksi
    deskripsi; `sumber_kondisi` tetap `ai` karena AI yang menerjemahkan
    jawaban menjadi enum (SPEC §17.2).
    """
    laporan = _laporan_milik(db, laporan_id, user)
    _expire_konfirmasi(laporan, db)

    if laporan.status_konfirmasi != "menunggu":
        raise ApiError(
            409, "CONFLICT", "Konfirmasi laporan ini sudah dijawab atau dilewati"
        )

    pertanyaan = pilih_pertanyaan(laporan.deskripsi)
    bank = {q["kode"]: q for q in pertanyaan}

    terlihat: set[str] = set()
    for jawaban in payload.jawaban:
        if jawaban.kode in terlihat:
            raise ApiError(
                422, "UNPROCESSABLE_ENTITY", f"Kode {jawaban.kode} dijawab lebih dari sekali"
            )
        terlihat.add(jawaban.kode)

        if jawaban.kode == "bagian":
            if jawaban.nilai not in KOMPONEN:
                raise ApiError(
                    422, "UNPROCESSABLE_ENTITY", f"Bagian tidak dikenal: {jawaban.nilai}"
                )
            continue

        if jawaban.kode not in bank:
            raise ApiError(
                422, "UNPROCESSABLE_ENTITY", f"Pertanyaan tidak dikenal: {jawaban.kode}"
            )
        if cari_pilihan(jawaban.kode, jawaban.nilai) is None:
            raise ApiError(
                422,
                "UNPROCESSABLE_ENTITY",
                f"Pilihan {jawaban.nilai} tidak valid untuk {jawaban.kode}",
            )

    tingkat = []
    for jawaban in payload.jawaban:
        pilihan = cari_pilihan(jawaban.kode, jawaban.nilai)
        if pilihan is not None:
            tingkat.append(pilihan["tingkat"])
    kondisi = severity_tertinggi(tingkat)

    diproses = datetime.now(timezone.utc).replace(tzinfo=None)
    status_baru = "dilewati" if not payload.jawaban else "terjawab"

    laporan.status_konfirmasi = status_baru
    laporan.jawaban_konfirmasi = {
        "jawaban": [j.model_dump() for j in payload.jawaban],
        "diproses_pada": diproses.isoformat(),
    }
    if kondisi is not None:
        laporan.kondisi_dilaporkan = kondisi
        laporan.sumber_kondisi = "ai"

    db.commit()
    db.refresh(laporan)

    return {
        "data": {
            "status": status_baru,
            "kondisi_dilaporkan": laporan.kondisi_dilaporkan,
            "sumber_kondisi": laporan.sumber_kondisi,
            "diproses_pada": diproses.isoformat(),
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

    # Ambil klaster bila terasosiasi
    klaster = db.scalar(select(Klaster).where(Klaster.id == laporan.klaster_id)) if laporan.klaster_id else None

    return {"data": LaporanDetailResponse(
        **_laporan_fields(laporan, klaster),
        sekolah=sekolah_data,
        foto=foto_data,
    )}