"""Schema Pydantic untuk Laporan."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LaporanCreateRequest(BaseModel):
    """Request untuk membuat laporan baru (teks bebas, tanpa kategori)."""

    sekolah_npsn: str = Field(..., description="NPSN sekolah")
    fasilitas_terkait: Optional[str] = Field(None, description="Nama fasilitas/ruang")
    kondisi_dilaporkan: Optional[str] = Field(None, description="baik, rusak_ringan, rusak_sedang, rusak_berat")
    deskripsi: str = Field(..., description="Deskripsi masalah (teks bebas); kategori ditentukan AI pipeline")


model_config = {"from_attributes": True}


class KonfirmasiRingkas(BaseModel):
    """Blok konfirmasi pada respons `POST /laporan` (F4.15)."""

    perlu_konfirmasi: bool
    jumlah_pertanyaan: int
    kedaluwarsa_pada: Optional[datetime] = None


class KonfirmasiJawaban(BaseModel):
    kode: str
    nilai: str


class KonfirmasiRequest(BaseModel):
    """Body `POST /laporan/{id}/konfirmasi`; `[]` berarti warga melewati."""

    jawaban: list[KonfirmasiJawaban] = Field(default_factory=list)


class LaporanResponse(BaseModel):
    """Response dasar untuk laporan."""

    id: str
    tracking_id: str
    user_id: str
    sekolah_npsn: str
    fasilitas_terkait: Optional[str]
    kondisi_dilaporkan: Optional[str]
    # F4.14: provenance nilai kondisi + status alur konfirmasi severity.
    sumber_kondisi: Optional[str] = None
    status_konfirmasi: Optional[str] = None
    # Turunan: laporan baru berstatus "menunggu" sampai warga menjawab/melewati.
    konfirmasi_perlu_dijawab: bool = False
    deskripsi: str
    status_sanggahan: str
    created_at: datetime
    # F4.15: hanya diisi pada respons POST /laporan.
    konfirmasi: Optional[KonfirmasiRingkas] = None
    klaster_id: Optional[str] = None
    status_penanganan: Optional[str] = None

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