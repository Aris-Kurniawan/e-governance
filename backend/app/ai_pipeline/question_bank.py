"""F4.15 — Bank pertanyaan konfirmasi severity (lapis 1).

AI **hanya memilih** pertanyaan dari bank ini; kalimat pertanyaan ditulis manusia
dan diturunkan dari tabel "Kriteria Penentuan Tingkat Kerusakan" (Dirjen
PAUDDIKDASMEN, lihat `docs/backend/SPEC_SEVERITY_KLASIFIKASI.md` §15.3–15.5).

Struktur per laporan: 1 pertanyaan ``bagian`` + maksimal 3 pertanyaan gejala
(komponen yang terdeteksi dari deskripsi, ditambah pertanyaan struktural bila
deskripsi memuat pemicu §15.5).

Semua teks memakai nama awam. Pemetaan ke istilah teknis disimpan di sini dan
tidak pernah dikirim sebagai pilihan ke warga.
"""

from __future__ import annotations

# Urutan ini juga dipakai sebagai tie-breaker deteksi komponen.
KOMPONEN: dict[str, dict] = {
    "plafon": {
        "label": "Plafon / langit-langit",
        "teknis": ["plafond", "rangka plafond"],
        "kata_kunci": ["plafon", "plafond", "langit-langit", "langit langit"],
    },
    "atap": {
        "label": "Atap",
        "teknis": ["penutup atap", "struktur rangka", "gording"],
        "kata_kunci": ["atap", "genteng", "gording", "talang", "tiris", "bocor"],
    },
    "dinding": {
        "label": "Dinding",
        "teknis": ["dinding"],
        "kata_kunci": ["dinding", "plester", "plesteran", "cat dinding", "tembok"],
    },
    "lantai": {
        "label": "Lantai",
        "teknis": ["lantai", "pelat lantai"],
        "kata_kunci": ["lantai", "keramik", "ubin", "pelat lantai"],
    },
    "pintu_jendela": {
        "label": "Pintu / jendela",
        "teknis": ["jendela (kaca)", "pintu", "kusen"],
        "kata_kunci": [
            "pintu",
            "jendela",
            "kaca",
            "kusen",
            "kunci",
            "daun pintu",
            "teralis",
        ],
    },
    "listrik": {
        "label": "Listrik / lampu",
        "teknis": ["instalasi listrik"],
        "kata_kunci": [
            "listrik",
            "lampu",
            "kabel",
            "kontak",
            "stop kontak",
            "instalasi",
            "penerangan",
            "armatur",
            "genset",
        ],
    },
    "air": {
        "label": "Air / kran / WC",
        "teknis": ["instalasi air"],
        "kata_kunci": [
            "air",
            "kran",
            "keran",
            "wc",
            "toilet",
            "pipa",
            "pompa",
            "bak air",
            "kamar mandi",
        ],
    },
    "drainase": {
        "label": "Saluran air kotor",
        "teknis": ["drainase limbah"],
        "kata_kunci": [
            "drainase",
            "saluran",
            "selokan",
            "got",
            "tersumbat",
            "genangan",
            "limbah",
        ],
    },
}

