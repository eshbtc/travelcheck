"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OAuthCallback } from '@/components/auth/OAuthCallback'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, session } = useAuth()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return

    const handleAuthCallback = async () => {
      try {
        // Check if this is a Supabase OAuth callback
        const hashFragment = window.location.hash
        if (hashFragment) {
          // For newer versions of Supabase, the session is automatically handled
          // Just redirect to dashboard if we have a session
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            // Successful OAuth login, redirect to dashboard
            router.replace('/dashboard')
            return
          } else {
            // No session found, redirect to login with error
            router.replace('/auth/login?error=oauth_callback_failed')
            return
          }
        }

        // Handle email integration callbacks (Gmail/Office365)
        const code = params?.get('code')
        const state = params?.get('state')
        const provider = params?.get('provider')

        if (code && user) {
          // This is an email integration callback
          try {
            if (provider === 'gmail') {
              // Call Gmail integration API
              const response = await fetch('/api/gmail/callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`
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
                  'Authorization': `Bearer ${session?.access_token}`
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
        } else if (!code && !hashFragment) {
          // No callback parameters, redirect to login
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
  }, [handled, router, params, user, session])

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


