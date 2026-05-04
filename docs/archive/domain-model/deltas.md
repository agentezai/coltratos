# domain-model — Deltas

Append-only log of spec revisions. Each delta records the rationale and impact of a change.

---

## Delta 2026-04-26 — edit | Replace Pliego with Proceso + Documento; bifurcate RLS

**Mode:** edit
**Rationale:** The original entity model conflated the public procurement process with its documents and incorrectly attached "ownership" of pliegos to empresas. Pliegos are public documents published by contracting entities (Alcaldía, Ministerio, ICBF, etc.) as part of a Proceso de Contratación; empresas analyze them to decide whether to bid — they don't own them. Multiple empresas can analyze the same proceso independently. Collapsing Proceso and Documento now would force a destructive migration when v2 adds adenda support.
**Affected domains:** pliego-upload, requisito-extraction, eligibility-matching, analytics

### Tasks added
- None (task count unchanged at 6)

### Tasks modified
- T1: Replaced `PliegoId` with `ProcesoId` + `DocumentoId`; replaced `PliegoEstado` enum with `ModalidadContratacion` + `DocumentoTipo`
- T2: Removed `pliego.ts`; added `proceso.ts` + `documento.ts`; modified `segmento.ts` (`pliego_id` → `documento_id`), `analisis.ts` (added `proceso_id` and `documento_ids: uuid[]`), `prompt-cache.ts` (added `empresa_id`, FK now `documento_id`)
- T3: Migration creates 8 tables (was 7); added `proceso` (no `deleted_at`) and `documento` (`UNIQUE(file_hash)` global, soft-delete); updated FKs and indexes; added `modalidad_contratacion` and `documento_tipo` Postgres enums
- T4: Bifurcated RLS — public-read for `proceso`/`documento`/`segmento`; `empresa_member` join only on `analisis`/`requisito`/`prompt_cache`
- T5: Removed `PliegoTable`; added `ProcesoTable` + `DocumentoTable`; updated `SegmentoTable`, `AnalisisTable` (with `documento_ids: ColumnType<string[]>`), `PromptCacheTable`
- T6: Barrel exports `Proceso*` and `Documento*` instead of `Pliego*`

### Tasks removed
- None

### Impact on memory
- pliego-upload domain: ownership semantics, idempotency cache key `(documento_hash, empresa_id)`, manual SECOP process number entry at upload (auto-extraction is v1.1)
- requisito-extraction domain: now extracts from a `Documento` (not a `Pliego`); a single análisis still processes one documento in v1
- eligibility-matching domain: análisis is now scoped by `(proceso_id, empresa_id)` rather than `(pliego_id, empresa_id)`; multiple empresas can produce independent verdicts on the same proceso
- analytics domain: dashboards aggregating "pliego counts" must be reframed as "proceso counts" or "documento counts" depending on intent — these are no longer the same metric

---

## Delta 2026-04-26 — edit | Apply pdf-ingestion T0 prerequisite (8 segmento changes)

**Mode:** edit
**Rationale:** The [pdf-ingestion](../pdf-ingestion/spec/spec.md) spec was approved with revision 1 and lists 8 changes to `segmento` as a hard T0 prerequisite. Locking the column shape and the explicit `is_synthetic` intent flag at the schema layer prevents downstream consumers (requisitos-extraction, future requisito-extraction work) from inferring extraction-eligibility from heading nullability and avoids a destructive migration when the second consumer ships. Three CHECK constraints + three Zod `.refine()` validators jointly enforce the RN-010 triple-equivalence at both the DB and app layers.
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T1 (Type Primitives):** `SegmentoCategoria` const-object/union extended with `'general'`. ASCII-only invariant preserved.
- **T2 (Zod Schemas):** `SegmentoSchema` gains `page_range_start`, `page_range_end` (both `int >= 1`), `heading_normalized: z.string().nullable()`, `heading_original: z.string().nullable()`, `is_synthetic: z.boolean()`, plus three `.refine()` validators mirroring the DB CHECK constraints (page-range bounds; heading both-or-neither; synthetic ⇔ null heading). Defense in depth: app-layer rejection ahead of any DB roundtrip.
- **T3 (Postgres Migration):** `segmento_categoria` enum gains `'general'`. `segmento` table gains 5 columns and 3 CHECK constraints (`segmento_page_range_valid`, `segmento_heading_both_or_neither`, `segmento_synthetic_iff_null_heading`).
- **T5 (Kysely Types):** `SegmentoTable` gains `page_range_start: number`, `page_range_end: number`, `heading_normalized: string | null`, `heading_original: string | null`, `is_synthetic: ColumnType<boolean, boolean | undefined, boolean>`. The `ColumnType` form makes `NewSegmento` accept inserts without `is_synthetic` (DB default `false` applies).

