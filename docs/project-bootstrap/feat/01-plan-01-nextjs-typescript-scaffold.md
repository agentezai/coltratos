# T1: Next.js + TypeScript Scaffold

## Scope

- `package.json` — root manifest. Created by `create-next-app`; this task customizes it.
- `tsconfig.json` — TypeScript config. Created by `create-next-app`; this task hardens it (strict + path aliases).
- `next.config.ts` — Next.js config (TypeScript form, not JS).
- `app/layout.tsx` — root layout (Server Component).
- `app/page.tsx` — placeholder home page.
- `app/globals.css` — Tailwind v4 base imports.
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin (Next.js 16 default).
- `eslint.config.mjs` — ESLint flat config (Next.js 16 default).
- `next-env.d.ts` — auto-generated, gitignored.
- `src/` — empty directory (created so the `@/*` alias has a target; domain-model T1 onward populates it).

## Changes

### Initialize via `create-next-app`

Run (interactive prompts answered to match REQ-002 / RN-002):

```bash
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias '@/*' --use-npm --turbopack
```

Flags chosen:
- `--typescript` — TypeScript out of the box.
- `--tailwind` — Tailwind v4 (Next.js 16 default).
- `--eslint` — ESLint with `eslint-config-next`.
- `--app` — App Router (RN-002).
- `--src-dir=false` — `app/` lives at the repo root; `src/` is a separate directory created in this task for non-route source files (matches the file structure in [domain-model 01-plan-01-primitives.md](../../domain-model/feat/01-plan-01-primitives.md): `src/types/domain/primitives.ts`).
- `--import-alias '@/*'` — root alias.
- `--use-npm` — package manager (RN-001 / ADR-014; written in T2).
- `--turbopack` — Turbopack-powered dev server (the 400% faster startup in Next 16.2).

The `.` argument tells create-next-app to scaffold into the current directory rather than creating a sub-folder.

### Harden `tsconfig.json` (REQ-003)

After scaffold:
- Add `"noUncheckedIndexedAccess": true` to `compilerOptions`.
- Add `"@/types": ["./src/types/index.ts"]` to `compilerOptions.paths` (the wildcard `@/*` from create-next-app stays).
- Confirm `target: "ES2022"`, `module: "esnext"`, `moduleResolution: "bundler"`, `strict: true` (Next.js defaults are usually compatible — adjust if not).

Example final shape:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types/index.ts"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Author `app/page.tsx` placeholder (REQ-002)

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-24">
      <p className="text-xl font-medium">COLTRATOS — coming soon</p>
    </main>
  )
}
```

### Author `app/layout.tsx`

Use the `create-next-app` default; only change is the title metadata:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'COLTRATOS',
  description: 'Análisis de elegibilidad para licitaciones públicas colombianas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
```

`lang="es"` is intentional — the product is Colombian-Spanish-first.

### Create the empty `src/` directory

```bash
mkdir -p src/types/domain
touch src/.gitkeep
```

The `.gitkeep` ensures git tracks the directory so domain-model T1 doesn't need to create it. The `src/types/domain` subpath is also created (also `.gitkeep`-able) so the path alias works on day one.

### Design Rationale (Open/Closed)

`create-next-app` produces a battle-tested scaffold. We harden three things on top: strict TypeScript, the explicit `@/types` alias, and the `lang="es"` localization. Everything else is left at the framework default to minimize surface area for drift.

## Dependencies

None — this is the first task. Requires Node 20.x and npm 10.x installed locally.

## Done When

- [ ] `package.json` exists at the repo root with `name: "coltratos"`, `private: true`, `engines.node: ">=20.0.0"`.
- [ ] `tsconfig.json` exists with `strict: true`, `noUncheckedIndexedAccess: true`, `paths.@/*` AND `paths.@/types`.
- [ ] `next.config.ts` exists (TypeScript form).
- [ ] `app/layout.tsx` and `app/page.tsx` exist; the page renders the placeholder.
- [ ] `app/globals.css` and `postcss.config.mjs` exist (Tailwind v4 wired).
- [ ] `eslint.config.mjs` exists (Next.js 16 flat config).
- [ ] `src/.gitkeep` and `src/types/domain/.gitkeep` exist.
- [ ] `pages/` directory does NOT exist (RN-002).
- [ ] `npm run typecheck` exits 0 (TC-002).
- [ ] `npm run lint` exits 0 (TC-003).
- [ ] `npm run dev` boots Next.js within 60s and the placeholder page renders at `/` (TC-006).
