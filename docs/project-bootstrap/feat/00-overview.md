# project-bootstrap — Feature Overview

## Spec Reference

[Spec](../spec/spec.md) · [Use Cases](../spec/use-cases.md)

## Problem + Solution

- The repo has approved specs ([domain-model](../../domain-model/spec/spec.md), [pdf-ingestion](../../pdf-ingestion/spec/spec.md), [requisitos-extraction](../../requisitos-extraction/spec/spec.md), [semaforo-aggregation](../../semaforo-aggregation/spec/spec.md)) but no `package.json`, `tsconfig.json`, `supabase/`, or `src/`. T1 of any approved spec cannot run.
- Solution: a focused, opinionated bootstrap that initializes Next.js 16 + App Router + TypeScript strict + Supabase CLI + Kysely + Zod + vitest, wires CI to run typecheck + lint + build + test, and cleans up two stale Prisma leftovers from a pre-spec exploration.
- This spec writes **zero domain code** (per RN-010). The "domain" of bootstrap is configuration: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `supabase/config.toml`, and `.github/workflows/ci.yml`.
- Three new ADRs (013/014/015) document the choices: Next.js 16 + App Router, npm as package manager, kysely-postgres-js as the Postgres dialect.
- One side-edit to [domain-model NFR-01](../../domain-model/spec/spec.md#L48): the only `pnpm` reference in any approved spec converges on `npm run typecheck` to match CI + AGENTS.md.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph T1["T1: Next.js + TypeScript scaffold"]
        Init["create-next-app\n(Next 16 + TS strict + App Router\n+ Tailwind v4 + ESLint)"]
        TSConfig["tsconfig.json\n(@/* + @/types paths)"]
    end

    subgraph T2["T2: Runtime + dev deps"]
        Runtime["zod, kysely, kysely-postgres-js,\npostgres, @supabase/supabase-js,\n@supabase/ssr, @anthropic-ai/sdk,\npdf-parse"]
        Dev["vitest, @vitest/coverage-v8,\n@types/node"]
        ADR014["ADR-014: npm package manager"]
    end

    subgraph T3["T3: Supabase local init"]
        SBInit["supabase init\nsupabase/config.toml\nsupabase/migrations/ (empty)"]
        ADR015["ADR-015: kysely-postgres-js"]
    end

    subgraph T4["T4: Vitest setup"]
        VitestConfig["vitest.config.ts\n(non-globals)\n+ vitest.workspace.ts\n(unit + type-test projects)"]
        Smoke["tests/bootstrap.test.ts\n(REQ-013 expected-failure smoke)"]
    end

    subgraph T5["T5: CI + scripts"]
        Scripts["package.json scripts:\ndev/build/start/lint/typecheck\ntest/test:type/test:coverage\ndb:start/db:push/db:reset"]
        CI[".github/workflows/ci.yml\n(adds typecheck step\nbefore lint)"]
        ADR013["ADR-013: Next.js 16 + App Router"]
    end

    subgraph T6["T6: Cleanup + side-edit"]
        EnvFix[".env.example\n(strip Prisma comment)"]
        IgnoreFix[".gitignore\n(strip /src/generated/prisma)"]
        DomainEdit["docs/domain-model/spec/spec.md\nNFR-01: pnpm → npm run\n+ deltas.md entry"]
    end

    T1 --> T2
    T2 --> T3
    T2 --> T4
    T3 --> T5
    T4 --> T5
    T5 --> T6
```

## Data Model

No new entities. No database tables. Per RN-010, all schema work is owned by [domain-model T3](../../domain-model/feat/01-plan-03-postgres-migration.md).

The configuration "data" introduced:

```mermaid
classDiagram
    class PackageJson {
        +string name "coltratos"
        +bool private true
        +Engines engines "node>=20"
        +Scripts scripts "11 entries"
        +Deps dependencies "9 entries"
        +Deps devDependencies "8 entries"
    }

    class TsconfigJson {
        +bool strict true
        +bool noUncheckedIndexedAccess true
        +string target "ES2022"
        +Paths paths "@/* and @/types"
    }

    class VitestConfig {
        +bool globals false
        +string environment "node"
        +Workspace workspace "unit + type-test"
    }

    class SupabaseConfig {
        +string project_id "coltratos"
        +int db_major_version 15
        +bool rls_enabled true
    }

    class CIWorkflow {
        +Triggers on "PR + push to main"
        +Steps steps "checkout, setup-node,\nnpm ci, typecheck, lint,\nbuild, test"
    }
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-nextjs-typescript-scaffold.md](./01-plan-01-nextjs-typescript-scaffold.md) | Initialize Next.js 16 + App Router + TypeScript strict + Tailwind v4. Configure `tsconfig.json` paths. Author placeholder `app/page.tsx` and `app/layout.tsx`. | None |
| T2 | [01-plan-02-runtime-dependencies.md](./01-plan-02-runtime-dependencies.md) | Install runtime + dev dependencies. Write ADR-014 (npm package manager). | T1 |
| T3 | [01-plan-03-supabase-local-init.md](./01-plan-03-supabase-local-init.md) | `supabase init`. Configure `supabase/config.toml`. Verify `supabase start` boots Docker stack. Write ADR-015 (kysely-postgres-js dialect). | T2 |
| T4 | [01-plan-04-vitest-setup.md](./01-plan-04-vitest-setup.md) | Configure vitest non-globals + workspace (unit + type-test projects). Author the bootstrap smoke test (REQ-013). | T2 |
| T5 | [01-plan-05-ci-typecheck-script.md](./01-plan-05-ci-typecheck-script.md) | Wire `package.json` scripts (`typecheck` etc.). Update `.github/workflows/ci.yml` to add `npm run typecheck` before lint. Write ADR-013 (Next.js 16 + App Router). | T1, T2 |
| T6 | [01-plan-06-cleanup-prisma-leftovers.md](./01-plan-06-cleanup-prisma-leftovers.md) | Edit `.env.example` (rewrite Prisma comment). Edit `.gitignore` (remove `/src/generated/prisma`). Side-edit [domain-model NFR-01](../../domain-model/spec/spec.md#L48): `pnpm typecheck` → `npm run typecheck`; append delta entry to [docs/domain-model/deltas.md](../../domain-model/deltas.md). | None (purely textual edits) |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Scaffold"]
    T2["T2: Deps"]
    T3["T3: Supabase"]
    T4["T4: Vitest"]
    T5["T5: CI + Scripts"]
    T6["T6: Cleanup + side-edit"]

    T1 --> T2
    T2 --> T3
    T2 --> T4
    T3 --> T5
    T4 --> T5
    T1 --> T6

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
```

T1 must ship first (creates `package.json` and `tsconfig.json`). T2 (deps) blocks T3 (Supabase init writes scripts that need the runtime list known) and T4 (vitest needs to be installed). T5 (CI + scripts) needs both the script targets (T1/T2/T3/T4 must have produced them) and the dependency list. T6 (cleanup + side-edit) is purely textual and can run any time after T1.
