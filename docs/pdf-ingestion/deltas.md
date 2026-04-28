# pdf-ingestion — deltas

Append-only log of spec edits. Each entry captures rationale, affected scope, and impact on memory.

---

## Delta 2026-04-26 — edit | tightened three contract ambiguities (NFR-03 scope, NFD/dual-heading strategy, ADR-007 corpus growth)

**Mode:** edit
**Rationale:** Three ambiguities in the draft would otherwise be resolved at Execute time by the implementer's discretion. The wrong default in any of them creates rework — column shape, normalization strategy, and product-level quality trajectory are expensive to revisit once code lands. Locking them at spec time is free.
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (no new task created; T0 prerequisite scope expanded but it remains T0).

### Tasks modified
- **T0 (prerequisite, domain-model edit)**: scope expanded from 3 changes to 8. Now includes `heading_normalized TEXT NULL`, `heading_original TEXT NULL`, `is_synthetic BOOLEAN NOT NULL DEFAULT false`, plus 2 CHECK constraints (both-or-neither heading; synthetic ⇔ null heading), plus a `.refine()` on `SegmentoSchema` mirroring the constraints.
- **T1 (types + errors + ADRs)**: `Segment` shape gains `headingNormalized: string | null`, `headingOriginal: string | null`, `isSynthetic: boolean`. Adds **ADR-007 (Validation corpus size and quality gates over time)** alongside ADRs 004/005/006. Path moved from `src/services/pdf-ingestion/` to `lib/ingestion/`.
- **T2 (text extractor)**: path moved to `lib/ingestion/extract-text.ts`. Behavior unchanged.
- **T3 (categorizer)**: locks the mandatory NFD normalization formula `text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()` in source; patterns must be authored against the normalized form (case-insensitive `/i` flag forbidden — verified by grep test). Path moved to `lib/ingestion/categorize.ts`.
- **T4 (segmenter)**: now emits dual heading capture (`headingOriginal` = trimmed source line; `headingNormalized` = `normalizeForMatch(headingOriginal)` — guarantees the persisted normalized form matches what the categorizer matched against) and `isSynthetic` correlation. RN-011 triple-equivalence enforced as a runtime invariant: `isSynthetic === true ⇔ headingNormalized === null ⇔ headingOriginal === null`. Path moved to `lib/ingestion/segment.ts`.
- **T5 (public API + purity scan)**: NFR-03 wording rewritten to user's exact specification — purity scan covers `lib/ingestion/**` excluding `__tests__/` and `*.test.*`; `tests/**` is explicitly out of scope. Adds a purity self-test that proves the scan correctly catches violations. Path moved to `lib/ingestion/index.ts`.
- **T6 (corpus + tests)**: adds `tests/fixtures/pliegos/corpus.yaml` manifest with required fields per pliego (`source_entity`, `modalidad`, `year`, `manual_labels`, `date_added`). Acceptance test now also validates the manifest schema and asserts the RN-011 triple-equivalence at the corpus level (not just unit level).

### Tasks removed
- None.

### Spec sections modified
- **Intention** — added the `lib/` vs `src/services/` convention rationale.
- **Functional Requirements** — REQ-001/003/005/006 updated; REQ-013/014/015/016/017 added (dual heading capture, synthetic invariant, corpus.yaml schema; the prior REQ-013/014/015 are renumbered to REQ-015/016/017).
- **Non-Functional Requirements** — NFR-03 rewritten to user's exact wording (scoped grep).
- **Business Rules** — RN-005 lost its "e.g." hedge (formula now mandated); RN-008 expanded to cover heading shapes; RN-011 added (synthetic/heading triple-equivalence + intent-vs-data principle); RN-012 added (downstream consumer contract — `claude-extraction` excludes both `isSynthetic === true` and `categoria === 'general'`).
- **Test Cases** — TC-003/004/009 rewritten to incorporate dual-heading capture and the scoped purity scan; TC-013/014/015 added for heading invariants and manifest schema.
- **Architecture / Decision Records** — ADR-007 added.
- **Architecture / Tradeoffs** — added rows for module location, header tolerance strategy, heading persistence form, and synthetic-segment marker.
- **Architecture / Dependencies on `domain-model`** — expanded from 3 changes to 8.
- **Architecture / Downstream Consumer Contract** — new subsection documenting RN-012.
- **Service Integrations diagram** — updated to show `claude-extraction` filtering `is_synthetic=false AND categoria!=general`.
- **Revision Log** — entry added for this edit.

