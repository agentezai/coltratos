# T2: Create Tenant Root Tables (companies, users, company_profiles)

## Scope

- `supabase/migrations/20260504000002_tenant_root.sql` — DDL for companies, users, company_profiles

## Changes

### companies table

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `name text NOT NULL`
- `nit text UNIQUE NOT NULL` — Colombian tax ID; globally unique
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE companies ENABLE ROW LEVEL SECURITY` — policy defined in T6

### users table

- `id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` — mirrors Supabase Auth identity; CASCADE so DB row is cleaned up when Auth user is deleted
- `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT` — RESTRICT prevents orphaning company if users exist
- `role text NOT NULL DEFAULT 'member'` — `owner | member`; no CHECK constraint yet (v1 has one owner per company by convention, not DB enforcement)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE users ENABLE ROW LEVEL SECURITY`

### company_profiles table

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE` — profile deleted when company is deleted
- `juridica jsonb NOT NULL DEFAULT '{}'` — legal/registration data: existencia y representación, RUP status, inhabilidades
- `financiera jsonb NOT NULL DEFAULT '{}'` — financial indicators for 3 years: liquidez, endeudamiento, patrimonio
- `experiencia jsonb NOT NULL DEFAULT '[]'` — array of prior-contract experience objects: objeto, valor, entidad, año
- `capacidad_tecnica jsonb NOT NULL DEFAULT '{}'` — personnel/equipment: equipo_clave array, certifications
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `UNIQUE (company_id)` — one profile per company in MVP
- `ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY`

### Design Rationale (Dependency Isolation)

All three tables form the tenant root — every other tenant table FKs back to `companies`. Isolating them in one migration ensures T3, T4, T5 can reference `companies(id)` without circular dependency.

## Dependencies

Requires T1 — extensions must be enabled before any table DDL references `gen_random_uuid()` behavior (uuid-ossp).

## Done When

- [ ] `supabase/migrations/20260504000002_tenant_root.sql` exists
- [ ] `companies`, `users`, `company_profiles` tables created with correct column definitions
- [ ] `companies.nit` UNIQUE constraint verified
- [ ] `users.id` FK to `auth.users(id) ON DELETE CASCADE` present
- [ ] `company_profiles.company_id` UNIQUE constraint present
- [ ] `ENABLE ROW LEVEL SECURITY` on all three tables
- [ ] Migration applies cleanly after T1 (`supabase db push` no errors)
- [ ] `SELECT table_name FROM information_schema.tables WHERE table_name IN ('companies','users','company_profiles')` returns 3 rows
