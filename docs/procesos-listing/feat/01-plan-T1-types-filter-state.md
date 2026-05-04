# T1: Types + Filter State + URL Serialization

## Scope

- `src/types/domain/procesos.ts` — verify `ProcesoListItem` (incl. `match_score`), `ProcesosResponse`, `ProcesosStats`, `SearchLogEntry` are present (from ingesta-secop P4); add `ProcesosFilterState`
- `src/lib/procesos/filter-state.ts` — URL ↔ filter state (serialize, deserialize, defaults)
- `src/lib/procesos/preferences.ts` — localStorage read/write for saved preferences

## Changes

### `ProcesosFilterState` (add to `src/types/domain/procesos.ts`)

```ts
export interface ProcesosFilterState {
  departamento:     string[]    // multi-value; default []
  modalidad:        string[]    // multi-value; default []
  unspsc:           string[]    // multi-value UNSPSC codes; default []
  cuantia_min:      number | null
  cuantia_max:      number | null
  fecha_cierre_from: string | null  // ISO date string e.g. "2026-05-01"
  fecha_cierre_to:  string | null   // ISO date string e.g. "2026-08-31"
  q:                string
  profile_match:    boolean        // default false
  sort:             'recent' | 'closing_soon' | 'cuantia_desc' | 'relevance'
  page:             number
  page_size:        number
}
```

Note: `fase` field removed from filter state. All synced procesos are open by definition (closed ones pruned by ingesta-secop P3). No fase filter needed in the UI.

### `src/lib/procesos/filter-state.ts`

```ts
export const DEFAULT_FILTER_STATE: ProcesosFilterState = {
  departamento:      [],
  modalidad:         [],
  unspsc:            [],
  cuantia_min:       null,
  cuantia_max:       null,
  fecha_cierre_from: null,
  fecha_cierre_to:   null,
  q:                 '',
  profile_match:     false,
  sort:              'recent',
  page:              1,
  page_size:         20,
}

export function serializeFilters(state: ProcesosFilterState): URLSearchParams
// Omits empty arrays, null values, empty string, false boolean, default numbers

export function deserializeFilters(params: URLSearchParams): ProcesosFilterState
// Returns DEFAULT_FILTER_STATE fields for missing/invalid params
// Arrays: split comma-separated string → string[]
// Booleans: "true" → true; anything else → false
// Nullables: absent → null

export function filtersToApiParams(state: ProcesosFilterState): URLSearchParams
// Same as serializeFilters; profile_match=false is omitted (API defaults to false)

export function isDefaultState(state: ProcesosFilterState): boolean
// Returns true if all fields equal DEFAULT_FILTER_STATE (except page/page_size/sort)
```

### `src/lib/procesos/preferences.ts`

```ts
const LS_KEY = 'coltratos_procesos_filter_prefs'

export function loadPreferences(): Partial<ProcesosFilterState> | null
// Returns null if key absent or JSON parse fails

export function savePreferences(state: ProcesosFilterState): void
// Called explicitly by "Guardar preferencias" action; never called automatically
```

## Dependencies

`ingesta-secop` P4 must have written `ProcesoListItem` (with `match_score`), `ProcesosResponse`, `ProcesosStats`, `SearchLogEntry` to `src/types/domain/procesos.ts` before this task begins.

## Done When

- [ ] `ProcesosFilterState` exported from `src/types/domain/procesos.ts` with `unspsc`, `profile_match`, `fecha_cierre_from/to`, `cuantia_min/max` fields
- [ ] `ProcesoListItem.match_score: number | null` confirmed present (from ingesta-secop P4)
- [ ] `serializeFilters` round-trips: `deserializeFilters(serializeFilters(state))` deep-equals `state`
- [ ] Empty arrays not added to URL: `unspsc=[]` → no `unspsc` param
- [ ] Comma-sep multi-value: `unspsc=['43232300','72000000']` → `unspsc=43232300%2C72000000`
- [ ] `profile_match=false` not added to URL (omit default)
- [ ] `profile_match=true` → `profile_match=true` in URL
- [ ] `deserializeFilters` with empty `URLSearchParams` returns `DEFAULT_FILTER_STATE`
- [ ] `loadPreferences` returns `null` on corrupt localStorage (no throw)
- [ ] `npm run test` passes; `npm run build` no type errors