### Impact on memory
- New repo-wide convention to capture: `lib/` vs `src/services/` distinction. Pure utilities (no global config coupling, dependencies passed as parameters) live under `lib/`; stateful or I/O-coupled services that own dependency wiring live under `src/services/`. This applies to ingestion, semáforo aggregation, Zod schemas, domain helpers (lib) versus Supabase client factories, realtime subscription managers, anything reading from `process.env` or holding long-lived connections (src/services). Promote via `/nybo-curate conventions add` when the second feature lands.
- New convention candidate: **dual-form persistence with explicit intent flag**. When data has a "raw" and "normalized" form, persist both and add an explicit boolean for the synthesis/intent semantics rather than inferring from NULL-ness. Pattern reusable for future heuristic-classification features. Promote via `/nybo-curate extract` after first ship.
- ADR-007 establishes a corpus-growth quality gate tied to product milestones, not just CI. Future features that depend on labeled data corpora should consider analogous milestone-gated growth plans.

---

## Delta 2026-04-26 — edit | propagate Documento → Pliego rename from domain-model rev 3

**Mode:** edit
**Rationale:** [domain-model revision 3](../domain-model/spec/spec.md) renamed `Documento` → `Pliego`, restricted `pliego_tipo` to `pliego_condiciones`/`pliego_definitivo`, and added the sibling `AnexoProceso` entity. This is a propagation edit only — no functional changes to pdf-ingestion's pure-function contract, NFD strategy, error hierarchy, or quality gates. Narrative references that pointed at the old `Documento` name are retargeted at `Pliego`; cache-key and FK terminology updated accordingly. New v1 scope subsection makes the Pliego-only routing decision explicit; new Upstream Caller Contract subsection assigns the entity-typed routing decision to the orchestrator (preserving pdf-ingestion's pure-function contract).
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T1 (Types and Errors):** `Segment` shape Omit list now references `pliego_id` (was `documento_id`). Reflects the FK rename in domain-model rev 3. Dependencies note expanded to confirm both rev 2 and rev 3 must ship before T1.
- **T6 (Corpus + Tests):** `corpus.yaml` manifest gains a required `tipo` field (must be a valid `pliego_tipo` enum value — `pliego_condiciones` or `pliego_definitivo`). Corpus is explicitly Pliego-only; AnexoProceso fixtures are out of scope for v1.
- **T2/T3/T4/T5:** narrative-only — references to "Documento" → "Pliego" where the referenced concept is a pliego.

### Tasks removed
- None.

### Spec sections modified
- **Intention** — references `Pliego` row instead of `Documento`. New v1 Scope subsection (in: Pliego; out: AnexoProceso).
- **REQ-012** — clarifies `Segment` persistence-side FK is `pliego_id`; mentions `Pliego`/`PliegoTipo` types.
- **Architecture / Dependencies on `domain-model`** — T0 prerequisite block expanded from 8 to 11 items; items 9–11 cover the rename, AnexoProceso definition, and narrow `pliego_tipo` enum.
- **Architecture / Downstream Consumer Contract** — clarifies extraction operates over `Pliego[]` (v1 always passes exactly one Pliego).
- **Architecture / Upstream Caller Contract** (NEW subsection) — orchestrator MUST gate AnexoProceso uploads from `parsePliegoPdf`. The function itself is entity-agnostic at the signature; concentrating the entity-typed decision in the orchestrator preserves the pure-function contract.
- **Architecture / Service Integrations diagram** — Caller label notes "Pliego only — gates AnexoProceso"; persistence FK label clarified as `pliego_id`; new dotted edge for AnexoProceso storage path (not parsed).
- **Architecture / Tradeoffs** — new row "v1 entity scope — Pliego only, AnexoProceso deferred to v1.1+".
- **Use Cases (UC-01)** — preconditions clarified; cache + FK references updated.
- **Cache key terminology** — `(documento_hash, empresa_id)` → `(pliego_hash, empresa_id)`.
- **Revision Log** — entry added for revision 2.

### What's NOT changed
- Function signature `parsePliegoPdf(buffer: Buffer): Promise<Segment[]>` — unchanged.
- NFR-03 (purity scoping `lib/ingestion/**`) — unchanged.
- NFD normalization formula (REQ-005, RN-005) — unchanged.
- ADR-007 corpus growth gates — unchanged.
- Heading column strategy + `is_synthetic` + CHECK constraints — unchanged at the pdf-ingestion side; see domain-model rev 3 for the Pliego-side rename.
- 4-class error hierarchy — unchanged.
- T2/T3 parallelism after T1 — unchanged.

### Impact on memory
- **Pattern recognition (cross-feature):** propagation edits are now an established pattern in this project. When an entity rename ships in `domain-model`, every downstream spec that references it gets a follow-up narrative-only edit in the same session, tracked in its own deltas.md. The protocol is: (1) edit domain-model with the rename + revision log entry, (2) flag downstream impact in domain-model's deltas.md "Cross-spec coupling" note, (3) immediately edit each downstream spec with a propagation-only revision and link back to the domain-model rev. Worth promoting via `/nybo-curate conventions add` once a third feature ships and gets propagation-edited.
- **Cross-spec coupling note (resolved):** the pdf-ingestion ↔ domain-model coupling flagged in domain-model rev 3's deltas is now resolved by this edit. Future references to Documento/Pliego should use Pliego throughout.
- **Convention candidate:** "the function name is contract — not entity name." `parsePliegoPdf` was always correctly named for user vocabulary even when the schema entity was misnamed `Documento`. This is a useful reminder: function/skill names should match user vocabulary, not internal schema names; if they diverge, rename the schema (as we did) rather than the function.

