# extraction-eval-harness — Progress

### T1: Corpus + Ground-Truth Schema
- [ ] Implement T1: eval/types.ts, corpus.yaml skeleton, labeling-protocol.md, labeling-template.csv, .gitkeep dirs
- [ ] Verify T1: typecheck passes, GroundTruthFileSchema rejects invalid tipo

### T2: Runner
- [ ] Implement T2: run-eval.ts, empresa-stub.ts, storage.ts
- [ ] Verify T2: SHA256 mismatch error; skip-without-force; forced: true output

### T3: Scorer
- [ ] Implement T3: score.ts, embeddings.ts, metrics.ts
- [ ] Verify T3: unit tests for computeMetrics, cosine, embedBatch batching

### T4: Report Generator
- [ ] Implement T4: generate-report.ts with all report sections + index.md append
- [ ] Verify T4: report.md generated correctly; index.md grows by one row

### T5: Inter-Labeler Agreement + CSV Import
- [ ] Implement T5: import-csv.ts, compute-agreement.ts
- [ ] Verify T5: invalid CSV exits non-zero; kappa formula correct

### T6: CI Integration
- [ ] Implement T6: extraction-eval.yml, package.json scripts
- [ ] Verify T6: actionlint clean; gate check exits non-zero on fail
