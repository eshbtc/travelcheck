import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../contexts/AuthContext'
import { handleGmailCallback } from '../../../services/firebaseFunctions'
import { toast } from 'react-hot-toast'

export default function GmailOAuthCallbackPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing Gmail OAuth callback...')

  useEffect(() => {
    const processCallback = async () => {
      if (isLoading || !user) return

      try {
        const { code, state, error } = router.query

        if (error) {
          setStatus('error')
          setMessage('Gmail authorization was denied or failed')
          toast.error('Gmail authorization failed')
          return
        }

        if (!code || !state) {
          setStatus('error')
          setMessage('Invalid Gmail OAuth callback parameters')
          toast.error('Invalid Gmail OAuth callback')
          return
        }

        // Handle the Gmail OAuth callback
        const result = await handleGmailCallback(code as string, state as string)
        
        if (result.success) {
          setStatus('success')
          setMessage('Gmail account connected successfully!')
          toast.success('Gmail account connected successfully!')
          
          // Redirect to Gmail integration page after 2 seconds
          setTimeout(() => {
            router.push('/email/gmail')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('Failed to connect Gmail account')
          toast.error('Failed to connect Gmail account')
        }
      } catch (err: any) {
        console.error('Gmail OAuth callback error:', err)
        setStatus('error')
        setMessage(err.message || 'An error occurred during Gmail OAuth callback')
        toast.error('Gmail OAuth callback failed')
      }
    }

    processCallback()
  }, [router.query, user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing Gmail Connection...</h2>
            <p className="mt-2 text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="rounded-full h-12 w-12 bg-green-100 mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Gmail Connected!</h2>
            <p className="mt-2 text-gray-600">{message}</p>
            <p className="mt-2 text-sm text-gray-500">Redirecting to Gmail integration...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Connection Failed</h2>
            <p className="mt-2 text-gray-600">{message}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/email/gmail')}
                className="w-full bg-brand-primary text-white py-2 px-4 rounded-md hover:bg-brand-primary/90 transition-colors"
              >
                Return to Gmail Integration
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
