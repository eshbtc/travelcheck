"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OAuthCallback } from '@/components/auth/OAuthCallback'
import { useSession } from 'next-auth/react'

export const dynamic = 'force-dynamic'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: session, status } = useSession()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return

    const handleAuthCallback = async () => {
      try {
        // Handle email integration callbacks (Gmail/Office365)
        const code = params?.get('code')
        const state = params?.get('state')
        // Support provider via query (?provider=...) or path (/auth/callback/<provider>)
        let provider = params?.get('provider') as string | null
        if (!provider && typeof window !== 'undefined') {
          const match = window.location.pathname.match(/\/auth\/callback\/(gmail|office365)$/)
          provider = match ? match[1] : null
        }

        if (code && session) {
          // This is an email integration callback
          try {
            if (provider === 'gmail') {
              // Call Gmail integration API
              const response = await fetch('/api/gmail/callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, state })
              })

              if (response.ok) {
                router.replace('/integrations?success=gmail_connected')
              } else {
                router.replace('/integrations?error=gmail_connection_failed')
              }
            } else if (provider === 'office365') {
              // Call Office365 integration API
              const response = await fetch('/api/office365/callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, state })
              })

              if (response.ok) {
                router.replace('/integrations?success=office365_connected')
              } else {
                router.replace('/integrations?error=office365_connection_failed')
              }
            }
          } catch (error) {
            console.error('Integration callback error:', error)
            router.replace('/integrations?error=integration_failed')
          }
        } else if (status === 'authenticated') {
          // User is authenticated via NextAuth, redirect to dashboard
          router.push('/dashboard')
        } else if (status === 'unauthenticated' && !code) {
          // No callback parameters and not authenticated, redirect to login
          router.replace('/auth/login')
        }
      } catch (error) {
        console.error('Callback handler error:', error)
        router.replace('/auth/login?error=callback_failed')
      } finally {
        setHandled(true)
      }
    }

    if (status !== 'loading') {
      handleAuthCallback()
    }
  }, [handled, router, params, session, status])

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Processing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallback />}>
      <CallbackHandler />
    </Suspense>
  )
}

