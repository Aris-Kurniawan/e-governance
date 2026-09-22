"""F3.00 Setup: Admin user + Ingest CSV + Seed laporan dummy + Verify DB.

Jalankan: cd backend && ./venv/bin/python scripts/setup_f300.py
"""

import csv
import io
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import hash_password
from app.core.pdp import simpan_nik
from app.models.base import Base
from app.models.laporan import Laporan
from app.models.logs import IngestJob
from app.models.sekolah import KondisiSarana, Sekolah
from app.models.user import User

# ─── Config ──────────────────────────────────────────────────────────
ADMIN_EMAIL = "admin@simakis.id"
ADMIN_PASSWORD = "Admin123!"
ADMIN_NIK = "3524010101010001"
ADMIN_NAMA = "Admin SIMAKIS"
CSV_PATH = Path(__file__).resolve().parent.parent / "app" / "dataset" / "raw" / "sekolah_lamongan_semua.csv"

JENIS_SARANA = [
    "ruang_kelas", "perpustakaan", "lab_ipa", "lab_komputer",
    "uks", "wc_guru", "wc_siswa",
]

KATEGORI_OPTIONS = ["ruang_belajar", "sanitasi_air", "utilitas", "akses_lahan", "penunjang"]
KONDISI_OPTIONS = ["baik", "rusak_ringan", "rusak_sedang", "rusak_berat"]

LAPORAN_DESKRIPSI = {
    "ruang_belajar": [
        "Atap ruang kelas bocor saat hujan, plafon rusak di beberapa titik",
        "Lantai keramik kelas pecah dan retak, berbahaya bagi siswa",
        "Dinding kelas berlubang dan cat mengelupas, perlu renovasi",
        "Pintu kelas sudah tidak bisa ditutup dengan baik, kunci rusak",
        "Jendela kaca kelas pecah dan belum diganti sudah 6 bulan",
        "Kondisi perpustakaan memprihatinkan, buku usang dan rak rusak",
        "Laboratorium IPA tidak memiliki meja praktik yang memadai",
        "Komputer di lab sudah rusak lebih dari 50 persen",
        "Ruang kelas bocor sehingga kegiatan belajar terganggu",
        "Meja dan kursi siswa banyak yang rusak tidak bisa digunakan",
        "Papan tulis kelas sudah rusak dan diganti seadanya",
        "Ruang kelas sempit, jumlah siswa melebihi kapasitas",
        "Langit-langit kelas ambruk sebagian, belum diperbaiki",
        "Perabot kelas tidak layak, banyak kursi patah",
    ],
    "sanitasi_air": [
        "Toilet siswa rusak, tidak bisa digunakan sebagian",
        "Tidak ada air bersih di WC sekolah, siswa kesulitan",
        "Saluran pembuangan WC tersumbat dan bau menyengat",
        "Jumlah toilet sangat kurang dibanding jumlah siswa",
        "Pintu toilet rusak dan tidak ada privasi",
        "Bak air WC bocor sehingga air terbuang",
        "Tidak ada sabun dan air bersih di tempat cuci tangan",
        "WC guru dalam kondisi rusak berat, tidak layak pakai",
        "Sumber air sekolah kering saat musim kemarau",
        "Keran air di area sekolah banyak yang mati",
    ],
    "utilitas": [
        "Listrik sering padam karena instalasi kabel sudah tua",
        "Daya listrik sekolah tidak cukup untuk seluruh ruangan",
        "Tidak ada akses internet di sekolah, menghambat pembelajaran",
        "Kabel listrik terkelupas dan berbahaya bagi siswa",
        "Lampu penerangan kelas banyak yang mati",
        "Instalasi listrik belum sesuai standar keamanan",
        "Jaringan internet lambat dan sering terputus",
        "Belum ada genset cadangan saat listrik padam",
        "Stop kontak di kelas rusak dan tidak aman",
        "Tagihan listrik menunggak sehingga sempat diputus",
    ],
    "akses_lahan": [
        "Akses jalan menuju sekolah rusak parah saat musim hujan",
        "Pagar sekolah rusak di beberapa titik, keamanan terancam",
        "Halaman sekolah becek dan tergenang saat hujan",
        "Drainase sekolah tersumbat menyebabkan banjir",
        "Tidak ada jalur khusus untuk siswa disabilitas",
        "Gerbang sekolah rusak dan tidak bisa dikunci",
        "Area parkir tidak memadai dan tidak aman",
        "Talang air tersumbat menyebabkan genangan di halaman",
        "Jalan masuk sekolah berlubang dan berbahaya",
        "Batas tanah sekolah belum dipagar dengan baik",
    ],
    "penunjang": [
        "Sarana olahraga sangat terbatas, lapangan rusak",
        "Ruang UKS tidak memiliki peralatan medis memadai",
        "Tempat ibadah sekolah rusak dan tidak layak",
        "Tidak ada ruang guru yang memadai",
        "Area bermain anak tidak layak dan berbahaya",
        "Perabot ruang guru banyak yang rusak",
        "Tidak ada tempat sampah memadai di area sekolah",
        "Ruang serbaguna sekolah rusak atapnya",
        "Sarana kesenian dan ekstrakurikuler tidak tersedia",
        "Kantin sekolah tidak layak dan tidak higienis",
    ],
}