### Tasks removed
- None.

### Spec sections modified
- **REQ-001/002/006/008** — extended to reference the new shapes.
- **REQ-012** (new) — Zod `.refine()` defense-in-depth requirement.
- **RN-007** — enum extended with `general`.
- **RN-010** (new) — heading triple-equivalence; `is_synthetic` is the source of truth for downstream branching, NOT heading nullability.
- **RN-011** (new) — `page_range_*` 1-indexed, both ≥ 1, `start ≤ end`.
- **TC-010 through TC-014** (new) — Zod accept `general`; CHECK constraint rejection at the Postgres layer; `.refine()` rejection at parse time.
- **Architecture / Tradeoffs** — added rows for synthetic-segment marker and heading dual-form persistence.
- **Architecture / Data Model ER diagram + entity table** — `segmento` row updated.
- **Revision Log** — entry added for this edit.

### Impact on memory
- **Pattern candidate (cross-feature):** dual-form persistence (raw + normalized) paired with an explicit boolean intent flag — not inferring intent from NULL-ness of paired columns. The same principle is established in [pdf-ingestion RN-011](../pdf-ingestion/spec/spec.md). Reusable for future heuristic-classification features that distinguish "real data we matched" vs "fallback we generated". Promote via `/nybo-curate extract` after both pdf-ingestion and the first downstream consumer (requisitos-extraction) ship.
- **Convention reinforcement:** the **Defense-in-depth invariant pattern** — every Postgres CHECK constraint has a matching Zod `.refine()`. Promote via `/nybo-curate conventions add` once a second feature uses it.
- **Cross-spec coupling note:** pliego-upload and requisito-extraction domains now have a hard contract to honor — consumers MUST branch on `is_synthetic`, not on heading nullability. The principle is captured in RN-010 here and in pdf-ingestion's RN-012 (downstream consumer contract); future features that touch `segmento` must read both before changing extraction logic.

---

## Delta 2026-04-26 — edit | Rename Documento → Pliego; restrict pliego_tipo enum; add AnexoProceso sibling entity

