# Progress: secop-ingestion-and-listing

### P1: Schema + Env
- [ ] Implement P1: Enable pgvector extension; write migration SQL (secop_procesos with embedding vector(1536) + embedded_at, secop_sync_state, embedding_cost_log, search_log, get_empresa_enrichment function, search_procesos_semantic function); add OPENAI_API_KEY to env Zod schema
- [ ] Verify P1: Migration clean; all four tables exist; embedding column present; build fails on missing OPENAI_API_KEY; types include new tables

### P2: SODA Client
- [ ] Pre-code: fetch and commit `specs/secop/dataset-schema-snapshot.json`
- [ ] Pre-code: capture 5-10 real SODA rows into `__fixtures__/secop/`
- [ ] Implement P2: Write `lib/secop/types.ts`, `soql.ts`, `client.ts`, `mapper.ts`
- [ ] Verify P2: All mapper unit tests pass; pagination correct; retry tested; no secret in logs

### P3: Cron Sync
- [ ] Implement P3: Write `/api/cron/sync-secop/route.ts` + pruning step + update `vercel.json` (schedule `0 */6 * * *`)
- [ ] Verify P3: Auth gate; idempotency; prune runs; partial resume; cron config is 6h

### P5: Embeddings
- [ ] Implement P5: Write `lib/secop/embeddings.ts` with change-detection gate, 20-row batching, cost logging; integrate into cron route
- [ ] Verify P5: Change-detection correct; OpenAI not called for unchanged rows; cost always logged; no key leakage

### P4: /api/procesos
- [ ] Implement P4: Write route with structural + vector search paths, profile-match filter derivation, search_log INSERT, get_empresa_enrichment, stats, pagination, sort; write `/api/procesos/[id]` direct lookup route; update `src/types/domain/procesos.ts` with match_score + SearchLogEntry
- [ ] Verify P4: All filter + search path + enrichment + stats + logging scenarios; tenant isolation; cache header is private

<!-- P5 inserted before P4 — embeddings required for vector search path -->
