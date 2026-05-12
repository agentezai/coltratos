# Domain: contratacion-publica

## What this file is and when to load it

The shared vocabulary of Colombian public procurement as it applies to COLTRATOS. Load this file at the start of any session that touches user-facing copy, schema names, prompts, extraction logic, or the semáforo. Domain terms are in **Spanish on purpose** — they match what the user sees on SECOP II and what their RUP says — and **MUST NOT** be translated to English in code, UI, or prompts.

## Conventions

- **MUST** use the Spanish term in identifiers, columns, prompts, and UI: `proceso_id` not `process_id`, `requisito_habilitante` not `qualifying_requirement`, `entidad` not `entity`. Source: docs/mvp-definition.md §3, §5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** treat a `Proceso` as a tender notice, not a contract — the MVP analyzes Procesos only; `contratos firmados` are out of scope. Source: docs/mvp-definition.md §6.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** treat a `Pliego` as the single source-of-truth document the verdict is computed from; the MVP handles `pliego definitivo` only — not `prepliego`, not `adendas`. Source: docs/mvp-definition.md §6.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** support all three requisito types: `juridico`, `tecnico`, `financiero` (which includes experiencia). Source: docs/mvp-definition.md §3.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** emit one of three semáforo values per requisito: `verde`, `amarillo`, `rojo` — plus an overall analysis-level verdict. Source: docs/mvp-definition.md §3 step 7.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** compute the semáforo with deterministic rules over extracted data, not via the LLM — the LLM does extraction; rules do matching. Source: docs/mvp-definition.md §5 (Semáforo).
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** mark every analysis with `proceso_lookup_status` of `verified | unverified | failed` and surface `unverified` to the user — this is what enables the manual-fallback path without silently degrading trust. Source: docs/mvp-definition.md §3 step 5, §5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST NOT** over-validate `numero_proceso` format on input — formats vary across modalidades and years; let the datos.gov.co lookup be the validator and fall back to manual entry on miss. Source: docs/mvp-definition.md §3 step 5.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->
- **MUST** extend the design system (`src/components/ui/`) rather than inline a primitive when adding new UI to the Resultado del análisis surface. Established DS primitives: `PdfViewer`, `Quote`, `WarningBanner`, `FeedbackThumbs`. Source: coltratos-app-ui T14/T15/T17/T18.
<!-- added: 2026-05-12 | feature: coltratos-app-ui | confidence: high | verified: 2026-05-12 -->
- **MUST NOT** render any edit affordance on the verdict banner or requisito rows — no `<select>`, `role="textbox"`, `role="combobox"`, `role="slider"`, or `data-verdict-edit` in the DOM. Re-runs create a new `analyses` row; the existing verdict is never mutated in place. Source: coltratos-app-ui RN-006.
<!-- added: 2026-05-12 | feature: coltratos-app-ui | confidence: high | verified: 2026-05-12 -->

## Patterns

**Glossary of domain terms** (the names that **MUST** appear verbatim in code, UI, prompts, and conversations):

- **Proceso (de Contratación)** — A SECOP II tender notice identified by `numero_proceso`. Has metadata (entidad, objeto, modalidad, valor estimado, fechas) retrievable from the datos.gov.co SODA API. *Is not a contract.*
- **Pliego (de Condiciones)** — The official PDF defining the rules of a Proceso, including the requisitos habilitantes. Not in the API; uploaded manually. MVP scope: `pliego definitivo` only.
- **Requisito habilitante** — A pass/fail eligibility criterion defined in the pliego. Three types:
  - **Jurídico** — legal/registration requirements (existencia y representación legal, RUP active, no estar incurso en inhabilidades).
  - **Técnico** — technical/personnel requirements (equipo clave with specific titles or years of experience).
  - **Financiero / de experiencia** — financial indicators (liquidez, endeudamiento, patrimonio) and prior-contract experience (objeto, valor, entidad).
- **Semáforo** — The verdict output. Values: `verde` (cumple), `amarillo` (cumple parcialmente / requiere verificación), `rojo` (no cumple).
- **Entidad** — The Colombian state body publishing the Proceso (e.g. Ministerio de Salud, Alcaldía de Medellín). From datos.gov.co metadata.
- **Modalidad** — The contracting modality (Licitación Pública, Selección Abreviada, Mínima Cuantía, Concurso de Méritos, Contratación Directa). MVP does not vary behavior by modalidad in v1.
- **RUP (Registro Único de Proponentes)** — Cámara de Comercio registry consolidating a company's legal, financial, and experience data. The reference document for filling the company profile.
- **Company profile (perfil de empresa)** — User-entered snapshot of their company's RUP-derived state. Source of truth the semáforo matches against.
- **PliegoUpload** — One row per physical upload of a pliego PDF. See `domains/database.md`.
- **Analysis** — One run of the extraction-and-matching pipeline against one PliegoUpload + one Company profile snapshot. Re-runs create new rows, not mutations.
- **datos.gov.co SODA API** — Open-data portal API used to look up Proceso metadata by `numero_proceso`. See `domains/integrations.md`.
- **SECOP II** — The Colombian public-procurement portal where Procesos are published and pliegos are downloaded. **MUST NOT** be scraped.
- **Discovery** — The surface that surfaces open Procesos matching a company's profile criteria. Distinct from **Lookup** (direct fetch by `numero_proceso`). Discovery reads from `procesos_index`; Lookup calls datos.gov.co SODA API directly. Source: 2026-05-04 pilot-research conversation
- **procesos_index** — Local denormalized table of currently-open SECOP II Procesos with precomputed embeddings on `objeto_a_contratar`, kept in sync with datos.gov.co on a 6-hour cadence. The data source for the discovery surface. Source: 2026-05-04 pilot-research conversation

**Two paths to a Proceso: Discovery (primary) and Lookup (fallback).** Discovery queries `procesos_index` via semantic search and structured filters — the user does not need to know the `numero_proceso` in advance. Direct Lookup by `numero_proceso` is the fallback for Procesos the user already holds from SECOP II or that are not yet in the index. Source: 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

**Unverified-status badge (proceso_lookup_status = 'unverified').** When `proceso_lookup_status = 'unverified'`, surface it as a first-class state — not a degraded mode. Implementation pattern: amber `Chip` with label "Datos ingresados manualmente" in the Proceso metadata strip; replace the SECOP II link with "No disponible" static text. Never hide, downplay, or omit the unverified indicator. Source: coltratos-app-ui T12, RN-006 context.
<!-- added: 2026-05-12 | feature: coltratos-app-ui | confidence: high | verified: 2026-05-12 -->

## Gotchas

**A `Proceso` is shared infrastructure, a `PliegoUpload` is per-tenant.** Multiple companies can connect to the same `proceso_id`. Their `pliego_uploads` rows are distinct (each has its own hash, uploader, declaration). Queries that "show me my Procesos" must join through `pliego_uploads.uploaded_by_company_id` or `analyses.company_id` — never assume `procesos` is tenant-scoped. (See `domains/database.md`.)
