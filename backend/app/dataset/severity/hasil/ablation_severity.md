# Ablation Severity (test 50 · label LLM_SEMENTARA)

| Varian | Akurasi | Macro-F1 |
|---|---|---|
| K1_aturan_kata_kunci | 48.00% | 0.2467 |
| K2_tfidf_logreg | 72.00% | 0.5841 |
| K3_tfidf_svm | 74.00% | 0.6100 |
| K4_indobert | 70.00% | 0.5722 |

## K1_aturan_kata_kunci — confusion matrix
```
true\pred          baik  rusak_ringan  rusak_sedang   rusak_berat
         baik             0             6             0             0
 rusak_ringan             0            22             5             9
 rusak_sedang             0             0             1             2
  rusak_berat             0             4             0             1
```

## K2_tfidf_logreg — confusion matrix
```
true\pred          baik  rusak_ringan  rusak_sedang   rusak_berat
         baik             6             0             0             0
 rusak_ringan             6            26             2             2
 rusak_sedang             0             1             2             0
  rusak_berat             0             0             3             2
```

## K3_tfidf_svm — confusion matrix
```
true\pred          baik  rusak_ringan  rusak_sedang   rusak_berat
         baik             5             1             0             0
 rusak_ringan             6            28             2             0
 rusak_sedang             0             1             2             0
  rusak_berat             0             1             2             2
```

## K4_indobert — confusion matrix
```
true\pred          baik  rusak_ringan  rusak_sedang   rusak_berat
         baik             5             1             0             0
 rusak_ringan             5            26             4             1
 rusak_sedang             0             1             2             0
  rusak_berat             0             1             2             2
```