**Mode:** edit
**Rationale:** "Documento" introduced a different conflation than the one revision 1 fixed: a single entity with a discriminator (`documento_tipo`) covering both pliegos (with requisitos habilitantes) and complementary documents (anexos, estudios, resoluciones). Real users say "pliego" — forcing them through "Documento" was an unnecessary translation layer. Restricting `pliego_tipo` to {`pliego_condiciones`, `pliego_definitivo`} keeps the term semantically tight; sibling `AnexoProceso` covers everything else with the same shape but distinct table and enum.
**Affected domains:** pliego-upload, requisito-extraction, eligibility-matching, analytics

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T1 (Type Primitives):** `DocumentoId` → `PliegoId`; new `AnexoProcesoId`. `DocumentoTipo` (7 values) replaced by narrow `PliegoTipo` (`pliego_condiciones`/`pliego_definitivo`) and new `AnexoProcesoTipo` (`anexo_tecnico`/`estudio_previo`/`resolucion`/`otro`). Adds **ADR-008** (Pliego/AnexoProceso split) alongside ADRs 001/002/003.
- **T2 (Zod Schemas):** `documento.ts` renamed to `pliego.ts`; new `anexo-proceso.ts` (sibling, same shape, distinct enum). `SegmentoSchema.pliego_id`, `AnalisisSchema.pliego_ids`, `PromptCacheSchema.pliego_id` (all FK renames). Entity count: 7 → 8.
- **T3 (Postgres Migration):** Table rename `documento` → `pliego`; new `anexo_proceso` table (independent FK to `proceso`). Enum rename `documento_tipo` → narrow `pliego_tipo`; new `anexo_proceso_tipo`. All FK columns renamed (`segmento.pliego_id`, `analisis.pliego_ids`, `prompt_cache.pliego_id`). All indexes renamed. Independent UNIQUE on `pliego.file_hash` and `anexo_proceso.file_hash` — separate dedup spaces. Migration table count: 8 → 9.
- **T4 (RLS Policies):** Public-read policies renamed `documento` → `pliego`; parallel policies for `anexo_proceso`. Hard-delete restrictive policies on both `pliego` and `anexo_proceso`.
- **T5 (Kysely Types):** `DocumentoTable` → `PliegoTable`; new `AnexoProcesoTable`. `Database` interface keys: drop `documento`, add `pliego` and `anexo_proceso`. All FK columns renamed in `SegmentoTable`/`AnalisisTable`/`PromptCacheTable`.
- **T6 (Barrel Exports):** Drops `Documento*`; exports `Pliego*` and `AnexoProceso*`. The barrel test verifies `import { DocumentoSchema } from '@/types'` produces a TypeScript error (legacy name removed).

### Tasks removed
- None.

### Spec sections modified
- **Intention** — references Pliego and AnexoProceso explicitly; Pliego framed as restricted to documents with requisitos habilitantes.
- **REQ-001/002/005/006/007/008/009/010/011** — entity references updated; entity count 7 → 8; table count 8 → 9; FK column renames throughout; new enum tightness in REQ-001 and REQ-006.
- **RN-003/004/008/009** — Documento → Pliego; AnexoProceso added; independent dedup space documented.
- **NEW RN-012** — Pliego semantic tightness rule; consumers MUST query `pliego` for requisito-bearing documents and `anexo_proceso` for everything else.
- **TC-003a/b, TC-004, TC-007** — renamed; TC-004 extended to verify cross-table dedup-space independence.
- **NEW TC-015 / TC-016 / TC-017 / TC-018** — pliego_tipo enum rejection; anexo_proceso_tipo has 4 values; anexo_proceso public-read parity; anexo_proceso file_hash UNIQUE within table.
- **Architecture / ADRs** — added **ADR-008** (Pliego/AnexoProceso split). Authored under T1 alongside ADRs 001-003.
- **Architecture / Tradeoffs** — Proceso/Documento split row reframed as Proceso/Pliego/AnexoProceso; new rows for "Pliego enum tightness" and "File-hash dedup space (independent per table)".
- **Architecture / Data Model ER + entity table** — `documento` → `pliego` with restricted tipo; new `anexo_proceso` row; FK arrows updated.
- **Revision Log** — entry added for revision 3.

### Impact on memory
- **Pattern (cross-feature):** "Vocabulary correction with sibling-entity split" — when a domain term carries an overloaded discriminator, the cleanest fix is to split the entity rather than refine the discriminator. The split must be visible at every layer (table, schema, type, enum) to avoid sibling re-conflation. Promote via `/nybo-curate extract` after the split has shipped and proven its value (no v1.x revision rolling back to a unified entity).
- **Pattern (cross-feature):** "Independent dedup spaces per sibling entity" — when two sibling tables share a structural shape (`file_hash`, `proceso_id`, etc.), keep their UNIQUE constraints independent rather than introducing a cross-table CHECK trigger or a unified storage parent. Cross-sibling content collisions are essentially impossible in practice and the simplicity is worth the theoretical leak.
- **Cross-spec coupling note:** pdf-ingestion (revision 1, approved) references the old `documento` vocabulary throughout its narrative. Despite no functional change at the function boundary, a follow-up `/nybo-plan edit pdf-ingestion` is required to update spec text. **This is queued as the next session.**
- **Convention candidate:** ADR-008 establishes a precedent — entity renames driven by user vocabulary should be tracked as ADRs, not just delta entries. The ADR captures the rationale durably; the delta captures the timeline. Future user-vocabulary-driven renames (likely as the product grows into Spanish-speaking procurement workflows) should follow this pattern.

