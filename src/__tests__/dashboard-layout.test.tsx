// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [k: string]: unknown }) =>
    <img src={src} alt={alt} {...(props as object)} />,
}))

vi.mock('@/components/shell', () => ({
  Sidebar: () => <aside data-component="sidebar" />,
  Topbar: () => <header data-component="topbar" />,
}))

const { default: DashboardLayout } = await import('../../app/dashboard/layout')

describe('Dashboard Layout — T3 (REQ-006)', () => {
  it('renders sidebar data-component', () => {
    const { container } = render(<DashboardLayout><div>content</div></DashboardLayout>)
    expect(container.querySelector('[data-component="sidebar"]')).toBeTruthy()
  })

  it('renders topbar header element', () => {
    const { container } = render(<DashboardLayout><div>content</div></DashboardLayout>)
    expect(container.querySelector('header')).toBeTruthy()
  })

  it('renders children inside main', () => {
    const { container } = render(<DashboardLayout><div id="child">content</div></DashboardLayout>)
    expect(container.querySelector('main #child')).toBeTruthy()
  })
})
