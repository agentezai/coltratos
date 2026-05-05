'use client'

import { useState, useTransition } from 'react'
import { updatePassword } from '@/app/(auth)/actions'
import { Button } from '@/components/ui'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updatePassword(password)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-graphite-900 mb-6">Nueva contraseña</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-graphite-700">
            Nueva contraseña
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
        <div className="flex flex-col gap-1">
          <label htmlFor="confirm" className="text-sm font-medium text-graphite-700">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  )
}
