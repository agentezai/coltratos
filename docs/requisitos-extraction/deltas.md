# requisitos-extraction — Deltas

Append-only log of spec revisions. Each delta records the rationale and impact of a change.

---

## Delta 2026-04-27 — edit | Apply 5 cross-spec edits owed to semaforo-aggregation T0 + reconcile ModelMetadata duplication + fix eligibility-matching dead reference

**Mode:** edit
**Rationale:** The [semaforo-aggregation](../semaforo-aggregation/spec/spec.md) spec (approved 2026-04-27) owns the `is_habilitante` knockout rule and depends on this spec to (a) emit `is_habilitante` and `is_habilitante_source` on every Requisito, (b) classify habilitancia via a tiered approach (structural-first via `HABILITANTE_HEADING_PATTERNS`, LLM fallback otherwise), (c) emit a narrow `RequisitoCategoria` (never `'general'`), and (d) carry an acceptance test that gates the structural-tier pattern list at ≥80%. Bundling all five cross-spec items plus the `ModelMetadata` import reconciliation and the `eligibility-matching` → `semaforo-aggregation` dead-name fix in one revision keeps the artifact regen (golden corpus annotations, prompt updates, validation hooks, ≥80%-structural test) atomic — splitting them would force three corpus regenerations.
**Affected domains:** requisito-extraction, eligibility-matching, empresa-profile

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T1 (Provider-Agnostic Foundation):** `lib/extraction/types.ts` now **imports** `ModelMetadata` from `@/types`, never redeclares it locally (REQ-003 reconciliation). The interface module re-exports `type { ModelMetadata }` for ergonomic consumer access. Done-when checklist gains a "no local `ModelMetadata` declaration" item (TC-023).
- **T4 (AnthropicRequisitosExtractor):** Adds step 2a — per-segmento structural habilitancia pre-classification using `HABILITANTE_HEADING_PATTERNS` from `@/types`. The prompt for each categoría is parameterized: when a segmento has a structural heading match, the LLM is instructed to omit `is_habilitante`/`is_habilitante_source` and the extractor populates them post-validation as `'structural'`; when no structural match exists, the LLM emits both fields with source `'llm'`. The post-validation step (`assembleRequisitos`) gains a `structuralMap` parameter and **sets every emitted `Requisito.categoria` to the narrow `RequisitoCategoria`** matching the call's bucket (never `'general'`). v1 extractors NEVER emit `is_habilitante_source: 'manual'` — that value is reserved at the schema layer for v1.1+ user-correction UI.
- **T6 (Corpus + Acceptance):** The 3-fixture golden corpus is regenerated with `is_habilitante` + `is_habilitante_source` annotations on every requisito. The acceptance test gains an aggregation step: across all fixtures, the count of requisitos with `is_habilitante === true AND is_habilitante_source === 'structural'` MUST be ≥80% of the total habilitante-true count. The pattern list is co-evolved with the corpus — if the structural fraction is too low, either expand `HABILITANTE_HEADING_PATTERNS` (a domain-model edit + version bump) or revise fixtures.

### Tasks removed
- None.