---

## Delta 2026-04-27 — edit | Apply requisitos-extraction T0 prerequisite (12 items)

**Mode:** edit
**Rationale:** The [requisitos-extraction](../requisitos-extraction/spec/spec.md) spec (approved 2026-04-26) lists 12 schema-layer additions as a hard T0 prerequisite. The provider-agnostic `RequisitosExtractor` interface (`lib/extraction/types.ts`) requires (a) citation fields on `requisito` for hallucination resistance — every extracted requisito must cite a source segment with a verbatim ≤200-char quote and a verifier verdict; (b) telemetry fields on `analisis` for unit-economics tracking — `cost_usd`/`model_metadata`/`prompt_version` populated by the orchestrator after extraction completes; (c) a cache-invalidation signal on `empresa` (`profile_updated_at`) that the Anthropic prompt-cache layer reads to invalidate cached prefixes when an empresa edits its profile; (d) a distinct `RequisitoExtractionPayloadSchema` separating LLM-output shape from persisted-row shape; (e) an `ExtractorLogger` structural interface so `lib/extraction/` depends only on the type, not on any concrete logger. Locking these schema changes before requisitos-extraction T1 begins avoids a destructive migration mid-feature.
**Affected domains:** requisito-extraction, eligibility-matching, empresa-profile

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T2 (Zod Schemas):** `EmpresaSchema` gains `profile_updated_at: z.coerce.date()`. `AnalisisSchema` gains nullable `cost_usd`, `model_metadata` (object with implementation_id/model_name/prompt_version), `prompt_version`. `RequisitoSchema` gains `citation_segment_id: z.string().uuid()`, `citation_quote: z.string().min(1).max(200)`, `citation_verified: z.boolean()`. New file `src/types/domain/extraction-payload.ts` exports `RequisitoExtractionPayloadSchema` (LLM-output contract distinct from `RequisitoSchema`, omits `id`/`analisis_id`/`created_at`/`citation_verified`) and `RequisitoExtractionPayloadArraySchema` (the wrapper).
- **T3 (Postgres Migration):** 7 new columns + 1 CHECK constraint + 1 trigger function + 1 trigger. `requisito` gains `citation_segment_id UUID NOT NULL REFERENCES segmento(id)`, `citation_quote TEXT NOT NULL` with `requisito_citation_quote_length` CHECK, `citation_verified BOOLEAN NOT NULL DEFAULT false`. `analisis` gains `cost_usd NUMERIC(10,6) NULL`, `model_metadata JSONB NULL`, `prompt_version TEXT NULL`. `empresa` gains `profile_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` plus `set_empresa_profile_updated_at()` BEFORE-UPDATE trigger that bumps the column when watched business columns (`nombre`, `nit`) change — explicit per-column dirty-check excludes `profile_updated_at` itself to avoid recursion and forces an explicit decision for any future column added to `empresa`.
- **T5 (Kysely Types):** `RequisitoTable` gains the 3 citation fields with `citation_verified` as `ColumnType<boolean, boolean | undefined, boolean>` (DB default applies on insert). `AnalisisTable` gains the 3 telemetry fields. `EmpresaTable.profile_updated_at` typed as `ColumnType<Date, never, never>` — read-only at the type level so application code cannot insert or update it; the trigger is the only legitimate writer. `ModelMetadata` interface declared and re-exported.
- **T6 (Barrel Exports):** New file `src/types/logger.ts` exports `ExtractorLogger` interface (3 methods, pure type, zero runtime). Barrel re-exports `RequisitoExtractionPayloadSchema`, `RequisitoExtractionPayloadArraySchema`, `type RequisitoExtractionPayload`, `type ExtractorLogger`, and `type ModelMetadata`. `src/types/db.ts` continues to be the source of `ModelMetadata`'s declaration (alongside its consumer `AnalisisTable.model_metadata`).

