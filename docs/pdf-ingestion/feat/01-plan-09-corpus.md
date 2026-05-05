# T9: Validation Corpus (N=20)

## Scope

- `tests/fixtures/pliegos/` — 20 real Colombian SECOP-II pliego PDFs (provided by user)
- `tests/fixtures/pliegos/encrypted.pdf` — synthetic encrypted PDF for TC-002
- `tests/fixtures/pliegos/malformed.pdf` — synthetic malformed bytes for TC-003
- `tests/fixtures/pliegos/scan-only.pdf` — synthetic scan-only PDF for TC-004
- `tests/fixtures/pliegos/corpus.yaml` — manifest (20 entries)
- `tests/golden/pages/` — one JSON sketch per fixture pliego with expected per-page text snippets and table presence flags
- `tests/fixtures/pliegos/README.md` — corpus provenance and labeling instructions
- `tests/fixtures/pliegos/table-review.md` — manual table-quality review on 5 sampled pliegos (REQ-023)

## Changes

### `corpus.yaml` manifest schema (REQ-020)

Each entry under `pliegos:` MUST have:

```yaml
pliegos:
  - file: clean-pliego-001.pdf
    source_entity: "ICBF"              # Contracting entity that issued the pliego
    modalidad: "licitacion-publica"    # SECOP-II modalidad
    year: 2025
    tipo: "pliego_definitivo"          # pliego_tipo enum value
    manual_labels: ../../golden/pages/clean-pliego-001.json
    date_added: "2026-05-04"
```

- `source_entity`: free-text but conventionally one of: `ICBF`, `INVIAS`, `alcaldia-<municipio>`, `ministerio-<nombre>`, `gobernacion-<departamento>`, `otro-<descripcion>`. Used for corpus diversity gates per ADR-007.
- `modalidad`: SECOP-II modalidad of the proceso.
- `year`: the year the pliego was issued.
- `tipo`: `pliego_condiciones` or `pliego_definitivo`. AnexoProceso fixtures are explicitly excluded.
- `manual_labels`: relative path to the golden JSON file with expected per-page text snippets and table presence flags.
- `date_added`: ISO-8601 date the pliego was added to the corpus.

### Corpus

- 20 real pliegos: a mix of modalidades, source entities, and years. **Pliegos only** — AnexoProceso fixtures (anexos técnicos, estudios previos, resoluciones) are explicitly excluded because pdf-ingestion v1 does not parse them.
- Per ADR-007 corpus growth plan: v1 ships at N=20 / <5% page-failure / p95 <2 min on 200-page input. First paying user: N≥50 / <3% page-failure. Pricing >$50/empresa/month: N≥100 / <2% page-failure.

### Golden sketches (lightweight)

Per-page golden files under `tests/golden/pages/<fixture>.json` capture **expected coverage signals**, not exact text:

```json
{
  "expected_pages": 47,
  "pages_with_tables": [12, 13, 28],
  "pages_with_known_text_snippets": {
    "1": "PLIEGO DE CONDICIONES",
    "12": "REQUISITOS HABILITANTES"
  },
  "expected_failure_pages": []
}
```

The acceptance test asserts: page count matches, listed pages have tables, listed snippets appear in the corresponding page's text.

### `tests/fixtures/pliegos/README.md`

Captures provenance: SECOP-II proceso number, source URL, file size, page count, `tipo`, known quirks (redactions, scan-quality issues, etc.).

### Manual table-quality review (REQ-023)

`tests/fixtures/pliegos/table-review.md` documents a manual review on 5 sampled pliegos:

```
| Fixture | Page | Expected table cols | Extracted cols | Rows correctly grouped? | Score (0-1) |
|---------|------|---------------------|----------------|-------------------------|-------------|
| clean-pliego-003.pdf | 12 | 3 | 3 | yes | 1.0 |
| ... | ... | ... | ... | ... | ... |
```

Aggregate score is captured in the file. Re-run when ADR-008 is revisited (per its revision triggers).

### Design Rationale

This task ships zero production code. It exists to make the spec's quality bars executable: <5% page-failure rate (REQ-021), p95 <2 min (REQ-022), and the manual table-quality review (REQ-023) are CI gates after T9 lands.

## Dependencies

Requires T8 (the worker must exist for the acceptance test to invoke it). Soft prerequisite: 20 real pliegos must be supplied by the user.

## Done When

- [ ] 20 pliego fixtures committed (or referenced via Git LFS).
- [ ] 20 golden sketch files in `tests/golden/pages/`.
- [ ] `tests/fixtures/pliegos/corpus.yaml` exists with 20 entries; every entry has all 6 required keys; every `tipo` is a valid `pliego_tipo` enum value.
- [ ] Synthetic `encrypted.pdf`, `malformed.pdf`, `scan-only.pdf` fixtures committed.
- [ ] `tests/fixtures/pliegos/README.md` documents the corpus.
- [ ] `tests/fixtures/pliegos/table-review.md` captures manual review on 5 sampled pliegos with rows/cols/score per pliego.
