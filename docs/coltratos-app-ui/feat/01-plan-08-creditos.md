# T8: Créditos page

## Scope

| File | Change |
|------|--------|
| `app/dashboard/creditos/page.tsx` | New — balance + usage + packages + invoices |
| `app/dashboard/creditos/_components/package-selector.tsx` | New — `'use client'` radio package picker |

## Changes

### Page (`page.tsx`)

Server Component. Renders 3-column top section + 2-column bottom section.

**Top row** (3 columns: 280px | 1fr | 1.5fr):

1. **Credit balance card** — navy gradient (`bg-gradient-to-br from-blue-800 to-navy-950`) white text. Big number "22", "análisis", "Equivalente a USD $0.66 aprox.", "Comprar créditos" button.

2. **Resumen de uso card** — "Este mes" period select. Análisis realizados: 18 (+20% delta). Créditos consumidos: 18 / USD $0.54. Costo promedio: USD $0.03.

3. **Usage chart card** — horizontal bar chart. 6 months of data. Each row: month label + two bars (análisis blue, créditos green) + count labels. Bar height proportional to max value (24).

**Bottom row** (2 columns):

**Left — Comprar créditos**: `<PackageSelector/>` client component + privacy banner + "Continuar con la compra" button.

**Right — Facturas**: table (Factura / Fecha / Descripción / Monto / Estado / Acciones). Status pill: Pagada (green) / Vencida (red). Download + Search icon buttons. Pagination footer.

### `PackageSelector` (`'use client'`)

State: `selected: "basico" | "pro" | "empresarial"`. 3 radio-style cards:

| Package | Analysis | Price COP | USD |
|---------|----------|-----------|-----|
| Básico (Más popular) | 200 | $9.900 | $2.40 |
| Pro | 500 | $19.900 | $4.85 |
| Empresarial | 1.200 | $39.900 | $9.75 |

Selected card: `border-2 border-blue-600 bg-blue-50`. "Más popular" badge on Básico.

## Design Rationale

Only the package selector needs client state. Balance, chart, and invoice table are static RSC content from mock data.

## Dependencies

T1 (nav), mock data (`FACTURAS`).

## Done When

- [ ] `/dashboard/creditos` renders navy balance card with "22"
- [ ] Bar chart renders 6 months with proportional heights
- [ ] Package selector: clicking a card selects it (border highlight)
- [ ] "Básico" card shows "Más popular" badge and is selected by default
- [ ] Invoice table shows 5 rows from mock; Vencida row shows red pill
- [ ] `npm run build` no type errors
