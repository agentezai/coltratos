# TDD Contract: fix-auth-confirm-pkce

**Feature:** fix-auth-confirm-pkce-2026-05-01  
**Framework:** Vitest  
**Test file:** `src/__tests__/auth-confirm-route.test.ts`

> The fix is already applied. These contracts guide writing regression tests to prevent recurrence.
> Run `/nybo-run fix-auth-confirm-pkce-2026-05-01` to implement them.

---

## Task T1: Route handler — PKCE + OTP dual-flow

### Behavior: PKCE code param — happy path (TC-001)

**Given** a GET request to `/auth/confirm?code=valid-pkce-code`  
**When** `exchangeCodeForSession('valid-pkce-code')` resolves without error  
**Then** the response redirects to `/dashboard` with a 3xx status

**Test file:** `src/__tests__/auth-confirm-route.test.ts`  
**Framework:** Vitest  
**Notes:** Mock `supabase.auth.exchangeCodeForSession` to return `{ error: null }`. Assert redirect URL ends with `/dashboard`.

---

### Behavior: PKCE code param — exchangeCodeForSession fails (TC-002)

**Given** a GET request to `/auth/confirm?code=bad-or-expired-code`  
**When** `exchangeCodeForSession(code)` resolves with `{ error: { message: 'invalid grant' } }`  
**Then** the response redirects to `/login?error=invalid+grant`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`  
**Framework:** Vitest  
**Notes:** Assert redirect URL contains `/login?error=` and the encoded error message.

---

### Behavior: OTP token_hash + type — happy path (TC-003)

**Given** a GET request to `/auth/confirm?token_hash=abc123&type=email`  
**When** `verifyOtp({ token_hash: 'abc123', type: 'email' })` resolves without error  
**Then** the response redirects to `/dashboard`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`  
**Framework:** Vitest  
**Notes:** Confirm `exchangeCodeForSession` is NOT called. Confirm `verifyOtp` IS called.

---

### Behavior: OTP token_hash + type=recovery (TC-004)

**Given** a GET request to `/auth/confirm?token_hash=abc123&type=recovery`  
**When** `verifyOtp({ token_hash: 'abc123', type: 'recovery' })` resolves without error  
**Then** the response redirects to `/reset-password`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`  
**Framework:** Vitest

---

### Behavior: No params at all — missing params error (TC-005)

**Given** a GET request to `/auth/confirm` with no query parameters  
**When** the handler evaluates the request  
**Then** the response redirects to `/login?error=Missing+verification+parameters`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`  
**Framework:** Vitest  
**Notes:** This is the regression case — this path must NOT fire when a `code` param is present.

---

### Behavior: Partial OTP params — missing type (TC-006)

**Given** a GET request to `/auth/confirm?token_hash=abc123` (no `type`)  
**When** the handler evaluates the request  
**Then** the response redirects to `/login?error=Missing+verification+parameters`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`  
**Framework:** Vitest  
**Notes:** Confirm neither `exchangeCodeForSession` nor `verifyOtp` is called.

---

## Mocking guidance

`createServerClient()` returns a Supabase client. In unit tests, mock at the module level:

```ts
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
    },
  }),
}))
```

For each test, configure the relevant mock's resolved value before calling the route handler directly (import `GET` from `app/auth/confirm/route.ts`).
