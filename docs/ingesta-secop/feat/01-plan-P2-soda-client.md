# P2: SODA Client

## Scope

- `lib/secop/types.ts` — raw SODA row type + domain `SecopProcesoRow` type
- `lib/secop/soql.ts` — safe SoQL query builder (no string interpolation of user input)
- `lib/secop/client.ts` — HTTP client: paginates via async generator, retries 429/503
- `lib/secop/mapper.ts` — `socrataRow → SecopProcesoRow` with defensive parsing
- `specs/secop/dataset-schema-snapshot.json` — committed snapshot of SODA column names
- `__fixtures__/secop/` — 5-10 real SODA rows for unit tests

## Pre-coding step (required)

Before writing any code, fetch and commit the dataset schema:

```
GET https://www.datos.gov.co/api/views/p6dx-8zbt.json
```

Save response to `specs/secop/dataset-schema-snapshot.json`. This file is the source of truth for SODA column names. If column names in the mapper differ from the snapshot, the mapper is wrong.

## Changes

### `lib/secop/types.ts`

`SodaRow`: raw record shape from `p6dx-8zbt` — all fields `string | null` since SODA returns everything as strings. Key fields (verify names against snapshot):
- `id_proceso`, `id_del_portafolio`, `nombre_del_procedimiento`
- `descripci_n_del_procedimiento`
- `entidad`, `nit_de_la_entidad`
- `departamento_entidad`, `ciudad_entidad`
- `fase`, `modalidad_de_contratacion`
- `unspsc`
- `precio_base` (or `cuantia_a_contratar` — verify in snapshot)
- `fecha_de_publicacion_del_proceso`, `fecha_de_cierre_del_proceso`
- `urlproceso` (object with `.url` field)
- `:updated_at` (Socrata system column)

`SecopProcesoRow`: typed domain row matching `secop_procesos` columns.

### `lib/secop/soql.ts`

```ts
export function buildIncrementalQuery(opts: {
  sinceUpdatedAt: Date | null
  isBackfill: boolean
  limit: number
  offset: number
}): string
```

- Backfill: `$where=fecha_de_publicacion_del_proceso > '<90days>' AND fase IN (...open phases...)`
- Incremental: `$where=:updated_at > '<sinceUpdatedAt>' ORDER BY :updated_at ASC`
- Parameters URL-encoded; no string interpolation of external data

### `lib/secop/client.ts`

```ts
export async function* fetchProcesosIncremental(
  sinceUpdatedAt: Date | null
): AsyncGenerator<SodaRow[]>
```

- Calls SODA with `$limit=50000` batches ordered by `:updated_at asc`
- Adds `X-App-Token: env.DATOS_GOV_APP_TOKEN` header
- Retry: 3 attempts, exponential backoff base 1s + jitter, on 429/503 only
- 5s AbortSignal timeout per request
- Yields each page as `SodaRow[]`; generator exhausts when response length < limit

### `lib/secop/mapper.ts`

```ts
export function mapSodaRow(row: SodaRow): SecopProcesoRow
```

Defensive rules:
- Dates: `new Date(raw)` — if `isNaN`, return `null`
- Cuantia: strip `.`, `,` separators → `parseFloat` → if `NaN || === 0`, return `null`
- Strings `"No Definido"`, `"N/A"`, `""`, `"0"` → `null`
- `urlproceso`: access `.url` if object, else string, else `null`
- `socrata_updated_at`: from `:updated_at` Socrata system field (always present)

Log (not throw) when a required field (`id_proceso`, `socrata_updated_at`) is missing — skip that row.

## Dependencies

Requires P1 (env vars available via `lib/env.ts`).

## Done When

- [ ] `specs/secop/dataset-schema-snapshot.json` committed
- [ ] Fixtures from real SODA rows in `__fixtures__/secop/`
- [ ] Mapper unit tests cover: valid date, invalid date, cuantia with separators, cuantia = "0", cuantia = "No Definido", null URL, URL as object
- [ ] `fetchProcesosIncremental` paginates correctly (test with `limit: 2`, fixture of 5 rows)
- [ ] Retry fires on 429, not on 404
- [ ] Zero secrets in logs (test that `X-App-Token` not logged)
- [ ] `npm run build` no type errors
