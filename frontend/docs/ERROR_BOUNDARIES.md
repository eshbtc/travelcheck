# Error Boundary Implementation

This document describes the error boundary implementation for the Travel History Tracker application.

## Overview

Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of crashing the entire application.

## Architecture

### Global Error Boundary
- **File**: `/app/global-error.tsx`
- **Scope**: Catches errors in the root layout
- **Purpose**: Last resort error handler for catastrophic failures
- **Integrations**: Sentry error reporting, ErrorHandler utility

### Route-Level Error Boundaries
Error boundaries are implemented at key route segments to provide contextual error handling:

1. **Travel Section** (`/app/(shell)/travel/error.tsx`)
   - Catches errors in: Evidence, Timeline, Calendar, Map views
   - Recovery: Offers return to dashboard or retry

2. **Dashboard** (`/app/(shell)/dashboard/error.tsx`)
   - Catches errors in: Dashboard overview
   - Recovery: Offers return to home or retry

3. **Reports** (`/app/(shell)/reports/error.tsx`)
   - Catches errors in: Report generation and history
   - Recovery: Offers return to dashboard or retry

## Error Handling Flow

```
User Action → Error Thrown
    ↓
Route Error Boundary (if exists)
    ↓ (not caught)
Global Error Boundary
    ↓
1. Log to ErrorHandler
2. Report to Sentry (production)
3. Display fallback UI
4. Offer recovery options
```

## Integration with ErrorHandler

All error boundaries integrate with the existing `ErrorHandler` utility:

```typescript
import { errorHandler } from '@/utils/errorHandling'

errorHandler.handleError(error, 'error-boundary-name')
```

This ensures:
- Consistent error logging
- User-friendly error messages
- Error statistics tracking
- Sentry integration

## Sentry Integration

Errors are automatically reported to Sentry when available:

```typescript
if (typeof window !== 'undefined' && (window as any).Sentry) {
  (window as any).Sentry.captureException(error, {
    tags: {
      errorBoundary: 'section-name',
      section: 'route-section'
    },
    extra: { digest: error.digest }
  })
}
```

### Error Severity Levels

The `ErrorHandler` classifies errors by severity:

- **Fatal**: `INTERNAL_ERROR`, `UNKNOWN_ERROR`
- **Error**: `SERVER_ERROR`, `NETWORK_ERROR`, `TIMEOUT_ERROR`
- **Warning**: `AUTH_*`, `PERMISSION_*` errors
- **Info**: All other errors

## Error Boundary Limitations

React error boundaries have important limitations:

### What Error Boundaries CATCH:
- Errors during rendering
- Errors in lifecycle methods
- Errors in constructors of child components

### What Error Boundaries DO NOT CATCH:
- Event handler errors (need try-catch)
- Async code errors (promises, setTimeout)
- Server-side rendering errors
- Errors thrown in the error boundary itself

### Handling Uncaught Error Types

For event handlers and async code:

```typescript
// Event handler
const handleClick = () => {
  try {
    // Your code
  } catch (error) {
    errorHandler.handleError(error as Error, 'event-handler')
  }
}

// Async code
const fetchData = async () => {
  try {
    await someAsyncOperation()
  } catch (error) {
    errorHandler.handleError(error as Error, 'async-operation')
  }
}
```

## Testing Error Boundaries

A test page is provided at `/debug-mock/error-test` to verify error boundary functionality.

### Test Scenarios:

1. **Render Error Test**
   - Triggers: Component render phase error
   - Expected: Route error boundary catches and displays fallback UI
   - Verification: Error appears in console and Sentry

2. **Synchronous Error Test**
   - Triggers: Sync error in event handler
   - Expected: May not be caught by error boundary
   - Verification: Error appears in console

3. **Asynchronous Error Test**
   - Triggers: Async error
   - Expected: Not caught by error boundary
   - Verification: Unhandled promise rejection in console

### How to Test:

1. Navigate to `/debug-mock/error-test`
2. Open browser DevTools (F12) → Console tab
3. Click test buttons
4. Verify error boundary UI appears
5. Check console for error logs
6. Verify Sentry dashboard (production only)

## Development vs Production Behavior

### Development Mode:
- Shows detailed error information
- Displays stack traces
- Shows error digest
- Logs to console

### Production Mode:
- Shows user-friendly error messages
- Hides stack traces (security)
- Reports to Sentry
- Shows error digest for support

## Recovery Options

All error boundaries provide two recovery options:

1. **Try Again** - Calls `reset()` to attempt re-render
2. **Navigate Away** - Redirects to a safe page (dashboard/home)

## Adding New Error Boundaries

To add an error boundary to a new section:

1. Create `/app/your-section/error.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { errorHandler } from '@/utils/errorHandling'

export default function YourSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    errorHandler.handleError(error, 'your-section-error-boundary')

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          errorBoundary: 'your-section',
          section: 'your-section'
        },
        extra: { digest: error.digest }
      })
    }
  }, [error])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Your error UI */}
    </div>
  )
}
```

2. Follow the existing UI patterns for consistency
3. Add appropriate recovery options
4. Update this documentation

## Monitoring and Alerts

### Metrics to Monitor:

1. **Error Rate**: Errors per user session
2. **Error Types**: Most common error codes
3. **Recovery Rate**: How often users retry vs navigate away
4. **Sentry Alerts**: Configure for high-severity errors

### Recommended Sentry Alerts:

- Fatal errors (immediate notification)
- Error rate > 5% of sessions
- New error types (first occurrence)
- Spike in specific error codes

## Best Practices

1. **Add Error Boundaries at Route Boundaries**
   - Prevents entire app crashes
   - Provides contextual recovery

2. **Always Log to ErrorHandler**
   - Consistent error tracking
   - Unified Sentry reporting

3. **Provide Clear Recovery Paths**
   - "Try Again" for transient errors
   - "Go to [Safe Place]" for persistent errors

4. **Use Appropriate Error Messages**
   - User-friendly in production
   - Detailed in development

5. **Test Error Scenarios**
   - Use `/debug-mock/error-test`
   - Verify Sentry integration
   - Check recovery flows

## File Structure

```
frontend/
├── app/
│   ├── global-error.tsx              # Global error boundary
│   └── (shell)/
│       ├── dashboard/
│       │   └── error.tsx             # Dashboard error boundary
│       ├── travel/
│       │   └── error.tsx             # Travel section error boundary
│       ├── reports/
│       │   └── error.tsx             # Reports error boundary
│       └── debug-mock/
│           └── error-test/
│               └── page.tsx          # Error boundary test page
├── src/
│   └── utils/
│       └── errorHandling.ts          # Core error handling utilities
└── docs/
    └── ERROR_BOUNDARIES.md           # This file
```

## Related Documentation

- [Error Handling Utilities](/src/utils/errorHandling.ts)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Sentry Documentation](https://docs.sentry.io/)

## Support

For issues or questions about error handling:

1. Check error logs in ErrorHandler (`errorHandler.getErrorLog()`)
2. Review Sentry dashboard for patterns
3. Test with `/debug-mock/error-test`
4. Review stack traces in development mode
