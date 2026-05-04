# Progress: secop-ingestion-and-listing

### P1: Schema + Env
- [ ] Implement P1: Write migration SQL; apply to Supabase; regenerate TS types; add env vars; write `lib/env.ts` Zod validator
- [ ] Verify P1: Migration clean; build fails on missing env; types include new tables

### P2: SODA Client
- [ ] Pre-code: fetch and commit `specs/secop/dataset-schema-snapshot.json`
- [ ] Pre-code: capture 5-10 real SODA rows into `__fixtures__/secop/`
- [ ] Implement P2: Write `lib/secop/types.ts`, `soql.ts`, `client.ts`, `mapper.ts`
- [ ] Verify P2: All mapper unit tests pass; pagination correct; retry tested; no secret in logs

### P3: Cron Sync
- [ ] Implement P3: Write `/api/cron/sync-secop/route.ts` + update `vercel.json`
- [ ] Verify P3: Auth gate; idempotency; partial resume; cron config present

### P4: /api/procesos
- [ ] Implement P4: Write route with Zod validation, multi-select filters, enrichment (get_empresa_enrichment), stats, pagination, sort
- [ ] Verify P4: All filter + enrichment + stats + pagination scenarios; tenant isolation; cache header is private

<!-- P5 removed: frontend redesign lives in the `procesos-listing` spec -->
