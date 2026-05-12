# T12: Proceso metadata header + SECOP II link

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/_components/proceso-header.tsx` | New — RSC, reads from `proceso_metadata_snapshot` |

## Requirements

REQ-014, RN-009. Sources: `domains/database.md` (snapshot reproducibility), `domains/integrations.md` (SECOP II detail-page URL pattern).

## Changes

Renders a horizontal strip above the verdict banner:

- **Entidad** — `procesoMetadata.entidad`, regular weight.
- **Objeto** — `procesoMetadata.objeto`, truncated to 2 lines with `line-clamp-2`. Hover or focus reveals the full text in a Tooltip.
- **Modalidad** — `procesoMetadata.modalidad`, Chip variant `gray`.
- **Valor estimado** — formatted COP (RN-003).
- **Fecha de cierre** — formatted `DD Mes YYYY` (RN-003).
- **Ver en SECOP II** — external link, opens `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=<urlEncoded(numeroProceso)>` in a new tab. Hidden when `procesoLookupStatus = 'unverified'`.

**Unverified state** (RN-009):
- A `<Chip variant="amber">Datos ingresados manualmente</Chip>` renders inline at the start of the strip.
- The "Ver en SECOP II" link is replaced with the static text "No disponible".

## Design System

Uses existing `Chip`, `Tooltip`, and `Link` primitives. **MUST NOT** introduce a new component for this task.

## Done When

- [ ] Header renders all 5 metadata fields when `procesoLookupStatus = 'verified'`
- [ ] Header renders the "Datos ingresados manualmente" badge when `unverified`
- [ ] SECOP II link target uses `numero_proceso` from `procesoMetadata`
- [ ] Long `objeto` truncates and shows full text on hover
- [ ] Snapshot test: `verified` and `unverified` variants

## Dependencies

T11.
