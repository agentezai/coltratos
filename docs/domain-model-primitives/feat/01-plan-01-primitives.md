# T1: Type Primitives

## Scope

- `src/types/domain/primitives.ts` — Branded ID types, enum literals, and constants
- `.nybo/foundation/adrs/ADR-001-kysely.md`
- `.nybo/foundation/adrs/ADR-002-zod.md`
- `.nybo/foundation/adrs/ADR-003-rls-tenant-isolation.md`
- `.nybo/foundation/adrs/ADR-008-pliego-anexoproceso-split.md`

## Changes

### Branded ID Types

Define one branded string type per aggregate root to prevent mixing IDs across entity boundaries:

```typescript
export type EmpresaId        = string & { readonly __brand: 'EmpresaId' }
export type ProcesoId        = string & { readonly __brand: 'ProcesoId' }
export type PliegoId         = string & { readonly __brand: 'PliegoId' }
export type AnexoProcesoId   = string & { readonly __brand: 'AnexoProcesoId' }
export type SegmentoId       = string & { readonly __brand: 'SegmentoId' }
export type AnalisisId       = string & { readonly __brand: 'AnalisisId' }
export type RequisitoId      = string & { readonly __brand: 'RequisitoId' }
export type PromptCacheId    = string & { readonly __brand: 'PromptCacheId' }
```

Export a helper: `export const branded = <T>(id: string) => id as T`

### Enum Literals

Define as `const` objects (Kysely-compatible) with accompanying union type:

- `AnalisisEstado`: `'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed'`
- `SegmentoCategoria`: `'juridico' | 'financiero' | 'tecnico' | 'experiencia' | 'general'`
- `RequisitoCategoria`: `'juridico' | 'financiero' | 'tecnico' | 'experiencia'` (**narrow** — does NOT include `general`, per REQ-008 and RN-017)
- `SemaforoColor`: `'verde' | 'amarillo' | 'rojo'`
- `IsHabilitanteSource`: `'structural' | 'llm' | 'manual'`
- `ModalidadContratacion`: `'licitacion_publica' | 'seleccion_abreviada' | 'minima_cuantia' | 'concurso_meritos' | 'contratacion_directa'`
- `PliegoTipo`: `'pliego_condiciones' | 'pliego_definitivo'` (intentionally narrow per RN-012)
- `AnexoProcesoTipo`: `'anexo_tecnico' | 'estudio_previo' | 'resolucion' | 'otro'`
- `EmpresaMemberRole`: `'owner' | 'member'`

Each exported as both a `const ENUM_NAME = { ... } as const` and a `type EnumName = typeof ENUM_NAME[keyof typeof ENUM_NAME]`.

### ADR Files

Write four short ADR files under `.nybo/foundation/adrs/`:
- **ADR-001**: Kysely chosen over Prisma/Drizzle — reason: fine-grained SQL control, no codegen step, compatible with Supabase RLS.
- **ADR-002**: Zod chosen as runtime validator — reason: single definition generates TS types via `z.infer`; no separate type files.
- **ADR-003**: Supabase RLS for tenant isolation — reason: DB-layer enforcement survives direct access, future services, and admin queries. Bifurcated: public tables use `authenticated` role check; empresa-private tables join `empresa_member`.
- **ADR-008**: Pliego/AnexoProceso split — narrow Pliego semantics. `Pliego` is restricted to documents with requisitos habilitantes; `AnexoProceso` covers everything else. Two distinct tables and two distinct enums prevent discriminator-overload.

### Design Rationale

Primitives are dependency-free — no Zod, no Kysely. Any module can import them without pulling in framework dependencies.

## Dependencies

None — foundational task.

## Done When

- [ ] `src/types/domain/primitives.ts` exports all 8 branded ID types, all enum const objects, and all union types
- [ ] `branded<T>()` helper exported
- [ ] Four ADR files written to `.nybo/foundation/adrs/`
- [ ] `tsc --noEmit` on `primitives.ts` in isolation produces zero errors
- [ ] All enum values use ASCII (no accents) to match Postgres CHECK constraints
- [ ] `RequisitoCategoria` has exactly 4 values; `'general'` is NOT assignable to it
- [ ] `IsHabilitanteSource` has exactly 3 values: `'structural'`, `'llm'`, `'manual'`
