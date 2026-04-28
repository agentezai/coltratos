# create-component
> Added: 2026-04-25 | Feature: built-in | Usage count: 0
> Last updated: 2026-04-25

## When to Apply
Use when creating a new React component. Ensures consistent structure,
typed props, and test coverage.

## Pattern
Functional component with a typed props interface, default export,
and a companion test file.

- Props interface defined and exported
- Component uses PascalCase naming
- One component per file
- Companion test file with rendering + interaction tests

## Reference Implementation
file: (set after first extraction — point to a concrete component in your codebase)

## Template
```tsx
// src/components/{{ComponentName}}/{{ComponentName}}.tsx

export interface {{ComponentName}}Props {
  /** Brief description of each prop */
  title: string;
  onAction?: () => void;
}

export default function {{ComponentName}}({ title, onAction }: {{ComponentName}}Props) {
  return (
    <div className="{{component_name}}">
      <h2>{title}</h2>
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  );
}
```

## Validation Steps
1. Component file is under `src/components/` using PascalCase directory and filename
2. Props interface is exported
3. Component has a default export
4. A companion test file exists at `tests/components/{{ComponentName}}.test.tsx` (or co-located)
5. Tests cover rendering with required props and interaction handlers
6. All tests pass
