# T10: Placeholder pages

## Scope

| File | Change |
|------|--------|
| `app/dashboard/alertas/page.tsx` | New — placeholder |
| `app/dashboard/config/page.tsx` | New — placeholder |
| `src/components/page/placeholder.tsx` | New — reusable placeholder component |

## Changes

### `PlaceholderPage` component

```tsx
interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon: IconName;
}

export function PlaceholderPage({ title, subtitle, icon }: PlaceholderPageProps) {
  return (
    <div className="p-10">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-white border border-dashed border-graphite-300 rounded-xl p-20 text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-blue-50 items-center justify-center text-blue-600 mb-4">
          <Icon name={icon} size={24} />
        </div>
        <div className="text-base font-semibold mb-2">Módulo en fase 2</div>
        <p className="text-sm text-graphite-500 max-w-sm mx-auto">{subtitle}</p>
      </div>
    </div>
  );
}
```

### Alertas page

```tsx
import { PlaceholderPage } from "@/components/page";
export default function AlertasPage() {
  return <PlaceholderPage title="Alertas" subtitle="Configura alertas automáticas por SECOP II según CIIU, región y rango de monto." icon="bell"/>;
}
```

### Config page

```tsx
export default function ConfigPage() {
  return <PlaceholderPage title="Configuración" subtitle="Cuenta, notificaciones, facturación e integraciones." icon="settings"/>;
}
```

## Design Rationale

Both pages are pure RSC. `PlaceholderPage` is extracted as a component since 2+ pages use the same pattern.

## Dependencies

T1 (nav routing), T2 (PageHeader already extracted).

## Done When

- [ ] `/dashboard/alertas` renders placeholder card with bell icon
- [ ] `/dashboard/config` renders placeholder card with settings icon
- [ ] Both pages are reachable from sidebar nav items
- [ ] `PlaceholderPage` exported from `src/components/page/index.ts`
- [ ] `npm run build` no type errors
