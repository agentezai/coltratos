# pliego-upload — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- Companies must upload a pliego PDF to trigger the semáforo analysis, but raw file uploads need a security boundary, an audit trail, and atomic queue dispatch
- Solution: server-side validation pipeline (magic bytes → size → encryption → SHA-256 → storage → RPC) backed by a DB RPC that atomically inserts the audit row and dispatches the pgmq job
- Widget is decoupled from the analysis flow so it can be lifted post-MVP; state machine covers all five discrete upload states
- Output: `pliego_upload_id` returned to the caller; `pdf-ingestion` worker picks up from there via pgmq

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Widget["PliegoUploadWidget (client)"]
        FileInput["File Input\n(drop zone)"]
        Declaration["Declaration Checkbox"]
        StateDisplay["State Display\n(idle/validating/uploading/dispatching/success/error)"]
    end

    subgraph API["POST /api/pliego-uploads (Edge Function)"]
        MagicCheck["Magic-byte check\n(REQ-003)"]
        SizeCheck["Size check\n(REQ-004)"]
        EncCheck["Encryption check\n(REQ-005)"]
        SHA["SHA-256 hash\n(REQ-006)"]
        StorageWrite["Supabase Storage write\n(REQ-007)"]
        RPC["dispatch_pliego_upload RPC\n(REQ-008)"]
    end

    subgraph DB["Postgres (Supabase)"]
        Table[("pliego_uploads")]
        Queue[("pgmq\npdf_ingestion_queue")]
    end

    FileInput -->|multipart/form-data| MagicCheck
    MagicCheck --> SizeCheck
    SizeCheck --> EncCheck
    EncCheck --> SHA
    SHA --> StorageWrite
    StorageWrite --> RPC
    RPC -->|INSERT ON CONFLICT| Table
    RPC -->|pgmq.send| Queue
    RPC -->|UploadResult| StateDisplay

    style MagicCheck fill:#fff4e1
    style SizeCheck fill:#fff4e1
    style EncCheck fill:#fff4e1
    style RPC fill:#e1f5ff
    style Table fill:#e8f5e9
    style Queue fill:#e8f5e9
```

## Data Model

`pliego_uploads` schema is defined and owned by `domain-model-mvp`. This feature does not introduce new tables or migrations beyond a storage policy and one stored procedure.

```mermaid
classDiagram
    class UploadResult {
        +pliego_upload_id: string
        +reused: boolean
        +uploaded_at: string
        +ingestion_status: "pending"
    }

    class PliegoUploadError {
        +error: "INVALID_PDF" | "ENCRYPTED_PDF" | "FILE_TOO_LARGE" | "SERVER_ERROR"
        +message: string
    }

    class UploadState {
        <<enumeration>>
        idle
        validating
        uploading
        dispatching
        success
        error
    }

    PliegoUploadWidget --> UploadState
    PliegoUploadWidget --> UploadResult
    PliegoUploadWidget --> PliegoUploadError
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-validation-utilities.md](./01-plan-01-validation-utilities.md) | Types + pure validation utilities (client + server) | None |
| T2 | [01-plan-02-storage-service.md](./01-plan-02-storage-service.md) | Supabase Storage service + pliegos bucket RLS policy migration | T1 |
| T3 | [01-plan-03-db-rpc.md](./01-plan-03-db-rpc.md) | `dispatch_pliego_upload` stored procedure + migration | None |
| T4 | [01-plan-04-api-route.md](./01-plan-04-api-route.md) | POST `/api/pliego-uploads` Edge Function | T1, T2, T3 |
| T5 | [01-plan-05-upload-widget.md](./01-plan-05-upload-widget.md) | `PliegoUploadWidget` + `DeclarationCheckbox` + `usePliegoUpload` hook | T1, T4 |
| T6 | [01-plan-06-integration.md](./01-plan-06-integration.md) | Wire widget into analysis flow step 6 page | T5 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Validation Utilities"]
    T2["T2: Storage Service"]
    T3["T3: DB RPC"]
    T4["T4: API Route"]
    T5["T5: Upload Widget"]
    T6["T6: Integration"]

    T1 --> T2
    T1 --> T4
    T2 --> T4
    T3 --> T4
    T1 --> T5
    T4 --> T5
    T5 --> T6

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
```
