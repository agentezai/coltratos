# T3: Copy logo SVGs to `public/logo/` + add `app/icon.svg` favicon

## Scope

- `public/logo/coltratos-mark.svg` — copied from bundle, with leading warning comment
- `public/logo/coltratos-lockup.svg` — copied from bundle, with leading warning comment
- `app/icon.svg` — Next.js convention-based favicon, set to the mark, with leading warning comment
- `app/layout.tsx` — no metadata edit needed (Next.js detects `app/icon.svg` by convention)

## Changes

### Copy logo files

- `cp docs/design-system/source/project/assets/logo/coltratos-mark.svg public/logo/`
- `cp docs/design-system/source/project/assets/logo/coltratos-lockup.svg public/logo/`
- `cp docs/design-system/source/project/assets/logo/coltratos-mark.svg app/icon.svg`

### Add warning comment (REQ-013)

For each of `public/logo/coltratos-mark.svg`, `public/logo/coltratos-lockup.svg`, `app/icon.svg`:

1. Open the file.
2. Insert immediately after any `<?xml ...?>` declaration (or at the top if there is no XML decl) the comment:
   ```xml
   <!-- ⚠️ Reverse-engineered from raster mocks. Replace with authoritative COLTRATOS SVG when supplied by the design team. -->
   ```
3. The bundle's `coltratos-mark.svg` does not have an XML declaration, so the comment goes on line 1, before the `<svg>` element.

### Verify favicon resolves

- Run `npm run dev`.
- `curl -I http://localhost:3000/icon.svg` returns HTTP 200 with `Content-Type: image/svg+xml`.
- The browser tab favicon updates (verify visually).

### Design Rationale (REQ-013, RN-008)

- Next.js 16's App Router resolves `app/icon.svg` automatically as the favicon — no `<link rel="icon">` in `<head>` is needed. We exploit the convention.
- The warning comment is a tracer: any reviewer opening the SVG sees that this asset is provisional. RN-008 forbids downstream specs from locking layout to its exact geometry. When the real SVG arrives, a `/nybo-plan edit design-system` revision replaces these three files and removes the warning.

## Dependencies

Requires T1 — ADRs must be in place. No dependency on T2 (fonts) or T4 (tokens); could run in parallel with T2 if the executor supports it.

## Done When

- [ ] `public/logo/coltratos-mark.svg` exists
- [ ] `public/logo/coltratos-lockup.svg` exists
- [ ] `app/icon.svg` exists
- [ ] All three files contain the literal warning comment string `⚠️ Reverse-engineered from raster mocks` near the top
- [ ] `npm run dev` serves `/icon.svg` with HTTP 200
- [ ] `npm run dev` serves `/logo/coltratos-mark.svg` with HTTP 200
- [ ] `npm run dev` serves `/logo/coltratos-lockup.svg` with HTTP 200
- [ ] Visually confirm the browser tab's favicon is the green C-mark (not Next.js's default `next.svg`)
