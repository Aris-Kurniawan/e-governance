# Analisis Detail: 3 Faktor Laporan Tidak Tercluster

**Status**: Laporan tidak tercluster = 418/600 (70%) → klaster_id NULL di DB  
**Temuan**: 3 root cause + 1 secondary bug  
**Tanggal analisis**: 5 Okt 2026  

---

## 1. FAKTOR 1: Bug Transaksi Tunggal & Rollback Kaskade

### 1.1 Root Cause (Mekanik)

**File**: `scripts/run_clustering.py` (baris 47–176)

**Flow eksekusi** (simplified):
```
db = SessionLocal()  # ← satu session tunggal
try:
  for sekolah_npsn, laporan_list in grouped.items():  # 62 sekolah
    try:
      klaster = Klaster(...)
      db.add(klaster)
      db.flush()  # ← flushed ke buffer, belum commit
      for lap in laps_in_cluster:
        lap.klaster_id = klaster.id  # ← juga hanya di session memory
      total_klaster_created += 1
    except Exception as e:
      db.rollback()  # ← MEMBATALKAN SEMUA flush sebelumnya untuk SEMUA sekolah sebelumnya!
      continue
  db.commit()  # ← baru commit di akhir loop
```

**Masalah**: 
- Klaster & laporan assignment hanya di-flush (buffered), belum committed
- Saat sekolah X gagal → `db.rollback()` menghapus **SEMUA perubahan** di session, termasuk sekolah A, B, C yang sudah selesai diproses (belum commit)
- Loop lanjut ke sekolah Y, Z, dll — hanya kerja mereka yang survive sampai commit akhir

**Bukti**:
```
Output:   "Created 83 klaster in 17.1s"
DB state: 26 klaster (hanya sekolah sesudah error terakhir)
Loss:     57 klaster + ~400 laporan assignment hilang
```

### 1.2 Analisis Dampak

**Skenario worst-case** (sesuai log 5 Okt):
```
Sekolah 1–10   : processed ✓ (flush OK)
Sekolah 11     : UMAP crash (eigh error) → Exception
               → rollback() ← WIPE sekolah 1–10!
Sekolah 12–45  : processed ✓ (flush OK)
Sekolah 46     : error → rollback() ← WIPE sekolah 12–45!
Sekolah 47–62  : processed ✓ (flush OK)
Final commit() : hanya sekolah 47–62 + (sekolah 12–45 jika 45 < 46)
Result: 26 klaster (3–4 groups × ~6–8 sekolah) + ~182 laporan linked
Loss:   ~400–430 laporan stay NULL
```

### 1.3 Secondary Bug: Index Mismatch (Baris 91–93)

```python
texts = [lap.deskripsi for lap in laporan_list if lap.deskripsi]  # filter

for idx, lap in enumerate(laporan_list):  # ← iterate ALL
    if lap.deskripsi:  # ← guard, tapi idx TETAP berdasar ALL
        cluster_id = int(labels[idx])  # ← BUG: labels[idx] != texts[idx]
```

**Scenario**:
- laporan_list = [L1 (deskripsi OK), L2 (deskripsi NULL), L3 (OK)]
- texts = [L1.deskripsi, L3.deskripsi]  (2 item)
- labels = [0, 1]  (2 clusters)
- Loop:
  - idx=0, L1: labels[0]=0 ✓ (correct)
  - idx=1, L2: skipped (no deskripsi) ✓
  - idx=2, L3: labels[2] ← **OUT OF BOUNDS!** or wrong cluster

**Dampak**: index oob error OR wrong cluster assignment. Latent bug (probably rare since most laporan have deskripsi).

---

## 2. FAKTOR 2: UMAP Spectral Crash pada Dataset Kecil

### 2.1 Root Cause (Matematika UMAP)

**File**: `app/ai_pipeline/reduction.py` (baris 46–51)

**Default UMAP init** = `'spectral'` (computes top-k eigenvectors). Ketika:
- `n_components = 10` (per ablation spec)
- `n_samples ≤ 11` (schools kecil)
- spectral init needs eigendecomposition of k×k matrix, k ≈ n_components+1

