# Company Profiling Onboarding — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- **Problem:** COLTRATOS has no empresa capability data; matching cannot score procesos or derive discovery filters
- **Solution:** Single-page profile form (5 sections); completable in <15 min with RUP in hand; every save = immutable versioned snapshot
- **Dual purpose:** Profile feeds (a) semáforo matching during analysis and (b) discovery filter derivation (UNSPSC/geographic/budget)
- **Key constraints:** No wizard state persistence; completeness warning only (analysis never blocked); single user per company in MVP

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Form["Single-Page Profile Form"]
        S1["Datos legales\n(NIT, DV, razón social,\nrep. legal, domicilio)"]
        S2["Capacidad financiera\n(3 años: ingresos + patrimonio\n+ balance fields)"]
        S3["Experiencia\n(contratos_previos)"]
        S4["Personal clave\n(dynamic list)"]
        S5["Alcance comercial\n(UNSPSC + dpto + presupuesto)"]
    end

    subgraph Services
        UNSPSC["UNSPSC Search\n(client JSON)"]
        Action["saveCompanyProfile\n(Server Action)"]
    end

    subgraph DB
        CP[("company_profiles\n(versioned)")]
    end

    subgraph Dashboard
        Badge["Completeness Badge\n(X/5 sections)"]
    end

    S5 -->|search| UNSPSC
    Form -->|submit| Action
    Action -->|compute indicators + INSERT| CP
    CP -->|is_current| Badge
```

## Data Model

```mermaid
classDiagram
    class Company {
        +CompanyId id
        +string nombre
        +ProfileId current_profile_id
    }
    class CompanyProfile {
        +ProfileId id
        +CompanyId company_id
        +int version
        +bool is_current
        +string nit
        +int digito_verificacion
        +string razon_social
        +string representante_legal_nombre
        +string representante_legal_cedula
        +string domicilio_principal
        +int anio_constitucion
        +EjercicioFiscal[] ejercicios_fiscales
        +number liquidez_corriente
        +number nivel_endeudamiento
        +number capital_de_trabajo
        +ContratoPrevio[] contratos_previos
        +PersonalClaveEntry[] personal_clave
        +string[] unspsc_codes
        +string[] departamentos_interes
        +number presupuesto_min_cop
        +number presupuesto_max_cop
    }
    Company "1" --> "0..*" CompanyProfile : "versions"
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-primitives.md](./01-plan-01-primitives.md) | Zod schemas + domain types for all 5 form sections | None |
| T2 | [01-plan-02-migration.md](./01-plan-02-migration.md) | Migration: versioned company_profiles table + RLS + GIN indexes | T1 |
| T3 | [01-plan-03-kysely-types.md](./01-plan-03-kysely-types.md) | Kysely interface for company_profiles | T2 |
| T5 | [01-plan-05-unspsc-catalog.md](./01-plan-05-unspsc-catalog.md) | UNSPSC catalog JSON + client-side search util | None |
| T6 | [01-plan-06-server-actions.md](./01-plan-06-server-actions.md) | saveCompanyProfile (versioned INSERT + indicator computation) + getCompanyProfile | T3 |
| T7 | [01-plan-07-profile-form.md](./01-plan-07-profile-form.md) | Single-page profile form UI (5 sections, dynamic lists, UNSPSC multi-select) | T5, T6 |
| T8 | [01-plan-08-dashboard-completeness.md](./01-plan-08-dashboard-completeness.md) | Dashboard completeness badge; wire form into /onboarding and /config/perfil routes | T7 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Primitives"]
    T2["T2: Migration"]
    T3["T3: Kysely Types"]
    T5["T5: UNSPSC Catalog"]
    T6["T6: Server Actions"]
    T7["T7: Profile Form"]
    T8["T8: Dashboard Completeness"]

    T1 --> T2
    T2 --> T3
    T3 --> T6
    T5 --> T7
    T6 --> T7
    T7 --> T8
```
