'use client'

import { useEffect } from 'react'
import { errorHandler } from '@/utils/errorHandling'

/**
 * Error boundary for the travel section.
 * Catches errors in travel routes and provides a contextual recovery UI.
 */
export default function TravelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to our error handling system
    errorHandler.handleError(error, 'travel-error-boundary')

    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          errorBoundary: 'travel',
          section: 'travel'
        },
        extra: { digest: error.digest }
      })
    }
  }, [error])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-4">
          Travel Section Error
        </h2>
        <p className="text-red-700 dark:text-red-300 mb-4">
          {error.message || 'An error occurred while loading your travel data.'}
        </p>
        {error.digest && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            Error ID: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === 'development' && error.stack && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-red-800 dark:text-red-200">
              Stack Trace (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-red-700 dark:text-red-300 overflow-auto p-2 bg-red-100 dark:bg-red-900/20 rounded">
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => reset()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
