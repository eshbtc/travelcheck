import React from 'react'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">Create your account</h2>
          <p className="mt-2 text-text-secondary">Start tracking your travel history</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}


