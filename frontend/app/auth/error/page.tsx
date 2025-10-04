'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    OAuthSignin: 'Error occurred during OAuth sign in. Please try again.',
    OAuthCallback: 'Error occurred during OAuth callback. Please try again.',
    OAuthCreateAccount: 'Could not create OAuth provider account.',
    EmailCreateAccount: 'Could not create email provider account.',
    Callback: 'Error occurred during callback. Please try again.',
    OAuthAccountNotLinked: 'This email is already associated with another account. Please sign in with your original method.',
    EmailSignin: 'Check your email for a sign in link.',
    CredentialsSignin: 'Sign in failed. Check the details you provided are correct.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An error occurred during authentication.',
  }

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="max-w-md w-full">
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Authentication Error</h2>
            <p className="mt-2 text-sm text-text-secondary">{errorMessage}</p>
          </div>

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => window.location.href = '/auth/signin'}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              Go Home
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-bg-secondary rounded-md">
              <p className="text-xs text-text-tertiary">Error code: {error}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