### Spec sections modified
- **§v1 Scope (Out of scope)**: `eligibility-matching` → `semaforo-aggregation` (renamed; the future spec now exists and is approved). `is_habilitante_source = 'manual'` reservation note added.
- **REQ-002 (ExtractorInput)**: clarified that the orchestrator owns the upstream filter (general/synthetic exclusion).
- **REQ-003 (ExtractorOutput / ModelMetadata)**: changed from "declare `interface ModelMetadata`" to "import `ModelMetadata` from `@/types`"; added the reconciliation rationale (parallel declaration breaks orchestrator wiring).
- **REQ-006**: extended with the categoria denormalization rule — every emitted Requisito carries narrow `RequisitoCategoria`; LLM payloads with `categoria === 'general'` are Zod failures.
- **REQ-009**: clarified that the `.refine()` rejecting `categoria === 'general'` is part of the validation step; the regeneration prompt embeds the Zod error message.
- **REQ-019** (new): tiered `is_habilitante` classification — structural-first via `HABILITANTE_HEADING_PATTERNS`, LLM fallback otherwise, manual reserved for v1.1+.
- **REQ-020** (new): ≥80%-structural acceptance test gating `HABILITANTE_HEADING_PATTERNS` quality.
- **REQ-021** (new): categoria narrowing at the validation boundary — payload schema's `.refine()` rejects `'general'`; the extractor does not silently rewrite.
- **RN-015** (new): categoria narrowing happens at validation, not at the segmento boundary.
- **RN-016** (new): tiered `is_habilitante` classification implementation contract — three tiers, ownership note pointing back to semaforo-aggregation RN-014.
- **TC-019 / TC-020 / TC-021 / TC-022 / TC-023** (new — 5 cases): ≥80%-structural acceptance gate; structural-tier bypasses LLM habilitancia; `categoria === 'general'` Zod rejection; emitted requisitos are narrow; `ModelMetadata` is imported, not declared.
- **Architecture / Tradeoffs**: added rows for tiered classification, narrowing site (Zod `.refine()` on payload schema), and `ModelMetadata` ownership (canonical in `@/types`).
- **API/Data Contracts code block**: removed the local `interface ModelMetadata` declaration; added `ModelMetadata` to the `import type { ... } from '@/types'` line; added a comment noting the canonical home.
- **Dependencies on `domain-model`**: restructured to reflect rev-4 (12 items, shipped) + rev-5 (7 additional items used by this spec, shipped). T0 is fully shipped; spec is unblocked.
- **Revision Log**: entry added for rev 2.

### Impact on memory (Delta 2026-04-27)
- **Pattern (cross-feature):** **Tiered classifier with structural-first / LLM-fallback / manual-override** for high-stakes booleans whose pure-LLM classification is operationally risky. The structural tier is a curated regex list (versioned, pure data); the LLM tier handles edge cases; manual override is a v1.1+ hatch. The acceptance test enforces a minimum fraction of structural classifications to keep the pattern list doing real work. Strong promotion candidate after this spec ships and the ≥80%-structural gate is observed in production.
- **Pattern (cross-feature):** **Narrowing at the validation boundary, not in a downstream cleanup step.** When an upstream filter excludes specific values (e.g., `categoria === 'general'`), enforce the narrow contract on the validation schema itself via `.refine()`. The "reject and retry with the Zod error in the prompt" pattern gives the LLM one chance to self-correct before the orchestrator sees a hard fail.
- **Convention (immediate):** **Canonical type ownership for shared interfaces.** When two specs need the same interface (here: `ModelMetadata`, owned by domain-model `src/types/db.ts`, consumed by requisitos-extraction), the consumer imports — never re-declares. Parallel structurally-equivalent declarations produce nominally-distinct types in TypeScript and break narrowing at boundaries. Worth adding to `.nybo/foundation/conventions.yaml` via `/nybo-curate conventions add`.
- **Cross-spec coupling note:** `HABILITANTE_HEADING_PATTERNS` is co-evolved with this spec's golden corpus. Bumping `HABILITANTE_PATTERNS_VERSION` requires regenerating the corpus annotations (the `is_habilitante_source` distribution may shift). The version stamp is the cache-invalidation contract for any future caching keyed on classifications.

---

## Delta 2026-05-05 — edit | Rev 3: pdf-ingestion contract realignment + eval-harness gate + MUST formalizations

