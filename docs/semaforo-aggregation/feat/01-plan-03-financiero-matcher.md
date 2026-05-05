# T3: Financiero Matcher

## Scope

- `lib/semaforo/financiero-matcher.ts` — NEW. Numeric threshold matching with margin-based confidence.

## Changes

### `lib/semaforo/financiero-matcher.ts`

```typescript
import type { FinancieroExtracted, CompanyProfileSnapshot, MatchResult } from '@/types'
import { FINANCIERO_VERDE_MARGIN } from './thresholds'

export function matchFinanciero(
  req: FinancieroExtracted,
  profile: CompanyProfileSnapshot,
): MatchResult
```

#### Match logic

`FinancieroExtracted` carries: `{ indicador: string, threshold: number, operador: '>=' | '<=' | '>', years_required: number, extraction_confidence: number }`

**Step 1 — Resolve profile indicator values**

Supported indicators (from `CompanyProfileSnapshot.ejercicios_fiscales[].indicadores`):
- `liquidez_corriente` — activo_corriente / pasivo_corriente
- `nivel_endeudamiento` — pasivo_total / activo_total
- `capital_de_trabajo` — activo_corriente - pasivo_corriente
- `razon_de_cobertura_de_intereses` — ebit / gastos_financieros
- `rentabilidad_del_patrimonio` — utilidad_neta / patrimonio

If `indicador` not in supported list: warn + rojo, confidence 0.0, reason `"Indicador financiero no soportado: [indicador]"`.

**Step 2 — Per-year threshold check**

For each of the `years_required` most recent fiscal years:
```
ratio = actual / threshold   // always positive division
margin = ratio - 1           // positive = above threshold, negative = below
meets = (operador === '>=') ? ratio >= 1.0 : ratio <= 1.0
verde_margin = (operador === '>=') ? ratio >= 1 + FINANCIERO_VERDE_MARGIN
             :                       ratio <= 1 - FINANCIERO_VERDE_MARGIN
```

**Step 3 — Verdict per year**

| Condition | Verdict |
|-----------|---------|
| verde_margin on ALL required years | verde |
| meets on ALL years, but not verde_margin on at least one | amarillo |
| meets on most-recent year only (multi-year req) | amarillo |
| fails on ANY required year | rojo |

**Step 4 — Confidence formula** (RN-010)

```
confidence = clamp(|actual/threshold − 1| / FINANCIERO_VERDE_MARGIN, 0.0, 1.0)
```

Use the WORST ratio across all required years for the confidence calculation:
- `actual = 2 × threshold` → confidence = 1.0
- `actual = 1.05 × threshold` → confidence = 0.5
- `actual = threshold` (exactly at threshold) → confidence = 0.0
- `actual = 0.95 × threshold` → confidence = 0.5 (rojo case)

For multi-year: confidence = min confidence across all required years.

**Step 5 — Missing profile data**

Fiscal year missing from profile: `reason = "Datos financieros del año [year] no disponibles en perfil"`, verdict = amarillo, confidence = 0.3.

#### Reason templates (all ≤200 chars)

| Outcome | Template |
|---------|----------|
| Verde | `"[indicador] [actual] ≥ umbral [threshold] ([+margin]% margen) — año[s] [years]"` |
| Amarillo — tight margin | `"[indicador] [actual] cumple umbral [threshold] con margen ajustado ([margin]%) — año[s] [years]"` |
| Amarillo — recent year only | `"[indicador] cumple en [year_recent] ([actual]) pero no en [year_prior] ([actual_prior])"` |
| Rojo | `"[indicador] [actual] < umbral [threshold] requerido — año[s] [years]"` |
| Amarillo — missing data | `"Datos financieros del año [year] no disponibles en perfil"` |

## Design Rationale

`FINANCIERO_VERDE_MARGIN` is imported from `thresholds.ts` — never inlined. The confidence
formula uses the same constant as the verde boundary, so the green/confidence scales align
naturally: reaching exactly the 10% margin gives confidence = 1.0, which matches the verde
verdict boundary. This makes "how confident?" and "why verde?" have the same answer.

Multi-year requirement: the spec requires ALL years to meet threshold for verde, not just the
average. Averaging would hide a catastrophically bad year behind good ones — procurement
evaluators check each year individually.

## Dependencies

T1: `FINANCIERO_VERDE_MARGIN` from `thresholds.ts`.
T0: `FinancieroExtracted`, `CompanyProfileSnapshot`, `MatchResult` from `@/types`.

## Done When

- [ ] `lib/semaforo/financiero-matcher.ts` exports `matchFinanciero`.
- [ ] All 5 supported indicators resolved correctly from `ejercicios_fiscales`.
- [ ] Verde path: `actual ≥ threshold × 1.10` across all required years, confidence = 1.0.
- [ ] Amarillo path: tight margin (confidence = 0.5 at 5% margin) + multi-year partial pass.
- [ ] Rojo path: any required year misses threshold.
- [ ] Confidence formula: `clamp(|ratio−1| / 0.10, 0, 1)` — no inline literals.
- [ ] Missing fiscal year → amarillo, confidence 0.3.
- [ ] Unsupported indicator → warn + rojo + confidence 0.0.
- [ ] All reasons ≤200 chars. `npm run typecheck` passes. No forbidden imports.
