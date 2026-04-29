# COLTRATOS — MVP Definition

> Status: draft for spec board
> Owner: Carlos Villa Mercado
> Last revised: 2026-04-28

---

## 1. What the MVP is

A web app where a registered Colombian company looks up a SECOP II Proceso de Contratación, uploads its pliego PDF, and — within a tolerable wait — receives a semáforo verdict (verde / amarillo / rojo) for each requisito habilitante (jurídico, técnico, financiero/de experiencia), with a citation back to the source PDF, matched against a company profile they entered themselves. The verdict is exportable as a shareable PDF report.

The system charges nothing in the MVP. Pilots are free. But the unit economics ($0.02–$0.04 per analysis) must hold so the business is real, not subsidized.

That's it. One job: **"should I bother bidding on this Proceso?"**

Not "a procurement intelligence platform." Not "AI-powered bid optimization." Not a marketplace.

## 2. Who it's for

Ten Colombian SMEs that already bid on public contracts and currently waste 2–4 hours per pliego doing manual eligibility review.

Not enterprises. Not consultants. Not "anyone interested in public procurement." If a pilot does not already lose hours to this problem, they're not a pilot — they're a tire-kicker, and they will burn weeks of support time for zero learning.

## 3. The user journey that must work end-to-end

1. **Sign up.** Email + password. Email verification. Password reset.

2. **Company profile.** User completes a single-form profile in under 15 minutes with their RUP in hand:
   - Datos legales: NIT, razón social, representante legal.
   - Capacidad financiera: ingresos operacionales (3 años), patrimonio, indicadores (liquidez, endeudamiento).
   - Experiencia: lista de contratos previos con valor, objeto, entidad, fechas.
   - Capacidad técnica/personal: equipo clave con títulos y experiencia.

   This is what the semáforo matches against. If it's wrong, the verdict is wrong.

3. **Start an analysis by Proceso ID.** User enters a SECOP II número de proceso (or pastes a SECOP II URL). Coltratos calls the datos.gov.co SODA API (`p6dx-8zbt` or current equivalent) and retrieves the Proceso's public metadata: número, entidad, objeto, modalidad, valor estimado, fecha de apertura, fecha de cierre, link to the SECOP II detail page. Metadata is shown for confirmation.

4. **Upload the pliego.** User clicks through to SECOP II via the metadata link, downloads the pliego manually (the document itself is not in the API), and uploads it to Coltratos. On upload, the user accepts a declaration: *"Declaro que este es el documento oficial publicado en SECOP II, sin modificaciones."* IP, timestamp, file SHA-256, and company identity are recorded.

5. **Fallback for un-API'd Procesos.** If the Proceso ID returns nothing (datos.gov.co lag, closed Proceso purged, or a wrong ID), the user can manually enter número, entidad, and objeto and proceed anyway. The analysis runs; the Proceso link is marked `unverified`.

6. **Extraction and matching.** System extracts requisitos habilitantes into a structured list (requisito text, type, source page, source quote). Then matches each against the company profile and assigns verde / amarillo / rojo plus a one-sentence reason and a confidence score.

7. **Results.** User sees an overall verdict at the top (e.g. *"7 verde, 3 amarillo, 2 rojo — no aplica"*), then the requisito list, each clickable to show the source quote and open the PDF at that page.

8. **Export.** User exports the verdict as a server-rendered PDF report with their logo, company profile snapshot, requisito table, timestamp, and disclaimer. The disclaimer states the analysis is automated and the user is responsible for the final bid decision.

9. **Re-run.** User can re-run analysis on the same Proceso after editing their company profile, without re-uploading the pliego.

If any step in this chain breaks, the MVP is not functional. Everything else is optional.

## 4. Non-negotiable quality bars

These are the bars below which the MVP is not "ready to be tested in production" — it's a demo.

- **Extraction accuracy: ≥85% requisito recall on a labeled eval set of at least 20 real SECOP II pliegos**, scored by a human against a ground-truth list. Not "looks good in spot checks." A versioned eval set, re-runnable, with the score visible on every prompt change. Without this, you have no idea if you're improving or regressing — and "85% accuracy" in the pitch is a lie you're telling yourself.

