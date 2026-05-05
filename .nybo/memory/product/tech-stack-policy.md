---
name: Tech stack policy
description: Provider matrix and selection policy for all COLTRATOS integrations — load when designing any new integration or debating provider choices to avoid re-litigating settled decisions.
type: product
---

# Tech stack policy

## What this file is and when to load it

The decided provider choices for every COLTRATOS component, plus the policy governing future choices. Load this file at the start of any spec that introduces a new API call, service dependency, or infrastructure component. If a provider is listed here, the choice is settled — do not re-debate it in a spec. If a new component is needed that is not listed, apply the default policy below before proposing a provider.

## Provider matrix

| Component | Provider | Rationale |
|---|---|---|
| Extraction LLM | Anthropic Claude Sonnet | Quality matters for requisito extraction; prompt caching on system prompt + document content achieves the ≤$0.04/analysis cost target. |
| Embeddings | OpenAI `text-embedding-3-small` | Cost is demonstrably negligible (<$2/year at MVP scale); self-hosted alternatives (sentence-transformers, etc.) require disproportionate operational overhead for no material quality gain on Spanish procurement text. |
| Database | Supabase (Postgres + pgvector) | Stack already chosen; pgvector handles embedding storage for `procesos_index` without a separate vector DB. |
| Auth | Supabase Auth | Stack already chosen. |
| Storage | Supabase Storage | Stack already chosen; per-tenant prefix, 90-day auto-delete, explicit storage policies required. |
| OCR | Tesseract (local) | API-based OCR adds material per-page cost; Tesseract quality is acceptable for SECOP II pliego PDFs. |
| PDF text extraction | pdf-parse or equivalent (local) | Mature open-source library; no API call, no cost, no network dependency. |
| Hosting | Vercel | Stack already chosen. |

## Default policy

**Prefer non-commercial / self-hosted / open-source.**

**Exception criteria** (both must hold):
1. Cost is demonstrably negligible (in cents/year at MVP scale, not cents/call), AND
2. The open alternative requires disproportionate operational overhead for the use case.

**When proposing a paid provider**, the spec **MUST** include the cost math:
- `cost_per_unit × units_per_year_at_MVP_scale = annual_cost`
- And a one-line note on what the open alternative would require operationally.

The OpenAI embeddings decision is an example of a correctly documented exception:
> `$0.00002/1k tokens × ~128 tokens/Proceso × ~50k Procesos/year ≈ $0.13/year`. Open alternative (self-hosted sentence-transformers) requires a GPU or CPU inference server, versioning, and latency management — disproportionate for a $0.13/year problem.

## What this policy is NOT

- It is not a prohibition on ever adding a new paid provider — it is a documentation requirement.
- It is not a cost cap — it is a justification requirement. A $20/year tool with no open equivalent is fine; propose it with the math.
- It does not cover internal infrastructure costs (Supabase compute, Vercel bandwidth) — those are tracked in the observability dashboard.

Source: docs/product/mvp-definition.md §4, §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->
