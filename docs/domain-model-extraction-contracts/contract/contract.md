# TDD Contract: domain-model-extraction-contracts

Markdown TDD guide for `nybo-run`. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

**Test framework:** vitest (standard for Next.js/TypeScript projects)
**Test file root:** `src/__tests__/domain/`

---

## Task T1: RequisitoExtractionPayloadSchema + ExtractorLogger

### Behavior: Payload schema is distinct from persisted-row schema (REQ-001, RN-001) — TC-001

**Given** a JSON payload with `{ categoria: 'juridico', descripcion: '...', cumple: true, semaforo: 'verde', justificacion: '...', citation_segment_id: '<uuid>', citation_quote: 'CAPACIDAD JURÍDICA', is_habilitante: true, is_habilitante_source: 'structural' }` — no `id`, `analisis_id`, `created_at`, `citation_verified`
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** parse succeeds

**When** `RequisitoSchema.parse(payload)` is called against the same payload
**Then** a `ZodError` is thrown (missing `id`, `analisis_id`, `created_at`, `citation_verified`)

**Test file:** `src/__tests__/domain/extraction-payload.test.ts`
**Framework:** vitest

---

### Behavior: Payload schema rejects categoria 'general' (RN-002) — TC-002

**Given** an LLM payload with `categoria: 'general'` and otherwise-valid fields
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/extraction-payload.test.ts`
**Framework:** vitest

---

### Behavior: Payload schema accepts all four valid categoria values (RN-002) — TC-003

**Given** an otherwise-valid LLM payload
**When** parsed with each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'`
**Then** all four parse successfully

**Test file:** `src/__tests__/domain/extraction-payload.test.ts`
**Framework:** vitest

---

### Behavior: Payload schema carries is_habilitante + is_habilitante_source (RN-003) — TC-004

**Given** a valid payload with `is_habilitante: true`, `is_habilitante_source: 'structural'`
**When** parsed
**Then** parse succeeds

**When** parsed with each of `'structural'`, `'llm'`, `'manual'`
**Then** all three parse successfully

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/extraction-payload.test.ts`
**Framework:** vitest

---

### Behavior: ExtractorLogger is a pure structural interface (REQ-002)

**Given** the `ExtractorLogger` type exported from `@/types`
**When** an object with `info`, `warn`, `error` methods (all `(event: string, payload: Record<string, unknown>) => void`) is declared
**Then** TypeScript accepts it as `ExtractorLogger` without errors

**When** the `src/types/logger.ts` file is inspected
**Then** it contains zero runtime code (only a `type` or `interface` declaration)

**Test file:** `src/__tests__/domain/extraction-payload.test-d.ts`
**Framework:** vitest (type tests)

---

## Task T2: Semaforo Types + Habilitante Patterns + Barrel Additions

### Behavior: Semaforo/RequisitoCategoria/HABILITANTE_HEADING_PATTERNS resolve from @/types — TC-005

**Given** the barrel `src/types/index.ts`
**When** `import { type Semaforo, type SemaforoStats, type RequisitoCategoria, type IsHabilitanteSource, HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'` is evaluated
**Then** all named exports resolve without TypeScript errors

**When** the consumer inspects `HABILITANTE_HEADING_PATTERNS`
**Then** it is a `readonly RegExp[]` of length >= 5 and `HABILITANTE_PATTERNS_VERSION` is `'v1.0.0'`

**Test file:** `src/__tests__/domain/semaforo.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: Semaforo.byCategoria has exactly 4 keys; 'general' is not a key (RN-002) — TC-006

**Given** the `Semaforo` type definition
**When** a consumer writes `semaforo.byCategoria.general`
**Then** TypeScript compilation fails — `general` is not a key of `Record<RequisitoCategoria, SemaforoColor>`

**When** a consumer writes `semaforo.byCategoria.juridico`
**Then** TypeScript compiles

**Test file:** `src/__tests__/domain/semaforo.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: RequisitoExtractionPayloadSchema resolves from @/types after barrel additions

**Given** the barrel `src/types/index.ts` after extraction-contracts additions
**When** `import { RequisitoExtractionPayloadSchema, type RequisitoExtractionPayload, type ExtractorLogger } from '@/types'` is evaluated
**Then** all three resolve without TypeScript errors

**Test file:** `src/__tests__/domain/semaforo.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: Full typecheck passes with all extraction-contract additions (NFR-01)

**Given** all extraction-contract type files are written and the barrel is updated
**When** `npm run typecheck` runs in strict mode
**Then** zero TypeScript errors are emitted and the process exits with code 0 in under 10s

**Test file:** CI step
**Framework:** tsc

---
