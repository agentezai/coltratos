# P4: /api/procesos Endpoint

## Scope

- `app/api/procesos/route.ts` — GET handler: two search paths (vector + structural), profile-match, search logging, enrichment, stats, pagination
- `app/api/procesos/[id]/route.ts` — GET handler: direct Proceso ID lookup via SODA fallback
- `src/types/domain/procesos.ts` — frozen contract types + Zod query schema
- `src/__tests__/procesos-endpoint.test.ts` — unit tests

## Changes

### Query param Zod schema

```ts
const csv = z.string().transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))

const ProcesosQuerySchema = z.object({
  departamento:     csv.optional(),
  ciudad:           z.string().optional(),
  modalidad:        csv.optional(),
  unspsc:           csv.optional(),
  cuantia_min:      z.coerce.number().positive().optional(),
  cuantia_max:      z.coerce.number().positive().optional(),
  fecha_cierre_from: z.string().optional(),   // ISO date string
  fecha_cierre_to:  z.string().optional(),    // ISO date string
  q:                z.string().optional(),
  profile_match:    z.coerce.boolean().default(false),
  sort:             z.enum(['recent', 'closing_soon', 'valor_desc', 'relevance']).default('recent'),
  page:             z.coerce.number().int().positive().default(1),
  page_size:        z.coerce.number().int().min(1).max(100).default(20),
})
```

Return 400 with Zod error message on parse failure.

### Auth + empresa_id extraction

```ts
const { data: { user } } = await supabaseUser.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const { data: member } = await supabase
  .from('empresa_member')
  .select('empresa_id')
  .eq('user_id', user.id)
  .single()
if (!member) return NextResponse.json({ error: 'No empresa' }, { status: 403 })
const empresaId = member.empresa_id
```

### Profile-match filter derivation

When `profile_match=true`, read `company_profiles` for `empresaId` and add structural constraints:

```ts
if (params.profile_match) {
  const { data: profile } = await supabase
    .from('company_profiles')
    .select('alcance_comercial')
    .eq('empresa_id', empresaId)
    .single()

  const ac = profile?.alcance_comercial
  if (ac?.unspsc?.length)      params.unspsc = [...(params.unspsc ?? []), ...ac.unspsc]
  if (ac?.valor_max)           params.cuantia_max = Math.min(params.cuantia_max ?? Infinity, ac.valor_max)
  if (ac?.departamentos?.length) params.departamento = [...(params.departamento ?? []), ...ac.departamentos]
}
```

No error if profile is incomplete — sub-filters are applied only if the profile field is non-null/non-empty.

### Two search paths

**Structural path (no `q`):**

```ts
let query = supabaseService
  .from('secop_procesos')
  .select(`id_proceso, entidad, departamento, ciudad, nombre, descripcion,
           modalidad, unspsc, cuantia, cuantia_disponible,
           fecha_publicacion, fecha_cierre, url_secop`, { count: 'exact' })

if (params.departamento?.length) query = query.in('departamento', params.departamento)
if (params.modalidad?.length)    query = query.in('modalidad', params.modalidad)
if (params.unspsc?.length)       query = query.in('unspsc', params.unspsc)
if (params.ciudad)               query = query.eq('ciudad', params.ciudad)
if (params.cuantia_min)          query = query.gte('cuantia', params.cuantia_min).eq('cuantia_disponible', true)
if (params.cuantia_max)          query = query.lte('cuantia', params.cuantia_max).eq('cuantia_disponible', true)
if (params.fecha_cierre_from)    query = query.gte('fecha_cierre', params.fecha_cierre_from)
if (params.fecha_cierre_to)      query = query.lte('fecha_cierre', params.fecha_cierre_to)

// sort
switch (params.sort) {
  case 'recent':       query = query.order('fecha_publicacion', { ascending: false }); break
  case 'closing_soon': query = query.gt('fecha_cierre', new Date().toISOString())
                               .order('fecha_cierre', { ascending: true }); break
  case 'valor_desc':   query = query.order('cuantia', { ascending: false, nullsFirst: false }); break
  // 'relevance' without q falls back to 'recent'
  default:             query = query.order('fecha_publicacion', { ascending: false }); break
}

const offset = (params.page - 1) * params.page_size
query = query.range(offset, offset + params.page_size - 1)

const { data: rows, count } = await query
// match_score = null for all rows
```

**Vector search path (with `q`):**

