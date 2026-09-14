# ROADMAP.md — SIMAKIS

> Fase pengerjaan 14 minggu, diturunkan dari `PRD.md` §12.1, dipecah lebih
> granular per minggu untuk memudahkan tracking. Update `CHANGELOG.md`
> setiap milestone tercapai — dokumen ini rencana, `CHANGELOG.md` realisasi.

**Prinsip kerja:** Frontend dan backend berjalan **paralel** sejak awal
(bukan sekuensial), karena frontend sengaja dimulai duluan dengan data
statis/mock sambil backend jalan di jalurnya sendiri (lihat
`frontend/SETUP.md`).

---

## Fase 1 — Persiapan (Minggu 1–3)

| PIC | Fokus |
|---|---|
| Aris (Backend) | Desain skema database (`DATABASE_SCHEMA.md`), riset & scraping/parsing awal data Dapodik |
| Dimas (Frontend) | Wireframe UI, setup project React + Tailwind + shadcn/ui (`frontend/SETUP.md`) |

**Milestone:** Skema DB draft pertama + project frontend bisa `npm run dev`
tanpa error + `universal/PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`,
`DECISIONS.md` sudah final (dokumen-dokumen ini).

---

## Fase 2 — Fitur Dasar (Minggu 4–7)

| PIC | Fokus |
|---|---|
| Aris (Backend) | API Direktori Sekolah (FEAT-001), Auth/RBAC dasar, API Pelaporan Isu (FEAT-003) |
| Dimas (Frontend) | UI Dashboard Warga, Form Laporan Isu (mock data dulu, sesuai `frontend/MOCK_DATA.md`) |

**Milestone:** Warga bisa (secara UI, walau backend belum full terhubung)
melihat direktori sekolah dan mengisi form laporan sampai state "Laporan
Berhasil Dikirim" (`PAGE_STATES.md` §A4).

---

## Fase 3 — Fitur Lanjutan (Minggu 8–11)

| PIC | Fokus |
|---|---|
| Aris (Backend) | Modul AI (IndoBERT → UMAP → HDBSCAN → TF-IDF → Skor Prioritas), API Voting (FEAT-005), RBAC penuh, API update status (FEAT-006) |
| Dimas (Frontend) | UI Klaster Isu, UI Voting, UI Status Publik/Accountability |

**Milestone:** Pipeline klasterisasi berjalan end-to-end pada data uji;
warga bisa vote (UI + logic Pending/Terhitung); status tindak lanjut
tampil sesuai `PAGE_STATES.md` §A5.

---

## Fase 4 — Integrasi & Finalisasi (Minggu 12–14)

| PIC | Fokus |
|---|---|
| Aris + Dimas | Integrasi penuh frontend ↔ backend (ganti mock data ke API sungguhan sesuai `INTERFACES.md`), pengujian, perbaikan bug, dokumentasi final |

**Urutan pengujian (`PRD.md` §11):**
1. Black-box testing (fungsional, jalur normal & gagal)
2. Evaluasi klasterisasi (Silhouette Score / Davies-Bouldin + validasi manual)
3. SUS (target > 70)
4. UAT

**Milestone akhir:** Semua skenario uji kritikal lulus, SUS > 70, UAT
diterima, dokumentasi (`universal/`, `frontend/`, `backend/`) lengkap dan
sinkron dengan kode final.

---

## Risiko yang Perlu Dipantau Tiap Fase

Lihat `PRD.md` §12.2 untuk detail lengkap. Yang paling relevan per fase:

- **Fase 1–2:** Keterbatasan ekstraksi data Dapodik (semi-manual) bisa
  memperlambat kesiapan data uji untuk AI pipeline di Fase 3.
- **Fase 3:** Akurasi klasterisasi AI — mitigasi dengan validasi manual
  Verifikator Dinas sebelum klaster tampil publik.
- **Fase 4:** Risiko terbesar keterlambatan integrasi karena tim hanya 2
  orang — pastikan `INTERFACES.md` sudah stabil sebelum Fase 4 dimulai
  supaya tidak ada rework kontrak API di menit-menit akhir.
