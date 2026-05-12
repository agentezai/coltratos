# T19: Export trigger button (delegates to report-export)

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/_components/export-button.tsx` | New — wires to `report-export` if available, otherwise renders disabled placeholder |

## Requirements

REQ-025.

## Changes

### Behavior

Lives next to the re-run button (T16). Two modes:

**Mode A — `report-export` is shipped** (detected at build time via env or feature flag):
- Button: enabled, label "Exportar PDF"
- On click → calls `triggerReportExport(analysisId)` (imported from `@/features/report-export/trigger`)
- Shows toast "Generando reporte..." then "Reporte listo — descargando..." with a link to the generated file

**Mode B — `report-export` not yet shipped (current state):**
- Button: disabled, label "Exportar PDF"
- Tooltip on hover: "Próximamente — exportar a PDF estará disponible en la siguiente versión"

### Detection mechanism

A single `src/lib/features/report-export.ts` module exposes:
```ts
export const REPORT_EXPORT_ENABLED = process.env.NEXT_PUBLIC_REPORT_EXPORT_ENABLED === 'true';
export const triggerReportExport = REPORT_EXPORT_ENABLED
  ? (await import('@/features/report-export/trigger')).triggerReportExport
  : null;
```

This avoids hard-coupling this spec to an unspecced feature while allowing zero-config wire-up once `report-export` ships.

### Out of scope

The actual report rendering pipeline, signed-URL pickup, file format, and storage cleanup are owned by the future `report-export` feature spec.

## Done When

- [ ] Button renders disabled with the "Próximamente" tooltip when `REPORT_EXPORT_ENABLED=false`
- [ ] Button renders enabled when the flag flips to true (manually verified — automated test once `report-export` exists)
- [ ] Clicking the disabled button does nothing (no console error)

## Dependencies

T11. Future: `report-export` feature spec.