### Tasks removed
- None.

### Spec sections modified
- **REQ-013 / REQ-014 / REQ-015 / REQ-016 / REQ-017** (new) — citation columns, telemetry columns, `profile_updated_at` + trigger, `RequisitoExtractionPayloadSchema`, `ExtractorLogger`.
- **RN-013 / RN-014 / RN-015** (new) — citation contract; trigger ownership; LLM-output vs persisted-row split.
- **TC-019 through TC-025** (new — 7 cases) — citation fields parse; quote length rejection (Zod and DB); telemetry-fields nullable; `profile_updated_at` parses + Kysely-level write blocked; trigger auto-bumps with no-recursion no-op safety; `RequisitoExtractionPayloadSchema` ≠ `RequisitoSchema`.
- **Architecture / Tradeoffs** — added rows for trigger-managed timestamp and dual-schema split.
- **Architecture / Data Model ER + entity table** — `empresa`/`analisis`/`requisito` rows updated.
- **Revision Log** — entry added for revision 4.

### Impact on memory
- **Pattern (cross-feature):** **Trigger-owned cache-invalidation timestamp with explicit dirty-check.** Every column rendered into a downstream cache prefix has a corresponding watch in the trigger's dirty-check; new columns force an explicit decision. The `ColumnType<Date, never, never>` Kysely shape removes the application-side temptation to mutate the column directly. Reusable for any future cache layer keyed on entity state. Promote via `/nybo-curate extract` after the second feature uses it.
- **Pattern (cross-feature):** **Dual-schema split — LLM-output contract vs persisted-row contract.** When an entity has fields populated by different actors at different times (extractor produces some; orchestrator augments others), keep the schemas distinct and make the orchestrator the only place where they meet. Conflating them via optional fields lets invalid combos through both layers. Promote via `/nybo-curate extract` after `requisitos-extraction` ships and proves the value.
- **Convention reinforcement:** **Defense-in-depth invariant pattern** continues — every Postgres CHECK has a matching Zod check (here: `citation_quote` length 200 enforced at both the DB CHECK and the Zod `.max(200)`). Strong candidate for promotion to a project convention via `/nybo-curate conventions add`.
- **Cross-spec coupling note:** `requisitos-extraction` T1 is now unblocked. The interface module `lib/extraction/types.ts` can import `Empresa` (with `profile_updated_at`), `Requisito` (with citation fields), `Analisis` (with telemetry fields), `RequisitoExtractionPayload(Schema)`, and `ExtractorLogger` directly from `@/types`. No further T0-style schema work is expected before T1 begins.

---

## Delta 2026-04-27 — edit | Apply semaforo-aggregation T0 (9 items) + introduce requisito.categoria immutability + fix UC-03 RLS contradiction

