# P4: /api/procesos Endpoint

## Scope

- `app/api/procesos/route.ts` — GET handler: filters, enrichment, stats, pagination, sort
- `src/types/domain/procesos.ts` — `ProcesoListItem`, `ProcesosResponse`, `ProcesosStats` types + Zod query schema
- `src/__tests__/procesos-endpoint.test.ts` — unit tests

## Changes

### Query param Zod schema

```ts
const csv = z.string().transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))

const ProcesosQuerySchema = z.object({
  departamento: csv.optional(),       // multi-value: "Bolívar,Cundinamarca"
  ciudad:       z.string().optional(),
  fase:         csv.optional(),       // multi-value
  modalidad:    csv.optional(),       // multi-value
  unspsc:       z.string().optional(),
  cuantia_min:  z.coerce.number().positive().optional(),
  cuantia_max:  z.coerce.number().positive().optional(),
  q:            z.string().optional(),
  sort:         z.enum(['recent', 'closing_soon', 'cuantia_desc']).default('recent'),
  page:         z.coerce.number().int().positive().default(1),
  page_size:    z.coerce.number().int().min(1).max(100).default(20),
})
```

Return 400 with Zod error message on parse failure (including `page_size > 100`).

### Auth + empresa_id extraction

```ts
const supabaseUser = createServerClient(...)
const { data: { user } } = await supabaseUser.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Resolve empresa_id for the authenticated user
const { data: member } = await supabase
  .from('empresa_member')
  .select('empresa_id')
  .eq('user_id', user.id)
  .single()
if (!member) return NextResponse.json({ error: 'No empresa' }, { status: 403 })
const empresaId = member.empresa_id
```

### Main data query (Supabase JS client)

The main query fetches SECOP data + empresa enrichment. Uses service role client (bypasses RLS) with explicit `empresa_id` parameter to prevent cross-tenant leakage.

```ts
const supabaseService = createServiceRoleClient()

let query = supabaseService
  .from('secop_procesos')
  .select(`
    id_proceso, entidad, departamento, ciudad, nombre, descripcion, fase,
    modalidad, unspsc, cuantia, cuantia_disponible,
    fecha_publicacion, fecha_cierre, url_secop
  `, { count: 'exact' })

// Multi-value filters (comma-separated → array)
if (params.departamento?.length) query = query.in('departamento', params.departamento)
if (params.fase?.length)         query = query.in('fase', params.fase)
if (params.modalidad?.length)    query = query.in('modalidad', params.modalidad)
if (params.ciudad)               query = query.eq('ciudad', params.ciudad)
if (params.unspsc)               query = query.eq('unspsc', params.unspsc)

if (params.cuantia_min) query = query.gte('cuantia', params.cuantia_min).eq('cuantia_disponible', true)
if (params.cuantia_max) query = query.lte('cuantia', params.cuantia_max).eq('cuantia_disponible', true)
if (params.q)           query = query.textSearch('search_vector', params.q, { type: 'websearch', config: 'spanish' })

switch (params.sort) {
  case 'recent':       query = query.order('fecha_publicacion', { ascending: false }); break
  case 'closing_soon': query = query.gt('fecha_cierre', new Date().toISOString())
                               .order('fecha_cierre', { ascending: true, nullsFirst: false }); break
  case 'cuantia_desc': query = query.order('cuantia', { ascending: false, nullsFirst: false }); break
}

const offset = (params.page - 1) * params.page_size
query = query.range(offset, offset + params.page_size - 1)

const { data: rows, count, error } = await query
```

### Empresa enrichment

After fetching the page of rows, enrich with empresa-scoped data in a single batch query. Joins through `proceso` as bridge table (`proceso.secop_process_number = secop_procesos.id_proceso`).

```ts
const idProcesos = rows.map((r) => r.id_proceso)

// One query: latest analisis + pliego presence per proceso for this empresa
const { data: enrichRows } = await supabaseService.rpc('get_empresa_enrichment', {
  p_empresa_id: empresaId,
  p_id_procesos: idProcesos,
})
// Returns: [{ id_proceso, has_pliego, has_analisis, last_sem, last_analisis_id }]

const enrichMap = new Map(enrichRows?.map((r) => [r.id_proceso, r]) ?? [])
```

