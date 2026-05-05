# T7: Error State Mapping

## Scope

- `src/services/ingestion-worker/error-mapping.ts` — new file: `mapErrorToFailureReason(err)` returns the controlled `ingestion_failure_reason` value
- `src/services/ingestion-worker/__tests__/error-mapping.test.ts` — new file: unit tests over the full error→reason mapping

## Changes

### Public function

```typescript
export function mapErrorToFailureReason(err: unknown): IngestionFailureReason {
  if (err instanceof EncryptedPdfError) return 'encrypted_pdf'
  if (err instanceof EmptyPdfError) return 'pdf_unreadable'
  if (err instanceof MalformedPdfError) return 'pdf_unreadable'
  if (err instanceof OcrFailedError) return 'ocr_timeout'
  if (err instanceof StorageFetchFailedError) return 'unknown'
  // TableParseFailedError is a per-page flag, not a whole-ingestion failure;
  // it should never reach this function. If it does, treat as 'unknown'.
  return 'unknown'
}
```

Uses the seven error subclasses from T1 + the `IngestionFailureReason` enum from `domain-model-mvp` (REQ-007 controlled vocabulary).

### Caller (T8)

```typescript
try {
  // ... worker pipeline
} catch (err) {
  const reason = mapErrorToFailureReason(err)
  await repo.markFailed(id, reason, err)
  return
}
```

### Why this lives under `src/services/`

It uses the `IngestionFailureReason` type from `domain-model-mvp` and is invoked by the worker. The mapping itself is pure (no side effects), but it's coupled to the worker lifecycle, so it lives next to the worker rather than in `lib/ingestion/`.

### Design Rationale

T7 is the centralized source of truth for error → controlled-vocabulary mapping. If a new error subclass is added to T1, the test suite forces an explicit decision about its `ingestion_failure_reason`. Prevents silent fallthrough to `'unknown'`.

## Dependencies

Requires T1 (uses all 7 error subclasses) and T6 (errors raised by the inner pipeline flow through the worker).

## Done When

- [ ] `mapErrorToFailureReason` exported from `src/services/ingestion-worker/error-mapping.ts`.
- [ ] Each of the seven error subclasses maps to the documented `ingestion_failure_reason` (asserted in tests).
- [ ] Unknown error type maps to `'unknown'`.
- [ ] Test that adding a new error subclass without updating this mapping causes a typecheck or test failure (use exhaustiveness check on a discriminated union).
- [ ] File stays under 100 lines.
