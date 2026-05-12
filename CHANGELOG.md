# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- feat(coltratos-app-ui/T11): `getAnalysisDetail` Kysely query + RSC page rewrite — wires the Resultado del Análisis page to real database data, replacing all mock fixtures.
- feat(coltratos-app-ui/T12): `ProcesoHeader` component — verified/unverified status branches, SECOP II deep-link, and process metadata display.
- feat(coltratos-app-ui/T13): `VerdictBanner` component — three verdict branches (verde/amarillo/rojo), deterministic counts reducer over requisitos.
- feat(coltratos-app-ui/T14): Result tabs rewrite with `RequisitoRow`, `CitationBlock`, and `Quote` DS primitive — expandable rows with evidence citations.
- feat(coltratos-app-ui/T15): `PdfViewer` DS primitive, signed-URL endpoint, and quote highlight integration — inline PDF evidence viewer linked to citation anchors.
- feat(coltratos-app-ui/T16): `rerunAnalysis` server action + `RerunButton` — allows users to rerun an analysis from the result page; inserts a new analyses row on each run.
- feat(coltratos-app-ui/T17): `WarningBanner` DS primitive + extraction-warning surface — flags partial extraction results with page-level detail.
- feat(coltratos-app-ui/T18): `analysis_feedback` migration + RLS policies + `FeedbackThumbs` DS primitive — per-requisito thumbs-up/down feedback stored with row-level isolation.
- feat(coltratos-app-ui/T19): Export button with feature-flag guard + Próximamente tooltip — reserves the export affordance behind a flag for the upcoming PDF export feature.
- feat(coltratos-app-ui/T20): `ExtractionLoading` stepper + `/api/analysis/status` endpoint + polling client — real-time progress stepper during extraction pipeline execution.

### Changed

- chore(database): curated convention — migrations must be applied before deploying dependent code to avoid runtime failures from missing tables or RLS policies.
