"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { OAuthCallback } from '@/components/auth/OAuthCallback'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const routeParams = useParams<{ provider: string }>()
  const { user, session, isLoading } = useAuth()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return

    const handleAuthCallback = async () => {
      try {
        // Check if this is a Supabase OAuth callback (has access_token in URL hash)
        const urlParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = urlParams.get('access_token')

        if (accessToken) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            let attempts = 0
            const maxAttempts = 10
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500))
              if (user && !isLoading) {
                window.history.replaceState({}, document.title, '/dashboard')
                router.replace('/dashboard')
                return
              }
              attempts++
            }
            window.history.replaceState({}, document.title, '/dashboard')
            router.replace('/dashboard')
            return
          } else {
            router.replace('/auth/login?error=oauth_callback_failed')
            return
          }
        }

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
                'Authorization': `Bearer ${session?.access_token}`
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
        } else if (!code) {
          router.replace('/auth/login')
        }
      } catch (error) {
        console.error('Callback handler error:', error)
        router.replace('/auth/login?error=callback_failed')
      } finally {
        setHandled(true)
      }
    }

    handleAuthCallback()
  }, [handled, router, params, routeParams, user, session, isLoading])

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

