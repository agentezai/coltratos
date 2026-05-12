# Domain: integrations

## What this file is and when to load it

The four external integrations the COLTRATOS MVP depends on, with the constraints and failure modes for each. Load this file at the start of any session that calls an external API, designs caching/retry behavior, sets up storage paths, or estimates per-analysis cost. The MVP **MUST NOT** add a fifth external integration without revisiting product scope.

## Conventions

- **MUST** use datos.gov.co SODA API in exactly two patterns: (a) **bulk sync** — fetch all currently-open Procesos into `procesos_index` on a 6-hour cadence, storing `numero_proceso`, `entidad`, `objeto_a_contratar`, `modalidad`, `valor_estimado`, `fecha_apertura`, `fecha_cierre`; (b) **single-record lookup** by `numero_proceso` as fallback for Procesos not found in the index. **MUST NOT** add a third usage pattern without updating this file. Source: docs/mvp-definition.md §5 (SECOP II Proceso lookup) + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->
- **MUST** cache datos.gov.co single-record lookup responses server-side with a 24-hour TTL — Procesos rarely change once published. (Bulk sync runs on its own 6h cadence; TTL does not apply to the sync job.) Source: docs/mvp-definition.md §5 (SECOP II Proceso lookup)
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** fall back gracefully to manual entry when the lookup returns nothing or errors — never block the user behind the integration. Source: docs/mvp-definition.md §3 step 5, §5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** use Anthropic Claude Sonnet for requisito extraction. Source: docs/mvp-definition.md §5 (Extraction).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** enable Anthropic prompt caching on both the system prompt and the document content — this is the lever that makes the per-analysis cost target (≤$0.04 on 200 pages) achievable. Source: docs/mvp-definition.md §4, §5 (Extraction).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** validate model output against a JSON schema; on validation failure retry once with a repair prompt; on second failure surface a partial result with a warning. Source: docs/mvp-definition.md §5 (Extraction).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** include all model calls (extraction, repair retries, OCR fallback) in the per-analysis cost log — not just the happy path. Source: docs/mvp-definition.md §4.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** store pliego files in Supabase storage under a per-tenant prefix and auto-delete after 90 days unless pinned. Source: docs/mvp-definition.md §5 (Storage).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** author a Supabase storage policy explicitly for every new bucket or path convention — database RLS does not cover storage policies automatically. Source: docs/mvp-definition.md §5 (Multi-tenancy, Storage).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** extract PDF text with text-layer first, OCR (Tesseract or a cheap API) as fallback for image-only pages, and library-based table parsing — never regex on PDF text. Source: docs/mvp-definition.md §5 (PDF handling).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** flag pages that yield no extractable content in the analysis result, never silently drop them. Source: docs/mvp-definition.md §5 (PDF handling), quality bar #5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST NOT** scrape SECOP II for pliegos — the document is not in the API; manual upload is the constraint. Source: docs/mvp-definition.md §5 (SECOP II Proceso lookup), §6.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** use OpenAI `text-embedding-3-small` for embedding `objeto_a_contratar` fields during bulk sync into `procesos_index`. Embeddings stored as pgvector in Supabase. Cost ceiling: <$2/year at MVP scale (≈ 50k Procesos/year × 128 tokens × $0.00002/1k tokens). **MUST** be included in the cost-observability dashboard. Source: docs/product/mvp-definition.md §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

## Patterns

**datos.gov.co SODA — Procesos dataset.** The dataset ID referenced in the MVP doc is `p6dx-8zbt` (or current equivalent — verify before first integration call). Fields surfaced to the user: `numero`, `entidad`, `objeto`, `modalidad`, `valor estimado`, `fecha de apertura`, `fecha de cierre`, plus a link back to the SECOP II detail page. The full JSON response is persisted as a snapshot in `analyses.proceso_metadata_snapshot` at the moment of analysis (see `domains/database.md`).

**datos.gov.co SODA — Bulk sync for discovery.** The bulk sync job fetches all Procesos with `estado = abierto` every 6 hours. Fields synced into `procesos_index`: `numero_proceso`, `entidad`, `objeto_a_contratar`, `modalidad`, `cuantia_proceso`, `fecha_de_publicacion_del_proceso`, `fecha_limite_de_recepcion`. After sync, OpenAI `text-embedding-3-small` computes embeddings on `objeto_a_contratar` for any new or updated row (stored as pgvector). Embeddings for unchanged rows are preserved. Sync errors are logged and increment a `sync_failure_count` metric but do **not** block analysis flow — the single-record lookup fallback remains available.
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

**Anthropic prompt-caching layout.** The cacheable prefix is (a) the system prompt and (b) the extracted document content; the instruction tail varies per analysis. Cache hits on the document body across re-runs (user re-runs after profile edit, journey step 9) must be observable in the per-analysis cost log so regressions are visible.

**PDF citation fallback (text-search miss).** When text-search highlight fails to locate an extracted quote in the rendered PDF, surface an amber "Cita no encontrada en el texto del PDF" chip rather than silently missing. Never drop the citation silently. This is the documented fallback when extracted text differs from rendered text. Source: coltratos-app-ui T15, S6 Flag F-2.
<!-- added: 2026-05-12 | feature: coltratos-app-ui | confidence: high | verified: 2026-05-12 -->

## Gotchas

**datos.gov.co lag and purges.** Recently-closed Procesos can be purged or re-keyed without notice; recently-published Procesos can take hours to appear. The fallback path (manual entry, `proceso_lookup_status = unverified`) is not a degraded mode — it is a first-class flow that must work end-to-end.

**Cost log must include retries and OCR.** Per-analysis cost (per `quality-bars.md` bar #2) must include the repair retry on schema-validation failure and any OCR API calls. Logging only the happy-path Sonnet call understates cost and lets regressions hide.
