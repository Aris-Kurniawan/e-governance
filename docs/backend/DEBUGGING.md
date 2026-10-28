# DEBUGGING.md — Log Permasalahan Backend SIMAKIS

**Tujuan:** pelacakan masalah backend (bug, drift, gap integrasi) beserta **status penyelesaiannya** — dokumen hidup, diperbarui tiap kali ada debugging baru atau sebuah masalah dinyatakan selesai.

**Aturan pemakaian:**
- ID entri `DBG-xxx` **permanen** — jangan dihapus, cukup ubah status + isi blok "Penyelesaian".
- Status hanya boleh dinaikkan ke ✅ jika ada **bukti**: commit hash, angka verifikasi, atau uji negatif.
- Masalah yang butuh keputusan pemilik proyek ditandai ⚪ (butuh keputusan) di kolom status — tetap dicatat, jangan dihapus.
- Referensi kontrak: `docs/universal/INTERFACES.md` (deviasi kontrak FE↔BE = daftar di `docs/frontend/CHANGELOG.md` §"Catatan Deviasi Kontrak").

**Legenda status:**

| Simbol | Arti |
|---|---|
| ✅ SELESAI | Diperbaiki + terverifikasi (ada commit/bukti) |
| 🔴 TERBUKA | Terkonfirmasi rusak, belum diperbaiki |
| ⚪ TERBLOKIR | Butuh keputusan desain/produk sebelum diperbaiki |

---

## Ringkasan

