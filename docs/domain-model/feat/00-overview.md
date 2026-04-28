# domain-model — Feature Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- No shared type definitions exist; every downstream feature would invent its own `Proceso`, `Pliego`, `AnexoProceso`, or `Requisito` interface, causing silent schema drift.
- Solution: One Zod-first definition per entity generates TypeScript types, validates runtime data, and maps 1:1 to Postgres columns. Eight Zod entity schemas plus one LLM-output payload schema plus pure-type Semaforo definitions plus habilitante pattern constants share one canonical home under `src/types/`.
- `Proceso`, `Pliego`, `AnexoProceso`, and `Segmento` are public-read by any authenticated user; `Analisis`, `Requisito`, and `PromptCache` are empresa-scoped — an empresa's eligibility verdict is competitive intelligence and must never be visible to another empresa (RN-008, REQ-007/REQ-011).
- `Pliego` is restricted to documents with requisitos habilitantes (`pliego_condiciones`/`pliego_definitivo`); `AnexoProceso` is the sibling entity for non-pliego documents (`anexo_tecnico`/`estudio_previo`/`resolucion`/`otro`). v1 ingests Pliego only; AnexoProceso is schema-defined for v1.1+ (RN-012, ADR-008).
- `requisito.categoria` is the **narrow** `RequisitoCategoria` (excludes `general`, distinct from `SegmentoCategoria`) and is **immutable post-INSERT** — recategorization goes through orchestrator-level cache invalidation + re-extraction, not row-level UPDATE (RN-016, RN-017).
- Kysely consumes the same column names via a hand-authored `Database` interface, making queries type-safe without introspection tooling. RLS policies in Supabase enforce the public/private split at the DB layer.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph T1["T1: Primitives"]
        Enums["AnalisisEstado\nSegmentoCategoria (wide, incl. general)\nRequisitoCategoria (narrow, excl. general)\nSemaforoColor\nIsHabilitanteSource\nModalidadContratacion\nPliegoTipo / AnexoProcesoTipo\nEmpresaMemberRole\nBranded IDs (8)"]
    end

    subgraph T2["T2: Zod Schemas + Domain Files"]
        ZodSchemas["EmpresaSchema\nProcesoSchema\nPliegoSchema / AnexoProcesoSchema\nSegmentoSchema (incl. .refine() validators)\nAnalisisSchema (incl. semaforo_rules_version)\nRequisitoSchema (incl. categoria/is_habilitante/source/citation triple)\nPromptCacheSchema\nRequisitoExtractionPayloadSchema (with categoria='general' rejection)\nsemaforo.ts (types-only: Semaforo/SemaforoStats)\nhabilitante-patterns.ts (constants: HABILITANTE_HEADING_PATTERNS)"]
    end

    subgraph T3["T3: Migration"]
        SQL["supabase/migrations/\n0001_domain_model.sql\n(9 tables + 7 enums + 9 CHECKs + 1 trigger)"]
    end

    subgraph T4["T4: RLS"]
        RLS["supabase/migrations/\n0002_rls_domain_model.sql\n(bifurcated: public-read vs empresa-scoped)"]
    end

    subgraph T5["T5: Kysely Types"]
        DB["src/types/db.ts\nDatabase interface\n(9 tables; RequisitoTable.categoria immutability via ColumnType)"]
    end

    subgraph T6["T6: Barrel + Logger"]
        Barrel["src/types/index.ts (barrel)\nsrc/types/logger.ts (ExtractorLogger)"]
    end

    T1 --> T2
    T2 --> T5
    T2 --> T6
    T3 --> T4
    T5 --> T6
