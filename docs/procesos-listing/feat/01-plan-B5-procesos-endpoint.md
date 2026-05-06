# B5: `/api/procesos` Endpoint

## Scope

- `src/app/api/procesos/route.ts` — GET handler (listing)
- `src/app/api/procesos/[numero_proceso]/route.ts` — GET handler (direct lookup)
- `src/types/domain/procesos.ts` — frozen TypeScript types (create or extend)

## Code Paths

### Path A: Vector Search (q non-empty)

1. Embed `q` via OpenAI `text-embedding-3-small`
2. Write `logEmbeddingEvent({ use_case: 'search_query', company_id, input_tokens, cost_usd })`
3. Run pgvector query: `SELECT *, 1 - (embedding <=> $queryVector) AS match_score FROM procesos_index WHERE <structural_filters> ORDER BY match_score DESC LIMIT $page_size OFFSET $offset`
4. Rows without `embedding` (un-embedded) excluded via `WHERE embedding IS NOT NULL`

### Path B: Structural Search (q absent)

1. Plain SQL with `WHERE` clauses for each active filter
2. `match_score = null` on all result rows
3. No OpenAI call

### Profile-Match Toggle

When `profile_match=true`:
1. Read `company_profiles` row for authenticated user's company
2. Extract from `alcance_comercial` JSONB: `unspsc[]`, `cuantia_min`, `cuantia_max`, `ciudad[]`
3. Apply as additional WHERE filters on top of explicit query params (intersection, not union)
4. If `company_profiles` row not found: proceed without profile filters (return header `X-Profile-Applied: false`)

### Telemetry (both paths)

After query completes, call `TelemetryLogger.logSearchEvent` (fire-and-forget):
```typescript
logSearchEvent({
  company_id,
  query_text: q ?? '',       // truncated to 500 chars
  filters: { modalidad, unspsc, cuantia_min, cuantia_max, ciudad, fecha_cierre_from, fecha_cierre_to, profile_match },
  result_count: data.length,
  clicked_ids: []            // initial insert; updated later by T6 click handler
})
```

### Direct Lookup (`/api/procesos/[numero_proceso]`)

1. Query `procesos_index` by `numero_proceso`
2. If found: return mapped row (no SODA call needed)
3. If not found: call `fetchProcesoByCodigo(numeroProceso)` from B2 (24h server-side TTL via `unstable_cache`)
4. If SODA returns a row: map and return with `proceso_lookup_status: 'unverified'` (not in our index yet)
5. If SODA returns nothing: 404 `{ error: 'not_found' }`

## Response Shape

```typescript
// src/types/domain/procesos.ts
export interface ProcesoListItem {
  numero_proceso: string
  entidad: string
  objeto_a_contratar: string
  modalidad: string
  cuantia_proceso: number | null
  fecha_limite_de_recepcion: string | null
  match_score: number | null
  has_pliego: boolean
  has_analisis: boolean
  last_analisis_id: string | null
  last_sem: 'verde' | 'amarillo' | 'rojo' | null
}

export interface ProcesosResponse {
  data: ProcesoListItem[]
  stats: ProcesosStats
  pagination: { page: number; page_size: number; total: number }
}
```

`has_pliego` and `has_analisis` derived by LEFT JOIN through `pliego_uploads` and `analyses` for the authenticated company.

## Enrichment Join

```sql
SELECT pi.*, 
  (pu.id IS NOT NULL) AS has_pliego,
  (a.id IS NOT NULL) AS has_analisis,
  a.id AS last_analisis_id,
  v.verdict AS last_sem
FROM procesos_index pi
LEFT JOIN pliego_uploads pu ON pu.proceso_id = pi.id AND pu.uploaded_by_company_id = $company_id
LEFT JOIN analyses a ON a.proceso_id = pi.id AND a.company_id = $company_id
  AND a.created_at = (SELECT MAX(created_at) FROM analyses WHERE proceso_id = pi.id AND company_id = $company_id)
LEFT JOIN verdicts v ON v.id = (SELECT id FROM verdicts WHERE requisito_id IN (
  SELECT id FROM requisitos WHERE analysis_id = a.id
) ORDER BY created_at DESC LIMIT 1)
<WHERE filters>
```

## Dependencies

- B4: embeddings must exist in `procesos_index` for vector path to return results
- `TelemetryLogger` from cost-observability
- `company_profiles` table (domain-model-mvp rev 1)

## Done When

- [ ] `GET /api/procesos?q=software` calls OpenAI and returns `match_score` on each row
- [ ] `GET /api/procesos?modalidad=X` returns rows with `match_score=null`; no OpenAI call
- [ ] `GET /api/procesos?profile_match=true` applies profile-derived filters
- [ ] `search_events` row inserted after every request (verified via spy)
- [ ] `embedding_events` row inserted on vector-path requests (verified via spy)
- [ ] `GET /api/procesos/UNKNOWN` returns 404 when not in index and SODA misses
- [ ] `has_pliego` and `has_analisis` correct for authenticated company's rows
- [ ] `NEXT_PUBLIC_` prefix absent from env vars used by this route (server-only)
