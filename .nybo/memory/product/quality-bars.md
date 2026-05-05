---
name: Quality bars
description: Measurable thresholds the MVP must hit before it is considered "ready" — load on every /nybo-verify and on planning sessions that affect extraction, cost, latency, or trust.
type: product
---

# Quality bars

## What this file is and when to load it

The five non-negotiable, **measurable** thresholds that separate "MVP ready to be tested in production" from "demo." Load this file on every `/nybo-verify` run and on any planning session that touches extraction quality, cost, latency, citations, or failure handling. Each bar is enforceable: if it cannot be measured against an evidence artifact, it has not been met.

Below these bars the MVP is a demo, not a product. Shipping below them costs trust on the first interaction — and trust is the only currency a free pilot has.

## The five bars

### 1. Extraction accuracy ≥85% requisito recall

**MUST** measure recall against a labeled eval set of **at least 20 real SECOP II pliegos**, scored by a human against a ground-truth list. **MUST** be versioned, re-runnable, and re-scored on every prompt change with the new score recorded.

**MUST NOT** rely on spot checks or "looks good." Without a versioned eval set you have no idea if you are improving or regressing — and "85% accuracy" in the pitch is a lie you are telling yourself.

Source: docs/mvp-definition.md §4
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

### 2. Cost per analysis ≤$0.04 on a 200-page pliego

**MUST** be measured per-analysis with token counts logged. **MUST** include all model calls (extraction, repair retries, OCR fallback) in the per-analysis figure, not just the happy path.

If a single pliego costs $0.12 because of a long-tail page count, the unit economics are fiction. Surface the cost on the analysis log so regressions are visible the same day they ship.

Source: docs/mvp-definition.md §4
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

### 3. Time to verdict ≤3 min p50, ≤8 min p95

**MUST** hold on a 200-page pliego. **MUST** show real progress stages to the user — extraction step, matching step, report step — not a fake spinner.

Beyond p95 = 8 minutes, the user closes the tab. Latency regressions are silent killers; instrument every stage.

Source: docs/mvp-definition.md §4
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

### 4. Citation correctness on every requisito

**MUST** include a source page number with every requisito, and clicking that citation **MUST** open the PDF at that page.

A wrong citation is **worse** than no citation — it destroys trust on the first instance. Never display a requisito without a verifiable citation, even if extraction returns one without page metadata: drop it or flag it, do not invent one.

Source: docs/mvp-definition.md §4
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

### 5. Failure visibility — partial parsing surfaces a warning

**MUST NOT** display a silent verde verdict on a half-parsed PDF. If extraction fails or partially fails, the user sees it.

The pattern is *"Sólo se pudieron extraer 8 de 11 requisitos — revisa con cuidado"*. That message is a feature, not a bug. Pages that yielded no extractable content **MUST** be listed in the result so the user can manually verify them.

Source: docs/mvp-definition.md §4
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## How to enforce in /nybo-verify

When verifying a feature that touches the analysis pipeline, evidence **MUST** include:

- The eval-set score for any prompt or extraction-logic change (bar #1).
- The per-analysis cost log entries for the test run (bar #2).
- p50/p95 latency on a representative pliego (bar #3).
- Manual click-through of at least one citation per analysis (bar #4).
- A test case for partial-parse paths confirming the warning surfaces (bar #5).

If any of the five cannot be measured for the change being verified, say so explicitly in the verify report — do not omit it.
<!-- added: 2026-04-28 | feature: mvp-baseline | confidence: high -->

## Discovery success metrics (bars #6–9)

These four metrics gate the discovery feature, not the analysis pipeline. Measure after the first 30 days of pilots using discovery.

### 6. Discovery → analysis conversion ≥20%

**MUST** instrument: of Procesos viewed in discovery results (click-through to detail), ≥20% **MUST** result in a pliego upload + analysis run. Below 20% means pilots are browsing but not acting — either relevance is poor or the friction to upload is too high.

Source: docs/product/mvp-definition.md §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

### 7. Pilot-judged relevance ≥70%

**MUST** instrument: of analyzed Procesos originating from discovery, ≥70% **MUST** be rated "relevant" by the pilot in a simple thumbs survey surfaced on the results page. Below 70% means the search/filter/match-my-profile logic surfaces too many irrelevant Procesos.

Source: docs/product/mvp-definition.md §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

### 8. Discovery vs manual entry ratio ≥70%

**MUST** instrument: ≥70% of all analyses **MUST** originate from discovery (click-through from `procesos_index` results), not from direct Proceso ID entry or manual fallback. Below 70% means discovery is not the dominant entry path and the value prop is not landing.

Source: docs/product/mvp-definition.md §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->

### 9. Catalog uniqueness ≥1 new Proceso per pilot per week

**MUST** survey: pilots **MUST** report finding ≥1 Proceso per week in Coltratos that they had not seen on SECOP II before. This is the delta value of discovery over the baseline of "I already know which Procesos exist." If pilots find nothing new, the 6h sync and semantic search are adding no value over manually checking SECOP II.

Source: docs/product/mvp-definition.md §5 + 2026-05-04 pilot-research conversation
<!-- updated: 2026-05-04 | feature: discovery-pivot | confidence: high -->
