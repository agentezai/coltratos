# T17: Partial-extraction warning surface

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/_components/extraction-warning.tsx` | New — banner + flagged-pages drawer |
| `src/components/ui/warning-banner.tsx` | New (DS extension) — generic warning banner primitive |

## Requirements

REQ-027, RN-010. Source: `domains/integrations.md` (PDF handling) — flagged pages **MUST NOT** be silently dropped.

## Changes

### `WarningBanner` (DS primitive)

`src/components/ui/warning-banner.tsx` — generic primitive:
```ts
type WarningBannerProps = {
  variant: 'amber' | 'red';
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
};
```

Lives in DS for reuse on other surfaces (cost-observability dashboard, audit log).

### `ExtractionWarning`

Renders **above the verdict banner** (RN-010 — must not be in footer). Visible when:
- `extraction_status = 'partial'`, OR
- `pages_flagged > 0`

Copy:
- Title: "Análisis parcial — N páginas no fueron legibles"
- Description: "Algunas páginas del pliego no pudieron extraerse. Los requisitos en estas páginas no se incluyeron en el análisis. Considera volver a subir el documento o contactar soporte."
- Action: "Ver páginas afectadas" → opens a `<Drawer>` listing the flagged page numbers from `flaggedPagesList`. Each entry links to `PdfViewer` opened at that page (T15).

Persistence (RN-010): banner is **not dismissible** — re-running the analysis is the only way to clear it.

### Failure state

When `extraction_status = 'failed'`, the warning becomes a `variant="red"` banner with title "Análisis fallido" and a "Volver a analizar" CTA (T16). The verdict banner is not rendered in this case.

## Done When

- [ ] Banner renders when `pages_flagged > 0` and not when 0
- [ ] Banner renders for `extraction_status = 'partial'`
- [ ] Banner is **above** the verdict banner in DOM order (snapshot test)
- [ ] Banner has no dismiss control on the partial branch
- [ ] "Ver páginas afectadas" opens drawer with the page list
- [ ] Failed-extraction red banner replaces the verdict banner entirely

## Dependencies

T11, T13.
