// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/app/(auth)/actions', () => ({
  login: vi.fn(),
  signup: vi.fn(),
  forgotPassword: vi.fn(),
  updatePassword: vi.fn(),
}))

const { default: LoginPage } = await import('../../app/(auth)/login/page')
const { default: SignupPage } = await import('../../app/(auth)/signup/page')
const { default: ForgotPasswordPage } = await import('../../app/(auth)/forgot-password/page')
const { default: ResetPasswordPage } = await import('../../app/(auth)/reset-password/page')

const ROOT = process.cwd()
const AUTH_FILES = [
  'app/(auth)/login/page.tsx',
  'app/(auth)/signup/page.tsx',
  'app/(auth)/forgot-password/page.tsx',
  'app/(auth)/reset-password/page.tsx',
  'app/(auth)/signup/check-email/page.tsx',
  'app/(auth)/layout.tsx',
]

describe('Auth Form Theme — T2 (REQ-002, REQ-003, REQ-004, NFR-01)', () => {
  it('login submit uses Button (data-component="button")', () => {
    const { container } = render(<LoginPage />)
    expect(container.querySelector('[data-component="button"][type="submit"]')).toBeTruthy()
  })

  it('signup submit uses Button', () => {
    const { container } = render(<SignupPage />)
    expect(container.querySelector('[data-component="button"][type="submit"]')).toBeTruthy()
  })

  it('forgot-password submit uses Button', () => {
    const { container } = render(<ForgotPasswordPage />)
    expect(container.querySelector('[data-component="button"][type="submit"]')).toBeTruthy()
  })

  it('reset-password submit uses Button', () => {
    const { container } = render(<ResetPasswordPage />)
    expect(container.querySelector('[data-component="button"][type="submit"]')).toBeTruthy()
  })

  it('no neutral-* class remains in any auth file (NFR-01)', () => {
    const matches: string[] = []
    for (const rel of AUTH_FILES) {
      const content = readFileSync(join(ROOT, rel), 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        if (/neutral-/.test(line)) {
          matches.push(`${rel}:${i + 1}: ${line.trim()}`)
        }
      })
    }
    expect(matches).toEqual([])
  })
})