# Gejala disusun dari yang paling parah. `tingkat` memakai enum resmi;
# dua baris teratas sama-sama `rusak_berat` karena dokumen membedakan
# "Rusak Sangat Berat" dan "Rusak Berat" tetapi enum aplikasi hanya punya
# `rusak_berat`. `g0` adalah jalan keluar eksplisit "tidak ada gejala".
GEJALA: dict[str, list[dict]] = {
    "plafon": [
        {
            "kode": "g4",
            "teks": "Apakah ada bagian plafon yang sudah jatuh?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Rangka langit-langit runtuh",
        },
        {
            "kode": "g3",
            "teks": "Apakah plafon terlihat melengkung atau melendut ke bawah?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Penutup langit-langit melendut sangat besar",
        },
        {
            "kode": "g2",
            "teks": "Apakah ada bagian plafon yang sudah lepas dari rangkanya?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Penutup bukaan langit-langit terlepas",
        },
        {
            "kode": "g1",
            "teks": "Apakah cat plafon terlihat mengelupas meluas?",
            "tingkat_resmi": "Rusak Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Perubahan pada lapisan cat meluas",
        },
    ],
    "atap": [
        {
            "kode": "g4",
            "teks": "Apakah rangka atap sudah runtuh atau tertekuk?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Rangka atap runtuh / komponen struktur tertekuk",
        },
        {
            "kode": "g3",
            "teks": "Apakah penutup atap melendut sangat besar?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Penutup atap melendut sangat besar",
        },
        {
            "kode": "g2",
            "teks": "Apakah ada bocoran yang meluas saat hujan?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Bocoran meluas",
        },
        {
            "kode": "g1",
            "teks": "Apakah ada genteng yang terlepas dari dudukannya?",
            "tingkat_resmi": "Rusak Sangat Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Genteng terlepas dari dudukannya",
        },
    ],
    "dinding": [
        {
            "kode": "g4",
            "teks": "Apakah ada bagian dinding yang runtuh?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Dinding runtuh",
        },
        {
            "kode": "g3",
            "teks": "Apakah plesteran dinding terkelupas meluas dan berlumut?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Lapisan terkelupas meluas, berlumut",
        },
        {
            "kode": "g2",
            "teks": "Apakah retakan dinding sudah lebar atau dinding partisi terlepas?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Dinding retakan meluas (1-2 mm)",
        },
        {
            "kode": "g1",
            "teks": "Apakah retakan permukaan dinding terlihat jelas?",
            "tingkat_resmi": "Rusak Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Retakan permukaan dinding terlihat jelas",
        },
    ],
    "lantai": [
        {
            "kode": "g4",
            "teks": "Apakah lantai sudah meledak atau terlepas?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Lantai meledak, terlepas",
        },
        {
            "kode": "g3",
            "teks": "Apakah lantai melendut atau retak sampai tembus?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Lantai melendut, retak tembus",
        },
        {
            "kode": "g2",
            "teks": "Apakah penutup lantai sebagian terlepas?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Penutup lantai sebagian terlepas",
        },
        {
            "kode": "g1",
            "teks": "Apakah penutup lantai tergores?",
            "tingkat_resmi": "Rusak Sangat Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Penutup lantai gores",
        },
    ],
    "pintu_jendela": [
        {
            "kode": "g4",
            "teks": "Apakah rangka pintu/jendela keropos dimakan rayap?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Kusen keropos dimakan rayap",
        },
        {
            "kode": "g3",
            "teks": "Apakah rangka pintu/jendela keropos akibat air?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Rangka bukaan atau kusen keropos akibat air",
        },
        {
            "kode": "g2",
            "teks": "Apakah kaca pintu/jendela sudah retak lebar?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Penutup bukaan (retak lebar)",
        },
        {
            "kode": "g1",
            "teks": "Apakah warna rangka pintu/jendela mulai berubah?",
            "tingkat_resmi": "Rusak Sangat Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Perubahan warna pada sebagian lapisan rangka",
        },
    ],
    "listrik": [
        {
            "kode": "g4",
            "teks": "Apakah seluruh ruangan tidak berlistrik?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": ">50% instalasi baru; seluruh armatur rusak",
        },
        {
            "kode": "g3",
            "teks": "Apakah beberapa ruangan gelap karena listrik mati?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": ">50% dari instalasi baru",
        },
        {
            "kode": "g2",
            "teks": "Apakah ada kabel terkelupas atau percikan api?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "20-50% dari biaya instalasi baru",
        },
        {
            "kode": "g1",
            "teks": "Apakah beberapa lampu/kontak tidak berfungsi?",
            "tingkat_resmi": "Rusak Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "5-20% dari biaya instalasi baru",
        },
    ],
    "air": [
        {
            "kode": "g4",
            "teks": "Apakah kran dan pompa air tidak berfungsi sama sekali?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Pompa rusak total, motor terbakar",
        },
        {
            "kode": "g3",
            "teks": "Apakah pipa utama bocor atau beberapa kran mati?",
            "tingkat_resmi": "Rusak Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Pipa utama bocor; beberapa keran tidak berfungsi",
        },
        {
            "kode": "g2",
            "teks": "Apakah pompa atau keran perlu diganti/diperbaiki?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Pompa, motor, pipa, dan keran rusak",
        },
        {
            "kode": "g1",
            "teks": "Apakah ada kebocoran kecil di kran atau pipa yang terlihat?",
            "tingkat_resmi": "Rusak Sangat Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Kebocoran pipa terbatas di tempat yang terlihat",
        },
    ],
    "drainase": [
        {
            "kode": "g4",
            "teks": "Apakah saluran air kotor tersumbat total atau pipa pecah?",
            "tingkat_resmi": "Rusak Sangat Berat",
            "tingkat": "rusak_berat",
            "rujukan": "Pipa riser patah/pecah; sump pump rusak",
        },
        {
            "kode": "g3",
            "teks": "Apakah saluran air kotor tersumbat dan menggenang?",
            "tingkat_resmi": "Rusak Sedang",
            "tingkat": "rusak_sedang",
            "rujukan": "Pipa cabang patah/pecah; tersumbat",
        },
        {
            "kode": "g2",
            "teks": "Apakah ada pipa saluran yang pecah atau tersumbat?",
            "tingkat_resmi": "Rusak Sangat Ringan",
            "tingkat": "rusak_ringan",
            "rujukan": "Sebagian pipa cabang pecah/rusak/tersumbat",
        },
    ],
}

