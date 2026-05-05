# T6: Click Event Logging

## Scope

- `app/api/search-events/route.ts` — POST handler: records clicked proceso ID in search_log
- `src/__tests__/search-events.test.ts` — unit tests

## Changes

### `app/api/search-events/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

const ClickEventSchema = z.object({
  search_id:  z.string().uuid(),
  id_proceso: z.string().min(1),
  position:   z.number().int().min(0),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth gate
  const supabaseUser = createServerClient(...)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ClickEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { search_id, id_proceso } = parsed.data

  // Append clicked_ids to the search_log row (best-effort)
  const supabaseService = createServiceRoleClient()

  await supabaseService
    .from('search_log')
    .update({
      clicked_ids: supabaseService.rpc('array_append_unique', {
        arr:      'clicked_ids',
        new_val:  id_proceso,
      }),
    })
    .eq('id', search_id)
    .then(() => {}).catch(() => {})  // fire-and-forget; never block response

  return NextResponse.json({ ok: true })
}
```

**Simpler alternative** (avoid RPC): use a Postgres function to append atomically, or just do a raw SQL append:

```sql
update search_log
set clicked_ids = array_append(clicked_ids, $id_proceso)
where id = $search_id
  and not ($id_proceso = any(clicked_ids));
```

Use `supabaseService.rpc('append_clicked_id', { p_search_id, p_id_proceso })` wrapping this SQL.

### Postgres helper function (add to P1 migration or separate migration)

```sql
create or replace function append_clicked_id(
  p_search_id  uuid,
  p_id_proceso text
) returns void language sql security definer as $$
  update search_log
  set clicked_ids = array_append(clicked_ids, p_id_proceso)
  where id = p_search_id
    and not (p_id_proceso = any(clicked_ids));
$$;
```

### Client-side integration (in T5 `ProcesosPageClient`)

Already implemented in T5 `handleRowClick`:

```ts
if (query.searchId) {
  fetch('/api/search-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_id: query.searchId, id_proceso: row.id_proceso, position }),
  }).catch(() => {})
}
```

Navigation proceeds regardless of this POST's outcome.

### `X-Search-Id` header reading (in `/api/procesos/route.ts`)

The `/api/procesos` handler must read the `X-Search-Id` header and use it as the `id` when inserting into `search_log`:

```ts
const searchId = req.headers.get('X-Search-Id') ?? crypto.randomUUID()

// In search_log INSERT:
supabaseService.from('search_log').insert({
  id:            searchId,
  company_id:    empresaId,
  query:         params.q ?? null,
  filter_object: ...,
  result_count:  ...,
  result_ids:    ...,
}).then(() => {}).catch(() => {})
```

This ensures the client-generated UUID is the same as the `search_log.id` so click events can be linked.

## Dependencies

Requires T5 (page wiring must call `handleRowClick` with `searchId`). The Postgres function must exist (add to P1 migration or a follow-up migration in ingesta-secop).

## Done When

- [ ] POST `/api/search-events` with valid `{ search_id, id_proceso, position }` → 200
- [ ] POST without auth → 401
- [ ] POST with invalid payload (missing fields, wrong types) → 400
- [ ] `search_log` row's `clicked_ids` array contains `id_proceso` after POST
- [ ] Duplicate click: same `id_proceso` not added twice (idempotent `array_append_unique`)
- [ ] POST for non-existent `search_id` → silently does nothing (no error thrown)
- [ ] `npm run build` no type errors; `npm run test` passes
