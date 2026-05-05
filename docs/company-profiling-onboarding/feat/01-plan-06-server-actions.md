# T6: Server Actions — saveCompanyProfile + getCompanyProfile

## Scope

- `src/lib/actions/company-profile.ts` — server actions (new file)

## Changes

### saveCompanyProfile

```typescript
'use server'
export async function saveCompanyProfile(
  raw: unknown
): Promise<{ ok: true; profileId: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }>
```

Steps:
1. Parse raw with `CompanyProfileSchema`; return `{ ok: false, fieldErrors }` on Zod failure
2. Validate NIT DV with `validarDigitoVerificacion`; return 422-equivalent on failure
3. Validate all date ranges in contratos_previos and personal_clave
4. Get authenticated session via Supabase server client; return `{ ok: false, error: 'unauthorized' }` if absent
5. Compute derived indicators via `computarIndicadoresFinancieros(data.ejercicios_fiscales)`
6. In a single DB transaction:
   a. `UPDATE company_profiles SET is_current = false WHERE company_id = ? AND is_current = true`
   b. `SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM company_profiles WHERE company_id = ?`
   c. `INSERT INTO company_profiles (...all fields..., version = next_version, is_current = true)`
   d. `UPDATE companies SET current_profile_id = new_id WHERE id = company_id`
7. Return `{ ok: true, profileId: newId }`

### getCompanyProfile

```typescript
'use server'
export async function getCompanyProfile(): Promise<CompanyProfileRow | null>
```

- Requires authenticated session
- Returns `SELECT * FROM company_profiles WHERE company_id = ? AND is_current = true LIMIT 1`
- Parses JSONB fields with Zod schemas before returning

### Design Rationale (SRP)

All versioning logic (transaction, version increment, is_current flip) lives in one action. No component touches the DB directly.

## Dependencies

T3 (Kysely types), T4 (RUES lookup NIT validator referenced, not called here).

## Done When

- [ ] `saveCompanyProfile` inserts new version; previous is_current = false
- [ ] `saveCompanyProfile` returns fieldErrors on Zod failure; does not write DB
- [ ] `saveCompanyProfile` returns error on invalid NIT DV; does not write DB
- [ ] `getCompanyProfile` returns null if no profile exists
- [ ] Unauthenticated call to either action returns `{ ok: false, error: 'unauthorized' }`
- [ ] `npm run build` succeeds