# Opsi "tidak ada gejala" ditambahkan ke setiap komponen. Ini bukan
# "tidak menjawab": warga menyatakan komponen dalam kondisi baik.
TIDAK_ADA_GEJALA = {
    "kode": "g0",
    "teks": "Tidak ada gejala / komponen terlihat baik",
    "tingkat_resmi": "Tidak Ada Gejala",
    "tingkat": "baik",
    "rujukan": "Tidak ada kerusakan yang teramati",
}

# §15.5 — pertanyaan struktural hanya bila deskripsi memuat pemicu.
STRUKTUR_PEMICU: dict[str, list[str]] = {
    "pondasi": ["bangunan miring", "bangunan goyang", "bangunan bergeser"],
    "kolom": [
        "dinding retak besar",
        "retakan lebar",
        "retakan memanjang",
        "plesteran jatuh",
        "beton jatuh",
        "selimut beton hancur",
        "besi terlihat",
        "bangunan ambruk",
        "bangunan runtuh",
    ],
    "balok": [
        "dinding retak besar",
        "retakan lebar",
        "retakan memanjang",
        "plesteran jatuh",
        "beton jatuh",
        "besi terlihat",
        "langit-langit turun",
        "bangunan ambruk",
        "bangunan runtuh",
    ],
}

GEJALA_STRUKTUR: list[dict] = [
    {
        "kode": "g3",
        "teks": "Apakah bangunan terlihat miring, bergeser, atau runtuh?",
        "tingkat_resmi": "Rusak Sangat Berat",
        "tingkat": "rusak_berat",
        "rujukan": "Pemicu: bangunan miring/bergeser/runtuh (pondasi, kolom, balok)",
    },
    {
        "kode": "g2",
        "teks": "Apakah terlihat retakan lebar/memanjang atau beton jatuh sampai besi terlihat?",
        "tingkat_resmi": "Rusak Berat",
        "tingkat": "rusak_berat",
        "rujukan": "Pemicu: retakan lebar / selimut beton hancur",
    },
    {
        "kode": "g1",
        "teks": "Apakah langit-langit turun atau lantai naik/menggelembung?",
        "tingkat_resmi": "Rusak Sedang",
        "tingkat": "rusak_sedang",
        "rujukan": "Pemicu: langit-langit turun / lantai naik (balok)",
    },
    TIDAK_ADA_GEJALA,
]

TINGKAT_URUT = {
    "baik": 0,
    "rusak_ringan": 1,
    "rusak_sedang": 2,
    "rusak_berat": 3,
}


