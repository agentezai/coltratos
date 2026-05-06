# procesos-listing — Software Design Document

## Intention

Full-stack feature delivering SECOP II Proceso discovery inside COLTRATOS. Covers: a 6-hour SODA bulk-sync cron job into `procesos_index`, OpenAI embedding of `objeto_a_contratar`, a `/api/procesos` endpoint serving vector + structural search, and a `/dashboard/procesos` frontend with semantic match scores, profile-match toggle, URL-persistent filters, and click telemetry. Discovery is the product entry point — pilots find matching Procesos here before uploading any Pliego.

---

## Depends On

- **domain-model-mvp rev 3** (upstream, must merge first): adds `socrata_id`, `unspsc`, `ciudad`, `embedded_at` columns to `procesos_index`; confirms no new columns needed on `search_events` or `embedding_events` (all required fields exist from rev 2). Procesos-listing carries NO migration SQL — schema authority lives in `domain-model-mvp`.
- `company_profiles` table (from domain-model-mvp rev 1): read by the profile-match path.
- `search_events`, `embedding_events` tables (from domain-model-mvp rev 2): written by B5 and B4 respectively.
- `OPENAI_API_KEY`, `SECOP_SODA_DATASET_ID`, `SECOP_SODA_TOKEN` env vars set in all environments.

## Out of Scope

- Semáforo live-calculation for unanalyzed Procesos
- UNSPSC autocomplete (multi-select with fixed list only)
- Watchlists, saved searches, email alerts — v2
- empresa profile filter prefs stored in DB — MVP uses localStorage

---

## Use Cases

Detailed scenarios in [use-cases.md](./use-cases.md).

| Use Case | Description |
|----------|-------------|
| UC-01 — Personalized listing on first visit | User sees real SECOP rows; localStorage defaults applied |
| UC-02 — Multi-filter | departamento, modalidad, UNSPSC, cuantia, fecha_cierre |
| UC-03 — Semantic keyword search | Free-text embeds → pgvector cosine; match_score per row |
| UC-04 — Cron bulk sync | Job fetches open Procesos from SODA every 6 h; upserts into `procesos_index`; prunes closed |
| UC-05 — Embedding sync | Embeds new/changed `objeto_a_contratar` rows; writes cost to `embedding_events` |
| UC-06 — Cost logging | Every embedding and search event written to telemetry tables |
| UC-07 — Profile-match toggle | API derives UNSPSC/valor/ciudad filters from `company_profiles.alcance_comercial` |
| UC-08 — Direct Proceso ID lookup | User enters `numero_proceso`; fallback to SODA for Procesos not in index |

---

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| REQ-001 | SODA client fetches open Procesos (field `estado = abierto`) from datos.gov.co using dataset `SECOP_SODA_DATASET_ID`. SODA field `id_proceso` maps to `numero_proceso` in `procesos_index` (mapping in `lib/secop/mapper.ts`). |
| REQ-002 | Cron route (`/api/cron/sync-secop`) runs every 6 h. Upserts on `numero_proceso`; prunes rows where `fecha_limite_de_recepcion` < now(); enqueues changed rows for B4. |
| REQ-003 | Embedding job embeds only rows where `embedded_at IS NULL` or `objeto_a_contratar` changed since `embedded_at`. Model: OpenAI `text-embedding-3-small` (1536-dim). Writes cost to `embedding_events` with `use_case='sync'`, `company_id=null`. |
| REQ-004 | `GET /api/procesos` supports two code paths: (a) free-text: embed query → pgvector `<=>` cosine + structural filters; (b) structural-only: plain SQL with `WHERE` clauses. Writes to `search_events` on every request. |
| REQ-005 | Profile-match toggle: when `profile_match=true`, API reads `company_profiles.alcance_comercial` and derives UNSPSC, cuantia_min/max, and ciudad filters. |
| REQ-006 | `GET /api/procesos/[numero_proceso]` — direct lookup. Returns from `procesos_index` if present; falls back to SODA single-record lookup (24h server-side TTL). Never blocks: 404 or unverified returned on miss. |
| REQ-007–025 | Frontend requirements unchanged from rev 2 (filter state, URL params, stat cards, table, badges, match score, click logging, empty/error states). See previous REQ-007–025 for full list. |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Structural search p95 < 500ms; vector search p95 < 800ms |
| NFR-02 | Cost | Embedding cost written to `embedding_events` per batch; included in cost-observability dashboard |
| NFR-03 | Security | `OPENAI_API_KEY`, `SECOP_SODA_TOKEN`, `CRON_SECRET` absent from `.next/static` bundle |
| NFR-04 | Correctness | `datos.gov.co` never called from browser; SECOP II never scraped |
| NFR-05 | Idempotency | Cron upsert on `numero_proceso` — re-runs are safe; no duplicate rows |

### Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | `numero_proceso` is canonical — SODA's `id_proceso` maps to it at ingestion in `mapper.ts`. No other layer performs this translation. |
| RN-002 | Sem indicator only shown when `has_analisis=true`; never infer verdict from SECOP data. |
| RN-003 | Filter state serialized as URL params; URL is single source of truth for active filters. |
| RN-004 | Profile-match toggle defaults to off in MVP. |
| RN-005 | Click event logging is best-effort; POST failure must not block navigation. |
| RN-006 | Cron route protected by `CRON_SECRET` header check; returns 401 on mismatch. |
| RN-007 | `search_events` and `embedding_events` written via service-role key (TelemetryLogger fire-and-forget). Write failure never surfaces to caller. |

---

## Architecture

### System Diagram

