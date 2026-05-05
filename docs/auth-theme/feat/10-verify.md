# auth-theme — Verification Plan

## T1: Auth Layout

**Test Scenarios:**
- Happy path: auth layout renders `coltratos-lockup.svg` and `bg-graphite-50` background
- Edge: logo image does not 404 (file exists in `public/logo/`)

**Gate Criteria:** `<img src="/logo/coltratos-lockup.svg">` present in DOM; no `neutral-*` class in `app/(auth)/layout.tsx`; build clean.

---

## T2: Auth Form Pages

**Test Scenarios:**
- Happy path: each page submit button has `data-component="button"`
- Happy path: input focus shows blue ring (visual check in Storybook)
- Story: `Default` story passes (already passing), `WithAuthError` passes after fix

**Gate Criteria:** `npm run test` green with `WithAuthError` story passing; grep for `neutral-` in touched files returns 0 matches.

---

## T3: Dashboard Layout

**Test Scenarios:**
- Happy path: `/dashboard` renders Sidebar (navy 244px left column) and Topbar (white 72px header)
- Edge: Sidebar doesn't overflow at 1280px viewport
- Edge: main content area scrolls independently when content exceeds viewport height

**Gate Criteria:** `data-component="sidebar"` and `<header>` both in DOM; `npm run build` clean.

---

## End-to-End Verification

1. Run `npm run build` → must exit 0
2. Run `npm run test` → all 80 tests pass (including `WithAuthError` story)
3. Run `npm run dev` → navigate to `/login` — logo SVG visible, form inputs styled with graphite tokens, submit button is blue primary
4. Submit login form → redirect to `/dashboard` — Sidebar and Topbar visible
5. Grep: `grep -r "neutral-" app/(auth) app/dashboard --include="*.tsx"` → 0 matches

**Final Gate:** All 5 steps pass.
