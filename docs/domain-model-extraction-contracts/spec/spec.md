# domain-model-extraction-contracts — Software Design Document

## Intention

Defines the pure TypeScript/Zod contracts required by `requisitos-extraction` and `semaforo-aggregation` as hard T0 prerequisites. Adds to `src/types/domain/`: the LLM output schema (`RequisitoExtractionPayloadSchema`), the structural logger interface (`ExtractorLogger`), the semáforo view types (`Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource`), and the versioned habilitante heading constants (`HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION`). No Postgres tables, no migrations, no RLS. All definitions re-exported from `src/types/index.ts`.

## Use Cases

Detailed scenarios in [use-cases.md](./use-cases.md).

| Use Case | Description | User Stories |
|----------|-------------|-------------|
| [UC-01 — Validate LLM extractor output](./use-cases.md#uc-01--validate-llm-extractor-output-us-01) | Requisitos-extraction parses LLM output against the payload schema before persisting | US-01 |
| [UC-02 — Return typed semáforo result](./use-cases.md#uc-02--return-typed-semáforo-result-us-02) | Semaforo-aggregation returns a fully typed `Semaforo` without manual casts | US-02 |
| [UC-03 — Classify habilitante headings using the shared pattern list](./use-cases.md#uc-03--classify-habilitante-headings-using-the-shared-pattern-list-us-03) | Both downstream features share the same `HABILITANTE_HEADING_PATTERNS` list from `@/types` | US-03 |

---

## Requirements

### Functional Requirements

| ID | Requirement | User Stories | Business Rules |
|----|-------------|-------------|----------------|
| REQ-001 | Define `RequisitoExtractionPayload` and `RequisitoExtractionPayloadSchema` (Zod) at `src/types/domain/extraction-payload.ts`. This is the **LLM output contract** — distinct from `RequisitoSchema` (the persisted-row contract). Carries: `categoria` (`RequisitoCategoria` narrow — `general` is a Zod validation failure per RN-001), `descripcion`, `cumple` (nullable), `semaforo`, `justificacion` (nullable), `citation_segment_id` (UUID), `citation_quote` (≤200 chars via Zod `.max(200)`), `is_habilitante: z.boolean()`, `is_habilitante_source: z.enum(['structural','llm','manual'])`. Does NOT carry `id`, `created_at`, `analisis_id`, or `citation_verified` — those are populated post-extraction by the orchestrator | US-01 | RN-001, RN-002 |
| REQ-002 | Define `ExtractorLogger` structural interface at `src/types/logger.ts`: three methods `info`, `warn`, `error`, each `(event: string, payload: Record<string, unknown>) => void`. Pure type, no runtime code. Exported via the `@/types` barrel | US-01 | — |
| REQ-003 | Define domain types at `src/types/domain/semaforo.ts` (re-exported via `@/types` barrel): `RequisitoCategoria = 'juridico' \| 'financiero' \| 'tecnico' \| 'experiencia'` (narrow union — no `general`); `IsHabilitanteSource = 'structural' \| 'llm' \| 'manual'`; `SemaforoStats = { total: number; cumple: number; noCumple: number; sinInfo: number; cumplePct: number }`; `Semaforo = { overall: SemaforoColor; byCategoria: Record<RequisitoCategoria, SemaforoColor>; blockers: Requisito[]; stats: SemaforoStats }`. Pure type definitions — no Zod schemas, no runtime code | US-02 | RN-002 |
| REQ-004 | Define runtime constants at `src/types/domain/habilitante-patterns.ts` (re-exported via `@/types` barrel): `HABILITANTE_HEADING_PATTERNS: readonly RegExp[]` — initial v1 list of 5 NFD-normalized lowercase regex patterns: `/\brequisitos\s+habilitantes\b/`, `/\bcapacidad\s+juridica\b/`, `/\bcapacidad\s+financiera\b/`, `/\bcapacidad\s+tecnica\b/`, `/\bexperiencia\s+(minima\|acreditada\|requerida)\b/`; `HABILITANTE_PATTERNS_VERSION: 'v1.0.0' as const`. Patterns authored against the normalized form produced by pdf-ingestion. Bumping the version invalidates any caching that depends on these structural classifications | US-03 | RN-003 |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | `npm run typecheck` completes under 10s in strict mode across the full repo |
| NFR-02 | Maintainability | No entity defined in more than one place; TypeScript types inferred from Zod via `z.infer<>` where applicable |

---

## Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | **LLM-output contract distinct from persisted-row contract**: `RequisitoExtractionPayloadSchema` is the shape an LLM extractor returns; `RequisitoSchema` (in `domain-model-primitives`) is the shape a `requisito` row carries in the database. They overlap on user-facing fields but the payload omits orchestrator-populated fields (`id`, `analisis_id`, `created_at`, `citation_verified`). The orchestrator is the only place the two schemas meet: it parses LLM output via the payload schema, augments with orchestrator-only fields, and persists via the row schema. Conflating the two would force the LLM to emit fields it cannot know (a real `id`) or omit fields the DB requires. |
| RN-002 | **Narrow `RequisitoCategoria` vs wide `SegmentoCategoria`**: `SegmentoCategoria` (defined in `domain-model-primitives`) is `juridico \| financiero \| tecnico \| experiencia \| general` — wide because pdf-ingestion's categorizer falls back to `general` for unrecognized headers. `RequisitoCategoria` (defined here, REQ-003) is `juridico \| financiero \| tecnico \| experiencia` — narrow because requisitos are extracted ONLY from segments with a recognized procurement category. `general` segments are excluded from extraction per pdf-ingestion domain rules; any LLM payload with `categoria === 'general'` is a Zod validation failure raised by the extractor as `ExtractorSchemaValidationError`. The narrow/wide split keeps `aggregateSemaforo`'s `byCategoria: Record<RequisitoCategoria, SemaforoColor>` at exactly four keys — consumers never handle a `general` categoria. |
| RN-003 | **Versioned habilitante pattern list**: `HABILITANTE_HEADING_PATTERNS` is the structural tier of the tiered `is_habilitante` classifier. `'structural'` classifications are deterministic — if a segmento's `heading_normalized` matches any pattern, `is_habilitante_source = 'structural'` regardless of LLM output. `HABILITANTE_PATTERNS_VERSION` must be bumped whenever any pattern is added, changed, or removed; downstream caches that depend on structural classifications MUST invalidate on version change. |

---

## Test Cases

### TC-001 — RequisitoExtractionPayloadSchema is distinct from RequisitoSchema (REQ-001, RN-001)

**Given** a JSON payload: `{ categoria: 'juridico', descripcion: '...', cumple: true, semaforo: 'verde', justificacion: '...', citation_segment_id: '<uuid>', citation_quote: 'CAPACIDAD JURÍDICA', is_habilitante: true, is_habilitante_source: 'structural' }` — NO `id`, `analisis_id`, `created_at`, `citation_verified`
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** parse succeeds

**When** `RequisitoSchema.parse(payload)` is called against the same payload
**Then** a `ZodError` is thrown for missing `id`, `analisis_id`, `created_at`, `citation_verified`

### TC-002 — RequisitoExtractionPayloadSchema rejects `categoria: 'general'` (REQ-001, RN-002)

**Given** an LLM payload with `categoria: 'general'` and otherwise-valid fields
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** a `ZodError` is thrown — `general` is not in the narrow `RequisitoCategoria`

### TC-003 — RequisitoExtractionPayloadSchema accepts all valid categoria values (REQ-001, RN-002)

**Given** an otherwise-valid LLM payload
**When** parsed with each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'`
**Then** all four parse successfully

### TC-004 — RequisitoExtractionPayloadSchema carries is_habilitante + is_habilitante_source (REQ-001, RN-003)

**Given** a valid payload with `is_habilitante: true`, `is_habilitante_source: 'structural'`
**When** parsed
**Then** parse succeeds

**When** parsed with each of `'structural'`, `'llm'`, `'manual'`
**Then** all three parse successfully

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

### TC-005 — Semaforo/RequisitoCategoria/HABILITANTE_HEADING_PATTERNS resolve from @/types (REQ-003, REQ-004)

**Given** the barrel `src/types/index.ts`
**When** a consumer does `import { type Semaforo, type SemaforoStats, type RequisitoCategoria, type IsHabilitanteSource, HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'`
**Then** all named exports resolve without TypeScript errors

**When** the consumer inspects `HABILITANTE_HEADING_PATTERNS`
**Then** it is a `readonly RegExp[]` of length >= 5; `HABILITANTE_PATTERNS_VERSION` is the literal `'v1.0.0'`

### TC-006 — byCategoria Record has exactly 4 keys (REQ-003, RN-002)

**Given** the `Semaforo` type definition
**When** a consumer writes `semaforo.byCategoria.general`
**Then** TypeScript compilation fails — `general` is not a key of `Record<RequisitoCategoria, SemaforoColor>`

**When** a consumer writes `semaforo.byCategoria.juridico`
**Then** TypeScript compiles

---

## UX/UI

No UI. Pure type/constant definitions consumed by requisitos-extraction and semaforo-aggregation.

---

## Architecture

### Architecture Decision Records

| ADR | Title | Impact |
|-----|-------|--------|
| ADR-002 | Zod as runtime validator | `RequisitoExtractionPayloadSchema` uses Zod for runtime validation; `Semaforo`/`SemaforoStats`/`RequisitoCategoria` are pure TypeScript types (never parsed directly at runtime) |

### Tradeoffs

| Tradeoff | We chose | Over | Rationale |
|----------|----------|------|-----------|
| Two schemas for Requisito | `RequisitoExtractionPayloadSchema` + `RequisitoSchema` | One schema with optional fields | Optional fields let invalid combos through both layers (e.g. a persisted row with no `id`). Two schemas makes the orchestrator's role structurally explicit. |
| Habilitante pattern list in `@/types` | Versioned `readonly RegExp[]` shared constant | Inline regex in requisitos-extraction | Both requisitos-extraction and semaforo-aggregation need the same list. Promoting to `@/types` keeps a single source of truth; the version constant makes cache-invalidation contract explicit. |
| Narrow `RequisitoCategoria` | Separate type from `SegmentoCategoria` | One shared wide type | `general` is never a legitimate requisito category — extraction is gated upstream. Sharing the wide type forces every consumer to branch on or assert away `general`. The narrow type encodes the upstream filter once. |

### Performance Goals & Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| `npm run typecheck` duration | < 10s strict mode | `time npm run typecheck` in CI |

### Data Model

No ER diagram. This spec adds pure TypeScript types and constants — no new Postgres tables.

**File locations:**

| File | Exports |
|------|---------|
| `src/types/domain/extraction-payload.ts` | `RequisitoExtractionPayloadSchema`, `RequisitoExtractionPayload` |
| `src/types/logger.ts` | `ExtractorLogger` |
| `src/types/domain/semaforo.ts` | `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource` |
| `src/types/domain/habilitante-patterns.ts` | `HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION` |

All four re-exported via `src/types/index.ts` barrel.

### API / Data Contracts

No HTTP endpoints. All contracts are TypeScript types/Zod schemas.

| Consumer | Contracts used |
|----------|---------------|
| `requisitos-extraction` | `RequisitoExtractionPayloadSchema`, `ExtractorLogger`, `HABILITANTE_HEADING_PATTERNS` |
| `semaforo-aggregation` | `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION` |

### Service Integrations

| System | Direction | Data |
|--------|-----------|------|
| `domain-model-primitives` | Depends on | `RequisitoSchema`, `SegmentoCategoria`, `SemaforoColor`, `Requisito` — payload schema and `Semaforo` type reference these |
| `pdf-ingestion` | Cross-reference | `HABILITANTE_HEADING_PATTERNS` authored against the normalized form pdf-ingestion produces |
| `requisitos-extraction` | Downstream consumer | Parses LLM output via `RequisitoExtractionPayloadSchema`; logs via `ExtractorLogger`; classifies via `HABILITANTE_HEADING_PATTERNS` |
| `semaforo-aggregation` | Downstream consumer | Returns `Semaforo`; uses `RequisitoCategoria` for `byCategoria` keys; reads `HABILITANTE_PATTERNS_VERSION` for cache contract |

---

## Revision Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-27 | REQ-001/REQ-002 (`RequisitoExtractionPayloadSchema`, `ExtractorLogger`) added to monolithic `domain-model` as requisitos-extraction T0 prerequisites. | Provider-agnostic `RequisitosExtractor` interface requires these contracts before T1 begins. |
| 2026-04-27 | REQ-003/REQ-004 (`Semaforo` types, `HABILITANTE_*` constants), RN-001–003, TC-001–006 added to monolithic `domain-model` as semaforo-aggregation T0 prerequisites. | semaforo-aggregation spec lists these as a hard T0 prerequisite. |
| 2026-04-30 | Split from monolithic `domain-model` spec (rev 5). Archived at `docs/archive/domain-model/`. Extracted all extraction/aggregation contract definitions into this standalone spec. | Monolithic spec grew to 549 lines across 5 revisions; split into independently executable specs by implementation layer. |
