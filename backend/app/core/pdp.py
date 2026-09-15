"""PDP Vault Helper — enkripsi/dekripsi NIK (AES-256-GCM).

Satu-satunya modul yang boleh mengakses tabel `pdp_vault` secara langsung.
Kunci diambil dari environment `PDP_ENCRYPTION_KEY` lalu di-derive ke 32 byte
via SHA-256, sehingga bisa menerima passphrase apa pun (tidak terikat format
Fernet).

Format ciphertext tersimpan (bytes): nonce(12) || tag(16) || ciphertext.
"""

import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import PdpVault

NONCE_SIZE = 12
TAG_SIZE = 16


def _derive_key(passphrase: str) -> bytes:
    """Turunkan kunci 32 byte (AES-256) dari passphrase."""
    if not passphrase:
        raise ValueError("PDP_ENCRYPTION_KEY belum diisi di environment")
    return hashlib.sha256(passphrase.encode("utf-8")).digest()


def encrypt_nik(plain: str) -> bytes:
    """Enkripsi NIK. Kembalikan nonce || tag || ciphertext."""
    if not plain:
        raise ValueError("NIK tidak boleh kosong")
    aesgcm = AESGCM(_derive_key(settings.PDP_ENCRYPTION_KEY))
    nonce = os.urandom(NONCE_SIZE)
    # AESGCM.encrypt mengembalikan ciphertext || tag.
    ct_and_tag = aesgcm.encrypt(nonce, plain.encode("utf-8"), None)
    ciphertext, tag = ct_and_tag[:-TAG_SIZE], ct_and_tag[-TAG_SIZE:]
    return nonce + tag + ciphertext


def decrypt_nik(cipher: bytes) -> str:
    """Dekripsi NIK dari format nonce || tag || ciphertext."""
    if len(cipher) < NONCE_SIZE + TAG_SIZE:
        raise ValueError("Ciphertext tidak valid")
    nonce = cipher[:NONCE_SIZE]
    tag = cipher[NONCE_SIZE : NONCE_SIZE + TAG_SIZE]
    ciphertext = cipher[NONCE_SIZE + TAG_SIZE :]
    aesgcm = AESGCM(_derive_key(settings.PDP_ENCRYPTION_KEY))
    plain = aesgcm.decrypt(nonce, ciphertext + tag, None)
    return plain.decode("utf-8")


def simpan_nik(db: Session, user_id: str, nik: str) -> PdpVault:
    """Simpan NIK terenkripsi untuk seorang user (upsert)."""
    vault = db.get(PdpVault, user_id)
    if vault is None:
        vault = PdpVault(user_id=user_id, nik_encrypted=encrypt_nik(nik))
        db.add(vault)
    else:
        vault.nik_encrypted = encrypt_nik(nik)
    db.commit()
    db.refresh(vault)
    return vault


def ambil_nik(db: Session, user_id: str) -> str | None:
    """Ambil & dekripsi NIK user. None kalau tidak ada."""
    vault = db.scalar(select(PdpVault).where(PdpVault.user_id == user_id))
    if vault is None:
        return None
    return decrypt_nik(vault.nik_encrypted)