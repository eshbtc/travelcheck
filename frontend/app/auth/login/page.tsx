import React from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">Sign in to your account</h2>
          <p className="mt-2 text-text-secondary">Access your travel history and reports</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}


