# T5: UNSPSC Catalog + Client-Side Search

## Scope

- `src/lib/data/unspsc-v23.json` — static catalog JSON (~3MB, lazy-loaded)
- `src/lib/utils/unspsc-search.ts` — search utility (new file)
- `src/app/api/unspsc/search/route.ts` — optional SSR fallback route (new file)

## Changes

### Catalog format (unspsc-v23.json)

Minimal structure for search performance:

```json
[
  { "code": "43000000", "level": "segment", "description": "Tecnología de Información y Comunicaciones" },
  { "code": "43230000", "level": "family", "description": "Software" },
  { "code": "43232300", "level": "class", "description": "Software de aplicación" }
]
```

Source: UNSPSC v23 ES taxonomy, filtered to codes relevant to SECOP II Colombia (segments, families, classes — no 8-digit commodities unless specifically needed). Stored as static JSON in repo for fast iteration without DB schema changes.

### Search utility (unspsc-search.ts)

```typescript
export interface UnspscItem {
  code: string
  level: 'segment' | 'family' | 'class' | 'commodity'
  description: string
  is_primary?: boolean
}

export function searchUnspsc(query: string, limit = 20): UnspscItem[]
```

- Lazy-imports `unspsc-v23.json` (dynamic import; cached after first load)
- Lowercase normalized match: description contains all query words
- Returns up to `limit` results; sorted by specificity (class > family > segment)
- Exported `UnspscItem` type is the canonical JSONB item shape for `empresa_perfil.unspsc_codes`

### API route (unspsc/search/route.ts)

- `GET /api/unspsc/search?q=<term>&limit=<n>` — SSR fallback for slow devices
- Calls `searchUnspsc`; returns `{ results: UnspscItem[] }`
- Public (no auth required — catalog is public domain data)

### Design Rationale

Static JSON over DB table: catalog changes are infrequent; repo JSON enables instant iteration and zero migration cost. Client-side search eliminates per-keystroke server round-trip, achieving <100ms response (NFR-01).

## Dependencies

None — foundational task, no code dependencies.

## Done When

- [ ] `src/lib/data/unspsc-v23.json` present with ≥500 entries covering common SECOP II sectors
- [ ] `searchUnspsc('software')` returns results including `43232300`
- [ ] `searchUnspsc('construccion')` returns results including `72000000` family
- [ ] `UnspscItem` type exported from `src/lib/utils/unspsc-search.ts`
- [ ] Unit test: search returns ≤20 results; empty query returns empty array
- [ ] `npm run build` succeeds