**Mode:** edit
**Rationale:** The [semaforo-aggregation](../semaforo-aggregation/spec/spec.md) spec (approved 2026-04-27) lists 9 schema-layer additions as a hard T0 prerequisite. Locking the column shape and the **narrow** `RequisitoCategoria` enum at the schema layer prevents the aggregation function from having to handle `general`-categoria requisitos at runtime — the upstream filter contract (per pdf-ingestion RN-012) becomes structurally enforced rather than behaviorally enforced. The `categoria` immutability invariant (RN-016) is bundled into the same edit because it is conceptually inseparable from REQ-018: a denormalized column whose source row was re-categorized requires re-extraction, not row-level UPDATE; encoding this at the type layer (`ColumnType<R, R, never>`) prevents an entire class of orchestration bugs at compile time. The UC-03 RLS rewrite is overdue housekeeping — the use-case described `pliego` as empresa-scoped, contradicting REQ-011 / RN-008 in the same spec; rev 5 brings UC-03 in line with the bifurcated-RLS contract that has been canonical since rev 1.
**Affected domains:** requisito-extraction, eligibility-matching, analytics

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T1 (Type Primitives):** New enum literals `RequisitoCategoria` (narrow 4 values, EXCLUDES `general`) and `IsHabilitanteSource` (`'structural' | 'llm' | 'manual'`). Existing enums and IDs unchanged.
- **T2 (Zod Schemas + Domain Files):** `RequisitoSchema` extended with `categoria` (narrow enum), `is_habilitante` (boolean), `is_habilitante_source` (enum). `RequisitoExtractionPayloadSchema` extended with `is_habilitante` + `is_habilitante_source` AND a `.refine()` rejecting `categoria === 'general'` payloads (the narrowing-rule ownership lives on the payload schema itself, not in the orchestrator). `AnalisisSchema` gains nullable `semaforo_rules_version`. New file `src/types/domain/semaforo.ts` (types-only: `Semaforo`/`SemaforoStats`/`RequisitoCategoria`/`IsHabilitanteSource`). New file `src/types/domain/habilitante-patterns.ts` (runtime constants: `HABILITANTE_HEADING_PATTERNS` regex array + `HABILITANTE_PATTERNS_VERSION = 'v1.0.0'`).
- **T3 (Postgres Migration):** `requisito` gains 3 columns (`categoria TEXT NOT NULL`, `is_habilitante BOOLEAN NOT NULL`, `is_habilitante_source TEXT NOT NULL`) + 2 new CHECK constraints (`requisito_categoria_narrow`, `requisito_is_habilitante_source_valid`). `analisis` gains `semaforo_rules_version TEXT NULL`. Migration table count unchanged at 9.
- **T5 (Kysely Types):** `RequisitoTable.categoria: ColumnType<RequisitoCategoria, RequisitoCategoria, never>` — the immutability enforcement at the type layer (RN-016). `RequisitoTable.is_habilitante: boolean`; `RequisitoTable.is_habilitante_source: IsHabilitanteSource`. `AnalisisTable.semaforo_rules_version: string | null`. Comment clarifies that `ModelMetadata` is owned by `db.ts` (canonical) and downstream `lib/extraction/types.ts` MUST import via the barrel, not redeclare locally.
- **T6 (Barrel Exports):** Re-export `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource` from the new `semaforo.ts`; re-export `HABILITANTE_HEADING_PATTERNS` and `HABILITANTE_PATTERNS_VERSION` (runtime values, not types) from the new `habilitante-patterns.ts`.

### Tasks removed
- None.

### Spec sections modified
- **REQ-013** annotated with the immutability invariant (the column carries the new categoria field).
- **REQ-016** extended with `is_habilitante` + `is_habilitante_source` and the explicit narrowing rule ("categoria='general' raises ZodError → ExtractorSchemaValidationError").
- **REQ-018 / REQ-019 / REQ-020 / REQ-021 / REQ-022** (new) — narrow categoria column; is_habilitante + is_habilitante_source columns; semaforo_rules_version on analisis; Semaforo type definitions; HABILITANTE_HEADING_PATTERNS constant.
- **RN-016 / RN-017 / RN-018** (new) — categoria immutability; narrow RequisitoCategoria vs wide SegmentoCategoria; tiered classifier source contract.
- **TC-026 through TC-031** (new — 6 cases) — narrow categoria rejection at Zod (Requisito + payload); is_habilitante + is_habilitante_source acceptance; DB CHECK rejection; categoria immutability at the type layer; new types and constants resolve from `@/types`.
- **UC-03** rewritten — uses `analisis` (empresa-scoped) instead of the contradictory `pliego` (public-readable per REQ-011 / RN-008). UC-04 also updated to use `analisis` for the empresa-scoped query example and gain a 4f error scenario (UPDATE on `requisito.categoria` fails to compile).
- **Architecture / Tradeoffs** — added rows for "Requisito categoria immutability", "Narrow RequisitoCategoria vs wide SegmentoCategoria", "Habilitante pattern list as a domain constant".
- **Architecture / Data Model ER + entity table** — `analisis` gains `semaforo_rules_version`; `requisito` gains `categoria` (narrow), `is_habilitante`, `is_habilitante_source`.
- **Revision Log** — entry added for revision 5.
- **Stale references fixed** — `claude-extraction → requisitos-extraction` in REQ-016 commentary, Tradeoffs row 301, and changelog row 476. Forward-looking deltas.md references (lines 38, 65) also fixed.

