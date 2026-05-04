# T4: RUES Lookup Service + API Route

## Scope

- `src/lib/services/rues-lookup.ts` — RUES API client with 2s timeout (new file)
- `src/app/api/empresa/rues-lookup/route.ts` — POST handler (new file)

## Changes

### RUES lookup service (rues-lookup.ts)

```typescript
export interface RuesLookupResult {
  razon_social: string
  tipo_societario: TipoSocietario | null
  representante_legal_nombre: string | null
  domicilio_departamento: string | null
}
export type RuesLookupResponse =
  | { found: true; data: RuesLookupResult }
  | { found: false }
```

- `lookupByNit(nit: string): Promise<RuesLookupResponse>`
- Uses `AbortController` with `signal.setTimeout(2000)` (or manual timeout)
- Fetches from RUES public API endpoint (URL in `.env.local` as `RUES_API_BASE_URL`)
- Maps RUES `tipo_sociedad` codes to `TipoSocietario` enum; unmapped → `null`
- On fetch error, timeout, or non-2xx: returns `{ found: false }` — never throws

### API route (rues-lookup/route.ts)

- `POST /api/empresa/rues-lookup` body: `{ nit: string }`
- Validates NIT format with `Step1Schema.shape.nit.safeParse(nit)`
- Calls `lookupByNit`; returns result as JSON
- Returns 400 on invalid NIT; 200 + `{ found: false }` on timeout/not-found
- Requires `authenticated` session (check Supabase server client)

### Design Rationale (SRP)

Service encapsulates RUES API concerns; route handles HTTP contract. Components never call RUES directly — always through the route to keep API keys server-side.

## Dependencies

Requires T1 — `Step1Schema` for NIT validation, `TipoSocietario` for mapping.

## Done When

- [ ] `lookupByNit` exported from `src/lib/services/rues-lookup.ts`
- [ ] Returns `{ found: false }` (not throw) on timeout or API error
- [ ] API route at `/api/empresa/rues-lookup` responds 200/400 as specified
- [ ] `RUES_API_BASE_URL` documented in `.env.example`
- [ ] Unit test: `lookupByNit` with mocked fetch timeout returns `{ found: false }`
- [ ] `npm run build` succeeds
