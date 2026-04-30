# T2: Next.js Middleware

## Scope

- `src/lib/supabase/middleware.ts` — New file: session refresh helper
- `src/middleware.ts` — New file: route guard + session refresh entry point

## Changes

### Session Refresh Helper (`src/lib/supabase/middleware.ts`)

- Export `updateSession(request: NextRequest): Promise<NextResponse>`.
- Inside: create a Supabase client using `createServerClient` from `@supabase/ssr` with a custom cookies adapter that reads from `request.cookies` and writes to a `NextResponse`.
- Call `supabase.auth.getUser()` — this refreshes the access token from the refresh token if needed.
- Return the response with updated `Set-Cookie` headers.
- Return value also carries the user (or null) for the caller to use in route logic.
- Do NOT throw on auth failure — return `{ response, user: null }`.

### Route Guard (`src/middleware.ts`)

- Import `updateSession` from `@/lib/supabase/middleware`.
- Define `PROTECTED_PREFIXES = ['/dashboard', '/analisis', '/empresa']`.
- Define `AUTH_ROUTES = ['/login', '/signup', '/forgot-password']`.
- On every request: call `updateSession(request)` to get `{ response, user }`.
- If pathname matches a protected prefix and `user` is null: return `NextResponse.redirect` to `/login?redirectTo=<pathname>`.
- If pathname matches an auth route and `user` is not null: return `NextResponse.redirect` to `/dashboard`.
- Otherwise: return the `response` from `updateSession` (carries refreshed cookies).
- Export `config.matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`.

### Design Rationale (Open/Closed)

Middleware is the single enforcement point. Adding a new protected route means editing only `PROTECTED_PREFIXES` — no per-layout redirect code needed. This keeps each layout closed to auth concerns.

## Dependencies

Requires T1 — `createServerClient` from `@/lib/supabase/server` (via `@supabase/ssr`) must exist.

## Done When

- [ ] `src/lib/supabase/middleware.ts` exists and exports `updateSession()`
- [ ] `src/middleware.ts` exists with `config.matcher` exported
- [ ] Unauthenticated request to `/dashboard` returns 3xx redirect to `/login?redirectTo=/dashboard`
- [ ] Authenticated request to `/login` returns 3xx redirect to `/dashboard`
- [ ] `npm run typecheck` passes on both files
- [ ] `npm run build` succeeds (middleware is compiled to edge runtime)
