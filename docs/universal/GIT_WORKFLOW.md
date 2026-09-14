# GIT_WORKFLOW.md — SIMAKIS

> Struktur modular default dan daftar branch, supaya Aris dan Dimas bisa
> kerja di modul masing-masing tanpa saling menabrak. Dokumen ini turunan
> langsung dari peta layer di `ARCHITECTURE.md` dan kontrak di
> `INTERFACES.md` — bukan aturan baru, cuma diterjemahkan jadi struktur
> folder & branch fisik. Pola dokumentasi tetap sama: **Keputusan →
> Alasan → Alternatif Dipertimbangkan**, dan **Yang Belum Terbukti** untuk
> yang belum disepakati.

---

## 1. Prinsip

**Keputusan:** Batas modul ditentukan **dulu** (struktur default di §2),
isi di dalamnya bebas dikerjakan masing-masing orang tanpa perlu
persetujuan.
**Alasan:** Tim cuma 2 orang dengan pembagian jelas (Aris = backend + AI +
dataset, Dimas = frontend) — koordinasi berat cuma dibutuhkan di titik
yang benar-benar lintas-modul, bukan di tiap baris kode.
**Aturan turunannya:** siapapun boleh ubah apapun **di dalam** folder
modulnya sendiri kapan saja. Yang butuh koordinasi cuma dua hal: (a)
nama/lokasi folder besar di §2, dan (b) bentuk data yang lewat batas
modul — itu tercatat di `INTERFACES.md`, bukan di sini.

---

## 2. Struktur Folder Default

```
simakis/
├── frontend/                        # React + Vite — punya Dimas
│   └── src/
│       ├── components/
│       │   ├── ui/                  # shadcn/ui generated — jangan edit manual
│       │   ├── institutional/       # UI_COMPONENTS.md §4
│       │   ├── composite/           # UI_COMPONENTS.md §5
│       │   ├── charts/              # wrapper ECharts, UI_COMPONENTS.md §6
│       │   └── map/                 # wrapper Leaflet, UI_COMPONENTS.md §7
│       ├── layouts/                 # PublicLayout, WargaLayout, PemerintahLayout
│       ├── pages/
│       │   ├── warga/               # FEAT-001, FEAT-003, FEAT-005, FEAT-006 (sisi warga)
│       │   └── pemerintah/          # FEAT-002, FEAT-004, FEAT-006 (sisi dinas)
│       └── routes/                  # React Router + RBAC Guard
│
├── backend/                         # FastAPI — punya Aris
│   └── app/
│       ├── core/                    # config, koneksi DB, middleware RBAC & JWT
│       ├── models/                  # ORM — WAJIB sinkron dengan DATABASE_SCHEMA.md
│       ├── schemas/                 # request/response — WAJIB persis sama dengan INTERFACES.md
│       ├── routers/
│       │   ├── auth.py
│       │   ├── sekolah.py           # FEAT-001 — Direktori & Profil Sekolah
│       │   ├── laporan.py           # FEAT-003 — Pelaporan Isu
│       │   ├── klaster.py           # FEAT-004 — baca hasil ai_pipeline/, verifikasi klaster
│       │   ├── vote.py              # FEAT-005 — Voting Prioritas
│       │   └── status.py            # FEAT-006 — Accountability/Status
│       ├── ai_pipeline/             # ARCHITECTURE.md §3.3 — async, dipanggil lewat task queue
│       │   ├── embedding.py         # IndoBERT
│       │   ├── reduction.py         # UMAP (DECISIONS.md D-05 — isi alasan begitu ada)
│       │   ├── clustering.py        # HDBSCAN
│       │   ├── labeling.py          # TF-IDF
│       │   └── scoring.py           # Formula Urgensi KBM + Skor Prioritas
│       └── dataset/                 # scraping & ingestion data Dapodik
│           ├── scraping/            # scraper per halaman/NPSN Dapodik
│           ├── parsing/             # ekstraksi PDF profil sekolah → data terstruktur
│           ├── ingestion/           # Pandas Batch Ingestion → MySQL / PDP Vault
│           └── raw/                 # hasil scraping/parsing mentah — TIDAK commit penuh (lihat §6)
│
└── docs/                             # struktur yang sudah dibuat sebelumnya
    ├── universal/
    ├── frontend/
    └── backend/
```

