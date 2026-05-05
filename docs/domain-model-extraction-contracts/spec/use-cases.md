# domain-model-extraction-contracts — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Engineer | Developer building requisitos-extraction or semaforo-aggregation who imports these contracts |

---

## User Stories

### US-01 — Validate LLM output at runtime

**As an** Engineer (building requisitos-extraction)
**I want** a Zod schema for the shape an LLM extractor returns
**So that** invalid LLM output is caught before it reaches the orchestrator's persistence step

### US-02 — Use typed semáforo output in aggregation

**As an** Engineer (building semaforo-aggregation)
**I want** TypeScript types for `Semaforo`, `SemaforoStats`, and `RequisitoCategoria`
**So that** `aggregateSemaforo` returns a fully typed result without manual casts

### US-03 — Reference a single versioned list of habilitante heading patterns

**As an** Engineer (building either requisitos-extraction or semaforo-aggregation)
**I want** `HABILITANTE_HEADING_PATTERNS` and `HABILITANTE_PATTERNS_VERSION` exported from `@/types`
**So that** both features reference the same structural classifier without duplicating regex logic

---

## Use Case Scenarios

### UC-01 — Validate LLM extractor output (US-01)

**Preconditions:** `domain-model-extraction-contracts` is implemented; `src/types/index.ts` is importable

#### Main Scenario

1. Requisitos-extraction receives raw JSON from the LLM.
2. Calls `RequisitoExtractionPayloadSchema.parse(rawOutput)`.
3. Zod validates: `categoria` is in the narrow `RequisitoCategoria` enum (not `general`), `citation_quote` is ≤200 chars, `is_habilitante_source` is one of `structural|llm|manual`.
4. If valid, orchestrator augments with `id`, `analisis_id`, `created_at`, `citation_verified` and persists via `RequisitoSchema`.

#### Alternative Scenarios

**1a. LLM returns `categoria: 'general'`**
`RequisitoExtractionPayloadSchema.parse()` throws `ZodError`. Orchestrator surfaces as `ExtractorSchemaValidationError` — this means a `general` segment was not filtered upstream as required. Never silently persisted.

**1b. LLM omits `is_habilitante`**
`ZodError` thrown — field is required. LLM prompt must be updated.

#### Error Scenarios

**1e. `citation_quote` longer than 200 chars**
`ZodError` thrown at parse time — defense in depth ahead of the DB CHECK constraint.

**Postconditions:** Only structurally valid LLM output reaches the persistence step.

---

### UC-02 — Return typed semáforo result (US-02)

**Preconditions:** `domain-model-extraction-contracts` and `domain-model-primitives` are implemented

#### Main Scenario

1. Semaforo-aggregation calls `aggregateSemaforo(requisitos: Requisito[]): Semaforo`.
2. Function returns `{ overall: SemaforoColor, byCategoria: Record<RequisitoCategoria, SemaforoColor>, blockers: Requisito[], stats: SemaforoStats }`.
3. `byCategoria` has exactly four keys — `juridico`, `financiero`, `tecnico`, `experiencia` — because `RequisitoCategoria` is the narrow enum (no `general`).
4. Caller uses `semaforo.byCategoria.juridico` without casting.

**Postconditions:** Aggregation result is fully typed; consumers never handle a `general` categoria key.

---

### UC-03 — Classify habilitante headings using the shared pattern list (US-03)

**Preconditions:** `HABILITANTE_HEADING_PATTERNS` and `HABILITANTE_PATTERNS_VERSION` are exported from `@/types`

#### Main Scenario

1. Requisitos-extraction imports `HABILITANTE_HEADING_PATTERNS` from `@/types`.
2. For each segmento, tests `heading_normalized` against each pattern.
3. If any pattern matches, sets `is_habilitante_source = 'structural'`.
4. If no pattern matches, falls back to LLM classification, sets `is_habilitante_source = 'llm'`.
5. Semaforo-aggregation imports `HABILITANTE_PATTERNS_VERSION` to tag cache keys — bumping the version invalidates any cache depending on structural classifications.

**Postconditions:** Both features use the same pattern list; `is_habilitante_source` is deterministic for heading-based cases.

---

## UX/UI References

No UI in this spec. See [spec.md](./spec.md) for architecture details.