scipy.linalg.eigh() requires `n >= k`. Jika `n_samples < k` → **erro r**.

**Log error**:
```
Cannot use scipy.linalg.eigh for sparse A with k >= N
```

### 2.2 Threshold & Empirical Evidence

**Dari log 5 Okt**:
- ✅ Sekolah dengan 12+ laporan: UMAP berhasil (init='spectral' fallback to random atau n_neighbors truncated)
- ❌ Sekolah dengan ≤11 laporan: eigh crash (spectral init attempted)

**Exact threshold**: scipy.sparse.linalg.eigsh() fails when `k >= n`. UMAP spectral uses k = min(n_components, n_samples-1) + overhead → fails when n_samples ≤ ~11 for n_components=10.

**Approx. affected schools** (dari 62 total):
- ~11–15 sekolah dengan 5–11 laporan
- ~120–180 laporan terpengaruh
- Plus cascading loss dari Factor 1 rollback

### 2.3 Why This Happens

UMAP initialization strategi:
1. `init='spectral'` → uses PCA-like eigenvector decomposition
2. untuk sparse/small data, eigendecomposition fails
3. **fallback** seharusnya ke random, tapi crash terjadi SEBELUM fallback
4. Atau UMAP version mungkin tidak punya fallback

**Solusi**: force `init='random'` untuk small n_samples, atau skip UMAP sepenuhnya, atau turunkan n_components.

---

## 3. FAKTOR 3: Test Isolation — Pytest Menghapus Prod DB

### 3.1 Root Cause (Fixture Scope & DB Binding)

**File**: `tests/test_klaster.py` (baris 18–23)

```python
@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)    # engine = DB produksi "simakis"
    yield
    Base.metadata.drop_all(bind=engine)      # ← teardown: HAPUS SEMUA TABEL
```

**Masalah**:
- `engine` bound ke `DATABASE_URL` = `mysql+pymysql://root:dev123@localhost/simakis` (produksi)
- `Base.metadata.drop_all()` = drop semua SQLAlchemy models (12 tabel utama)
- `alembic_version` **survive** karena bukan model (raw SQL table)
- `autouse=True` + `scope="module"` = jalan SETIAP pytest, teardown wipe ALL

**Dampak**:
- Running `pytest` = destroy production data
- Terulang 5 Okt: post-clustering (182 linked, 26 klaster, 600 laporan) + verification (26 klaster diterima) → `pytest -v` → drop_all() → DB kosong lagi
- Ini juga explains 30 Sep finding ("DB hanya alembic_version")

### 3.2 Why alembic_version Survives

Alembic tidak menggunakan SQLAlchemy ORM models untuk tracking versi. Tabel `alembic_version` dibuat dengan raw SQL di alembic/env.py:
```sql
CREATE TABLE alembic_version (
  version_num VARCHAR(32) NOT NULL
)
```

Ini **bukan di Base.metadata** → `drop_all(bind=engine)` tidak mengenalinya → survives.

### 3.3 Full Test Isolation Architecture

Saat ini **semua tests** pakai **satu fixture yang sama**:
- `tests/test_auth.py:23` — `Base.metadata.create_all(bind=engine)`
- `tests/test_laporan.py:27` — sama
- `tests/test_pdp.py:62` — sama
- `tests/test_klaster.py:18–23` — sama (dengan drop_all)

Tidak ada **test DB terpisah** → semua tes overlapping dengan produksi.

---

## 4. FIX DESIGNS

### 4.1 Fix Factor 1: Commit Per Sekolah (Scoped Transactions)

**Option A: Commit per sekolah (Recommended)**

```python
def run_clustering_job():
    db = SessionLocal()
    for sekolah_npsn, laporan_list in grouped.items():
        try:
            # ... pipeline & klaster creation ...
            for lap in laps_in_cluster:
                lap.klaster_id = klaster.id
            
            db.commit()  # ← COMMIT setiap sekolah sukses
        except Exception as e:
            print(f"  ✗ Error {sekolah_npsn}: {e}")
            db.rollback()  # ← rollback HANYA sekolah ini, tidak semua
            continue
```

