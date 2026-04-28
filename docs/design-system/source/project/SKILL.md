---
name: COLTRATOS Design System
description: Tokens, components and reference UI for COLTRATOS — a Colombian SECOP II procurement-eligibility analysis SaaS. Spanish (Colombia), tú-form, semaphore-driven traffic-light verdicts (Elegible / Observaciones / No elegible), navy + royal-blue + brand-green palette, Plus Jakarta Sans display.
---

# Using the COLTRATOS Design System

## Always start here
1. **Read `README.md`** for product context, content rules, and visual foundations.
2. **Link `colors_and_type.css`** in any HTML file — it provides every CSS custom property used downstream.
3. For app-style screens, also link **`ui_kits/coltratos-app/app.css`** and reuse the JSX components in that folder.

## Voice & language
- Spanish (Colombia), **tú** form, friendly-direct.
- Sentence case for titles and buttons. The wordmark **COLTRATOS** is the only ALL-CAPS — it is a logotype.
- Keep domain terms untranslated: *SECOP II, RUP, UNSPSC, pliego de condiciones, requisitos habilitantes*.
- Currency: `$9.900 COP` (dot thousands). Percentages: `70%`. Time: `48 seg`, `< 1 minuto`.
- Two emoji allowed, contextually: `👋` greeting, `🇨🇴` Colombia chip on marketing. Nowhere else.

## Color cheatsheet
| Use | Token |
|---|---|
| Sidebar, hero | `--navy-900` |
| App canvas | `--surface-canvas` (`#f5f7fb`) |
| Primary CTA | `--blue-600` |
| Elegible / Cumple | `--green-500` |
| Observaciones | `--amber-500` |
| No elegible | `--red-500` |
| Tinted icon well | `--tint-{blue|green|amber|red|violet|sky}` |

## Component reach-fors
- **Card**: white, `--radius-lg` (12px), `--shadow-sm`, hairline border. Never colored left-borders.
- **Chip**: pill with dot — `chip-green`, `chip-amber`, `chip-red`, `chip-blue`, `chip-violet`, `chip-gray`.
- **KPI**: card + tinted well + display-weight number + sub-label.
- **Semaforo hero**: 120px circular light, 6px outer ring of `*-100`, dashed halo at 25% opacity.
- **Stepper**: 4-state pill (todo / active / done) with pulsing blue active.
- **Dropzone**: 2px dashed border on `--surface-sunken`, blue tint on hover.

## Iconography
- Lucide-shaped, 1.75–2px stroke, round caps & joins. The `<Icon>` component in `ui_kits/coltratos-app/shell.jsx` is the single source of truth — extend it there if you need new glyphs.

## Typography
- Display + UI: **Plus Jakarta Sans** (loaded via Google Fonts in the tokens file).
- Mono: **JetBrains Mono** for IDs (`LP-2024-0025`), file metadata, currency in tables.
- Tight tracking on displays (`-0.03em`); never set body in ALL CAPS.

## Don't
- ❌ Bluish-purple gradients
- ❌ Decorative emoji
- ❌ Colored left-border accents on cards
- ❌ Hand-drawn SVG illustrations
- ❌ Patterns, grain, noise textures

## When you need a new screen
1. Open `ui_kits/coltratos-app/index.html` and study the route map.
2. Add a new `Page<Name>` component in a new `pages-*.jsx` file (or extend an existing one).
3. Register it in the `ROUTES` map with a 2-digit-prefixed `data-screen-label`.
4. Reuse `Sidebar`, `Topbar`, `card`, `chip`, `well`, `tbl`, `btn` — don't reinvent.

## Open questions to flag with the user
- Is the typeface really Plus Jakarta Sans, or something custom (Geist, Satoshi, Manrope)?
- Is the icon system Lucide, or custom?
- Real logo SVG, please — current asset is reverse-engineered from the raster mocks.
