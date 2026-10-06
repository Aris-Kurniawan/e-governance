#!/usr/bin/env python3
"""
F3.23 — Augmentation & scale sweep data generator.
Generates balanced datasets of size n = 45, 150, 500, 1500
with 5 categories, expanded templates (150–250 unique) and
5 variation techniques.
"""

import json
import random
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime

# Base templates from setup_f300.py (kept as reference)
BASE_TEMPLATES = {
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

# Synonym dictionary (simple mapping)
SYNONYMS = {
    "bocor": ["rembes", "merembes", "tiris"],
    "rusak": ["pecah", "hancur", "sobek", "retak", "patah", "rusak berat"],
    "tidak ada": ["belum tersedia", "tidak tersedia", "kurang"],
    "sering": ["kerap", "sering kali", "banyak terjadi"],
    "tua": ["lama", "uzur", "sudah tua"],
    "parah": ["berat", "serius", "kritis"],
    "becek": ["berlumpur", "licin", "genangan"],
    "terbatas": ["sangat kurang", "kurang memadai", "minim"],
    "layak": ["layak pakai", "aman", "memadai"],
    "mengganggu": ["menghambat", "mengacaukan", "mengganggu jalannya"],
    "berbahaya": ["membahayakan", "risiko tinggi", "tidak aman"],
    "kegiatan belajar": ["proses belajar mengajar", "KBM", "pembelajaran"],
    "siswa": ["murid", "peserta didik", "anak didik"],
    "guru": ["pendidik", "tenaga pengajar"],
    "sekolah": ["satuan pendidikan", "instansi pendidikan"],
}

# Context phrases to add
CONTEXT_PHRASES = [
    "mengganggu kegiatan belajar mengajar",
    "berbahaya bagi keselamatan siswa",
    "sudah berlangsung sejak lama",
    "perlu perhatian segera dari dinas",
    "terjadi di beberapa ruangan sekaligus",
    "menjadi keluhan warga sekitar",
    "diperparah oleh kondisi cuaca",
    "tidak ada anggaran untuk perbaikan",
    "perlu penanganan mendesak",
    "dapat menimbulkan kecelakaan",
]

# Formal ↔ casual transformations (pattern-based)
FORMAL_TO_CASUAL = [
    ("tidak bisa digunakan", "gak bisa dipakai"),
    ("sudah rusak", "udah rusak"),
    ("perlu renovasi", "perlu dibenahi"),
    ("sangat terbatas", "sangat kurang"),
    ("tidak layak", "gak layak"),
    ("mengganggu pembelajaran", "ganggu belajar"),
    ("berbahaya bagi", "bahaya buat"),
    ("kondisi memprihatinkan", "keadaannya parah"),
    ("belum diperbaiki", "belum dibenerin"),
    ("tidak memadai", "kurang cukup"),
]

# ------------------------------------------------------------
# Template expansion functions
# ------------------------------------------------------------

def expand_template_pool() -> Dict[str, List[str]]:
    """Expand base templates to ~150–250 unique templates."""
    expanded = {}
    for cat, base_list in BASE_TEMPLATES.items():
        new_list = list(base_list)  # keep originals
        # 1. Add synonym variations
        for templ in base_list:
            for key, syns in SYNONYMS.items():
                if key in templ.lower():
                    for syn in syns[:2]:  # limit
                        new = templ.replace(key, syn)
                        if new not in new_list:
                            new_list.append(new)
        # 2. Paraphrase by reordering clauses
        for templ in base_list:
            if ", " in templ:
                parts = templ.split(", ")
                if len(parts) == 2:
                    new = f"{parts[1].strip()} {parts[0].strip()}"
                    if new not in new_list:
                        new_list.append(new)
        # 3. Add contextual variants
        for templ in base_list:
            for ctx in CONTEXT_PHRASES[:3]:
                new = f"{templ}. {ctx}"
                if new not in new_list:
                    new_list.append(new)
        # 4. Formal/casual flip
        for templ in base_list:
            for formal, casual in FORMAL_TO_CASUAL:
                if formal in templ:
                    new = templ.replace(formal, casual)
                    if new not in new_list:
                        new_list.append(new)
                elif casual in templ:
                    new = templ.replace(casual, formal)
                    if new not in new_list:
                        new_list.append(new)
        # 5. Combine two base templates (same category)
        if len(base_list) >= 2:
            for i in range(min(5, len(base_list))):
                t1 = base_list[i]
                t2 = base_list[(i + 1) % len(base_list)]
                new = f"{t1}. Selain itu, {t2.lower()}"
                if new not in new_list:
                    new_list.append(new)
        # Ensure we have 30–50 per category
        target = random.randint(30, 50)
        if len(new_list) > target:
            new_list = random.sample(new_list, target)
        expanded[cat] = new_list
    return expanded


def apply_variation(original: str, technique: str) -> str:
    """Apply one variation technique to a template."""
    if technique == "sinonim":
        # Replace one synonym
        for key, syns in SYNONYMS.items():
            if key in original.lower():
                chosen = random.choice(syns)
                return original.replace(key, chosen)
        return original
    elif technique == "parafrase":
        # Reverse clause order if possible
        if ", " in original:
            parts = original.split(", ")
            if len(parts) == 2:
                return f"{parts[1].strip()} {parts[0].strip()}"
        return original
    elif technique == "gaya":
        # Toggle formal/casual
        for formal, casual in FORMAL_TO_CASUAL:
            if formal in original:
                return original.replace(formal, casual)
            elif casual in original:
                return original.replace(casual, formal)
        return original
    elif technique == "konteks":
        # Add a context phrase
        ctx = random.choice(CONTEXT_PHRASES)
        return f"{original}. {ctx}"
    else:  # gabung_topik (already handled at template level)
        return original


def generate_documents(
    expanded_pool: Dict[str, List[str]],
    n: int,
    seed: int = 42
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Generate n documents with balanced categories."""
    random.seed(seed)
    categories = list(expanded_pool.keys())
    per_cat = n // len(categories)
    remainder = n % len(categories)
    counts = {cat: per_cat for cat in categories}
    for i, cat in enumerate(categories[:remainder]):
        counts[cat] += 1
    
    docs = []
    var_counts = {"sinonim": 0, "parafrase": 0, "gaya": 0, "konteks": 0, "gabung_topik": 0}
    doc_id = 0
    
    for cat, count in counts.items():
        pool = expanded_pool[cat]
        if count > len(pool):
            # Allow duplication with variation
            selected = random.choices(pool, k=count)
        else:
            selected = random.sample(pool, count)
        
        for templ in selected:
            var = random.choice(["sinonim", "parafrase", "gaya", "konteks"])
            text = apply_variation(templ, var)
            var_counts[var] += 1
            docs.append({
                "id": f"d{doc_id:04d}",
                "kategori": cat,
                "teks": text,
                "sumber_template": f"{cat}_{templ[:20]}".replace(" ", "_"),
                "variasi": var
            })
            doc_id += 1
    
    random.shuffle(docs)
    metadata = {
        "n": n,
        "seed": seed,
        "kategori_counts": counts,
        "teknik_counts": var_counts,
        "pool_template_size": sum(len(v) for v in expanded_pool.values()),
        "generated_at": datetime.now().isoformat(),
    }
    return docs, metadata


def save_dataset(docs: List[Dict], metadata: Dict[str, Any], out_path: Path):
    """Save dataset as JSON."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "metadata": metadata,
        "documents": docs
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ns", default="45,150,500,1500",
                        help="Comma-separated list of n values")
    parser.add_argument("--out", type=Path, default=Path(__file__).parent,
                        help="Output directory")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    
    ns = [int(x.strip()) for x in args.ns.split(",")]
    expanded = expand_template_pool()
    total_templates = sum(len(v) for v in expanded.values())
    print(f"Expanded pool size: {total_templates} templates")
    for cat, lst in expanded.items():
        print(f"  {cat}: {len(lst)} templates")
    
    for n in ns:
        print(f"\nGenerating n={n}...")
        docs, meta = generate_documents(expanded, n, seed=args.seed + n)
        out_file = args.out / f"dataset_aug_{n}.json"
        save_dataset(docs, meta, out_file)
        print(f"  Saved to {out_file}")
        print(f"  Categories: {meta['kategori_counts']}")
        print(f"  Variation counts: {meta['teknik_counts']}")
        # Show first 3 texts
        for d in docs[:3]:
            print(f"    - {d['teks']}")
    
    print("\nDone.")


if __name__ == "__main__":
    main()