**Keuntungan**:
- Rollback hanya mengugurkan 1 sekolah (1–20 laporan), bukan 50+
- Failed sekolah siap di-retry next cron run
- Better observability (tahu sekolah mana yg gagal)

**Risiko**:
- Partial progress (some schools done, some not) — acceptable
- Perlu ensure retry logic (mark failed schools)

**Tradeoff**: +3 baris, cleaner error boundaries

---

**Option B: Savepoint Per Sekolah (Over-engineered)**

```python
for sekolah_npsn, laporan_list in grouped.items():
    savepoint = db.begin_nested()
    try:
        # ...
        savepoint.commit()
    except:
        savepoint.rollback()
        db.rollback()  # fallback for outer txn issues
```

Kompleks, jarang diperlukan. Skip.

---

**Fix Index Bug (Line 91–93)**: 

```python
# Old (buggy):
for idx, lap in enumerate(laporan_list):
    if lap.deskripsi:
        cluster_id = int(labels[idx])  # wrong idx!

# New:
text_idx = 0
for lap in laporan_list:
    if lap.deskripsi:
        cluster_id = int(labels[text_idx])  # ✓
        text_idx += 1
```

**Atau lebih clean: build texts with index tracking**:

```python
texts_with_idx = [(i, lap.deskripsi) for i, lap in enumerate(laporan_list) 
                  if lap.deskripsi]
texts = [t for _, t in texts_with_idx]
labels = default_pipeline.run(texts)

klaster_map = {}
for (idx, _), cluster_id in zip(texts_with_idx, labels):
    lap = laporan_list[idx]
    cluster_id_int = int(cluster_id)
    if cluster_id_int not in klaster_map:
        klaster_map[cluster_id_int] = []
    klaster_map[cluster_id_int].append(lap)
```

**Rekomendasi**: Option A (commit per sekolah) + index tracking refactor.

**Effort**: 1–2 jam, 20–30 lines changed.

---

### 4.2 Fix Factor 2: Guard UMAP Spectral for Small n_samples

**Option A: Force init='random' untuk n_samples kecil (Recommended)**

```python
def reduce_dimensions(
    embeddings: np.ndarray,
    n_components: int = 10,
    random_state: int = 42,
    **umap_kwargs,
) -> np.ndarray:
    if embeddings.shape[0] == 0:
        return embeddings
    
    if n_components >= embeddings.shape[1]:
        return embeddings
    
    # ← NEW: Guard spectral crash
    n_samples = embeddings.shape[0]
    if n_samples < n_components + 2:  # threshold: n must be > k+1
        umap_kwargs['init'] = 'random'  # skip spectral, use random
        if n_samples < n_components:  # if n < k, can't reduce to k dimensions
            n_components = max(2, n_samples - 1)  # reduce target dim
    
    reducer = umap.UMAP(
        n_components=n_components,
        random_state=random_state,
        **umap_kwargs,
    )
    return reducer.fit_transform(embeddings)
```

**Keuntungan**:
- Prevents spectral crash
- Random init is valid (though less optimal)
- Minimal code change (4 lines)
- No re-architecture needed

**Risiko**: 
- Random init → possibly worse clustering quality (acceptable for small n)
- Dimension reduction might be weak for tiny datasets (but better than crash)

---

**Option B: Skip UMAP untuk n_samples kecil**

```python
if n_samples < 12:  # arbitrary threshold
    return embeddings  # skip UMAP entirely
```

**Keuntungan**: Simplest, preserves full dimensionality (good for small data).  
**Risiko**: No dimensionality reduction = high-dim noise might hurt HDBSCAN.

**Hybrid (Recommended)**: use Option A (random init fallback) + Option B (skip for very small, e.g., n < 3).

---

**Option C: Adaptive n_components**

```python
n_components_adaptive = min(n_components, max(2, n_samples - 1))
```

Use smaller k when n_samples small. Works with spectral.

---

**Rekomendasi**: **Option A + adaptive n_components**.

