# B2: SODA Client + Mapper

## Scope

- `lib/secop/client.ts` — SODA HTTP client (fetch open Procesos; single-record lookup)
- `lib/secop/mapper.ts` — field-name translation: SODA → `procesos_index` columns
- `lib/secop/soql.ts` — SOQL query builder for open-Procesos filter

## Field-Name Translation Table

The SODA API uses different field names from `procesos_index`. Translation happens **exclusively** in `mapper.ts` — no other module performs this mapping.

| SODA field | `procesos_index` column | Notes |
|------------|------------------------|-------|
| `id_proceso` | `numero_proceso` | Primary key translation — critical |
| `entidad` | `entidad` | Direct copy |
| `objeto_a_contratar` | `objeto_a_contratar` | Direct copy |
| `modalidad_de_contratacion` | `modalidad` | Verify field name on live dataset before shipping |
| `cuantia_proceso` | `cuantia_proceso` | Parse to numeric; null if absent |
| `fecha_de_publicacion_del_proceso` | `fecha_de_publicacion_del_proceso` | ISO-8601 string |
| `fecha_limite_de_recepcion` | `fecha_limite_de_recepcion` | ISO-8601 string |
| `municipio_entidad` (or equivalent) | `ciudad` | Verify field name on live dataset |
| (computed from UNSPSC field) | `unspsc` | Parse SODA's UNSPSC value(s) into `text[]`; null if absent |
| SODA row `_id` | `socrata_id` | SODA internal identifier for incremental sync |

**Action before coding B2:** call `GET https://www.datos.gov.co/resource/<DATASET_ID>.json?$limit=1` and verify the actual field names against this table. Update `mapper.ts` comments with confirmed field names.

## Changes

### `lib/secop/client.ts`

- `fetchOpenProcesos(): Promise<RawSodaRow[]>` — fetches all rows with `estado = 'abierto'` (or equivalent open filter), paginating via SODA `$offset` + `$limit=1000`. Uses `SECOP_SODA_DATASET_ID` and `SECOP_SODA_TOKEN` from env. Throws on non-200. Returns raw SODA JSON.
- `fetchProcesoByCodigo(numeroProceso: string): Promise<RawSodaRow | null>` — fetches a single row by `id_proceso`. Returns `null` on not-found. Used by `/api/procesos/[numero_proceso]`.

### `lib/secop/mapper.ts`

- `mapSodaRow(raw: RawSodaRow): MappedProceso` — applies the translation table above. Handles missing optional fields by returning `null` (not throwing). Parses `cuantia_proceso` to `number | null`. Parses `fecha_*` fields to ISO-8601 strings. Parses UNSPSC to `string[] | null`.

### `lib/secop/soql.ts`

- `buildOpenProcesosQuery(opts?: { limit?: number; offset?: number }): string` — returns a SOQL query string filtering for open Procesos. Encodes `$where`, `$limit`, `$offset` as URL query params for the SODA endpoint.

## Types

```typescript
// lib/secop/types.ts
export type RawSodaRow = Record<string, string | null | undefined>

export interface MappedProceso {
  numero_proceso: string
  socrata_id: string | null
  entidad: string
  objeto_a_contratar: string
  modalidad: string
  cuantia_proceso: number | null
  fecha_de_publicacion_del_proceso: string | null
  fecha_limite_de_recepcion: string | null
  ciudad: string | null
  unspsc: string[] | null
}
```

## Dependencies

- B1 confirmed: `SECOP_SODA_DATASET_ID` and `SECOP_SODA_TOKEN` set in env
- `lib/secop/client.ts` uses `process.env` server-side only — never imported from client components

## Done When

- [ ] `mapSodaRow({ id_proceso: 'X', ... })` → result has `numero_proceso: 'X'`; no `id_proceso` key
- [ ] `mapSodaRow` with missing `cuantia_proceso` → `cuantia_proceso: null`; no throw
- [ ] `fetchOpenProcesos()` with mocked 200 response returns array of `MappedProceso`
- [ ] `fetchOpenProcesos()` with mocked 503 response throws
- [ ] `buildOpenProcesosQuery()` output contains `estado` filter for open Procesos
- [ ] All three modules have no `import` from `app/` or `components/` (pure library code)
- [ ] Field name translation table comment in `mapper.ts` includes verified SODA field names
