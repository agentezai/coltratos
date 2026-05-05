# Progress: fix-auth-confirm-pkce-2026-05-01

## T1: Route handler — PKCE + OTP dual-flow

- [x] Implement T1: Add `code` branch to `GET /auth/confirm` — `exchangeCodeForSession(code)` called before OTP guard. **Already applied.**
- [x] Verify T1: Write regression tests TC-001 through TC-006 in `src/__tests__/auth-confirm-route.test.ts`. All 7 cases pass (TC-006 split into TC-006 + TC-006b for full coverage of the missing-params guard). Run: 2026-05-01.
