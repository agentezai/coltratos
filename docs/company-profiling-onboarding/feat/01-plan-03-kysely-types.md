# T3: Kysely DB Types Update

## Scope

- `src/types/db.ts` — add `EmpresaPerfilTable`, `EmpresaDocumentoJuridicoTable`; update `Database`

## Changes

### EmpresaPerfilTable

Financial columns: `activo_total`, `pasivo_total`, `activo_corriente`, `pasivo_corriente`, `ebit`, `gastos_financieros` (raw inputs, nullable), `ingresos_operacionales`, `utilidad_neta`, `margen_neto`, `margen_ebitda`, `roe`, `roa` (manual, nullable).

Generated financial indicators: `ColumnType<number | null, never, never>` for `nivel_endeudamiento`, `liquidez_corriente`, `razon_cobertura_int`.

JSONB columns use `ColumnType<T[], T[] | undefined, T[]>` for `unspsc_codes`, `contratos_previos`, `personal_cv`, `certificaciones`, `habilitaciones_sectoriales`.

Arrays (`text[]`) use `ColumnType<string[], string[] | undefined, string[]>`.

Generated completitud columns: `ColumnType<boolean, never, never>` for `completitud_tecnica`, `completitud_financiera`.

**Removed from original spec:** `patrimonio_neto`, `activos_totales`, `pasivos_totales`, `activos_corrientes`, `pasivos_corrientes`, `gastos_intereses`, `utilidad_operacional` (full balance sheet approach dropped), `tiene_antecedentes_*` booleans, `declaracion_antecedentes_at/ip`.

```typescript
export type NewEmpresaPerfil    = Insertable<EmpresaPerfilTable>
export type EmpresaPerfilUpdate = Updateable<EmpresaPerfilTable>
```

### EmpresaDocumentoJuridicoTable

```typescript
export interface EmpresaDocumentoJuridicoTable {
  id: EmpresaDocumentoJuridicoId
  empresa_id: EmpresaId
  tipo_documento: TipoDocumentoJuridico
  file_path: string
  file_hash: string
  fecha_emision: Date
  fecha_vencimiento: Date
  uploaded_at: Date
  uploaded_by_user_id: string
}
export type NewEmpresaDocumentoJuridico    = Insertable<EmpresaDocumentoJuridicoTable>
export type EmpresaDocumentoJuridicoUpdate = Updateable<EmpresaDocumentoJuridicoTable>
```

### Database interface

Add both tables:
```typescript
interface Database {
  // existing...
  empresa_perfil: EmpresaPerfilTable
  empresa_documento_juridico: EmpresaDocumentoJuridicoTable
}
```

### Design Rationale (ADR-001)

Generated columns `ColumnType<..., never, never>` prevents accidental INSERT/UPDATE at compile time — same pattern as `profile_updated_at` on `EmpresaTable`. Removed full balance sheet columns prevent executor from accidentally implementing the old schema.

## Dependencies

T2 must be complete — interface must match actual migration columns.

## Done When

- [ ] `EmpresaPerfilTable` and `EmpresaDocumentoJuridicoTable` in `src/types/db.ts`
- [ ] `Database` interface includes both tables
- [ ] Generated columns typed `ColumnType<..., never, never>`
- [ ] No old balance sheet columns present (`patrimonio_neto` etc.)
- [ ] `npm run build` passes with no type errors
