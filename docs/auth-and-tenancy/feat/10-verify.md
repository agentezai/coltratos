# Verification Plan

## T1: Supabase Auth Client Utilities

### Test Scenarios
- Import `createServerClient` from `@/lib/supabase` in a Server Component — no TypeScript errors.
- Import `createBrowserClient` from `@/lib/supabase` in a `'use client'` file — no errors.
- Purity grep: confirm `SUPABASE_SERVICE_ROLE_KEY` does not appear in `src/lib/supabase/client.ts`.
- `npm run typecheck` exits 0 on the new files.

### Gate Criteria
Both factories are importable from `@/lib/supabase`, TypeScript types resolve correctly, and the browser client file contains no server-only imports (`next/headers`).

---

## T2: Middleware

### Test Scenarios
- Send a GET to `/dashboard` with no cookie → verify 3xx redirect to `/login?redirectTo=/dashboard`.
- Send a GET to `/login` with a valid session cookie → verify 3xx redirect to `/dashboard`.
- Send a GET to `/api/health` (a non-protected, non-auth path) → verify pass-through (no redirect).
- `npm run build` succeeds — middleware compiles to edge runtime without errors.

### Gate Criteria
TC-005 and TC-006 pass. `npm run build` exits 0.

---

## T3: RLS + Empresa Provisioning Migration

### Test Scenarios
- `supabase db reset` applies the migration cleanly (no SQL errors).
- TC-001: Signup with test credentials → `empresa` and `empresa_member(role=owner)` rows appear in DB.
- TC-007: Authenticate as empresa A user; `SELECT * FROM analisis` returns only empresa A rows.
- TC-008: Authenticate as empresa A user; `SELECT * FROM requisito` returns only empresa A rows.
- TC-009: Authenticate as empresa B user; `SELECT * FROM proceso WHERE id = '<proceso inserted by A>'` returns the row.
- TC-010 (negative): Authenticate as anon (unauthenticated); `SELECT * FROM analisis` returns 0 rows (RLS blocks all).

### Gate Criteria
All six integration tests pass against the local Supabase stack (`supabase start`). The `handle_new_user` trigger is confirmed present via `\df public.handle_new_user` in psql.

---

## T4: Auth Server Actions

### Test Scenarios
- Call `signup(email, password)` with a fresh email → no error returned; `auth.users` row created.
- Call `signup(email, password)` with an existing email → `{ error: string }` returned.
- Call `login(email, password)` with valid creds → redirect to `/dashboard` (session cookie set).
- Call `login(email, password)` with wrong password → `{ error: 'Invalid login credentials' }`.
- Call `signOut()` → session cookie cleared; response redirects to `/login`.
- Call `forgotPassword('unknown@example.com')` → returns void (no error exposed).

### Gate Criteria
TC-002, TC-003, TC-010, TC-011 pass via manual smoke test or integration test. `npm run typecheck` exits 0 on `actions.ts`.

---

## T5: Auth Pages UI

### Test Scenarios
- Navigate to `/signup` → form renders; submit with valid data → "Revisa tu correo" message appears.
- Navigate to `/login` → submit with valid credentials → redirect to `/dashboard`.
- Navigate to `/login` → submit with wrong password → inline error displayed; no redirect.
- Navigate to `/forgot-password` → submit any email → "Si el correo está registrado..." message appears (no error).
- Navigate to `/auth/confirm?token_hash=<valid>&type=email` → redirect to `/dashboard`.
- Navigate to `/auth/confirm?token_hash=<expired>&type=email` → redirect to `/login?error=...`.
- Inspect `(auth)/layout.tsx` DOM: no `<Topbar>` or `<Sidebar>` present.

### Gate Criteria
All seven scenarios pass. `npm run build` exits 0.

---

## End-to-End Verification

**Final acceptance test:**
1. Run `supabase db reset` — confirm no migration errors.
2. Run `npm run dev` — confirm server starts without errors.
3. Navigate to `/dashboard` without a session → confirm redirect to `/login?redirectTo=/dashboard`.
4. Navigate to `/signup` → register with a fresh email → confirm "Revisa tu correo" message.
5. Confirm `empresa` and `empresa_member` rows exist in Supabase Studio for the new user.
6. Complete email verification via the link → confirm redirect to `/dashboard`.
7. Log out → confirm session cookie cleared → confirm redirect to `/login`.
8. Log in again → confirm redirect to `/dashboard`.
9. In Supabase Studio, create a second empresa manually and insert an `analisis` row for it. Authenticate as the first empresa's user and confirm `SELECT * FROM analisis` does not return the second empresa's row.

**Gate Criteria:** All nine steps complete without error. Cross-tenant isolation is confirmed in step 9. `npm run build` exits 0.
