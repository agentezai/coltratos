# P5: Embeddings

## Scope

- `lib/secop/embeddings.ts` — `runEmbeddingPhase(supabase)` function
- Called from `app/api/cron/sync-secop/route.ts` after each sync run
- `src/__tests__/secop-embeddings.test.ts` — unit tests

## Changes

### `lib/secop/embeddings.ts`

```ts
import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

const BATCH_SIZE = 20
const COST_PER_1K_TOKENS = 0.00002  // text-embedding-3-small pricing

export interface EmbeddingPhaseResult {
  rows_embedded: number
  tokens_used: number
  cost_usd: number
}

export async function runEmbeddingPhase(
  supabase: SupabaseClient,
): Promise<EmbeddingPhaseResult> {
  // 1. Find rows needing embedding (change-detection gate)
  const { data: pending } = await supabase
    .from('secop_procesos')
    .select('id_proceso, nombre, descripcion, socrata_updated_at, embedded_at')
    .or('embedded_at.is.null,socrata_updated_at.gt.embedded_at')
    .limit(500)  // cap per cron run to stay within timeout budget

  if (!pending?.length) {
    await logCost(supabase, { rows_embedded: 0, tokens_used: 0, cost_usd: 0 })
    return { rows_embedded: 0, tokens_used: 0, cost_usd: 0 }
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  let totalTokens = 0
  let rowsEmbedded = 0

  // 2. Process in batches of 20
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    const texts = batch.map((r) =>
      `${r.nombre ?? ''} ${r.descripcion ?? ''}`.trim().slice(0, 800)
    )

    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    })

    totalTokens += res.usage.total_tokens

    // 3. Update each row with its embedding
    for (let j = 0; j < batch.length; j++) {
      await supabase
        .from('secop_procesos')
        .update({
          embedding:   res.data[j].embedding,
          embedded_at: new Date().toISOString(),
        })
        .eq('id_proceso', batch[j].id_proceso)
    }

    rowsEmbedded += batch.length
  }

  const costUsd = (totalTokens / 1000) * COST_PER_1K_TOKENS

  // 4. Log cost
  await logCost(supabase, {
    rows_embedded: rowsEmbedded,
    tokens_used:   totalTokens,
    cost_usd:      costUsd,
  })

  return { rows_embedded: rowsEmbedded, tokens_used: totalTokens, cost_usd: costUsd }
}

async function logCost(
  supabase: SupabaseClient,
  result: { rows_embedded: number; tokens_used: number; cost_usd: number },
) {
  await supabase.from('embedding_cost_log').insert({
    rows_embedded: result.rows_embedded,
    tokens_used:   result.tokens_used,
    cost_usd:      result.cost_usd,
  })
}
```

### Change-detection logic

| Condition | Action |
|-----------|--------|
| `embedded_at IS NULL` | Row is new — embed |
| `socrata_updated_at > embedded_at` | Row was updated in SODA since last embed — re-embed |
| `socrata_updated_at <= embedded_at` | Unchanged — skip |

Never re-embed if none of the above conditions are true.

### Text input construction

Concatenate `nombre + ' ' + descripcion`, trim, slice to 800 characters. This keeps tokens well under the 8191-token limit for `text-embedding-3-small` while covering the semantically rich parts of the proceso description. Do **not** include pliego content (not available in SODA API).

### Cost estimation

At `$0.00002/1k tokens`, and assuming ~150 tokens per proceso:
- 1000 new procesos ≈ $0.003 per cron run
- 5000 new procesos (first backfill) ≈ $0.015

Cap of 500 rows per cron run limits worst-case cost to ~$0.0015/run.

### Integration with P3

In `app/api/cron/sync-secop/route.ts`, after the sync + prune phase:

```ts
import { runEmbeddingPhase } from '@/lib/secop/embeddings'

// After sync and prune:
const embeddingResult = await runEmbeddingPhase(supabaseService)
```

Return shape from cron includes embedding result:
```ts
return NextResponse.json({
  rows_synced:   rowsSynced,
  rows_pruned:   rowsPruned ?? 0,
  rows_embedded: embeddingResult.rows_embedded,
  cost_usd:      embeddingResult.cost_usd,
  status,
})
```

## Dependencies

Requires P1 (embedding column + embedded_at + embedding_cost_log table). Requires P3 (cron route must call this function). P4 vector search path requires this to have run at least once.

## Done When

- [ ] `runEmbeddingPhase` called at end of cron route and result merged into response JSON
- [ ] Rows with `embedded_at IS NULL` → embedding computed and stored; `embedded_at` set
- [ ] Re-running cron with 0 changed rows → OpenAI not called; `embedding_cost_log` shows `rows_embedded = 0`
- [ ] Rows with `socrata_updated_at > embedded_at` → re-embedded; `embedded_at` updated
- [ ] Rows with `socrata_updated_at <= embedded_at` → skipped (not re-embedded)
- [ ] `embedding_cost_log` has one new row per cron invocation
- [ ] `OPENAI_API_KEY` value never appears in application logs
- [ ] `npm run build` no type errors; `npm run test` passes
