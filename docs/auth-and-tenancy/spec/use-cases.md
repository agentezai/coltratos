# auth-and-tenancy — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Pilot | A Colombian SME representative registering to use COLTRATOS for the first time |
| Usuario autenticado | A user with an active Supabase session tied to an empresa |
| Sistema | Next.js middleware, Server Actions, and the Supabase Auth + DB layer |

---

## User Stories

### US-01 — Signup

**As a** Pilot
**I want** to register with my email and password
**So that** I can access the platform and start analyzing pliegos for my empresa

### US-02 — Login and logout

**As a** Usuario autenticado
**I want** to log in with my credentials and log out when done
**So that** my empresa's data remains private when I am not using the platform

### US-03 — Email verification

**As a** newly registered Pilot
**I want** to verify my email address via the link Supabase sends
**So that** my account is confirmed and I can start working

### US-04 — Password reset

**As a** Usuario autenticado who forgot their password
**I want** to request a reset link and set a new password
**So that** I can regain access without creating a new account

### US-05 — Protected route access

**As a** Sistema
**I want** to redirect unauthenticated requests away from protected routes
**So that** only authenticated users can access empresa data and analysis screens

### US-06 — Tenant data isolation

**As a** Usuario autenticado
**I want** queries I issue to only return my empresa's rows
**So that** competitor empresas cannot see my eligibility verdicts or analysis history

---

## Use Case Scenarios

### UC-01 — Signup (US-01)

**Preconditions:** User has a valid email address. No prior account exists for that email.

#### Main Scenario

1. User navigates to `/signup`.
2. User enters email and password and submits the form.
3. Sistema calls `supabase.auth.signUp(...)` and receives a pending-verification response.
4. Postgres trigger `handle_new_user` fires and inserts an `empresa` row and an `empresa_member(role=owner)` row.
5. Sistema displays "check your email" message.
6. User receives verification email and clicks the link → UC-03.

#### Alternative Scenarios

**2a. Email already registered**
Supabase returns an error. The form displays the error inline. No new user or empresa is created.

#### Error Scenarios

**3e. Supabase Auth is unavailable**
The server action returns a network error. The form displays "Something went wrong — please try again." No empresa row is created.

**Postconditions:** `auth.users`, `empresa`, and `empresa_member` rows exist. Session is not yet active (pending email verification).

---

### UC-02 — Login (US-02)

**Preconditions:** User has a verified account.

#### Main Scenario

1. User navigates to `/login`.
2. User enters credentials and submits.
3. Sistema calls `supabase.auth.signInWithPassword(...)`.
4. Supabase returns a session; middleware writes the session cookie.
5. Sistema redirects to `/dashboard` (or the `redirectTo` query param).

#### Alternative Scenarios

**2a. User arrived from a protected route redirect**
The `redirectTo` query param is preserved. After login, the user lands on the originally requested page.

#### Error Scenarios

**3e. Invalid credentials**
Supabase returns `Invalid login credentials`. The form displays the message inline. No redirect occurs.

**Postconditions:** Active session cookie is present. User can access protected routes.

---

### UC-03 — Email Verification (US-03)

**Preconditions:** User clicked the Supabase verification link from their inbox.

#### Main Scenario

1. Browser navigates to `/auth/confirm?token_hash=<token>&type=email`.
2. Route handler calls `supabase.auth.verifyOtp({ token_hash, type: 'email' })`.
3. Supabase verifies the token and establishes a session.
4. Route handler redirects to `/dashboard`.

#### Error Scenarios

**2e. Token is expired or already used**
Supabase returns an error. Route handler redirects to `/login?error=Verification+link+expired`.

**Postconditions:** Session is active. User can access protected routes.

---

### UC-04 — Password Reset (US-04)

**Preconditions:** User has a registered email address.

#### Main Scenario

1. User navigates to `/forgot-password` and submits their email.
2. Sistema calls `forgotPassword(email)` — always returns "check your email."
3. User receives reset email and clicks the link.
4. Browser navigates to `/auth/confirm?token_hash=<token>&type=recovery`.
5. Route handler verifies the token and establishes a recovery session.
6. Route handler redirects to `/reset-password`.
7. User submits a new password.
8. Sistema calls `updatePassword(password)` and redirects to `/dashboard`.

#### Error Scenarios

**7e. New password fails Supabase validation** (too short, etc.)
`updatePassword` returns the Supabase error. The form displays it inline.

**Postconditions:** Password updated. Active session established. User lands on `/dashboard`.

---

### UC-05 — Protected Route Guard (US-05)

**Preconditions:** A request is made to a protected path (`/dashboard/**`, `/analisis/**`, `/empresa/**`).

#### Main Scenario

1. Next.js middleware intercepts the request.
2. `updateSession()` calls `supabase.auth.getUser()` — returns null (no session).
3. Middleware returns a redirect response to `/login?redirectTo=<original-path>`.

#### Alternative Scenarios

**2a. Valid session exists**
`getUser()` returns a user. Middleware allows the request to continue.

**2b. Session exists but is expired**
`@supabase/ssr` refreshes the access token from the refresh token in the cookie. If refresh succeeds, the request continues. If it fails, the user is redirected to `/login`.

**Postconditions:** Only authenticated users reach protected route handlers.

---

### UC-06 — Tenant Data Isolation (US-06)

**Preconditions:** RLS policies are enabled. Two empresa accounts exist with separate `analisis` rows.

#### Main Scenario

1. Usuario autenticado (empresa A) issues `SELECT * FROM analisis` via the anon-key Supabase client.
2. Supabase evaluates RLS: `EXISTS (SELECT 1 FROM empresa_member WHERE empresa_id = analisis.empresa_id AND user_id = auth.uid())`.
3. Only rows where `analisis.empresa_id` matches empresa A's membership are returned.
4. Empresa B's rows are absent from the result set.

#### Error Scenarios

**2e. RLS policy missing or misconfigured**
Cross-tenant rows are visible — this is a P0 data-leakage incident. Caught by TC-007, TC-008 integration tests before shipping.

**Postconditions:** The authenticated user sees only their empresa's private data.

---

## UX/UI References

Auth pages follow the Coltratos design system. See UX/UI section in [spec.md](./spec.md#uxui).
