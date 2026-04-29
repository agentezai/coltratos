---
name: MVP scope
description: The constraining definition of what COLTRATOS' MVP is — load on every /nybo-plan to keep specs inside the agreed surface area.
type: product
---

# MVP scope

## What this file is and when to load it

The frozen, opinionated definition of the COLTRATOS MVP: what we are building, the user journey that must work end-to-end, and the in-scope feature list. Load this file at the start of any planning, spec, or implementation session in this repo. If a proposed feature is not in this scope, it is out of scope by default — see `anti-goals.md` for the explicit exclusions and `quality-bars.md` for the measurable bars below which the MVP is not "ready."

## Product thesis

**MUST** answer exactly one user question: *"should I bother bidding on this Proceso?"*

The product is a web app where a registered Colombian company looks up a SECOP II Proceso de Contratación, uploads its pliego PDF, and receives a semáforo verdict (verde / amarillo / rojo) for each requisito habilitante (jurídico, técnico, financiero/de experiencia), with a citation back to the source PDF, matched against a self-entered company profile. The verdict is exportable as a shareable PDF report.

**MUST NOT** be positioned, scoped, or specced as "a procurement intelligence platform," "AI-powered bid optimization," or a marketplace. Those framings invite scope creep that the timeline cannot absorb.

Source: docs/mvp-definition.md §1
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## Audience constraint

**MUST** target ten Colombian SMEs that already bid on public contracts and currently waste 2–4 hours per pliego on manual eligibility review.

**MUST NOT** design for enterprises, consultants, or the general public-procurement-curious. A pilot that does not already lose hours to this problem is a tire-kicker and burns weeks of support time for zero learning.

Source: docs/mvp-definition.md §2
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## End-to-end user journey (every step is load-bearing)

The MVP is functional only if all nine steps work in sequence. If any step breaks, the MVP is not functional — everything else is optional.

1. **Sign up.** Email + password, email verification, password reset.
2. **Company profile.** Single-form profile fillable in under 15 minutes with a RUP in hand: datos legales (NIT, razón social, representante legal), capacidad financiera (ingresos operacionales 3 años, patrimonio, indicadores), experiencia (contratos previos), capacidad técnica (equipo clave). **MUST** be the source of truth the semáforo matches against — wrong profile, wrong verdict.
3. **Start an analysis by Proceso ID.** User enters a SECOP II número de proceso (or SECOP II URL). System calls datos.gov.co SODA API, retrieves public metadata (número, entidad, objeto, modalidad, valor estimado, fechas, link), shows it for confirmation.
4. **Upload the pliego.** User downloads the pliego manually from SECOP II and uploads it. **MUST** require an explicit declaration: *"Declaro que este es el documento oficial publicado en SECOP II, sin modificaciones."* IP, timestamp, file SHA-256, and uploader identity are recorded.
5. **Fallback for un-API'd Procesos.** If lookup returns nothing, user manually enters número, entidad, objeto and proceeds. The Proceso link is marked `unverified`.
6. **Extraction and matching.** System extracts requisitos habilitantes into a structured list (text, type, source page, source quote), then matches each against the profile and assigns verde / amarillo / rojo + one-sentence reason + confidence score.
7. **Results.** Overall verdict at top (e.g. *"7 verde, 3 amarillo, 2 rojo — no aplica"*), then the requisito list, each clickable to show the source quote and open the PDF at that page.
8. **Export.** Server-rendered PDF report with logo, company profile snapshot, requisito table, timestamp, and a disclaimer stating the analysis is automated and the user is responsible for the final bid decision.
9. **Re-run.** User can re-run analysis on the same Proceso after editing their profile, **without** re-uploading the pliego.

Source: docs/mvp-definition.md §3
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## In-scope surface

- **Auth:** email + password, email verification, password reset. One user per company. **MUST NOT** add SSO, SAML, or roles.
- **Multi-tenancy:** row-level isolation by `company_id`, enforced on every table and every query. See `domains/database.md`.
- **Storage:** pliegos in Supabase storage with per-tenant prefix. **MUST** auto-delete after 90 days unless the user pins. Verdicts stored indefinitely.
- **SECOP II Proceso lookup:** single integration with datos.gov.co SODA API, by ID, server-side cached 24h. Graceful fallback to manual entry. **MUST NOT** ship a browse, filter, or search index. See `domains/integrations.md`.
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
6. ≥70% of analyses are linked to a verified Proceso ID (not manual fallback).

If those numbers don't hit, the MVP works mechanically but not commercially. The decision shifts from "build more" to "find better pilots or kill it." Decide that in advance, in writing, before being emotionally invested in the next feature.

Source: docs/mvp-definition.md §7
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
