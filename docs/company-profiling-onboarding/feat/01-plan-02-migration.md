# T2: DB Migration — empresa_perfil + empresa_documento_juridico

## Scope

- `supabase/migrations/20260501000001_empresa_perfil.sql` — new migration

## Changes

### empresa_perfil table

```sql
CREATE TABLE public.empresa_perfil (
  empresa_id UUID PRIMARY KEY REFERENCES public.empresa(id) ON DELETE CASCADE,
  -- Step 1: Identidad
  tipo_societario TEXT NOT NULL,
  representante_legal_nombre TEXT,
  representante_legal_documento TEXT,
  email_corporativo TEXT,
  telefono TEXT,
  -- Step 2: Técnica
  unspsc_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  contratos_previos JSONB NOT NULL DEFAULT '[]'::jsonb,
  personal_cv JSONB NOT NULL DEFAULT '[]'::jsonb,
  rup_clasificaciones_unspsc TEXT[] NOT NULL DEFAULT '{}',
  experiencia_general_smmlv NUMERIC,
  experiencia_especifica_smmlv NUMERIC,
  anios_experiencia INT,
  numero_contratos_ejecutados INT,
  acepta_consorcios BOOLEAN NOT NULL DEFAULT false,
  numero_empleados INT,
  personal_profesional INT,
  personal_certificado INT,
  tiene_oficina_fisica BOOLEAN,
  departamentos_presencia TEXT[] NOT NULL DEFAULT '{}',
  -- Step 3: Preferencias
  cobertura_nacional BOOLEAN NOT NULL DEFAULT false,
  departamentos_interes TEXT[] NOT NULL DEFAULT '{}',
  modalidades_interes TEXT[] NOT NULL DEFAULT '{}',
  presupuesto_min_cop NUMERIC,
  presupuesto_max_cop NUMERIC,
  entidades_favoritas TEXT[] NOT NULL DEFAULT '{}',
  entidades_excluidas TEXT[] NOT NULL DEFAULT '{}',
  -- Step 4: Financiera — simplified inputs
  activo_total NUMERIC,
  pasivo_total NUMERIC,
  activo_corriente NUMERIC,
  pasivo_corriente NUMERIC,
  ebit NUMERIC,
  gastos_financieros NUMERIC,
  ingresos_operacionales NUMERIC,
  utilidad_neta NUMERIC,
  margen_neto NUMERIC,
  margen_ebitda NUMERIC,
  roe NUMERIC,
  roa NUMERIC,
  cupo_credito_aprobado_cop NUMERIC,
  tiene_aseguradora_garantias BOOLEAN NOT NULL DEFAULT false,
  aseguradoras_relacion TEXT[] NOT NULL DEFAULT '{}',
  -- Step 5: RUP + certificaciones
  rup_vigente BOOLEAN NOT NULL DEFAULT false,
  rup_numero TEXT,
  rup_fecha_inscripcion DATE,
  rup_fecha_vencimiento DATE,
  rup_capacidad_organizacional_co NUMERIC,
  rup_capacidad_residual_kc NUMERIC,
  rup_capacidad_financiera_kf NUMERIC,
  certificaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  habilitaciones_sectoriales JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Generated: calculated financial indicators
  nivel_endeudamiento NUMERIC GENERATED ALWAYS AS (
    CASE WHEN activo_total > 0 THEN pasivo_total / activo_total ELSE NULL END
  ) STORED,
  liquidez_corriente NUMERIC GENERATED ALWAYS AS (
    CASE WHEN pasivo_corriente > 0 THEN activo_corriente / pasivo_corriente ELSE NULL END
  ) STORED,
  razon_cobertura_int NUMERIC GENERATED ALWAYS AS (
    CASE WHEN gastos_financieros > 0 THEN ebit / gastos_financieros ELSE NULL END
  ) STORED,
  -- Generated: completitud flags
  completitud_tecnica BOOLEAN GENERATED ALWAYS AS (
    jsonb_array_length(unspsc_codes) > 0
    AND experiencia_general_smmlv IS NOT NULL
    AND anios_experiencia IS NOT NULL
  ) STORED,
  completitud_financiera BOOLEAN GENERATED ALWAYS AS (
    activo_total IS NOT NULL AND pasivo_total IS NOT NULL
    AND activo_corriente IS NOT NULL AND pasivo_corriente IS NOT NULL
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### empresa_documento_juridico table

```sql
CREATE TABLE public.empresa_documento_juridico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN (
    'certificado_policia','certificado_contraloria','rmnc','redam','camara_comercio'
  )),
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL CHECK (length(file_hash) = 64),
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (empresa_id, tipo_documento, file_hash)
);
```

### Indexes

```sql
CREATE INDEX idx_empresa_perfil_unspsc ON empresa_perfil USING gin (unspsc_codes);
CREATE INDEX idx_empresa_perfil_dptos ON empresa_perfil USING gin (departamentos_interes);
CREATE INDEX idx_empresa_perfil_completitud ON empresa_perfil (completitud_tecnica, completitud_financiera);
CREATE INDEX idx_doc_juridico_empresa ON empresa_documento_juridico (empresa_id, tipo_documento);
CREATE INDEX idx_doc_juridico_vencimiento ON empresa_documento_juridico (fecha_vencimiento);
```

### RLS policies

```sql
ALTER TABLE empresa_perfil ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_perfil_member ON empresa_perfil FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM empresa_member WHERE user_id = auth.uid())
);

ALTER TABLE empresa_documento_juridico ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_juridico_member ON empresa_documento_juridico FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM empresa_member WHERE user_id = auth.uid())
);
```

### Storage bucket + policy

```sql
-- Storage bucket created via Supabase dashboard or seed script
-- Policy: per-tenant prefix
-- INSERT: path must start with 'empresas/' || auth.uid() empresa lookup
-- SELECT: empresa member only
```

## Dependencies

T1 must be reviewed first (column names must match type interfaces).

## Done When

- [ ] Migration applies cleanly to fresh DB
- [ ] `empresa_perfil` has `completitud_tecnica` and `completitud_financiera` generated columns
- [ ] `nivel_endeudamiento`, `liquidez_corriente`, `razon_cobertura_int` compute correctly
- [ ] `empresa_documento_juridico` table exists with CHECK constraint on `tipo_documento`
- [ ] Both RLS policies enabled and blocking cross-tenant access
- [ ] GIN indexes on `unspsc_codes` and `departamentos_interes`
