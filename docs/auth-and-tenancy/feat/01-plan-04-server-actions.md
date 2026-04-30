# T4: Auth Server Actions

## Scope

- `src/app/(auth)/actions.ts` — New file: all auth server actions

## Changes

### File setup

- `'use server'` directive at the top.
- Import `createServerClient` from `@/lib/supabase/server`.
- Import `redirect` from `next/navigation` and `revalidatePath` from `next/cache`.

### `signup(email: string, password: string): Promise<{ error?: string }>`

- Call `supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/confirm` } })`.
- Derive `origin` from `headers().get('origin')` (available in server actions).
- On success (`data.user` present, no error): return `{}` — the caller renders a "check your email" message.
- On Supabase error: return `{ error: error.message }`.
- Do NOT call any empresa-creation code — REQ-006 trigger handles it.

### `login(email: string, password: string, redirectTo?: string): Promise<{ error?: string }>`

- Call `supabase.auth.signInWithPassword({ email, password })`.
- On success: `revalidatePath('/', 'layout')` then `redirect(redirectTo ?? '/dashboard')`.
- On error: return `{ error: error.message }`.

### `signOut(): Promise<void>`

- Call `supabase.auth.signOut()`.
- `revalidatePath('/', 'layout')`.
- `redirect('/login')`.

### `forgotPassword(email: string): Promise<void>`

- Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?type=recovery` })`.
- Return void — always display "check your email" to the caller regardless of result.
- Do NOT surface Supabase errors here (prevents email enumeration per RN-010).

### `updatePassword(password: string): Promise<{ error?: string }>`

- Call `supabase.auth.updateUser({ password })`.
- On success: `revalidatePath('/', 'layout')` then `redirect('/dashboard')`.
- On error: return `{ error: error.message }`.

### Design Rationale (Single Responsibility)

All auth side-effects live in one file. Pages import actions by name — no auth logic leaks into component files. The `'use server'` boundary ensures the Supabase service-role key (if ever used) cannot reach the browser.

## Dependencies

Requires T1 — `createServerClient` from `@/lib/supabase/server` must exist.

## Done When

- [ ] `src/app/(auth)/actions.ts` exists with all five exported async functions
- [ ] `signup` does not call any empresa-insertion code
- [ ] `forgotPassword` always returns void (no error exposed to caller)
- [ ] `npm run typecheck` passes on this file
- [ ] Manual smoke test: `login` with valid credentials → redirects to `/dashboard`
- [ ] Manual smoke test: `login` with invalid credentials → returns `{ error: string }`
