# Struktur Modular Backend — SIMAKIS

```mermaid
flowchart TB
    subgraph ROOT["⚡ app/"]
        style ROOT fill:#1e293b,stroke:#f8fafc,stroke-width:3px,color:#f8fafc
        main["main.py<br/>FastAPI entry point<br/>Router registration"]
    end

    subgraph CORE["🔧 core/"]
        style CORE fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#e0e7ff
        config["config.py<br/>BaseSettings<br/>JWT, DB URL, S3"]
        database["database.py<br/>engine, SessionLocal<br/>get_db()"]
        deps["deps.py<br/>get_current_user<br/>RoleChecker<br/>hash_password<br/>create_token"]
        pdp["pdp.py<br/>AES-256-GCM<br/>encrypt/decrypt NIK"]
    end

    subgraph MODELS["📦 models/"]
        style MODELS fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#d1fae5
        base["base.py<br/>Base, TimestampMixin<br/>gen_uuid, utcnow"]
        user["user.py<br/>User, PdpVault"]
        sekolah_m["sekolah.py<br/>Sekolah<br/>SekolahDataResmi<br/>KondisiSarana"]
        laporan_m["laporan.py<br/>Laporan<br/>LaporanFoto"]
        klaster_m["klaster.py<br/>Klaster, Vote<br/>StatusLog"]
        logs_m["logs.py<br/>IngestJob<br/>AuditLog"]
        models_init["__init__.py<br/>register all models<br/>to Base.metadata"]
    end

    subgraph SCHEMAS["📋 schemas/"]
        style SCHEMAS fill:#7c2d12,stroke:#fb923c,stroke-width:2px,color:#ffedd5
        auth_s["auth.py<br/>RegisterRequest<br/>LoginRequest<br/>RefreshRequest<br/>TokenResponse<br/>UserMeResponse"]
    end

    subgraph ROUTERS["🌐 routers/"]
        style ROUTERS fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#e0f2fe
        auth_r["auth.py<br/>POST /auth/register<br/>POST /auth/login<br/>POST /auth/refresh<br/>GET /auth/me"]
    end

    subgraph TESTS["🧪 tests/"]
        style TESTS fill:#713f12,stroke:#fbbf24,stroke-width:2px,color:#fef3c7
        test_pdp["test_pdp.py<br/>7 tests (PDP Vault)"]
        test_auth["test_auth.py<br/>5 tests (Auth + RBAC)"]
    end

    subgraph DATASET["📁 dataset/"]
        style DATASET fill:#3f3f46,stroke:#a1a1aa,stroke-width:2px,color:#f4f4f5
        scrape["scraping/<br/>scrape_sekolah_v4.py"]
        raw["raw/<br/>sekolah_lamongan_semua.json<br/>sekolah_lamongan_semua.csv"]
    end

    subgraph ALEMBIC["🔄 alembic/"]
        style ALEMBIC fill:#4a1d96,stroke:#c084fc,stroke-width:2px,color:#ede9fe
        alembic_ini["alembic.ini<br/>config"]
        alembic_env["env.py<br/>target_metadata = Base"]
        versions["versions/<br/>478d2b0819e6_init_12_tables"]
    end

    subgraph DOCS["📚 docs/backend/"]
        style DOCS fill:#1e3a5f,stroke:#60a5fa,stroke-width:2px,color:#dbeafe
        task_guide["TASK_GUIDE.md"]
        changelog["CHANGELOG.md"]
        erd["ERD.md"]
    end

    %% ===== Relasi Antar Layer =====

    main --> config
    main --> auth_r

    config --> database
    config --> deps

    database --> deps
    database --> pdp

    deps --> auth_r
    deps --> pdp

    base --> user
    base --> sekolah_m
    base --> laporan_m
    base --> klaster_m
    base --> logs_m

    user --> models_init
    sekolah_m --> models_init
    laporan_m --> models_init
    klaster_m --> models_init
    logs_m --> models_init

    models_init --> database

    auth_s --> auth_r

    auth_r --> auth_s
    auth_r --> deps

    scrape --> raw

    models_init --> alembic_ini
    alembic_ini --> alembic_env
    alembic_env --> versions

    test_pdp --> pdp
    test_auth --> auth_r
    test_auth --> deps

    models_init --> task_guide
    models_init --> erd
    auth_r --> task_guide
```

---

## Legenda Warna

| Warna | Layer | Keterangan |
|-------|-------|------------|
| ⚫ Abu Gelap | `app/` | Entry point, titik awal |
| 🟣 Ungu Tua | `core/` | Config, DB, Auth deps, PDP Vault |
| 🟢 Hijau Tua | `models/` | 12 SQLAlchemy models + base |
| 🟠 Oranye Tua | `schemas/` | Pydantic validation |
| 🔵 Biru Tua | `routers/` | FastAPI endpoints |
| 🟡 Kuning Tua | `tests/` | Unit tests |
| ⚪ Abu | `dataset/` | Scraping + raw data |
| 🟣 Ungu | `alembic/` | Migration |
| 🔵 Biru Muda | `docs/backend/` | Dokumentasi |

---

## Alur Dependensi Utama

```
main.py
  ├── config.py ──→ database.py ──→ models/__init__.py
  │                  deps.py ──→ pdp.py
  │                  ↓
  ├── routers/auth.py ──→ schemas/auth.py
  │                  ↓
  │             deps.py ──→ get_current_user (JWT)
  │                        ──→ RoleChecker (RBAC)
  │                        ──→ hash_password (pwdlib)
  │                        ──→ create_token (PyJWT)
  │
  └── test_auth.py ──→ routers/auth.py + deps.py
      test_pdp.py ──→ pdp.py
```