**Effort**: 8–10 baris changed, minimal risk.

---

### 4.3 Fix Factor 3: Test DB Isolation

**Option A: Separate Test Database (Recommended, Long-term)**

Create `conftest.py`:
```python
import os
import pytest
from sqlalchemy import create_engine
from app.models.base import Base
from app.core.database import SessionLocal

# Override engine untuk tests
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", 
                               "mysql+pymysql://root:dev123@localhost/simakis_test")

@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(test_engine):
    connection = test_engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
```

**Setup**:
```bash
# Create test DB
mysql -u root -pdev123 -e "CREATE DATABASE simakis_test;"

# Run tests
pytest tests/ --tb=short
```

**Keuntungan**:
- Production DB never touched
- Tests fully isolated
- Can parallel-run tests (each gets own DB)
- Clean teardown (drop test DB, not prod)

**Risiko**: 
- Need extra MySQL DB
- Team must follow convention (use conftest fixtures)
- Migration: existing tests use `Base.metadata.create_all(bind=engine)` → must switch to injected `db_session`

---

**Option B: Transaction-scoped Rollback (Medium-term)**

Keep single DB but rollback each test:
```python
@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    yield session
    transaction.rollback()  # ← rollback, not drop
    connection.close()
```

**Keuntungan**: No new DB needed, simpler.  
**Risiko**: Slower (rollback per test), alembic_version tracking breaks.

---

**Option C: Drop Only Test Markers (Quick-fix)**

Modify `tests/test_klaster.py` (and others):
```python
# Remove drop_all() from teardown
@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Remove: Base.metadata.drop_all(bind=engine)
```

**Keuntungan**: Instant, no code change.  
**Risiko**: Data accumulates; tests are not isolated; side-effects bleed.

---

**Rekomendasi**: **Option A (separate test DB)** long-term + **Option B (txn rollback)** interim.

**Execution**:
1. Create `conftest.py` with test fixtures + session factory
2. Update `tests/*.py` to use `db_session` fixture instead of engine bind
3. Create `simakis_test` DB
4. Run tests

**Effort**: 3–4 jam (refactor 6 test files + create conftest + test fixture update).

---

## 5. EXECUTION PLAN

### 5.1 Dependency DAG

```
Fix Factor 3 (Test Isolation)
  ↓ must do first (protects DB during implementation)
Fix Factor 1 (Commit per sekolah)
  ↓ parallel with Factor 2
Fix Factor 2 (UMAP spectral guard)
  ↓
Integration Test (re-seed + re-clustering on fixed code)
  ↓
Verification (600/600 clustered, 26+ klaster)
```

**Reason**: Fix Factor 3 first so we don't lose data while fixing 1 & 2.

---

### 5.2 Per-Factor Checklist

#### **Phase 1: Factor 3 (4 jam)**

- [ ] Create `tests/conftest.py` with test fixtures
- [ ] Update all tests (`test_*.py`) to use `db_session` fixture
- [ ] Create MySQL DB: `CREATE DATABASE simakis_test;`
- [ ] Verify pytest doesn't touch production DB
- [ ] Run `pytest tests/ -v` → all 39 pass on clean test DB

**Verification command**:
```bash
./venv/bin/python -c "
from sqlalchemy import text
from app.core.database import SessionLocal
db = SessionLocal()
try:
    print('Production DB tables:', db.execute(text('SHOW TABLES')).fetchall())
finally:
    db.close()
"
# Should show: klaster, laporan, sekolah, ... (not empty)
```

---

#### **Phase 2: Factor 1 (2 jam)**

- [ ] Edit `scripts/run_clustering.py` (lines 47–176):
  - Move `db.commit()` inside per-school try block (after line 158)
  - Add `db.flush()` before `db.commit()` (safety)
  - Fix index bug (lines 91–96): use text_idx tracking
  - Remove outer `db.rollback()` at line 173 (optional, keep for safety)
- [ ] Verify logic: one rollback only affects current school
- [ ] Test: create unit test for clustering with deliberate failure on school 2/10