```ts
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
const embedRes = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: params.q,
})
const queryVector = embedRes.data[0].embedding  // number[]

// Build filter conditions for RPC
const filterConditions = buildFilterConditions(params)  // SQL WHERE fragment

// Use Supabase RPC with pgvector cosine similarity
const { data: rows } = await supabaseService.rpc('search_procesos_semantic', {
  query_embedding: queryVector,
  filter_departamento: params.departamento ?? null,
  filter_modalidad:    params.modalidad    ?? null,
  filter_unspsc:       params.unspsc       ?? null,
  filter_ciudad:       params.ciudad       ?? null,
  filter_cuantia_min:  params.cuantia_min  ?? null,
  filter_cuantia_max:  params.cuantia_max  ?? null,
  filter_fecha_from:   params.fecha_cierre_from ?? null,
  filter_fecha_to:     params.fecha_cierre_to   ?? null,
  p_page:              params.page,
  p_page_size:         params.page_size,
})
// rows include match_score: number
```

**`search_procesos_semantic` Postgres function (in P1 migration):**

```sql
create or replace function search_procesos_semantic(
  query_embedding      vector(1536),
  filter_departamento  text[]       default null,
  filter_modalidad     text[]       default null,
  filter_unspsc        text[]       default null,
  filter_ciudad        text         default null,
  filter_cuantia_min   numeric      default null,
  filter_cuantia_max   numeric      default null,
  filter_fecha_from    text         default null,
  filter_fecha_to      text         default null,
  p_page               int          default 1,
  p_page_size          int          default 20
)
returns table (
  id_proceso text, entidad text, departamento text, ciudad text,
  nombre text, descripcion text, modalidad text, unspsc text,
  cuantia numeric, cuantia_disponible boolean,
  fecha_publicacion timestamptz, fecha_cierre timestamptz,
  url_secop text, match_score float
)
language sql stable as $$
  select
    id_proceso, entidad, departamento, ciudad, nombre, descripcion,
    modalidad, unspsc, cuantia, cuantia_disponible,
    fecha_publicacion, fecha_cierre, url_secop,
    1 - (embedding <=> query_embedding) as match_score
  from secop_procesos
  where
    embedding is not null
    and (filter_departamento is null or departamento = any(filter_departamento))
    and (filter_modalidad    is null or modalidad    = any(filter_modalidad))
    and (filter_unspsc       is null or unspsc       = any(filter_unspsc))
    and (filter_ciudad       is null or ciudad        = filter_ciudad)
    and (filter_cuantia_min  is null or (cuantia >= filter_cuantia_min and cuantia_disponible))
    and (filter_cuantia_max  is null or (cuantia <= filter_cuantia_max and cuantia_disponible))
    and (filter_fecha_from   is null or fecha_cierre >= filter_fecha_from::timestamptz)
    and (filter_fecha_to     is null or fecha_cierre <= filter_fecha_to::timestamptz)
  order by match_score desc
  limit p_page_size
  offset (p_page - 1) * p_page_size
$$;
```

Add this function to the P1 migration SQL file.

### Empresa enrichment

After fetching the page of rows (both paths):

```ts
const idProcesos = rows.map((r) => r.id_proceso)

const { data: enrichRows } = await supabaseService.rpc('get_empresa_enrichment', {
  p_empresa_id: empresaId,
  p_id_procesos: idProcesos,
})

const enrichMap = new Map(enrichRows?.map((r) => [r.id_proceso, r]) ?? [])
```

### Filter-aware stats query

Runs in parallel with main query (same filter predicates, no pagination, no sort):

```ts
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

let statsQuery = supabaseService
  .from('secop_procesos')
  .select('fecha_cierre, cuantia, cuantia_disponible')

// Apply same structural filter chain
// ...

const { data: allRows } = await statsQuery

const stats: ProcesosStats = {
  total_abiertos:      allRows?.length ?? 0,
  cierran_esta_semana: allRows?.filter((r) =>
    r.fecha_cierre &&
    r.fecha_cierre > new Date().toISOString() &&
    r.fecha_cierre <= nextWeek
  ).length ?? 0,
  cuantia_total: allRows?.filter((r) => r.cuantia_disponible)
    .reduce((sum, r) => sum + (r.cuantia ?? 0), 0) ?? 0,
}
```

### Search request logging

After response is ready, fire-and-forget INSERT into `search_log`:

```ts
supabaseService.from('search_log').insert({
  company_id:    empresaId,
  query:         params.q ?? null,
  filter_object: omit(params, ['q', 'page', 'page_size', 'sort']),
  result_count:  count ?? rows.length,
  result_ids:    rows.map((r) => r.id_proceso),
}).then(() => {}).catch(() => {})  // best-effort; never block response
```

### Response construction

```ts
const data = rows.map((r) => {
  const enrich = enrichMap.get(r.id_proceso)
  return {
    ...r,
    has_pliego:       enrich?.has_pliego      ?? false,
    has_analisis:     enrich?.has_analisis    ?? false,
    last_sem:         enrich?.last_sem        ?? null,
    last_analisis_id: enrich?.last_analisis_id ?? null,
    match_score:      (r as any).match_score   ?? null,
  }
})

return NextResponse.json({ data, pagination: { ... }, stats }, {
  headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
})
```

### Direct lookup endpoint (`/api/procesos/[id]`)

```ts
export async function GET(req: NextRequest, { params: { id } }: { params: { id: string } }) {
  // Auth gate (same as main endpoint)
  // Try local index first
  const { data: local } = await supabaseService.from('secop_procesos').select('*').eq('id_proceso', id).single()
  if (local) return NextResponse.json(local)

  // Fallback: call SODA for this specific proceso
  const sodaRow = await fetchSodaById(id)  // in lib/secop/client.ts
  if (!sodaRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sodaRow)
}
```

### Shared types (`src/types/domain/procesos.ts`)

```ts
export interface ProcesoListItem {
  id_proceso: string
  entidad: string
  departamento: string | null
  ciudad: string | null
  nombre: string | null
  descripcion: string | null
  modalidad: string | null
  unspsc: string | null
  cuantia: number | null
  cuantia_disponible: boolean
  fecha_publicacion: string | null
  fecha_cierre: string | null
  url_secop: string | null
  has_pliego: boolean
  has_analisis: boolean
  last_sem: 'verde' | 'amarillo' | 'rojo' | null
  last_analisis_id: string | null
  match_score: number | null  // cosine similarity 0-1; null when no q
}

export interface ProcesosStats {
  total_abiertos: number
  cierran_esta_semana: number
  cuantia_total: number
}

export interface ProcesosResponse {
  data: ProcesoListItem[]
  pagination: { page: number; page_size: number; total: number; total_pages: number }
  stats: ProcesosStats
}

export interface SearchLogEntry {
  id: string
  company_id: string
  query?: string | null
  filter_object: Record<string, unknown>
  result_count: number
  result_ids: string[]
  clicked_ids: string[]
  created_at: string
}
```

This file is the **frozen contract** — do not modify the shape without updating both `ingesta-secop` and `procesos-listing` specs.

## Dependencies

Requires P1 (tables + functions). P5 (embeddings) must be merged before the vector search path is testable end-to-end; the structural path can be implemented independently.

## Done When

- [ ] GET with no filters returns 20 rows ordered by `fecha_publicacion desc`; `match_score=null`
- [ ] Multi-value `departamento=Bolívar,Cundinamarca` returns rows from both
- [ ] `modalidad=Mínima+cuantía,Licitación+pública` filters correctly
- [ ] `unspsc=43232300,72000000` filters by UNSPSC multi-value
- [ ] `cuantia_min=10000000&cuantia_max=500000000` returns only cuantia_disponible rows in range
- [ ] `fecha_cierre_from=2026-06-01&fecha_cierre_to=2026-08-31` date range filter works
- [ ] `q=software gestión` → OpenAI called once; rows have `match_score` float; ordered descending
- [ ] `q=...` with no embedded rows → returns empty data (not an error)
- [ ] `profile_match=true` → UNSPSC/valor/departamento from company_profiles applied
- [ ] `sort=closing_soon` excludes past `fecha_cierre`, orders ascending
- [ ] `page_size=101` returns 400
- [ ] Enrichment: empresa with pliego + analisis → `has_pliego=true`, `last_sem` set
- [ ] Enrichment: empresa with no interaction → all null/false
- [ ] Enrichment: empresa A cannot see empresa B enrichment for same proceso
- [ ] `stats.cierran_esta_semana` changes when `departamento` filter applied
- [ ] `search_log` row created on each 200 response
- [ ] Direct lookup `GET /api/procesos/CO1.BDOS.X` → returns row from index or SODA fallback
- [ ] Response `Cache-Control` is `private` not `public`
- [ ] Unauthenticated request → 401
- [ ] `npm run build` no type errors; `npm run test` passes