**Yang belum terbukti:** struktur `backend/app/dataset/` di atas disusun
berdasarkan catatan sebelumnya (strategi scraping Playwright + Pandas
Batch Ingestion di `ARCHITECTURE.md`/`INTEGRATION.md`), **bukan** dari
membaca kode scraping yang sudah kamu buat — begitu file scraping-nya
dikirim, struktur ini perlu disesuaikan supaya cocok dengan nama
fungsi/modul yang benar-benar ada, bukan cuma asumsi nama folder.

---

## 3. Batas yang Tidak Boleh Diubah Sepihak

| Yang berubah | Siapa yang boleh ubah sendiri | Butuh koordinasi? |
|---|---|---|
| Isi di dalam `pages/`, `components/composite/` milik Dimas | Dimas | Tidak |
| Isi di dalam `routers/`, `ai_pipeline/`, `dataset/` milik Aris | Aris | Tidak |
| Nama/lokasi folder besar di §2 | — | Ya — update dokumen ini dulu |
| Bentuk request/response API | — | Ya — update `INTERFACES.md` dulu, baru kode |
| Skema database | — | Ya — dampak ke `INTERFACES.md`, ikut aturan yang sama |
| Urutan tahap `ai_pipeline/` (mis. tambah/hapus step) | — | Ya — catat dulu di `DECISIONS.md` (lihat D-05), baru kode |

---

## 4. Daftar Branch

**Keputusan:** Branch dibuat per **fitur/task**, bukan satu branch
permanen per orang.
**Alasan:** Tim cuma 2 orang tapi tetap perlu isolasi kerja — branch per
task bisa direview dan di-revert satu-satu tanpa membatalkan bagian lain
yang sudah beres, penting mengingat waktu pengerjaan cuma 14 minggu
(`ROADMAP.md`) dan tidak ada slack untuk rework besar.
**Alternatif dipertimbangkan (ditolak):** Satu branch besar per orang
(`feature/aris`, `feature/dimas`) — ditolak karena menyulitkan review
parsial dan integration checkpoint di akhir tiap fase (`ROADMAP.md`).

**Branch tetap (selalu ada):**

| Branch | Fungsi | Siapa yang push langsung? |
|---|---|---|
| `main` | Versi stabil & terverifikasi | Tidak ada — hanya lewat merge dari `develop` |
| `develop` | Titik integrasi frontend & backend | Tidak ada — hanya lewat Pull Request |

**Branch kerja (contoh per Fase — lihat `ROADMAP.md`):**

| Role | Contoh Branch |
|---|---|
| Aris | `feature/aris-database-schema`, `feature/aris-dataset-scraping-dapodik`, `feature/aris-ai-pipeline-hdbscan`, `feature/aris-api-voting` |
| Dimas | `feature/dimas-setup-frontend`, `feature/dimas-form-laporan-isu`, `feature/dimas-ui-klaster-isu`, `feature/dimas-status-publik` |

**Konvensi penamaan:** `feature/<nama>-<deskripsi-singkat-kebab-case>`.
Untuk perbaikan mendesak dekat tenggat: `hotfix/<deskripsi>`, langsung
dari `main`.

---

## 4a. Tujuan Pembagian Branch

