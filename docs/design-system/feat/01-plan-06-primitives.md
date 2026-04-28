# T6: Author primitives — Button, Card, Chip, Well, Banner

## Scope

- `src/components/ui/button.tsx` — Server Component
- `src/components/ui/card.tsx` — exports `Card`, `CardHead`, `CardBody`
- `src/components/ui/chip.tsx` — Server Component
- `src/components/ui/well.tsx` — Server Component
- `src/components/ui/banner.tsx` — Server Component
- `src/components/ui/index.ts` — barrel

## Changes

### `Button`

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-white text-graphite-800 border border-graphite-300 hover:bg-graphite-100',
  ghost:     'bg-transparent text-graphite-700 hover:bg-graphite-100',
  success:   'bg-green-600 text-white hover:bg-green-700',
};
const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-[18px] py-2.5 text-[14px]',
  lg: 'px-[22px] py-[13px] text-[15px]',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Variant; size?: Size;
  leadingIcon?: IconName; trailingIcon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leadingIcon, trailingIcon, className = '', children, ...rest },
  ref
) {
  return (
    <button ref={ref} data-component="button"
      className={`inline-flex items-center gap-2 font-semibold leading-none rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}>
      {leadingIcon && <Icon name={leadingIcon} size={size === 'lg' ? 18 : 16} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={size === 'lg' ? 18 : 16} />}
    </button>
  );
});
```

`Omit<..., 'style'>` enforces RN-005 (no style overrides).

### `Card` + `CardHead` + `CardBody`

Three exports. Each carries `data-component` for selector targeting (REQ-012).

- `Card` root: `bg-white border border-[var(--border-hairline)] rounded-lg shadow-[var(--shadow-sm)]` — passes `className`.
- `CardHead`: `flex items-center justify-between px-6 py-5 border-b border-[var(--border-hairline)]`. Optional `<h3>` title (`font-semibold text-[20px] tracking-[-0.01em]`) + optional `actions` slot.
- `CardBody`: `p-6`.

Props:
```tsx
export interface CardProps { className?: string; children: React.ReactNode; }
export interface CardHeadProps { title?: string; sub?: string; actions?: React.ReactNode; className?: string; children?: React.ReactNode; }
export interface CardBodyProps { className?: string; children: React.ReactNode; }
```

### `Chip`

```tsx
type Variant = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'gray';
const CHIP: Record<Variant, string> = {
  green:'bg-green-50 text-green-700', amber:'bg-amber-50 text-amber-700',
  red:'bg-red-50 text-red-700',       blue:'bg-blue-50 text-blue-700',
  violet:'bg-tint-violet text-[#6d28d9]', gray:'bg-graphite-100 text-graphite-700',
};
const DOT: Record<Variant, string> = {
  green:'bg-green-500', amber:'bg-amber-500', red:'bg-red-500',
  blue:'bg-blue-600',   violet:'bg-[#7c3aed]', gray:'bg-graphite-500',
};
export interface ChipProps { variant: Variant; dot?: boolean; className?: string; children: React.ReactNode; }
export function Chip({ variant, dot = true, className = '', children }: ChipProps) {
  return (
    <span data-component="chip"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${CHIP[variant]} ${className}`}>
      {dot && <span className={`w-2 h-2 rounded-full ${DOT[variant]}`} aria-hidden />}
      {children}
    </span>
  );
}
```

### `Well`

```tsx
type Tint = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'sky';
const TINT: Record<Tint, string> = {
  blue:'bg-tint-blue [&_svg]:stroke-blue-600',
  green:'bg-tint-green [&_svg]:stroke-green-600',
  amber:'bg-tint-amber [&_svg]:stroke-amber-700',
  red:'bg-tint-red [&_svg]:stroke-red-700',
  violet:'bg-tint-violet [&_svg]:stroke-[#6d28d9]',
  sky:'bg-tint-sky [&_svg]:stroke-[#0369a1]',
};
export interface WellProps { tint: Tint; size?: number; className?: string; children: React.ReactNode; }
export function Well({ tint, size = 42, className = '', children }: WellProps) {
  return (
    <span data-component="well" style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full ${TINT[tint]} ${className}`}>
      {children}
    </span>
  );
}
```

`style` here is internal (size only); never exposed via props.

### `Banner`

Variant-locked to `info` for v1 (the bundle's `app.css:339-349` defines only `banner-info`).

```tsx
import { Icon, type IconName } from './icon';
export interface BannerProps { variant?: 'info'; icon?: IconName; className?: string; children: React.ReactNode; }
export function Banner({ icon, className = '', children }: BannerProps) {
  return (
    <div data-component="banner"
      className={`flex gap-3 items-start px-[18px] py-3.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-[13px] ${className}`}>
      {icon && <Icon name={icon} size={18} className="flex-none stroke-blue-600" />}
      <div>{children}</div>
    </div>
  );
}
```

### Barrel `src/components/ui/index.ts`

```ts
export { Button, type ButtonProps } from './button';
export { Card, CardHead, CardBody, type CardProps, type CardHeadProps, type CardBodyProps } from './card';
export { Chip, type ChipProps } from './chip';
export { Well, type WellProps } from './well';
export { Banner, type BannerProps } from './banner';
export { Icon, type IconName, type IconProps } from './icon';
```

### Design Rationale (RN-005, REQ-006, REQ-010)

- Layout-agnostic: `className` for consumer utilities; no `style` overrides for token values (Button explicitly omits `style` via `Omit`).
- Variants are typed string-literal unions; adding one requires editing both the type and the class map → drift impossible.
- `data-component` attributes are the test selectors used by REQ-012's smoke test.
- All five are Server Components (no `'use client'`); composable inside any RSC tree without bundle-size cost.

## Dependencies

Requires T4 (Tailwind utilities) and T5 (`Icon` for Button leading/trailing, Banner icon, Well child).

## Done When

- [ ] All 5 primitive files exist with the prop shapes above
- [ ] `src/components/ui/index.ts` re-exports all five plus `Icon` and `IconName`
- [ ] Each primitive root carries `data-component="<name>"`
- [ ] No primitive file contains `'use client'` (NFR-05)
- [ ] No primitive accepts a `style` prop bypassing tokens
- [ ] `npm run typecheck && npm run lint` exit 0
- [ ] In a hand-written test page, all 5 primitives render without errors
- [ ] TypeScript fails on `<Button variant="purple">` (variant out of union)
- [ ] TypeScript fails on `<Button style={{color:"red"}}>` (style omitted from props)
