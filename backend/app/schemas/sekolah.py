"""Schema Pydantic untuk Sekolah & Kondisi Sarana."""

from typing import Optional
from pydantic import BaseModel
from decimal import Decimal


class KondisiSaranaResponse(BaseModel):
    """Agregat kondisi sarana per jenis ruang."""

    id: str
    nama_ruang: str
    jumlah: int
    kondisi_baik: int
    kondisi_rusak_ringan: int
    kondisi_rusak_sedang: int
    kondisi_rusak_berat: int
    sumber: str
    perlu_verifikasi: bool

    model_config = {"from_attributes": True}


class SekolahResponse(BaseModel):
    """Response dasar untuk daftar sekolah."""

    npsn: str
    nama: str
    alamat: Optional[str] = None
    jenjang: str
    status_sekolah: Optional[str] = None
    jumlah_isu_aktif: int = 0
    penanda_masalah: str = "normal"

    model_config = {"from_attributes": True}


class SekolahDetailResponse(SekolahResponse):
    """Response detail sekolah (extend SekolahResponse)."""

    akreditasi: Optional[str] = None
    nama_kepsek: Optional[str] = None
    rasio_guru_siswa: Optional[str] = None
    rasio_spm_terpenuhi: bool = False
    jumlah_pd: int = 0
    jumlah_ptk: int = 0
    jumlah_rombel: int = 0
    utilitas_kapasitas_belajar: float = 0.0
    kondisi_sarana: list[KondisiSaranaResponse] = []
    ringkasan_sarpras: dict = {}
    klaster_isu: list[dict] = []

    model_config = {"from_attributes": True}


class SekolahListResponse(BaseModel):
    """Response untuk list sekolah dengan pagination."""

    data: list[SekolahResponse]
    meta: dict

    model_config = {"from_attributes": True}