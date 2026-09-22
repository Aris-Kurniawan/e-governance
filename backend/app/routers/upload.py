"""Router untuk upload file (foto laporan ke MinIO/S3)."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.storage import storage_client
from app.models.laporan import Laporan, LaporanFoto
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/laporan", status_code=status.HTTP_201_CREATED)
def upload_laporan_foto(
    file: UploadFile,
    laporan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload foto untuk laporan tertentu."""
    # Cek laporan ada dan user punya akses
    laporan = db.scalar(select(Laporan).where(Laporan.id == laporan_id))
    if not laporan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laporan dengan ID {laporan_id} tidak ditemukan",
        )

    is_owner = laporan.user_id == user.id
    is_dinas = user.role in ["verifikator_dinas", "kepala_dinas", "admin"]
    if not (is_owner or is_dinas):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pemilik laporan yang bisa upload foto",
        )

    # Validasi file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File harus berupa gambar (JPEG/PNG)",
        )

    if file.size and file.size > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ukuran file terlalu besar (max 5MB)",
        )

    # Upload ke MinIO
    file_name = f"laporan/{laporan_id}/{file.filename}"
    file_content = file.file.read()

    stored_name = storage_client.upload_file(
        file_content,
        file_name,
        content_type=file.content_type,
    )

    if not stored_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal upload ke MinIO",
        )

    # Simpan ke database
    foto = LaporanFoto(
        laporan_id=laporan_id,
        storage_key=stored_name,
    )
    db.add(foto)
    db.commit()
    db.refresh(foto)

    return {
        "data": {
            "id": foto.id,
            "laporan_id": laporan_id,
            "storage_key": stored_name,
            "url": storage_client.get_file_url(stored_name),
            "created_at": foto.created_at,
        }
    }


@router.delete("/{storage_key}")
def delete_file(
    storage_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete file dari MinIO."""
    # Cek file ada dan user punya akses
    foto = db.scalar(select(LaporanFoto).where(LaporanFoto.storage_key == storage_key))
    if not foto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {storage_key} tidak ditemukan",
        )

    laporan = db.scalar(select(Laporan).where(Laporan.id == foto.laporan_id))
    if not laporan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laporan tidak ditemukan",
        )

    is_owner = laporan.user_id == user.id
    is_dinas = user.role in ["verifikator_dinas", "kepala_dinas", "admin"]
    if not (is_owner or is_dinas):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pemilik laporan yang bisa delete foto",
        )

    # Delete dari MinIO
    if not storage_client.delete_file(storage_key):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal delete dari MinIO",
        )

    # Delete dari database
    db.delete(foto)
    db.commit()

    return {"data": {"message": "File berhasil dihapus"}}