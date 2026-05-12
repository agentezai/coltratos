# T14: Requisito row + expand panel (citation block)

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/_components/result-tabs.tsx` | **Rewrite** — accept `RequisitoView[]`, group by `tipo` |
| `app/dashboard/analisis/[id]/_components/requisito-row.tsx` | New — collapsed + expanded states |
| `app/dashboard/analisis/[id]/_components/citation-block.tsx` | New — quote + page indicator + "Abrir en PDF" CTA |
| `src/components/ui/quote.tsx` | New (DS extension) — generic quotation primitive |

## Requirements

REQ-013, REQ-022, RN-008.

## Changes

### Tabs

5 tabs: `Resumen | Jurídico | Técnico | Financiero`. (Per `contratacion-publica.md`, financiero includes experiencia — no separate `Experiencia` tab.) The previous mock implementation had 5 tabs including Experiencia; this revision collapses that to 4 + Resumen.

- **Resumen** — flat list of all requisitos sorted by verdict severity (`rojo` → `amarillo` → `verde`).
- **Jurídico / Técnico / Financiero** — filtered by `requisito.tipo`.

### `RequisitoRow`

**Collapsed:**
- Chevron (rotates on expand)
- Requisito text truncated to 1 line (`line-clamp-1`)
- `SemPill` (verdict.value)
- Confidence indicator: small circle filled by `verdict.confidence` (4 levels: `< 0.6` empty / `0.6–0.75` 1/3 / `0.75–0.9` 2/3 / `≥ 0.9` full)
- Expand chevron

**Expanded:**
- Full requisito text
- Verdict reason (verbatim from `verdicts.reason`)
- `<CitationBlock quote={requisito.quoteFuente} page={requisito.paginaFuente} onOpen={() => openPdf(...)} />`
- "Abrir página en PDF" button (T15)

### `CitationBlock` (REQ-022)

Renders a `<Quote>` primitive (new — see DS extension below) with:
- Left-border accent in token `border-amber-200` if `quote_fuente` truncated, `border-blue-200` otherwise.
- Body: `quote_fuente` rendered as italic text.
- Footer: "Página {paginaFuente} del pliego" + Open-in-PDF button.

When `quote_fuente` or `paginaFuente` is `null` (RN-008): row is force-mapped to `amarillo` upstream by T11 (data layer); the citation block instead renders "Cita no disponible — verifica manualmente en el pliego."

### `Quote` design system primitive

`src/components/ui/quote.tsx` — pure presentational, accepts `accent` (token), `attribution`, `children`. Lives in the DS so other surfaces (audit log, analytics) can reuse it.

## Done When

- [ ] Tabs render with 5 entries (Resumen + 3 tipos), no `experiencia` tab
- [ ] Resumen tab sorts requisitos by severity
- [ ] Tipo tabs filter correctly
- [ ] Row expand reveals reason + citation block
- [ ] Citation block renders quote + page; missing-quote branch shows fallback copy
- [ ] Confidence indicator renders correct fill for each of the 4 levels
- [ ] `Quote` primitive is exported from `src/components/ui/index.ts`

## Dependencies

T11, T13. T15 wires the Open-in-PDF button.
