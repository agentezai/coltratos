# auth-and-tenancy — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- No auth perimeter: every route is currently public and any DB query leaks across empresa boundaries.
- Solution: ship Supabase Auth session management, Next.js middleware route protection, concrete RLS policies on all 9 domain-model tables, and an atomic empresa-provisioning trigger.
- Architecture: `@supabase/ssr` cookie utilities + Next.js edge middleware + a single SQL migration that enables RLS and defines all policies.
- Output: authenticated users land in a session scoped exclusively to their empresa's data; all downstream features inherit isolation for free.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser
        AuthForm["Auth Form\n(Client Component)"]
        BrowserClient["createBrowserClient()"]
    end

    subgraph NextJS["Next.js (Edge/Server)"]
        Middleware["middleware.ts\nupdateSession()"]
        ServerAction["Server Actions\nsignup / login / signOut\nforgotPassword / updatePassword"]
        ConfirmRoute["Route Handler\nGET /auth/confirm"]
        ServerClient["createServerClient()"]
    end

    subgraph Supabase
        SupaAuth["Supabase Auth\nauth.users"]
        RLS["Row Level Security\n9 tables"]
        Trigger["Postgres Trigger\nhandle_new_user()"]
        EmpresaTable[("empresa\nempresa_member")]
    end

    AuthForm -->|submit| ServerAction
    ServerAction -->|auth call| SupaAuth
    SupaAuth -->|AFTER INSERT| Trigger
    Trigger --> EmpresaTable
    SupaAuth -->|session cookie| Middleware
    Middleware -->|getUser| ServerClient
    ServerClient --> SupaAuth
    BrowserClient -->|anon key query| RLS
    RLS -->|empresa_member join| EmpresaTable
    ConfirmRoute -->|verifyOtp| SupaAuth

    style ServerAction fill:#e1f5ff
    style Middleware fill:#fff4e1
    style Trigger fill:#d4edda
    style RLS fill:#d4edda
```

## Data Model

No new tables. This feature adds RLS policies and a trigger on top of the `empresa` and `empresa_member` tables defined in domain-model.

```mermaid
classDiagram
    class auth_users {
        +uuid id
        +text email
    }
    class empresa {
        +uuid id
        +timestamptz created_at
        +timestamptz profile_updated_at
    }
    class empresa_member {
        +uuid empresa_id
        +uuid user_id
        +text role
    }
    auth_users "1" --> "*" empresa_member : user_id
    empresa "1" --> "*" empresa_member : empresa_id
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-supabase-auth-client.md](./01-plan-01-supabase-auth-client.md) | Supabase client utilities (server + browser) | None |
| T2 | [01-plan-02-middleware.md](./01-plan-02-middleware.md) | Next.js middleware: session refresh + route guard | T1 |
| T3 | [01-plan-03-rls-migration.md](./01-plan-03-rls-migration.md) | Supabase migration: RLS + empresa provisioning trigger | None |
| T4 | [01-plan-04-server-actions.md](./01-plan-04-server-actions.md) | Auth server actions (signup, login, signOut, password) | T1 |
| T5 | [01-plan-05-auth-pages.md](./01-plan-05-auth-pages.md) | Auth UI pages + route group layout | T2, T4 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Supabase Auth Client"]
    T2["T2: Middleware"]
    T3["T3: RLS Migration"]
    T4["T4: Server Actions"]
    T5["T5: Auth Pages"]

    T1 --> T2
    T1 --> T4
    T2 --> T5
    T4 --> T5

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
```
