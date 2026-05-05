'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/app/(auth)/actions'
import { Button } from '@/components/ui'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await signup(email, password)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/signup/check-email')
      }
    })
  }

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-graphite-900 mb-6">Crear cuenta</h2>
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
            autoComplete="new-password"
            required
            minLength={8}
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
          {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-graphite-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-graphite-900 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
