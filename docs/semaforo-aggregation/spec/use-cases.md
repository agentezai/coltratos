# semaforo-aggregation — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Orchestrator | The future `analisis-orchestration` service that calls `aggregateSemaforo` after extraction completes, persists the verdict + version on `Analisis`, and transitions the state machine to `completed`. |
| `aggregateSemaforo` (this feature) | Pure function under `lib/semaforo/`. Stateless, deterministic, console.warn-only side effect for contract violations. |
| End User | Procurement consultant or empresa owner reading the verdict in the FE. Consumes the `Semaforo` shape verbatim. |
| Engineer (rules-changer) | The person modifying threshold values. Bound by the versioning protocol (RN-011) — a threshold change without a `SEMAFORO_RULES_VERSION` bump fails PR review. |

---

## User Stories

### US-01 — Get a defensible go/no-go verdict from a `Requisito[]`

**As an** orchestrator (and via it, an end user)
**I want** to call `aggregateSemaforo(requisitos)` and receive a `Semaforo` with `overall`, `byCategoria`, `blockers`, and `stats`
**So that** the user can read a single verde/amarillo/rojo and understand *why* in 10 seconds without parsing 47 individual requisitos

### US-02 — Honor the legal knockout rule on habilitantes

**As an** end user familiar with Colombian procurement law
**I want** any single failing habilitante to force the overall verdict to `rojo`
**So that** the verdict reflects legal eligibility (not aggregate "probably good") — failing one habilitante means the empresa is literally ineligible to bid, regardless of how strong everything else looks

### US-03 — Handle missing information honestly

**As an** end user with an incomplete empresa profile
**I want** "couldn't determine" requisitos to NOT be punished as failures, but I also want the UI to surface them clearly
**So that** I'm not driven away from procesos I might actually qualify for, and I know to complete my profile to get a confident verdict

### US-04 — Survive contract violations without losing the análisis

**As an** engineer
**I want** the function to log contract violations (empty inputs, `general`-categoría requisitos) but still produce a verdict from valid data
**So that** an upstream extraction quirk doesn't crash a paying user's análisis — the violation surfaces in our logs while the user still gets a useful result

### US-05 — Tune thresholds without breaking historical análisis

**As an** engineer or product owner doing v1.1 calibration against real bid outcomes
**I want** the threshold values isolated in one file with a version constant, and the version stamped on every `Analisis` row
**So that** I can change `0.7 → 0.65` in a single PR with a new ADR + golden-fixture updates, and historical análisis remain explainable against the rules that produced them — recalibration without data loss

---

## Use Case Scenarios

### UC-01 — Aggregate a complete análisis to a verdict (US-01)

**Preconditions:**
- `requisitos-extraction` has produced a `Requisito[]` with each requisito carrying `categoria`, `is_habilitante`, `cumple`, `semaforo`, `descripcion`.
- The orchestrator has the array in memory.

#### Main Scenario

1. Orchestrator calls `aggregateSemaforo(requisitos)`.
2. Function evaluates the knockout rule:
   a. Scans for any requisito with `is_habilitante === true AND cumple === false`.
   b. If found, sets `overall = 'rojo'` immediately and skips percentage computation for the overall verdict (per-categoría sub-verdicts are still computed, each applying knockout independently).
3. Otherwise, function computes `cumplePct = count(cumple === true) / count(cumple !== null)`.
4. Function maps `cumplePct` to overall via thresholds: `>= 0.9 → verde`, `>= 0.7 → amarillo`, `< 0.7 → rojo`.
5. For each `categoria ∈ {juridico, financiero, tecnico, experiencia}`: function applies the same knockout-then-percentage logic to ONLY the requisitos of that categoría.
6. Function builds the `blockers` list (RN-010): habilitantes-with-cumple-false only, sorted `(categoria fixed-order, descripcion alpha)`.
7. Function builds `stats` (REQ-012): `total`, `cumple`, `noCumple`, `sinInfo`, `cumplePct` rounded to 6 decimals.
8. Function returns the `Semaforo` object.

#### Alternative Scenarios

**2a. No habilitante fails** — proceed to percentage computation directly.

**5a. A categoría has zero requisitos** — `byCategoria[c] = 'amarillo'` per RN-009.

#### Error Scenarios

None — the function never throws. Contract violations route through `console.warn` (UC-04).

**Postconditions:** Orchestrator persists `Analisis.semaforo = result.overall` and `Analisis.semaforo_rules_version = SEMAFORO_RULES_VERSION`; transitions `Analisis.estado: analyzing → completed`.

---

### UC-02 — Knockout rule fires on a failing habilitante (US-02)

**Preconditions:** A `Requisito[]` where at least one requisito has `is_habilitante === true AND cumple === false`.

#### Main Scenario

