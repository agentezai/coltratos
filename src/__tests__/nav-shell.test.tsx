// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard/procesos'),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    <img src={src} alt={alt} />,
}))

vi.mock('next/link', () => ({
  default: ({
    href, children, className,
    'data-nav-item': dataNavItem,
    'data-active': dataActive,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    'data-nav-item'?: string
    'data-active'?: string
  }) => (
    <a href={href} className={className} data-nav-item={dataNavItem} data-active={dataActive}>
      {children}
    </a>
  ),
}))

const { Sidebar } = await import('../../src/components/shell/sidebar')

describe('Nav shell — T1 (REQ-019, REQ-020)', () => {
  it('Procesos nav item is active when on /dashboard/procesos', () => {
    const { container } = render(<Sidebar />)
    const links = Array.from(container.querySelectorAll('a[data-nav-item]'))
    const procesos = links.find(l => l.textContent?.includes('Procesos'))
    expect(procesos?.getAttribute('data-active')).toBe('true')
  })

  it('Dashboard nav item is not active when on /dashboard/procesos', () => {
    const { container } = render(<Sidebar />)
    const links = Array.from(container.querySelectorAll('a[data-nav-item]'))
    const dashboard = links.find(l => l.textContent?.includes('Dashboard'))
    expect(dashboard?.getAttribute('data-active')).not.toBe('true')
  })

  it('collapsed sidebar hides nav labels', () => {
    const { container } = render(<Sidebar collapsed={true} />)
    const spans = Array.from(container.querySelectorAll('span'))
    const navLabels = spans.filter(s =>
      ['Dashboard', 'Procesos', 'Mis análisis', 'Alertas', 'Créditos', 'Mi equipo', 'Configuración', 'Subir pliego'].includes(s.textContent ?? '')
    )
    expect(navLabels).toHaveLength(0)
    expect(container.querySelector('[data-sidebar-user-info]')).toBeNull()
  })
})
