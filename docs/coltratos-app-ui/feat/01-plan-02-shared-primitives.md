# T2: Shared page primitives

## Scope

| File | Change |
|------|--------|
| `src/components/page/stat-card.tsx` | New — tinted icon + value + hint + delta row |
| `src/components/page/sem-pill.tsx` | New — thin wrapper on `Chip` mapping semáforo strings |
| `src/components/page/page-header.tsx` | New — title + subtitle + actions slot |
| `src/components/page/data-table.tsx` | New — table wrapper (header, tbody, hover row) |
| `src/components/page/toolbar.tsx` | New — filter bar container with search + selects |
| `src/components/page/pagination.tsx` | New — page navigation component |
| `src/components/page/index.ts` | Barrel export |
| `src/lib/mock/index.ts` | New — all mock data (analisis, procesos, equipo, facturas, resultDetail) |

## Changes

### `StatCard`

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon: IconName;
  tint: "blue" | "green" | "amber" | "purple" | "red";
  delta?: { direction: "up" | "down"; label: string };
}
```

Tint maps: `blue → bg-blue-50 text-blue-600`, `green → bg-green-50 text-green-600`, `amber → bg-amber-50 text-amber-600`, `purple → bg-violet-50 text-violet-600`, `red → bg-red-50 text-red-500`.

Circular icon container: `w-11 h-11 rounded-full`.

### `SemPill`

```tsx
type Semaforo = "eligible" | "conditional" | "not-eligible";

const MAP: Record<Semaforo, { variant: ChipVariant; label: string }> = {
  eligible:     { variant: "green",  label: "Elegible" },
  conditional:  { variant: "amber",  label: "Con observaciones" },
  "not-eligible": { variant: "red",  label: "No elegible" },
};

export function SemPill({ status }: { status: Semaforo }) {
  const { variant, label } = MAP[status];
  return <Chip variant={variant}>{label}</Chip>;
}
```

### `PageHeader`

```tsx
interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}
```

Renders: `<div class="flex justify-between items-start mb-7">`.

### `DataTable`

Generic table wrapper with `<div class="bg-white border border-graphite-200 rounded-xl overflow-hidden">` + `<table class="w-full text-sm">` with standard `th`/`td` spacing. Accepts `columns` + `rows` as children (`thead`/`tbody` pass-through) or typed generic.

For this spec, keep it as a simple wrapper that accepts `children` (the raw `<thead>/<tbody>` markup lives in each page).

### `Toolbar`

`<div class="flex gap-2.5 items-end bg-white border border-graphite-200 rounded-xl p-3.5 mb-4 flex-wrap">` — slot-based, accepts children.

### `Pagination`

```tsx
interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPage?: (n: number) => void;
}
```

Shows "Mostrando X a Y de Z resultados" text + page buttons. Server-side version accepts `searchParams`; client version uses `useState`.

### Mock data (`src/lib/mock/index.ts`)

Export typed constants matching the design prototype `data.jsx`:
- `ANALISIS: Analisis[]`
- `PROCESOS: Proceso[]`
- `RESULT_DETAIL: ResultDetail`
- `EQUIPO: Miembro[]`
- `FACTURAS: Factura[]`

Use existing domain types from `src/types/domain/` where they exist; otherwise define local types inline.

## Design Rationale

Shared primitives prevent copy-paste across 8 pages. `DataTable` as a simple children-wrapper (not a generic typed table) keeps it under 50 lines and avoids premature abstraction — pages own their column definitions.

## Dependencies

None — T2 can start in parallel with T1.

## Done When

- [ ] All 6 components exported from `src/components/page/index.ts`
- [ ] `SemPill` renders correct Chip color for each semáforo value
- [ ] `StatCard` renders tint circle + value + delta correctly
- [ ] `src/lib/mock/index.ts` exports all 5 data constants with TypeScript types
- [ ] `npm run build` no type errors
