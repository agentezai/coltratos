# COLTRATOS · Design System

**COLTRATOS** is a Colombian public-procurement *eligibility analysis* SaaS.
MiPymes (small & mid Colombian contractors) drop the **pliego de condiciones** PDF
from a SECOP II tender and, in under a minute, get a **traffic-light diagnostic**
— *Elegible*, *Elegible con observaciones*, or *No elegible* — broken down by
**Jurídico / Financiero / Técnico / Experiencia**, with actionable recommendations.

Tagline used in the product: **“Sabe en 1 minuto si puedes presentarte a un proceso del SECOP II.”**

## The product, at a glance

| Surface | Purpose |
|---|---|
| **Marketing site** (`coltratos.com`) | Pitch: drag a PDF, get a diagnostic. Pricing, FAQs. |
| **Web app** (internal, authenticated) | The actual product — 10 core screens below |

### Web-app screens (all Spanish, desktop-first)
1. **Dashboard principal** — KPIs (análisis realizados, tasa elegible, créditos restantes, ahorro de tiempo) + tabla de análisis recientes.
2. **Subir pliego** — drag-and-drop PDF, metadata opcional, costo estimado.
3. **Análisis en progreso** — stepper (Extracción → Segmentación → Evaluación IA → Validación), progreso animado.
4. **Resultado del análisis** — semáforo grande + tabs Jurídico/Financiero/Técnico/Experiencia + recomendaciones.
5. **Mis análisis** — tabla buscable con filtros, semáforo por fila, exportar.
6. **Créditos y facturación** — balance, paquetes, gráfica de uso, facturas.
7. **Equipo / Mi equipo** — miembros, roles (Administrador / Analista / Viewer), actividad reciente.
8. **Configuración empresa** — RUP, sectores UNSPSC, notificaciones.
9. **Alertas de licitaciones** — feed matching de procesos SECOP con confidence score.
10. **Admin analytics** — uso, conversión, causas comunes de rechazo.

Colombian domain vocabulary is load-bearing: **SECOP II**, **RUP**, **UNSPSC**,
**pliego de condiciones**, **entidad contratante**, **requisitos habilitantes**.
Never translate these to English.

## Sources

| Kind | Where | Notes |
|---|---|---|
| Source screens (reference) | `assets/screens/` | 8 raster mocks of landing + 7 app screens — our ground truth for palette, typography, layout, iconography |
| Tokens | `colors_and_type.css` | CSS custom properties: color, type, spacing, radii, shadows, motion |
| Primitives & UI kit | `ui_kits/coltratos-app/` | React (JSX) recreation of the internal web app |
| Preview cards | `preview/*.html` | One visual specimen per token / component cluster, surfaced in the Design System tab |
| Raw uploads | `uploads/` | Original references — kept untouched |

> ⚠️ **No codebase was provided.** The system was reverse-engineered from the
> high-fidelity reference mocks in `assets/screens/`. All pixel values, radii and
> spacing were re-measured from those renders. Flag any drift against the real
> product to the design team before shipping.

---

## Content fundamentals

**Language.** Spanish (Colombia). English terms *only* when they are already
the legal/industry term (*pliego*, *SECOP*, *RUP*, *UNSPSC* — never translated;
*dashboard* is an exception, rendered as such).

**Person & tone.** Second-person informal — **tú**, not *usted*.
Friendly, direct, slightly warm without being cute.
The product greets by first name (“¡Hola, María! 👋”), but never uses slang.

- ✅ *“Sabe en 1 minuto si puedes presentarte a un proceso del SECOP II.”*
- ✅ *“Aquí tienes el resumen de tu actividad.”*
- ✅ *“Tu archivo se analiza de forma privada y segura.”*
- ✅ *“¿Qué tan preciso es el análisis?”*
- ❌ *“El usuario puede cargar el pliego de condiciones.”* (too formal / third-person)