- **Cost per analysis: ≤$0.04 on a 200-page pliego**, measured per analysis with token counts logged. If a single pliego costs $0.12 because of a long-tail page count, the unit economics are fiction.

- **Time to verdict: ≤3 minutes p50, ≤8 minutes p95** on a 200-page pliego. Beyond that, the user closes the tab. Show real progress stages, not a fake spinner.

- **Citation correctness: every requisito has a source page number that, when clicked, opens the PDF at that page.** A wrong citation is worse than no citation — it destroys trust on the first instance.

- **Failure visibility: if extraction fails or partially fails, the user sees it.** Not a silent verde verdict on a half-parsed PDF. *"Sólo se pudieron extraer 8 de 11 requisitos — revisa con cuidado"* is a feature, not a bug.

## 5. What's in scope, concretely

### Auth
Email + password, email verification, password reset. No SSO, no SAML, no roles. One user per company.

### Multi-tenancy
Row-level isolation by `company_id`. Every table has it. Every query enforces it. Non-negotiable even in MVP — the day you forget is the day a pilot sees another pilot's data is the day the business ends.

### Storage
Pliegos in Supabase storage with a per-tenant prefix. Auto-deleted after 90 days unless the user pins them. Verdicts stored indefinitely.

### SECOP II Proceso lookup
Single integration with the datos.gov.co SODA API: fetch one Proceso by ID. Server-side cached with a 24-hour TTL (Procesos rarely change once published). Failure mode: graceful fallback to manual entry. **No browse UI. No filtering UI. No search index. Direct lookup by ID only.**

### PDF handling
Text-layer extraction first. If a page has no text layer, OCR it (Tesseract or a cheap API). Tables parsed with a library, not regex. Pages with no extractable content flagged in the result, not silently dropped.

### Extraction
Claude Sonnet with prompt caching on the system prompt and the document. Output is structured JSON validated by a schema. On schema-validation failure, retry once with a repair prompt; on second failure, surface a partial result with a warning.

### Semáforo
Deterministic rules over the extracted requisitos and company profile. The LLM does extraction; rules do matching. Mixing them is how you get unexplainable verdicts.

### Report export
Server-rendered PDF (your `pdf` skill applies). Includes the disclaimer.

### Audit trail (the pliego upload model)
This is the piece that came out of our discussion and is the reason we don't need a colaborador entity today.

Three tables:

- `procesos` — one row per SECOP II Proceso, identified by `numero_proceso`. JSONB snapshot of the datos.gov.co response. Multiple companies can connect to the same Proceso.

- `pliego_uploads` — one row per physical upload. Fields: `id`, `proceso_id`, `uploaded_by_company_id`, `file_sha256`, `file_storage_key`, `uploaded_at`, `uploader_ip`, `declaration_accepted_at`, `status` (`active | flagged | superseded`).

- `analyses` — one row per analysis. References `proceso_id`, `company_id`, `pliego_upload_id`, `verdict`, `created_at`, plus token/cost/latency fields for observability. Includes `proceso_metadata_snapshot` (JSONB) and `proceso_lookup_status` (`verified | unverified | failed`) so verdicts remain reproducible if the source dataset changes.

This model supports a future shared-pliego pool and contributor-recognition mechanic without committing to either today. Hashes and contributor identity are captured from day one for **internal** auditability — if a user uploads a doctored pliego to game their own verdict, you have the evidence.

**The shared pool is NOT exposed to users in MVP.** Each company sees only its own uploads. Internally you can see hash collisions across pilots, which gives you real data for designing a contribution/reward mechanic later.

### Observability
Per-analysis log: `company_id`, `proceso_id`, `pliego_sha256`, token counts, cost, latency, extraction success rate, verdict counts. Pipe to a dashboard you actually look at. If you don't, you'll learn about regressions from churn.

### Onboarding
The company profile form must be fillable in under 15 minutes by a human with their RUP in hand. If it takes longer, pilots will half-fill it and blame your verdicts.

