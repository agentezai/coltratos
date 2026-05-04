# P5: Frontend Connection

## Scope

- Locate the listing module that consumes mock data
- Replace mock source with `GET /api/procesos` calls
- Map UI filter state to query params
- Handle loading / empty / error states
- No visual changes

## Pre-coding step (required)

Before writing code, locate the frontend component:
- Search for `mock`, `faker`, `dummy`, or hardcoded proceso arrays in `src/`
- Identify the fetch function or data hook the listing component uses
- If the response shape expected by the component differs from the P4 contract, **adjust the P4 mapper** — do not modify the component's prop types or rendering logic

## Changes

### Replace data source

1. Find the mock fetch/data hook
2. Replace with:
```ts
const params = new URLSearchParams(filterState)
const res = await fetch(`/api/procesos?${params}`)
if (!res.ok) throw new Error(await res.text())
return res.json() as Promise<ProcesosResponse>
```

3. Map UI filter fields to query params:
   - departamento filter → `departamento`
   - fase filter → `fase`
   - modalidad filter → `modalidad`
   - cuantia range → `cuantia_min` + `cuantia_max`
   - search input → `q`
   - sort selector → `sort`
   - page/page_size → `page` + `page_size`

### States to handle

- **Loading**: spinner or skeleton visible during fetch
- **Empty** (`data.length === 0`): "No encontramos procesos con estos filtros." message
- **Error**: "Error al cargar procesos. Intenta de nuevo." message with retry option

### Contract mismatch handling

If the component expects a different field name than what P4 returns (e.g. `titulo` instead of `nombre`), add a thin adapter in the fetch hook — not in the component and not in the DB layer:

```ts
function adaptResponse(raw: ProcesosResponse): UIProcesoList {
  return {
    ...raw,
    data: raw.data.map(p => ({ ...p, titulo: p.nombre })),
  }
}
```

## Dependencies

Requires P4 (`/api/procesos` live and returning real data).

## Done When

- [ ] UI shows real SECOP II data (not mock)
- [ ] All existing filters in the UI produce correct filtered results
- [ ] Loading state visible during fetch
- [ ] Empty state visible when 0 results
- [ ] Error state visible when endpoint returns non-200
- [ ] No visual regression in the listing layout
- [ ] `npm run build` no type errors; `npm run test` passes
- [ ] Dev tools: no requests to `datos.gov.co` from the browser
- [ ] Dev tools: `DATOS_GOV_APP_TOKEN` and `CRON_SECRET` not in JS bundle
