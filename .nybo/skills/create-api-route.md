# create-api-route
> Added: 2026-04-25 | Feature: built-in | Usage count: 0
> Last updated: 2026-04-25

## When to Apply
Use when adding a new API route or endpoint. Ensures consistent
middleware, validation, error handling, and test coverage.

## Pattern
Standard API route with authentication middleware, input validation,
structured error responses, and a companion test file.

- Auth middleware applied before handler
- Request body / query validated up front
- Consistent error response shape
- Companion integration test file

## Reference Implementation
file: (set after first extraction — point to a concrete route in your codebase)

## Template
```typescript
// src/app/api/{{resource}}/route.ts  (Next.js App Router example)

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-middleware";
import { validate } from "@/lib/validation";
import { {{ServiceName}}Service } from "@/services/{{service_name}}";

export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await {{ServiceName}}Service.getInstance().list(user.id);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, errors } = validate(body, {{schema}});
  if (errors) return NextResponse.json({ errors }, { status: 400 });

  const created = await {{ServiceName}}Service.getInstance().create(data);
  return NextResponse.json(created, { status: 201 });
}
```

## Validation Steps
1. Route file exists under `src/app/api/` (or project's route directory)
2. Authentication middleware is applied to all handlers
3. Input validation occurs before business logic
4. Error responses use a consistent shape (`{ error: string }` or `{ errors: ... }`)
5. A companion test file exists and covers success + auth failure + validation failure
6. All tests pass
