# P1: Schema + Env

## Scope

- `supabase/migrations/2026XXXX_secop_procesos.sql` — tables, indexes, RLS
- `src/types/db.ts` — regenerate Supabase TS types after migration
- `.env.local` — new env vars
- `lib/env.ts` — Zod validator that fails build if vars missing

## Changes

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
  fase              text,
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
  search_vector     tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(nombre,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(descripcion,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(entidad,'')), 'C')
  ) stored
);

create index idx_procesos_departamento on secop_procesos (departamento);
create index idx_procesos_ciudad       on secop_procesos (ciudad);
create index idx_procesos_fase         on secop_procesos (fase);
create index idx_procesos_modalidad    on secop_procesos (modalidad);
create index idx_procesos_unspsc       on secop_procesos (unspsc);
create index idx_procesos_cuantia      on secop_procesos (cuantia);
create index idx_procesos_publicacion  on secop_procesos (fecha_publicacion desc);
create index idx_procesos_cierre       on secop_procesos (fecha_cierre);
create index idx_procesos_updated      on secop_procesos (socrata_updated_at);
create index idx_procesos_search       on secop_procesos using gin (search_vector);

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
```

### RLS policies

```sql
-- secop_procesos: read for authenticated users (adjust to public if free-tier listing)
alter table secop_procesos enable row level security;
create policy "authenticated read procesos"
  on secop_procesos for select
  to authenticated using (true);

-- secop_sync_state: blocked from client, service role only
alter table secop_sync_state enable row level security;
-- no policy = deny all; service role bypasses RLS
```

### `lib/env.ts`

```ts
import { z } from 'zod'

const serverEnv = z.object({
  DATOS_GOV_APP_TOKEN: z.string().min(1),
  SECOP_DATASET_ID: z.string().default('p6dx-8zbt'),
  CRON_SECRET: z.string().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export const env = serverEnv.parse(process.env)
```

Import `env` at the top of any server file that needs these vars. Build fails at parse time if any missing.

### Env vars to add

```
DATOS_GOV_APP_TOKEN=<token from datos.gov.co>
SECOP_DATASET_ID=p6dx-8zbt
CRON_SECRET=<random 32+ bytes hex>
```

Add to `.env.local` and to Vercel project settings. **Never** prefix with `NEXT_PUBLIC_`.

## Dependencies

None — foundational.

## Done When

- [ ] `npx supabase db push` applies without error
- [ ] `select * from secop_procesos limit 1` returns empty, no error
- [ ] `select * from secop_sync_state` returns one row `(p6dx-8zbt, null, null, null, ...)`
- [ ] TS types regenerated; `secop_procesos` and `secop_sync_state` appear in `Database` type
- [ ] `npm run build` fails with Zod error when `DATOS_GOV_APP_TOKEN` is unset
- [ ] `npm run build` succeeds when all vars set
