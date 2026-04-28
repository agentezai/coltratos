# T6: Validation Corpus, Acceptance Test, and Performance Benchmark

## Scope

- `tests/fixtures/pliegos/` - 5 real Colombian SECOP-II pliego PDFs (provided by user)
- `tests/fixtures/pliegos/encrypted.pdf` - synthetic encrypted PDF for TC-005
- `tests/fixtures/pliegos/scan-only.pdf` - synthetic scan-only PDF for TC-006
- `tests/fixtures/pliegos/corpus.yaml` - **manifest** — see schema below
- `tests/golden/segments/` - one `.json` per fixture pliego with the manually-labeled `Segment[]` golden output
- `tests/acceptance/pdf-ingestion.test.ts` - corpus-driven acceptance test
- `tests/bench/pdf-ingestion.bench.ts` - vitest benchmark
- `tests/fixtures/pliegos/README.md` - corpus provenance and labeling instructions

## Changes

### `corpus.yaml` manifest schema (REQ-015)

Each entry under `pliegos:` MUST have:

```yaml
pliegos:
  - file: clean-pliego-001.pdf
    source_entity: "ICBF"              # Contracting entity that issued the pliego
    modalidad: "licitacion-publica"    # SECOP-II modalidad
    year: 2025
    tipo: "pliego_condiciones"         # PliegoTipo enum value (rev 3)
    manual_labels: ../../golden/segments/clean-pliego-001.json
    date_added: "2026-04-26"
```

- `source_entity`: free-text but conventionally one of: `ICBF`, `INVIAS`, `alcaldia-<municipio>`, `ministerio-<nombre>`, `gobernacion-<departamento>`, `otro-<descripcion>`. Used for v1.1+ corpus diversity gates per ADR-007.
- `modalidad`: SECOP-II modalidad of the proceso (e.g. `licitacion-publica`, `concurso-meritos`, `seleccion-abreviada`).
- `year`: the year the pliego was issued.
- `tipo`: `pliego_condiciones` or `pliego_definitivo` — must be a valid `pliego_tipo` enum value (per domain-model rev 3). Anexo values are not allowed in this corpus.
- `manual_labels`: relative path (from `corpus.yaml`'s directory) to the golden `Segment[]` JSON file. Acceptance test resolves this to verify match rate.
- `date_added`: ISO-8601 date the pliego was added to the corpus.

Adding a pliego without all five fields fails the acceptance test (TC-015 enforces this).

### Corpus

- 5 real pliegos under `tests/fixtures/pliegos/clean-pliego-00{1..5}.pdf`. **Pliegos only** — corpus contains `pliego_condiciones` and `pliego_definitivo` documents; AnexoProceso fixtures (anexos técnicos, estudios previos, resoluciones) are explicitly excluded from v1 because pdf-ingestion does not parse them (per spec § v1 Scope).
- A short `README.md` captures provenance: SECOP-II proceso number, source URL, file size, page count, `tipo` (`pliego_condiciones` or `pliego_definitivo`), known quirks, redactions (if any).
- Per ADR-007, v1 ships at N=5 with ≥80%. Future product milestones expand the corpus and tighten the bar (N≥20 / ≥85% at first paying user; N≥50 / ≥90% at $50/empresa/month pricing). AnexoProceso corpus is a separable v1.1+ effort — likely with its own quality gates and possibly a different parser.

### Golden files

- `tests/golden/segments/clean-pliego-001.json` etc. — one per pliego.
- Schema: `Segment[]` exactly as `parsePliegoPdf` would emit. Fields: `categoria`, `contenido`, `orden`, `pageRange`, `headingNormalized`, `headingOriginal`, `isSynthetic`.
- Authored manually. A sibling `.notes.md` per pliego explains non-obvious labeling decisions (especially `general`/synthetic boundaries).
- Regeneration policy: algorithm-driven golden updates require a human-reviewed diff in a dedicated PR. Never auto-regenerate to "fix the test".

### Acceptance test

- `tests/acceptance/pdf-ingestion.test.ts` reads `corpus.yaml`, iterates each fixture, calls `parsePliegoPdf`, and compares against the resolved golden file.
- Match rule: for each golden segment `g`, find the produced segment `p` whose `pageRange` overlaps `g.pageRange` by at least one page; match if `p.categoria === g.categoria`.
- Aggregate match rate ≥ 0.80; test fails CI otherwise.
- Also runs TC-005 (encrypted), TC-006 (scan-only), and TC-015 (manifest schema validation).

### Performance benchmark

- `tests/bench/pdf-ingestion.bench.ts` uses `vitest bench`.
- Each fixture runs ≥10 iterations.
- Global p95 < 3000ms — asserted post-benchmark.
- PDFs >20MB are excluded from the p95 gate but logged.

### CI wiring

- `npm run test` runs the acceptance test by default.
- `npm run test:bench` runs the benchmark (added to `package.json` if missing).
- Both run on CI.

### Design Rationale (Verification, not implementation)

This task ships zero production code. It exists to make the spec's quality bars executable: ≥80% category accuracy, p95 <3s, manifest schema, and the synthetic/heading invariants are CI gates after T6 lands.

## Dependencies

Requires T5. Soft prerequisite: 5 real pliegos must be supplied by the user.

## Done When

- [ ] 5 pliego fixtures and 5 golden files committed (or referenced via Git LFS).
- [ ] `tests/fixtures/pliegos/corpus.yaml` exists with all 5 entries containing all 6 required keys (`source_entity`, `modalidad`, `year`, `tipo`, `manual_labels`, `date_added`); every `tipo` is a valid `pliego_tipo` enum value.
- [ ] Synthetic encrypted and scan-only fixtures committed.
- [ ] `tests/fixtures/pliegos/README.md` documents the corpus.
- [ ] `npm run test` runs the acceptance test, asserts ≥0.80 match rate, validates `corpus.yaml` schema, and verifies synthetic/heading invariants on every produced segment.
- [ ] `npm run test:bench` runs the benchmark and asserts p95 < 3000ms.
- [ ] Both gates pass on CI.
- [ ] Test files (acceptance + bench) stay under 300 lines each.