**Casing.**
- Page titles and card titles: **Sentence case** (“Resultado del análisis”, “Créditos y facturación”). Only the first word + proper nouns capitalized.
- Buttons: **Sentence case** (“Subir pliego”, “Iniciar análisis”, “Comprar créditos”). No ALL-CAPS.
- Eyebrows / tab labels / table headers: **Sentence case** (“Proceso”, “Entidad”, “Estado”).
- The **wordmark COLTRATOS** is the only thing set in all-caps — it is a logotype, not running text.

**Numbers & units.**
- Currency: `$9.900 COP` (dot as thousands separator, Colombian convention). USD equivalence: `USD $2.40 aprox.`
- Dates: `24 Abr 2026` (abbreviated month, no period) or `24 Abr 2026, 10:16 a. m.` with non-breaking space.
- Percentages: `70% de elegibilidad` (no space).
- Duration: `< 1 minuto`, `48 seg`, `112 h`.

**Microcopy patterns.**
- Empty/loading: *“Estamos procesando tu pliego de condiciones.”*
- Success chips: *“Completado”*, *“Archivo cargado correctamente”*.
- Trust reassurance near uploads: *“Tu archivo se analiza de forma privada y segura. No compartimos tu información con terceros.”*
- Confirmation CTAs: verbs first — *“Iniciar análisis”*, *“Ver análisis”*, *“Comprar créditos”*.

**Emoji.** Used sparingly as *relational accents only* — `👋` after a greeting,
the Colombian flag `🇨🇴` next to the *“Plataforma colombiana”* chip on the landing.
Never in running body copy, tables, or buttons. Never decorative.

**Writing voice cheatsheet.**

| Do | Don't |
|---|---|
| “Sabe en 1 minuto…” | “Nuestra plataforma le permite saber…” |
| “Aquí tienes el resumen.” | “A continuación se presenta el resumen.” |
| “Tu archivo se analiza de forma privada.” | “La información del usuario es confidencial.” |
| Plain-Spanish explainers (“Cumples la mayoría de requisitos…”) | Legalese |

---

## Visual foundations

### Anchor colors

Two anchor families carry the brand:

- **Navy** (`--navy-900` `#0b1a3a` → `--navy-950` `#060f24`) — the **left sidebar**
  in the app, the **hero panel** on the landing, and always the backing color
  behind the logo. Navy is *always* paired with `--fg-inverse` (white) or
  `--fg-on-dark-2` (`#c7d2e3`) for body copy on dark.
- **Graphite** (`--graphite-900` → `--graphite-50`) — the neutral ramp for all
  light-surface ink, borders, and canvas. Very slightly cool-warm neutral,
  NOT true grey.

Accent **royal blue** `--blue-600` `#2563eb` is the single primary-action color —
used on the filled CTA button, on active nav items, selected table rows,
links, and the active step of the processing stepper. It is never used as a
decorative background.

### Semaphore (the product's whole point)

The traffic-light trio is a **functional** color system, not decorative:

| Token | Hex | Meaning | Where it appears |
|---|---|---|---|
| `--green-500` | `#22c55e` | **Elegible / Cumple** | Big pill, semáforo light, check icons, status dot |
| `--amber-500` | `#f59e0b` | **Observaciones / Cumple con observaciones** | Warning triangle, middle light |
| `--red-500` | `#ef4444` | **No elegible / No cumple** | X icon, bottom light |

Each has a full 50–700 ramp for chips, tints and rows. Green is *also* the
logo accent, which is why the green has extra semantic weight.

### Tinted icon wells

Icons in KPI cards sit in **pastel circular wells** (`--tint-blue`, `--tint-green`,
`--tint-amber`, `--tint-red`, `--tint-violet`). The well is `~44×44px` with a
`50%` radius; the icon inside is the same hue but `-500` or `-600`. Never put a
stroked icon on a saturated background.

### Typography

- Display / UI family: **Geist** (variable, weight axis 100–900). Self-hosted
  from `/fonts/Geist-VariableFont_wght.ttf`. Designed by Vercel — geometric,
  generous-aperture, modern-neutral; it nails the trustworthy / startup-modern
  character of the mocks and pairs naturally with JetBrains Mono.
