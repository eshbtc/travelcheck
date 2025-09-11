'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export function RegisterForm() {
  const { register, loginWithGoogle, isLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await register(email, password, fullName)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogle = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await loginWithGoogle()
      // Redirect handled by AuthProvider
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed')
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-semibold text-text-primary">Create your account</h3>
        <p className="text-sm text-text-secondary mt-1">Start tracking your travel history</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onRegister} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-text-secondary">Full name</label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="Jane Doe"
          />
        </div>
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
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-text-secondary">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {submitting ? 'Creating account…' : 'Create account'}
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
        onClick={onGoogle}
        disabled={submitting || isLoading}
      >
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <a href="/auth/login" className="text-brand-primary hover:underline">Sign in</a>
      </p>
    </Card>
  )
}
