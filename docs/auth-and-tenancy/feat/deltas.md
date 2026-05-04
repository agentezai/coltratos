# Deltas: auth-and-tenancy

## Delta 2026-05-01 — fix | fix-auth-confirm-pkce-2026-05-01

**Mode:** fix  
**Original feature:** auth-and-tenancy  
**Root cause hypothesis:** `GET /auth/confirm` only handled the OTP flow (`?token_hash=&type=`); Supabase PKCE flow sends `?code=` instead, hitting the missing-params guard before the code could be inspected.  
**Fix approach:** Added a `code` check as the first branch of the handler; calls `exchangeCodeForSession(code)` and redirects to `/dashboard` on success, `/login?error=` on failure. OTP path unchanged.  
**Affected domains:** auth

### Tasks modified
- REQ-009 (auth-and-tenancy): now implicitly covers both PKCE (`?code=`) and OTP (`?token_hash=&type=`) flows. Original spec text should be read as inclusive of both paths.

### Impact on memory
- auth domain `.nybo/memory/domains/auth.md` should record the Supabase PKCE vs OTP dual-flow gotcha to prevent recurrence in future auth work.
