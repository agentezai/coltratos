---
name: Anti-goals
description: Explicit list of features that are OUT of MVP scope — load on every /nybo-plan to reject scope creep before it enters a spec.
type: product
---

# Anti-goals

## What this file is and when to load it

The list of features that feel important but **MUST NOT** be built in the MVP. Load this file alongside `mvp-scope.md` whenever planning a new spec. If a proposed feature appears in this list, the spec **MUST** be rejected or deferred — do not negotiate. These exclusions exist because each one would consume timeline disproportionate to the hypothesis it would validate.

Treat this list with the same weight as the in-scope list. Scope discipline is not "say yes to good ideas later"; it is "say no to good ideas now."

## What is NOT in the MVP

- **Shared pliego pool exposed to users.** Internal hashing yes (see `domains/database.md`); user-visible reuse no. **MUST NOT** ship until terms-of-service for shared documents are designed and a contribution-recognition mechanic is in place.
- **Compensation / rewards / referral fees** to companies who contribute pliegos. Captured in the data model only — uploader identity is recorded — **MUST NOT** be surfaced as a product feature.
- **Browsing or searching Procesos inside Coltratos.** Users find Proceso IDs on SECOP II's portal and bring them in. Discovery UX is deferred until pilot behavior justifies it. **MUST NOT** add a browse, filter, or search index.
- **Auto-fetching pliegos from SECOP II.** The pliego document is not in the API. Manual upload is a constraint, not a UX choice. **MUST NOT** scrape SECOP II.
- **Adendas, prepliegos, contratos firmados.** **MUST** handle `pliego definitivo` only.
- **Billing and payments.** Pilots are free for 60 days. **MUST NOT** add charging until COP/IVA invoicing, retención rules, and legal entity setup are decided — and only after willingness-to-pay is validated.
- **Team accounts and roles.** **MUST** be one user per company.
- **API access for pilots.**
- **Notifications, email digests, or alerts** on new SECOP II tenders.
- **Bid drafting, document generation, or recommendations** beyond the semáforo. Adding these shifts the value prop from *"saves me 2 hours"* (concrete, testable) to *"AI helps with bidding"* (vague, unmeasurable).
- **Mobile app.** Mobile-responsive web is enough.
- **Multi-language.** Spanish only.
- **Admin panel** beyond what direct DB access provides.
- **A "Design System" as a top-level spec.** Tailwind plus a component library plus 20 hours of taste is enough. Every hour on the design system is an hour not spent on extraction accuracy, which is the only thing that decides whether the product works.
- **A separate "Domain Model" spec.** The model is `Company`, `CompanyProfile`, `Proceso`, `PliegoUpload`, `Analysis`, `Requisito`, `Verdict`. It is a schema, not a spec.
- **A `colaborador` entity.** What looks like a colaborador is a query against `pliego_uploads`. **MUST NOT** add a relationship type whose semantics are not defined yet.

Source: docs/mvp-definition.md §6 and Appendix
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## Out-of-MVP backlog (designed only with pilot data)

These are deferred but tracked. Each requires data from the 60-day pilot before it can be designed:

- **Shared pliego pool** with terms-of-service for contributing/consuming, flag-and-replace flow, and contributor recognition.
- **Contribution reward mechanic** — designed against real hash-collision data. If pilots never overlap on the same Proceso, the mechanic is a non-issue. If they do, the design is informed by which Procesos overlap.
- **Proceso discovery / search UI** if and only if pilots ask for it specifically with named filters they want.
- **Billing**, with pricing informed by the willingness-to-pay conversations from MVP decision criterion #2.

Source: docs/mvp-definition.md §8
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
