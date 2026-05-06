# T5: Admin Dashboard

## Scope

- `src/app/admin/observability/page.tsx` — server component rendering the four dashboard sections
- `src/app/admin/observability/layout.tsx` — admin role guard (shared with other future admin routes)
- `src/lib/telemetry/queries.ts` — server-side aggregate query functions (service-role Supabase)
- `src/app/admin/observability/_components/` — section components (CostSection, LatencySection, ExtractionQualitySection, DiscoveryMetricsSection)

## Changes

### Admin role guard (`layout.tsx`)

- In the layout server component, read the current session via `createServerClient()`.
- Query `users` table: `SELECT role FROM users WHERE id = auth.uid()`.
- If `role !== 'admin'`, return `notFound()` or throw `redirect('/403')` — do not render children.
- This guard applies to all routes under `app/admin/`.

### Aggregate query functions (`queries.ts`)

Use the service-role Supabase client (server-only import). Implement:

- `getCostMetrics(days = 30)`: returns per-analysis cost distribution (array of `{ analysis_id, cost_usd, created_at, company_id }`), 7-day rolling average, top-10 highest-cost analyses.
  ```sql
  SELECT a.id, a.company_id, SUM(ae.cost_usd) as total_cost, a.created_at
  FROM analyses a
  JOIN analysis_events ae ON ae.analysis_id = a.id
  WHERE a.created_at > now() - interval '30 days'
  GROUP BY a.id, a.company_id, a.created_at
  ORDER BY total_cost DESC
  ```
- `getLatencyMetrics(days = 30)`: p50/p95 per stage and end-to-end from `analysis_events`.
  ```sql
  SELECT stage,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) AS p50,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) AS p95
  FROM analysis_events
  WHERE created_at > now() - interval '30 days'
    AND started_at IS NOT NULL AND completed_at IS NOT NULL
  GROUP BY stage
  ```
- `getExtractionQualityMetrics(days = 30)`: percentage of analyses with `estado = 'completed'` (full success), `'failed'`, and implied partial (completed with partial verdict). Rolling 7-day and 30-day windows.
- `getDiscoveryMetrics()`: four metrics as described in REQ-013.
  - Conversion rate: `COUNT` of `search_events` with non-empty `clicked_ids` that have a linked `analyses` row started within 24 h / total `search_events`.
  - Avg result count: `AVG(result_count)` from `search_events` over last 30 days.
  - Discovery-vs-manual ratio: `COUNT(analyses WHERE proceso_lookup_status = 'verified') / COUNT(analyses)`.
  - Catalog uniqueness: `COUNT(DISTINCT proceso_id) FROM procesos_index`.

### Dashboard page (`page.tsx`)

- Server component. Calls the four query functions in parallel (`Promise.all`).
- Renders four sections using existing design-system tokens:
  - **Cost**: table of top-10 analyses by cost; summary card showing 7-day rolling average and whether it's above/below the $0.04 threshold.
  - **Latency**: table with stage | p50 (s) | p95 (s) rows; highlight p95 > 480s in amber.
  - **Extraction Quality**: three metric cards (% success / % partial / % failure); 7-day vs 30-day comparison.
  - **Discovery Metrics**: four metric cards.
- No client-side JavaScript required — all data is server-rendered. Refresh via browser reload.
- Route path: `/admin/observability`. Not linked from any pilot-facing navigation.

### Design Rationale (YAGNI)

No charts library, no real-time WebSocket, no pagination at MVP scale. Server-rendered tables and
cards are sufficient for internal use during the 60-day pilot. Adding interactivity is a post-pilot
enhancement.

## Dependencies

Requires T1 — telemetry tables must exist before queries can run.
T5 informs T6 (alert cron reuses some query logic from `queries.ts`).

## Done When

- [ ] `app/admin/observability/page.tsx` exists and renders all four sections
- [ ] Admin role guard returns 403 for non-admin authenticated users (manual test or TC-008)
- [ ] `queries.ts` functions execute without error against the dev Supabase instance
- [ ] Page loads in < 3s in local development with seeded data
- [ ] TypeScript compiles without errors
- [ ] No pilot-facing navigation link points to `/admin/observability`