- Monospace: **JetBrains Mono** (process numbers like `LP-2024-0025`, IDs, file sizes).
- Weights in use: 400 body, 500 emphasis, 600 section titles, 700 H1 / numeric KPIs, 800 landing display.
- Letter-spacing is **tight** on displays (`-0.03em` to `-0.035em`), normal on body.
- Line-heights: `1.05` display, `1.25` titles, `1.5` body, `1.65` reading paragraphs.

> ✅ **Font confirmed:** Geist Variable, self-hosted in `/fonts/`. Wired in via
> `@font-face` at the top of `colors_and_type.css`.

### Spacing, radii, density

- **4-point base.** `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80`.
- **Card radius**: `12px` default (`--radius-lg`), `16px` for hero cards / modals (`--radius-xl`),
  `20px` for the big landing upload card and feature cards.
- **Pill / chip radius**: fully rounded (`--radius-pill`).
- **Input / button radius**: `8px` (`--radius-md`).
- **Density**: generous. Table rows are ~64px tall on screens with avatar; inputs are 40–44px. Not cramped.

### Cards

The card is the unit of layout. Every card on a light surface has:

1. Background `#fff` (`--surface-card`)
2. `1px` hairline `--border-hairline` (`#eef1f6`)
3. Very low shadow: `--shadow-sm` (airy, barely visible)
4. `12px` radius, `20–28px` inner padding
5. Card titles at `var(--fs-h3)` / weight 600, a thin divider `--border-subtle` below before content

Cards **never** have colored left-border accents — that's an AI-slop trope we're
avoiding. Status is communicated by chips, dots or full-background fills on
specific rows, not by edge borders.

### Shadows & elevation

Low and airy. There are *five* defined shadows (`xs`, `sm`, `md`, `lg`, `xl`) —
most screens stick to `sm`. `md` for popovers, `lg` for modals, `xl` reserved
for the hero “traffic light” card. Pixel-snap is enforced (no fractional px).

### Backgrounds

- **Marketing / hero**: solid `--navy-900` full-bleed panels, occasionally with a
  faint radial glow. No gradients behind text. No purple-blue gradients.
- **App canvas**: `#f5f7fb` (`--surface-canvas`) with white cards floating on it.
- **Images**: cool-toned, clean product shots. The landing hero shows a raster
  traffic light on the right — a literal, playful rendering of the product's semáforo metaphor.
- **No** repeating patterns, grain, or handdrawn illustrations anywhere.

### Animation & motion

- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (an exaggerated ease-out) for entrances; standard ease-in-out for state changes.
- **Durations**: `120ms` for hover/focus, `180ms` for button states and toasts, `280ms` for modals.
- **Entrance**: 6-8px vertical rise + fade. No spring, no bounce.
- **Processing screen** is the one place with more expressive motion: a rotating ring around the current step (`~1.4s` linear), a shimmer on the progress bar, a gentle pulse on the active stepper number.

### Interaction states

- **Hover** on primary button: `--blue-700` background, no translate.
- **Hover** on secondary / ghost: `--graphite-100` background fill.
- **Hover** on table row: `--graphite-50` fill.
- **Active/pressed**: `--blue-800` for primary; no shrink/scale.
- **Focus**: always visible — 4px blue halo (`--shadow-focus`). Never rely on color alone.
- **Selected nav**: white text, `--navy-800` bg on the sidebar, blue accent bar on the left edge (2px).
- **Disabled**: `0.5` opacity, `cursor: not-allowed`, no shadow.

### Borders & dividers

- Hairline (`#eef1f6`) between rows inside a card.
- `--border-subtle` (`#e2e8f0`) between cards or between card and header.
- `--border-default` (`#cbd5e1`) on inputs and outline buttons.
- Dashed `2px --border-subtle` on the drop-zone.

### Transparency & blur

Used only for modal backdrops (`rgba(6, 15, 36, 0.55)` + `backdrop-filter: blur(4px)`)
and the “info” reassurance banner on upload screens (a 6%-alpha blue fill on white,
no blur). No frosted-glass chrome anywhere.