**Mode:** edit
**Rationale:** Four changes required: (1) pdf-ingestion rev 4 changed its output contract from `Segment[]` to per-page `IngestionResult` — extraction's `ExtractorInput.segments: Segment[]` is stale and replaced by `ingestionResult: IngestionResult`. (2) RN-012 referenced `citation_segment_id` + `isSynthetic`/`general`-segment filtering that lived in a categorizer which no longer exists in the rev-4 pipeline — both the rule and any residual references are removed. RN-007 also referenced the old orchestrator pre-filter that assumed `Segment[]` with `categoria` and `is_synthetic` fields — removed. (3) `extraction-eval-harness` was planned after spec approval and must be wired as a hard Verified gate (RN-019): partial results count as recall=0 for failed categories in the harness metric. (4) Several MUST items formalized: `pagina_fuente`+`quote_fuente` citation with NFKC+whitespace-collapse+case-fold normalization (RN-018); partial result with `warning`+`failed_categories` on single-category second Zod failure (RN-021); three UI states for partial vs missing vs extracted; token logging with distinct `cache_creation_input_tokens`/`cache_read_input_tokens` fields; ADR-010 pipeline position cross-reference (RN-020).
**Affected domains:** requisito-extraction, pliego-ingestion

### Tasks added
- T7: extraction-eval-harness Verified Gate — CI eval trigger (`extraction-eval.yml`) + `nybo-verify` gate check against `eval-results/index.md`.

### Tasks modified
- T1: `ExtractorInput.segments: Segment[]` → `ingestionResult: IngestionResult`; `ExtractorOutput` gains `warning?: string` and `failed_categories?: RequisitoCategoria[]`.
- T2: `buildCategoryRequest` receives `pages: Page[]`; empty pages rendered as `[PÁGINA VACÍA]` in prompt; system block 1 includes `section_heading` instruction.
- T3: `verifyCitation` args: `page: Page`, `pagina: number` (not `segment: Segment`); verification applies NFKC + whitespace-collapse + case-fold to both sides; `citation_unverified` replaces `citation_verified` semantics; `assembleRequisitos` takes `pages: Page[]`.
- T4: No `general`/`is_synthetic` pre-filter (those fields gone); all pages sent to each category call; structural habilitante classification moves to post-validation using LLM-emitted `section_heading`; second Zod failure on one category → partial output + `warning` + `failed_categories`; all-categories failure → `ExtractorSchemaValidationError`; `cost_telemetry` log gains distinct `cache_read_input_tokens`/`cache_creation_input_tokens` fields.
- T6: Fixture `segments.json` → `ingestionResult.json`; `expected_requisitos.json` gains `pagina_fuente` + `quote_fuente` (replaces `citation_segment_id` / `citation_quote`); assertion for `warning === undefined` on clean fixtures; `pagina_fuente` range assertion.

### Tasks removed
- None (T0 completed tasks preserved; no pending tasks removed, only modified).

### Rules removed
- RN-007: general/is_synthetic orchestrator pre-filter — the `Segment.categoria` and `Segment.is_synthetic` fields no longer exist in the per-page model.
- RN-012: `citation_segment_id`-based verification — replaced by `pagina_fuente` + `quote_fuente` page-level verification.

### Rules added
- RN-017: Per-page input contract (`IngestionResult` from pdf-ingestion rev 4).
- RN-018: Citation verification against page index with NFKC + whitespace-collapse + case-fold normalization.
- RN-019: Hard quality gate — Verified requires passing extraction-eval-harness run; partial results count as recall=0.
- RN-020: Pipeline position — extraction is downstream consumer per pdf-ingestion ADR-010.
- RN-021: Partial result surfacing — `warning` + `failed_categories` must not be hidden; three UI states defined.

### Impact on memory (Delta 2026-05-05)
- **Convention update:** The old `Segment[]`-based contract was a carryover from pre-rev-4 pdf-ingestion. The per-page `IngestionResult` pattern is the new canonical upstream shape for any pipeline component consuming pdf-ingestion output.
- **Pattern update:** Structural habilitante classification now uses the LLM-emitted `section_heading` field (post-validation) rather than a pre-computed `heading_normalized` on the Segment. Golden corpus regeneration required — `section_heading` quality determines structural-tier hit rate.
- **Partial result semantics established:** When the extractor cannot extract one category (second Zod failure), it returns a partial result with `warning` + `failed_categories` rather than throwing. Callers must inspect `failed_categories` to distinguish "no requisitos found" from "extraction failed". This pattern may be reusable for other LLM extraction features.
