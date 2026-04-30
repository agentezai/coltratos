# Suggestions: auth-and-tenancy

## Quick Wins

**[S001] Add `turbopack.root` to `next.config.ts`**
The build emits a workspace-root warning on every run. Add `turbopack: { root: __dirname }` to silence it. One-line change.

**[S002] Write integration tests against local Supabase**
T3 verification (TC-001, TC-007, TC-008, TC-009) requires `supabase start`. Create `src/__tests__/auth-tenancy.integration.test.ts` and wire it into a separate `npm run test:integration` script so it runs in CI with a hosted Supabase instance.

**[S003] Add a `/dashboard` stub page**
Authenticated users redirect to `/dashboard` but the route doesn't exist yet. A minimal `app/dashboard/page.tsx` placeholder prevents a 404 flash after login during pilot testing.

## Future Enhancements

**[S004] Confirm email-sent state persists across refreshes**
The signup success state is in-memory. A page refresh loses it. Consider redirecting to `/signup/check-email` (a static page) so the "check your email" message survives a refresh.

**[S005] Add rate limiting on auth routes**
The proxy (middleware) currently has no rate limiting on `/login` and `/signup`. For pilot readiness, consider adding IP-based rate limiting in `proxy.ts` (e.g. a simple in-memory counter or Upstash Redis) before opening signup to external users.

**[S006] Toast or banner on auth errors post-redirect**
`/auth/confirm` currently passes errors as query params (`/login?error=...`). The login page doesn't read or display this param. A `useSearchParams` check on `/login` for the `error` param would surface expired-link errors to the user.

## Technical Debt

**[S007] Duplicate page files in `src/app/(auth)/` and `app/(auth)/`**
The canonical pages are in `app/(auth)/` (Next.js routing) but copies remain in `src/app/(auth)/` from the initial creation. Delete `src/app/` to avoid divergence — only `src/app/(auth)/actions.ts` should remain (it's imported via `@/app/(auth)/actions`).

**[S008] Cookie type cast in server.ts and middleware.ts**
The `setAll` implementation uses `as Parameters<...>[2]` type casts to work around `@supabase/ssr`'s untyped cookie options. If `@supabase/ssr` ships typed cookie options in a future patch, remove the casts.

## Questions for the Human

**[S009] Should `/reset-password` be protected by middleware?**
Currently, the reset-password page is an auth route (no session required). But `updatePassword` requires a Supabase recovery session. If a user navigates to `/reset-password` without a recovery session, the action will fail silently. Should the middleware check for a recovery session and redirect to `/forgot-password` if absent?

**[S010] Storybook stories for auth pages?**
The design-system has stories for all UI primitives. Should the auth pages (login, signup) get Storybook stories for design QA, or is that deferred until the design system has an Input component?
