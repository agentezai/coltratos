# domain-model/extraction-contracts — Software Design Document

## Intention

This spec was split from the monolithic [domain-model spec](../../spec/spec.md) (revision 5, 2026-04-27). It owns the pure-type definitions added to `@/types` as hard prerequisites for the downstream `requisitos-extraction` and `semaforo-aggregation` specs: the LLM-output contract (`RequisitoExtractionPayloadSchema`), the provider-agnostic logger structural interface (`ExtractorLogger`), the semáforo view types (`Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource`), and the versioned habilitante heading constants (`HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION`). None of these definitions touch the Postgres layer; they are TypeScript/Zod only and live in `src/types/domain/`.

## Use Cases

Detailed scenarios in [../../spec/use-cases.md](../../spec/use-cases.md).

| Use Case | Description | User Stories |
|----------|-------------|-------------|
| [UC-01 — Define & validate domain entities](../../spec/use-cases.md#uc-01--define--validate-domain-entities-us-01-us-02) | Engineer imports Zod schemas to validate LLM output at runtime | US-01, US-02 |
| [UC-04 — Query with type safety](../../spec/use-cases.md#uc-04--query-with-type-safety-us-05) | Engineer uses `Semaforo` / `RequisitoCategoria` types in typed aggregation functions | US-05 |

---

## Requirements

### Functional Requirements

| ID | Requirement | User Stories | Business Rules |
|----|-------------|-------------|----------------|
| REQ-016 | Define `RequisitoExtractionPayload` and `RequisitoExtractionPayloadSchema` (Zod) at `src/types/domain/extraction-payload.ts`. This is the **LLM output contract** — distinct from `RequisitoSchema` (the persisted-row contract). Carries: `categoria` (`RequisitoCategoria` narrow — `general` is a Zod validation failure), `descripcion`, `cumple` (nullable), `semaforo`, `justificacion` (nullable), `citation_segment_id`, `citation_quote` (≤200 chars), `is_habilitante: z.boolean()`, `is_habilitante_source: z.enum(['structural','llm','manual'])`. Does NOT carry `id`, `created_at`, `analisis_id`, or `citation_verified` — those are populated post-extraction by the orchestrator. **Narrowing rule**: a payload with `categoria === 'general'` is a Zod validation failure raised by the extractor as `ExtractorSchemaValidationError`. | US-01, US-05 | RN-015, RN-017 |
| REQ-017 | Define `ExtractorLogger` structural interface at `src/types/logger.ts`: three methods `info`, `warn`, `error`, each `(event: string, payload: Record<string, unknown>) => void`. Pure type, no runtime code. Exported via the `@/types` barrel. | US-05 | — |
| REQ-021 | Define new domain types at `src/types/domain/semaforo.ts` (re-exported via the `@/types` barrel): `Semaforo = { overall: SemaforoColor; byCategoria: Record<RequisitoCategoria, SemaforoColor>; blockers: Requisito[]; stats: SemaforoStats }`; `SemaforoStats = { total: number; cumple: number; noCumple: number; sinInfo: number; cumplePct: number }`; `RequisitoCategoria = 'juridico' \| 'financiero' \| 'tecnico' \| 'experiencia'` (narrow union, distinct from `SegmentoCategoria`); `IsHabilitanteSource = 'structural' \| 'llm' \| 'manual'`. Pure type definitions; no Zod schema and no runtime code. | US-01, US-05 | RN-017 |
| REQ-022 | Define runtime constants at `src/types/domain/habilitante-patterns.ts` (re-exported via the `@/types` barrel): `HABILITANTE_HEADING_PATTERNS: readonly RegExp[]` — initial v1 list of NFD-normalized lowercase regex patterns (`/\brequisitos\s+habilitantes\b/`, `/\bcapacidad\s+juridica\b/`, `/\bcapacidad\s+financiera\b/`, `/\bcapacidad\s+tecnica\b/`, `/\bexperiencia\s+(minima\|acreditada\|requerida)\b/`); `HABILITANTE_PATTERNS_VERSION: 'v1.0.0' as const`. Patterns authored against the normalized form produced by [pdf-ingestion REQ-005](../../../pdf-ingestion/spec/spec.md). Bumping the version invalidates any caching that depends on classifications produced by these patterns. | US-05 | RN-018 |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | `npm run typecheck` completes under 10s in strict mode across the full repo |
| NFR-04 | Maintainability | No entity defined in more than one place; TypeScript types inferred from Zod via `z.infer<>` where applicable |

---

## Business Rules

| Rule | Description |
|------|-------------|
| RN-015 | **LLM-output contract distinct from persisted-row contract**: `RequisitoExtractionPayloadSchema` is the shape an LLM extractor returns; `RequisitoSchema` (in [primitives spec](../../primitives/spec/spec.md)) is the shape a `requisito` row carries in the database. They overlap on user-facing fields but the payload omits orchestrator-populated fields (`id`, `analisis_id`, `created_at`, `citation_verified`). The orchestrator is the only place the two schemas meet: it parses LLM output via the payload schema, augments with orchestrator-only fields, and persists via the row schema. |
| RN-017 | **Narrow `RequisitoCategoria` vs wide `SegmentoCategoria`**: `SegmentoCategoria` (defined in [primitives spec](../../primitives/spec/spec.md) REQ-001) is `juridico \| financiero \| tecnico \| experiencia \| general` — wide because pdf-ingestion's categorizer falls back to `general` for unrecognized headers. `RequisitoCategoria` (defined here, REQ-021) is `juridico \| financiero \| tecnico \| experiencia` — narrow because requisitos are extracted ONLY from segments with a recognized procurement category. Per [pdf-ingestion RN-012](../../../pdf-ingestion/spec/spec.md), `general` segments are excluded from extraction; any LLM payload with `categoria === 'general'` is a Zod validation failure (REQ-016). |
| RN-018 | **Tiered `is_habilitante` classification source contract**: `requisito.is_habilitante_source` records which tier produced `requisito.is_habilitante` per [semaforo-aggregation RN-014](../../../semaforo-aggregation/spec/spec.md): `'structural'` (heading matched `HABILITANTE_HEADING_PATTERNS` — REQ-022, deterministic), `'llm'` (no structural pattern matched; LLM classified based on text), or `'manual'` (v1.1+ user override; v1 extractors never emit this value). The column shape and CHECK constraint live in [postgres spec](../../postgres/spec/spec.md); the **classifier** lives in `requisitos-extraction`; the **consumer** (`aggregateSemaforo`) reads `is_habilitante` only — `is_habilitante_source` is passthrough metadata. |

---

## Test Cases

### TC-025 — RequisitoExtractionPayloadSchema is distinct from RequisitoSchema (REQ-016, RN-015)

**Given** a JSON payload with `categoria: 'juridico'`, `descripcion`, `cumple: true`, `semaforo: 'verde'`, `justificacion`, `citation_segment_id`, `citation_quote: 'CAPACIDAD JURÍDICA'`, `is_habilitante: true`, `is_habilitante_source: 'structural'` — and NO `id`, `analisis_id`, `created_at`, `citation_verified`
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** parse succeeds

**When** `RequisitoSchema.parse(payload)` is called against the same payload
**Then** a `ZodError` is thrown for missing `id`, `analisis_id`, `created_at`, `citation_verified`

### TC-026 — RequisitoExtractionPayloadSchema rejects `categoria: 'general'` (REQ-016, RN-017)

**Given** an LLM payload with `categoria: 'general'` and otherwise-valid fields
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** a `ZodError` is thrown — narrowing rule from REQ-016: `general` segments are excluded upstream and any payload carrying `general` is a Zod validation failure

### TC-027 — RequisitoExtractionPayloadSchema accepts all valid `categoria` values (REQ-016, RN-017)

**Given** an otherwise-valid LLM payload
**When** parsed with each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'`
**Then** all four parse successfully

**When** parsed with `'general'`
**Then** a `ZodError` is thrown

### TC-028 — RequisitoExtractionPayloadSchema carries `is_habilitante` + `is_habilitante_source` (REQ-016, RN-018)

**Given** a valid `RequisitoExtractionPayloadSchema` payload with `is_habilitante: true`, `is_habilitante_source: 'structural'`
**When** parsed
**Then** parse succeeds

**When** parsed with each of `'structural'`, `'llm'`, `'manual'`
**Then** all three parse successfully

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

### TC-031 — `Semaforo`/`RequisitoCategoria`/`HABILITANTE_HEADING_PATTERNS` resolve from `@/types` (REQ-021, REQ-022)

**Given** the barrel `src/types/index.ts`
**When** a consumer does `import { type Semaforo, type SemaforoStats, type RequisitoCategoria, type IsHabilitanteSource, HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'`
**Then** all named exports resolve without TypeScript errors

**When** the consumer inspects `HABILITANTE_HEADING_PATTERNS`
**Then** it is a `readonly RegExp[]` of length >= 5; `HABILITANTE_PATTERNS_VERSION` is the literal `'v1.0.0'`

---

## UX/UI

No UI. These are pure type/constant definitions consumed by the requisitos-extraction and semaforo-aggregation features.

---

## Architecture

### Architecture Decision Records

| ADR | Title | Impact on this feature |
|-----|-------|----------------------|
| ADR-002 | Zod as runtime validator | `RequisitoExtractionPayloadSchema` uses Zod for runtime validation; `Semaforo`/`SemaforoStats`/`RequisitoCategoria` are pure TypeScript types (no Zod schema needed — they are never parsed at runtime directly) |

### Tradeoffs

| Tradeoff | We chose | Over | Rationale |
|----------|----------|------|-----------|
| Two schemas for Requisito | `RequisitoExtractionPayloadSchema` + `RequisitoSchema` | One schema with optional fields | Optional fields would let invalid combos through both layers. Two schemas makes the orchestrator's role explicit; the compiler catches misuse. |
| Habilitante pattern list as a domain constant | Versioned `readonly RegExp[]` exported from `@/types` | Inline regex array in requisitos-extraction | The pattern list is the structural tier of the tiered classifier (RN-018) and the gate criterion in semaforo-aggregation. Both specs need the same list; promoting it to `@/types` keeps a single source of truth. The version constant makes cache-invalidation explicit. |
| Narrow `RequisitoCategoria` vs wide `SegmentoCategoria` | Two distinct types | One shared type with `general` allowed everywhere | `general` is never a legitimate category for a requisito — extraction is gated upstream. Reusing the wide type would force every consumer to branch on `general` or assert it cannot occur. The narrow type encodes the upstream filter once in the type system. |

### Performance Goals & Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| `npm run typecheck` duration | < 10s strict mode | `time npm run typecheck` in CI |

### Data Model

No ER diagram. This spec defines pure TypeScript types and Zod schemas; no new Postgres tables.

**File locations:**
- `src/types/domain/extraction-payload.ts` — `RequisitoExtractionPayloadSchema`, `RequisitoExtractionPayload`
- `src/types/logger.ts` — `ExtractorLogger`
- `src/types/domain/semaforo.ts` — `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource`
- `src/types/domain/habilitante-patterns.ts` — `HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION`

All four files re-exported via `src/types/index.ts` barrel.

### API / Data Contracts

No HTTP endpoints. All contracts are TypeScript types/Zod schemas consumed by:

| Consumer | Contract used |
|----------|--------------|
| `requisitos-extraction` | `RequisitoExtractionPayloadSchema`, `ExtractorLogger`, `HABILITANTE_HEADING_PATTERNS` |
| `semaforo-aggregation` | `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION` |

### Service Integrations

| System | Direction | Data |
|--------|-----------|------|
| [domain-model/primitives](../../primitives/spec/spec.md) | Depends on | `RequisitoSchema`, `SegmentoCategoria`, `SemaforoColor` — payload schema references types from primitives |
| [pdf-ingestion](../../../pdf-ingestion/spec/spec.md) | Cross-reference | `HABILITANTE_HEADING_PATTERNS` are authored against the normalized form produced by pdf-ingestion REQ-005 |
| [requisitos-extraction](../../../requisitos-extraction/spec/spec.md) | Downstream consumer | Parses LLM output via `RequisitoExtractionPayloadSchema`; logs via `ExtractorLogger`; classifies via `HABILITANTE_HEADING_PATTERNS` |
| [semaforo-aggregation](../../../semaforo-aggregation/spec/spec.md) | Downstream consumer | Returns `Semaforo`; uses `RequisitoCategoria` for `byCategoria` record keys; reads `HABILITANTE_PATTERNS_VERSION` for cache contract |

---

## Revision Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-27 | REQ-016 (RequisitoExtractionPayloadSchema) and REQ-017 (ExtractorLogger) added to parent spec as requisitos-extraction T0 prerequisites. | Provider-agnostic `RequisitosExtractor` interface requires these contracts before T1 implementation begins. |
| 2026-04-27 | REQ-021, REQ-022, RN-015–018, TC-025–031 added to parent spec as semaforo-aggregation T0 prerequisites. | semaforo-aggregation spec (approved 2026-04-27) lists these additions as a hard T0 prerequisite. |
| 2026-04-30 | Split from [domain-model spec rev 5](../../spec/spec.md). Extracted REQ-016, REQ-017, REQ-021, REQ-022; TCs TC-025–TC-031; BRs RN-015, RN-017, RN-018. | Monolithic spec exceeded 500 lines; split into primitives / postgres / extraction-contracts to match implementation task boundaries. |
