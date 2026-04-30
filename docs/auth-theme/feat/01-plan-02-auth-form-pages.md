# T2: Auth Form Pages — Button + Graphite Tokens + Story Fix

## Scope

| File | Change |
|------|--------|
| `app/(auth)/login/page.tsx` | Button, graphite tokens |
| `app/(auth)/login/login.stories.tsx` | Fix WithAuthError play (findByText) |
| `app/(auth)/signup/page.tsx` | Button, graphite tokens |
| `app/(auth)/forgot-password/page.tsx` | Button, graphite tokens |
| `app/(auth)/reset-password/page.tsx` | Button, graphite tokens |
| `app/(auth)/signup/check-email/page.tsx` | Graphite tokens only (no button) |

## Changes

### Token substitution (all pages)

| Old class | New class | Reason |
|-----------|-----------|--------|
| `bg-neutral-50` | `bg-graphite-50` | Design system token |
| `border-neutral-200` | `border-graphite-200` | Design system token |
| `border-neutral-300` | `border-graphite-300` | Design system token |
| `text-neutral-900` | `text-graphite-900` | Design system token |
| `text-neutral-700` | `text-graphite-700` | Design system token |
| `text-neutral-500` | `text-graphite-500` | Design system token |
| `focus:border-neutral-900` | `focus:border-blue-600` | Primary action color, matches Button |
| `focus:ring-neutral-900` | `focus:ring-blue-600` | Consistent focus indicator |
| `text-neutral-900 hover:underline` (links) | `text-graphite-900 hover:underline` | Design system token |

### Submit button replacement (login, signup, forgot-password, reset-password)

```tsx
// Before
<button
  type="submit"
  disabled={isPending}
  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {isPending ? 'Ingresando…' : 'Iniciar sesión'}
</button>

// After — add to imports: import { Button } from '@/components/ui'
<Button
  type="submit"
  variant="primary"
  size="md"
  disabled={isPending}
  className="w-full"
>
  {isPending ? 'Ingresando…' : 'Iniciar sesión'}
</Button>
```

Apply same pattern to: signup ("Creando cuenta…" / "Crear cuenta"), forgot-password ("Enviando…" / "Enviar enlace"), reset-password ("Guardando…" / "Guardar contraseña").

### Login story — WithAuthError fix

```tsx
// Before (login.stories.tsx line 51)
play: async ({ canvasElement }) => {
  const c = within(canvasElement)
  await expect(
    c.getByText('El enlace de verificación ha expirado.')
  ).toBeInTheDocument()
},

// After — use findByText (async, retries until Suspense resolves)
play: async ({ canvasElement }) => {
  const c = within(canvasElement)
  await expect(
    await c.findByText('El enlace de verificación ha expirado.')
  ).toBeInTheDocument()
},
```

`findByText` retries with a timeout until the element appears, allowing `useSearchParams()` inside `<Suspense>` to render after the boundary flushes.

## Design Rationale
Keeping `<Button>` centralizes hover/focus/disabled styles and `data-component="button"` attribute. Individual pages no longer need to duplicate `disabled:opacity-50 disabled:cursor-not-allowed transition-colors` — that's inside Button.

## Dependencies
T1 (auth layout must be done first so the page context is correct during testing).

## Done When
- [ ] No `neutral-*` classes remain in any of the 6 files
- [ ] All submit buttons render `data-component="button"` in the DOM
- [ ] `WithAuthError` Storybook story passes
- [ ] `npm run test` green (unit tests unchanged)
- [ ] `npm run build` clean
