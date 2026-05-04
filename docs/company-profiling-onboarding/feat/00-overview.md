# Company Profiling Onboarding — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- **Problem:** COLTRATOS has no empresa capability data; matching cannot score procesos beyond keyword presence
- **Solution:** 5-step onboarding: steps 1-3 mandatory (Layer 1 — UNSPSC + geography), steps 4-5 optional (Layer 2 — financial thresholds + semantic objeto matching)
- **Score:** Técnica 50% + Financiera 40% + Semantic 10%. Jurídica = certificate expiry alert track only (not scored)
- **Key changes vs v0:** documento uploads (not declarations) for Jurídica; simplified financial inputs; objeto contractual + CV overlap model for Técnica

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Onboarding["Onboarding Wizard (Steps 1-3)"]
        S1["Step 1\nIdentidad legal"]
        S2["Step 2\nTécnica\n+ contratos_previos\n+ personal_cv"]
        S3["Step 3\nPreferencias"]
    end

    subgraph ProfileEditor["Profile Editor (Steps 4-5)"]
        S4["Step 4\nFinanciera\n(simplified inputs)"]
        S5["Step 5\nJurídica\n(document uploads)"]
    end

    subgraph Services
        RUES["RUES Lookup (2s)"]
        UNSPSC["UNSPSC Search\n(client JSON)"]
        Actions["Server Actions\n(upsertStep1-5)"]
        DocSvc["Document Upload\nService"]
    end

    subgraph DB
        EP[("empresa_perfil")]
        DJ[("empresa_documento_juridico")]
        Storage[("Supabase Storage")]
    end

    subgraph Dashboard
        Banner["Completitud Banner\n(financial)"]
        Alerts["Document Expiry\nAlerts"]
        Gate["Contextual Gate"]
    end

    S1 -->|NIT| RUES
    S2 -->|search| UNSPSC
    S1 & S2 & S3 -->|submit| Actions
    S4 -->|submit| Actions
    S5 -->|RUP fields| Actions
    S5 -->|certificates| DocSvc
    Actions -->|upsert| EP
    DocSvc -->|insert| DJ
    DocSvc -->|store| Storage
    EP -->|completitud_financiera| Banner
    EP -->|completitud_financiera| Gate
    DJ -->|expiry status| Alerts
```

## Data Model

```mermaid
classDiagram
    class Empresa {
        +EmpresaId id
        +string nombre
        +string nit
    }
    class EmpresaPerfil {
        +EmpresaId empresa_id PK
        +UnspscItem[] unspsc_codes
        +ContratoPrevio[] contratos_previos
        +PersonalCvEntry[] personal_cv
        +number activo_total
        +number pasivo_total
        +number nivel_endeudamiento [generated]
        +number liquidez_corriente [generated]
        +boolean completitud_tecnica [generated]
        +boolean completitud_financiera [generated]
    }
    class EmpresaDocumentoJuridico {
        +UUID id
        +EmpresaId empresa_id
        +TipoDocumentoJuridico tipo_documento
        +string file_path
        +Date fecha_vencimiento
    }
    Empresa "1" --> "0..1" EmpresaPerfil
    Empresa "1" --> "0..*" EmpresaDocumentoJuridico
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-primitives.md](./01-plan-01-primitives.md) | Zod schemas + types: ContratoPrevio, PersonalCvEntry, TipoDocumentoJuridico, calcularExperienciaEfectiva | None |
| T2 | [01-plan-02-migration.md](./01-plan-02-migration.md) | Migration: empresa_perfil (simplified financial) + empresa_documento_juridico + RLS | T1 |
| T3 | [01-plan-03-kysely-types.md](./01-plan-03-kysely-types.md) | Kysely interfaces for both tables | T2 |
| T4 | [01-plan-04-rues-lookup.md](./01-plan-04-rues-lookup.md) | RUES lookup service + API route | T1 |
| T5 | [01-plan-05-unspsc-catalog.md](./01-plan-05-unspsc-catalog.md) | UNSPSC catalog JSON + search util | None |
| T6 | [01-plan-06-document-upload.md](./01-plan-06-document-upload.md) | Document upload service: storage + expiry tracking | T3 |
| T7 | [01-plan-07-server-actions.md](./01-plan-07-server-actions.md) | Server actions upsertStep1-5 (no antecedentes) | T3, T4 |
| T8 | [01-plan-08-onboarding-wizard.md](./01-plan-08-onboarding-wizard.md) | Wizard UI: steps 1-3, contratos_previos, CV overlap advisory | T5, T7 |
| T9 | [01-plan-09-profile-editor.md](./01-plan-09-profile-editor.md) | Profile editor: step4 simplified financiera, step5 document upload cards | T6, T7 |
| T10 | [01-plan-10-dashboard-integration.md](./01-plan-10-dashboard-integration.md) | Dashboard: CompletitudBanner + DocumentExpiryAlerts + ContextualGate | T8, T9 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Primitives"]
    T2["T2: Migration"]
    T3["T3: Kysely Types"]
    T4["T4: RUES Lookup"]
    T5["T5: UNSPSC Catalog"]
    T6["T6: Document Upload"]
    T7["T7: Server Actions"]
    T8["T8: Onboarding Wizard"]
    T9["T9: Profile Editor"]
    T10["T10: Dashboard"]

    T1 --> T2
    T2 --> T3
    T1 --> T4
    T3 --> T6
    T3 --> T7
    T4 --> T7
    T5 --> T8
    T7 --> T8
    T6 --> T9
    T7 --> T9
    T8 --> T10
    T9 --> T10
```