### Layout rules

- **Sidebar fixed** `244px` with navy background; scrolls independently; logo pinned top; user card pinned bottom; credits mini-card above user.
- **Top area** of each screen = page title + short description + primary action on the right.
- **Content** = one or more cards, 24px gaps between them.
- **Max content width** `1280px` centered on ultra-wide displays.
- **Grids** snap to 4 or 5 columns for KPI rows.

### What we avoid (explicitly)

- ❌ Bluish-purple gradient backgrounds
- ❌ Decorative emoji in buttons or data cells
- ❌ Colored left-border accents on cards
- ❌ Hand-drawn SVG illustrations
- ❌ Patterns / grain / noise textures
- ❌ Skeuomorphic shadows
- ❌ ALL-CAPS running text (the wordmark is the only exception)

---

## Iconography

The mocks consistently use **outline / stroked icons at 1.5–2px stroke weight**
with **round line caps and joins**. The character matches **Lucide** almost
exactly (the open-source fork of Feather). A few icons in the screens — the
capsule cylinder for credits, the handshake for team — are closer to
**Heroicons outline**, which shares the same stroke language.

We **do not** ship our own icon font or SVG sprite. Instead:

- **Primary set: Lucide** — loaded from CDN (`lucide@latest` JS or raw SVGs).
  Used for: `upload-cloud`, `file-text`, `bar-chart-3`, `bell`, `credit-card`,
  `users`, `settings`, `check-circle-2`, `alert-triangle`, `x-circle`,
  `eye`, `download`, `filter`, `search`, `chevron-down`, `chevron-right`, `sparkles`, `shield-check`, `clock`, `plus`, `x`, `arrow-up-right`, `database`.
- **Fallback / compound set: Heroicons Outline** — for the 2–3 glyphs Lucide lacks at the right weight (notably the stacked-database icon and the handshake).

> Flag: substitution made. If the real COLTRATOS product ships a custom icon
> set, drop the SVGs into `assets/icons/` and update `ui_kits/coltratos-app/Icon.jsx`
> — the rest of the kit reads through that component.

**Emoji.** Two allowed: `👋` (greeting) and `🇨🇴` (the *“Plataforma colombiana”* chip on marketing). Nowhere else.

**Unicode.** `•` (bullet between metadata fields like `1.87 MB · PDF`), `×` only for the file-remove affordance — but the live component uses the Lucide `x` icon rather than the glyph.

**Logo.** The COLTRATOS mark is a stylized **hex-faceted “C”** in a gradient
green (`#4ade80` → `#22c55e`) — geometric, prismatic, suggestive of a
layered/faceted contract document. The wordmark sits to its right in
bold uppercase white (on navy) or `--graphite-900` (on light).
See `assets/logo/` for variants.

---

## Index (manifest)

| File / folder | What it is |
|---|---|
| `README.md` | This file |
| `SKILL.md` | Agent Skill manifest — tells Claude how to use this system |
| `colors_and_type.css` | Core tokens: color, type, spacing, radii, shadow, motion |
| `assets/logo/` | Logo SVG + favicon |
| `assets/icons/` | Local icon snapshots (Lucide subset) |
| `assets/screens/` | Source reference mocks (PNG) |
| `preview/` | Small HTML cards — each one visual specimen (rendered in the Design System tab) |
| `ui_kits/coltratos-app/` | The web app UI kit — JSX components + `index.html` interactive demo |
| `fonts/` | (empty — we use Google-served webfonts; drop `.woff2` files here to self-host) |
| `uploads/` | Untouched original references |

### Next steps / open questions

1. ~~Confirm the typeface~~ ✅ Geist Variable, self-hosted.
2. Confirm icon system — is it Lucide, or a custom set?
3. Supply the real COLTRATOS **logo SVG** (current asset is my recreation based on the raster mocks).
4. Do the Alerts and Admin Analytics screens exist as mocks? They're in the product spec but not in the 8 uploaded images.
