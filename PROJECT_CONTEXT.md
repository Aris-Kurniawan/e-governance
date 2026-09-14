# KONTEKS PROYEK: Sistem Informasi Partisipasi Berbasis Data Pemerintah

## Problem Statement

Banyak platform partisipasi warga (Decidim, YourPriorities, CitizenOS) sudah tersedia, namun memiliki keterbatasan:

1. **Diskusi tanpa dasar data** — Warga memberikan masukan berdasarkan opini, bukan data pemerintah yang valid
2. **Data pemerintah tidak terintegrasi** — Dataset anggaran, infrastruktur, dan demografi terpisah dari platform diskusi
3. **Kurangnya transparansi** — Warga tidak tahu bagaimana input mereka diproses menjadi rekomendasi kebijakan

---

## Research Gap

Studi sebelumnya menunjukkan bahwa:

- Participatory budgeting platforms sudah banyak diteliti (Sintomer et al., 2008; Shin et al., 2025)
- Integrasi AI dalam deliberasi masih underexplored (Cuillerier, 2026)
- **Integrasi real-time dataset pemerintah dalam forum diskusi warga masih sangat minim** (Frontiers, 2026)

**Gap spesifik:** Bagaimana merancang sistem informasi yang mengintegrasikan dataset pemerintah secara langsung ke dalam mekanisme partisipasi warga sehingga deliberasi menjadi lebih informed dan akuntabel?

---

## Tujuan Proyek

Membangun sistem informasi berbasis web yang:

1. Menampilkan dataset pemerintah (anggaran, infrastruktur, demografi) sebagai konteks partisipasi
2. Memfasilitasi deliberasi warga berbasis data
3. Memproses input warga menjadi rekomendasi kebijakan dengan transparansi
4. Menyediakan dashboard analitik untuk pemerintah dan warga

---

## Tech Stack

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Frontend** | React + Tailwind CSS | SPA, responsive, aksesibel |
| **Backend** | Python (FastAPI) | REST API, async, mudah diintegrasikan |
| **Database** | MySQL | Relational data, ACID compliance |
| **AI Layer** | scikit-learn / spaCy | Clustering, sentiment analysis, summarization |
| **Dataset** | Open Government Data | data.go.id, fiscaldata.treasury.gov, indiandataproject.org |

---

## Dataset yang Digunakan

| Dataset | Sumber | Format | Fungsi |
|---|---|---|---|
| Anggaran per instansi | fiscaldata.treasury.gov / indiandataproject.org | JSON/CSV | Dashboard transparansi anggaran |
| Data demografi | indiandataproject.org | JSON | Analisis kebutuhan per wilayah |
| Infrastruktur | sigi.pu.go.id | GeoJSON | Peta interaktif keluhan warga |
| Data pendidikan | data.kemendikdasmen.go.id | XLSX | Evaluasi program pendidikan |
| Data investasi | data.go.id | CSV | Tren pembangunan daerah |

---

## Fitur Utama

