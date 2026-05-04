# T1: Types + Filter State + URL Serialization

## Scope

- `src/types/domain/procesos.ts` — verify `ProcesoListItem`, `ProcesosResponse`, `ProcesosStats` are present (from ingesta-secop P4); add `ProcesosFilterState` type
- `src/lib/procesos/filter-state.ts` — URL ↔ filter state (serialize, deserialize, defaults)
- `src/lib/procesos/preferences.ts` — localStorage read/write for saved preferences

## Changes

### `ProcesosFilterState` (add to `src/types/domain/procesos.ts`)

```ts
export interface ProcesosFilterState {
  departamento: string[]   // multi-value
  modalidad:    string[]   // multi-value
  fase:         string[]   // multi-value; default = OPEN_FASES
  q:            string
  cuantia_min:  number | null
  cuantia_max:  number | null
  sort:         'recent' | 'closing_soon' | 'cuantia_desc'
  page:         number
  page_size:    number
}
```

### `src/lib/procesos/filter-state.ts`

```ts
export const OPEN_FASES = [
  'Presentación de oferta',
  'Borrador',
  'Convocatoria',
  'Pliego definitivo',
  'En Proceso',
]

export const DEFAULT_FILTER_STATE: ProcesosFilterState = {
  departamento: [],
  modalidad:    [],
  fase:         OPEN_FASES,
  q:            '',
  cuantia_min:  null,
  cuantia_max:  null,
  sort:         'recent',
  page:         1,
  page_size:    20,
}

export function serializeFilters(state: ProcesosFilterState): URLSearchParams

export function deserializeFilters(params: URLSearchParams): ProcesosFilterState
// Returns DEFAULT_FILTER_STATE for missing/invalid params

export function filtersToApiParams(state: ProcesosFilterState): URLSearchParams
// Same as serializeFilters but skips empty arrays and null values
// Array fields serialized as comma-separated: departamento=Bolívar,Cundinamarca
```

### `src/lib/procesos/preferences.ts`

```ts
const LS_KEY = 'coltratos_procesos_filter_prefs'

export function loadPreferences(): Partial<ProcesosFilterState> | null
// Returns null if key absent or JSON parse fails

export function savePreferences(state: ProcesosFilterState): void
// Saves current filter state to localStorage
// Called explicitly by "Guardar preferencias" action; never called automatically
```

## Dependencies

`ingesta-secop` P4 must have written `ProcesoListItem`, `ProcesosResponse`, `ProcesosStats` to `src/types/domain/procesos.ts` before this task begins.

## Done When

- [ ] `ProcesosFilterState` exported from `src/types/domain/procesos.ts`
- [ ] `serializeFilters` round-trips: `deserializeFilters(serializeFilters(state))` deep-equals `state`
- [ ] Empty arrays not added to URL: `departamento=[]` → no `departamento` param
- [ ] Comma-sep multi-value: `departamento=['Bolívar','Cundinamarca']` → `departamento=Bolívar%2CCundinamarca`
- [ ] `deserializeFilters` with empty `URLSearchParams` returns `DEFAULT_FILTER_STATE`
- [ ] `loadPreferences` returns `null` on corrupt localStorage (no throw)
- [ ] `npm run test` passes; `npm run build` no type errors
