# T1: Thresholds + ADRs

## Scope

- `lib/semaforo/thresholds.ts` — NEW. Named const exports for threshold values and `SEMAFORO_RULES_VERSION`.
- `.nybo/foundation/adrs/ADR-011.md` — NEW. "Threshold values for semáforo verdicts (v1)."
- `.nybo/foundation/adrs/ADR-012.md` — NEW. "Sin información handling: amarillo, not rojo."

## Changes

### `thresholds.ts`

```typescript
// lib/semaforo/thresholds.ts
//
// Versioning protocol (RN-011): any change to a threshold or to the knockout
// rule definition requires:
//   (a) editing this file,
//   (b) bumping SEMAFORO_RULES_VERSION,
//   (c) updating golden fixtures with explicit new expected outputs,
//   (d) writing an ADR documenting the rationale.
// PR review enforces all four. The orchestrator persists this version on
// Analisis.semaforo_rules_version so historical análisis stay explainable.

/** Minimum cumplePct for an overall/per-categoría 'verde' (inclusive). */
export const VERDE_THRESHOLD = 0.9 as const

/** Minimum cumplePct for an overall/per-categoría 'amarillo' (inclusive). */
export const AMARILLO_THRESHOLD = 0.7 as const

/**
 * Version stamp persisted on every Analisis.semaforo_rules_version row.
 * Bump on any change to thresholds, knockout rule, or sin-info handling.
 * Format: vMAJOR.MINOR.PATCH (semver-shaped string).
 */
export const SEMAFORO_RULES_VERSION = 'v1.0.0' as const
```

- All three are `const` exports — TypeScript narrows them at use sites, preventing accidental literal-number drift inside `aggregate.ts`.
- The aggregation function (T2) imports these — it MUST NOT inline `0.9` / `0.7` / `'v1.0.0'` anywhere. TC-014's grep test enforces this.

### ADR-011 (`.nybo/foundation/adrs/ADR-011.md`)

Title: **Threshold values for semáforo verdicts (v1)** · Status: **Accepted**

Sections:

- **Context.** COLTRATOS produces a verde/amarillo/rojo verdict from per-requisito eligibility verdicts. Threshold values determine how strict the eligibility signal is — too lenient and users bid on procesos they'll lose; too strict and they pass on procesos they could have won.
- **Decision.** v1 uses `VERDE_THRESHOLD = 0.9`, `AMARILLO_THRESHOLD = 0.7`, knockout rule on `is_habilitante=true AND cumple=false`, sin-información excluded from the percentage denominator.
- **Rationale.**
  - 90% leaves narrow margin for error appropriate for high-stakes bid decisions (the user is committing real labor and capital based on the verdict).
  - 70% as the amarillo floor reflects "you could probably qualify with effort" — the actionable middle state where the UI prompts the user to address gaps.
  - Excluding sin-info from the denominator prevents extraction gaps from artificially deflating scores. ADR-012 covers the all-null edge case separately.
  - Knockout rule on habilitantes is non-negotiable: Colombian procurement law makes habilitantes literal blockers — failing one means legally ineligible to bid, regardless of any aggregate score.
- **Alternatives Considered.**
  - **Per-categoría weighting** (financial-heavier than technical) — rejected for v1: lacks the empirical data to weight defensibly. Pursue in v1.1+ if calibration data shows a categoría drives bid-loss outcomes disproportionately.
  - **Strict thresholds (95% / 80%)** — rejected: would produce too many rojos on pliegos where a few minor non-habilitante failures don't actually block the bid.
  - **Lenient thresholds (80% / 50%)** — rejected: too many verdes on pliegos with significant gaps; erodes user trust in the verdict.
- **Validation Plan.** Once **N≥10 paying users** have produced **N≥50 análisis**, compare semáforo verdicts against actual bid outcomes (did empresa bid? did they win/lose?) and recalibrate. **v1.1 work item, not a v1 ship blocker.** The `SEMAFORO_RULES_VERSION` stamp on every `Analisis` row makes recalibration possible without data loss.
- **Consequences.**
  - **Positive.** Defendable rules; isolated implementation; easy to tune; auditable per-análisis via the persisted version stamp.
  - **Negative.** Thresholds are unvalidated against real outcomes for v1.
  - **Mitigation.** ADR-012 sin-info handling reduces false rojos; the version stamp enables historical recalibration.

### ADR-012 (`.nybo/foundation/adrs/ADR-012.md`)

Title: **Sin información handling: amarillo, not rojo** · Status: **Accepted**

Sections:

- **Context.** When a requisito's `cumple` verdict is `null` (extraction couldn't determine eligibility from the empresa profile and pliego text), aggregation must decide how to treat it.
- **Decision.** Sin-información requisitos are **EXCLUDED from the percentage denominator**. If ALL requisitos are sin-información, overall verdict is `amarillo` (NOT `rojo`).
- **Rationale.** Treating "we couldn't tell" as "ineligible" produces misleading rojos that drive users away from procesos they might actually qualify for. `amarillo` correctly communicates "manual review needed here" without making a confident negative claim. Excluding from the denominator means a partially-extracted pliego is judged on the requisitos we DID extract, not penalized for the gaps.
- **Alternatives Considered.**
  - **Treat null as rojo** — rejected: produces false rojos on incomplete profiles; user-hostile.
  - **Treat null as amarillo at the aggregation level (count in denominator, treat as 0.5)** — rejected: implicit weighting introduces an opaque math layer; users can't reason about why their score is what it is.
  - **Exclude null from denominator AND default all-null to rojo** — rejected: the denominator-zero case (all null) needs an explicit verdict; rojo here would conflate "ineligible" with "couldn't tell."
- **Consequences.**
  - **Positive.** No false rojos from extraction gaps; users see a defensible verdict aligned with how they think about partial information.
  - **Negative.** A pliego with extensive missing data can produce `verde` if the few-determined requisitos all cumple — potentially overconfident.
  - **Mitigation.** `stats.cumplePct` exposes the denominator and `stats.sinInfo` is surfaced prominently in the UI so users see when the verdict is based on partial data. Future work item: a UI quality gate that warns the user when `sinInfo / total > 0.3` even if overall is verde.

### Design Rationale (Single Responsibility)

Splitting thresholds and ADRs into T1 (instead of bundling into T2 with the function) means:
- The aggregation function (T2) cannot accidentally hardcode a literal — the file it lives in doesn't have any.
- Threshold tuning becomes a single-file PR, with `git blame` pointing directly at the rule change.
- ADR authoring is co-located with the constants they justify; future readers see them together.

## Dependencies

Requires **T0** (in `domain-model` spec): `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, and `SemaforoColor` (already exists) types must be exported from `@/types`. The `Requisito` shape must include `categoria` and `is_habilitante`.

## Done When

- [ ] `lib/semaforo/thresholds.ts` exists with three named const exports (`VERDE_THRESHOLD`, `AMARILLO_THRESHOLD`, `SEMAFORO_RULES_VERSION`).
- [ ] All three exports are `as const` literal types.
- [ ] `SEMAFORO_RULES_VERSION` matches the regex `/^v\d+\.\d+\.\d+$/` (initial: `'v1.0.0'`).
- [ ] `.nybo/foundation/adrs/ADR-011.md` exists with all sections above and Status: Accepted.
- [ ] `.nybo/foundation/adrs/ADR-012.md` exists with all sections above and Status: Accepted.
- [ ] `npm run typecheck` passes.
- [ ] No imports beyond TypeScript primitives (`as const`); the file is pure data.
