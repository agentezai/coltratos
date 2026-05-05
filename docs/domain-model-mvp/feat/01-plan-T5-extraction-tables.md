# T5: Create Extraction and Verdict Tables (requisitos, verdicts)

## Scope

- `supabase/migrations/20260504000005_extraction_tables.sql` — DDL for requisitos and verdicts

## Changes

### requisitos table

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE` — CASCADE: if an analysis is deleted, its requisitos go with it; child of the analysis audit record
- `tipo text NOT NULL CHECK (tipo IN ('juridico','tecnico','financiero'))` — three types per domain model; `experiencia` maps to `financiero` at DB layer per MVP simplification (RN-013)
- `texto text NOT NULL` — extracted requisito text from the pliego
- `pagina_fuente int` — nullable; source page number in the pliego PDF (1-indexed)
- `quote_fuente text` — nullable; verbatim quote from the pliego that grounds this requisito
- `confidence_score numeric(5,4) CHECK (confidence_score BETWEEN 0 AND 1)` — nullable; LLM confidence in the extraction; range [0.0000, 1.0000]
- `created_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE requisitos ENABLE ROW LEVEL SECURITY`

### verdicts table

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `requisito_id uuid NOT NULL REFERENCES requisitos(id) ON DELETE CASCADE` — CASCADE: verdicts are owned by their requisito
- `verdict text NOT NULL CHECK (verdict IN ('verde','amarillo','rojo'))` — semáforo value; computed deterministically by rules engine (NOT by LLM)
- `reason text NOT NULL` — human-readable explanation of why this verdict was assigned
- `confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1)` — nullable; rules-engine confidence; `NULL` for deterministic rules with no ambiguity
- `created_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY`

### Design Rationale (Cascade Ownership)

`requisitos` CASCADE-deletes from `analyses` and `verdicts` CASCADE-deletes from `requisitos`. This matches the conceptual ownership: verdicts are meaningless without their requisito, and requisitos are meaningless without their analysis. The cascade chain makes bulk cleanup (e.g. analysis retry) safe with a single `DELETE FROM analyses WHERE id = ...`.

## Dependencies

Requires T4 — `analyses` table must exist for the `analysis_id` FK.

## Done When

- [ ] `supabase/migrations/20260504000005_extraction_tables.sql` exists
- [ ] `requisitos` table created with all columns
- [ ] `requisitos.tipo` CHECK constraint present: `('juridico','tecnico','financiero')`
- [ ] `requisitos.confidence_score` CHECK constraint present: `BETWEEN 0 AND 1`
- [ ] `verdicts` table created with all columns
- [ ] `verdicts.verdict` CHECK constraint present: `('verde','amarillo','rojo')`
- [ ] `verdicts.confidence` CHECK constraint present: `BETWEEN 0 AND 1`
- [ ] `ENABLE ROW LEVEL SECURITY` on both tables
- [ ] Migration applies cleanly after T4
- [ ] `SELECT table_name FROM information_schema.tables WHERE table_name IN ('requisitos','verdicts')` returns 2 rows
