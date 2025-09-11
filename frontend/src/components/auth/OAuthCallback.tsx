'use client'

import React from 'react'

export function OAuthCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary">Processing authentication...</h2>
        <p className="text-text-secondary mt-2">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  )
}
