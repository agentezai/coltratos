# Verification Plan: procesos-listing

---

## B1: Schema + Env Confirmation

### Verification Scenarios

- `\d procesos_index` confirms columns: `socrata_id text`, `unspsc text[]`, `ciudad text`, `embedded_at timestamptz`
- `process.env.SECOP_SODA_DATASET_ID` non-empty in server context
- `process.env.SECOP_SODA_TOKEN` non-empty in server context
- `process.env.OPENAI_API_KEY` non-empty in server context
- `process.env.CRON_SECRET` non-empty in server context
- `grep -r "SECOP_SODA" .next/static` → 0 matches (env vars absent from bundle)

### Gate Criteria
domain-model-mvp rev 3 confirmed merged; all four env vars set in all environments; no bundle leak.

---

## B2: SODA Client + Mapper

### Verification Scenarios

- `mapSodaRow({ id_proceso: 'CO1.BDOS.X', ... })` → result key `numero_proceso = 'CO1.BDOS.X'`; no `id_proceso` key in output
- `mapSodaRow` with `cuantia_proceso` absent → `cuantia_proceso: null`; no throw
- `mapSodaRow` with invalid date string → returns `null` for that date field; no throw
- `fetchOpenProcesos()` mocked 200 with 3 rows → returns 3 `MappedProceso` objects
- `fetchOpenProcesos()` mocked 503 → throws with status in message
- `buildOpenProcesosQuery()` output contains SODA `$where` filter for open Procesos
- All three modules import only from `lib/secop/` (no `app/` or `components/` imports)

### Gate Criteria
Field mapping verified for all columns in the translation table; client handles non-200; modules are pure lib code.

---

## B3: Cron Sync

### Verification Scenarios

- POST `/api/cron/sync-secop` without `CRON_SECRET` → 401; no DB write
- POST with correct secret and mocked 3-row SODA response → 3 rows in `procesos_index`
- Re-run with same 3 rows → still exactly 3 rows (no duplicates on `numero_proceso`)
- Row with `fecha_limite_de_recepcion` = yesterday → deleted after sync; current rows retained
- `embedding` column value preserved on upsert (not overwritten with NULL)
- `synced_at` updated on every upsert
- SODA failure → 200 response with `{ ok: false, error: '...' }`; no 5xx
- `vercel.json` has `{ path: '/api/cron/sync-secop', schedule: '0 */6 * * *' }`

### Gate Criteria
Auth gate enforced; upsert idempotent; closed Procesos pruned; embedding preserved; no 5xx on SODA failure.

---

## B4: Embeddings

### Verification Scenarios

- `runEmbeddingSync(['id-1'])` with mocked OpenAI → OpenAI called for that ID; `embedding` updated; `embedded_at` set
- Row with `embedded_at` set and unchanged `objeto_a_contratar` → skipped (not passed to OpenAI)
- Row with changed `objeto_a_contratar` → re-embedded
- OpenAI failure for a batch → existing `embedding` and `embedded_at` preserved; error logged; continues
- 150 rows → exactly 2 OpenAI calls (batch size ≤ 100)
- `embedding_events` row inserted per batch: `use_case='sync'`, `company_id=null`, `input_tokens>0`, `cost_usd>0`
- Returns `{ embedded, skipped, failed }` with correct counts

### Gate Criteria
Incremental (stale-only) embedding verified; cost event written; batch size ≤ 100; existing vectors preserved on failure.

---

## B5: `/api/procesos` Endpoint

### Verification Scenarios

- `GET /api/procesos?q=software` → OpenAI called; `match_score` present on each row; results ordered descending by score
- `GET /api/procesos?modalidad=X` → no OpenAI call; `match_score=null` on all rows
- `GET /api/procesos?profile_match=true` → profile-derived UNSPSC/cuantia/ciudad filters applied
- `GET /api/procesos?profile_match=true` with no profile row → returns results without profile filters; `X-Profile-Applied: false` header
- `search_events` inserted on every request (fire-and-forget spy)
- `embedding_events` inserted on vector-path requests only
- `has_pliego=true` for company that uploaded a pliego for that Proceso
- `has_analisis=true` for company that ran an analysis
- `GET /api/procesos/CO1.BDOS.X` found in index → 200 with row
- `GET /api/procesos/UNKNOWN` not in index; SODA miss → 404 `{ error: 'not_found' }`
- No request to `datos.gov.co` from browser dev tools (all SODA calls server-side only)

### Gate Criteria
Both code paths verified; profile-match applies correct filters; enrichment fields correct per company; telemetry written; direct lookup handles both index-hit and SODA-fallback.

---

## T1: Types + Filter State

