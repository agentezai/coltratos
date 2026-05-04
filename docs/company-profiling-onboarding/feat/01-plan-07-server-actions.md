# T7: Server Actions — empresa_perfil CRUD

## Scope

- `src/lib/actions/empresa-perfil.ts` — 5 step upsert actions + read action (new file)

## Changes

### Action signatures

```typescript
export async function upsertEmpresaPerfilStep1(data: EmpresaPerfilStep1): Promise<ActionResult>
export async function upsertEmpresaPerfilStep2(data: EmpresaPerfilStep2): Promise<ActionResult>
export async function upsertEmpresaPerfilStep3(data: EmpresaPerfilStep3): Promise<ActionResult>
export async function upsertEmpresaPerfilStep4(data: EmpresaPerfilStep4): Promise<ActionResult>
export async function upsertEmpresaPerfilStep5(data: EmpresaPerfilStep5): Promise<ActionResult>
export async function getEmpresaPerfil(empresaId: EmpresaId): Promise<EmpresaPerfilTable | null>
```

`ActionResult = { ok: true } | { ok: false; error: string }`

### Step4 changes vs original spec

Step4 now upserts: `activo_total`, `pasivo_total`, `activo_corriente`, `pasivo_corriente`, `ebit`, `gastos_financieros`, `ingresos_operacionales`, `utilidad_neta`, `margen_neto`, `margen_ebitda`, `roe`, `roa`, `cupo_credito_aprobado_cop`, `tiene_aseguradora_garantias`, `aseguradoras_relacion`.

**No more full balance sheet fields** (`patrimonio_neto` etc. removed).

### Step5 changes vs original spec

Step5 now upserts: `rup_vigente`, `rup_numero`, `rup_fecha_inscripcion`, `rup_fecha_vencimiento`, `rup_capacidad_organizacional_co`, `rup_capacidad_residual_kc`, `rup_capacidad_financiera_kf`, `certificaciones`, `habilitaciones_sectoriales`.

**No antecedentes booleans.** No declaration IP/timestamp. Document uploads go through the document upload service (T6) via the API route — not via this server action.

### All actions pattern

1. Session check — reject if unauthenticated
2. Resolve `empresa_id` from `empresa_member`
3. `Schema.safeParse(data)` — return `{ ok: false, error }` on failure
4. Kysely `insertInto('empresa_perfil').values(...).onConflict(...doUpdateSet(...))` — step-field upsert only
5. Return `{ ok: true }`

### Design Rationale (SRP + ADR-002)

One action per wizard step. Document uploads are a separate HTTP multipart flow (T6) — cannot be done via server action due to file streaming. Antecedentes booleans eliminated; no declaration logging needed.

## Dependencies

Requires T3 (Kysely types). T6 (document upload) is independent — no cross-dependency.

## Done When

- [ ] All 5 upsert actions and `getEmpresaPerfil` exported
- [ ] Step4 upserts new financial fields; no balance sheet fields
- [ ] Step5 has no antecedentes or declaration logic
- [ ] Unauthenticated call returns `{ ok: false, error: 'unauthorized' }`
- [ ] Unit tests: valid + invalid data per step; step4 financial fields upserted
- [ ] `npm run build` succeeds
