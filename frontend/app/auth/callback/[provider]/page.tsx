"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { OAuthCallback } from '@/components/auth/OAuthCallback'
import { useSession } from 'next-auth/react'

export const dynamic = 'force-dynamic'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const routeParams = useParams<{ provider: string }>()
  const { data: session, status } = useSession()
  const [handled, setHandled] = useState(false)

  const isLoading = status === 'loading'
  const user = session?.user

  useEffect(() => {
    if (handled) return

    const handleAuthCallback = async () => {
      try {
        // Handle email integration callbacks (path-based provider)
        const code = params?.get('code')
        const state = params?.get('state')
        const provider = (routeParams?.provider || '').toLowerCase()

        if (code && user && (provider === 'gmail' || provider === 'office365')) {
          try {
            const apiPath = provider === 'gmail' ? '/api/gmail/callback' : '/api/office365/callback'
            const response = await fetch(apiPath, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code, state })
            })
            if (response.ok) {
              router.replace(`/integrations?success=${provider}_connected`)
            } else {
              router.replace(`/integrations?error=${provider}_connection_failed`)
            }
          } catch (error) {
            console.error('Integration callback error:', error)
            router.replace('/integrations?error=integration_failed')
          }
        } else if (status === 'authenticated') {
          // User is authenticated, redirect to dashboard
          router.replace('/dashboard')
        } else if (status === 'unauthenticated' && !code) {
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
  }, [handled, router, params, routeParams, user, session, status])

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Processing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackProviderPage() {
  return (
    <Suspense fallback={<OAuthCallback />}>
      <CallbackHandler />
    </Suspense>
  )
}