```mermaid
flowchart LR
    SODA["datos.gov.co\nSODA API"]
    Cron["Cron job\n/api/cron/sync-secop\n(every 6h)"]
    EmbedJob["Embedding job\nlib/secop/embeddings.ts"]
    OpenAI["OpenAI\ntext-embedding-3-small"]
    PIndex[("procesos_index\n(pgvector)")]
    Endpoint["GET /api/procesos\n(vector or SQL)"]
    Frontend["ProcesosPageClient\n/dashboard/procesos"]
    TelDB[("search_events\nembedding_events")]
    CompanyProfiles[("company_profiles")]

    SODA -->|bulk fetch / single lookup| Cron
    Cron -->|upsert + prune| PIndex
    Cron -->|enqueue changed rows| EmbedJob
    EmbedJob -->|embed objeto_a_contratar| OpenAI
    OpenAI -->|vector(1536)| EmbedJob
    EmbedJob -->|UPDATE embedding, embedded_at| PIndex
    EmbedJob -->|logEmbeddingEvent| TelDB
    Frontend -->|GET /api/procesos| Endpoint
    CompanyProfiles -->|profile-match filters| Endpoint
    Endpoint -->|pgvector OR SQL query| PIndex
    Endpoint -->|logSearchEvent| TelDB
    Endpoint -->|ProcesosResponse + match_score| Frontend
```

### Frontend Data Flow

URL → `useProcesosQuery` → `GET /api/procesos` → table + stat cards. Click → fire-and-forget POST `/api/search-events`. Profile-match toggle → `profile_match=true` query param → API reads `company_profiles`.

---

## Data Model Changes

**No migration SQL in this spec.** All schema additions land in **domain-model-mvp rev 3**:

| Column | Table | Type | Notes |
|--------|-------|------|-------|
| `socrata_id` | `procesos_index` | `text` | SODA's internal row identifier; enables incremental sync |
| `unspsc` | `procesos_index` | `text[]` | UNSPSC codes parsed from SODA response |
| `ciudad` | `procesos_index` | `text` | Municipio/ciudad from SODA `entidad_municipio` or equivalent field |
| `embedded_at` | `procesos_index` | `timestamptz` | Timestamp of last embedding; used by B4 to detect stale rows |

Existing `search_events` columns (`query_text`, `filters`, `result_count`, `clicked_ids`) from rev 2 cover all B5 telemetry needs — no additions required.

---

## API Contracts

### `GET /api/procesos`

**Request query params:** `q`, `modalidad`, `unspsc`, `cuantia_min`, `cuantia_max`, `ciudad`, `fecha_cierre_from`, `fecha_cierre_to`, `profile_match`, `sort`, `page`, `page_size`

**Response:** `{ data: ProcesoListItem[], stats: ProcesosStats, pagination: Pagination }`

`ProcesoListItem` includes: `numero_proceso`, `entidad`, `objeto_a_contratar`, `modalidad`, `cuantia_proceso`, `fecha_limite_de_recepcion`, `match_score: number | null`, `has_pliego: boolean`, `has_analisis: boolean`, `last_analisis_id: string | null`, `last_sem: string | null`

Full TypeScript types in `src/types/domain/procesos.ts`.

### Field-Name Translation (SODA → `procesos_index`)

Mapping performed exclusively in `lib/secop/mapper.ts`:

| SODA field | `procesos_index` column |
|------------|------------------------|
| `id_proceso` | `numero_proceso` |
| `entidad` | `entidad` |
| `objeto_a_contratar` | `objeto_a_contratar` |
| `modalidad_de_contratacion` | `modalidad` |
| `cuantia_proceso` | `cuantia_proceso` |
| `fecha_de_publicacion_del_proceso` | `fecha_de_publicacion_del_proceso` |
| `fecha_limite_de_recepcion` | `fecha_limite_de_recepcion` |
| `municipio_entidad` (or equivalent) | `ciudad` |

No other layer (cron, endpoint, frontend) performs field-name translation.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| SODA field names change without notice | Pin dataset version; log warnings on unrecognized fields; mapper.ts is the single translation point |
| datos.gov.co lag: new Procesos delayed | Single-record SODA lookup fallback in `/api/procesos/[id]` |
| Embedding cost overrun | Per-batch cost logged to `embedding_events`; cost-observability dashboard alerts on threshold |
| Cron fails silently | `sync_failure_count` metric logged; alert check in cost-observability cron |

---

## Success Criteria

- [ ] `procesos_index` populated with open SECOP II Procesos via cron
- [ ] Embeddings present on all rows; `embedding_events` written per sync batch
- [ ] `/api/procesos` returns real rows with `match_score` on vector path
- [ ] Frontend shows real SECOP rows, stat cards, and match scores
- [ ] Profile-match toggle filters results by company profile
- [ ] Click events written to `search_events` on each row click
- [ ] All filter types functional with URL-persistent state
- [ ] Direct Proceso ID lookup navigates to upload or shows inline error
- [ ] Zero requests to `datos.gov.co` from browser

---

## Pre-Approval Gate

1. Confirm domain-model-mvp rev 3 is merged (check `procesos_index` has `socrata_id`, `unspsc`, `ciudad`, `embedded_at`)
2. Confirm `SECOP_SODA_DATASET_ID` is the correct current dataset ID (verify against datos.gov.co)
3. Confirm env vars set in Vercel project settings and `.env.local`

---

## Revision Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-01 | Initial spec — frontend-only | Procesos listing against ingesta-secop backend |
| 2026-05-04 | Rev 2 — semantic search, profile-match, click logging, cuantia_min/max | Discovery interviews confirmed full scope |
| 2026-05-05 | Rev 3 — full-stack merge, absorbs ingesta-secop | ingesta-secop absorbed; domain-model-mvp rev 3 dependency; B1–B5 backend tasks added; ingesta-secop archived |
