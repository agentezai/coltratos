# semaforo-aggregation — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Orchestrator | Future `analisis-orchestration` service that calls `runSemaforoMatching` after extraction, persists `semaforo_rules_version + overall` on `Analisis`, and transitions the analysis state to `completed`. |
| `runSemaforoMatching` (this feature) | Pure function under `lib/semaforo/`. Stateless, deterministic, `console.warn` on unknown tipo is the only side effect. |
| End User | Procurement consultant or empresa owner reading the verdict in the FE. Sees overall verde/amarillo/rojo + per-requisito reasons. |
| Engineer (rules-changer) | Person modifying matcher logic, thresholds, or `DEFINITORIO_DOCUMENT_TYPES`. Bound by versioning protocol (RN-015) — any change without a `SEMAFORO_RULES_VERSION` bump fails PR review. |

## User Stories

| ID | Story |
|----|-------|
| US-01 | As an orchestrator, I want to pass extracted requisitos and the company profile and receive a deterministic overall verdict with per-requisito reasons and confidence, so the result can be persisted and displayed to the user. |
| US-02 | As an end user, I want definitorio jurídico failures (RUP suspended, tipo societario mismatch) to always produce overall rojo regardless of other verdicts, so I know immediately when a structural bar exists. |
| US-03 | As an end user, I want financiero requisitos matched against my registered financial indicators with a numeric confidence score and a reason that names the specific indicator and threshold, so I can verify the verdict without reading the pliego. |
| US-04 | As an end user, I want técnico/experiencia requisitos matched against my past contracts using UNSPSC codes and object similarity, so I understand whether my documented experience qualifies. |
| US-05 | As an orchestrator, I want the threshold logic to apply per-tipo with an N≥5 minimum, so that a pliego with 3 jurídico requirements is not unfairly penalized for a single non-definitorio miss the way a 10-item batch would be. |
| US-06 | As an end user, I want to be able to re-run the analysis after updating my company profile and get a new verdict, while the original analysis remains unchanged as an audit record. |

## Use Case Scenarios

### UC-01 — Full matching run

**Actors:** Orchestrator, `runSemaforoMatching`

**Main Scenario:**
1. Orchestrator calls `runSemaforoMatching(requisitos, profile)` with the full `ExtractedRequisito[]` and the pinned `CompanyProfileSnapshot`.
2. Each requisito is dispatched to the correct matcher by `tipo`.
3. Each matcher produces a `MatchResult` with `verdict`, `reason` (≤200 chars), `confidence` (0–1), and `extraction_confidence`.
4. `aggregateByTipo` computes per-tipo verdicts (N≥5 threshold or N<5 knockout-only).
5. `deriveOverall` computes overall verdict from per-tipo verdicts and `definitorio_blockers`.
6. `SemaforoResult` returned with `semaforo_rules_version = 'v2.0.0'`.
7. Orchestrator persists `overall` and `semaforo_rules_version` on the `Analisis` row.

**Alternate Scenario — unknown tipo:**
At step 2, a requisito has an unrecognized `tipo`. `console.warn` fires; a rojo `MatchResult` with `confidence = 0.0` is inserted. Analysis continues and completes.

**Error Scenario — empty requisitos:**
`requisitos = []` produces `overall = 'rojo'` and all tipo-verdicts `= 'amarillo'` (empty-tipo fallback). Orchestrator persists without throwing.

---

### UC-02 — Jurídico-definitorio knockout

**Actors:** End User (reading verdict), Orchestrator

**Main Scenario:**
1. Extracted pliego includes `{ document_type: 'rup_vigente' }`.
2. Profile has `rup_vigente = false`.
3. `matchJuridico` classifies `is_definitorio = true` (from `DEFINITORIO_DOCUMENT_TYPES`), checks profile → mismatch confirmed → `{ verdict: 'rojo', definitorio: true, confidence: 1.0 }`.
4. `definitorio_blockers` contains this match.
5. `deriveOverall`: `definitorio_blockers.length > 0` → overall = `'rojo'` regardless of financiero/técnico verdicts.
6. End user sees overall rojo with reason `"RUP suspendido o cancelado — inhabilidad legal para presentar oferta"`.

