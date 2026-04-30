import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { within, expect } from 'storybook/test'
import SignupPage from './page'

const meta = {
  title: 'Auth/Signup',
  component: SignupPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/signup',
      },
    },
    docs: {
      description: {
        component:
          'Registration page for new empresa users. On success, redirects to ' +
          '/signup/check-email (static page) so the confirmation message survives a refresh.',
      },
    },
  },
} satisfies Meta<typeof SignupPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByLabelText('Correo electrónico')).toBeInTheDocument()
    await expect(c.getByLabelText('Contraseña')).toBeInTheDocument()
    await expect(c.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
  },
}
