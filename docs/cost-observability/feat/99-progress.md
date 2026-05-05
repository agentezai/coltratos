# Progress Tracker — cost-observability

**Status:** Not Started

**Current Task:** None — awaiting approval

---

## Task Checklist

### T1: Schema Migration
- [ ] Implement T1: Create `analysis_events`, `embedding_events`, `search_events` tables + RLS + indexes in migration file
- [ ] Implement T1: Add TypeScript types in `src/types/telemetry.ts`
- [ ] Verify T1: Migration applies cleanly; CHECK constraints and RLS policies pass all scenarios

### T2: TelemetryLogger Module
- [ ] Implement T2: `PRICING` constant + `computeAnalysisCost` + `computeEmbeddingCost` in `src/lib/telemetry/pricing.ts`
- [ ] Implement T2: `logAnalysisEvent`, `logEmbeddingEvent`, `logSearchEvent` in `src/lib/telemetry/logger.ts`
- [ ] Implement T2: Unit tests for pricing functions and fire-and-forget behavior
- [ ] Verify T2: All unit tests pass; no throw on Supabase failure; `query_text` truncation confirmed

### T3: Analysis Pipeline Wiring
- [ ] Implement T3: Wire `logAnalysisEvent` into requisitos-extraction (extraction + repair retry)
- [ ] Implement T3: Wire `logAnalysisEvent` into semaforo-aggregation (matching stage)
- [ ] Verify T3: Existing tests pass; telemetry called correctly per scenario

### T4: Embedding + Search Wiring
- [ ] Implement T4: Wire `logEmbeddingEvent` into ingesta-secop sync job
- [ ] Implement T4: Wire `logEmbeddingEvent` + `logSearchEvent` into procesos-listing search handler
- [ ] Implement T4: Create `/api/search/click` route for click tracking
- [ ] Verify T4: Existing tests pass; click endpoint updates `clicked_ids` correctly

### T5: Admin Dashboard
- [ ] Implement T5: Admin role guard in `app/admin/observability/layout.tsx`
- [ ] Implement T5: Aggregate query functions in `src/lib/telemetry/queries.ts`
- [ ] Implement T5: Dashboard page with all four sections (`app/admin/observability/page.tsx`)
- [ ] Verify T5: Role guard returns 403 for non-admin; dashboard renders all sections; page load < 3s

### T6: Alert Cron
- [ ] Implement T6: Alert logic in `src/lib/telemetry/alerts.ts`
- [ ] Implement T6: Cron route `POST /api/cron/alert-check`
- [ ] Implement T6: Cron schedule in `vercel.json`
- [ ] Verify T6: Alert fires on cost breach; alert fires on latency breach; no alert when no breach

---

## Completion Summary

_Updated when all tasks are done._