**Alternate — definitorio unresolved:**
`rup_vigente = undefined` in profile → `{ verdict: 'amarillo', definitorio: true, confidence: 0.3 }`. Not added to `definitorio_blockers`. Overall may still be verde if all other tipos are verde.

---

### UC-03 — Financiero numeric threshold match

**Actors:** End User, Orchestrator

**Main Scenario:**
1. Extracted `{ indicador: 'liquidez_corriente', threshold: 1.5, operador: '>=', years_required: 2 }`.
2. Profile `ejercicios_fiscales`: year 2024 = 1.65 (10% margin, verde), year 2023 = 1.58 (5.3% margin, amarillo).
3. `matchFinanciero`: both years meet threshold; most recent year has verde margin; prior year is tight (5.3% margin).
4. Verdict: amarillo (tight margin in prior year). Confidence: `clamp(0.053/0.10, 0, 1) = 0.53`.
5. Reason: `"Liquidez corriente 1.58 cumple umbral 1.5 con margen ajustado (5.3%) — año 2023"`.

**Error Scenario — missing fiscal year:**
`ejercicios_fiscales` does not include year 2023 → `{ verdict: 'amarillo', confidence: 0.3, reason: 'Datos financieros del año 2023 no disponibles en perfil' }`.

---

### UC-04 — Técnico capacity match

**Actors:** End User, Orchestrator

**Main Scenario:**
1. Extracted `{ tipo: 'experiencia', unspsc_required: '81111500', valor_cop_min: 500_000_000 }`.
2. Profile `contratos_previos`: one contract with `unspsc_codes = ['81111500'], valor_cop = 800_000_000`.
3. Pre-filter: contract passes valor_cop_min check.
4. Tier 1: exact UNSPSC match → `{ verdict: 'verde', confidence: 1.0 }`.
5. Reason: `"Contrato Ministerio de Salud (2023) con UNSPSC 81111500 — coincidencia exacta"`.

**Alternate Scenario — cosine fallback:**
No exact or parent UNSPSC match; cosine similarity = 0.88 → `{ verdict: 'amarillo', confidence: 0.88 }`.

**Error Scenario — valor_cop too low:**
All contracts have `valor_cop < valor_cop_min` → all excluded from matching → rojo.

---

### UC-05 — Per-tipo N≥5 threshold aggregation

**Actors:** Orchestrator, End User

**Main Scenario (N=10, 4 rojo):**
1. 10 técnico requisitos; 4 matched as rojo (non-definitorio), 6 verde.
2. `aggregateByTipo`: N=10 ≥ 5 → threshold applies. `4/10 = 40% > 30%` → tipo-verdict = rojo.
3. `byTipo.tecnico = { verdict: 'rojo', threshold_applied: true }`.
4. `deriveOverall`: tipo-rojo found → overall = rojo.

**Alternate Scenario (N=5, 1 rojo):**
1. 5 técnico requisitos; 1 rojo, 4 verde.
2. `1/5 = 20% < 30%` → threshold doesn't fire. 0 amarillo → tipo-verde.
3. `byTipo.tecnico = { verdict: 'verde', threshold_applied: true }`.

**Alternate Scenario (N=3, 1 rojo non-definitorio):**
1. 3 jurídico requisitos; 1 rojo (paz_y_salvo absent), 2 verde.
2. N=3 < 5 → knockout-only. Non-definitorio rojo → tipo-amarillo.
3. `byTipo.juridico = { verdict: 'amarillo', threshold_applied: false }`.

---

### UC-06 — Re-run isolation

**Actors:** End User, Orchestrator

**Main Scenario:**
1. Analysis A-001 completed: `overall = 'rojo'`, `semaforo_rules_version = 'v2.0.0'`, profile snapshot v1 pinned.
2. User updates company profile → profile v2 created (new immutable snapshot).
3. Orchestrator creates new `Analisis` row A-002, passes profile snapshot v2 to `runSemaforoMatching`.
4. A-002 produces new `SemaforoResult`. Orchestrator persists A-002; A-001 is NOT mutated.
5. User sees both A-001 (historical) and A-002 (latest) in the UI.

**Invariant:** `CompanyProfileSnapshot` passed to `runSemaforoMatching` is always the version pinned at analysis creation time — never re-fetched. This is an orchestrator responsibility, not enforced inside `lib/semaforo/`.
