import Image from 'next/image'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-50">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo/coltratos-lockup.svg"
            alt="Coltratos"
            width={140}
            height={32}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  )
}
