# T9: Smoke + parity + RSC-purity tests

## Scope

- `src/__tests__/token-parity.test.ts` — NFR-04
- `src/__tests__/rsc-purity.test.ts` — NFR-05
- `src/app/(internal)/design-system/__tests__/page.test.tsx` — REQ-012
- `src/components/ui/__tests__/icon.test-d.ts` — already authored in T5; verify it still passes

## Changes

### `src/__tests__/token-parity.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokenRegex = /^\s*--[a-z][a-z0-9-]*:/gm;
function extractTokenNames(css: string): Set<string> {
  return new Set(Array.from(css.matchAll(tokenRegex), m => m[0].trim().replace(':', '')));
}

describe('Token parity vs design-system bundle', () => {
  it('every token in the bundle is also defined in src/app/globals.css :root block', () => {
    const bundleCss = readFileSync(
      resolve(process.cwd(), 'docs/design-system/source/project/colors_and_type.css'),
      'utf-8'
    );
    const productionCss = readFileSync(
      resolve(process.cwd(), 'src/app/globals.css'),
      'utf-8'
    );
    const bundleSlice = bundleCss.split('\n').slice(29, 199).join('\n');
    const productionRootMatch = productionCss.match(/:root\s*\{([\s\S]*?)\n\}/);
    if (!productionRootMatch) throw new Error(':root block not found in src/app/globals.css');

    const bundleNames = extractTokenNames(bundleSlice);
    const productionNames = extractTokenNames(productionRootMatch[1]);

    const missingInProduction = [...bundleNames].filter(n => !productionNames.has(n));
    const extraInProduction = [...productionNames].filter(n => !bundleNames.has(n));

    expect(missingInProduction).toEqual([]);
    expect(extraInProduction).toEqual([]);
  });
});
```

### `src/__tests__/rsc-purity.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('RSC purity', () => {
  it('only src/components/shell/sidebar.tsx carries "use client"', () => {
    const result = execSync(
      `grep -rl "'use client'" src/ || true`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean).sort();
    expect(result).toEqual(['src/components/shell/sidebar.tsx']);
  });
});
```

### `src/app/(internal)/design-system/__tests__/page.test.tsx`

```tsx
/// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DesignSystemPage from '../page';

describe('/design-system smoke', () => {
  it('renders all 5 primitives on the preview page', () => {
    const { container } = render(<DesignSystemPage />);
    expect(container.querySelector('button')).toBeTruthy();
    expect(container.querySelector('[data-component="card"]')).toBeTruthy();
    expect(container.querySelector('[data-component="chip"]')).toBeTruthy();
    expect(container.querySelector('[data-component="well"]')).toBeTruthy();
    expect(container.querySelector('[data-component="banner"]')).toBeTruthy();
  });

  it('shows the COLTRATOS wordmark', () => {
    const { container } = render(<DesignSystemPage />);
    expect(container.textContent).toContain('COLTRATOS');
  });
});
```

Note: this test requires `@testing-library/react` and `jsdom` to be available. If `project-bootstrap` did not install them, T9 adds them as devDependencies and updates `vitest.config.ts` to support a per-test `@vitest-environment jsdom` directive.

### Verify type-test from T5 still passes

- Run `npm run test:type` and confirm `src/components/ui/__tests__/icon.test-d.ts` passes. If T5 was authored correctly, this should be a no-op.

### Manual verification (NFR-01, NFR-02)

- Boot `npm run dev`, open `/design-system` in Chrome, open DevTools Performance, record a cold load.
- Capture LCP < 1.5s, CLS < 0.05.
- Run `npm run build`, read the route-size table; capture First Load JS for `(internal)/design-system` < 80 kB gz.
- Save the screenshots / numbers under `docs/design-system/feat/evidence/` (create dir if needed).

### Design Rationale

- Three executable tests (parity, RSC-purity, smoke) lock the spec's invariants. Two of them (parity, RSC-purity) are unusual — they check the codebase against itself / against the bundle. Both are simple and fast.
- Manual verification of LCP / CLS / bundle size in v1 is acceptable; CI integration is deferred until performance regressions become a real risk.

## Dependencies

Requires T4 (globals.css), T6 (primitives), T7 (shell), T8 (preview page exists) to all be in place.

## Done When

- [ ] `src/__tests__/token-parity.test.ts` exists, `npm run test` runs it and it passes
- [ ] `src/__tests__/rsc-purity.test.ts` exists and passes
- [ ] `src/app/(internal)/design-system/__tests__/page.test.tsx` exists and passes
- [ ] `src/components/ui/__tests__/icon.test-d.ts` (from T5) passes via `npm run test:type`
- [ ] `npm run test` exits 0 with all tests green
- [ ] `npm run typecheck && npm run lint && npm run build && npm run test` all exit 0
- [ ] Manual evidence captured: LCP < 1.5s, CLS < 0.05, First Load JS < 80 kB gz (logged under `docs/design-system/feat/evidence/`)
