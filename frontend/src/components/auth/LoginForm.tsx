'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export function LoginForm() {
  const { login, loginWithGoogle, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogleLogin = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await loginWithGoogle()
      // Redirect will occur via AuthProvider or after popup
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed')
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-semibold text-text-primary">Welcome back</h3>
        <p className="text-sm text-text-secondary mt-1">Sign in to continue</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onEmailPasswordLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Password</label>
            <a href="/auth/forgot" className="text-xs text-brand-primary hover:underline">Forgot password?</a>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={submitting || isLoading}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="my-6 flex items-center">
        <div className="h-px flex-1 bg-border-light" />
        <span className="px-3 text-xs text-text-tertiary">or</span>
        <div className="h-px flex-1 bg-border-light" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogleLogin}
        disabled={submitting || isLoading}
      >
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <a href="/auth/register" className="text-brand-primary hover:underline">Create one</a>
      </p>
    </Card>
  )
}
