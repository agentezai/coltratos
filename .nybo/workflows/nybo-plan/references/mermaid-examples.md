# Mermaid diagram examples

Use these patterns in specs for architecture, flows, and data. Pick the diagram type that best fits the section.

---

## Flowchart — feature architecture and data flow

**Use this when:** Showing how components connect, where data goes, or high-level feature flow.

```mermaid
flowchart LR
  subgraph Frontend
    UI[UI]
  end
  subgraph Backend
    API[API]
    SVC[Service]
  end
  subgraph Data
    DB[(Database)]
  end
  UI --> API
  API --> SVC
  SVC --> DB
```

---

## Sequence diagram — multi-step or multi-actor interactions

**Use this when:** Describing a flow over time between user, frontend, API, and external services.

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant A as API
  participant E as External

  U->>F: Action
  F->>A: Request
  A->>E: Call
  E-->>A: Response
  A-->>F: Response
  F-->>U: Update UI
```

---

## ER diagram — new or changed data models

**Use this when:** Introducing or changing entities, tables, or core domain models.

```mermaid
erDiagram
  USER ||--o{ PROJECT : owns
  PROJECT ||--o{ TASK : contains
  USER {
    string id
    string email
    string name
  }
  PROJECT {
    string id
    string name
    string ownerId
  }
  TASK {
    string id
    string title
    string projectId
  }
```

---

## Class diagram — service and component relationships

**Use this when:** Describing service boundaries, interfaces, or component dependencies.

```mermaid
classDiagram
  class ApiController {
    +handleRequest()
  }
  class AuthService {
    +validate(token)
    +getUser(id)
  }
  class ProjectService {
    +create(data)
    +list(userId)
  }
  ApiController --> AuthService : uses
  ApiController --> ProjectService : uses
  ProjectService --> AuthService : uses
```