```
┌─────────────────────────────────────────────────────────┐
│                    SISTEM INFORMASI                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [1] DATA DASHBOARD                                     │
│      - Visualisasi anggaran per instansi                │
│      - Peta infrastruktur interaktif                    │
│      - Grafik demografi per wilayah                     │
│                                                         │
│  [2] DELIBERASI BERBASIS DATA                           │
│      - Forum diskusi dengan konteks data                │
│      - Dataset ditampilkan langsung dalam diskusi       │
│      - AI clustering topik serupa                       │
│                                                         │
│  [3] PARTICIPATORY BUDGETING                            │
│      - Warga usulkan prioritas anggaran                 │
│      - Voting dengan multiple methods                   │
│      - Validasi otomatis ketersediaan anggaran          │
│                                                         │
│  [4] AI RECOMMENDATION ENGINE                           │
│      - Analisis sentimen diskusi                        │
│      - Rekomendasi kebijakan berbasis data              │
│      - Penjelasan transparan bagaimana rekomendasi      │
│        dibuat (explainable AI)                          │
│                                                         │
│  [5] ACCOUNTABILITY LOOP                                │
│      - Status implementasi usulan                       │
│      - Dashboard transparansi real-time                 │
│      - Feedback loop warga → pemerintah                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    ARCHITECTURE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Frontend]                                             │
│   ├── React SPA + Tailwind CSS                          │
│   ├── Recharts (visualisasi data)                       │
│   ├── Leaflet (peta interaktif)                         │
│   └── Socket.IO (real-time updates)                     │
│                                                         │
│  [Backend - FastAPI]                                    │
│   ├── /api/datasets     → CRUD dataset                 │
│   ├── /api/proposals    → CRUD usulan warga            │
│   ├── /api/deliberation → Forum diskusi                │
│   ├── /api/voting       → Voting engine                │
│   ├── /api/ai           → Clustering, summarization    │
│   └── /api/analytics    → Dashboard & reporting        │
│                                                         │
│  [Database - MySQL]                                     │
│   ├── users             → Data pengguna                │
│   ├── datasets          → Metadata dataset             │
│   ├── proposals         → Usulan warga                 │
│   ├── discussions       → Forum diskusi                │
│   ├── votes             → Hasil voting                 │
│   └── recommendations   → Rekomendasi AI               │
│                                                         │
│  [Integration Layer]                                    │
│   ├── Data Ingestion    → ETL dataset pemerintah       │
│   ├── API Gateway       → Rate limiting, auth          │
│   └── Export API        → Export ke format standar     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Alur Kerja Sistem

```
DATASET PEMERINTAH
        │
        ▼
┌─────────────────┐
│  DATA INGESTION │ ──→ ETL dari sumber eksternal
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    DATABASE     │ ──→ MySQL menyimpan dataset
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│    DASHBOARD    │ ◄── │  VISUALISASI    │
│  (Data Display) │     │  (Recharts)     │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  DELIBERASI     │ ──→ Warga diskusi dengan konteks data
│  (Forum)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    VOTING       │ ──→ Warga pilih prioritas
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI ANALYSIS    │ ──→ Clustering, summarization
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RECOMMENDATION  │ ──→ Rekomendasi kebijakan
│  (Output)       │
└─────────────────┘
```

---

## Metodologi Pengembangan

| Tahap | Aktivitas | Deliverable |
|---|---|---|
| **1. Analisis** | Studi literatur, identifikasi kebutuhan | Dokumen kebutuhan sistem |
| **2. Perancangan** | ERD, use case, wireframe | Dokumen desain |
| **3. Pengembangan** | Sprint 1-4 (Agile) | Prototipe fungsional |
| **4. Pengujian** | Unit test, integration test | Laporan pengujian |
| **5. Evaluasi** | User testing, analisis hasil | Laporan evaluasi |

---

## Kriteria Keberhasilan

| Aspek | Target |
|---|---|
| **Fungsionalitas** | Semua fitur utama berjalan |
| **Integrasi Data** | Minimal 3 dataset pemerintah terintegrasikan |
| **Responsivitas** | Aksesibel di mobile dan desktop |
| **Performa** | Response time < 2 detik |
| **Usability** | System Usability Scale (SUS) > 70 |

---

## Referensi Teori

1. **Laudon & Laudon** (2020) — Komponen Sistem Informasi
2. **Arnstein** (1969) — Ladder of Citizen Participation
3. **Fung** (2015) — Democracy Cube
4. **Decidim** — Platform co-creation open source
5. **YourPriorities** — AI-powered participation platform

---

## Referensi Riset

1. Cuillerier, M. (2026). Co-creation of digital public services through open-source platforms. *Taylor & Francis*.
2. Frontiers. (2026). Beyond access: social, institutional and cultural barriers to digital citizen participation.
3. Shin, B. (2025). Exploring the potential of machine learning to reduce administrative burden in participatory budgeting. *Emerald*.
4. Reijnders, L. et al. (2026). Designing inclusive co-creation: a conjoint analysis of citizen preferences. *Taylor & Francis*.
5. Li, N. & Li, Y. (2026). Citizens' engagement in coproduction through digital platforms. *Taylor & Francis*.
