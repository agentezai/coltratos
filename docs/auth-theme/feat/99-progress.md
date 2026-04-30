# auth-theme — Progress

### T1: Auth Layout — Logo + Background Token
- [x] Implement T1: Replace text logo with coltratos-lockup.svg, bg-neutral-50 → bg-graphite-50 in app/(auth)/layout.tsx
- [x] Verify T1: Logo SVG in DOM, no neutral-* class, build clean

### T2: Auth Form Pages — Button + Graphite Tokens + Story Fix
- [x] Implement T2: Replace raw buttons with Button component, swap neutral-* → graphite-*, fix WithAuthError story play function
- [x] Verify T2: All submit buttons have data-component="button", npm run test green including story

### T3: Dashboard Layout — Sidebar + Topbar Wiring
- [x] Implement T3: Create app/dashboard/layout.tsx with Sidebar + Topbar, fix dashboard page heading token
- [x] Verify T3: Sidebar and Topbar in dashboard DOM, no layout overflow, build clean