**Diff estimate**: +5 lines, -2 lines, ~10 logical changes.

---

#### **Phase 2b: Factor 2 (1 jam, parallel with 2)**

- [ ] Edit `app/ai_pipeline/reduction.py` (lines 46–51):
  - Add check: if `n_samples < n_components + 2`, set `umap_kwargs['init'] = 'random'`
  - Add adaptive n_components: `n_components = min(n_components, max(2, n_samples-1))`
- [ ] Test: call `reduce_dimensions()` with 5, 11, 20 samples; verify no eigh crash

**Diff estimate**: +5 lines.

---

#### **Phase 3: Integration Test (3 jam)**

- [ ] `DROP DATABASE simakis; CREATE DATABASE simakis;`
- [ ] `./venv/bin/alembic upgrade head`
- [ ] `./venv/bin/python scripts/setup_f300.py` (re-seed 62 sekolah, 100 laporan)
- [ ] `./venv/bin/python app/ai_pipeline/experiments/insert_augmented_laporan.py` (500 laporan)
- [ ] `./venv/bin/python scripts/run_clustering.py` (NEW: per-sekolah commit)
  - Monitor output: no rollbacks, all sekolah processed
  - Expected: 600 laporan clustered (or ~580–600 if 1–2 fail)
- [ ] Verify: `SELECT COUNT(*) FROM laporan WHERE klaster_id IS NULL` → 0 or < 20 (acceptable)

---

#### **Phase 4: Pytest Verification (1 jam)**

- [ ] `./venv/bin/python -m pytest tests/ -v` → all 39 pass
- [ ] Verify prod DB still has data post-tests (test isolation works)

---

#### **Phase 5: Documentation (1 jam)**

- [ ] Update `TASK_GUIDE.md` F4.0 section with lessons learned
- [ ] Add to `CHANGELOG.md` §3.15 "F4.0 Troubleshooting & Fixes"
- [ ] Note: clustering now robust to individual school failures

---

### 5.3 Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Factor 3 fixes break tests | Keep old fixture as fallback; gradual migration |
| Factor 1 commit-per-sekolah causes partial progress | Design retry logic; mark failed sekolah for next cron |
| Factor 2 random init degrades clustering quality | Acceptable for small n; monitor via NMI metric |
| Rollback changes accidentally break other code | Add unit test for clustering error handling |

---

### 5.4 Testing Strategy

**Unit Tests** (add to `tests/`):
- `test_reduce_dimensions_small_samples()` — verify n=5, 11 → no crash
- `test_clustering_job_per_school_commit()` — force error on school 2/10, verify school 1 is committed

**Integration Test**:
- Full re-seed → clustering → verify 600 clustered (or ~99%+)

**Regression Test**:
- Run pytest → verify 39 pass + prod DB untouched

---

## 6. SUMMARY & RECOMMENDATION

| Factor | Root Cause | Fix | Effort | Risk |
|--------|-----------|-----|--------|------|
| 1 | Rollback kaskade | Commit per sekolah | 2 jam | Low |
| 2 | UMAP spectral crash | Random init fallback + adaptive n_components | 1 jam | Low |
| 3 | Test DB isolation | Separate test DB + fixture refactor | 4 jam | Medium |

**Total effort**: ~7–8 jam  
**Total risk**: Low–Medium (all fixes are localized, reversible)

**Recommended execution order**:
1. **Phase 1** (3–4 jam): Fix Factor 3 (test isolation) — protects work
2. **Phase 2a + 2b** (3 jam): Fix Factor 1 + 2 in parallel
3. **Phase 3** (3 jam): Integration test (re-seed + clustering)
4. **Phase 4** (1 jam): Pytest verification
5. **Phase 5** (1 jam): Documentation

**Expected outcome**:
- 600/600 laporan tercluster (or ~99%+ if 1–2 schools fail)
- No data loss from pytest
- Robust error handling per school
- UMAP handles all school sizes

---

*Dokumen ini valid untuk implementasi immediate. Siap untuk Step 1 (Fix Factor 3) segera setelah approval.*
