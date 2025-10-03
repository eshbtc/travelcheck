'use client'

import { useState } from 'react'

/**
 * Test page for error boundaries.
 * This page intentionally throws errors to verify error boundary functionality.
 *
 * USAGE:
 * 1. Navigate to /debug-mock/error-test
 * 2. Click buttons to test different error scenarios
 * 3. Verify error boundaries catch and display errors correctly
 * 4. Check browser console for error logging
 * 5. Check Sentry dashboard for error reports (production only)
 */
export default function ErrorTestPage() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error('Test error from render phase - This should be caught by the error boundary!')
  }

  const throwSyncError = () => {
    throw new Error('Test synchronous error - This should be caught by the error boundary!')
  }

  const throwAsyncError = async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    throw new Error('Test async error - This should be caught by the error boundary!')
  }

  const throwEventHandlerError = () => {
    // Event handler errors need to be wrapped in a state update to be caught by error boundaries
    setShouldThrow(true)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Error Boundary Test Page</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          This page is used to test error boundary functionality. Click any button to trigger an error.
        </p>
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Warning: These buttons will intentionally crash this page to test error recovery.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Test 1: Render Error</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Throws an error during component render. This should be caught by the nearest error boundary.
          </p>
          <button
            onClick={throwEventHandlerError}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Throw Render Error
          </button>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Test 2: Synchronous Error</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Throws a synchronous error in a click handler. May not be caught by error boundary.
          </p>
          <button
            onClick={throwSyncError}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Throw Sync Error
          </button>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Test 3: Async Error</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Throws an async error. This will NOT be caught by error boundary and will show in console.
          </p>
          <button
            onClick={throwAsyncError}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Throw Async Error
          </button>
        </div>

        <div className="border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
            Expected Results
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-green-800 dark:text-green-200">
            <li>
              <strong>Render Error:</strong> Should trigger the travel section error boundary (/travel/error.tsx)
            </li>
            <li>
              <strong>Sync Error:</strong> May crash without being caught (React limitation)
            </li>
            <li>
              <strong>Async Error:</strong> Will appear in console but not trigger error boundary
            </li>
            <li>
              <strong>All errors:</strong> Should be logged to Sentry (if configured) and console
            </li>
          </ul>
        </div>

        <div className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to Verify
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>Open browser DevTools (F12) and go to Console tab</li>
            <li>Click &quot;Throw Render Error&quot; button</li>
            <li>Verify error boundary UI appears with &quot;Try again&quot; and &quot;Go to dashboard&quot; buttons</li>
            <li>Check console for error log entry</li>
            <li>Click &quot;Try again&quot; to reset the error boundary</li>
            <li>If Sentry is configured, check Sentry dashboard for error report</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
