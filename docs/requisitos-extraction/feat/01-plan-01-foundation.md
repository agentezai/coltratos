# T1: Provider-Agnostic Foundation (Interface + Errors + ADRs)

## Scope

- `lib/extraction/types.ts` — NEW. Provider-agnostic interface module: `RequisitosExtractor`, `ExtractorInput`, `ExtractorOutput`, `ExtractorErrorCode`, abstract `ExtractorError`, and the five error subclasses. **`ModelMetadata` is imported from `@/types` (canonical in domain-model `src/types/db.ts`), NOT redeclared here** — re-exported from this module for ergonomic consumer access (REQ-003).
- `.nybo/foundation/adrs/ADR-009.md` — NEW. "Provider-agnostic extraction interface with provider-specific implementations."
- `.nybo/foundation/adrs/ADR-010.md` — NEW. "Extraction validation corpus growth tied to product milestones."

## Changes

### Interface module (`lib/extraction/types.ts`)

- Import only domain types from `@/types`: `AnalisisId`, `Empresa`, `ModelMetadata`, `Pliego`, `Requisito`, `Segment`. **No SDK imports, no `node:*` imports, no `process.env` reads, no logger imports.**
- Export `interface ExtractorInput` (REQ-002): `{ pliego: Pliego, segments: Segment[], empresa: Empresa, analisisId: AnalisisId }`.
- **Re-export** `type { ModelMetadata } from '@/types'` (REQ-003) — the canonical declaration is in domain-model's `src/types/db.ts`. **Do NOT declare `interface ModelMetadata` in this file**; a parallel declaration produces structurally-equivalent-but-nominally-distinct types and breaks orchestrator wiring (TC-023).
- Export `interface ExtractorOutput` (REQ-003): `{ requisitos: Requisito[], costUsd: number, modelMetadata: ModelMetadata }`.
- Export `interface RequisitosExtractor` (REQ-001): single method `extract(input: ExtractorInput): Promise<ExtractorOutput>`.
- Export `type ExtractorErrorCode` (REQ-004) as the discriminated literal union of the 5 error codes.
- Export `abstract class ExtractorError extends Error` with `abstract readonly code: ExtractorErrorCode` and `readonly cause?: unknown`. Constructor takes `message` and optional `cause`.
- Export 5 concrete subclasses, each setting its `code`:
  - `ExtractorApiError` (`'EXTRACTOR_API_ERROR'`) — accept optional `retryable: true` flag for orchestrator hint.
  - `ExtractorCostCeilingExceededError` (`'EXTRACTOR_COST_CEILING_EXCEEDED'`) — additional field `breachedAmount: number`.
  - `ExtractorSchemaValidationError` (`'EXTRACTOR_SCHEMA_VALIDATION'`) — additional field `validationErrors: unknown` (Zod issue array, typed loosely so the interface module doesn't pull Zod's types in via inference).
  - `ExtractorTimeoutError` (`'EXTRACTOR_TIMEOUT'`) — additional field `timeoutMs: number`.
  - `ExtractorInputInvalidError` (`'EXTRACTOR_INPUT_INVALID'`) — additional field `validationErrors: unknown`.
- File header comment: `// Provider-agnostic extraction interface. Adding a new implementation must NOT require any edit to this file.`

### ADR-009 (`.nybo/foundation/adrs/ADR-009.md`)

- Title, Status (Accepted), Context (why an interface despite v1 having only one impl), Decision, Alternatives Considered (universal LLM abstraction libraries; Anthropic-direct with no abstraction), Consequences (+ provider migration cost; + negotiation leverage; + comparative auditing capability; + clean testability via `MockRequisitosExtractor`; − one extra type file to maintain).
- Reference RN-001, RN-002, REQ-001, REQ-013.

### ADR-010 (`.nybo/foundation/adrs/ADR-010.md`)

- Title, Status (Accepted), Context (this corpus validates **semantic extraction quality**, distinct from ADR-007's segmentation corpus), Decision, Mandates table:
  - v1 ship: **N=3 fixtures, ≥85% agreement** (the gate this spec ships against).
  - First paying user: **N≥10 fixtures, ≥87% agreement**.
  - Before raising prices above $50/month: **N≥30 fixtures, ≥90% agreement**.
- Storage: `tests/fixtures/golden/extraction/` with `corpus.yaml` manifest tracking source pliego, empresa profile, date scored, expert reviewer (initially: founder; v1.1+: external procurement consultant).
- Consequences (+ growing-quality story tied to revenue milestones; − corpus curation is meaningful ongoing labor; − threshold tightening requires spec revision per RN-014).

### Design Rationale (Single Responsibility, Open/Closed)

T1 owns one concern: the provider-agnostic boundary. Splitting interface from implementation by file enforces the contract at the import-graph level — `lib/extraction/types.ts` cannot accidentally pull in an SDK type because it has no path to one. ADRs are written here because they record the architectural choice that this task instantiates; deferring them to T4 would let the choice drift from its rationale during execution.

## Dependencies

Requires **T0** (in `domain-model` spec, revs 4 + 5 — both shipped): the type-level exports from `@/types` must include `AnalisisId`, `Empresa`, `ModelMetadata`, `Pliego`, `Requisito`, `Segment` plus the **rev-5 additions** (`RequisitoCategoria` narrow, `IsHabilitanteSource`, `HABILITANTE_HEADING_PATTERNS`/`HABILITANTE_PATTERNS_VERSION`). The `RequisitoSchema` and `RequisitoExtractionPayloadSchema` carry citation fields, `categoria` (narrow), `is_habilitante`, `is_habilitante_source`, plus the `categoria === 'general'` `.refine()` rejection. T0 is shipped; this spec is unblocked.

## Done When

- [ ] `lib/extraction/types.ts` exists, compiles in strict mode, and exports the 3 interfaces (`ExtractorInput`, `ExtractorOutput`, `RequisitosExtractor`), 1 type alias (`ExtractorErrorCode`), abstract base class, and 5 error subclasses. **Re-exports** `type { ModelMetadata } from '@/types'` — does NOT declare it locally (TC-023).
- [ ] Grep for `@anthropic-ai/sdk`, `@supabase/*`, `process.env`, `node:`, or any logger module within `lib/extraction/types.ts` returns zero matches.
- [ ] Grep for `interface ModelMetadata` or `type ModelMetadata` within `lib/extraction/types.ts` returns zero matches (TC-023).
- [ ] A throwaway compile-check file `lib/extraction/__compile_check__.ts` (gitignored or removed before merge) confirms `class StubExtractor implements RequisitosExtractor { extract(...) { ... } }` typechecks against the interface using ONLY domain types — no Anthropic types reachable.
- [ ] `.nybo/foundation/adrs/ADR-009.md` and `ADR-010.md` exist with the sections above and Status: Accepted.
- [ ] `npm run typecheck` passes.
