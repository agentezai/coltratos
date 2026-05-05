# T5: Upload flow (Upload + Progress)

## Scope

| File | Change |
|------|--------|
| `app/dashboard/upload/page.tsx` | New — `'use client'` multi-step upload form |

## Changes

Single `'use client'` page. Internal step state: `"link" | "upload" | "progress" | "done"`.

### Step rendering (`step === "link" || step === "upload"`)

Both visible simultaneously as numbered step blocks (the design shows them stacked, not sequenced):

**Step 1 block — Vincular a proceso**

Segmented control: 3 buttons (`mode`: `select | url | new`).

- **select mode**: `<select>` of procesos from mock. On selection: preview card (SemPill + nombre + entidad · modalidad · cierra fecha + pliegos count).
- **url mode**: URL/ID input + "Verificar" button. Mock: 800ms timeout → `urlStatus: "found"` → green confirmation card.
- **new mode**: 2-column grid form (número, nombre, entidad, modalidad).

**Step 2 block — Subir el documento**

PDF dropzone:
```
<div ondragover... class="border-2 border-dashed border-graphite-300 rounded-xl p-12 text-center ...">
  Icon (file-text) circle + "Arrastra y suelta tu archivo PDF aquí" + "clic para buscar" link + "Solo PDF · Máx. 20 MB"
</div>
```

On file set: show uploaded file row (PDF badge + filename + "Archivo cargado" green chip + × remove button).

**Info strip** (3-column grid below steps): Costo por análisis / Créditos disponibles / Tiempo estimado.

**Privacy banner**: blue bg, ShieldCheck icon, privacy text.

**Footer**: Cancel button + "Iniciar análisis" primary (disabled if `canStart === false`).

```ts
const canStart =
  file != null && (
    (mode === "select" && procesoId !== "") ||
    (mode === "url" && urlStatus === "found") ||
    mode === "new"
  );
```

On "Iniciar análisis" click: `setStep("progress")`.

### Progress step (`step === "progress"`)

4-step stepper (horizontal): Extracción ✓ → Análisis (active) → Evaluación → Validación.

Progress ring (SVG, 42%, `strokeDashoffset`).

5 check-rows: Archivo recibido ✓ / Extracción de texto ✓ / Segmentación (active, Sparkles icon) / Evaluación pendiente / Generando resultado pendiente.

Sidebar card: processing details (archivo, tamaño, número proceso, entidad, fecha inicio, tiempo estimado).

"Ver resultado (demo)" button → `router.push("/dashboard/analisis/ANA-2026-00048")`.

### URL query param `?procesoId=`

On mount: read `useSearchParams().get("procesoId")`. If present, initialize `procesoId` state and `mode = "select"`.

## Design Rationale

Single-page Client Component is simpler than multi-route server form for a prototype upload flow with mock data. The step machine keeps all state co-located. When real upload is implemented, Step 2 will become a Server Action — the step machine interface won't change.

## Dependencies

T1 only (nav sidebar). T2 not required (inline styles/classes for step blocks are unique to this page).

## Done When

- [ ] Upload page renders 2-step form; "Iniciar análisis" disabled until both steps complete
- [ ] "Elegir proceso" mode: dropdown + preview card appear on selection
- [ ] "Pegar URL" mode: Verificar triggers 800ms mock, shows found card
- [ ] "Crear nuevo" mode: 2-column form renders
- [ ] Dropzone accepts drag → file row appears with green chip
- [ ] Clicking "Iniciar análisis" transitions to progress step
- [ ] Progress step renders stepper + ring + check rows
- [ ] "Ver resultado (demo)" navigates to `/dashboard/analisis/ANA-2026-00048`
- [ ] `?procesoId=` pre-selects proceso from list
- [ ] `npm run build` no type errors
