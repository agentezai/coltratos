# T4: Filter Bar

## Scope

- `app/dashboard/procesos/_components/procesos-filters.tsx` — full rewrite; server-side filters, URL sync

## Changes

### `ProcesosFilters` props

```ts
interface ProcesosFiltersProps {
  filters:            ProcesosFilterState
  onFiltersChange:    (patch: Partial<ProcesosFilterState>) => void
  onClear:            () => void
  onRestorePrefs:     () => void
  hasPreferences:     boolean   // true if localStorage has saved prefs
}
```

The component is controlled: all state lives in the parent (page). `onFiltersChange` patches only changed fields.

### Filter controls

| Filter | Control | Behavior |
|--------|---------|----------|
| `departamento` | Multi-select chip group or `<select multiple>` | 33 options (32 dptos + Bogotá D.C.); chips show selected values |
| `modalidad` | Multi-select chip group | 5 options: Licitación Pública, Selección Abreviada, Mínima Cuantía, Concurso de Méritos, Contratación Directa |
| `fase` | Multi-select chip group | Default pre-selected to OPEN_FASES; user can expand to all fases |
| `q` | Text input with search icon | 400ms debounce handled in hook (not here); input is uncontrolled, sync to filters.q |
| `cuantia_min` / `cuantia_max` | Number inputs (COP, no formatting on input) | Both optional; trigger `onFiltersChange` on blur |
| `sort` | `<select>` | Options: recent, closing_soon, cuantia_desc |

### "Limpiar filtros" button

Calls `onClear()`. Visible always. Resets to `DEFAULT_FILTER_STATE` (not localStorage).

### "Restaurar preferencias" button

Calls `onRestorePrefs()`. Visible only when `hasPreferences=true`. Reapplies saved localStorage state to URL.

### Multi-select implementation (MVP)

Use native `<select multiple>` with `size={3}` or a simple chip list with toggles. No third-party component. Style with existing design tokens.

Chip toggle pattern:
```tsx
{DEPARTAMENTOS.map((d) => (
  <button
    key={d}
    type="button"
    onClick={() => {
      const next = filters.departamento.includes(d)
        ? filters.departamento.filter((x) => x !== d)
        : [...filters.departamento, d]
      onFiltersChange({ departamento: next, page: 1 })
    }}
    className={filters.departamento.includes(d) ? 'chip-active' : 'chip'}
  >
    {d}
  </button>
))}
```

Note: `page: 1` always reset on filter change (REQ-007).

## Dependencies

Requires T1 (`ProcesosFilterState`, `DEFAULT_FILTER_STATE`, `OPEN_FASES`).

## Done When

- [ ] Departamento multi-select: selecting two dptos → `filters.departamento` has both
- [ ] Modalidad multi-select works identically
- [ ] Fase multi-select: default pre-selected; toggling removes/adds
- [ ] `q` input reflects `filters.q`; clearing input calls `onFiltersChange({ q: '', page: 1 })`
- [ ] `cuantia_min` / `cuantia_max` update on blur; null when empty
- [ ] "Limpiar filtros" calls `onClear`
- [ ] "Restaurar preferencias" visible only when `hasPreferences=true`
- [ ] All filter changes include `page: 1` reset
- [ ] `npm run build` no type errors; `npm run test` passes