def pertanyaan_bagian() -> dict:
    """Pertanyaan 1 — selalu ditampilkan."""
    return {
        "kode": "bagian",
        "teks": "Bagian mana yang rusak?",
        "tipe": "pilih_satu",
        "pilihan": [
            {"kode": kode, "label": data["label"]} for kode, data in KOMPONEN.items()
        ],
    }


def _pertanyaan_gejala(
    kode: str, komponen_label: str, gejala: list[dict]
) -> dict:
    return {
        "kode": kode,
        "teks": "Pilih yang paling berat yang Anda lihat:",
        "tipe": "pilih_satu_bertingkat",
        "urutan": "dari_terparah",
        "lewati_bila_terjawab": True,
        "komponen": komponen_label,
        "pilihan": [
            {
                "kode": g["kode"],
                "label": g["teks"],
                "tingkat": g["tingkat"],
            }
            for g in gejala
        ],
    }


def deteksi_komponen(deskripsi: str) -> list[str]:
    """Kembalikan kode komponen terdeteksi, paling relevan lebih dulu.

    Skor = jumlah kemunculan kata kunci. Tie-breaker = urutan `KOMPONEN`
    (deterministik, bukan urutan hash).
    """
    teks = (deskripsi or "").lower()
    skor: dict[str, int] = {}
    for kode, data in KOMPONEN.items():
        n = sum(teks.count(kata) for kata in data["kata_kunci"])
        if n:
            skor[kode] = n
    urutan = {kode: i for i, kode in enumerate(KOMPONEN)}
    return sorted(skor, key=lambda k: (-skor[k], urutan[k]))


def pemicu_struktural(deskripsi: str) -> list[str]:
    """Komponen struktural yang pemicunya muncul di deskripsi."""
    teks = (deskripsi or "").lower()
    return [
        komponen
        for komponen, pemicu in STRUKTUR_PEMICU.items()
        if any(kata in teks for kata in pemicu)
    ]


def pilih_pertanyaan(deskripsi: str, bagian: str | None = None) -> list[dict]:
    """Pilih maksimal 4 pertanyaan: 1 bagian + maksimal 3 gejala.

    Bila deskripsi tidak menyebut komponen apa pun, hanya pertanyaan
    ``bagian`` yang dikembalikan (sesuai §15.6 — sisanya baru bisa dipilih
    setelah warga memilih bagian; kontrak v1 memilih sekali di awal).
    """
    pertanyaan = [pertanyaan_bagian()]

    if pemicu_struktural(deskripsi):
        pertanyaan.append(
            _pertanyaan_gejala("gejala_struktur", "Struktur bangunan", GEJALA_STRUKTUR)
        )

    komponen = deteksi_komponen(deskripsi)
    if bagian and bagian in KOMPONEN:
        komponen = [bagian] + [k for k in komponen if k != bagian]

    for kode in komponen:
        if len(pertanyaan) >= 4:
            break
        gejala = GEJALA[kode] + [TIDAK_ADA_GEJALA]
        pertanyaan.append(
            _pertanyaan_gejala(
                f"gejala_{kode}", KOMPONEN[kode]["label"], gejala
            )
        )

    return pertanyaan


def cari_pilihan(kode_pertanyaan: str, kode_pilihan: str) -> dict | None:
    """Cari definisi pilihan pada bank (untuk validasi jawaban)."""
    if kode_pertanyaan == "gejala_struktur":
        bank = GEJALA_STRUKTUR
        return next((g for g in bank if g["kode"] == kode_pilihan), None)

    if not kode_pertanyaan.startswith("gejala_"):
        return None
    komponen = kode_pertanyaan.removeprefix("gejala_")
    if komponen not in GEJALA:
        return None
    bank = GEJALA[komponen] + [TIDAK_ADA_GEJALA]
    return next((g for g in bank if g["kode"] == kode_pilihan), None)


def severity_tertinggi(nilai: list[str]) -> str | None:
    """Nilai enum paling parah dari daftar; ``None`` bila kosong/asing."""
    valid = [n for n in nilai if n in TINGKAT_URUT]
    if not valid:
        return None
    return max(valid, key=lambda n: TINGKAT_URUT[n])