**Postgres function `get_empresa_enrichment` (to be created in P1 migration):**

```sql
create or replace function get_empresa_enrichment(
  p_empresa_id uuid,
  p_id_procesos text[]
)
returns table (
  id_proceso       text,
  has_pliego       boolean,
  has_analisis     boolean,
  last_sem         text,
  last_analisis_id uuid
)
language sql stable security definer as $$
  select
    sp.id_proceso,
    count(pl.id) > 0                          as has_pliego,
    count(a.id) > 0                           as has_analisis,
    (array_agg(a.semaforo order by a.created_at desc))[1] as last_sem,
    (array_agg(a.id       order by a.created_at desc))[1] as last_analisis_id
  from unnest(p_id_procesos) as sp(id_proceso)
  left join proceso p
    on p.secop_process_number = sp.id_proceso
  left join pliego pl
    on pl.proceso_id = p.id
    and pl.uploaded_by_empresa_id = p_empresa_id
    and pl.deleted_at is null
  left join analisis a
    on a.proceso_id = p.id
    and a.empresa_id = p_empresa_id
    and a.estado = 'completado'
  group by sp.id_proceso
$$;
```

> `security definer` runs as the function owner (service role), so no RLS interference. The explicit `empresa_id` parameter is the tenant isolation boundary.

### Filter-aware stats query

Runs in parallel with the main query (same filter predicates, no pagination, no enrichment).

```ts
const OPEN_PHASES = [
  'Presentación de oferta', 'Borrador', 'Convocatoria',
  'Pliego definitivo', 'En Proceso',
]
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

let statsQuery = supabaseService
  .from('secop_procesos')
  .select('fase, fecha_cierre, cuantia, cuantia_disponible')

// Apply same filters (no pagination, no sort)
if (params.departamento?.length) statsQuery = statsQuery.in('departamento', params.departamento)
// ... same filter chain as above ...

const { data: allRows } = await statsQuery

const stats: ProcesosStats = {
  total_abiertos:     allRows?.filter((r) => OPEN_PHASES.includes(r.fase ?? '')).length ?? 0,
  cierran_esta_semana: allRows?.filter((r) => r.fecha_cierre && r.fecha_cierre > new Date().toISOString() && r.fecha_cierre <= nextWeek).length ?? 0,
  cuantia_total:      allRows?.filter((r) => r.cuantia_disponible).reduce((sum, r) => sum + (r.cuantia ?? 0), 0) ?? 0,
}
```

> For large datasets, replace client-side aggregation with a separate SQL aggregate query using the same WHERE predicates. The Supabase JS approach is acceptable for MVP given expected row counts (<50k post-filter).

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
  }
})

return NextResponse.json({
  data,
  pagination: {
    page:        params.page,
    page_size:   params.page_size,
    total:       count ?? 0,
    total_pages: Math.ceil((count ?? 0) / params.page_size),
  },
  stats,
}, {
  headers: {
    // private: response is empresa-scoped; must NOT be CDN-cached
    'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
  },
})
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
  fase: string | null
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
```

This file is the **frozen contract** that both `ingesta-secop` and `procesos-listing` import from. Do not modify the shape without updating both specs.

## Dependencies

Requires P1 (tables + `get_empresa_enrichment` function).

## Done When

- [ ] GET with no filters returns 20 rows ordered by `fecha_publicacion desc`
- [ ] Multi-value `departamento=Bolívar,Cundinamarca` returns rows from both
- [ ] `fase=Presentación de oferta,Borrador` filters correctly
- [ ] `q=software` returns rows matching search_vector
- [ ] `sort=closing_soon` excludes `fecha_cierre < now()`, orders ascending
- [ ] `page_size=101` returns 400
- [ ] Enrichment: empresa with pliego + analisis → `has_pliego=true`, `last_sem` set
- [ ] Enrichment: empresa with no interaction → all enrichment fields null/false
- [ ] Enrichment: empresa A cannot see empresa B's `has_pliego` / `last_sem`
- [ ] `stats.cierran_esta_semana` changes when `departamento` filter applied
- [ ] Response `Cache-Control` is `private` not `public`
- [ ] Unauthenticated request → 401
- [ ] `npm run build` no type errors; `npm run test` passes
