'use client'

import React from 'react'
import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#202124',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#00C853',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#EA4335',
            secondary: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#20BEFF',
            secondary: '#fff',
          },
        },
      }}
    />
  )
}
