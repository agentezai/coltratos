# T2: DB Migration — company_profiles (versioned)

## Scope

- `supabase/migrations/20260504000001_company_profiles_versioned.sql` — new migration

## Changes

### company_profiles table

```sql
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Section 1: Datos legales
  nit TEXT,
  digito_verificacion INTEGER,
  razon_social TEXT,
  representante_legal_nombre TEXT,
  representante_legal_cedula TEXT,
  domicilio_principal TEXT,
  anio_constitucion INTEGER,

  -- Section 2: Capacidad financiera (3 fiscal years as JSONB)
  ejercicios_fiscales JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Derived indicators (computed at save time, not generated columns)
  liquidez_corriente NUMERIC,
  nivel_endeudamiento NUMERIC,
  capital_de_trabajo NUMERIC,

  -- Section 3: Experiencia
  contratos_previos JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Section 4: Personal clave
  personal_clave JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Section 5: Alcance comercial (structurally queryable)
  unspsc_codes TEXT[] NOT NULL DEFAULT '{}',
  departamentos_interes TEXT[] NOT NULL DEFAULT '{}',
  presupuesto_min_cop NUMERIC(20,2),
  presupuesto_max_cop NUMERIC(20,2),

  CONSTRAINT uq_company_version UNIQUE (company_id, version),
  CONSTRAINT ck_presupuesto CHECK (
    presupuesto_min_cop IS NULL
    OR presupuesto_max_cop IS NULL
    OR presupuesto_min_cop <= presupuesto_max_cop
  )
);
```

### Indexes

```sql
-- Discovery filter queries: unspsc_codes @> '{X}' and departamentos_interes @> '{Y}'
CREATE INDEX idx_company_profiles_unspsc
  ON company_profiles USING gin (unspsc_codes);

CREATE INDEX idx_company_profiles_dptos
  ON company_profiles USING gin (departamentos_interes);

-- Fast lookup of current profile per company
CREATE INDEX idx_company_profiles_current
  ON company_profiles (company_id)
  WHERE is_current = true;
```

### RLS policy

```sql
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_profiles_member ON company_profiles
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );
```

### companies table — current_profile_id column

```sql
-- Add FK pointer to current profile (updated by server action, not trigger)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS current_profile_id UUID REFERENCES public.company_profiles(id);
```

## Design Rationale

Derived indicators (liquidez_corriente, nivel_endeudamiento, capital_de_trabajo) are flat NUMERIC columns — not generated stored columns — because Postgres generated columns cannot call JSON operators on JSONB fields. The server action computes them from ejercicios_fiscales before INSERT.

## Dependencies

T1 must be reviewed first (column names must match type interfaces).

## Done When

- [ ] Migration applies cleanly to fresh DB
- [ ] UNIQUE (company_id, version) constraint present
- [ ] GIN indexes on unspsc_codes and departamentos_interes
- [ ] Partial index on is_current = true for fast current-profile lookup
- [ ] RLS policy blocks cross-company access
- [ ] CHECK constraint rejects presupuesto_min > presupuesto_max
- [ ] companies.current_profile_id column added
