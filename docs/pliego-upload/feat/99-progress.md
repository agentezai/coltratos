# Progress Tracker

**Status:** Not Started

**Current Task:** None — awaiting spec approval

---

## Task Checklist

### T1: Validation Utilities
- [ ] Implement T1: Author `lib/pliego-upload/types.ts` (types, constants) and `lib/pliego-upload/validate.ts` (`validatePdfClient`, `validatePdfServer`, `detectPasswordProtection`)
- [ ] Verify T1: Unit tests in `validate.test.ts` pass; no Node.js imports in client validator; TypeScript compiles

### T2: Storage Service + Bucket Policy
- [ ] Implement T2: Author `src/services/pliego-upload/storage.ts` (`uploadPliegoBuffer`) and `supabase/migrations/20260504000010_pliego_storage_policy.sql`
- [ ] Verify T2: Upload function returns correct storage key; migration applies cleanly; RLS policy blocks cross-company reads

### T3: DB RPC — dispatch_pliego_upload
- [ ] Implement T3: Author `supabase/migrations/20260504000011_dispatch_pliego_upload_rpc.sql` with stored procedure + REVOKE/GRANT
- [ ] Verify T3: Insert + pgmq dispatch are atomic; collision returns `reused = true`; `authenticated` role cannot call function directly

### T4: API Route
- [ ] Implement T4: Author `src/app/api/pliego-uploads/route.ts` with full validation pipeline, storage call, and RPC dispatch
- [ ] Verify T4: All HTTP status codes correct; no storage write on validation failure; `declaration_accepted_at` is server-side timestamp

### T5: Upload Widget
- [ ] Implement T5: Author `PliegoUploadWidget.tsx`, `DeclarationCheckbox.tsx`, and `usePliegoUpload.ts`; write `validate.test.ts` unit tests
- [ ] Verify T5: All state transitions work; submit disabled without declaration; callbacks fire with correct types

### T6: Analysis Flow Integration
- [ ] Implement T6: Wire `PliegoUploadWidget` into analysis flow page; write integration tests in `upload-flow.test.ts`
- [ ] Verify T6: Integration tests pass; manual smoke test confirms upload → pgmq dispatch end-to-end

---

## Completion Summary

_Updated when all tasks are done._
