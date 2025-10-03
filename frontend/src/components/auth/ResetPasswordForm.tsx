'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Get the reset token from URL params
    const resetToken = searchParams?.get('token')
    if (resetToken) {
      setToken(resetToken)
    }
  }, [searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password')
      }

      setSuccess(true)

      // Redirect to login page after a brief delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)

    } catch (err: any) {
      setError(err?.message || 'Failed to update password')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Password updated successfully! Redirecting to sign in...
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-semibold text-text-primary">Set new password</h3>
        <p className="text-sm text-text-secondary mt-1">Enter your new password below</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="••••••••"
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="••••••••"
            minLength={6}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? 'Updating password…' : 'Update password'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Remember your password?{' '}
        <a href="/auth/login" className="text-brand-primary hover:underline">Return to sign in</a>
      </p>
    </Card>
  )
}