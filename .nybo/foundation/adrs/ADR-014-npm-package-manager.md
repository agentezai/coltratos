# ADR-014: npm as the package manager

## Status
Accepted (2026-04-28)

## Context

The repo's CI workflow at [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) already uses `npm ci` and `actions/setup-node@v4` with `cache: 'npm'`. [AGENTS.md](../../../AGENTS.md) documents `npm run` scripts. Specs authored before bootstrap (notably [domain-model NFR-01](../../../docs/domain-model/spec/spec.md#L48)) referenced `pnpm typecheck`, creating a single inconsistency that needed resolving.

## Decision

Use **npm** (not pnpm or yarn) as the project package manager. The lockfile is `package-lock.json`. CI uses `npm ci`. All scripts are invoked as `npm run <script>`. The single `pnpm` reference in `domain-model` NFR-01 is converged on `npm run typecheck` via [project-bootstrap REQ-012 / T6](../../../docs/project-bootstrap/feat/01-plan-06-cleanup-prisma-leftovers.md).

## Alternatives Considered

- **pnpm** — faster installs, content-addressable disk usage, stricter hoisting. Rejected: the existing CI + AGENTS.md investment in npm is real (every spec authored before bootstrap referenced npm scripts implicitly via AGENTS.md). Switching would mean editing CI, AGENTS.md, every spec, and converting the lockfile, with no offsetting product benefit at this stage. Reconsidered for v2 if install/CI duration becomes a felt constraint.
- **yarn (classic v1)** — deprecated; package authors are migrating off it. Rejected.
- **yarn berry / pnp** — Plug'n'Play breaks too many tools (vitest, ESLint plugins). Not worth the friction.
- **Bun** — interesting future option (very fast); not yet a stable choice for production Next.js apps. Reconsidered when Bun reaches stable Next.js 16 compatibility.

## Consequences

- (+) Zero churn against existing CI + AGENTS.md.
- (+) `npm` is universal — every contributor has it without separate install.
- (−) Slower installs than pnpm; larger `node_modules`. Not a measurable bottleneck at this size.
- (−) No workspace-level dependency dedup beyond what npm provides natively. Not a concern for a single-package repo.

## References
- [project-bootstrap RN-001](../../../docs/project-bootstrap/spec/spec.md#L94)
- [requisitos-extraction REQ-018](../../../docs/requisitos-extraction/spec/spec.md#L57) (major-version pinning convention)
