"""Router untuk auth endpoints."""

from datetime import timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import deps, pdp
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas import auth as auth_schema

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: auth_schema.RegisterRequest, db: Session = Depends(get_db)
):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=400, detail="Email already taken")
    
    # Simpan user
    user = User(
        nama=payload.nama,
        email=payload.email,
        password_hash=deps.hash_password(payload.password),
        sekolah_terkait_npsn=payload.sekolah_terkait_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Simpan NIK terenkripsi
    pdp.simpan_nik(db, user.id, payload.nik)

    return {"data": {"user_id": user.id, "status_verifikasi": user.status_verifikasi}}


@router.post("/login")
def login(payload: auth_schema.LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not deps.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access = deps.create_token({"sub": user.id, "type": "access"})
    refresh = deps.create_token(
        {"sub": user.id, "type": "refresh"}, 
        expires_delta=timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    )
    
    return {
        "data": {
            "access_token": access,
            "refresh_token": refresh,
            "role": user.role,
            "status_verifikasi": user.status_verifikasi
        }
    }


@router.post("/refresh")
def refresh(payload: auth_schema.RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload_data = jwt.decode(
            payload.refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload_data.get("type") != "refresh":
            raise jwt.PyJWTError
        user_id = payload_data.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = deps.create_token({"sub": user.id, "type": "access"})
    new_refresh = deps.create_token(
        {"sub": user.id, "type": "refresh"},
        expires_delta=timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    )

    return {
        "data": {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "role": user.role,
            "status_verifikasi": user.status_verifikasi
        }
    }


@router.get("/me")
def get_me(user: User = Depends(deps.get_current_user)):
    return {
        "data": {
            "id": user.id,
            "nama": user.nama,
            "email": user.email,
            "role": user.role,
            "status_verifikasi": user.status_verifikasi,
            "sekolah_terkait_npsn": user.sekolah_terkait_npsn
        }
    }