1. Function iterates the array (or short-circuits on the first match — implementation choice; both are pure).
2. On finding any habilitante-failing requisito, the overall verdict is `rojo` regardless of how many other requisitos cumple.
3. The same evaluation runs per categoría: a categoría with a habilitante-failing requisito gets `byCategoria[c] = 'rojo'`.
4. The failing requisito appears in `blockers`.

#### Alternative Scenarios

**1a. Multiple habilitantes fail across multiple categorías** — all of them appear in `blockers`, sorted deterministically; each affected categoría gets `'rojo'`.

**Postconditions:** Overall is `rojo`, `blockers` is non-empty, the UI surfaces the legal blockers prominently.

---

### UC-03 — Sin-información handling (US-03)

**Preconditions:** Some or all input requisitos have `cumple === null`.

#### Main Scenario (partial nulls)

1. Function counts `total = requisitos.length`, `cumple = count(true)`, `noCumple = count(false)`, `sinInfo = count(null)`.
2. `cumplePct = cumple / (total - sinInfo)` — sin-info excluded from denominator.
3. If `total - sinInfo === 0` (denominator zero), `cumplePct = 0` (NOT `NaN`).
4. The verdict follows the usual percentage rules over this filtered denominator.

#### Alternative Scenarios

**Main Scenario (all nulls)**: every requisito has `cumple === null`.
1. `cumplePct = 0` (denominator-zero guard).
2. Per RN-006, overall is `'amarillo'` — NOT `'rojo'`.
3. Per-categoría sub-verdicts: each categoría that has at least one requisito (all null) is `'amarillo'`; categorías with zero requisitos are `'amarillo'` per RN-009. Both paths converge — the result is amarillo across the board, communicating "we don't have grounds for a confident verdict."

**Postconditions:** `stats.sinInfo` is non-zero; the FE surfaces the count prominently so the user knows the verdict is based on partial data and can complete the profile to reduce sinInfo.

---

### UC-04 — Empty / contract-violation inputs (US-04)

**Preconditions:** Either `requisitos.length === 0` OR at least one requisito has `categoria === 'general'`.

#### Main Scenario (empty array)

1. `requisitos.length === 0`.
2. Function returns `{ overall: 'rojo', byCategoria: { juridico: 'amarillo', financiero: 'amarillo', tecnico: 'amarillo', experiencia: 'amarillo' }, blockers: [], stats: { total: 0, cumple: 0, noCumple: 0, sinInfo: 0, cumplePct: 0 } }`.
3. Per RN-005, `overall` is `rojo` to surface "extraction produced nothing" as a strong signal; per-categoría stays `amarillo` to communicate "no data" rather than "everything fine."

#### Main Scenario (general-categoría requisito present)

1. Function detects `requisito.categoria === 'general'` during the initial scan.
2. For each offender, calls `console.warn('[semaforo-aggregation] contract violation: general-categoria requisito received', { requisitoId, segmentoId })` exactly once.
3. Excludes the offender(s) from all aggregation. `stats.total` reflects the post-exclusion count.
4. The function does NOT throw — the análisis still produces a verdict from the remaining valid requisitos.

#### Error Scenarios

**1e. (none).** The function is total: it returns a `Semaforo` for every input, including empty arrays and contract-violating ones.

**Postconditions:** A useful verdict reaches the user even on imperfect inputs; engineering sees the violation in logs to trace it back to extraction.

---

### UC-05 — Threshold tuning is versioned (US-05)

**Preconditions:** v1.1 calibration: an engineer wants to lower `AMARILLO_THRESHOLD` from `0.7` to `0.65` based on observed user behavior.

#### Main Scenario

1. Engineer edits `lib/semaforo/thresholds.ts`:
   - `AMARILLO_THRESHOLD = 0.65`
   - `SEMAFORO_RULES_VERSION = 'v1.1.0'`
2. Engineer runs the test suite. Some golden fixtures fail because the new threshold maps a previously-rojo case to amarillo.
3. Engineer updates the affected golden fixtures with the new expected outputs.
4. Engineer writes ADR-013 (the next available number) documenting the rationale (data link, expected impact, rollback plan).
5. PR opens. CI runs and passes (grep + tests + coverage all green).
6. PR review verifies: (a) version bumped, (b) fixtures updated, (c) ADR present. Without all three, review fails per RN-011.
7. PR merges. Future análisis are stamped with `'v1.1.0'`. Historical análisis still carry `'v1.0.0'` and remain explainable against ADR-011's thresholds.

#### Error Scenarios

**1e. Engineer forgets to bump `SEMAFORO_RULES_VERSION`** — PR review catches this; CI also flags via a regex test that compares the current value against the most recent commit modifying `thresholds.ts`.

**Postconditions:** Threshold changes are auditable; recalibration does not lose data; the orchestrator's persistence of the version on each `Analisis` row makes it possible to back-fill historical "what would the v1.1 verdict have been?" analyses without re-running extraction.

---

## UX/UI References

No UI surface in this spec. The output `Semaforo` shape **is** the FE contract. The future `semaforo-result` FE spec consumes it verbatim per RN-002.
