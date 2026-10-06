"""
Skrip untuk menghasilkan Ground Truth Manual Clustering (F3.0a).
Metodologi: 5 Kategori Hibrida (3 Dapodik + 2 Laporan Teks Warga)
Menggunakan persentase kerusakan (damage ratio) per kategori sarana.
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.sekolah import Sekolah, KondisiSarana
from app.models.laporan import Laporan


def build_ground_truth():
    db = SessionLocal()
    try:
        sekolah_list = db.scalars(select(Sekolah).order_by(Sekolah.npsn)).all()
        print(f"Loaded {len(sekolah_list)} schools.")

        dapodik_map = {
            "ruang_kelas": "ruang_belajar",
            "perpustakaan": "ruang_belajar",
            "lab_ipa": "ruang_belajar",
            "lab_komputer": "ruang_belajar",
            "uks": "penunjang",
            "tempat_ibadah": "penunjang",
            "wc_guru": "sanitasi_air",
            "wc_siswa": "sanitasi_air",
        }

        keyword_map = {
            "utilitas": [
                "listrik", "lampu", "internet", "wifi", "genset", 
                "penerangan", "mati lampu", "padam", "kabel", "daya"
            ],
            "akses_lahan": [
                "jalan", "pagar", "drainase", "saluran", "banjir", 
                "halaman", "paving", "akses", "lapangan", "gerbang", "becek"
            ]
        }

        school_scores = {}
        tie_breakers = []

        for s in sekolah_list:
            npsn = s.npsn
            # Simpan akumulasi total unit dan rusak per kategori Dapodik
            cat_stats = {
                "ruang_belajar": {"total": 0, "rusak": 0},
                "sanitasi_air": {"total": 0, "rusak": 0},
                "penunjang": {"total": 0, "rusak": 0},
                "utilitas": {"total": 0, "rusak": 0},
                "akses_lahan": {"total": 0, "rusak": 0},
            }
            breakdown = {
                "dapodik_stats": {},
                "laporan_mentions": defaultdict(int)
            }

            # 2a. Kumpulkan data sarana Dapodik
            sarana = db.scalars(select(KondisiSarana).where(KondisiSarana.sekolah_npsn == npsn)).all()
            for item in sarana:
                cat = dapodik_map.get(item.nama_ruang)
                if cat:
                    total_unit = item.jumlah or 0
                    rusak_unit = (item.kondisi_rusak_ringan or 0) + (item.kondisi_rusak_sedang or 0) + (item.kondisi_rusak_berat or 0)
                    cat_stats[cat]["total"] += total_unit
                    cat_stats[cat]["rusak"] += rusak_unit
                    breakdown["dapodik_stats"][item.nama_ruang] = {"total": total_unit, "rusak": rusak_unit}

            # Hitung rasio kerusakan (% rusak dari total unit) untuk 3 kategori Dapodik
            scores = {}
            for cat in ["ruang_belajar", "sanitasi_air", "penunjang"]:
                st = cat_stats[cat]
                if st["total"] > 0:
                    scores[cat] = round((st["rusak"] / st["total"]) * 100, 2)
                else:
                    scores[cat] = 0.0

            # 2b. Hitung skor dari teks laporan warga untuk 2 kategori non-Dapodik
            laporan_list = db.scalars(select(Laporan).where(Laporan.sekolah_npsn == npsn)).all()
            for lap in laporan_list:
                teks = lap.deskripsi.lower() if lap.deskripsi else ""
                
                for kw in keyword_map["utilitas"]:
                    if kw in teks:
                        cat_stats["utilitas"]["rusak"] += 1
                        breakdown["laporan_mentions"]["utilitas"] += 1
                        break
                
                for kw in keyword_map["akses_lahan"]:
                    if kw in teks:
                        cat_stats["akses_lahan"]["rusak"] += 1
                        breakdown["laporan_mentions"]["akses_lahan"] += 1
                        break

            # Skor utilitas & akses lahan berbasis jumlah mention laporan (dikonversi ke skala 0-100 jika ada laporan)
            # Atau beri bobot tetap per laporan (misal 20 poin per laporan mention, max 100)
            scores["utilitas"] = min(float(cat_stats["utilitas"]["rusak"] * 25), 100.0)
            scores["akses_lahan"] = min(float(cat_stats["akses_lahan"]["rusak"] * 25), 100.0)

            # Cari kategori dengan skor maksimum
            max_score = max(scores.values())
            top_cats = [c for c, sc in scores.items() if sc == max_score]

            if max_score == 0.0:
                assigned_cat = "ruang_belajar"
                tie_breakers.append({
                    "npsn": npsn,
                    "nama": s.nama,
                    "reason": "Semua skor rasio 0, default: ruang_belajar",
                    "scores": scores
                })
            elif len(top_cats) > 1:
                priority_order = ["ruang_belajar", "sanitasi_air", "akses_lahan", "utilitas", "penunjang"]
                assigned_cat = next(c for c in priority_order if c in top_cats)
                tie_breakers.append({
                    "npsn": npsn,
                    "nama": s.nama,
                    "reason": f"Skor ratio seri antara {top_cats}, dipilih: {assigned_cat}",
                    "scores": scores
                })
            else:
                assigned_cat = top_cats[0]

            school_scores[npsn] = {
                "npsn": npsn,
                "nama": s.nama,
                "jenjang": s.jenjang,
                "assigned_category": assigned_cat,
                "max_score": max_score,
                "scores": scores,
                "breakdown": breakdown
            }

        clusters = {
            "ruang_belajar": {
                "label": "ruang_belajar",
                "description": "Isu kerusakan fasilitas kegiatan belajar mengajar (kelas, lab, perpus)",
                "source_dapodik": ["ruang_kelas", "perpustakaan", "lab_ipa", "lab_komputer"],
                "schools": []
            },
            "sanitasi_air": {
                "label": "sanitasi_air",
                "description": "Isu fasilitas toilet, kebersihan, dan saluran sanitasi dasar",
                "source_dapodik": ["wc_guru", "wc_siswa"],
                "schools": []
            },
            "penunjang": {
                "label": "penunjang",
                "description": "Isu fasilitas kesehatan (UKS) dan ibadah penunjang sekolah",
                "source_dapodik": ["uks", "tempat_ibadah"],
                "schools": []
            },
            "utilitas": {
                "label": "utilitas",
                "description": "Isu pasokan listrik, lampu penerangan, dan jaringan internet/WiFi",
                "source_dapodik": [],
                "schools": []
            },
            "akses_lahan": {
                "label": "akses_lahan",
                "description": "Isu pagar sekolah, jalan akses masuk, paving halaman, dan drainase banjir",
                "source_dapodik": [],
                "schools": []
            }
        }

        for npsn, data in school_scores.items():
            cat = data["assigned_category"]
            clusters[cat]["schools"].append(npsn)

        output_data = {
            "metadata": {
                "created_date": datetime.now().strftime("%Y-%m-%d"),
                "total_schools": len(sekolah_list),
                "total_categories": 5,
                "source": "Hibrida: Rasio kerusakan Dapodik (% rusak) + Laporan warga teks",
                "cluster_distribution": {k: len(v["schools"]) for k, v in clusters.items()}
            },
            "manual_clusters": clusters,
            "school_details": school_scores,
            "tie_breaker_cases": tie_breakers
        }

        output_path = os.path.join(os.path.dirname(__file__), "manual_clusters.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print("\n=== HASIL GROUND TRUTH (BERBASIS RASIO) ===")
        print(f"Total Sekolah: {len(sekolah_list)}")
        print("Distribusi Klaster:")
        for cat, v in clusters.items():
            print(f"  - {cat}: {len(v['schools'])} sekolah")
        print(f"Total kasus tie-breaker/default: {len(tie_breakers)}")
        print(f"File tersimpan di: {output_path}")

    finally:
        db.close()


if __name__ == "__main__":
    build_ground_truth()
