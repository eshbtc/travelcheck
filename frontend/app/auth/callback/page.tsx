"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OAuthCallback } from '@/components/auth/OAuthCallback'
import { useAuth } from '@/contexts/AuthContext'
import { handleGmailCallback, handleOffice365Callback } from '@/services/firebaseFunctions'
import { toast } from 'react-hot-toast'

export const dynamic = 'force-dynamic'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, isLoading } = useAuth()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return
    if (isLoading) return
    if (!user) return

    const code = params?.get('code') || null
    const state = params?.get('state') || ''
    const provider = params?.get('provider') || null // optional

    const finish = (ok: boolean, prov: string) => {
      setHandled(true)
      if (ok) {
        toast.success(`${prov} connected successfully`)
        router.replace('/integrations')
      } else {
        toast.error('OAuth callback failed')
        router.replace('/integrations')
      }
    }

    const run = async () => {
      if (!code) {
        finish(false, provider || 'OAuth')
        return
      }
      try {
        if (!provider || provider === 'gmail') {
          await handleGmailCallback(code as string, state)
          finish(true, 'Gmail')
          return
        }
      } catch (_) {
        // fall through to try Office365
      }
      try {
        await handleOffice365Callback(code as string, state)
        finish(true, 'Office 365')
      } catch (e) {
        finish(false, provider || 'OAuth')
      }
    }

    void run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handled, isLoading, user])

  return <OAuthCallback />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallback />}>
      <CallbackHandler />
    </Suspense>
  )
}


