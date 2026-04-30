'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/(auth)/actions'
import { Button } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await forgotPassword(email)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm text-center">
        <p className="text-graphite-700 font-medium">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-graphite-900 hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-graphite-900 mb-2">Restablecer contraseña</h2>
      <p className="text-sm text-graphite-500 mb-6">
        Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-graphite-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-graphite-300 px-3 py-2 text-sm text-graphite-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-graphite-500">
        <Link href="/login" className="font-medium text-graphite-900 hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
