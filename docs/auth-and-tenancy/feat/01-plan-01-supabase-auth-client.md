# T1: Supabase Auth Client Utilities

## Scope

- `src/lib/supabase/server.ts` — New file: server-side Supabase client factory
- `src/lib/supabase/client.ts` — New file: browser Supabase client singleton
- `src/lib/supabase/index.ts` — New file: barrel re-export
- `.env.example` — Add three Supabase env var entries

## Changes

### Server Client (`src/lib/supabase/server.ts`)

- Export `createServerClient()` using `createServerClient` from `@supabase/ssr`.
- Read `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` — assert non-null at module load.
- Implement the `cookies()` adapter from `next/headers` for reading and setting cookie values.
- Return type: `SupabaseClient` from `@supabase/supabase-js`.
- Add a `// SDK_MAJOR=2` comment per project convention (requisitos-extraction REQ-018).
- Callers: Server Components, Route Handlers, Server Actions only. Never import in a `'use client'` file.

### Browser Client (`src/lib/supabase/client.ts`)

- Export `createBrowserClient()` using `createBrowserClient` from `@supabase/ssr`.
- Read `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Return a memoized singleton (create once, reuse across renders in the same page).
- `'use client'` directive at the top.

### Barrel (`src/lib/supabase/index.ts`)

- Re-export `createServerClient` from `./server` and `createBrowserClient` from `./client`.
- Consumers import from `@/lib/supabase` — no direct deep imports to server/client files.

### Environment Variables (`.env.example`)

- Append section `# Supabase` with three entries:
  - `NEXT_PUBLIC_SUPABASE_URL=` (public — safe in browser bundle)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (public — anon-key enforces RLS)
  - `SUPABASE_SERVICE_ROLE_KEY=` (private — MUST NOT appear in browser imports; bypasses RLS)
- Add inline comment: `# SUPABASE_SERVICE_ROLE_KEY must never be imported in 'use client' files`

### Design Rationale (Single Responsibility)

Server and browser clients are separate files because their import graphs must not cross: the server file imports `next/headers` (Node-only), the browser file uses `'use client'`. Mixing them in one file would break the RSC boundary.

## Dependencies

None — foundational task.

## Done When

- [ ] `src/lib/supabase/server.ts` exists, exports `createServerClient()`, imports from `@supabase/ssr`
- [ ] `src/lib/supabase/client.ts` exists, exports `createBrowserClient()`, has `'use client'` directive
- [ ] `src/lib/supabase/index.ts` re-exports both factories
- [ ] `.env.example` has all three Supabase env vars documented
- [ ] `npm run typecheck` passes with no errors on these files
- [ ] Purity grep: `grep -r "SUPABASE_SERVICE_ROLE_KEY" src/lib/supabase/client.ts` returns zero matches
