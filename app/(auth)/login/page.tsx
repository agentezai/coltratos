'use client'

import { useState, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { login } from '@/app/(auth)/actions'
import { Button } from '@/components/ui'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? undefined
  const authError = searchParams.get('error')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await login(email, password, redirectTo)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-graphite-900 mb-6">Iniciar sesión</h2>
      {authError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {authError}
        </div>
      )}
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
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-graphite-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-graphite-300 px-3 py-2 text-sm text-graphite-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-1 text-sm text-graphite-500">
        <Link href="/forgot-password" className="hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <span>
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="font-medium text-graphite-900 hover:underline">
            Crear cuenta
          </Link>
        </span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm h-64 animate-pulse" />}>
      <LoginForm />
    </Suspense>
  )
}
