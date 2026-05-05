# TDD Contract: auth-and-tenancy

Framework: **vitest** (named imports, `environment: 'node'`)
Integration tests require: `supabase start` (local Docker stack)

---

## Task T1: Supabase Auth Client Utilities

### Behavior: createServerClient is importable (REQ-001)

**Given** `src/lib/supabase/server.ts` is written
**When** a server context imports `{ createServerClient } from '@/lib/supabase'`
**Then** TypeScript resolves the type without error and the function is callable

**Test file:** `src/__tests__/auth-client-types.test-d.ts`
**Framework:** vitest type-testing (`vitest/type-testing`)

---

### Behavior: browser client has no server-only imports (REQ-002, RN-001)

**Given** `src/lib/supabase/client.ts` exists
**When** the file content is grep'd for `next/headers` and `SUPABASE_SERVICE_ROLE_KEY`
**Then** both searches return zero matches

**Test file:** `src/__tests__/rsc-purity.test.ts` (extend existing purity test)
**Framework:** vitest

---

## Task T3: RLS + Empresa Provisioning Migration

### Behavior: signup trigger creates empresa + empresa_member (REQ-006, TC-001)

**Given** the local Supabase stack is running with the migration applied
**When** `supabase.auth.signUp({ email: 'trigger-test@example.com', password: 'Test1234!' })` is called
**Then** `SELECT * FROM empresa_member WHERE user_id = <new-user-id>` returns one row with `role = 'owner'`
**And** `SELECT * FROM empresa WHERE id = <empresa_id>` returns one row

**Test file:** `src/__tests__/auth-tenancy.integration.test.ts`
**Framework:** vitest (`environment: 'node'`, requires `supabase start`)

---

### Behavior: cross-tenant isolation on analisis (REQ-005, TC-007, NFR-04)

**Given** empresa A and empresa B users are created, each with one `analisis` row
**When** empresa A's anon-key Supabase client executes `SELECT * FROM analisis`
**Then** the result contains exactly one row (empresa A's), not empresa B's

**Test file:** `src/__tests__/auth-tenancy.integration.test.ts`
**Framework:** vitest integration

---

### Behavior: cross-tenant isolation on requisito (REQ-005, TC-008, NFR-04)

**Given** empresa A and empresa B each have `requisito` rows linked to their analyses
**When** empresa A's client executes `SELECT * FROM requisito`
**Then** the result contains only empresa A's rows; empresa B's rows are absent

**Test file:** `src/__tests__/auth-tenancy.integration.test.ts`
**Framework:** vitest integration

---

### Behavior: public table accessible to any authenticated user (REQ-005, TC-009, RN-006)

**Given** empresa A inserted a `proceso` row
**When** empresa B's anon-key client executes `SELECT * FROM proceso WHERE id = '<proceso_id>'`
**Then** the row is returned (no empresa gate on public tables)

**Test file:** `src/__tests__/auth-tenancy.integration.test.ts`
**Framework:** vitest integration

---

## Task T4: Auth Server Actions

### Behavior: login returns error for invalid credentials (REQ-008, TC-003)

**Given** a valid user account exists
**When** `login('valid@email.com', 'wrong-password')` is called
**Then** the return value is `{ error: string }` — no redirect thrown

**Test file:** `src/__tests__/auth-actions.test.ts`
**Framework:** vitest (mock `createServerClient` → mock Supabase error response)

---

### Behavior: forgotPassword never exposes error (REQ-010, TC-010, RN-010)

**Given** `forgotPassword` is called with a non-existent email
**When** Supabase returns an error internally
**Then** the function returns void (no error propagated to caller)

**Test file:** `src/__tests__/auth-actions.test.ts`
**Framework:** vitest

---

### Behavior: signup does not call empresa-creation code (REQ-007, RN-007)

**Given** `signup` is called
**When** the server action runs
**Then** no `INSERT INTO empresa` SQL is issued from the application layer (verified by mocking `createServerClient` and asserting no DB calls for empresa table)

**Test file:** `src/__tests__/auth-actions.test.ts`
**Framework:** vitest

---

## Task T5: Auth Pages UI

### Behavior: /auth/confirm with valid email token redirects to /dashboard (REQ-009, TC-004)

**Given** a valid `token_hash` and `type=email`
**When** `GET /auth/confirm?token_hash=<valid>&type=email` is called
**Then** the response status is 3xx and `Location` header is `/dashboard`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`
**Framework:** vitest (mock `verifyOtp` to return success)

---

### Behavior: /auth/confirm with invalid token redirects to /login with error (REQ-009)

**Given** an expired or invalid `token_hash`
**When** `GET /auth/confirm?token_hash=<invalid>&type=email` is called
**Then** the response is a 3xx redirect to `/login?error=<message>`

**Test file:** `src/__tests__/auth-confirm-route.test.ts`
**Framework:** vitest (mock `verifyOtp` to return error)
