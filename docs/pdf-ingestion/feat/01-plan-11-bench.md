# T11: Performance Benchmark — 200-page p95 <2 min

## Scope

- `tests/bench/pdf-ingestion.bench.ts` — vitest benchmark
- `package.json` — add `test:bench` script if missing

## Changes

### Benchmark (REQ-022, NFR-01)

`tests/bench/pdf-ingestion.bench.ts` filters the corpus to pliegos ≤200 pages and runs each through `processPliegoUpload` ≥10 times, measuring end-to-end duration (storage fetch + inner pipeline + writeback to in-memory repo).

```typescript
import { bench, describe } from 'vitest'

describe('pdf-ingestion 200-page p95', () => {
  for (const fixture of getCorpusFixtures().filter(f => f.pages <= 200)) {
    bench(`${fixture.name} (${fixture.pages} pages)`, async () => {
      await processPliegoUpload(fixture.id, { repo: inMemoryRepo() })
    }, { iterations: 10 })
  }
})
```

### Assertion

After the bench completes, aggregate all per-iteration durations across all fixtures and compute global p95. Assert `p95 < 120000` (2 minutes).

### Memory probe

A separate test invokes `process.memoryUsage()` before and after a single 200-page ingestion and asserts RSS delta < 1GB. Soft target — not a CI gate, but logged.

### CI wiring

- `npm run test:bench` runs the benchmark.
- CI runs `test:bench` on the same job as `test`. Failures fail the build.

### Design Rationale

This task ships zero production code. It binds the p95 performance gate to CI.

## Dependencies

Requires T9 (corpus). Indirectly requires T8.

## Done When

- [ ] `tests/bench/pdf-ingestion.bench.ts` exists.
- [ ] `npm run test:bench` runs and asserts p95 < 120000ms over the corpus.
- [ ] Memory probe (soft target, not a gate) logs RSS delta per fixture.
- [ ] CI integrates `test:bench` on the same job as `test`.
- [ ] File stays under 200 lines.
