# Domain: database

## What this file is and when to load it

Cross-cutting data-model conventions for COLTRATOS that apply to every table and every query. Load this file at the start of any session that creates a migration, designs a query, defines an RLS policy, writes audit-trail logic, or introduces a new persisted entity. These rules are non-negotiable — violating any of them is a P0 incident waiting to happen.

## Conventions

- **MUST** enforce row-level isolation by `company_id` on every table that holds tenant data, with the RLS policy declared at table-creation time, not retroactively. Source: docs/mvp-definition.md §5 (Multi-tenancy).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** record SHA-256 hash, uploader identity, IP, and timestamp on every pliego upload — regardless of whether the shared-pool feature is exposed in the UI. Source: docs/mvp-definition.md §3 step 4, §5 (Audit trail).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** snapshot external-data responses as JSONB at the time they are consumed: `analyses.proceso_metadata_snapshot` holds the datos.gov.co response that drove that analysis. Source: docs/mvp-definition.md §5 (Audit trail).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST NOT** re-fetch and re-render historical Procesos from the live API — verdicts must remain reproducible if the source dataset changes. Source: docs/mvp-definition.md §5 (Audit trail).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** mark every analysis with `proceso_lookup_status` of `verified | unverified | failed`, surfaced to the user in the UI. Source: docs/mvp-definition.md §3 step 5, §5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST NOT** add a `colaborador` entity, `users_companies` join table, or any relationship type whose semantics are not yet defined — answer "who uploaded what" by querying `pliego_uploads` directly. Source: docs/mvp-definition.md Appendix.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** retain pliego files in Supabase storage with a per-tenant prefix (e.g. `companies/<company_id>/pliegos/<sha256>.pdf`) and auto-delete after 90 days unless the user pins them. Source: docs/mvp-definition.md §5 (Storage).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** retain rows in `analyses` indefinitely — the JSONB snapshot is what makes the verdict reproducible after the file is gone. Source: docs/mvp-definition.md §5 (Audit trail).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** insert a new `analyses` row on re-run, never mutate the existing one — verdict history is part of the audit trail. Source: docs/mvp-definition.md §3 step 9, §5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## Patterns

**The three audit tables.** The MVP data model centers on three tables; every analysis-related query reads from this triangle:

- `procesos` — one row per SECOP II Proceso, identified by `numero_proceso`. Holds the JSONB snapshot of the datos.gov.co response. **Not tenant-scoped** — multiple companies can reference the same row.
- `pliego_uploads` — one row per physical upload. Fields: `id`, `proceso_id`, `uploaded_by_company_id`, `file_sha256`, `file_storage_key`, `uploaded_at`, `uploader_ip`, `declaration_accepted_at`, `status` (`active | flagged | superseded`). **Tenant-scoped** by `uploaded_by_company_id`.
- `analyses` — one row per analysis run. Fields include `proceso_id`, `company_id`, `pliego_upload_id`, `verdict`, `created_at`, `proceso_metadata_snapshot` (JSONB), `proceso_lookup_status`, plus token / cost / latency fields. **Tenant-scoped** by `company_id`.

## Gotchas

**`procesos` is shared, not tenant-scoped.** This is the one exception to the company_id RLS rule. Inserts to `procesos` are upserts on `numero_proceso`; reads can return a row that was created by another company. Scope every user-visible "my Procesos" query through `analyses.company_id` or `pliego_uploads.uploaded_by_company_id`, never through `procesos` directly.

**Hash collisions across pilots are a feature, not an error.** When two pilots upload the same pliego and the SHA-256 matches, the database accepts both rows and links them to the same `proceso_id`. The collision is internal data — it informs the future shared-pool design — and must not be surfaced to either user.
