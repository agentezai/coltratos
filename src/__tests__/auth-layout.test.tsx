// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [k: string]: unknown }) =>
    <img src={src} alt={alt} {...(props as object)} />,
}))

const { default: AuthLayout } = await import('../../app/(auth)/layout')

describe('Auth Layout — T1 (REQ-001)', () => {
  it('renders coltratos-lockup.svg and no text logo', () => {
    const { container } = render(<AuthLayout><div>child</div></AuthLayout>)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img!.getAttribute('src')).toContain('coltratos-lockup.svg')
    expect(container.querySelector('span')).toBeNull()
  })

  it('uses bg-graphite-50, not bg-neutral-50', () => {
    const { container } = render(<AuthLayout><div /></AuthLayout>)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-graphite-50')
    expect(outer.className).not.toContain('bg-neutral-50')
  })
})