| ID | Masalah | Lokasi | Status | Bukti / Rencana |
|---|---|---|---|---|
| DBG-001 | ENUM `klaster.kategori` drift: migrasi = 5 nilai, model & DB live = 6 | `alembic/versions/8cca6e1b2fa3`, `models/laporan.py:10` | ✅ SELESAI | `d3cb7888ff94` (commit `744fc4ca`) + guard `verify_schema_parity.py` |
| DBG-002 | Cron 02:00 me-recluster laporan noise tiap hari (loop harian) | `scripts/run_clustering.py` | ✅ SELESAI | F4.7 `ae07c8de` — kolom `hasil_klasterisasi`, seleksi `'belum_diproses'` |
| DBG-003 | `Unknown column 'perlu_info_tambahan'` / enum truncation saat upgrade | `klaster.status_verifikasi` | ✅ SELESAI | migrasi `d4f8c2a91e05` (commit `5a00bd3d`) |
| DBG-004 | `GET /ai/status`: `unclustered_laporan` selalu 398; `last_run` hardcoded `"N/A"` | `routers/klaster.py` | ✅ SELESAI | F4.10 — seleksi `belum_diproses` + state file; live: 0, `last_run` nyata |
| DBG-005 | `log_audit()` 0 call site — tabel `audit_log` 0 baris; halaman FE Log Audit PDP selalu kosong | `core/audit.py` | ✅ SELESAI | F4.10 — 5 call site + 5 test; audit_log live terisi |
| DBG-006 | Jadwal cron 02:00 WIB tidak pernah dipasang (`crontab -l` kosong) | crontab (mesin dev) | ✅ SELESAI | F4.10 — crontab `0 2 * * *` terpasang, cron active, simulasi sukses |
| DBG-007 | `penanda_masalah` selalu `"normal"`, `jumlah_isu_aktif` selalu 0 (deviasi kontrak #1) | `routers/sekolah.py` | ✅ SELESAI | F4.11 (D-23): penanda = level Skor KBM, isu = laporan non-ditolak; live 39/22/1 |
| DBG-008 | `GET /dashboard/wilayah` menolak role `admin` (403) (deviasi kontrak #3) | `routers/dashboard.py` | ✅ SELESAI | F4.11 — `require_dinas` += `admin`; live 200 + test |
| DBG-009 | `lintang`/`bujur` NULL 62/62 padahal CSV sumber lengkap (deviasi kontrak #4) | `setup_f300.py`, `routers/ingest.py` | ✅ SELESAI | F4.11 — mapping + backfill idempoten + expose; live 62/62 |
| DBG-010 | `ingest.py` baca `row.get("nama_sekolah")` padahal header CSV = `nama` → nama bisa "Unknown" | `routers/ingest.py` | ✅ SELESAI | F4.11 — key `nama` + fallback; test ingest CSV resmi |
| DBG-011 | Semua `422` dipetakan jadi `REASON_REQUIRED`; `PUT /laporan/{id}/status` wajib `UNPROCESSABLE_ENTITY` (§4). *400 generik = sesuai §0.3 (diagnosis awal salah)* | `main.py` handler | ✅ SELESAI | F4.11 — `ApiError(api_code)` + baris §0.3 + tipe FE; live 422 code benar |
| DBG-012 | Rute `/dinas/*` tanpa `ProtectedRoute` — guest melihat "Data tidak dapat dimuat" (401) seolah backend mati; `ProtectedRoute` abaikan `isLoading` + tak punya `loginPath` | `App.tsx:87-95`, `components/auth/ProtectedRoute.tsx` | ✅ SELESAI | `ProtectedRoute` menangani `isLoading`, `loginPath="/dinas/login"`, `allowedRoles`; rute `/dinas/*` dibungkus guard; copy basi `LogAuditPdp.tsx` dirapikan; build lolos |
| DBG-013 | Profil pemerintah hardcode "Bambang H., S.T." + NIP/email/jabatan palsu — `useAuth` tidak dipakai (grep 0) | `DinasLayout.tsx:381,736,856`, `CetakRingkasanEksekutif.tsx:94,257` | ✅ SELESAI | Migrasi Alembic `63a2411c6508` tambah `users.nip`; `GET /auth/me` & `UserMe` menyertakan `nip`; akun dinas di-seed NIP; `DinasLayout` & `CetakRingkasanEksekutif` kini dinamis dari `useAuth().user` |
| DBG-014 | Test klasterisasi hanya data sintetis — pipeline tak pernah diuji dengan laporan nyata (600) | `tests/test_ai_pipeline.py`, `tests/test_evaluation.py` | 🔴 | Rencana: test integrasi `default_pipeline` pada data real + ambang longgar |
| DBG-015 | Uji ablasi "laporan dinamis" belum ada — ground truth `manual_clusters.json` statis (fingerprint `46ff8dc4`, 45 dokumen) | `ai_pipeline/experiments/manual_clusters.json` | ⚪ | Rencana: re-run data live (subset GT dicatat) vs anotasi GT baru vs augmentasi — keputusan makna "dinamis" |
| DBG-016 | Embedding Potion/mxbai belum dievaluasi (grep `potion\|mxbai` = 0); mxbai English-only → bukan kandidat | `embedding.py`, `experiments/run_ablation.py` | 🔴 | Rencana: varian ablation A4 Potion multilingual vs A1/A3; keputusan adopsi → D-xx |
| DBG-017 | "Verifikasi mismatch terkadang gagal" & beban review Kadis = RBAC `verifikator_dinas` vs `kepala_dinas` | `routers/laporan.py:253,341`, `routers/klaster.py:25`, `LaporanPerluReview.tsx` | ✅ SELESAI | D-30: Verifikasi teknis klaster & laporan mandiri diserahkan ke `verifikator_dinas` (Permendagri 8/2023); `kepala_dinas` read-only untuk pengawasan |
| DBG-018 | Warga terdaftar tidak bisa vote (403): default `warga_umum` ditolak `require_warga`; tak ada endpoint upgrade role; `pending` langsung terhitung (D-08) | `routers/vote.py:20,40-43`, `models/user.py:28` | ✅ SELESAI | D-28: `require_warga` += `warga_umum`; FE `ROLE_BOLEH_VOTE` += `warga_umum`; tes regresi lulus |
| DBG-019 | Navbar warga hanya 3 menu (publik 5); "Buat Laporan" (`/laporan/baru`) tanpa pintasan menu | `layouts/WargaLayout.tsx:33-35` vs `PublicLayout.tsx:33-37` | ✅ SELESAI | Menu WargaLayout diselaraskan (Dashboard Wilayah, Direktori Sekolah, Riwayat Laporan, Tentang Data) + tombol aksi "Buat Laporan" (`/laporan/baru`); build lolos |
| DBG-020 | Verifikasi email tidak ada sama sekali — 0 kode SMTP/token; `status_verifikasi` tak pernah diubah alur apa pun | `routers/auth.py`, `requirements.txt` | ⚪ | Keputusan: mode dev (token+log) vs SMTP nyata (butuh kredensial) vs dua mode |
| DBG-021 | Skor klaster basi: `skor_keparahan`/`skor_prioritas` tidak dihitung ulang setelah data Dapodik tersedia; back-calc `prioritas − votes` menyamarkan sebab. **Back-calc konsisten aritmetika** (`scoring.py:210-213` → `prioritas = keparahan + votes`), jadi bukan salah hitung melainkan snapshot basi | `scripts/run_clustering.py:204`, `routers/klaster.py:116`, `routers/vote.py:49,105` (**4 call site**) | ✅ SELESAI | Hitung langsung via `calculate_score_components` + skrip `recompute_skor.py`; dry-run 43 klaster → **1 berubah** (5dda3ac6: 55,86→75,66 / 61,86→81,66), commit DB live, rerun 0; pytest **169/169** |
| DBG-022 | **Vote menghapus komponen Dapodik 30%**: `create_vote` & `PUT /vote/klaster/{id}/skor` (F3.14) hardcode `kondisi_dapodik = {"total": 0, ...}` tanpa query `KondisiSarana` → setiap vote + endpoint "hitung ulang" menulis skor keparahan dengan Dapodik = 0. Endpoint pemeliharaan justru merusak data | `routers/vote.py:46` (`create_vote`), `routers/vote.py:100` (F3.14) | ✅ SELESAI | Hardcode `total: 0` di 2 tempat; `0,3 × 66 = 19,8` = persis selisih DBG-021 → riwayat vote menjelaskan skor `5dda3ac6` |
| DBG-023 | Laporan noise/sanggahan tervalidasi tidak tampil di Transparansi Publik (`RiwayatLaporan.tsx`) | `RiwayatLaporan.tsx`, `routers/laporan.py` | ✅ SELESAI | D-29: endpoint `GET /laporan/publik` + sub-filter Aduan Mandiri; `TRK-AUG-500-0460` terkonfirmasi tampil |
| DBG-024 | Modal pertanyaan konfirmasi severity tidak muncul setelah submit laporan (banner pasif saja) — **dua jalur submit** | `FormLaporan.tsx:191`, `ModalFormLaporan.tsx:88` | ✅ SELESAI | Auto-open `setKonfirmasiOpen(true)` di kedua komponen; `ModalFormLaporan` sebelumnya membuang `res.konfirmasi` |
| DBG-025 | Status `perlu_info_tambahan` (tombol "Tandai Kejadian Baru") membingungkan petugas & tidak dipakai dalam alur bisnis — dihapus total dari FE & BE | `AntrianValidasi.tsx`, `models/klaster.py`, `routers/klaster.py` | ✅ SELESAI | Hapus dari 2 ENUM + 2 endpoint + 7 file FE + types; migrasi `a1b2c3d4e5f6`; pytest 158/158; build hijau |
| DBG-026 | Kegagalan klasterisasi mikro per sekolah ($n < 10$): HDBSCAN menandai semua laporan sebagai noise akibat matriks TF-IDF renggang | `app/ai_pipeline/clustering.py`, `pipeline.py` | ✅ SELESAI | D-31: Klasterisasi adaptif via fallback Agglomerative Clustering (cosine distance_threshold=0.88); klaster size >= 2 terbentuk, singleton jadi noise |


---

## Detail

### DBG-001 ✅ — ENUM `klaster.kategori` drift (2026-10-14)

- **Gejala:** fresh install `alembic upgrade head` dari nol menghasilkan ENUM **5 nilai**; pipeline insert `kategori='belum_terklasifikasi'` gagal (MySQL 1265/1366). DB live selamat karena enum-nya diubah di luar alembic → selisih tak pernah terlihat.
- **Akar:** `8cca6e1b2fa3` membuat ENUM tanpa `belum_terklasifikasi`; penambahan nilai ke-6 terjadi di model Python tanpa migrasi pendamping. Test tak menangkap karena `conftest.py` memakai `Base.metadata.create_all` (model), bukan alembic.
- **Penyelesaian:** migrasi **`d3cb7888ff94`** (commit `744fc4ca`) — guard non-MySQL + guard idempoten `information_schema` (enum sudah 6 nilai → skip/no-op), `ALTER … MODIFY` hanya menambah value di akhir. Revisi lama tidak diedit (sudah tercatat applied).
- **Verifikasi:** upgrade live no-op (18 klaster utuh) · fresh-install chain 6 revisi sukses, enum 6 nilai, INSERT `belum_terklasifikasi` OK · pytest 98/98 · dump diregen + impor-verified.
- **Guard pencegahan:** `backend/scripts/verify_schema_parity.py` — 94 kolom model vs `information_schema` (14 ENUM); mode default = fresh-install check; `--db <url>` = DB existing; exit 1 saat drift. Uji negatif terbukti menangkap bug ini. Terdaftar di SETUP.md §5.

### DBG-002 ✅ — Loop re-clustering noise oleh cron (2026-10-13)

- **Gejala:** seleksi cron `WHERE klaster_id IS NULL` ikut menangkap laporan **noise** (sengaja di-commit tanpa klaster) → tiap 02:00 semua noise di-recluster, hasil noise lagi, loop harian tak berujung.
- **Akar:** `klaster_id IS NULL` punya dua makna baru setelah F4.7 (noise = sudah diproses, ATAU `belum_diproses`) — detail di `CLUSTERING_BUG_ANALYSIS.md` + docstring migrasi `a7f3c91e5b2d`.
- **Penyelesaian:** kolom `laporan.hasil_klasterisasi` (`belum_diproses|terklaster|noise`) + seleksi cron `hasil_klasterisasi == 'belum_diproses'` (commit `ae07c8de`, F4.7).
- **Verifikasi:** cron dijalankan manual → `No unclustered laporan. Exiting.` (anti-loop terbukti); 398 noise stabil.

### DBG-003 ✅ — `Unknown column 'perlu_info_tambahan'` (enum truncation)

- **Gejala:** DB yang dibuat dari migrasi lama lalu di-upgrade bisa gagal/keliru pada `klaster.status_verifikasi` (nilai enum baru tak dikenal).
- **Penyelesaian:** migrasi `d4f8c2a91e05` (commit `5a00bd3d`, F4.4 lanjutan) — `ALTER TABLE klaster MODIFY status_verifikasi ENUM(…perlu_info_tambahan…)` via SQL mentah.
- **Catatan:** tercatat di SETUP.md §5a tabel troubleshooting; guard DBG-001 kini memverifikasi kolom ini otomatis (parity check).

### DBG-004 ✅ — `GET /ai/status` salah hitung unclustered + `last_run` hardcoded (2026-10-14)

- **Gejala:** `unclustered_laporan` **selalu 398** (angka noise yang sudah selesai), bukan backlog `belum_diproses` (0). `last_run` selalu `"N/A (no cron log yet)"` meski cron/script sudah pernah jalan.
- **Akar:** query masih `WHERE klaster_id IS NULL` (definisi pra-F4.7) — tidak disapu saat semantik berubah (lihat DBG-002). `last_run` tidak pernah diisi karena tidak ada penyimpanan waktu run.
- **Dampak:** dashboard pipeline/Kadis salah baca status; alarm/SLA berbasis endpoint ini akan false dari hari pertama.
- **Penyelesaian (F4.10):** seleksi → `Laporan.hasil_klasterisasi == 'belum_diproses'`; `last_run` dibaca dari state file baru `app/core/pipeline_state.py` (`backend/pipeline_state.json`, di-gitignore) yang ditulis oleh cron script dan `POST /ai/cluster`; fallback string `"N/A (belum pernah tercatat)"` bila state belum ada; key baru `last_run_status` (`ok`/`error`).
- **Verifikasi:** live `GET /ai/status` → `unclustered_laporan: 0` (bukan 398), `last_run: 2026-10-14T20:02:58` sesuai run script, `last_run_status: ok`, `total_klaster: 43`; anon 401; 2 test regresi (`TestStatusPipelineF410`) termasuk noise-klaster_id-NULL tak lagi terhitung.

### DBG-005 ✅ — `log_audit()` tak pernah dipanggil; `audit_log` 0 baris (2026-10-14)

- **Gejala:** `GET /audit/log` (dan halaman FE Log Audit PDP) selalu kosong; 0 baris di tabel `audit_log`.
- **Akar:** helper F3.21 (`core/audit.py`) ditulis bersama endpoint & FE, tetapi "penyambung" (pemanggilan di endpoint aksi sensitif) tak pernah dikerjakan; task ditandai selesai berdasarkan keberadaan fungsi, bukan terjadinya pencatatan.
- **Dampak produksi:** tak ada jejak siapa verifikasi klaster/override prioritas/akses PDP — peluang kepatuhan PDP & forensik insiden hilang.
- **Penyelesaian (F4.10):** `log_audit()` dipanggil di 5 titik — `POST /auth/login` (`login`), `POST /auth/register` (`akses_pdp_vault` target `encrypt_nik`), `PUT /klaster/{id}/verifikasi` (`verifikasi_klaster`), `PUT /vote/klaster/{id}/override` (`override_prioritas`), `PUT /laporan/{id}/status` (`verifikasi_status_sanggahan`); commit di endpoint masing-masing; 5 test black-box `TestAuditAktifF410` assert baris masuk.
- **Verifikasi:** pytest **105/105**; live `GET /audit/log` → baris `login` `admin@simakis.id` tercatat (`total_items: 1`, sebelumnya 0).
- **Sisa kecil:** endpoint `logout` tidak ada (refresh-token flow) → memang tak ada yang bisa di-log; `GET /audit/log` tak menyertakan nama actor (hanya `actor_user_id`) — kandidat penyempurnaan lanjutan.

### DBG-006 ✅ — Cron 02:00 WIB tidak pernah terpasang (2026-10-14)

- **Gejala:** `crontab -l` kosong; `run_clustering.py` hanya jalan manual.
- **Akar:** pemasangan crontab = tindakan operasional di mesin target; tercatat di dokumentasi seolah sudah dilakukan (documentation-as-reality gap).
- **Dampak produksi:** laporan warga baru tidak pernah ter-otomatis terklasterisasi — fitur "AI pipeline harian" jadi fitur mati; backlog `belum_diproses` menumpuk tanpa batas.
- **Penyelesaian (F4.10):** crontab user dev terpasang — `0 2 * * * cd …/backend && ./venv/bin/python scripts/run_clustering.py >> logs/clustering.log 2>&1` + komentar; service `cron` **active**; `backend/logs/` dibuat; `.gitignore` += `pipeline_state.json`, `backend/logs/`.
- **Verifikasi:** `crontab -l` menampilkan 1 entri; simulasi persis baris crontab sukses (log + state file terisi); run script manual → state `status: ok`.
- **Sisa:** pasang crontab yang sama saat deploy ke server produksi (berlaku selama mesin menyala pukul 02:00 WIB); checklist `DEPLOYMENT.md` belum disentuh.

### DBG-007 ✅ — `penanda_masalah` selalu `"normal"` (2026-10-14, D-23)

- **Gejala:** `GET /sekolah` selalu `penanda_masalah="normal"`, `jumlah_isu_aktif=0`; semua 62 sekolah tampil aman; `totalKritis` di FE = 0 selamanya; filter Status Integritas tak menyaring apa-apa.
- **Akar:** placeholder awal tanpa formula keputusan (ambang kritis dari apa? jumlah isu? skor KBM?).
- **Dampak produksi:** *false sense of security* — papan dashboard hijau padahal ada 129 ruang rusak berat (terungkap baru oleh Skor KBM F4.8).
- **Penyelesaian (F4.11, D-23):** arah kandidat direalisasikan penuh — `_penanda_isu_per_sekolah()` di `routers/sekolah.py` menghitung per halaman list & detail: `penanda_masalah` = level Skor KBM (≥70 `kritis`, 40–69 `perlu_perhatian`, <40 `aman`), `jumlah_isu_aktif` = laporan `status_sanggahan != 'ditolak'`; agregasi dibuat identik dengan `GET /laporan/skor-kbm`.
- **Verifikasi:** live `GET /sekolah?page_size=100` → `perlu_perhatian 39 · aman 22 · kritis 1`, total isu 600; 4 test baru (tanpa laporan→aman, laporan berat→kritis, ditolak→bukan isu, list menyertai keduanya).

### DBG-008 ✅ — `/dashboard/wilayah` menolak `admin` (403) (2026-10-14)

- **Gejala:** login `admin@simakis.id` → buka ringkasan wilayah → 403 (deviasi kontrak #3).
- **Akar:** `require_dinas = ["verifikator_dinas","kepala_dinas"]` dibuat sebelum role `admin` dipakai luas; tak ada audit silang role↔endpoint.
- **Penyelesaian (F4.11):** `require_dinas = ["admin", "verifikator_dinas", "kepala_dinas"]` + test `test_dashboard_wilayah_admin_ok`; audit `RoleChecker` vs INTERFACES tidak menemukan gap lain (verifikasi klaster verifikator-only = per kontrak).
- **Verifikasi:** live admin → `GET /dashboard/wilayah` **200**; pytest 112/112. Kontrak INTERFACES baris wilayah diperbarui (+`admin`).

### DBG-009 ✅ — `lintang`/`bujur` NULL 62/62 padahal CSV lengkap (2026-10-14)

- **Gejala:** Peta Sebaran tanpa pin; DB `non-null lintang = 0`. Sumber `backend/app/dataset/raw/sekolah_lamongan_semua.csv`: kolom `lintang`/`bujur` **terisi 62/62** (contoh `-7.1173967`, `112.3937566`).
- **Akar:** pemetaan CSV→model ditulis manual per kolom yang "dipakai saat itu"; 2 kolom ini terlewat di `setup_f300.py` (seed) **dan** `routers/ingest.py` — data hilang di jembatan, bukan di sumber.
- **Penyelesaian (F4.11):** helper `_koord()` (parse → `Decimal`, aman terhadap nilai kosong/jelek) di `setup_f300.py` **dan** `ingest.py` — diisi saat insert **plus backfill idempoten** saat sekolah sudah ada (jalur `existing`); `lintang`/`bujur` ditambahkan ke `SekolahResponse` (list + detail); reseed `setup_f300.py` dijalankan ulang (idempoten).
- **Verifikasi:** `COUNT(lintang)=62, COUNT(bujur)=62` (dulu 0/0); live list menampilkan koordinat tiap baris; test `test_koordinat_diekspos_list_dan_detail` + ingest fixture CSV ber-koordinat → 112/112.

### DBG-010 ✅ — `ingest.py` salah key kolom nama (2026-10-14)

- **Gejala:** upload CSV via `POST /ingest/dapodik` menghasilkan `nama="Unknown"` — endpoint memakai `row.get("nama_sekolah")`, header CSV resmi = `nama`.
- **Akar:** endpoint ditulis terhadap versi CSV hipotetis; tidak diuji dengan CSV asli (`sekolah_lamongan_semua.csv`).
- **Penyelesaian (F4.11):** `nama=(row.get("nama") or row.get("nama_sekolah") or "Unknown")[:255]` — header resmi dilayani, CSV lama tetap kompatibel.
- **Verifikasi:** test `TestIngestDapodikF411` — upload CSV fixture header `nama` → `baris_diproses: 1`, `GET /sekolah/99111222` mengembalikan `nama == "SD Ingest CSV Uji"` (bukan "Unknown") + koordinat ikut terbaca; 112/112.

### DBG-011 ✅ — Code 422 tercampur `REASON_REQUIRED` (2026-10-14, diagnosis ulang)

- **Gejala:** body request invalid di endpoint mana pun → **400**, sedangkan kontrak INTERFACES menyebut 422 (mis. `PUT /laporan/{id}/status` enum salah).
- **Akar:** global handler `RequestValidationError` di `main.py` meng-`wrap` jadi 400; menimpa perilaku bawaan FastAPI (422).
- **Dampak:** klien/FE yang mengandalkan 422 (documented) tak akan melihatnya; F4.7 menyiasati dengan validasi manual `HTTPException(422)`.
- **Diagnosis ulang (F4.11):** hipotesis awal **salah** — `400 VALIDATION_ERROR` untuk Pydantic/query validation **sesuai** kontrak INTERFACES §0.3 (FE & test juga mengandalkan 400). Deviasi sebenarnya: `ERROR_CODES[422] = "REASON_REQUIRED"` berlaku untuk **semua** 422, sedangkan kontrak §4 mewajibkan `422 UNPROCESSABLE_ENTITY` untuk body enum invalid (`PUT /laporan/{id}/status`) — kode keliru `REASON_REQUIRED` selama ini lolos karena test hanya menAssert status.
- **Penyelesaian (F4.11):** `app/core/exceptions.py::ApiError(status_code, code, detail)` membawa `api_code`; `http_exception_handler` memprioritaskan `getattr(exc, "api_code", None)` di atas peta status; `laporan.py` memakai `ApiError(422, "UNPROCESSABLE_ENTITY", …)`; baris kode baru di INTERFACES §0.3; union `ApiErrorCode` di `frontend/src/lib/api/errors.ts` += `UNPROCESSABLE_ENTITY`. Handler generik tetap 400 (tanpa perubahan kontrak massal).
- **Verifikasi:** live `PUT /laporan/{id}/status` invalid → `422 {"code": "UNPROCESSABLE_ENTITY"}` (bukan `REASON_REQUIRED`); test `test_put_status_invalid_422` diperkuat assert code; generic validation tetap `400 VALIDATION_ERROR` (test lama lolos); 112/112.

### DBG-012 ✅ — Rute `/dinas/*` tanpa guard: guest lihat "Data tidak dapat dimuat" (2026-10-18)

- **Gejala:** membuka halaman `/dinas/*` tanpa login → tampilan normal tetapi semua panel gagal dengan "Data tidak dapat dimuat"; dilaporkan sebagai "backend tidak terhubung".
- **Akar:** rute `/dinas/*` (`App.tsx:87-95`) tidak dibungkus `ProtectedRoute` (yang hanya terpasang di baris 68 & 76) → request dikirim tanpa token → 401. `ProtectedRoute.tsx` mengabaikan `isLoading` (redirect saat reload masih memuat) dan selalu mengarah ke `/login` (tanpa `loginPath` → user dinas salah tujuan). Copy basi `LogAuditPdp.tsx:200` ("Backend v1 belum menuliskan aksi sensitif") menambah kesan backend mati, padahal F4.10 sudah menulis audit (lihat DBG-005).
- **Penyelesaian (2026-10-21):**
  1. `frontend/src/components/auth/ProtectedRoute.tsx`:
     - Tambah penanganan `isLoading` dengan spinner `Loader2` anggun agar tidak flicker/redirect saat reload sesi aktif.
     - Tambah prop `loginPath` (default `"/login"`) dengan penanganan redirect query param yang benar.
     - Tambah prop `allowedRoles?: Role[]` untuk autorisasi berbasis role.
  2. `frontend/src/App.tsx`: Rute `/dinas` dibungkus `ProtectedRoute` dengan `loginPath="/dinas/login"` dan `allowedRoles={["admin", "verifikator_dinas", "kepala_dinas"]}`.
  3. `frontend/src/pages/dinas/LogAuditPdp.tsx`: Copy basi pada empty state dirapikan menjadi *"Belum ada aksi sensitif tercatat di tabel audit_log."*
- **Verifikasi:** Build frontend `npm run build` (tsc + vite) sukses tanpa error tipe.

### DBG-013 ✅ — Profil pemerintah hardcode (nama/NIP/jabatan palsu) (2026-10-18)

- **Gejala:** sidebar, header, dan dokumen cetak selalu menampilkan "Bambang H., S.T." + NIP `19820415 200801 1 009` + email `bambang.sarpras@lamongankab.go.id` + inisial "BH", apa pun akun yang login (`admin@simakis.id`, `kepala.dinas@…`, dll).
- **Akar:** identitas ditulis hardcode saat layout/cetak dibuat; `DinasLayout.tsx` tidak memakai `useAuth` sama sekali (grep = 0). Model `User` (`models/user.py:24-34`) punya `nama/email/role/status_verifikasi` tetapi **tidak ada kolom NIP**; `/auth/me` (→ tipe `UserMe`) juga tidak mengembalikan NIP (grep `nip` di models & `types.ts` = 0).
- **Dampak:** identitas salah pada UI harian **dan** dokumen cetak resmi (Ringkasan Eksekutif) — pelanggaran tata kelola akun.
- **Penyelesaian (Opsi A, 2026-10-21):**
  1. Migrasi Alembic `63a2411c6508_dbg_013_users_nip.py` menambahkan kolom `users.nip` (`VARCHAR(30)`, nullable).
  2. Model `User` (`backend/app/models/user.py`) ditambahkan atribut `nip: Mapped[str | None]`.
  3. Endpoint `GET /auth/me` (`backend/app/routers/auth.py`) dan tipe frontend `UserMe` (`frontend/src/lib/api/types.ts`) ditambahkan field `nip`.
  4. Seed akun dinas (`backend/scripts/seed_dinas_accounts.py`) dan akun live diupdate dengan NIP resmi:
     - `verifikator@simakis.id` (verifikator_dinas): `19840822 201001 1 007`
     - `kepala.dinas@simakis.id` (kepala_dinas): `19720315 199803 1 004`
     - `admin@simakis.id` (admin): `19790512 200501 1 003`
  5. Dump database `database/simakis.sql` diregenerasi dan schema parity verified (98 kolom).
  6. `frontend/src/layouts/DinasLayout.tsx`: Sidebar bawah, profile flyout dropdown, dan modal profil verifikator diubah dinamis membaca `user.nama`, `user.email`, `user.nip`, `roleLabel`, dan inisial otomatis.
  7. `frontend/src/components/composite/CetakRingkasanEksekutif.tsx`: Metadata pencetak dan tanda tangan verifikator kini dinamis mengambil nama, jabatan/peran, dan NIP akun yang sedang mencetak dokumen.
- **Verifikasi:** `verify_schema_parity.py` PARITY OK (98 kolom) · pytest **169/169** lulus · frontend build (`npm run build`) sukses tanpa error.

### DBG-014 🔴 — Test klasterisasi hanya data sintetis (2026-10-18)

- **Gejala:** `test_ai_pipeline.py` & `test_evaluation.py` memakai teks buatan pendek; tidak ada test yang menjalankan pipeline terhadap laporan nyata di DB (600 baris) → penurunan kualitas atau crash pada data riil tak tertangkap suite.
- **Akar:** test ditulis unit-oriented (cepat & deterministik); uji data riil hanya dilakukan manual lewat skrip ablation.
- **Rencana:**
  1. Test integrasi baru (mis. `tests/test_cluster_real_cases.py`): seed 600 laporan → jalankan `default_pipeline.run(...)` → assert: tanpa exception; ≥2 klaster terbentuk; semua `kategori` dalam enum valid; setiap laporan berlabel `terklaster`/`noise`; rasio noise di bawah ambang longgar (mis. < 60%) agar tidak rapuh.
  2. Tandai `@pytest.mark.integration` bila runtime > 30 s; target suite ≥ 113 test (kini 112).
  3. Opsional: assert determinisme — run ulang pada data sama → label identik.
- **Verifikasi:** pytest penuh (recreate `simakis_test` dulu) + bandingkan hasil dengan ablation terakhir.

### DBG-015 ⚪ — Uji ablasi "laporan dinamis" belum tersedia (2026-10-18)

- **Gejala:** permintaan mengevaluasi keoptimalan komponen (A1/A2/A3) terhadap laporan yang terus bertambah; kini `run_ablation.py` memang membaca DB (dinamis + fingerprint cache), **tetapi** ground truth `manual_clusters.json` statis (5 klaster / 45 dokumen berlabel + 27 tie-breaker, fingerprint `46ff8dc4`) — laporan baru tanpa label GT tidak ikut dievaluasi.
- **Dampak:** re-run "pada data live" tetap mengukur hanya subset lama; kesimpulan keoptimalan bisa basi ketika laporan bertambah.
- **Rencana (keputusan ⚪ — makna "dinamis"):**
  - **Opsi A (rekomendasi):** re-run sekarang pada data live; GT lama dipakai untuk subset ber-label dan cakupannya dicatat eksplisit (mis. 45/600) di `ABLATION_RESULTS.md`.
  - **Opsi B:** anotasi GT baru tiap batch laporan (kerja manual, akurasi tertinggi).
  - **Opsi C:** pakai jalur augmentasi eksisting (n=45 → 1500) untuk uji robustness komponen.
- **Verifikasi:** tabel ablation baru (NMI/ARI per konfigurasi + waktu run) dibanding hasil lama; config optimal tetap A2+B1+C2+D1 atau usulkan perubahan (butuh keputusan D-xx baru di `DECISIONS.md`).

### DBG-016 🔴 — Embedding Potion/mxbai belum dievaluasi (2026-10-18)

- **Gejala:** permintaan evaluasi "Potion mxbai"; grep `potion|mxbai` di seluruh repo = 0. Fakta riset (HF API): `mixedbread-ai/mxbai-embed-large-v1` = 335M param, **English-only** (tag `en`) → bukan kandidat untuk teks Indonesia; `minishlab/potion-multilingual-128M` = static embedding (model2vec) multilingual → kandidat layak. Konteks: production kini TF-IDF 300 dimensi (`pipeline.py:26`), `EMBEDDING_MODEL` (`config.py:40`) dead config, ablation A1 = `paraphrase-multilingual-MiniLM-L12-v2` (bukan IndoBERT).
- **Rencana:**
  1. Riset final Potion multilingual (lisensi, ukuran model, kebutuhan paket `model2vec`, ketergantungan jaringan untuk unduh) — lane riset.
  2. `embedding.py`: `embed_texts(method="potion")` lazy-load + fallback otomatis ke TF-IDF saat model tak tersedia/offline.
  3. Varian ablation **A4 (Potion)** vs A1 (MiniLM) & A3 (TF-IDF) pada GT yang sama → tabel NMI/ARI + waktu run.
  4. Keputusan adopsi: menang → ganti default pipeline + catat di `DECISIONS.md` (D-xx baru); kalah/terlalu berat → tetap TF-IDF, hasil tetap didokumentasikan di `ABLATION_RESULTS.md`.
- **Verifikasi:** hasil ablation terdokumentasi; bila diadopsi → smoke pipeline + pytest + regresi cron.

### DBG-017 ✅ — Klarifikasi RBAC verifikasi teknis (Verifikator) vs pengawasan (Kepala Dinas) (2026-10-18 / Solusi 2026-10-22)

- **Gejala:** 
  1. Di Antrian Validasi, aksi "Verifikasi Mismatch" tidak bisa dilakukan oleh `kepala_dinas` (menghasilkan 403 / tombol terblokir).
  2. Di Laporan Perlu Review, verifikasi ratusan aduan noise/mandiri dibebankan ke `kepala_dinas`, menciptakan bottleneck birokrasi dan tidak selaras dengan pembagian kerja dinas.
- **Akar (temuan & kajian birokrasi):** Berdasarkan Permendagri No. 8/2023 dan pedoman penanganan pengaduan SP4N-LAPOR!, verifikasi bukti fisik/lapangan adalah wewenang **Pejabat Pengelola Pengaduan (Verifikator Dinas)**, sedangkan Kepala Dinas adalah **Pejabat Pembina/Pengarah** yang berfokus pada disposisi, persetujuan status penanganan akhir, dan fungsi pengawasan.
- **Penyelesaian (2026-10-22 — D-30):**
  1. `backend/app/routers/laporan.py`:
     - `require_review_read = RoleChecker(["admin", "verifikator_dinas", "kepala_dinas"])` pada `GET /laporan/perlu-review` — Kepala Dinas dan Verifikator dapat melihat antrean laporan noise.
     - `require_review_write = RoleChecker(["admin", "verifikator_dinas"])` pada `PUT /laporan/{id}/status` — aksi validasi/tolak laporan diserahkan ke staf teknis verifikator. `kepala_dinas` read-only.
  2. `frontend/src/pages/dinas/LaporanPerluReview.tsx`:
     - `bolehAksi = role === "admin" || role === "verifikator_dinas"`.
     - Tampilan Kepala Dinas diberikan banner penanda mode pengawasan (read-only).
  3. `frontend/src/pages/dinas/AntrianValidasi.tsx`:
     - Tombol verifikasi mismatch tetap khusus `verifikator_dinas` sesuai alur penanganan teknis.
  4. Dokumen kontrak `INTERFACES.md` §4, keputusan produk `DECISIONS.md` §D-30, dan `DEBUGGING.md` diselaraskan.
- **Verifikasi:** Test regresi `test_blackbox.py` memvalidasi verifikator dapat review/update, kepala dinas read-only, dan warga tetap 403.

---

### DBG-018 ✅ — Warga terdaftar tidak bisa vote; mekanisme `pending→terhitung` tidak ada (2026-10-18 / Solusi 2026-10-22)

- **Gejala:** user baru daftar → login → klik vote → 403 "Hanya warga terverifikasi atau komite sekolah yang dapat memvote."
- **Akar:** register default `role=warga_umum`, `status_verifikasi=menunggu` (`models/user.py:28`); `require_warga = RoleChecker(["warga_terverifikasi","komite_sekolah"])` (`vote.py:20`) menolak `warga_umum`; **tidak ada endpoint manajemen user sama sekali** (grep = 0) dan tidak ada halaman verifikasi warga di admin dinas → tidak ada jalur menaikkan role → vote terblokir selamanya.
- **Inkonsistensi D-08:** vote dibuat `status_vote="pending"` tetapi `jumlah_vote_terhitung` langsung +1 (`vote.py:40-43`); tidak ada kode/cron yang memproses `pending → terhitung` → fitur anti-buzzer D-08 setengah jadi (vote "pending" sudah ikut mengubah skor).
- **Penyelesaian (2026-10-22 — D-28):**
  1. `backend/app/routers/vote.py`: `require_warga = RoleChecker(["warga_umum", "warga_terverifikasi", "komite_sekolah"])` — mengizinkan seluruh warga yang terdaftar & terotentikasi untuk vote. Staf dinas (`verifikator_dinas`, `kepala_dinas`, `admin`) tetap ditolak (403) agar suara murni dari warga.
  2. `frontend/src/pages/warga/DashboardWilayah.tsx`: `ROLE_BOLEH_VOTE = ["warga_umum", "warga_terverifikasi", "komite_sekolah"]`, pesan error diselaraskan: *"Vote hanya untuk akun warga dan komite sekolah."*
  3. Dokumen kontrak `docs/universal/INTERFACES.md` §680 dan keputusan produk `docs/universal/DECISIONS.md` §D-28 diperbarui.
  4. Test regresi `test_blackbox.py` memverifikasi `warga_umum` dapat vote dan staf dinas tetap 403.
- **Verifikasi:** pytest lulus (warga_umum 200/201, staf 403) · `npm run build` frontend hijau.

### DBG-019 ✅ — Navbar warga hanya 3 menu (2026-10-18)

- **Gejala:** setelah login warga, navbar hanya "Dashboard · Direktori Sekolah · Riwayat Laporan" (`WargaLayout.tsx:33-35`), sedangkan navbar publik punya 5 (`PublicLayout.tsx:33-37`); pintasan "Buat Laporan" (`/laporan/baru`) tidak ada di menu mana pun.
- **Akar:** `WargaLayout` dibuat terpisah dari `PublicLayout` dan tidak pernah disinkronkan.
- **Penyelesaian (2026-10-21):**
  1. `frontend/src/layouts/WargaLayout.tsx`:
     - Menambahkan navigasi lengkap: "Dashboard", "Dashboard Wilayah" (`/laporan/wilayah`), "Direktori Sekolah" (`/sekolah`), "Riwayat Laporan" (`/laporan/riwayat`), dan "Tentang Data" (`/tentang`).
     - Menambahkan tombol aksi primer `"Buat Laporan"` mengarah ke `/laporan/baru` di area kanan navbar warga sebelum profil/tombol keluar.
- **Verifikasi:** Build frontend `npm run build` lulus tanpa error, styling konsisten dengan PublicLayout.

### DBG-020 ⚪ — Verifikasi email tidak ada sama sekali (2026-10-18)

- **Gejala:** registrasi langsung aktif tanpa bukti kepemilikan email; `status_verifikasi` tidak pernah diubah oleh alur apa pun.
- **Akar:** tidak ada kode SMTP/token verifikasi di backend (grep `SMTP|send_mail|token verifikasi` = 0); `requirements.txt` tanpa pustaka email; tidak ada endpoint konfirmasi.
- **Dampak:** D-08 (vote akun baru "Pending" sampai verifikasi) tanpa dasar teknis; akun massal mudah dibuat; jalur naik role warga (DBG-018) ikut mandek.
- **Rencana (keputusan ⚪):**
  - **Opsi A (tahap 1, rekomendasi):** mode dev — token verifikasi disimpan di DB, link dikembalikan di response / ditulis ke log **hanya saat `DEBUG`** (jangan di produksi).
  - **Opsi B:** SMTP nyata — butuh kredensial `.env SMTP_*` dari pemilik + pustaka (`aiosmtplib`/`fastapi-mail`).
  - **Opsi C (target akhir):** dua mode — SMTP bila terkonfigurasi, fallback token-log bila tidak.
  - Endpoints: `POST /auth/verifikasi-email/kirim`, `POST /auth/verifikasi-email/konfirmasi`; on-success → `status_verifikasi='terverifikasi'` + (kebijakan DBG-018) role → `warga_terverifikasi`; FE: banner "email belum diverifikasi" + halaman `/verifikasi-email?token=…`.
- **Verifikasi:** alur penuh daftar → konfirmasi → vote OK; tanpa konfirmasi → vote tetap terblokir; uji negatif token salah/kedaluwarsa.

### DBG-021 ✅ — Skor klaster basi setelah data Dapodik masuk (2026-10-20)

- **Gejala:** klaster `5dda3ac6-7ed9-478b-9e71-fd9835b56c58` (5 laporan: 1 sedang, 1 ringan, 3 berat) menyimpan `skor_keparahan = 55,86`, `skor_prioritas = 61,86`, `jumlah_vote_terhitung = 6`. Hitung ulang dari sumber saat ini: `skor_laporan = 79,8`, `skor_dapodik = 66,0` → `skor_keparahan = 75,66`, `skor_prioritas = 81,66`. Selisih **19,8** pada kedua field.
- **Akar (indikasi kuat):** `0,7 × 79,8 = 55,86` tepat sama dengan nilai tersimpan → saat skor terakhir ditulis, komponen Dapodik **0**. Skor tidak pernah dihitung ulang setelah data Dapodik terisi, sehingga snapshot lama bertahan. Back-calc `skor_keparahan = skor_prioritas − votes` selalu konsisten secara aritmetika, jadi bug ini tidak terlihat sebagai "selisih perhitungan"; ia hanya menyimpan komponen severity yang sudah basi.
- **Koreksi (21 Okt 2026, audit Hermes):** kalimat "back-calc selalu konsisten secara aritmetika" **benar** dan sudah terverifikasi — `scoring.py:210-213` memang menghitung `skor_keparahan = 0,7×laporan + 0,3×dapodik` lalu `skor_prioritas = skor_keparahan + votes`, sehingga `prioritas − votes` mengembalikan `keparahan` dengan **tepat**. Karena itu **root cause bukan pada back-calc**, melainkan pada (a) snapshot yang tidak pernah dihitung ulang **dan** (b) **DBG-022** — `vote.py` menulis ulang skor dengan Dapodik nol.
- **Koreksi lokasi:** jumlah call site back-calc = **4**, bukan 2 — `run_clustering.py:204`, `klaster.py:116`, `vote.py:49`, `vote.py:105`. Nomor baris lama (`run_clustering.py:161`) sudah kedaluwarsa.
- **Koreksi penting — `klaster.py:103-110` BUKAN pelaku.** Blok itu justru **query `KondisiSarana` dan mengisi** `kondisi_dapodik` dengan benar (identik dengan `run_clustering.py:189-194`). Yang cacat di `klaster.py` hanya **baris 116** (back-calc). Hanya `vote.py:46,100` yang meng-hardcode nol **tanpa query**. Menyamakan keduanya membuat perbaikan salah sasaran.
- **Konsekuensi urutan perbaikan:** DBG-022 harus didahulukan atas back-calc — DBG-022 merusak data **secara aktif** tiap ada vote, sedangkan back-calc hanya menyimpan nilai basi.
- **Dampak:** peringkat/level klaster bisa understated. Live: 1 dari 43 klaster terkonfirmasi; perlu audit menyeluruh sebelum menyimpulkan hanya satu.
- **Rencana (urutan final, 21 Okt 2026):**
  1. **DBG-022 dulu** — tambah helper `hitung_kondisi_dapodik(db, npsn)` di `scoring.py`, pakai di `vote.py:46` dan `vote.py:100`. Ini **wajib**, bukan opsional: tanpa ini recompute apa pun akan langsung dirusak vote berikutnya.
  2. Tambah `calculate_components(kondisi_laporan, kondisi_dapodik, votes) -> tuple[float, float]` (atau ubah `calculate_priority_score` agar mengembalikan `(skor_keparahan, skor_prioritas)`); pakai langsung di **4** call site; hapus semua back-calc.
  3. `scripts/recompute_skor.py` — hitung ulang **semua** klaster dari `laporan` + `kondisi_sarana` + votes (dry-run default); audit berapa klaster berubah, **jangan asumsikan hanya 1 dari 43**.
  4. Test regresi: skor tersimpan == hitung ulang (toleransi 0,01) + test khusus **"vote tidak menghapus komponen Dapodik"**.
- **Verifikasi:** jalankan recompute 43 klaster → selisih 0 · pytest regresi lulus · catat jumlah klaster yang berubah di CHANGELOG.

---

- **Penyelesaian (2026-10-21):**
  1. `scoring.py` — fungsi baru `calculate_score_components(...) -> (skor_keparahan, skor_prioritas)` (hitung langsung, tanpa mundur) + `hitung_kondisi_dapodik(db, npsn)` (satu sumber agregasi Dapodik). `calculate_priority_score` **kontrak lama dipertahankan** (return float, delegasi ke komponen) — `test_scoring_null` lulus tanpa perubahan.
  2. 4 call site back-calc diganti pemakaian tuple: `run_clustering.py`, `routers/klaster.py`, `routers/vote.py` (create_vote + F3.14). Duplikasi query `KondisiSarana` di 2 file dihapus, kini lewat helper.
  3. **`scripts/recompute_skor.py`** — skrip sekali jalan, dry-run default, `--commit` menulis, idempoten; toleransi 0,01.
- **Verifikasi:** pytest **169/169** (163 base + 6 test regresi baru di `tests/test_recompute_skor.py`) · dry-run live: **43 klaster diperiksa, 1 berubah** — `5dda3ac6` 55,86/61,86 → **75,66/81,66** (selisih 19,8 = 0,3×66 sesuai prediksi) · `--commit` ditulis · rerun → **0 berubah** (idempoten) · tidak ada noise line-ending (HEAD & working tree sama-sama LF).

### DBG-022 ✅ — Vote menghapus komponen Dapodik 30% (2026-10-21)

- **Gejala:** setiap kali warga memberi vote, `skor_keparahan` klaster **turun** jauh lebih banyak daripada yang wajar — seolah kondisi fasilitas membaik padahal tidak ada data baru. Endpoint resmi **F3.14 `PUT /vote/klaster/{id}/skor`** ("Hitung Ulang Skor Prioritas") memperparah, bukan memperbaiki: nilai yang dihasilkan lebih salah daripada sebelum dipanggil.
- **Akar:** dua tempat mengirim `kondisi_dapodik` **hardcoded nol** tanpa membaca tabel `KondisiSarana`:
  - `routers/vote.py:46` (`create_vote`) — `kondisi_dapodik = {"total": 0, "berat": 0, "sedang": 0, "ringan": 0}`
  - `routers/vote.py:100` (F3.14 `PUT …/skor`) — **baris identik**
  Karena `calculate_priority_score` menghitung `skor_keparahan = 0,7×laporan + 0,3×dapodik`, mengirim Dapodik nol **menghapus seluruh bobot 30%**. Skor keparahan hanya menyisakan komponen laporan warga.
- **Bukti numerik:** klaster `5dda3ac6` menyimpan `skor_keparahan = 55,86`; `skor_laporan = 79,8` → `0,7 × 79,8 = 55,86` **tepat**. Padahal dengan Dapodik terisi (`skor_dapodik = 66,0`), nilai seharusnya `75,66`. Selisih **19,8 = 0,3 × 66** persis. Jadi nilai tersimpan konsisten dengan "Dapodik di-nol-kan", bukan dengan "data Dapodik belum ada".
- **Hubungan dengan DBG-021 — bukan duplikat:** DBG-021 = snapshot basi (dihitung sekali, tidak pernah diperbarui). DBG-022 = **kerusakan aktif berulang**: tiap vote/laporan baru menulis ulang skor dengan Dapodik nol. DBG-021 menjelaskan *mengapa nilai lama* bertahan; DBG-022 menjelaskan *mengapa nilai baru* tetap salah. Memperbaiki DBG-021 saja tidak menghentikan kerusakan.
- **Penyelesaian (2026-10-21):** helper `hitung_kondisi_dapodik(db, npsn)` di `scoring.py` dipakai kedua titik keras (`vote.py` create_vote + endpoint F3.14) — query `KondisiSarana` yang sama dengan `klaster.py`/`run_clustering.py`. Kedua endpoint kini menulis `skor_keparahan`/`skor_prioritas` dari `calculate_score_components` (tanpa back-calc).
- **Verifikasi:** test regresi `tests/test_recompute_skor.py::TestVotePertahankanDapodik` (vote & F3.14 mempertahankan komponen Dapodik: 0,7×100 + 0,3×50 = 85, bukan 70) · pytest **169/169**.
- **Dampak:** peringkat & level klaster **understated** setiap ada aktivitas vote. `skor_prioritas` juga ikut turun karena dibangun dari `skor_keparahan`. Pada sistem produksi, isu yang paling banyak divote justru bisa turun peringkatnya — kebalikan dari tujuan fitur vote.
- **Catatan audit (21 Okt 2026, Hermes):** temuan ini berasal dari analisis opencode dan **tervalidasi** — pembacaan langsung `vote.py:46` dan `vote.py:100` mengonfirmasi hardcode `total: 0` di kedua tempat. Satu bagian klaim opencode **ditolak**: `klaster.py:103-110` disebut sebagai pelaku, padahal blok itu benar-benar query `KondisiSarana` dan mengisi Dapodik (sama seperti `run_clustering.py:189-194`); yang cacat di `klaster.py` hanya baris 116 (back-calc, ranah DBG-021).
- **Rencana:**
  1. Ekstrak helper bersama di `scoring.py` — `hitung_kondisi_dapodik(db, npsn) -> dict` — memuat query `KondisiSarana` + agregasi yang kini terduplikasi di `run_clustering.py:189-194` dan `klaster.py:102-110`.
  2. Pakai helper tersebut di `vote.py:46` **dan** `vote.py:100`; hapus kedua literal nol.
  3. Satukan dengan perbaikan DBG-021 langkah 2 (`calculate_components`) agar 4 call site tidak memakai back-calc.
  4. Test regresi khusus: buat vote pada klaster bersekolah dengan `KondisiSarana` terisi → pastikan `skor_keparahan` **tidak turun** dan tetap memuat komponen Dapodik; ditambah uji negatif bahwa memanggil F3.14 **tidak** mengubah nilai bila data sumber tidak berubah.
- **Verifikasi yang diharapkan:** setelah perbaikan + `scripts/recompute_skor.py`, `5dda3ac6` berubah dari `55,86 → 75,66` (dan `61,86 → 81,66`); jumlah klaster yang berubah dicatat di CHANGELOG §3.x; pytest lulus.

### DBG-023 ✅ — Laporan noise tervalidasi tidak muncul di Transparansi Publik (2026-10-22)

- **Gejala:** Laporan warga yang diverifikasi oleh Kepala Dinas melalui `/dinas/perlu-review` (contoh kasus: SMP SUNAN GIRI 1 LAMONGAN, `TRK-AUG-500-0460`, `status_sanggahan = 'divalidasi'`) tidak pernah muncul pada tab "Transparansi Publik" di halaman `/laporan/riwayat`.
- **Akar:** Tab Transparansi Publik di `frontend/src/pages/warga/RiwayatLaporan.tsx:128-130` hanya memanggil `GET /klaster` (daftar klaster hasil agregasi AI). Laporan noise atau non-klaster (`klaster_id IS NULL`) yang divalidasi dinas tidak memiliki rekaman klaster, sehingga secara struktural terabaikan dari tampilan publik.
- **Dampak:** Hasil verifikasi dinas atas aduan warga tidak terlihat secara transparan oleh masyarakat umum, seolah-olah aduan hilang setelah diverifikasi.
- **Penyelesaian (2026-10-22 — D-29):**
  1. Backend `routers/laporan.py`: Endpoint publik baru `GET /laporan/publik` (akses publik, filter `status_sanggahan == 'divalidasi'` & `klaster_id IS NULL`), de-identifikasi `user_id` menjadi string kosong demi kepatuhan UU PDP.
  2. Frontend `api/laporan.ts`: Menambahkan fungsi `listLaporanPublik()`.
  3. Frontend `RiwayatLaporan.tsx`: Menambahkan sub-filter pemisah `[Klaster Isu Sarpras]` vs `[Aduan Mandiri Tervalidasi]` pada tab Transparansi Publik. Aduan mandiri dirender dalam kartu khusus ber-badge hijau `✓ Terverifikasi Dinas (Aduan Mandiri)`.
  4. Kontrak `INTERFACES.md` §4 dan keputusan `DECISIONS.md` §D-29 diperbarui.
- **Verifikasi:** Test regresi `test_laporan_publik_hanya_divalidasi_tanpa_klaster` di `test_blackbox.py` lulus · `GET /laporan/publik` live mengembalikan 1 item (`TRK-AUG-500-0460`, SMP Sunan Giri 1) · `npm run build` frontend hijau.

### DBG-024 ✅ — Modal pertanyaan konfirmasi severity tidak muncul setelah submit laporan (2026-10-22)

- **Gejala:** Warga mengirim laporan baru (contoh: `LAP-20261022-80C7F626`, deskripsi plafon mau jatuh), laporan tersimpan dengan `status_konfirmasi = 'menunggu'`, tetapi **modal popup pertanyaan konfirmasi tidak pernah muncul**. Yang terlihat hanya banner biru di halaman sukses.
- **Akar:** `frontend/src/pages/warga/FormLaporan.tsx` — state `konfirmasiOpen` diinisialisasi `false` dan **tidak pernah diset `true`** di `handleSubmit`. Saat respons `POST /laporan` berisi `konfirmasi.perlu_konfirmasi = true`, kode hanya menyetel `perluKonfirmasi` dan `konfirmasiStatus = "menunggu"` (baris 191-192), sehingga modal tetap tertutup dan hanya banner pasif yang muncul — mudah terlewat oleh warga.
- **Bukti backend tidak bermasalah:** `pilih_pertanyaan()` untuk deskripsi kasus di atas mengembalikan **2 pertanyaan** (`bagian`, `gejala_plafon`) → `perlu_konfirmasi = len(pertanyaan) > 1` = `true`. Jadi pemicu backend benar; cacat ada di sisi FE.
- **Penyelesaian (2026-10-22):**
  1. `FormLaporan.tsx` — tambah `if (res.konfirmasi?.perlu_konfirmasi) setKonfirmasiOpen(true)` setelah state konfirmasi disetel, sehingga modal langsung terbuka begitu laporan berhasil dikirim.
  2. Kondisi banner diperluas menjadi `konfirmasiStatus === null || konfirmasiStatus === "menunggu"` — bila warga menutup modal tanpa menjawab, banner "Jawab Sekarang" tetap tersedia sebagai jalur alternatif (kontrak §19.6: opsional, tidak memblokir laporan).
- **Verifikasi:** `npm run build` frontend hijau (tsc + vite) · jalur manual dipertahankan: `PertanyaanKonfirmasi` juga dapat dibuka dari `RiwayatLaporan.tsx` selama `status_konfirmasi = 'menunggu'`.
- **Catatan perilaku:** modal hanya terbuka bila `perlu_konfirmasi = true` (≥ 2 pertanyaan, yaitu ada `bagian` + minimal satu gejala terdeteksi). Deskripsi yang tidak memicu deteksi komponen apa pun hanya menghasilkan 1 pertanyaan → `false`, sesuai kontrak §4.1.
- **Koreksi lanjutan (22 Okt, 21:40 WIB) — ada DUA jalur submit, jalur kedua terlewat:**
  - Gejala berulang: setelah perbaikan pertama + hard reload, submit baru (`LAP-20261022-0D8D9813`, NPSN `70002205`) tetap tanpa pertanyaan.
  - **Akar sebenarnya:** perbaikan pertama hanya menyentuh `pages/warga/FormLaporan.tsx`. Jalur yang dipakai warga (klik **"Buat Aduan Baru"** → dari `DetailSekolah.tsx:686`) memakai komponen berbeda: **`components/composite/ModalFormLaporan.tsx`**, yang memanggil `kirimLaporan()` tetapi **membuang `res.konfirmasi`** dan tidak pernah merender `PertanyaanKonfirmasi`. Bukti: laporan `0D8D9813` ber-NPSN `70002205` = nilai default hardcode `initialNpsn` komponen itu, dan deskripsinya tanpa prefix tipe temuan (ciri jalur modal, bukan `FormLaporan`).
  - **Penyelesaian:** `ModalFormLaporan.tsx` — simpan `laporanId` + `perluKonfirmasi`; auto-open `PertanyaanKonfirmasi` (nested dialog) saat `perlu_konfirmasi`; tombol "Jawab Sekarang" sebagai jalur alternatif bila ditutup; penanda "terjawab" di layar sukses; reset state di `handleReset`.
  - **Verifikasi:** `npx tsc --noEmit` bersih · `npm run build` hijau · Vite dev server mengonfirmasi modul ter-transform memuat `if (res.konfirmasi?.perlu_konfirmasi) setKonfirmasiOpen(true)` dan `PertanyaanKonfirmasi`.
  - **Pelajaran:** jangan asumsikan satu jalur submit — di repo ini ada dua (`FormLaporan.tsx` halaman penuh dan `ModalFormLaporan.tsx` modal dari DetailSekolah); setiap perubahan perilaku pasca-submit wajib dicek di keduanya.

---

### DBG-025 ✅ — Status `perlu_info_tambahan` dihapus total (2026-10-28)

- **Gejala:** Tombol "Tandai Kejadian Baru" di Antrian Validasi tidak berfungsi seperti yang diharapkan petugas — membingungkan karena tidak jelas fungsinya dalam alur verifikasi.
- **Analisis:** Tombol sebenarnya berfungsi (set status `perlu_info_tambahan` via `PUT /klaster/{id}/verifikasi`), tetapi status ini tidak dipakai dalam alur bisnis dan membingungkan petugas. Tidak ada klaster yang pernah memakai status ini (0 baris di DB live).
- **Penyelesaian (2026-10-28):** Hapus total dari FE & BE:
  1. **Migrasi** `a1b2c3d4e5f6` — ALTER ENUM `klaster.status_verifikasi` (4→3 nilai) + `status_log.status` (8→7 nilai), guard non-MySQL + update baris lama jika ada.
  2. **Backend** — `models/klaster.py`: hapus dari `STATUS_KLASTER_ENUM` & `STATUS_LOG_ENUM`; `routers/klaster.py`: hapus dari `valid_status` (2 endpoint) + kondisi `status_verifikasi`; `verify_schema_parity.py`: update komentar.
  3. **Frontend** — `AntrianValidasi.tsx`: hapus tombol, tab, state `"baru"`, `handleDecision` type; `types.ts`: hapus dari `StatusKlaster` & `StatusPenanganan`; `TabelVerifikasi.tsx`, `DashboardWilayah.tsx`, `RiwayatLaporan.tsx`, `StatusTindakLanjutWarga.tsx`, `InstitutionalStepper.tsx`: hapus dari label/badge/stepper.
  4. **Docs** — `INTERFACES.md` §5 & §7: hapus dari daftar status.
- **Verifikasi:** pytest **158/158** · `npm run build` hijau · grep `perlu_info_tambahan` di `frontend/src` = 0.
+
+### DBG-026 ✅ — Kegagalan klasterisasi mikro per sekolah (2026-10-28)
+
+- **Gejala:** Pengujian E2E pengiriman 5 laporan kerusakan plafon/atap di SD ALAM CITRA INSANI dan 2 laporan toilet di SD NEGERI 1 MADE menghasilkan `labels = [-1]` (semua dianggap noise/outlier) sehingga 0 klaster terbentuk.
+- **Akar:** Klasterisasi dijalankan terisolasi per sekolah (`sekolah_npsn`). Saat $n < 10$, UMAP dilewati dan HDBSCAN dijalankan langsung pada matriks TF-IDF mentah 62 fitur. Vektor TF-IDF antar-kalimat pendek berjarak Euclidean renggang ($1,12 - 1,38$), tidak memenuhi densitas mutual reachability HDBSCAN (`min_cluster_size=3`), sehingga seluruh sampel diberi label `-1`.
+- **Penyelesaian (D-31):**
+  1. Tambahkan fungsi adaptif di `clustering.py`: jika $n < 10$ dan $n \ge 2$, gunakan `AgglomerativeClustering(metric="cosine", linkage="average", distance_threshold=0.88, n_clusters=None)`.
+  2. Filter klaster anggota $\ge 2$ sebagai klaster valid; klaster tunggal (*singleton*) otomatis ditandai `-1` (*noise / perlu-review*).
+  3. Jika $n \ge 10$, tetap gunakan HDBSCAN standar (C2).
+- **Verifikasi:** Uji 5 laporan plafon SD Alam Citra Insani menghasilkan 1 klaster atap/plafon valid (4 laporan menyatu, 1 laporan terpisah). Uji 2 laporan toilet SD Made menghasilkan 1 klaster toilet valid.
+
+---

## Catatan Proses (bukan bug produksi)

- **Test DB `simakis_test` harus di-recreate sebelum pytest penuh** (`DROP DATABASE IF EXISTS simakis_test; CREATE DATABASE simakis_test;`). `conftest.py` memakai `create_all(checkfirst=True)` — tabel sisa dari run yang di-kill di tengah bisa punya kolom/enum versi lama → error misterius. Sudah dua kali terbukti (Okt 2026). Ide guard: versi ringan dari `verify_schema_parity.py` untuk `simakis_test`.
- **Delegasi sub-agent sempat rusak** (lifecycle error "cannot be resumed safely" + "Cannot connect to API", Okt 2026) — semua lane F4.7–F4.9 dikerjakan langsung oleh orkestrator.

---

## Cara memperbarui

1. **Masalah baru:** tambahkan baris `DBG-xxx` (ID lanjutan) di tabel Ringkasan + blok Detail (Gejala/Akar/Dampak/Rencana) — status 🔴 atau ⚪.
2. **Selesai:** ubah status → ✅, isi blok **Penyelesaian** (commit hash + angka verifikasi) dan **Verifikasi**, tandai pula di Ringkasan. Jangan hapus entri.
3. Update bersamaan: `docs/backend/CHANGELOG.md` §3.x (ringkas) — DEBUGGING.md = catatan teknis lengkap.