FASILITAS_MAP = {
    "ruang_belajar": ["ruang_kelas", "perpustakaan", "lab_ipa", "lab_komputer"],
    "sanitasi_air": ["wc_siswa", "wc_guru", "sumber_air", "saluran_pembuangan"],
    "utilitas": ["listrik", "internet", "penerangan", "genset"],
    "akses_lahan": ["jalan_akses", "pagar", "drainase", "halaman", "gerbang"],
    "penunjang": ["uks", "tempat_ibadah", "ruang_guru", "lapangan_olahraga", "kantin"],
}


def create_admin(db: Session) -> User:
    """Step 1: Register admin user."""
    existing = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if existing:
        print(f"  [SKIP] Admin sudah ada: {existing.email} (id={existing.id})")
        return existing

    user = User(
        nama=ADMIN_NAMA,
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role="admin",
        status_verifikasi="terverifikasi",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    simpan_nik(db, user.id, ADMIN_NIK)

    print(f"  [OK] Admin dibuat: {ADMIN_EMAIL} | password: {ADMIN_PASSWORD}")
    print(f"       user_id: {user.id}, role: admin")
    return user


def ingest_csv(db: Session) -> dict:
    """Step 2: Ingest CSV Dapodik ke tabel sekolah + kondisi_sarana."""
    if not CSV_PATH.exists():
        print(f"  [ERROR] CSV tidak ditemukan: {CSV_PATH}")
        return {"sekolah": 0, "kondisi": 0}

    file_content = CSV_PATH.read_text(encoding="utf-8")
    reader = csv.DictReader(io.StringIO(file_content))

    sekolah_count = 0
    kondisi_count = 0
    skipped = 0

    for row in reader:
        npsn = row.get("npsn", "").strip()
        if not npsn:
            skipped += 1
            continue

        existing = db.scalar(select(Sekolah).where(Sekolah.npsn == npsn))
        if existing:
            sekolah = existing
        else:
            jenjang_raw = row.get("jenjang", "SD").upper()
            if jenjang_raw not in ("SD", "SMP", "SMA", "SMK"):
                jenjang_raw = "SD"

            akreditasi_raw = (row.get("akreditasi") or "").strip()
            if akreditasi_raw in ("Tidak diisi", ""):
                akreditasi_raw = None
            elif len(akreditasi_raw) > 5:
                akreditasi_raw = akreditasi_raw[:5]

            status_raw = (row.get("status_sekolah") or "").strip()
            if status_raw not in ("Negeri", "Swasta"):
                status_raw = None

            sekolah = Sekolah(
                npsn=npsn,
                sekolah_id=row.get("sekolah_id"),
                nama=row.get("nama", "Unknown")[:255],
                alamat=(row.get("alamat_jalan") or "")[:500],
                jenjang=jenjang_raw,
                status_sekolah=status_raw,
                kecamatan=row.get("kecamatan"),
                desa_kelurahan=row.get("desa_kelurahan"),
                akreditasi=akreditasi_raw,
                nama_kepsek=(row.get("nama_kepsek") or "")[:255],
                sumber_data="Dapodik",
                tanggal_pembaruan_data=datetime.now().date(),
            )
            db.add(sekolah)
            db.flush()
            sekolah_count += 1

        # Kondisi sarana dari kolom CSV
        sarana_mapping = {
            "ruang_kelas": ("ruang_kelas", "kelas_baik", "kelas_ringan", "kelas_sedang", "kelas_berat"),
            "perpustakaan": ("perpus", "perpus_baik", "perpus_ringan", "perpus_sedang", "perpus_berat"),
            "lab_ipa": ("lab_ipa", "lab_ipa_baik", "lab_ipa_ringan", "lab_ipa_sedang", "lab_ipa_berat"),
            "lab_komputer": ("lab_kom", "lab_kom_baik", "lab_kom_ringan", "lab_kom_sedang", "lab_kom_berat"),
            "uks": ("r_uks", "r_uks_baik", "r_uks_ringan", "r_uks_sedang", "r_uks_berat"),
            "wc_guru": ("wc_guru", "wc_guru_baik", "wc_guru_ringan", "wc_guru_sedang", "wc_guru_berat"),
            "wc_siswa": ("wc_siswa", "wc_siswa_baik", "wc_siswa_ringan", "wc_siswa_sedang", "wc_siswa_berat"),
        }

        for nama_ruang, (col_jumlah, col_baik, col_ringan, col_sedang, col_berat) in sarana_mapping.items():
            jumlah = int(row.get(col_jumlah, 0) or 0)
            if jumlah <= 0:
                continue

            kondisi = db.scalar(
                select(KondisiSarana).where(
                    (KondisiSarana.sekolah_npsn == npsn)
                    & (KondisiSarana.nama_ruang == nama_ruang)
                    & (KondisiSarana.sumber == "dapodik")
                )
            )

            baik = int(row.get(col_baik, 0) or 0)
            ringan = int(row.get(col_ringan, 0) or 0)
            sedang = int(row.get(col_sedang, 0) or 0)
            berat = int(row.get(col_berat, 0) or 0)

            if kondisi:
                kondisi.jumlah = jumlah
                kondisi.kondisi_baik = baik
                kondisi.kondisi_rusak_ringan = ringan
                kondisi.kondisi_rusak_sedang = sedang
                kondisi.kondisi_rusak_berat = berat
            else:
                kondisi = KondisiSarana(
                    sekolah_npsn=npsn,
                    nama_ruang=nama_ruang,
                    jumlah=jumlah,
                    kondisi_baik=baik,
                    kondisi_rusak_ringan=ringan,
                    kondisi_rusak_sedang=sedang,
                    kondisi_rusak_berat=berat,
                    sumber="dapodik",
                )
                db.add(kondisi)
                kondisi_count += 1

    db.commit()

    print(f"  [OK] Sekolah baru: {sekolah_count}, KondisiSarana baru: {kondisi_count}, Skip: {skipped}")
    return {"sekolah": sekolah_count, "kondisi": kondisi_count}


def seed_laporan(db: Session, admin_user: User) -> int:
    """Step 3: Seed ~100 dummy laporan ke sekolah yang ada."""
    existing_count = db.scalar(select(func.count()).select_from(Laporan))
    if existing_count and existing_count >= 100:
        print(f"  [SKIP] Sudah ada {existing_count} laporan, tidak perlu seed")
        return existing_count

    npsn_list = [s.npsn for s in db.scalars(select(Sekolah)).all()]
    if not npsn_list:
        print("  [ERROR] Tidak ada sekolah di DB, jalankan ingest CSV dulu")
        return 0

    laporan_count = 0
    used_ids = set()

    # Distribusi merata: 20 laporan per kategori (5 kategori x 20 = 100)
    for i, kategori in enumerate([k for k in KATEGORI_OPTIONS for _ in range(100 // len(KATEGORI_OPTIONS))]):
        npsn = random.choice(npsn_list)
        kondisi = random.choice(KONDISI_OPTIONS)

        deskripsi = random.choice(LAPORAN_DESKRIPSI[kategori])
        fasilitas = random.choice(FASILITAS_MAP[kategori])

        # Tracking ID unik
        tracking_id = f"TRK-{2026}-{i+1:04d}"
        while tracking_id in used_ids:
            i += 1
            tracking_id = f"TRK-{2026}-{i+1:04d}"
        used_ids.add(tracking_id)

        laporan = Laporan(
            tracking_id=tracking_id,
            user_id=admin_user.id,
            sekolah_npsn=npsn,
            kategori=kategori,
            fasilitas_terkait=fasilitas,
            kondisi_dilaporkan=kondisi,
            deskripsi=deskripsi,
            status_sanggahan="menunggu",
        )
        db.add(laporan)
        laporan_count += 1

    db.commit()
    print(f"  [OK] {laporan_count} laporan dummy ditambahkan ke {len(npsn_list)} sekolah")
    return laporan_count


def verify_db(db: Session):
    """Step 4: Verifikasi semua data terisi."""
    print("\n" + "=" * 50)
    print("VERIFIKASI DATABASE")
    print("=" * 50)

    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    sekolah_count = db.scalar(select(func.count()).select_from(Sekolah)) or 0
    sarana_count = db.scalar(select(func.count()).select_from(KondisiSarana)) or 0
    laporan_count = db.scalar(select(func.count()).select_from(Laporan)) or 0

    print(f"  Users        : {user_count}")
    print(f"  Sekolah      : {sekolah_count}")
    print(f"  KondisiSarana: {sarana_count}")
    print(f"  Laporan      : {laporan_count}")

    # Breakdown by jenjang
    for j in ["SD", "SMP", "SMA", "SMK"]:
        count = db.scalar(select(func.count()).select_from(Sekolah).where(Sekolah.jenjang == j))
        print(f"    {j}: {count}")

    # Breakdown laporan by kategori
    for k in KATEGORI_OPTIONS:
        count = db.scalar(select(func.count()).select_from(Laporan).where(Laporan.kategori == k))
        print(f"  Laporan [{k}]: {count}")

    all_ok = True
    if sekolah_count < 62:
        print(f"\n  [FAIL] Sekolah {sekolah_count} < 62")
        all_ok = False
    if laporan_count < 100:
        print(f"\n  [FAIL] Laporan {laporan_count} < 100")
        all_ok = False

    if all_ok:
        print("\n  [PASS] Semua data siap untuk Fase 3!")
    return all_ok


def main():
    print("=" * 60)
    print("F3.00 SETUP: Admin + CSV Ingest + Seed Laporan")
    print("=" * 60)

    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as db:
        print("\n[1/4] Register admin user...")
        admin = create_admin(db)

        print("\n[2/4] Ingest CSV Dapodik...")
        ingest_csv(db)

        print("\n[3/4] Seed dummy laporan (~100)...")
        seed_laporan(db, admin)

        success = verify_db(db)

    print("\n" + "=" * 60)
    if success:
        print("F3.00 SETUP SELESAI — Siap untuk F3.0a (Manual Clustering)")
    else:
        print("F3.00 SETUP SELESAI — Perlu perbaikan data")
    print("=" * 60)


if __name__ == "__main__":
    main()
