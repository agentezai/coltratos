# ADR-013: Next.js 16 with App Router

## Status
Accepted (2026-04-28)

## Context

The project's stack (per [CORE.md](../../memory/CORE.md)) is Next.js + TypeScript + Supabase + Vercel. The Next.js choice was implicit at project inception. By the time of the [project-bootstrap](../../../docs/project-bootstrap/spec/spec.md) spec, Next.js 16.x was the current stable line (16.2 shipped 2026-03-18 with major Turbopack performance work; 16.2.x patches followed). We need to pin a major and pick a routing model.

## Decision

Use **Next.js 16** (`next@16.2.4`, range `^16.2`) with **App Router** (the `app/` directory). Pages Router (`pages/`) is forbidden; the directory MUST NOT exist (RN-002). Server Components are the default; Client Components opt in via `'use client'`.

## Alternatives Considered

- **Next.js 15** — older minor; we'd inherit perf bugs that 16.2's Turbopack work fixed (~400% faster dev startup). No upside.
- **Pages Router instead of App Router** — legacy; new Next.js features (Server Actions, streaming, partial prerendering) are App-Router-first or App-Router-only. Choosing Pages locks us out of those features. v2 migration cost would be high.
- **Remix / SvelteKit / Astro** — would require re-deciding hosting (Vercel is Next-optimized) and re-doing the auth integration plan. Out of scope.

## Consequences

- (+) Modern RSC defaults reduce client bundle size (relevant for the eligibility-results screen rendering many requisitos).
- (+) Server Actions usable in v2 for the upload flow (no separate API route needed).
- (+) Vercel deployment is the canonical target — minimal config required.
- (−) App Router has a learning curve; some patterns (e.g., layout-bound data fetching) differ from Pages Router muscle memory.
- (−) Server Component / Client Component boundary requires deliberate thinking about what state lives where.

## References
- [Next.js 16.2 release notes](https://nextjs.org/blog/next-16-2)
- [project-bootstrap REQ-002](../../../docs/project-bootstrap/spec/spec.md)
- [project-bootstrap RN-002](../../../docs/project-bootstrap/spec/spec.md)
