# fix-auth-confirm-pkce — Fix Specification

> **Action type:** FIX  
> **Original feature:** auth-and-tenancy  
> **Status:** approved (fix specs are pre-approved)  
> **Created:** 2026-05-01  
> **Fixed by:** Manual — fix already applied before spec was written.

---

## Intention

Email verification links sent by Supabase used the PKCE flow (a `code` query parameter) but `GET /auth/confirm` only handled the OTP flow (`token_hash` + `type`). The missing-params guard fired before the route could inspect `code`, redirecting every newly signed-up user to `/login?error=Missing+verification+parameters`. The fix adds a `code` branch that calls `exchangeCodeForSession(code)` before the OTP path.

---

## Bug Description

| Field | Detail |
|-------|--------|
| **Route** | `app/auth/confirm/route.ts` |
| **Observed** | Clicking the Supabase signup verification email redirected to `/login?error=Missing+verification+parameters` — user could not activate their account. |
| **Expected** | Clicking the verification link should establish a valid session and redirect to `/dashboard`. |
| **Affected use cases** | UC-03 (Email verification), UC-04 (Password reset via PKCE) |

---

## Root Cause

Supabase Auth supports two callback flows for email confirmation:

1. **OTP flow** — Supabase appends `?token_hash=<hash>&type=<type>` to the redirect URL. `verifyOtp()` consumes these.
2. **PKCE flow** (the default in `@supabase/ssr`) — Supabase appends `?code=<authorization_code>` instead. `exchangeCodeForSession()` must consume this.

The original route only checked `token_hash`. The guard:

```ts
if (!token_hash || !type) {
  return NextResponse.redirect('/login?error=Missing+verification+parameters')
}
```

ran _before_ the code was inspected, so PKCE callbacks always hit the error branch.

---

## Fix Approach

**T1 — Route handler: add PKCE code branch (1 task — already applied)**

| Field | Detail |
|-------|--------|
| **File** | `app/auth/confirm/route.ts` |
| **Change** | Added a `code` check at the top of the handler. If `code` is present, call `supabase.auth.exchangeCodeForSession(code)`. On success, redirect to `/dashboard`. On error, redirect to `/login?error=<message>`. Fall through to the existing OTP path when `code` is absent. |
| **Status** | **Already applied** — no implementation work required. |

The resulting control flow:

```
GET /auth/confirm
 ├── code present? → exchangeCodeForSession(code)
 │     ├── success → /dashboard
 │     └── error   → /login?error=<msg>
 ├── token_hash + type present? → verifyOtp({ token_hash, type })
 │     ├── type=recovery → /reset-password
 │     ├── success       → /dashboard
 │     └── error         → /login?error=<msg>
 └── neither → /login?error=Missing+verification+parameters
```

---

## Regression Test Requirement

At least one test must verify the PKCE happy path that would have caught this bug — a `GET /auth/confirm?code=<value>` request must call `exchangeCodeForSession` and redirect to `/dashboard`, not to the error page.

**Minimum test cases required (see `contract/contracts.md`):**

| TC | Scenario | Verifies |
|----|----------|---------|
| TC-001 | PKCE code param — happy path | `exchangeCodeForSession` called; redirect → `/dashboard` |
| TC-002 | PKCE code param — `exchangeCodeForSession` fails | Redirect → `/login?error=<message>` |
| TC-003 | OTP token_hash + type — happy path | `verifyOtp` called; redirect → `/dashboard` |
| TC-004 | OTP token_hash + type=recovery | `verifyOtp` called; redirect → `/reset-password` |
| TC-005 | No params at all | Redirect → `/login?error=Missing+verification+parameters` |
| TC-006 | Only one OTP param present (token_hash without type) | Redirect → `/login?error=Missing+verification+parameters` |

---

## Architecture Notes

- No schema changes. No new dependencies.
- `createServerClient()` from `src/lib/supabase/server.ts` is used as before — no change.
- The fix is purely additive: the PKCE branch is inserted before the existing guard, so the OTP path is untouched.
- Relevant ADR: ADR-003 (RLS tenant isolation) — no impact from this fix.

---

## Related Spec

Original `REQ-009` in [auth-and-tenancy spec](../../auth-and-tenancy/spec/spec.md#functional-requirements) stated that the confirm route handles `?token_hash=&type=`. That requirement implicitly omitted the PKCE branch. After this fix, REQ-009 should be read as: "handles both `?code=` (PKCE) and `?token_hash=&type=` (OTP) callbacks."
