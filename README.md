# SIMAKIS — Sistem Informasi Manajemen Advokasi Kebutuhan Infrastruktur Sekolah

Platform e-governance partisipatif untuk pelaporan, klasterisasi berbasis AI (HDBSCAN), dan pengawalan transparansi perbaikan infrastruktur sekolah di Kabupaten Lamongan.

---

## 📂 Struktur Modular Proyek

Proyek ini menggunakan arsitektur monorepo modular yang memisahkan frontend, backend, dan dokumentasi secara terisolasi:

```text
e-goverment/
├── frontend/             # React + Vite (Pekerjaan Dimas)
├── backend/              # FastAPI + Python (Pekerjaan Aris)
├── docs/                 # Dokumentasi Resmi Proyek
│   ├── universal/        # Kontrak API, Arsitektur, PRD, Roadmap, Keputusan
│   ├── frontend/         # Design System, UI Components, Page States, Setup
│   └── backend/          # Skema Database & Catatan Arsitektur Backend
└── README.md
```

---

## 📚 Indeks Dokumentasi (`docs/`)

### 🌐 Universal (Lintas Tim)
- [PRD.md](docs/universal/PRD.md) — Product Requirements Document (Fitur FEAT-001 s.d FEAT-006).
- [ARCHITECTURE.md](docs/universal/ARCHITECTURE.md) — Arsitektur sistem menyeluruh, komponen, & alur data.
- [INTERFACES.md](docs/universal/INTERFACES.md) — Kontrak request & response API (Single Source of Truth).
- [GIT_WORKFLOW.md](docs/universal/GIT_WORKFLOW.md) — Aturan modularitas, branch development, & merge flow.
- [DECISIONS.md](docs/universal/DECISIONS.md) — Architecture Decision Records (ADR).
- [ROADMAP.md](docs/universal/ROADMAP.md) — Rencana kerja 14 minggu & integrasi milestone.
- [PROJECT_CONTEXT.md](docs/universal/PROJECT_CONTEXT.md) — Latar belakang proyek & profil stakeholder.

### 🎨 Frontend (Dimas)
- [SETUP.md](docs/frontend/SETUP.md) — Panduan inisialisasi & menjalankan frontend lokal.
- [DESIGN_SYSTEM.md](docs/frontend/DESIGN_SYSTEM.md) — Token warna, tipografi, & panduan visual.
- [UI_COMPONENTS.md](docs/frontend/UI_COMPONENTS.md) — Spesifikasi komponen shadcn/ui, chart, peta.
- [FLOWS.md](docs/frontend/FLOWS.md) — Alur interaksi pengguna warga & dinas.
- [PAGE_STATES.md](docs/frontend/PAGE_STATES.md) — State halaman (loading, empty, error, success).

### ⚙️ Backend (Aris)
- [README.md](docs/backend/README.md) — Direktori dokumentasi teknis backend & skema database.
