---
name: MVP scope
description: The constraining definition of what COLTRATOS' MVP is — load on every /nybo-plan to keep specs inside the agreed surface area.
type: product
---

# MVP scope

## What this file is and when to load it

The frozen, opinionated definition of the COLTRATOS MVP: what we are building, the user journey that must work end-to-end, and the in-scope feature list. Load this file at the start of any planning, spec, or implementation session in this repo. If a proposed feature is not in this scope, it is out of scope by default — see `anti-goals.md` for the explicit exclusions and `quality-bars.md` for the measurable bars below which the MVP is not "ready."

## Product thesis

**MUST** answer two sequential user questions: *(1) which open Procesos match my profile? (2) for each one, do I qualify?*

The product is a web app where a registered Colombian company discovers open SECOP II Procesos that match their profile (via semantic search, structured filters, and a "match my profile" toggle), then uploads the pliego PDF for any Proceso of interest and receives a semáforo verdict (verde / amarillo / rojo) for each requisito habilitante (jurídico, técnico, financiero/de experiencia), with a citation back to the source PDF. The verdict is exportable as a shareable PDF report. Direct Proceso ID entry remains available as a fallback for Procesos not surfaced by discovery.

**MUST NOT** be positioned, scoped, or specced as "a procurement intelligence platform," "AI-powered bid optimization," or a marketplace. Those framings invite scope creep that the timeline cannot absorb.

Source: docs/mvp-definition.md §1 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

## Audience constraint

**MUST** target Colombian companies — including large contractors and active subcontractors — that bid heavily on SECOP II and need both discovery (finding the right Procesos) and eligibility screening. Pilot interviews (2026-05-04, n=6) confirmed discovery is the primary pain point: pilots do not lack time to review pliegos, they lack a reliable way to find the right Procesos in the first place.

**MUST NOT** design for the general public-procurement-curious or companies that rarely bid. A pilot that does not regularly need to find and screen Procesos is a tire-kicker.

Source: docs/mvp-definition.md §2 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

## End-to-end user journey (every step is load-bearing)

The MVP is functional only if all ten steps work in sequence. If any step breaks, the MVP is not functional — everything else is optional.

1. **Sign up.** Email + password, email verification, password reset.
2. **Company profile.** Single-form profile fillable in under 15 minutes with a RUP in hand: datos legales (NIT, razón social, representante legal), capacidad financiera (ingresos operacionales 3 años, patrimonio, indicadores), experiencia (contratos previos), capacidad técnica (equipo clave). **MUST** be the source of truth the semáforo matches against — wrong profile, wrong verdict.
3. **Discover Procesos.** User searches open Procesos by keyword (semantic search over `objeto_a_contratar`), structured filters (modalidad, location, value range, deadline, UNSPSC code), and/or the "match my profile" toggle that auto-applies criteria from the company profile. System queries `procesos_index` (local denormalized table synced from datos.gov.co every 6 hours). Results show: número, entidad, objeto, modalidad, valor estimado, fecha de cierre.
4. **Select a Proceso or enter ID directly.** Clicking a discovery result pre-fills the Proceso. Users who arrive with a `numero_proceso` from SECOP II can also enter it directly — system fetches from `procesos_index` first, calls datos.gov.co SODA API on miss, marks `proceso_lookup_status` accordingly.
5. **Fallback for un-indexed Procesos.** If neither index nor API returns a result, user manually enters número, entidad, objeto and proceeds. The Proceso link is marked `unverified`.
6. **Upload the pliego.** User downloads the pliego manually from SECOP II and uploads it. **MUST** require an explicit declaration: *"Declaro que este es el documento oficial publicado en SECOP II, sin modificaciones."* IP, timestamp, file SHA-256, and uploader identity are recorded.
7. **Extraction and matching.** System extracts requisitos habilitantes into a structured list (text, type, source page, source quote), then matches each against the profile and assigns verde / amarillo / rojo + one-sentence reason + confidence score.
8. **Results.** Overall verdict at top (e.g. *"7 verde, 3 amarillo, 2 rojo — no aplica"*), then the requisito list, each clickable to show the source quote and open the PDF at that page.
9. **Export.** Server-rendered PDF report with logo, company profile snapshot, requisito table, timestamp, and a disclaimer stating the analysis is automated and the user is responsible for the final bid decision.
10. **Re-run.** User can re-run analysis on the same Proceso after editing their profile, **without** re-uploading the pliego.

