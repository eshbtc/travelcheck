'use client'

import { useEffect } from 'react'
import { errorHandler } from '@/utils/errorHandling'

/**
 * Global error boundary for the entire application.
 * This catches errors in the root layout and provides a fallback UI.
 *
 * Next.js requires global-error.tsx to be a client component and include
 * <html> and <body> tags since it replaces the root layout when active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to our error handling system
    errorHandler.handleError(error, 'global-error-boundary')

    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { errorBoundary: 'global' },
        extra: { digest: error.digest }
      })
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-4 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Something went wrong!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                An unexpected error occurred. Our team has been notified and we&apos;re working to fix it.
              </p>
              {error.digest && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  Error ID: {error.digest}
                </p>
              )}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-left mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => reset()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Go to home page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