| Branch | Tujuan Utama |
|---|---|
| **`main`** | Menjamin selalu ada **satu versi yang aman didemokan/dinilai** kapan saja tanpa perlu cek dulu apakah sedang ada kerjaan setengah jadi — krusial menjelang UAT dan submission akhir (`PRD.md` §11). |
| **`develop`** | Titik integrasi tempat pekerjaan Aris (backend/AI/dataset) dan Dimas (frontend) benar-benar ketemu dan dites bareng, sebelum dianggap "selesai". Tanpa ini, masalah kontrak `INTERFACES.md` yang meleset baru ketahuan dekat `main` — jauh lebih mahal diperbaiki. |
| **`feature/<nama>-<deskripsi>`** (per task, bukan per orang) | Tiap perubahan bisa **direview dan di-revert secara terisolasi** — kalau satu bagian (mis. step UMAP di `ai_pipeline/`) ternyata perlu dirombak, tidak perlu membatalkan fitur lain yang sudah beres. |
| **Konvensi nama `<nama>-<deskripsi>`** | Dengan tim cuma 2 orang, ini tetap berguna untuk melacak riwayat: siapa mengerjakan apa, tanpa perlu buka isi branch satu-satu saat review PR partner. |
| **`hotfix/<deskripsi>` dari `main`** | Jalur cepat untuk perbaikan mendesak dekat tenggat (mis. bug ditemukan H-1 sebelum UAT) tanpa menunggu siklus penuh `feature → develop → main`. |

---

## 5. Alur Kerja

1. Buat branch dari `develop` sesuai daftar §4 (atau task baru dengan pola
   nama yang sama).
2. Kerja bebas di dalam folder modul sendiri (§3).
3. Kalau kerjaan menyentuh kontrak (§3, baris "Butuh koordinasi: Ya") —
   update `INTERFACES.md` atau `DECISIONS.md` dulu, dapat konfirmasi
   partner, baru lanjut kode.
4. Pull Request ke `develop` — **wajib** direview oleh partner (Aris
   review Dimas, atau sebaliknya) sebelum merge, minimal cek apakah
   menabrak batas §3, bukan harus paham detail teknis area partner.
5. Integration checkpoint di akhir tiap Fase (`ROADMAP.md`) — semua
   branch aktif digabung ke `develop` dan dites bareng end-to-end.
6. `develop` → `main` cuma dilakukan menjelang milestone resmi (akhir
   Fase 4, UAT, submission), bukan tiap hari.

---

## 6. Yang Belum Terbukti / Open Questions

- **Struktur `backend/app/dataset/`** — lihat catatan di §2, masih asumsi
  sampai file scraping asli dikirim dan dicocokkan.
- **Strategi penyimpanan hasil scraping mentah** (`dataset/raw/`) — PDF
  dan hasil scraping Dapodik kemungkinan besar tidak pantas di-commit
  penuh ke git (ukuran besar); apakah pakai Git LFS, storage eksternal,
  atau `.gitignore` dengan skrip re-scrape belum ditentukan.
- **Monorepo vs multi-repo** — dokumen ini ditulis dengan asumsi monorepo
  (satu repo, folder `frontend/`/`backend/`/`docs/`) karena tim kecil,
  tapi belum ada keputusan eksplisit yang dicatat di `DECISIONS.md`.
- **Branch protection rules** (wajib review, wajib CI lulus sebelum
  merge) — belum disiapkan.
- **CI/CD** — belum ada, jadi "PR direview" di §5 masih manual sepenuhnya.

---

## 7. Hubungan dengan Dokumen Lain

- `ARCHITECTURE.md` — sumber pembagian layer/tanggung jawab yang
  diterjemahkan jadi folder di §2.
- `INTERFACES.md` — sumber kontrak yang jadi acuan "butuh koordinasi" di
  §3; dokumen ini tidak mendefinisikan ulang bentuk data, cuma menunjuk
  ke sana.
- `DECISIONS.md` — setiap keputusan yang menyentuh struktur modul (mis.
  D-05 soal UMAP) harus tercatat di sana dulu sebelum jadi perubahan folder
  di sini.
- `ROADMAP.md` — sumber urutan fase yang jadi acuan kapan integration
  checkpoint dan merge ke `main` terjadi.
