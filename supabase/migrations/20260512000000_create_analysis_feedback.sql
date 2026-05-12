-- T18: analysis_feedback table (REQ-026, NFR-07)
-- One row per (analysis_id, user_id). Upsert on update; delete on toggle-off.

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

-- SELECT: feedback visible to users from the same company as the analysis owner
create policy analysis_feedback_select on analysis_feedback
  for select using (
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

-- INSERT: user can only insert their own feedback for their company's analyses
create policy analysis_feedback_insert on analysis_feedback
  for insert with check (
    user_id = auth.uid() and
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

-- UPDATE: user can only update their own feedback
create policy analysis_feedback_update on analysis_feedback
  for update using (
    user_id = auth.uid() and
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

-- DELETE: user can only delete their own feedback
create policy analysis_feedback_delete on analysis_feedback
  for delete using (
    user_id = auth.uid() and
    analysis_id in (select id from analyses where company_id = auth.company_id())
  );

-- Index for recent-feedback queries (e.g. analytics dashboard)
create index idx_analysis_feedback_created_at on analysis_feedback (created_at desc);