### Impact on memory
- **Pattern (cross-feature):** **Compile-time immutability via Kysely `ColumnType<T, T, never>`.** When a denormalized column's source-of-truth lies upstream (e.g., `requisito.categoria` is the LLM extractor's output of a property derived from `segmento.categoria`), make it structurally impossible to UPDATE the column without going through re-extraction. Pattern parallel to RN-014's `profile_updated_at` (`ColumnType<Date, never, never>`, fully read-only at the type layer). Promote via `/nybo-curate extract` after the second feature uses it.
- **Pattern (cross-feature):** **Narrow-vs-wide enum split for upstream filtering.** When an upstream filter excludes specific enum values (e.g., pdf-ingestion RN-012 excludes `general` from extraction), encode the post-filter type narrowly (`RequisitoCategoria` = 4 values) rather than reusing the wide upstream type (`SegmentoCategoria` = 5 values). Every downstream consumer (`aggregateSemaforo`, FE bucket views, analytics) gets the narrowing in the type system instead of duplicating the assertion N times. Promote via `/nybo-curate extract` once a third instance of the pattern emerges.
- **Convention reinforcement:** The **Defense-in-depth invariant pattern** continues — Postgres CHECK constraints (`requisito_categoria_narrow`, `requisito_is_habilitante_source_valid`) paired with Zod-layer enforcement (narrow enum on `RequisitoSchema.categoria`; `.refine()` on `RequisitoExtractionPayloadSchema.categoria`). Strong promotion candidate.
- **Cross-spec coupling note:** semaforo-aggregation T1 is now unblocked at the schema layer. The remaining cross-spec edit owed is to requisitos-extraction (5 items: tiered classifier, is_habilitante_source emission, payload schema extension, golden corpus regen, ≥80%-structural acceptance test). Queued as the next session.
- **Cross-spec coupling note:** the wide `SegmentoCategoria` and narrow `RequisitoCategoria` are now formally distinct types at the primitive layer. Any future feature that conflates them (e.g., a UI bucket view that uses `SegmentoCategoria` to render verdict tabs) will fail at compile time.

---

## Delta 2026-04-28 — edit | Tooling-consistency rename: pnpm typecheck → npm run typecheck (NFR-01)

**Mode:** edit
**Rationale:** The architectural-guardrails audit identified that domain-model NFR-01 was the only `pnpm` reference in any approved spec, while every other surface (`.github/workflows/ci.yml`, `AGENTS.md`, the new project-bootstrap spec) uses `npm`. project-bootstrap REQ-012 / RN-001 codifies npm as the project package manager (per ADR-014); converging NFR-01 on `npm run typecheck` removes the only inconsistency. One-line edit per the spec; in practice three references in `spec.md` (lines 53, 118, 375) were rewritten — same rationale applies to all three. No functional change to the underlying gate (still `tsc --noEmit --strict`, still <10s).
**Affected domains:** infrastructure (no product-domain impact)

### Tasks added
- None.

### Tasks modified
- None (the change is in the spec text, not the task plans).

### Tasks removed
- None.

### Spec sections modified
- **NFR-01** (Performance row): `pnpm typecheck` → `npm run typecheck` — primary edit.
- **TC-005** scenario text: `pnpm typecheck` → `npm run typecheck` — same rename.
- **Performance Goals & Metrics** table row: `pnpm typecheck` → `npm run typecheck` (label + measurement) — same rename.
- All other NFRs, REQs, RNs, TCs unchanged. Task plans, contract, verify, progress files unchanged.

### Impact on memory
- **Convention reinforcement:** project-bootstrap RN-001 (npm as package manager) is now consistent across every spec surface. Future specs that reference `pnpm` should be flagged as drift; if a third inconsistency emerges, promote to `.nybo/foundation/conventions.yaml` via `/nybo-curate conventions add`.
