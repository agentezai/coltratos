## Delta 2026-05-04 — edit | Discovery scope alignment + cuantia_min/max

**Mode:** edit
**Rationale:** Full discovery feature scope confirmed via 6-pilot interviews. Spec needed alignment with ingesta-secop rev 3 final API contract (which had evolved significantly). User preference: `cuantia_min/max` param names over `valor_min/max` on both sides.
**Affected domains:** contratacion-publica, integrations

### Tasks added
- None (T1–T5 count unchanged)

### Tasks modified
- T1: `ProcesosFilterState` — removed `fase` (pruned by cron, not a UI filter), added `unspsc`, `cuantia_min/max` (renamed from `valor_min/max`), `fecha_cierre_from/to`, `profile_match`; removed `OPEN_FASES` constant; sort enum gains `'relevance'` (renamed `'cuantia_desc'` from `'valor_desc'`)
- T3: `ProcesosTable` — added `hasVectorSearch` prop; added `match_score` chip column (conditional); `onRowClick` callback for click-logging; empty-state B copy updated to "6 horas"
- T4: `ProcesosFilters` — removed `fase` chip group; added UNSPSC multi-select (8 codes), `fecha_cierre_from/to` date range inputs, `profile_match` toggle; `cuantia_min/max` (renamed from `valor_min/max`); sort option `relevance` added

### Tasks removed
- None

### Impact on memory
- Cuantia naming convention (`cuantia_min/max` not `valor_min/max`) should be curated as a project convention — both frontend and backend now use consistent naming

---

## Delta 2026-05-04 — edit | Add semantic search, profile-match, click logging, direct ID lookup

**Mode:** edit
**Rationale:** Discovery interviews confirmed that SECOP portal is the current status quo; pilots need in-product discovery with semantic relevance, profile-aware filtering, and full click telemetry to measure result quality.
**Affected domains:** ui, hooks, api, types

### Tasks added
- T6: Click event logging — `app/api/search-events/route.ts` POST handler + `append_clicked_id` Postgres function

### Tasks modified
- T1: `ProcesosFilterState` — added `isDefaultState()`; `profile_match=false` omitted from URL serialization
- T2: `useProcesosQuery` — added `searchId: string | null`, `hasVectorSearch: boolean`; `X-Search-Id` custom header on every fetch; UUID generated per request, stored in state after success
- T3: `ProcesosTable` — added `hasVectorSearch` prop + conditional match_score column with percentage chip; added `onRowClick(row, position)` prop wired from parent
- T4: `ProcesosFilters` — added "Relevancia" sort option independent of `q`; profile_match toggle shows/hides "Perfil activo" badge
- T5: `ProcesosPageClient` — added `handleRowClick` with fire-and-forget POST to `/api/search-events`; added `DirectProcesoLookup` component with 404 inline error; wired `hasVectorSearch` + `onRowClick` to `ProcesosTable`

### Tasks removed
- None

### Impact on memory
- None identified — no curated conventions were invalidated by this change

---

## Delta 2026-05-05 — edit | Rev 3: Merge ingesta-secop; full-stack spec; domain-model-mvp rev 3 dependency

**Mode:** edit
**Rationale:** ingesta-secop was a separate spec covering SODA sync, embedding, and the `/api/procesos` endpoint. After review, both specs share the same execution context (same codebase, same DB, same telemetry tables). Merging eliminates coordination overhead and makes procesos-listing a complete vertical slice: from SODA ingestion to frontend display. ingesta-secop is archived; its tasks become B1–B5 in procesos-listing.

Schema authority clarified: `procesos_index` additions (`socrata_id`, `unspsc`, `ciudad`, `embedded_at`) land in domain-model-mvp rev 3, not in a procesos-listing migration. This matches the pattern established by cost-observability ↔ domain-model-mvp rev 2.

Telemetry verification: `search_events` and `embedding_events` columns from domain-model-mvp rev 2 cover all B5/B4 needs. No additions to those tables required.

`numero_proceso` confirmed as canonical field name. SODA's `id_proceso` → `numero_proceso` translation happens exclusively in `lib/secop/mapper.ts`.

**Affected domains:** contratacion-publica, integrations, database

### Tasks added
- **B1** — Schema + Env Confirmation: gate on domain-model-mvp rev 3 merge; set env vars; no migration SQL authored
- **B2** — SODA Client + Mapper: `lib/secop/client.ts`, `lib/secop/mapper.ts` (field translation), `lib/secop/soql.ts`
- **B3** — Cron Sync: `src/app/api/cron/sync-secop/route.ts`; `vercel.json` cron entry every 6h; upsert + prune logic
- **B4** — Embeddings: `lib/secop/embeddings.ts`; stale-row detection via `embedded_at`; batch OpenAI calls; `embedding_events` written per batch
- **B5** — Procesos Endpoint: `src/app/api/procesos/route.ts` (vector + structural paths; profile-match; telemetry); direct lookup route; `src/types/domain/procesos.ts`

### Tasks modified
- spec.md — full rewrite: Intention now full-stack; Dependencies updated to domain-model-mvp rev 3; Architecture adds system diagram; Data Model Changes section added; field-name translation table; Risk Register added; Pre-Approval Gate updated
- use-cases.md — extended with UC-04 (cron sync), UC-05 (embedding sync), UC-06 (cost logging), UC-07 (profile-match), UC-08 (direct lookup)
- contracts.md — extended with B1–B5 TDD contracts
- 00-overview.md — rewritten with full system diagram and B1–B5 in task index
- 10-verify.md — extended with B1–B5 verification scenarios
- 99-progress.md — B1–B5 entries prepended
- status.yaml — set to draft; revision_count 3; updated_at 2026-05-05; approved_at removed

### Tasks removed
- None from T1–T6 (all frontend tasks preserved unchanged)

### Impact on memory
- **contratacion-publica domain** — `numero_proceso` as the canonical field and `id_proceso` → `numero_proceso` as a mapper-only translation should be curated as a convention
- **integrations domain** — the pattern of `procesos_index` extensions landing in domain-model-mvp (not in the consuming feature's migration) should be documented as the schema-authority pattern for discovery features
- **database domain** — `embedded_at` as the incremental-embedding sentinel (embed only when NULL or object changed) is a reusable pattern
