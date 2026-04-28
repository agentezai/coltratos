# create-service
> Added: 2026-04-25 | Feature: built-in | Usage count: 0
> Last updated: 2026-04-25

## When to Apply
Use when creating a new service class that encapsulates business logic.
Applies to any backend service: data access, third-party integrations,
domain-specific logic.

## Pattern
Singleton service with dependency injection and a static `getInstance()`
accessor. Each service owns its dependencies and exposes a focused API.

- One class per file, one concern per service
- Constructor accepts dependencies (other services, config)
- Static `getInstance()` for singleton access
- Companion test file with the same name

## Reference Implementation
file: (set after first extraction — point to a concrete service in your codebase)

## Template
```typescript
// src/services/{{service_name}}.ts

export class {{ServiceName}}Service {
  private static instance: {{ServiceName}}Service;

  private constructor(
    private readonly deps: { /* injected dependencies */ },
  ) {}

  static getInstance(): {{ServiceName}}Service {
    if (!{{ServiceName}}Service.instance) {
      {{ServiceName}}Service.instance = new {{ServiceName}}Service({
        /* resolve deps */
      });
    }
    return {{ServiceName}}Service.instance;
  }

  // --- public API ---

  async findById(id: string): Promise<{{Entity}} | null> {
    // implementation
  }
}
```

## Validation Steps
1. File is under the `src/services/` directory
2. Class follows singleton pattern with `getInstance()`
3. Constructor is private
4. A companion test file exists at `tests/services/{{service_name}}.test.ts`
5. All tests pass
