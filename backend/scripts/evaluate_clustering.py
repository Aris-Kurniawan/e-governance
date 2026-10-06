"""F4.3 — Evaluasi Klasterisasi: Silhouette Score & Davies-Bouldin Index.

Jalankan: cd backend && ./venv/bin/python scripts/evaluate_clustering.py

Metrik dihitung terhadap assignment klaster yang TERSIMPAN di DB (bukan hasil
rerun pipeline), sehingga mencerminkan kualitas data produksi aktual:
  - Per sekolah: embeddings dihitung ulang dengan konfigurasi pipeline sama
    (TF-IDF 300 + UMAP 10), label = mapping klaster_id per sekolah.
  - Global: semua laporan digabung, label = klaster_id (unik lintas sekolah).
  - Noise HDBSCAN tidak ada di DB (semua laporan wajib punya klaster), tetapi
    cluster "belum_terklasifikasi" = hasil noise awal yang di-klaster-kan.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from sqlalchemy import select, func

from app.core.database import SessionLocal
from app.models.laporan import Laporan
from app.models.klaster import Klaster
from app.ai_pipeline.embedding import embed_texts
from app.ai_pipeline.reduction import reduce_dimensions
from app.ai_pipeline.experiments.evaluation import evaluate_internal


def compute_embeddings(texts: list[str]) -> np.ndarray:
    """Konfigurasi sama dengan AIPipeline.run (A2+B1): TF-IDF → UMAP 10."""
    emb = embed_texts(texts, method="tfidf")
    if emb.shape[0] > 10 and emb.shape[1] > 10:
        try:
            emb = reduce_dimensions(emb, n_components=10)
        except Exception:
            pass  # fallback: pakai embeddings asli
    return emb


def main() -> None:
    db = SessionLocal()
    try:
        # --- Ambil semua laporan terklaster + klaster info ---
        stmt = select(
            Laporan.id,
            Laporan.sekolah_npsn,
            Laporan.deskripsi,
            Laporan.klaster_id,
            Klaster.kategori,
        ).join(Klaster, Laporan.klaster_id == Klaster.id)
        rows = db.execute(stmt).fetchall()

        if not rows:
            print("Tidak ada laporan terklaster di DB. Jalankan run_clustering.py dulu.")
            return

        # --- Grouping per sekolah ---
        by_school: dict[str, list] = {}
        for r in rows:
            by_school.setdefault(r.sekolah_npsn, []).append(r)

        print(f"Total laporan terklaster : {len(rows)}")
        print(f"Jumlah sekolah           : {len(by_school)}")

        stmt_k = select(func.count(Klaster.id))
        total_klaster = db.execute(stmt_k).scalar()
        print(f"Total klaster di DB      : {total_klaster}")
        print("=" * 78)

        # --- Metrik per sekolah ---
        per_school = []
        for npsn, laps in sorted(by_school.items()):
            texts = [r.deskripsi for r in laps if r.deskripsi]
            if len(texts) < 3:
                per_school.append((npsn, len(laps), None))
                print(f"{npsn}: {len(laps)} laporan — dilewati (butuh >=3 utk silhouette)")
                continue

            # label = index unik per klaster_id di sekolah ini
            klaster_ids = sorted({r.klaster_id for r in laps})
            id2idx = {k: i for i, k in enumerate(klaster_ids)}
            valid_rows = [r for r in laps if r.deskripsi]
            labels = np.array([id2idx[r.klaster_id] for r in valid_rows])

            # urutan text harus sama dgn labels
            embeddings = compute_embeddings([r.deskripsi for r in valid_rows])

            m = evaluate_internal(embeddings, labels)
            per_school.append((npsn, len(laps), m))
            if m["silhouette"] == -1.0 and m["davies_bouldin"] == 999.0:
                print(f"{npsn}: {len(laps)} laporan, {len(klaster_ids)} klaster — metrik undefined (<2 klaster)")
            else:
                print(
                    f"{npsn}: {len(laps)} laporan, {len(klaster_ids)} klaster — "
                    f"silhouette={m['silhouette']:.4f}, DB-index={m['davies_bouldin']:.4f}"
                )

        # --- Rata-rata per sekolah (yang valid) ---
        valid = [m for _, _, m in per_school if m and m["silhouette"] != -1.0]
        print("=" * 78)
        if valid:
            avg_sil = float(np.mean([m["silhouette"] for m in valid]))
            avg_db = float(np.mean([m["davies_bouldin"] for m in valid]))
            print(f"Rata-rata (n={len(valid)} sekolah valid):")
            print(f"  Silhouette Score     : {avg_sil:.4f}  (range -1..1, makin tinggi makin baik)")
            print(f"  Davies-Bouldin Index : {avg_db:.4f}  (range 0..inf, makin rendah makin baik)")
        else:
            print("Tidak ada sekolah dengan >=2 klaster (metrik undefined).")

        # --- Global (semua laporan, label = klaster_id) ---
        valid_rows = [r for r in rows if r.deskripsi]
        if len(valid_rows) >= 3:
            all_klaster_ids = sorted({r.klaster_id for r in valid_rows})
            if len(all_klaster_ids) >= 2:
                g2i = {k: i for i, k in enumerate(all_klaster_ids)}
                g_labels = np.array([g2i[r.klaster_id] for r in valid_rows])
                g_emb = compute_embeddings([r.deskripsi for r in valid_rows])
                gm = evaluate_internal(g_emb, g_labels)
                print("-" * 78)
                print(f"Global ({len(valid_rows)} laporan, {len(all_klaster_ids)} klaster):")
                print(f"  Silhouette Score     : {gm['silhouette']:.4f}")
                print(f"  Davies-Bouldin Index : {gm['davies_bouldin']:.4f}")

        # --- Distribusi kategori (konteks validasi manual) ---
        print("-" * 78)
        stmt_dist = select(Klaster.kategori, func.count(Klaster.id)).group_by(Klaster.kategori)
        for cat, cnt in db.execute(stmt_dist).fetchall():
            print(f"  kategori {cat:<20}: {cnt}")
        print("-" * 78)
        print("Catatan: validasi manual oleh Verifikator (F4.3) dilakukan via")
        print("endpoint /api/klaster/{id}/verifikasi di frontend.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
