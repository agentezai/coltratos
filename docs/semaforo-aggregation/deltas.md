## Delta 2026-05-05 — edit | Rev 2: full rewrite to matching + aggregation pipeline

**Mode:** edit
**Rationale:** v1 spec (2026-04-27) was aggregation-only — it assumed `cumple: boolean | null` was set upstream by extraction and simply counted verde/amarillo/rojo. MVP scope alignment revealed that the matching step was missing entirely: pilots need per-requisito reasons and confidence so they can defend verdicts. The LLM-vs-rules separation also required explicit documentation of per-tipo matching rules, confidence formulas, and the definitorio pattern list.
**Affected domains:** eligibility-matching, empresa-profile, requisito-extraction, database

### Tasks added

- T2: JuridicoMatcher — document checks, definitorio classification, heuristics list
- T3: FinancieroMatcher — numeric threshold matching, margin confidence formula
- T4: TecnicoMatcher — UNSPSC tier matching, cosine similarity, experiencia
- T5: Aggregator — per-tipo N≥5 threshold, overall verdict derivation
- T6: Integration — `runSemaforoMatching` entry point + public barrel
- T7: Tests — ≥15 golden fixtures (≥5 per tipo), unit tests, provider-isolation grep

### Tasks modified

- T1 (was: Thresholds + ADRs): expanded to include `DEFINITORIO_DOCUMENT_TYPES`, `OBTAINABLE_DOCUMENT_TYPES`, `MIN_N_FOR_THRESHOLD`, `ROJO_THRESHOLD`, `FINANCIERO_VERDE_MARGIN`, `TECNICO_COSINE_MIN`; ADRs updated (ADR-011/012) + added ADR-013/014
- T3 (was: Tests + corpus): superseded by T7 — scope expanded to ≥15 fixtures across tipos; old file marked SUPERSEDED

### Tasks removed

- v1 T2 (`aggregateSemaforo(requisitos): Semaforo`) — fully replaced by the matching + aggregation pipeline; old file marked SUPERSEDED
- v1 T3 (corpus tests + isolation grep) — subsumed into T7

### Impact on memory

- eligibility-matching domain: matching rules are now per-tipo (Jurídico/Financiero/Técnico); confidence is evidence-quality-based, not inherited from extraction; `is_definitorio` is a static list in the matching layer, not set by extraction or LLM
- empresa-profile domain: `CompanyProfileSnapshot` is a required input to semaforo matching — must be pinned at analysis time, not fetched live
- database domain: `analisis.semaforo_rules_version` must be persisted on every analysis row; `SEMAFORO_RULES_VERSION` bumped to v2.0.0
