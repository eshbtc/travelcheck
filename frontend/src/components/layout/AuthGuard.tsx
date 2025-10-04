"use client"

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession(); const user = session?.user; const isLoading = status === "loading"
  const router = useRouter()
  const pathname = usePathname()

  // Development mode - allow unauthenticated access
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  useEffect(() => {
    if (!isDevelopment && !isLoading && !user) {
      // Preserve intent to return if needed later via search param
      const redirectTo = encodeURIComponent(pathname || '/')
      router.replace(`/auth/signin?callbackUrl=${redirectTo}`)
    }
  }, [isLoading, user, router, pathname, isDevelopment])

  if (isLoading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading your session…</p>
        </div>
      </div>
    )
  }

  if (!isDevelopment && !user) return null
  return <>{children}</>
}

