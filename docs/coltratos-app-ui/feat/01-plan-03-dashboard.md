# T3: Dashboard page

## Scope

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Rewrite — stat cards + recent análisis table |

## Changes

Replace the current stub with:

```
<PageHeader title="¡Hola, {userName}! 👋" subtitle="Aquí tienes el resumen de tu actividad" actions={<Button leadingIcon="upload">Subir pliego</Button>}/>

<div class="grid grid-cols-4 gap-4 mb-5">
  <StatCard label="Análisis realizados" value={48} hint="En los últimos 30 días" icon="file-text" tint="blue" delta={{ direction: "up", label: "12% vs. período anterior" }}/>
  <StatCard label="Tasa de elegibilidad" value="68" unit="%" hint="En los últimos 30 días" icon="target" tint="green" delta={{ direction: "up", label: "8% vs. período anterior" }}/>
  <StatCard label="Créditos restantes" value={23} hint="Disponibles" icon="archive" tint="purple" delta={{ direction: "up", label: "15% vs. período anterior" }}/>
  <StatCard label="Ahorro de tiempo" value={112} unit="h" hint="En los últimos 30 días" icon="clock" tint="amber" delta={{ direction: "up", label: "20% vs. período anterior" }}/>
</div>

<Card>
  <section title="Análisis recientes">
  <DataTable>
    <thead> Proceso | Entidad | Fecha | Estado | Resultado | Acciones </thead>
    <tbody> {ANALISIS.slice(0,5).map(...)} </tbody>
  </DataTable>
  <footer> "Ver todos mis análisis →" link </footer>
  </section>
</Card>
```

**Estado column**: `<span class="bg-green-50 text-green-700 ...">Completado</span>` (static pill).

**Resultado column**: `<SemPill status={a.sem}/>`.

**Row click**: `<Link href={/dashboard/analisis/${a.id}}>` wrapping each row, or `onClick` with `router.push`.

Since Dashboard is a Server Component, row navigation works with `<Link>` inside table cells (Next.js supports this).

## Design Rationale

Server Component — reads mock data at render time, no client state needed. Link-wrapped rows are preferable to event handlers in RSC.

## Dependencies

T1 (sidebar nav active will highlight Dashboard), T2 (StatCard, SemPill, DataTable, PageHeader, mock data).

## Done When

- [ ] `/dashboard` renders 4 stat cards with correct values, tints, and deltas
- [ ] Recent análisis table shows last 5 rows with SemPill in Resultado column
- [ ] "Ver todos mis análisis" link navigates to `/dashboard/analisis`
- [ ] "Subir pliego" button navigates to `/dashboard/upload`
- [ ] `npm run build` no type errors
