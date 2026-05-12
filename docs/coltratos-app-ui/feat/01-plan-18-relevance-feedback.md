# T18: Relevance feedback action + storage

## Scope

| File | Change |
|------|--------|
| `supabase/migrations/<ts>_create_analysis_feedback.sql` | New — table + RLS policy |
| `src/app/dashboard/analisis/[id]/_actions/submit-feedback.ts` | New — `'use server'` upsert |
| `app/dashboard/analisis/[id]/_components/feedback-thumbs.tsx` | New — `'use client'` control |
| `src/components/ui/feedback-thumbs.tsx` | New (DS extension) — generic thumbs primitive |
| `src/types/database/index.ts` | Extend — add `analysis_feedback` row type |

## Requirements

REQ-026, NFR-07.

## Changes

### Migration

```sql
create table analysis_feedback (
  analysis_id   uuid not null references analyses(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  rating        text not null check (rating in ('up','down')),
  comment       text check (comment is null or char_length(comment) <= 200),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (analysis_id, user_id)
);

alter table analysis_feedback enable row level security;

create policy analysis_feedback_select on analysis_feedback
  for select using (
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

create policy analysis_feedback_insert on analysis_feedback
  for insert with check (
    user_id = auth.uid() and
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

create policy analysis_feedback_update on analysis_feedback
  for update using (
    user_id = auth.uid() and
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

create policy analysis_feedback_delete on analysis_feedback
  for delete using (
    user_id = auth.uid() and
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

create index idx_analysis_feedback_created_at on analysis_feedback (created_at desc);
```

### `submitFeedback(input)` server action

Input: `{ analysisId: string; rating: 'up' | 'down' | null; comment?: string }`.

Behavior:
- `rating = null` → DELETE the existing row (toggle-off).
- Otherwise → UPSERT on `(analysis_id, user_id)` with `updated_at = now()`.
- RLS policies above scope writes; the action **MUST NOT** include service-role calls.

### `FeedbackThumbs` (DS primitive)

`src/components/ui/feedback-thumbs.tsx`:
```ts
type FeedbackThumbsProps = {
  initialRating: 'up' | 'down' | null;
  initialComment: string | null;
  onSubmit: (rating: 'up' | 'down' | null, comment: string | null) => Promise<void>;
};
```

UI:
- Two icon buttons (`ThumbsUp`, `ThumbsDown`). Active state is filled.
- After click: optional comment input appears (1-line, 200 char max).
- "Enviar" button submits.
- Toast confirmation on success: "Gracias por tu opinión".
- Re-clicking active thumb → calls `onSubmit(null, null)` to clear.

### Wiring

`feedback-thumbs.tsx` page-level component:
- Reads `feedbackByMe` from `AnalysisDetail` (T11).
- Wraps `FeedbackThumbs` with the action call.

## Done When

- [ ] Migration applied; `analysis_feedback` table exists with RLS enabled
- [ ] RLS test: user from another company cannot insert/select feedback for an analysis
- [ ] Upsert works (insert + update paths)
- [ ] Toggle-off (re-click active thumb) deletes the row
- [ ] Comment max length 200 chars enforced both client + DB
- [ ] Toast confirmation visible on success

## Dependencies

T11, T13.