---

## Delta 2026-04-27 — edit | Add process.env + @anthropic-ai/sdk to NFR-03 grep; converge logger detection to enumeration; fix residual claude-extraction → requisitos-extraction stale references; fix three Documento leftovers

**Mode:** edit
**Rationale:** The architectural-guardrails audit (2026-04-27) flagged that pdf-ingestion's purity grep was missing `process.env.*` (parity gap with `requisitos-extraction REQ-017` and `semaforo-aggregation REQ-013`) and that the logger detection used a regex (`/log(ger)?/i`) while the other two specs enumerate. The vocabulary-consistency audit (2026-04-27) flagged residual `claude-extraction` references in narrative + Mermaid diagram and three `Documento` leftovers (RN-001 cache key, RN-008 redefine list, Tradeoffs row). Bundling the closure of both gaps in one revision keeps the test artifact regen (purity grep + golden corpus untouched) atomic.
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T5 (Public API + Purity Scan):** Forbidden-imports list extended — adds `process\.env\.[A-Z_]+` regex (closes the parity gap with the other two `lib/` specs), adds `@anthropic-ai/sdk` (defensive; pdf-ingestion has no LLM use case today, but this prevents future contributors from experimenting with LLM-based segmentation), converges logger detection from regex (`/log(ger)?/i`) to enumeration (`pino`, `winston`, `bunyan`, `@logtape/`, plus an "in-house logger module" placeholder list). The enumeration matches `requisitos-extraction REQ-017` and `semaforo-aggregation REQ-013` for cross-spec parity.

### Tasks removed
- None.

### Spec sections modified
- **NFR-03**: rewrote to include `@anthropic-ai/sdk`, `process.env.[A-Z_]+`, the enumerated logger list, and `node:fs/promises` + `node:https`; cross-references requisitos-extraction REQ-017 and semaforo-aggregation REQ-013 for parity.
- **RN-001**: `documento.file_hash` → `pliego.file_hash` (Documento leftover from rev 2).
- **RN-008**: redefine prohibition list `Segmento, Documento, SegmentoCategoria` → `Segmento, Pliego, SegmentoCategoria`.
- **RN-012**: downstream consumer name `claude-extraction` → `requisitos-extraction` (with link to that spec).
- **§293 narrative paragraph**: same rename.
- **§311 Mermaid diagram label**: `Extraction["claude-extraction\n(future spec)"]` → `Extraction["requisitos-extraction"]`.
- **Tradeoffs row "Purity boundary"**: `documento-keyed caching` → `pliego-keyed caching`.
- **Contract.md "Scoped purity scan" behavior**: forbidden-imports list updated to match NFR-03.
- **feat/00-overview.md**: line 9 "bound Claude cost" → "bound LLM cost"; line 13 `claude-extraction` → `requisitos-extraction`.
- **spec/use-cases.md UC-03 step 5**: `claude-extraction` → `requisitos-extraction`.
- **feat/10-verify.md T1 test scenario**: `Omit<SegmentoInsert, 'id'|'documento_id'|...>` → `'pliego_id'` (Documento leftover from rev 2).
- **Revision Log**: entry added for revision 3.

### Impact on memory
- **Convention candidate:** **Cross-spec purity-grep parity.** The three `lib/` specs (pdf-ingestion, requisitos-extraction, semaforo-aggregation) now share a converged forbidden-imports list. Differences are only contextual exceptions (`@anthropic-ai/sdk` allowed under `lib/extraction/anthropic/**`). When a fourth `lib/` spec is added, the same list applies by default. Worth documenting in `.nybo/foundation/conventions.yaml` via `/nybo-curate conventions add` once the convention has stabilized across two revisions.
- **Pattern reinforcement:** **Enumerated forbidden-imports list, not regex-based.** Regex-based detection (e.g., `/log(ger)?/i`) over-matches identifiers like `logarithm`/`epilog`. Enumeration is more precise; new modules are added by extending the list, not by tweaking a regex. Pattern echoes requisitos-extraction REQ-017 and semaforo-aggregation REQ-013.
- **Cross-spec coupling note (resolved):** The vocabulary-consistency audit's flagged stale references to `claude-extraction` are now closed across all four approved specs. The dead name no longer appears in any forward-looking reference; only historical changelog/delta entries retain it (intentionally, to record what was renamed).
