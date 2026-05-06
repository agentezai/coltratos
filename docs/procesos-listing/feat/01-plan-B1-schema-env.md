# B1: Schema + Environment Confirmation

## Scope

This task's only job is to (1) confirm the domain-model-mvp rev 3 migration has landed with all required `procesos_index` additions, and (2) ensure env vars are set in all environments. **No migration SQL is authored here.** All schema additions are in `domain-model-mvp rev 3`.

## Schema Authority

`procesos_index` additions required by procesos-listing land in **domain-model-mvp rev 3** (not in this spec). The rev 3 migration adds:

| Column | Type | Reason |
|--------|------|--------|
| `socrata_id` | `text` | SODA's internal row identifier for incremental sync |
| `unspsc` | `text[]` | UNSPSC codes parsed from SODA response |
| `ciudad` | `text` | Municipio/ciudad from SODA `municipio_entidad` field |
| `embedded_at` | `timestamptz` | Last embedding timestamp; B4 uses to detect stale rows |

**Telemetry tables** (`search_events`, `embedding_events`): all required columns already exist from domain-model-mvp rev 2. No additions needed. Confirmed:
- `search_events`: `id`, `company_id`, `query_text`, `filters jsonb`, `result_count`, `clicked_ids uuid[]`, `created_at` — sufficient for B5 telemetry.
- `embedding_events`: `id`, `company_id`, `use_case`, `input_tokens`, `cost_usd`, `model`, `created_at` — sufficient for B4 telemetry.

## Env Vars

Set in `.env.local` (development) and Vercel project settings (preview + production):

| Var | Description |
|-----|-------------|
| `SECOP_SODA_DATASET_ID` | datos.gov.co SODA dataset ID (e.g. `p6dx-8zbt` — verify before first call) |
| `SECOP_SODA_TOKEN` | datos.gov.co app token (optional but avoids rate limiting) |
| `OPENAI_API_KEY` | OpenAI API key for `text-embedding-3-small` (may already be set) |
| `CRON_SECRET` | Secret string for Vercel cron route auth (`Authorization: Bearer <CRON_SECRET>`) |

**Security:** All four must be absent from `.next/static` bundle. Add to `NEXT_PUBLIC_` prefix check in CI if not already present.

## Changes

- `.env.local` — add four vars (template only; actual values not committed)
- `vercel.json` — confirm env var references; do not add secrets directly
- No `supabase/migrations/` files authored here

## Dependencies

- domain-model-mvp rev 3 must be merged and deployed before B2 can run against the DB

## Done When

- [ ] `procesos_index` table has `socrata_id`, `unspsc`, `ciudad`, `embedded_at` columns (confirmed via `\d procesos_index` or Supabase Studio)
- [ ] `SECOP_SODA_DATASET_ID` non-empty in all environments
- [ ] `SECOP_SODA_TOKEN` non-empty in all environments
- [ ] `OPENAI_API_KEY` non-empty in all environments
- [ ] `CRON_SECRET` non-empty in all environments
- [ ] None of the four vars appear in the compiled frontend bundle (`grep -r "SECOP_SODA" .next/static` → 0 matches)
