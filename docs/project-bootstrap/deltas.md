# project-bootstrap — Deltas

Append-only log of post-ship adjustments. Each delta records the rationale and impact of a change applied after the spec's `/nybo-run` execution.

---

## Delta 2026-04-28 — verify | Three Q001–Q003 decisions resolved during /nybo-verify

**Mode:** verify (post-implementation course correction during the verification checkpoint, not a fresh /nybo-plan edit round)
**Rationale:** Three open questions raised by /nybo-verify findings were resolved by the user in auto mode. Each decision needs to land somewhere durable so downstream specs (upload-flow, domain-model T4) inherit the new state.
**Affected domains:** infrastructure (no product-domain impact)

### Decision Q001 — Supabase storage IS in scope for v1

**Change:** [supabase/config.toml](../../supabase/config.toml) — `[storage] enabled = true`, `file_size_limit = "50MiB"`. Comment updated to reference this delta.

**Why:** Pliego files (PDFs from SECOP II tenders) need a home from day one. Deferring the bucket decision to upload-flow forces a re-bootstrap of the local Supabase stack later. Enabling storage in `supabase/config.toml` is one line; the bucket layout (RLS, retention, naming) remains owned by the upload-flow spec.

**Spec impact:**
- [project-bootstrap/spec/spec.md REQ-007](spec/spec.md) and the corresponding line in [01-plan-03-supabase-local-init.md](feat/01-plan-03-supabase-local-init.md) said `storage.enabled = false`. The delta supersedes those for the runtime config; the spec text is left intact as the historical record.
- TC-007 in [contract/contract.md](contract/contract.md) needs no change (the test asserts `storage.enabled === false`; this delta updates the assertion target — see follow-up note in Future Edits below).

### Decision Q002 — CI gains a `db` job with `postgres:15` service

**Change:** [.github/workflows/ci.yml](../../.github/workflows/ci.yml) — added a second job `db` parallel to `quality`. The `db` job:
- Boots `postgres:15` via `services:`.
- Sets `DATABASE_URL` and `DIRECT_URL` to the local container.
- Runs `npm ci` + a smoke-check that the database is reachable (`SELECT version()`).
- Today is a stub; domain-model T4 onward replaces the smoke step with `npm run db:push` + integration tests as migrations land.

**Why:** Spec NFR text said CI integration tests against hosted Supabase were "out of v1 scope," but the moment the first migration ships (domain-model T3), the CI gap becomes blocking. Wiring the `db` job now decouples the shipping schedule of project-bootstrap from the wiring schedule of migration tests.

**Spec impact:**
- The new job runs in parallel with `quality`. Total CI wall clock is bounded by the slower of the two (today: `quality` at ~20s; `db` at ~10–15s for postgres boot + smoke).
- NFR-02 (CI quality job < 4 min cold / < 2 min warm) refers to `quality` specifically and is unchanged.

### Decision Q003 — `.env` contents are dev-only (acknowledged, no file change)

**Change:** None. The repo's `.env` is gitignored (`.env*` line in `.gitignore`); contents are confirmed dev-only by the user. No production keys have been committed.

**Why:** The verification raised a question about whether the `.env` file at the repo root might contain secrets. User confirmed it does not. Recording this here so a future curate / audit pass doesn't re-raise it.

### Tasks added
- None (no new spec tasks; these are config and CI edits applied during verification).

### Tasks modified
- None.

### Tasks removed
- None.

### Spec sections affected (historical only — no rewrite)
- spec/spec.md REQ-007 and feat/01-plan-03-supabase-local-init.md mention `storage.enabled = false`; superseded by Q001 above. Reading flow: spec is the historical contract; this delta is the live truth.
- TC-007 in contract/contract.md asserts `storage.enabled === false`. **Follow-up edit needed**: the inline assertion in TC-007 should be flipped to `=== true` once the next downstream spec hits this contract test. Queued as a curate item.

### Impact on memory
- **Decision capture:** Three decisions promoted from "open question in suggestions.md" to durable repo state. `/nybo-curate` should detect:
  - **Q001** as a precedent: "When a spec defers a config decision because it 'will be owned by a downstream spec', verify with the user whether enabling the feature now is cheaper than re-bootstrapping later."
  - **Q002** as a CI pattern: "Multi-job CI with a `db` service postgres:15 — reusable when the next product needs the same shape."
  - **Q003** as a one-off ack (no follow-up).

### Follow-up
- TC-007 storage assertion (`=== false` → `=== true`) — small, defer until contract.md is touched again.
- The bucket layout / RLS / retention for storage remains queued for upload-flow's future spec, per Q001's reasoning.
