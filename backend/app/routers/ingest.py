"""Router untuk ingest data CSV Dapodik."""

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import RoleChecker, get_current_user
from app.models.logs import IngestJob
from app.models.sekolah import KondisiSarana, Sekolah
from app.models.user import User

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/dapodik", status_code=status.HTTP_201_CREATED)
def ingest_dapodik_csv(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(RoleChecker(["admin", "verifikator_dinas"])),
):
    """Upload CSV Dapodik untuk di-ingest ke database."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File harus berformat CSV",
        )

    # Buat ingest job
    job = IngestJob(
        file_name=file.filename,
        status="diproses",
        uploaded_by=user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        # Baca CSV
        file_content = file.file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(file_content))

        baris_diproses = 0
        baris_gagal = 0

        for row in reader:
            try:
                npsn = row.get("npsn", "").strip()
                if not npsn:
                    baris_gagal += 1
                    continue

                # Cek apakah sekolah sudah ada
                sekolah = db.scalar(select(Sekolah).where(Sekolah.npsn == npsn))
                if not sekolah:
                    # Insert sekolah baru
                    sekolah = Sekolah(
                        npsn=npsn,
                        nama=row.get("nama_sekolah", "Unknown"),
                        alamat=row.get("alamat", ""),
                        jenjang=row.get("jenjang", "SD").upper(),
                        status_sekolah=row.get("status_sekolah"),
                        kecamatan=row.get("kecamatan"),
                        desa_kelurahan=row.get("desa_kelurahan"),
                        akreditasi=row.get("akreditasi"),
                        nama_kepsek=row.get("nama_kepsek"),
                        sumber_data="Dapodik",
                        tanggal_pembaruan_data=datetime.now().date(),
                    )
                    db.add(sekolah)
                    db.flush()

                # Update/Insert kondisi sarana
                jenis_sarana = [
                    "ruang_kelas",
                    "perpustakaan",
                    "lab_ipa",
                    "lab_komputer",
                    "uks",
                    "wc",
                    "tempat_ibadah",
                ]

                for sarana in jenis_sarana:
                    kondisi = db.scalar(
                        select(KondisiSarana).where(
                            (KondisiSarana.sekolah_npsn == npsn)
                            & (KondisiSarana.nama_ruang == sarana)
                            & (KondisiSarana.sumber == "dapodik")
                        )
                    )

                    jumlah = int(row.get(f"{sarana}_jumlah", 0) or 0)
                    baik = int(row.get(f"{sarana}_baik", 0) or 0)
                    ringan = int(row.get(f"{sarana}_rusak_ringan", 0) or 0)
                    sedang = int(row.get(f"{sarana}_rusak_sedang", 0) or 0)
                    berat = int(row.get(f"{sarana}_rusak_berat", 0) or 0)

                    if kondisi:
                        kondisi.jumlah = jumlah
                        kondisi.kondisi_baik = baik
                        kondisi.kondisi_rusak_ringan = ringan
                        kondisi.kondisi_rusak_sedang = sedang
                        kondisi.kondisi_rusak_berat = berat
                    else:
                        if jumlah > 0:
                            kondisi = KondisiSarana(
                                sekolah_npsn=npsn,
                                nama_ruang=sarana,
                                jumlah=jumlah,
                                kondisi_baik=baik,
                                kondisi_rusak_ringan=ringan,
                                kondisi_rusak_sedang=sedang,
                                kondisi_rusak_berat=berat,
                                sumber="dapodik",
                            )
                            db.add(kondisi)

                baris_diproses += 1
            except Exception as e:
                print(f"Error processing row: {e}")
                baris_gagal += 1

        db.commit()

        # Update job status
        job.status = "selesai"
        job.baris_diproses = baris_diproses
        job.baris_gagal = baris_gagal
        job.completed_at = datetime.now()
        db.commit()

        return {
            "data": {
                "job_id": job.id,
                "status": "selesai",
                "baris_diproses": baris_diproses,
                "baris_gagal": baris_gagal,
                "completed_at": job.completed_at,
            }
        }

    except Exception as e:
        job.status = "gagal"
        job.completed_at = datetime.now()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CSV: {str(e)}",
        )


@router.get("/riwayat")
def riwayat_ingest(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(RoleChecker(["admin", "verifikator_dinas"])),
):
    """Riwayat job ingest CSV."""
    from math import ceil
    from sqlalchemy import func

    query = select(IngestJob).order_by(IngestJob.created_at.desc())

    total_items = db.scalar(select(func.count()).select_from(query.subquery()))
    total_pages = ceil(total_items / page_size) if total_items else 1

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    jobs = db.scalars(query).all()

    return {
        "data": [
            {
                "id": j.id,
                "file_name": j.file_name,
                "status": j.status,
                "baris_diproses": j.baris_diproses,
                "baris_gagal": j.baris_gagal,
                "completed_at": j.completed_at,
                "created_at": j.created_at,
            }
            for j in jobs
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        },
    }