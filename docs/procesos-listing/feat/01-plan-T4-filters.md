# T4: Filter Bar

## Scope

- `app/dashboard/procesos/_components/procesos-filters.tsx` — full rewrite; server-side filters, URL sync

## Changes

### `ProcesosFilters` props

```ts
interface ProcesosFiltersProps {
  filters:         ProcesosFilterState
  onFiltersChange: (patch: Partial<ProcesosFilterState>) => void
  onClear:         () => void
  onRestorePrefs:  () => void
  hasPreferences:  boolean   // true if localStorage has saved prefs
}
```

The component is controlled: all state lives in the parent (page). `onFiltersChange` patches only changed fields and always includes `page: 1` to reset pagination.

### Filter controls

| Filter | Control | Options / behavior |
|--------|---------|-------------------|
| `q` | Text input with search icon | 400ms debounce handled in hook (not here); input reflects `filters.q` |
| `profile_match` | Toggle switch labeled "Coincide con mi perfil" | Default off; when on: "Perfil activo" badge shown |
| `departamento` | Multi-select chip group | 33 options (32 dptos + Bogotá D.C.) |
| `modalidad` | Multi-select chip group | 5 options: Selección Abreviada, Licitación Pública, Concurso de Méritos, Contratación Directa, Mínima Cuantía |
| `unspsc` | Multi-select chip group | 8 top-level UNSPSC codes (confirm list in Pre-Approval Gate) |
| `cuantia_min` / `cuantia_max` | Number inputs (COP, no formatting on input) | Both optional; trigger `onFiltersChange` on blur |
| `fecha_cierre_from` / `fecha_cierre_to` | Date inputs (`type="date"`) | Both optional; trigger on change |
| `sort` | `<select>` | Options: recent ("Más recientes"), closing_soon ("Cierra pronto"), valor_desc ("Mayor cuantía"), relevance ("Relevancia") — "Relevancia" selected automatically when `q` is active |

Note: `fase` filter removed. All synced procesos are open (closed ones pruned by ingesta-secop P3). No fase selection needed.

### Profile-match toggle

```tsx
<label className="toggle-label">
  <input
    type="checkbox"
    checked={filters.profile_match}
    onChange={(e) => onFiltersChange({ profile_match: e.target.checked, page: 1 })}
  />
  <span>Coincide con mi perfil</span>
</label>
{filters.profile_match && (
  <span className="badge-active">Perfil activo</span>
)}
```

### UNSPSC multi-select

```tsx
const TOP_UNSPSC = [
  { code: '43', label: '43 - Tecnologías de la información' },
  { code: '72', label: '72 - Servicios de construcción' },
  { code: '80', label: '80 - Servicios de gestión' },
  { code: '81', label: '81 - Servicios de ingeniería' },
  { code: '83', label: '83 - Servicios públicos' },
  { code: '84', label: '84 - Servicios financieros' },
  { code: '85', label: '85 - Servicios de salud' },
  { code: '92', label: '92 - Defensa y seguridad' },
]

{TOP_UNSPSC.map(({ code, label }) => (
  <button
    key={code}
    type="button"
    onClick={() => {
      const next = filters.unspsc.includes(code)
        ? filters.unspsc.filter((x) => x !== code)
        : [...filters.unspsc, code]
      onFiltersChange({ unspsc: next, page: 1 })
    }}
    className={filters.unspsc.includes(code) ? 'chip-active' : 'chip'}
  >
    {label}
  </button>
))}
```

### "Limpiar filtros" button

Calls `onClear()`. Visible always. Resets to `DEFAULT_FILTER_STATE`.

### "Restaurar preferencias" button

Calls `onRestorePrefs()`. Visible only when `hasPreferences=true`. Reapplies saved localStorage state to URL.

## Dependencies

Requires T1 (`ProcesosFilterState`, `DEFAULT_FILTER_STATE`).

## Done When

- [ ] `q` input reflects `filters.q`; clearing input calls `onFiltersChange({ q: '', page: 1 })`
- [ ] `profile_match` toggle: on → `filters.profile_match=true`; badge "Perfil activo" shown; off → badge hidden
- [ ] Departamento multi-select: selecting two dptos → `filters.departamento` has both
- [ ] Modalidad multi-select: 5 options; works identically to departamento
- [ ] UNSPSC multi-select: 8 top-level codes; toggle on/off correctly
- [ ] `cuantia_min` / `cuantia_max` update on blur; null when empty
- [ ] `fecha_cierre_from` / `fecha_cierre_to` date inputs update `filters` immediately on change
- [ ] "Limpiar filtros" calls `onClear`; resets all filters including profile_match and UNSPSC
- [ ] "Restaurar preferencias" visible only when `hasPreferences=true`
- [ ] All filter changes include `page: 1` reset
- [ ] Sort dropdown shows "Relevancia" option; can be selected independently of `q`
- [ ] `npm run build` no type errors; `npm run test` passes
