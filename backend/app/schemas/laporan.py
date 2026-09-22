"""Schema Pydantic untuk Laporan."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LaporanCreateRequest(BaseModel):
    """Request untuk membuat laporan baru."""

    sekolah_npsn: str = Field(..., description="NPSN sekolah")
    kategori: str = Field(..., description="Kategori: infrastruktur_sarana, ketersediaan_tenaga_pengajar, lainnya")
    fasilitas_terkait: Optional[str] = Field(None, description="Nama fasilitas/ruang")
    kondisi_dilaporkan: Optional[str] = Field(None, description="baik, rusak_ringan, rusak_sedang, rusak_berat")
    deskripsi: str = Field(..., description="Deskripsi masalah")


model_config = {"from_attributes": True}


class LaporanResponse(BaseModel):
    """Response dasar untuk laporan."""

    id: str
    tracking_id: str
    user_id: str
    sekolah_npsn: str
    kategori: str
    fasilitas_terkait: Optional[str]
    kondisi_dilaporkan: Optional[str]
    deskripsi: str
    status_sanggahan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LaporanDetailResponse(LaporanResponse):
    """Response detail laporan (extend LaporanResponse)."""

    sekolah: Optional[dict] = None
    foto: list[dict] = []

    model_config = {"from_attributes": True}


class LaporanListResponse(BaseModel):
    """Response untuk list laporan dengan pagination."""

    data: list[LaporanResponse]
    meta: dict

    model_config = {"from_attributes": True}