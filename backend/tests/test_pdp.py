"""Unit test PDP Vault (`app/core/pdp.py`)."""

import pytest

from app.core import pdp
from app.core.config import settings


@pytest.fixture(autouse=True)
def _key(monkeypatch):
    monkeypatch.setattr(settings, "PDP_ENCRYPTION_KEY", "kunci-uji-simakis")


def test_encrypt_decrypt_roundtrip():
    nik = "3513010101900001"
    cipher = pdp.encrypt_nik(nik)
    assert isinstance(cipher, bytes)
    assert nik.encode() not in cipher  # tidak bocor plaintext
    assert pdp.decrypt_nik(cipher) == nik


def test_encrypt_produces_different_ciphertext():
    """Nonce acak → ciphertext beda tiap kali."""
    nik = "3513010101900001"
    assert pdp.encrypt_nik(nik) != pdp.encrypt_nik(nik)


def test_decrypt_tampered_fails():
    cipher = bytearray(pdp.encrypt_nik("3513010101900001"))
    cipher[-1] ^= 0xFF  # rusak 1 byte → GCM harus menolak
    from cryptography.exceptions import InvalidTag

    with pytest.raises(InvalidTag):
        pdp.decrypt_nik(bytes(cipher))


def test_empty_input_rejected():
    with pytest.raises(ValueError):
        pdp.encrypt_nik("")


def test_missing_key_rejected(monkeypatch):
    monkeypatch.setattr(settings, "PDP_ENCRYPTION_KEY", "")
    with pytest.raises(ValueError):
        pdp.encrypt_nik("3513010101900001")


def test_short_ciphertext_rejected():
    with pytest.raises(ValueError):
        pdp.decrypt_nik(b"too-short")


def test_simpan_dan_ambil_nik():
    """Uji simpan/ambil lewat SQLite in-memory."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.models import Base
    from app.models.user import User

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    user = User(nama="Warga Uji", email="uji@example.com", password_hash="x")
    db.add(user)
    db.commit()

    pdp.simpan_nik(db, user.id, "3513010101900001")
    assert pdp.ambil_nik(db, user.id) == "3513010101900001"

    pdp.simpan_nik(db, user.id, "3513010101900002")  # upsert
    assert pdp.ambil_nik(db, user.id) == "3513010101900002"
    assert pdp.ambil_nik(db, "tidak-ada") is None