import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { within, expect } from 'storybook/test'
import LoginPage from './page'

const meta = {
  title: 'Auth/Login',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/login',
      },
    },
    docs: {
      description: {
        component:
          'Login page for returning empresa users. Displays an inline banner when ' +
          'an `error` query param is present (e.g. expired verification link from /auth/confirm).',
      },
    },
  },
} satisfies Meta<typeof LoginPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByLabelText('Correo electrónico')).toBeInTheDocument()
    await expect(c.getByLabelText('Contraseña')).toBeInTheDocument()
    await expect(c.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  },
}

export const WithAuthError: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/login',
        query: { error: 'El enlace de verificación ha expirado.' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(
      await c.findByText('El enlace de verificación ha expirado.')
    ).toBeInTheDocument()
  },
}

export const WithRedirectTo: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/login',
        searchParams: new URLSearchParams({ redirectTo: '/dashboard' }),
      },
    },
  },
}
