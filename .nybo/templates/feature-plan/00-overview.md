# {Feature Name} - Overview

## Spec Reference

[Spec](../../spec/{feature}/spec.md)

## Problem + Solution

- {1-2 lines describing the current pain point or business need}
- Solution: {1-2 lines describing what will be built}
- {Key technical approach — services, patterns, integrations used}
- {Output format or deliverable — what the user gets}

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend
        A["UI Component"]
        B["User Action"]
    end

    subgraph API_Layer["API Layer"]
        C["API Endpoint"]
    end

    subgraph Services
        D["Primary Service"]
        E["Builder / Transformer"]
        F["Data Service"]
    end

    subgraph Data
        G[("Data Store")]
    end

    B -->|input| C
    C -->|validate| C
    C -->|action| D
    D -->|fetch| F
    F -->|data| G
    D -->|transformed data| E
    E -->|output| C
    C -->|response| A

    style D fill:#e1f5ff
    style E fill:#e1f5ff
    style C fill:#fff4e1
```

## Data Model

{Describe whether new database entities are required or if existing data is reused.}

**Key Data Structures:**

```mermaid
classDiagram
    class PrimaryModel {
        +field1: type
        +field2: type
        +children: ChildModel[]
    }

    class ChildModel {
        +field1: type
        +field2: type
    }

    PrimaryModel "1" --> "*" ChildModel
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-{task-name}.md](./01-plan-01-{task-name}.md) | {Brief description} | None |
| T2 | [01-plan-02-{task-name}.md](./01-plan-02-{task-name}.md) | {Brief description} | T1 |
| T3 | [01-plan-03-{task-name}.md](./01-plan-03-{task-name}.md) | {Brief description} | T1 |
| T4 | [01-plan-04-{task-name}.md](./01-plan-04-{task-name}.md) | {Brief description} | T3 |
| T5 | [01-plan-05-{task-name}.md](./01-plan-05-{task-name}.md) | {Brief description} | T2, T4 |
| T6 | [01-plan-06-{task-name}.md](./01-plan-06-{task-name}.md) | {Brief description} | T5 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Task Name"]
    T2["T2: Task Name"]
    T3["T3: Task Name"]
    T4["T4: Task Name"]
    T5["T5: Task Name"]
    T6["T6: Task Name"]

    T1 --> T2
    T1 --> T3
    T3 --> T4
    T2 --> T5
    T4 --> T5
    T5 --> T6

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
```