### Test Scenarios
- `serializeFilters` → `deserializeFilters` round-trip for all field types
- Empty arrays not serialized to URL params
- Multi-value arrays serialized as comma-separated strings (`departamento`, `modalidad`, `unspsc`)
- `deserializeFilters` with empty URLSearchParams returns `DEFAULT_FILTER_STATE`
- `loadPreferences` returns `null` on malformed JSON without throwing
- `savePreferences` writes parseable JSON to localStorage
- `profile_match=false` not serialized to URL; `profile_match=true` serialized as `"1"`
- `unspsc: ['43', '80']` serialized as `unspsc=43,80`
- `cuantia_min=1000000` serialized; `cuantia_min=null` omitted
- `fecha_cierre_from='2026-06-01'` serialized; null omitted
- `isDefaultState(DEFAULT_FILTER_STATE)` returns `true`; any non-default field returns `false`

### Gate Criteria
Round-trip correctness; no empty array/null params; profile_match excluded at false; isDefaultState correct.

---

## T2: Fetch Hook

### Test Scenarios
- `isLoading=true` during fetch; `false` after
- `isPaging=true` on page-change only; `isLoading=false`
- `error` set on non-200; data remains empty
- In-flight request aborted when filters change before response arrives
- `hasFilters=false` with default state; `true` when departamento set
- `data` and `stats` populated correctly from mock response
- `hasVectorSearch=true` when `filters.q` non-empty; `false` when empty
- `searchId` updated after each successful fetch
- `X-Search-Id` header present in every fetch request

### Gate Criteria
Loading state differentiation correct; abort prevents stale render; hasVectorSearch and searchId verified.

---

## T3: Table Redesign

### Test Scenarios
- 10 skeleton rows visible when `isLoading=true`
- `SemPill` rendered when `has_analisis=true`; grey dot when false
- "Pliego" badge: present when `has_pliego=true`
- Match column: visible when `hasVectorSearch=true`; hidden when false
- Row click with `has_analisis=true` navigates to `/dashboard/analisis/${id}`
- Row click without analisis navigates to `/dashboard/upload?procesoId=X`
- Empty state A: "Sin procesos con estos filtros" when filters active
- Empty state B: "Aún no hay procesos sincronizados" when no filters
- `@/lib/mock` not imported in component tree

### Gate Criteria
All badge, nav, match column, and empty state scenarios pass; no mock import.

---

## T4: Filter Bar

### Test Scenarios
- Departamento chip toggle; modalidad multi-select; UNSPSC (8 codes) multi-select
- `profile_match` toggle: on → "Perfil activo" badge; off → badge hidden
- Every filter change includes `page: 1` in the patch
- `fecha_cierre_from/to` date inputs fire correct `onFiltersChange`
- `cuantia_min` blur fires correctly; cleared → `null`
- "Limpiar filtros" calls `onClear`; "Restaurar preferencias" visible when `hasPreferences=true`

### Gate Criteria
Multi-select works for all chip groups; profile_match toggle; page reset; clear/restore correct.

---

## T5: Page Wiring

### Test Scenarios
- Page mount with empty URL → localStorage prefs applied if present
- Filter change → `router.replace` called with serialized params
- Stat cards: values match `query.stats`
- Error state: visible when `query.error` non-null; retry triggers fetch
- Row click: POST fires to `/api/search-events`; navigation proceeds regardless
- Direct ID lookup: valid ID → upload page; 404 → inline error
- Bundle: no reference to `@/lib/mock` in procesos page chunk

### Gate Criteria
URL is source of truth; mock removed; click logging; direct lookup functional.

---

## T6: Click Event Logging

### Test Scenarios
- POST `/api/search-events` with valid payload → 200 `{ ok: true }`; `clicked_ids` updated
- POST without auth → 401
- POST with missing `search_id` → 400
- POST with invalid UUID `search_id` → 400
- Duplicate click → `clicked_ids` contains `numero_proceso` exactly once
- POST failure does not block navigation in client

### Gate Criteria
Auth gate enforced; Zod validation; search_events updated; dedup; POST never blocks navigation.

---

## End-to-End Verification

1. `npm run build` → 0 errors; `@/lib/mock` absent from procesos chunk; env vars absent from bundle
2. Trigger cron manually: POST `/api/cron/sync-secop` with `CRON_SECRET` → `procesos_index` populated
3. Check `embedding_events` table → rows with `use_case='sync'` present
4. Open `/dashboard/procesos` → real SECOP rows visible with entidad, modalidad, cuantia
5. Select "Bolívar" in departamento → URL updates; rows filter; stat cards update
6. Type "software" in search → match_score column appears; rows sorted by relevance
7. Toggle "Coincide con mi perfil" → "Perfil activo" badge; rows re-fetched with profile filters
8. Click a row → POST fires to `/api/search-events`; navigate to upload or analisis
9. Check `search_events` table → row with `query_text`, `result_count`, initial `clicked_ids=[]`
10. Enter known `numero_proceso` in direct lookup → navigates to upload
11. Enter unknown ID → "Proceso no encontrado en SECOP" inline error
12. Network tab: zero requests to `datos.gov.co` from browser

**Gate Criteria:** All 12 steps complete without errors. `procesos-listing` spec shipped.
