# T4: Vitest Setup

## Scope

- `vitest.config.ts` — main vitest config (non-globals).
- `vitest.workspace.ts` — workspace registering two projects (unit + type-test).
- `tests/bootstrap.test.ts` — NEW. The REQ-013 smoke test (asserts the expected-failure shape of the missing `@/types` import).
- `tests/.gitkeep` — ensures git tracks the directory.

## Changes

### Author `vitest.config.ts` (REQ-006, RN-006)

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    // Non-globals: import describe/it/expect explicitly (RN-006).
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      // Mirror tsconfig paths so vitest-resolved imports match tsc-resolved imports.
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types/index.ts'),
    },
  },
})
```

Key choices:
- **`globals: false`** (RN-006) — keeps test file imports explicit; no global pollution; survives the purity-grep tests in [pdf-ingestion NFR-03](../../pdf-ingestion/spec/spec.md), [requisitos-extraction REQ-017](../../requisitos-extraction/spec/spec.md), [semaforo-aggregation REQ-013](../../semaforo-aggregation/spec/spec.md).
- **`environment: 'node'`** — default for unit + integration tests. FE component tests (when they ship) will configure `environment: 'jsdom'` per-file.
- **Path alias mirror** — vitest's resolver doesn't read `tsconfig.json` paths automatically; mirroring them in `vitest.config.ts` ensures `import { ... } from '@/types'` works at test runtime (not just at typecheck time).
- **Coverage with v8 provider** — fast, no Babel transform, ESM-native. Matches the `@vitest/coverage-v8` install in T2.

### Author `vitest.workspace.ts` (REQ-006)

Vitest workspaces let us run two distinct test suites with different configs in one invocation:

```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // Project 1: standard runtime tests
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['**/*.test.ts', '**/*.test.tsx'],
      exclude: ['**/*.test-d.ts', 'node_modules/**'],
    },
  },
  // Project 2: type-level tests (compile-only; no runtime assertions)
  {
    extends: './vitest.config.ts',
    test: {
      name: 'types',
      include: ['**/*.test-d.ts'],
      typecheck: {
        enabled: true,
        // tsconfig is auto-discovered; no override needed.
      },
    },
  },
])
```

The type-test project supports the `*.test-d.ts` files that domain-model and pdf-ingestion specs reference (e.g., [domain-model contract](../../domain-model/contract/contract.md#L19): `Test file: src/__tests__/domain/primitives.test-d.ts`).

### Author `tests/bootstrap.test.ts` (REQ-013, TC-005)

This test is intentionally crafted to **fail in a specific way today** and **pass automatically** when domain-model T6 ships (the moment `src/types/index.ts` exists with at least one export):

```typescript
import { describe, it, expect } from 'vitest'

describe('project-bootstrap smoke test', () => {
  it('vitest is installed and runs (REQ-006)', () => {
    expect(true).toBe(true)
  })

  it('the @/types path alias is wired but the barrel does not yet exist (REQ-013)', async () => {
    // This dynamic import IS expected to fail today.
    // The failure proves: (a) vitest's resolver knows about @/types,
    // (b) the file does not yet exist (per RN-010 — bootstrap writes no domain code).
    // When domain-model T6 ships, src/types/index.ts will exist and this test starts passing.
    let importError: unknown = null
    let importedModule: unknown = null
    try {
      importedModule = await import('@/types')
    } catch (err) {
      importError = err
    }

    if (importError !== null) {
      // Today's expected path: alias resolved but file missing.
      const message = (importError as Error).message
      expect(message).toMatch(/Cannot find module|@\/types/i)
    } else {
      // Future path (after domain-model T6): barrel exists.
      expect(importedModule).not.toBeNull()
    }
  })
})
```

The test asserts **either** of two states is OK:
- Today: import fails with `Cannot find module '@/types'` — the alias is wired, the file is intentionally absent.
- Post-domain-model-T6: import succeeds — the barrel was created.

What the test does **NOT** allow:
- Some other import error (e.g., a syntax error in `src/types/index.ts` once it exists, or a path-alias mis-wire that produces a different error message).

This makes the test a structural canary that flips state automatically as the system grows.

### Verify (TC-005, TC-010)

```bash
npm run test
```

Expected:
- 2 tests reported.
- Both pass.
- The second test logs a Cannot-find-module error to stdout (informational; vitest captures it inside the try/catch).

```bash
npm run test:coverage
```

Expected: exits 0, produces `coverage/` with `coverage-summary.json` and `index.html`.

### Design Rationale (Open/Closed)

The two-project workspace separates runtime concerns (unit + integration tests) from type concerns (`*.test-d.ts` files). Each project can evolve its config independently — for example, domain-model migration tests will need a `globalSetup` that boots Supabase locally; that setup will live in a third workspace project added in a later spec, not in `vitest.config.ts` itself. The bootstrap-smoke-test pattern (REQ-013) is a generic primitive — any future cross-spec contract can be expressed as an "expected-failure → expected-pass" test that flips state on a downstream feature shipping.

## Dependencies

Requires **T2** — `vitest`, `@vitest/coverage-v8`, and `@types/node` must be installed.

Does NOT depend on T3 (Supabase) — bootstrap-smoke-test is purely in-process; it doesn't touch the database.

## Done When

- [ ] `vitest.config.ts` exists with `globals: false`, `environment: 'node'`, the path-alias mirror, and the v8 coverage provider.
- [ ] `vitest.workspace.ts` exists with two projects (`unit` and `types`).
- [ ] `tests/bootstrap.test.ts` exists with the two tests above.
- [ ] `npm run test` reports 2 tests, both passing (TC-005).
- [ ] `npm run test:coverage` exits 0 and produces `coverage/` artifacts.
- [ ] Grep for `globals: true` in `vitest.config.ts` returns zero matches (TC-010).
- [ ] Grep for `import { describe, it, expect } from 'vitest'` in `tests/bootstrap.test.ts` returns one match (RN-006).
