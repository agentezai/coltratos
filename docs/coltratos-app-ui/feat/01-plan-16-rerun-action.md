# T16: Re-run server action

## Scope

| File | Change |
|------|--------|
| `src/app/dashboard/analisis/[id]/_actions/rerun-analysis.ts` | New — `'use server'` action |
| `app/dashboard/analisis/[id]/_components/rerun-button.tsx` | New — confirms + calls action + navigates |

## Requirements

REQ-024, RN-006, RN-007. Per S6 Flag F-3, UX is option (b) — navigate to new analysis URL.

## Changes

### `rerunAnalysis(originalAnalysisId)`

Server action. Executes inside a Supabase transaction:

1. RLS-scoped lookup of the original analysis (`SELECT id, proceso_id, pliego_upload_id, proceso_lookup_status, proceso_metadata_snapshot FROM analyses WHERE id = $1 AND company_id = auth.company_id()`).
2. If not found → throw `NotFoundError`.
3. Fetch current `company_profile` snapshot for `auth.company_id()`. (If profile is missing → throw `ProfileMissingError` — pilots are required to have completed onboarding.)
4. Refresh `proceso_metadata_snapshot` only if the cached `procesos` row is older than the 24h TTL (per integrations.md). Otherwise carry the existing snapshot.
5. `INSERT` into `analyses`:
   - `proceso_id` = original
   - `pliego_upload_id` = original
   - `company_id` = `auth.company_id()`
   - `company_profile_snapshot` = current
   - `proceso_metadata_snapshot` = (refreshed or carried)
   - `proceso_lookup_status` = (refreshed or carried)
   - `extraction_status` = `'pending'`
   - `created_at` = now
6. Enqueue the extraction job for the new analysis (existing pipeline — out of this spec's scope; calls into `requisitos-extraction`).
7. Return `{ id: newAnalysisId }`.

**Invariant (RN-007):** the original `analyses` row is never read in `UPDATE` mode. Test with a `pgTAP`-style assertion or a Vitest integration test against a Supabase test schema.

### `RerunButton` (`'use client'`)

1. Wraps `<Button>Volver a analizar</Button>`.
2. On click → opens `<AlertDialog>`: "Esto creará un nuevo análisis con tu perfil actual. El análisis original se mantendrá."
3. On confirm → `await rerunAnalysis(id)` → `router.push(\`/dashboard/analisis/\${newId}\`)`.
4. On error → toast with the error message; user stays on the original page.

## Done When

- [ ] Action inserts a new `analyses` row with carried `pliego_upload_id` and `proceso_id`
- [ ] Action **never** mutates the original `analyses` row (test: snapshot original, run rerun, diff)
- [ ] Button navigates to new analysis URL on success (per S6 Flag F-3)
- [ ] Confirmation dialog copy in Spanish; cancel works
- [ ] RLS test: rerun on another company's analysis returns 404, no insert

## Dependencies

T11. Pipeline-trigger half (step 6 above) depends on `requisitos-extraction` exposing an idempotent enqueue function.