Source: docs/mvp-definition.md §3 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

## In-scope surface

- **Auth:** email + password, email verification, password reset. One user per company. **MUST NOT** add SSO, SAML, or roles.
- **Multi-tenancy:** row-level isolation by `company_id`, enforced on every table and every query. See `domains/database.md`.
- **Storage:** pliegos in Supabase storage with per-tenant prefix. **MUST** auto-delete after 90 days unless the user pins. Verdicts stored indefinitely.
- **Proceso discovery:** semantic search over `objeto_a_contratar` (pgvector + OpenAI text-embedding-3-small), structured filters (modalidad, location, value range, deadline, UNSPSC), "match my profile" toggle. Data source: `procesos_index` table synced from datos.gov.co SODA API every 6 hours. See `domains/integrations.md`.
- **SECOP II Proceso lookup (fallback):** direct lookup by `numero_proceso` via datos.gov.co SODA API, server-side cached 24h. Graceful fallback to manual entry when neither index nor API returns a result. See `domains/integrations.md`.
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->
- **PDF handling:** text-layer extraction first, OCR fallback for image-only pages, libraries (not regex) for tables. Pages with no extractable content **MUST** be flagged in the result, not silently dropped.
- **Extraction:** Claude Sonnet with prompt caching on system prompt and document. Output is schema-validated JSON. On schema-validation failure, retry once with a repair prompt; on second failure, surface a partial result with a warning.
- **Semáforo:** **MUST** be deterministic rules over extracted requisitos and profile. The LLM does extraction; rules do matching. Mixing them produces unexplainable verdicts.
- **Report export:** server-rendered PDF including the disclaimer.
- **Audit trail tables:** `procesos`, `pliego_uploads`, `analyses`. See `domains/database.md` for schema constraints.
- **Observability:** per-analysis log of `company_id`, `proceso_id`, `pliego_sha256`, token counts, cost, latency, extraction success rate, verdict counts. **MUST** be piped to a dashboard that is actually monitored.
- **Onboarding:** profile form completable in <15 minutes by a human with their RUP in hand.
- **Public surface:** Spanish landing page + "request access" form creating a manual approval queue. **MUST NOT** open public signup before pilots are interviewed.

Source: docs/mvp-definition.md §5
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## Decision criteria — when the MVP "works"

After 60 days with 10 onboarded pilots, the MVP is validated only if **all six** hold:

1. ≥6 of 10 pilots have run ≥3 analyses each.
2. ≥4 of 10 state in writing they would pay a defined monthly price.
3. Extraction accuracy on the eval set is stable ≥85% and not declining.
4. Cost ceiling held on every analysis run in the period.
5. Zero data-leakage incidents across tenants.
6. ≥70% of analyses originate from discovery (not direct Proceso ID entry or manual fallback).

If those numbers don't hit, the MVP works mechanically but not commercially. The decision shifts from "build more" to "find better pilots or kill it." Decide that in advance, in writing, before being emotionally invested in the next feature.

Source: docs/mvp-definition.md §7
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## Discovery success metrics (Sprint-2 gate)

These four metrics gate the discovery feature specifically. Measure after the first 30 days of pilots using discovery. All four **MUST** be instrumented at ship — not added later.

1. **Discovery → analysis conversion ≥20%.** Of Procesos clicked through in discovery results, ≥20% result in a pliego upload + analysis run. See `quality-bars.md` bar #6.
2. **Pilot-judged relevance ≥70%.** Of analyzed Procesos originating from discovery, ≥70% rated "relevant" by the pilot (thumbs survey on results page). See `quality-bars.md` bar #7.
3. **Discovery vs manual entry ratio ≥70%.** Of all analyses, ≥70% originate from discovery (not direct ID entry or manual fallback). See `quality-bars.md` bar #8.
4. **Catalog uniqueness ≥1 new Proceso per pilot per week.** Pilots report finding ≥1 Proceso per week they had not seen on SECOP II. See `quality-bars.md` bar #9.

Source: docs/product/mvp-definition.md §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->
