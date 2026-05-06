# T6: Alert Cron

## Scope

- `src/app/api/cron/alert-check/route.ts` — POST handler for the daily alert check
- `src/lib/telemetry/alerts.ts` — alert-check logic (threshold queries + notification dispatch)
- `vercel.json` or Supabase cron config — schedule the cron (daily or more frequent)

## Changes

### Alert logic (`alerts.ts`)

- Import service-role Supabase client.
- Read `ALERT_RECIPIENTS` from `process.env` — comma-separated list of emails or a Slack webhook URL. If not set, log a warning and skip notification.
- Export `runAlertCheck(): Promise<AlertCheckResult>`:
  1. Query: any `analyses` row in last 24 h with `cost_usd > 0.04`?
     ```sql
     SELECT id, company_id, cost_usd, created_at
     FROM analyses
     WHERE created_at > now() - interval '24 hours'
       AND cost_usd > 0.04
     ORDER BY cost_usd DESC
     LIMIT 5
     ```
  2. Query: rolling p95 latency from `analysis_events` in last 24 h > 480 s?
     ```sql
     SELECT percentile_cont(0.95) WITHIN GROUP (
       ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))
     ) AS p95_seconds
     FROM analysis_events
     WHERE created_at > now() - interval '24 hours'
       AND started_at IS NOT NULL AND completed_at IS NOT NULL
       AND stage = 'extraction'
     ```
  3. If either query returns a breach:
     - Build an alert payload: `{ breaches: [...], checked_at }`.
     - If `ALERT_RECIPIENTS` looks like a Slack webhook URL (`https://hooks.slack.com/...`), POST a Slack message block.
     - Otherwise, use Supabase Edge Function or Resend/SMTP to send an email (implementation detail: use whichever email mechanism is already in the stack; if none, log to stderr and note as a TODO).
  4. Return `AlertCheckResult` with breach details and notification status.

### Cron route (`route.ts`)

- `POST /api/cron/alert-check` — callable by Vercel Cron or Supabase cron.
- Authenticate: verify `Authorization: Bearer <CRON_SECRET>` header where `CRON_SECRET` is an env var. Return 401 if missing or wrong.
- Call `runAlertCheck()`.
- Return `{ ok: true, breaches: result.breaches.length }`.
- On error: return 500 with `{ ok: false, error: message }`.

### Schedule configuration

- For Vercel: add to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/alert-check", "schedule": "0 9 * * *" }] }
  ```
  (Daily at 09:00 UTC — adjust to pilot timezone if needed.)
- For Supabase cron (alternative if Vercel cron is not available): document the `pg_cron` expression in a comment at the top of `alerts.ts`.

### Design Rationale (Minimal Alert Surface)

Email/Slack is the simplest alert delivery that meets the "same-day" requirement. No PagerDuty or
OpsGenie at MVP scale. The `ALERT_RECIPIENTS` env var keeps recipients out of code and lets the
team update the list without a deployment.

## Dependencies

Requires T1 — service-role queries against `analysis_events` and `analyses` tables.
Requires T5 — some query logic from `queries.ts` may be reused.

## Done When

- [ ] `POST /api/cron/alert-check` returns 401 without `CRON_SECRET` header
- [ ] `POST /api/cron/alert-check` returns 200 when no threshold is breached
- [ ] Alert fires in dev when `cost_usd > 0.04` analysis is seeded (TC-009)
- [ ] Alert fires in dev when p95 latency > 480 s is seeded (TC-010)
- [ ] `ALERT_RECIPIENTS` env var controls recipient list — not hard-coded
- [ ] Cron schedule is declared in `vercel.json` (or documented alternative)
- [ ] TypeScript compiles without errors
