# T2: Runner

## Scope

- `eval/runner/run-eval.ts` — CLI entry point: parse args, iterate corpus, invoke pipeline, write predicted.json
- `eval/runner/empresa-stub.ts` — minimal valid `Empresa` for extraction input
- `eval/runner/storage.ts` — Supabase Storage download + SHA256 verification

## Changes

### CLI Interface (`eval/runner/run-eval.ts`)

Flags:
- `--pliego=<id>` — run one pliego
- `--all` — run all corpus entries
- `--force [--reason=<string>]` — overwrite existing result (marks `forced: true` in output)
- `--concurrency=<n>` (default 4) — parallel pliego runs

Sequence:
1. Parse `corpus.yaml` with `CorpusManifestSchema`; exit non-zero on validation failure.
2. Resolve `git_hash` via `child_process.execSync('git rev-parse --short HEAD')`.
3. For each selected pliego (respecting `--concurrency`):
   a. Check `eval-results/<git_hash>/<id>/predicted.json` — skip with warning if exists and `--force` not set.
   b. Call `downloadAndVerify(entry)` from `storage.ts`.
   c. Run `lib/ingestion/` inner pipeline (import `processBuffer` or equivalent pure function).
   d. Instantiate `AnthropicRequisitosExtractor` with `{ client: new Anthropic(), logger }`.
   e. Call `extract({ pliego, segments, empresa: EMPRESA_STUB, analisisId })`.
   f. Write `{ output: ExtractorOutput, git_hash, pliego_id, timestamp, forced?, forced_reason? }` to `eval-results/<git_hash>/<id>/predicted.json`.
4. On `ExtractorCostCeilingExceededError`, `StorageFetchFailedError`, or inner pipeline errors: record `status: 'cost_exceeded' | 'fetch_failed' | 'ingestion_failed'` in a minimal JSON, continue to next pliego.

### Storage + integrity (`eval/runner/storage.ts`)

```typescript
export async function downloadAndVerify(entry: CorpusEntry): Promise<Buffer> {
  // 1. Supabase Storage client (service role key from process.env.SUPABASE_SERVICE_ROLE_KEY)
  // 2. Download blob from entry.storage_key
  // 3. Compute SHA256 of buffer; compare to entry.sha256
  // 4. On mismatch: throw CorpusIntegrityError (logs 'corpus_integrity_failure')
  // 5. Return buffer
}
```

`CorpusIntegrityError` extends `Error` with `{ code: 'CORPUS_INTEGRITY_FAILURE', pliego_id: string }`.

### Empresa stub (`eval/runner/empresa-stub.ts`)

A minimal `Empresa` satisfying the `ExtractorInput.empresa` contract. Engineers update the stub when they want to eval against different profile dimensions. The stub is NOT a test double — it is the real `Empresa` type with plausible MVP-scale values.

```typescript
export const EMPRESA_STUB: Empresa = {
  id: 'eval-stub-empresa' as EmpresaId,
  nit: '900123456-1',
  nombre: 'Empresa Eval S.A.S.',
  profile_updated_at: new Date('2026-01-01').toISOString(),
  // ... remaining required Empresa fields at plausible defaults
}
```

### Design Rationale (SRP)

Runner owns pipeline orchestration and I/O (storage download, file writes). Inner pipeline (`lib/ingestion/`) and extractor remain pure/DI-injected; runner is the composition root that wires them.

## Dependencies

Requires T1 — imports `CorpusManifest`, `CorpusEntry`, `GroundTruthFile` from `eval/types.ts`.

## Done When

- [ ] `--pliego=stub-001 --dry-run` prints corpus entry info without calling Anthropic
- [ ] SHA256 mismatch produces `CorpusIntegrityError` with correct code
- [ ] Existing `predicted.json` is skipped without `--force`; with `--force`, overwritten with `forced: true` in output
- [ ] `npm run typecheck` passes for all files under `eval/runner/`
- [ ] `EMPRESA_STUB` satisfies TypeScript's `Empresa` type with no `// @ts-ignore`
