# T3: Kysely DB Types — company_profiles

## Scope

- `src/types/db/company-profile-table.ts` — Kysely table interface (new file)
- `src/types/db/index.ts` — add CompanyProfileTable to Database interface

## Changes

### CompanyProfileTable interface

```typescript
import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

export interface CompanyProfileTable {
  id: Generated<string>
  company_id: string
  version: number
  is_current: boolean
  created_at: Generated<Date>

  // Section 1: Datos legales
  nit: string | null
  digito_verificacion: number | null
  razon_social: string | null
  representante_legal_nombre: string | null
  representante_legal_cedula: string | null
  domicilio_principal: string | null
  anio_constitucion: number | null

  // Section 2: Capacidad financiera
  ejercicios_fiscales: ColumnType<unknown, string, string>  // JSONB
  liquidez_corriente: number | null
  nivel_endeudamiento: number | null
  capital_de_trabajo: number | null

  // Section 3: Experiencia
  contratos_previos: ColumnType<unknown, string, string>

  // Section 4: Personal clave
  personal_clave: ColumnType<unknown, string, string>

  // Section 5: Alcance comercial
  unspsc_codes: ColumnType<string[], string, string>
  departamentos_interes: ColumnType<string[], string, string>
  presupuesto_min_cop: number | null
  presupuesto_max_cop: number | null
}

export type CompanyProfileRow = Selectable<CompanyProfileTable>
export type NewCompanyProfile = Insertable<CompanyProfileTable>
// No UpdateableCompanyProfile — rows are immutable after insert (versioned pattern)
```

### Database interface update

```typescript
// src/types/db/index.ts
import type { CompanyProfileTable } from './company-profile-table'

export interface Database {
  // ...existing tables...
  company_profiles: CompanyProfileTable
}
```

### Design Rationale (ADR-001)

No `Updateable` export enforces the immutable versioned-snapshot pattern at the type level. JSONB columns typed as `ColumnType<unknown, string, string>` — callers must `JSON.stringify` on write and validate with Zod on read.

## Dependencies

T2 must complete first (migration defines column names and types).

## Done When

- [ ] `CompanyProfileRow`, `NewCompanyProfile` exported
- [ ] No `UpdateableCompanyProfile` type present
- [ ] `db.insertInto('company_profiles').values({ ... })` compiles OK
- [ ] `Database` interface includes `company_profiles`
- [ ] `npm run build` succeeds
