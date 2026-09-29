# AGENTS.md — Aturan Tetap Proyek SIMAKIS (e-government)

> Memory permanen untuk AI assistant. **Riwayat task & keputusan perubahan → `docs/backend/CHANGELOG.md`** (jangan duplikat di sini).
> Perubahan aturan di file ini harus eksplisit disetujui pemilik proyek.

## Environment

- **Venv:** `./backend/venv/bin/python` — **`python` TIDAK ada di PATH**
- **Test:** dari folder `backend/`: `./venv/bin/python -m pytest tests/ -q` (pytest.ini: `pythonpath=.`, `testpaths=tests`)
- **Typecheck:** `backend/pyrightconfig.json` ada (venv=venv, pythonVersion=3.14); pyright belum terpasang global
- **Linter:** belum ada di proyek (ruff/black/flake8 tidak dipasang) — jika diminta lint, pasang ruff dulu
- **MySQL 8.4:** `root:dev123`, DB `simakis` (native/WSL, **bukan Docker**)
- **Docker Compose:** hanya untuk produksi (Fase 4), bukan untuk development
- **Model HF:** sudah terunduh di `~/.cache/huggingface/hub/` (paraphrase-multilingual-MiniLM-L12-v2, all-MiniLM-L6-v2)

## Git

- **Commit per task** — satu task = satu commit, jangan digabung. Contoh:
  - `F3.0b: Implementasi Ablation Framework` ✅
  - `F3.0e: Analysis & Reporting` ✅
  - `F3.0f: Implementation of Optimal Config` ✅
  - `F3.6: Async Task Queue - Cron Script` ✅
  - `F3.8-F3.10: AI Pipeline Endpoints` ✅
- **Format commit:** `<task>: <deskripsi singkat>` (contoh: `F3.0f: Implementation of Optimal Config (A2+B1+C2+D1)`)
- **Commit hanya saat user menyebut "commit"** — jangan commit/ push sendiri
- **Push gagal** (tidak ada credentials GitHub) → user push manual
- Branch: `backend`, `frontend`, `development`, `main`
- **Line-ending:** blob branch `backend` = **CRLF**, branch `frontend` = **LF** (tidak ada .gitattributes/autocrlf)
  - Edit file backend → pertahankan CRLF (cek `git diff --stat`: kalau seluruh file berubah = line-ending rusak, perbaiki: `sed -i 's/$/\r/' <file>`)
  - Salin/ pindah antar branch → normalisasi `sed 's/\r$//'` atau lewat temp `git worktree`
  - **Jangan stage/commit file yang hanya noise line-ending** (cek `git diff --stat`: kalau seluruh file berubah (>90% baris) = line-ending noise, jangan di-commit)

## Kontrak & Keputusan (Single Source of Truth)

- **FE ↔ BE:** `docs/universal/INTERFACES.md` — satu-satunya sumber kontrak API
- **Keputusan desain:** `docs/universal/DECISIONS.md` (D-01…D-20)
- **Spec per task:** `docs/backend/TASK_GUIDE.md` (backend), `docs/frontend/TASK_GUIDE.md` (frontend)
- **Progres & riwayat:** `docs/backend/CHANGELOG.md` (tabel Status Fase 1/2/3)

## Scope (FINAL)

- **Infrastruktur-only.** Kolom CSV `pd, pd_l, pd_p, rombel, jum_ptk, jum_guru, jum_tendik` **TIDAK di-ingest**
- **Clustering teks-only** — tidak pakai/ latih CV pada foto
- **Detail sekolah v1 = 3 kartu** (D-20): Audit Sarpras, Profil Dapodik, Isu & Klaster Warga
- Field yang **tidak boleh dirender** sebagai data valid: `rasio_guru_siswa=null`, `utilitas_kapasitas_belajar=0.0`, `jumlah_pd/ptk/rombel` (0 = placeholder backend, bukan data)
- Backend kenyataan v1: `data_resmi` kosong, `penanda_masalah` selalu "normal", `jumlah_isu_aktif` selalu 0 (lihat INTERFACES.md §2)

## AI Pipeline (Fase 3 / FEAT-004)

- **Config optimal hasil ablation (A2+B1+C2+D1):** TF-IDF 300 fitur + UMAP `n_components=10` + HDBSCAN `min_cluster_size=3, min_samples=2` + label unigram
- **Scoring (D-07):** `0.7×laporan + 0.3×Dapodik`, `skor_prioritas = skor_keparahan + vote`
- **Noise label (-1)** → `belum_terklasifikasi`
- **Ablation data:** 45 dokumen (17 sekolah tanpa laporan dieksklud), fingerprint md5 `46ff8dc4`
- **Cron:** harian 02:00 WIB (Keputusan #3), bukan real-time
- Hasil lengkap: `docs/backend/ABLATION_RESULTS.md`

## Workflow Pekerjaan

- Task dikerjakan sesuai urutan `docs/backend/TASK_GUIDE.md`; setelah selesai: update tabel Status di `docs/backend/CHANGELOG.md` + section §3.x ringkasan
- Perubahan test/ lint wajib dijalankan sebelum menyatakan task selesai
- Bahasa komunikasi: **Bahasa Indonesia** (user: Aris, Backend Engineer; FE: Dimas, Vite+React+TS+Tailwind+shadcn)