### Public surface
A landing page in Spanish explaining the product and a "request access" form that creates a manual approval queue. No public signup until you've talked to them.

## 6. What's explicitly OUT of MVP scope

These are the things that feel important but will sink the timeline if built now:

- **Shared pliego pool exposed to users.** Internal hashing yes; user-visible reuse no. Deferred until terms-of-service for shared documents are designed and a contribution-recognition mechanic is in place.
- **Compensation / rewards / referral fees** to companies who contribute pliegos. Captured in the data model (you know who uploaded what), not built into the product.
- **Browsing or searching Procesos inside Coltratos.** Users find the Proceso ID on SECOP II's portal and bring it in. Discovery UX is deferred until pilot behavior justifies it.
- **Auto-fetching pliegos from SECOP II.** The pliego document is not in the API. Manual upload is the constraint, not a UX choice.
- **Adendas, prepliegos, contratos firmados.** MVP handles `pliego definitivo` only.
- **Billing and payments.** Pilots are free for 60 days. Charging requires legal entity setup, COP/IVA invoicing, retención rules — weeks for a hypothesis you haven't validated.
- **Team accounts and roles.** One user per company.
- **API access** for pilots.
- **Notifications, email digests, alerts** on new SECOP II tenders.
- **Bid drafting, document generation, recommendations** beyond the semáforo.
- **Mobile app.** Mobile-responsive web is enough.
- **Multi-language.** Spanish only.
- **Admin panel** beyond what direct DB access provides.

## 7. Decision criteria — when do you know the MVP works?

After 60 days with 10 onboarded pilots:

1. **≥6 of 10** have run **≥3 analyses** each. Otherwise it's not solving a real problem for them.
2. **≥4 of 10** state in writing they would pay a defined monthly price.
3. **Extraction accuracy on the eval set is stable ≥85%**, not declining.
4. **Cost ceiling held** on every analysis run in the period.
5. **Zero data leakage incidents** across tenants.
6. **≥70% of analyses** are linked to a verified Proceso ID (not manual fallback). If lower, either the lookup UX is too cumbersome or the integration's value is questionable.

If those numbers don't hit, the MVP works mechanically but not commercially. The question shifts from "build more" to "find better pilots or kill it." Decide that in advance, in writing, before you're emotionally invested in the next feature.

## 8. Out-of-MVP backlog tied to MVP learnings

These get designed only with data from the 60-day pilot, not before:

- **Shared pliego pool**, with terms-of-service for contributing and consuming, flag-and-replace flow, and contributor recognition.
- **Contribution reward mechanic** (the "compensation" idea). Designed against real hash-collision data: how often do pilots actually overlap on the same Proceso? If never, the mechanic is a non-issue. If often, the design is informed by which Procesos overlap.
- **Proceso discovery / search UI** if and only if pilots ask for it specifically with named filters they want.
- **Billing**, with pricing informed by the willingness-to-pay conversations from criterion #2 above.

---

## Appendix — what was deliberately left out and why

**A "Design System" as a top-level spec.** For an MVP this scope, a design system is gold-plating. Tailwind plus a component library plus 20 hours of taste gets you there. Every hour spent on the design system is an hour not spent on extraction accuracy, which is the only thing that decides whether the product works.

**A separate "Domain Model" spec.** The domain model is `Company`, `CompanyProfile`, `Proceso`, `PliegoUpload`, `Analysis`, `Requisito`, `Verdict`. It's a schema, not a spec. Specs are for behavior; schemas are for data.

**A `colaborador` entity.** What looks like a colaborador is just a query: `SELECT uploaded_by_company_id FROM pliego_uploads WHERE proceso_id = ? AND status = 'active'`. The relationship is recoverable from the existing tables without committing to a relationship type whose semantics aren't defined yet.

**Anything resembling "AI insights" beyond the semáforo.** Adding these shifts the value proposition from *"saves me 2 hours"* (concrete, testable) to *"AI helps with bidding"* (vague, unmeasurable). Concrete value props sell. Vague ones don't.