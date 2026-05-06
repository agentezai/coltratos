# B4: Embedding Sync

## Scope

- `lib/secop/embeddings.ts` — embedding job; selects stale rows, batches to OpenAI, writes vectors

## Logic

1. Accept `ids: string[]` (from B3 `changedIds`) OR run full scan if no IDs provided (for recovery)
2. Select rows from `procesos_index` where `id = ANY(ids)` AND (`embedded_at IS NULL` OR row was changed per B3 signal)
3. Batch into groups of ≤ 100 rows (OpenAI `text-embedding-3-small` batch limit)
4. For each batch: call `openai.embeddings.create({ model: 'text-embedding-3-small', input: [objeto_a_contratar, ...] })`
5. Update `embedding = vector(result)` and `embedded_at = now()` for each row in the batch
6. Write one `embedding_events` row per batch via `TelemetryLogger.logEmbeddingEvent`:
   - `use_case: 'sync'`
   - `company_id: null` (system job — no company context)
   - `input_tokens: response.usage.total_tokens`
   - `cost_usd: computeEmbeddingCost(input_tokens)` (from cost-observability pricing table)
   - `model: 'text-embedding-3-small'`

## Rate Limiting

- Process batches sequentially (no concurrent OpenAI calls) to stay within rate limits
- Pause 200ms between batches if batch count > 5
- On OpenAI error for a batch: log to stderr, skip the batch, preserve existing `embedding` and `embedded_at` values, continue with next batch

## Interface Exported by This Module

```typescript
// lib/secop/embeddings.ts
export async function runEmbeddingSync(ids?: string[]): Promise<{
  embedded: number
  skipped: number
  failed: number
}>
```

B3 calls `runEmbeddingSync(changedIds)`. Can also be invoked standalone for full-index recovery.

## Cost Calculation

Uses the `PRICING` constant from `src/lib/telemetry/pricing.ts` (defined by cost-observability). Formula: `(input_tokens * EMBEDDING_PRICE) / 1_000`.

## Dependencies

- B3 must be implemented (supplies `changedIds`)
- `TelemetryLogger` from `src/lib/telemetry/` (cost-observability feature)
- `OPENAI_API_KEY` set (B1)
- `procesos_index` has `embedded_at` column (domain-model-mvp rev 3)

## Done When

- [ ] `runEmbeddingSync(['id-1', 'id-2'])` with mocked OpenAI calls OpenAI for those IDs only
- [ ] Rows with `embedded_at` set and unchanged `objeto_a_contratar` are skipped
- [ ] `embedded_at` updated to `now()` after successful embedding
- [ ] `embedding` value not overwritten on OpenAI failure (existing value preserved)
- [ ] One `embedding_events` row inserted per batch with `use_case='sync'`, `company_id=null`
- [ ] `input_tokens` in `embedding_events` matches OpenAI `usage.total_tokens`
- [ ] Batch size ≤ 100 rows per OpenAI call (test with 150 rows → 2 OpenAI calls)
- [ ] Returns `{ embedded, skipped, failed }` summary
