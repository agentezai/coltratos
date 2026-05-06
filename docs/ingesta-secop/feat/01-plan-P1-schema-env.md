# P1: Schema + Env

## Scope

- `supabase/migrations/2026XXXX_secop_procesos.sql` — tables, indexes, pgvector, RLS
- `src/types/db.ts` — regenerate Supabase TS types after migration
- `.env.local` — new env vars
- `lib/env.ts` — Zod validator that fails build if vars missing

## Changes

### Enable pgvector extension

```sql
create extension if not exists vector;
```

Run this before creating the table. Supabase projects have pgvector available; just needs enabling.

### Migration SQL

```sql
create table secop_procesos (
  id_proceso        text primary key,
  socrata_id        text unique not null,
  entidad           text,
  nit_entidad       text,
  departamento      text,
  ciudad            text,
  nombre            text,
  descripcion       text,
  modalidad         text,
  unspsc            text,
  cuantia           numeric,
  cuantia_disponible boolean generated always as (
    cuantia is not null and cuantia > 0
  ) stored,
  fecha_publicacion timestamptz,
  fecha_cierre      timestamptz,
  url_secop         text,
  socrata_updated_at timestamptz not null,
  synced_at         timestamptz default now(),
  -- Full-text search
  search_vector     tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(nombre,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(descripcion,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(entidad,'')), 'C')
  ) stored,
  -- Semantic search
  embedding         vector(1536),
  embedded_at       timestamptz
);

create index idx_procesos_departamento on secop_procesos (departamento);
create index idx_procesos_ciudad       on secop_procesos (ciudad);
create index idx_procesos_modalidad    on secop_procesos (modalidad);
create index idx_procesos_unspsc       on secop_procesos (unspsc);
create index idx_procesos_cuantia      on secop_procesos (cuantia);
create index idx_procesos_publicacion  on secop_procesos (fecha_publicacion desc);
create index idx_procesos_cierre       on secop_procesos (fecha_cierre);
create index idx_procesos_updated      on secop_procesos (socrata_updated_at);
create index idx_procesos_search       on secop_procesos using gin (search_vector);
-- HNSW index for vector cosine similarity (incremental build; better than IVFFlat for <1M rows)
create index idx_procesos_embedding    on secop_procesos using hnsw (embedding vector_cosine_ops);

create table secop_sync_state (
  dataset_id        text primary key,
  last_updated_at   timestamptz,
  last_run_at       timestamptz,
  last_run_status   text check (last_run_status in ('success','partial','error')),
  last_error        text,
  rows_synced_total bigint default 0,
  rows_synced_last  integer default 0
);

insert into secop_sync_state (dataset_id) values ('p6dx-8zbt')
on conflict do nothing;

create table embedding_cost_log (
  id            uuid primary key default gen_random_uuid(),
  run_at        timestamptz default now(),
  rows_embedded integer not null default 0,
  tokens_used   integer not null default 0,
  cost_usd      numeric(10,6) not null default 0
);

create table search_log (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null,
  query         text,
  filter_object jsonb not null default '{}',
  result_count  integer not null default 0,
  result_ids    text[] not null default '{}',
  clicked_ids   text[] not null default '{}',
  created_at    timestamptz default now()
);

create index idx_search_log_company   on search_log (company_id);
create index idx_search_log_created   on search_log (created_at desc);
```

### `get_empresa_enrichment` function

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

> `security definer` runs as function owner (service role), bypassing RLS. The explicit `p_empresa_id` parameter is the tenant isolation boundary.

### RLS policies

```sql
alter table secop_procesos enable row level security;
create policy "authenticated read procesos"
  on secop_procesos for select
  to authenticated using (true);

-- secop_sync_state, embedding_cost_log: service role only (no policy = deny all)
alter table secop_sync_state enable row level security;
alter table embedding_cost_log enable row level security;

-- search_log: service role INSERT only (API route uses service role)
alter table search_log enable row level security;
```

### `lib/env.ts`

```ts
import { z } from 'zod'

const serverEnv = z.object({
  DATOS_GOV_APP_TOKEN:      z.string().min(1),
  SECOP_DATASET_ID:         z.string().default('p6dx-8zbt'),
  CRON_SECRET:              z.string().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY:           z.string().min(1),
})

export const env = serverEnv.parse(process.env)
```

Import `env` at the top of any server file that needs these vars. Build fails at parse time if any missing.

### Env vars to add

```
DATOS_GOV_APP_TOKEN=<token from datos.gov.co>
SECOP_DATASET_ID=p6dx-8zbt
CRON_SECRET=<random 32+ bytes hex>
OPENAI_API_KEY=<OpenAI project key>
```

Add to `.env.local` and to Vercel project settings. **Never** prefix with `NEXT_PUBLIC_`.

## Dependencies

None — foundational.

## Done When

- [ ] `npx supabase db push` applies without error (including pgvector extension)
- [ ] `select * from secop_procesos limit 1` returns empty, no error
- [ ] `select * from secop_sync_state` returns one row `(p6dx-8zbt, null, null, null, ...)`
- [ ] `\d secop_procesos` shows `embedding vector(1536)` and `embedded_at timestamptz` columns
- [ ] `select * from embedding_cost_log limit 0` succeeds (table exists)
- [ ] `select * from search_log limit 0` succeeds (table exists)
- [ ] TS types regenerated; all four new tables appear in `Database` type
- [ ] `npm run build` fails with Zod error when `OPENAI_API_KEY` is unset
- [ ] `npm run build` succeeds when all vars set
