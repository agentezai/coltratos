# T1: Domain Primitives & Zod Schemas

## Scope

- `src/types/domain/company-profile.ts` — branded types + domain sub-types (new file)
- `src/lib/validators/company-profile.ts` — Zod schemas for full form + sub-schemas (new file)

## Changes

### Branded types (company-profile.ts)

```typescript
export type CompanyProfileId = string & { readonly __brand: 'CompanyProfileId' }
```

### Domain sub-types

```typescript
export const EjercicioFiscalSchema = z.object({
  ejercicio: z.number().int().min(2000).max(2030),
  ingresos_operacionales: z.number().nonnegative(),
  patrimonio: z.number(),
  activo_corriente: z.number().nonnegative(),
  pasivo_corriente: z.number().nonnegative(),
  activo_total: z.number().nonnegative(),
  pasivo_total: z.number().nonnegative(),
})
export type EjercicioFiscal = z.infer<typeof EjercicioFiscalSchema>

export const ContratoPrevioSchema = z.object({
  entidad_contratante: z.string().min(2),
  objeto: z.string().min(5),
  valor_cop: z.number().nonnegative(),
  fecha_inicio: z.string().date(),
  fecha_fin: z.string().date(),
  unspsc_code: z.string().optional(),
}).refine(d => d.fecha_fin >= d.fecha_inicio, {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['fecha_fin'],
})
export type ContratoPrevio = z.infer<typeof ContratoPrevioSchema>

export const PersonalClaveEntrySchema = z.object({
  nombre: z.string().min(2),
  cedula: z.string().min(5),
  profesion: z.string().min(2),
  titulo: z.string().min(2),
  anios_experiencia: z.number().int().nonnegative(),
  certificaciones: z.array(z.string()).default([]),
})
export type PersonalClaveEntry = z.infer<typeof PersonalClaveEntrySchema>
```

### Full form schema (company-profile.ts)

```typescript
export const CompanyProfileSchema = z.object({
  // Section 1: Datos legales
  nit: z.string().regex(/^\d{6,10}$/, 'NIT debe tener entre 6 y 10 dígitos'),
  digito_verificacion: z.number().int().min(0).max(9),
  razon_social: z.string().min(2),
  representante_legal_nombre: z.string().min(2),
  representante_legal_cedula: z.string().min(5),
  domicilio_principal: z.string().min(2),
  anio_constitucion: z.number().int().min(1900).max(new Date().getFullYear()),
  // Section 2: Capacidad financiera
  ejercicios_fiscales: z.array(EjercicioFiscalSchema).min(0).max(3),
  // Section 3: Experiencia
  contratos_previos: z.array(ContratoPrevioSchema).default([]),
  // Section 4: Personal clave
  personal_clave: z.array(PersonalClaveEntrySchema).default([]),
  // Section 5: Alcance comercial
  unspsc_codes: z.array(z.string()).default([]),
  departamentos_interes: z.array(z.string()).default([]),
  presupuesto_min_cop: z.number().nonnegative().nullable().optional(),
  presupuesto_max_cop: z.number().nonnegative().nullable().optional(),
}).refine(
  d => !d.presupuesto_min_cop || !d.presupuesto_max_cop || d.presupuesto_min_cop <= d.presupuesto_max_cop,
  { message: 'El presupuesto mínimo no puede ser mayor al máximo', path: ['presupuesto_max_cop'] }
)
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>
```

### NIT DV utility

```typescript
export function validarDigitoVerificacion(nit: string, dv: number): boolean
// Colombian modulo-11 algorithm
// Returns true if computed DV matches provided dv
```

### Derived indicators utility

```typescript
export function computarIndicadoresFinancieros(
  ejercicios: EjercicioFiscal[]
): { liquidez_corriente: number | null; nivel_endeudamiento: number | null; capital_de_trabajo: number | null }
// Uses most recent year (max ejercicio); returns null for each indicator if required input = 0 or absent
```

### Design Rationale (SRP)

Full form schema in one file — holistic validation (cross-section .refine) can only work on the full object. Utilities are pure with no side effects — testable in isolation.

## Dependencies

None — foundational task.

## Done When

- [ ] `CompanyProfileSchema` exported; validates all 5 sections with correct .refine rules
- [ ] `ContratoPrevioSchema` rejects entries where fecha_fin < fecha_inicio
- [ ] `validarDigitoVerificacion` accepts valid NITs, rejects invalid DVs (unit tests)
- [ ] `computarIndicadoresFinancieros` returns null when pasivo_corriente = 0
- [ ] `npm run build` succeeds with no type errors