```

## Data Model

```mermaid
classDiagram
    class Empresa {
        +EmpresaId id
        +string nombre
        +string nit
        +Date profile_updated_at
        +Date created_at
        +Date updated_at
    }

    class Proceso {
        +ProcesoId id
        +string secop_process_number
        +string entidad_contratante
        +string objeto
        +ModalidadContratacion modalidad
        +number valor_estimado
        +object cronograma
        +Date created_at
    }

    class Pliego {
        +PliegoId id
        +ProcesoId proceso_id
        +PliegoTipo tipo
        +string file_path
        +string file_hash
        +EmpresaId|null uploaded_by_empresa_id
        +number page_count
        +Date|null deleted_at
        +Date created_at
    }

    class AnexoProceso {
        +AnexoProcesoId id
        +ProcesoId proceso_id
        +AnexoProcesoTipo tipo
        +string file_path
        +string file_hash
        +EmpresaId|null uploaded_by_empresa_id
        +number page_count
        +Date|null deleted_at
        +Date created_at
    }

    class Segmento {
        +SegmentoId id
        +PliegoId pliego_id
        +SegmentoCategoria categoria
        +string contenido
        +number orden
        +number page_range_start
        +number page_range_end
        +string|null heading_normalized
        +string|null heading_original
        +boolean is_synthetic
    }

    class Analisis {
        +AnalisisId id
        +ProcesoId proceso_id
        +EmpresaId empresa_id
        +PliegoId[] pliego_ids
        +AnalisisEstado estado
        +SemaforoColor|null semaforo
        +string|null error_message
        +number|null cost_usd
        +ModelMetadata|null model_metadata
        +string|null prompt_version
        +string|null semaforo_rules_version
        +Date|null completed_at
    }

    class Requisito {
        +RequisitoId id
        +AnalisisId analisis_id
        +SegmentoId segmento_id
        +RequisitoCategoria categoria
        +string descripcion
        +boolean|null cumple
        +SemaforoColor semaforo
        +string|null justificacion
        +boolean is_habilitante
        +IsHabilitanteSource is_habilitante_source
        +SegmentoId citation_segment_id
        +string citation_quote
        +boolean citation_verified
    }

    class PromptCache {
        +PromptCacheId id
        +PliegoId pliego_id
        +EmpresaId empresa_id
        +string hash
        +number prompt_tokens
        +Date cached_at
        +Date expires_at
    }

    Proceso "1" --> "*" Pliego : has pliegos
    Proceso "1" --> "*" AnexoProceso : has anexos
    Proceso "1" --> "*" Analisis : analyzed by
    Empresa "1" --> "*" Analisis : runs
    Empresa "1" --> "*" PromptCache : for empresa
    Pliego "1" --> "*" Segmento : has sections
    Pliego "1" --> "0..1" PromptCache : cached as
    Analisis "1" --> "*" Requisito : extracts
    Segmento "1" --> "*" Requisito : source of
    Segmento "1" --> "*" Requisito : citation of
```

The `Pliego`/`AnexoProceso` split (sibling entities under `Proceso`) is mandated by RN-012 / ADR-008. Their identical shape is a deliberate cost — the discriminator-overload problem is resolved by separating the entities themselves, not by a `tipo` discriminator on a unified table. v1 ingests Pliego only; AnexoProceso is schema-defined so v2 can add complementary-document analysis without a destructive migration.

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-primitives.md](./01-plan-01-primitives.md) | Branded IDs, enum literals (incl. narrow `RequisitoCategoria` and `IsHabilitanteSource`), ADR stubs (001/002/003/008) | None |
| T2 | [01-plan-02-zod-schemas.md](./01-plan-02-zod-schemas.md) | Zod schemas + inferred TS types for 8 entities + `RequisitoExtractionPayloadSchema` + new `semaforo.ts` (types-only) + new `habilitante-patterns.ts` (runtime constants) | T1 |
| T3 | [01-plan-03-postgres-migration.md](./01-plan-03-postgres-migration.md) | Supabase DDL — 9 tables, 7 enums, 9 CHECK constraints (incl. narrow categoria, is_habilitante_source vocabulary), 1 trigger, all indexes | None |
| T4 | [01-plan-04-rls-policies.md](./01-plan-04-rls-policies.md) | Bifurcated RLS — public-read for Proceso/Pliego/AnexoProceso/Segmento; empresa-scoped for Analisis/Requisito/PromptCache; hard-delete restrictive policies on Pliego and AnexoProceso | T3 |
| T5 | [01-plan-05-kysely-types.md](./01-plan-05-kysely-types.md) | Kysely `Database` interface — row, insert, and update types for 9 tables. `ModelMetadata` is canonical here. `RequisitoTable.categoria: ColumnType<R, R, never>` enforces RN-016 immutability at compile time. | T2 |
| T6 | [01-plan-06-barrel-exports.md](./01-plan-06-barrel-exports.md) | Barrel `src/types/index.ts` (re-exports schemas, types, Semaforo types, habilitante constants, ExtractorLogger) + `src/types/logger.ts` + typecheck gate | T2, T5 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Primitives"]
    T2["T2: Zod + Semaforo + Patterns"]
    T3["T3: Migration DDL"]
    T4["T4: RLS Policies"]
    T5["T5: Kysely Types"]
    T6["T6: Barrel + Logger + Typecheck"]

    T1 --> T2
    T2 --> T5
    T2 --> T6
    T3 --> T4
    T5 --> T6

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
```

T1 and T3 can run in parallel. T4 must follow T3. T5 must follow T2. T6 is the final gate.
