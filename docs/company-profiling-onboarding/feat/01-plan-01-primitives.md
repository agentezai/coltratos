# T1: Domain Primitives & Zod Schemas

## Scope

- `src/types/domain/primitives.ts` — add `EmpresaPerfilId`, `TipoSocietario`, `TipoDocumentoJuridico`
- `src/lib/validators/empresa-perfil.ts` — Zod schemas for steps 1-5 + domain types (new file)

## Changes

### New primitives

- `EmpresaPerfilId`: branded string
- `EmpresaDocumentoJuridicoId`: branded string
- `TipoSocietario` enum: `SAS | SA | LTDA | EU | Cooperativa | Consorcio | UT | PersonaNatural | Otro`
- `TipoDocumentoJuridico` enum: `certificado_policia | certificado_contraloria | rmnc | redam | camara_comercio`

### Domain sub-types (empresa-perfil.ts)

```typescript
export const ContratoPrevioSchema = z.object({
  objeto: z.string().min(5),
  entidad: z.string(),
  valor_smmlv: z.number().nonnegative(),
  fecha_inicio: z.string().date(),
  fecha_fin: z.string().date(),
  unspsc_codes: z.array(z.string()).optional(),
})
export type ContratoPrevio = z.infer<typeof ContratoPrevioSchema>

export const PersonalCvEntrySchema = z.object({
  nombre: z.string().min(2),
  cargo: z.string(),
  fecha_inicio: z.string().date(),
  fecha_fin: z.string().date().nullable(),
  empresa_contratante: z.string(),
  objeto: z.string().optional(),
})
export type PersonalCvEntry = z.infer<typeof PersonalCvEntrySchema>
```

### Step schemas

**Step1Schema:** nit (DV validated), razon_social, tipo_societario, representante_legal_nombre, representante_legal_documento, email_corporativo, telefono (optional)

**Step2Schema:**
- `unspsc_codes`: min 1
- `contratos_previos`: `z.array(ContratoPrevioSchema).optional()`
- `personal_cv`: `z.array(PersonalCvEntrySchema).optional()`
- `experiencia_general_smmlv`, `anios_experiencia`: required
- `acepta_consorcios`, `numero_empleados`, `departamentos_presencia`, `tiene_oficina_fisica`: optional
- `rup_clasificaciones_unspsc`: `z.array(z.string()).optional()` — for advisory cross-check

**Step3Schema:** cobertura_nacional, departamentos_interes, modalidades_interes (min 1), presupuesto range with `.refine(min ≤ max)`, `.refine(cobertura_nacional = false → dptos non-empty)`, entidades_favoritas, entidades_excluidas

**Step4Schema:**
- Raw inputs: `activo_total > 0`, `pasivo_total ≥ 0`, `activo_corriente ≥ 0`, `pasivo_corriente ≥ 0`, `ebit` (any sign), `gastos_financieros ≥ 0`
- Manual: `ingresos_operacionales ≥ 0`, `utilidad_neta`, `margen_neto`, `margen_ebitda`, `roe`, `roa`
- Optional: `cupo_credito_aprobado_cop`, `tiene_aseguradora_garantias`, `aseguradoras_relacion`
- No full balance sheet; no `patrimonio_neto`

**Step5Schema:** (RUP + certifications + habilitaciones; antecedentes booleans REMOVED)
- `rup_vigente`, `rup_numero`, `rup_fecha_vencimiento`, `rup_capacidad_organizacional_co`, `rup_capacidad_residual_kc`, `rup_capacidad_financiera_kf`
- `certificaciones`: array
- `habilitaciones_sectoriales`: array

**DocumentUploadSchema:**
- `tipo_documento`: `z.nativeEnum(TipoDocumentoJuridico)`
- `fecha_emision`: `z.string().date()`
- `fecha_vencimiento` = `fecha_emision + 30 days` (computed server-side)

### CV overlap utility

```typescript
export function calcularExperienciaEfectiva(entries: PersonalCvEntry[]): number
// Returns total non-overlapping months across all CV entries
// Algorithm: sort by fecha_inicio, merge overlapping date ranges, sum durations
```

### Design Rationale (SRP)

All domain schemas and sub-types in one file. CV utility is pure (no side effects) — testable in isolation.

## Dependencies

None — foundational task.

## Done When

- [ ] `EmpresaPerfilId`, `TipoSocietario`, `TipoDocumentoJuridico` exported from primitives
- [ ] All 5 step Zod schemas + `DocumentUploadSchema` exported
- [ ] `ContratoPrevio`, `PersonalCvEntry`, `calcularExperienciaEfectiva` exported
- [ ] `calcularExperienciaEfectiva` unit tests pass (overlap, no-overlap, null fecha_fin edge cases)
- [ ] `npm run build` succeeds with no type errors
