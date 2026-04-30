# T5: Auth Pages UI

## Scope

- `src/app/(auth)/layout.tsx` — New file: centered auth layout (no app shell)
- `src/app/(auth)/signup/page.tsx` — New file: signup form
- `src/app/(auth)/login/page.tsx` — New file: login form
- `src/app/(auth)/forgot-password/page.tsx` — New file: request reset email form
- `src/app/(auth)/reset-password/page.tsx` — New file: new password form
- `src/app/auth/confirm/route.ts` — New file: Supabase OTP callback route handler

## Changes

### Auth Layout (`(auth)/layout.tsx`)

- Server Component (no `'use client'`).
- Full-viewport centered card layout: `min-h-screen flex items-center justify-center bg-neutral-50`.
- No Topbar, no Sidebar — standalone auth chrome only.
- Renders the Coltratos wordmark/logo above the card slot.
- Uses design system tokens from Tailwind v4 theme.

### Signup Page (`(auth)/signup/page.tsx`)

- `'use client'` — controlled form with `useState` for email, password, loading, error, and success state.
- On submit: calls `signup(email, password)` from `@/app/(auth)/actions`.
- On error: render error string inline below the submit button.
- On success: render "Revisa tu correo para confirmar tu cuenta." (no redirect — session not active yet).
- Fields: Email (type=email), Password (type=password, minLength=8).
- Submit button: disabled + spinner while `loading === true`.
- Link to `/login` below the form.

### Login Page (`(auth)/login/page.tsx`)

- `'use client'` — controlled form.
- Reads `redirectTo` from `useSearchParams()`.
- On submit: calls `login(email, password, redirectTo)` from `@/app/(auth)/actions`.
- On error: render error string inline.
- Submit button: disabled + spinner while loading.
- Links: "Forgot password?" → `/forgot-password`, "Create account" → `/signup`.

### Forgot Password Page (`(auth)/forgot-password/page.tsx`)

- `'use client'` — email field only.
- On submit: calls `forgotPassword(email)`.
- After submit (regardless of outcome): show "Si el correo está registrado, recibirás un enlace." — never show error (RN-010).
- Link back to `/login`.

### Reset Password Page (`(auth)/reset-password/page.tsx`)

- `'use client'` — password + confirm-password fields.
- Validates that both fields match client-side before calling server action.
- On submit: calls `updatePassword(password)`.
- On error: render Supabase error inline.

### OTP Confirm Route Handler (`src/app/auth/confirm/route.ts`)

- `export async function GET(request: Request)` — Route Handler (server, not client).
- Extract `token_hash` and `type` from `new URL(request.url).searchParams`.
- Call `supabase.auth.verifyOtp({ token_hash, type })` where type is `'email'` or `'recovery'`.
- On success with `type === 'email'`: redirect to `/dashboard`.
- On success with `type === 'recovery'`: redirect to `/reset-password`.
- On error: redirect to `/login?error=${encodeURIComponent(error.message)}`.

### Design Rationale (Route Group Isolation)

The `(auth)` route group shares a layout that is intentionally absent of the app shell. Using a route group (parenthesized name) means Next.js does not include `(auth)` in the URL path — `/signup` not `/(auth)/signup`.

## Dependencies

Requires T2 — middleware must exist so auth routes redirect authenticated users to `/dashboard`.
Requires T4 — server actions must exist to wire form submissions.

## Done When

- [ ] All five page files and one route handler file exist
- [ ] `(auth)/layout.tsx` renders no Sidebar or Topbar components
- [ ] Signup form submits and displays "Revisa tu correo" on success
- [ ] Login form redirects to `/dashboard` on success
- [ ] `/auth/confirm?token_hash=<valid>&type=email` redirects to `/dashboard`
- [ ] `/auth/confirm?token_hash=<invalid>` redirects to `/login?error=...`
- [ ] `npm run typecheck` and `npm run build` pass
