"""Pydantic schemas untuk auth endpoints."""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    nik: str = Field(..., min_length=16, max_length=16)
    email: EmailStr
    password: str = Field(..., min_length=8)
    sekolah_terkait_id: str | None = None


class RegisterResponse(BaseModel):
    user_id: str
    status_verifikasi: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    role: str
    status_verifikasi: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    id: str
    nama: str
    email: str
    role: str
    status_verifikasi: str
    sekolah_terkait_npsn: str | None
