import * as Sentry from '@sentry/nextjs'

// Sentry configuration for API observability
export function initSentry() {
  if (typeof window === 'undefined') {
    // Server-side Sentry initialization
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Error filtering
      beforeSend(event) {
        // Filter out known non-critical errors
        if (event.exception?.values?.[0]?.value?.includes('Dynamic server usage')) {
          return null // Don't send Next.js static generation warnings
        }
        
        // Mask sensitive data in error context
        if (event.contexts?.request) {
          const request = event.contexts.request
          if (request.headers && typeof request.headers === 'object') {
            // Mask authorization headers
            if ('authorization' in request.headers) {
              request.headers.authorization = '[MASKED]'
            }
            if ('cookie' in request.headers) {
              request.headers.cookie = '[MASKED]'
            }
          }
        }
        
        return event
      },
      
      // Tag all server-side events
      initialScope: {
        tags: { component: 'api-server' }
      }
    })
  } else {
    // Client-side Sentry initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      
      // Reduced sampling for client-side
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
      
      initialScope: {
        tags: { component: 'web-client' }
      }
    })
  }
}

// Request logging helper for API routes
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  duration?: number,
  status?: number
) {
  const requestId = Math.random().toString(36).substring(2, 15)
  
  // Structure for observability
  const logData = {
    requestId,
    method,
    path,
    userId: userId || 'anonymous',
    duration: duration ? `${duration}ms` : undefined,
    status,
    timestamp: new Date().toISOString()
  }
  
  // Log to console (structured logging)
  console.log('API Request:', JSON.stringify(logData))
  
  // Add breadcrumb to Sentry for traceability
  Sentry.addBreadcrumb({
    category: 'api.request',
    message: `${method} ${path}`,
    level: status && status >= 400 ? 'error' : 'info',
    data: {
      requestId,
      userId,
      duration,
      status
    }
  })
  
  return requestId
}

// Enhanced error reporting for API routes
export function reportApiError(
  error: Error,
  context: {
    path: string
    method: string
    userId?: string
    requestId?: string
    requestBody?: any
  }
) {
  // Mask sensitive data in request body
  const maskedBody = context.requestBody ? maskSensitiveData(context.requestBody) : undefined
  
  Sentry.withScope(scope => {
    scope.setTag('component', 'api-route')
    scope.setTag('endpoint', context.path)
    scope.setTag('method', context.method)
    
    if (context.userId) {
      scope.setUser({ id: context.userId })
    }
    
    if (context.requestId) {
      scope.setContext('request', {
        id: context.requestId,
        body: maskedBody
      })
    }
    
    Sentry.captureException(error)
  })
}

// Performance monitoring for API routes (simplified)
export async function measureApiPerformance<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    // Log performance metrics
    Sentry.addBreadcrumb({
      message: `API operation ${operationName} completed`,
      level: 'info',
      data: { duration, status: 'success' }
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    Sentry.addBreadcrumb({
      message: `API operation ${operationName} failed`,
      level: 'error', 
      data: { duration, error: error instanceof Error ? error.message : String(error) }
    })
    
    throw error
  }
}

// Utility function to mask sensitive data
function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  const masked = { ...data }
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization', 
    'cookie', 'session', 'passportData', 'personalInfo'
  ]
  
  Object.keys(masked).forEach(key => {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      masked[key] = '[MASKED]'
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key])
    }
  })
  
  return masked
}

// API middleware wrapper for enhanced logging and error handling
export function withApiObservability(
  handler: (req: any, res: any) => Promise<Response>,
  operationName: string
) {
  return async (req: any, res: any): Promise<Response> => {
    const startTime = Date.now()
    const requestId = logApiRequest(req.method, req.url)
    
    try {
      // Extract user ID if available (you'll need to adapt this to your auth system)
      const userId = extractUserIdFromRequest(req)
      
      const result = await measureApiPerformance(operationName, async () => {
        return handler(req, res)
      })
      
      const duration = Date.now() - startTime
      logApiRequest(req.method, req.url, userId, duration, result.status)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const userId = extractUserIdFromRequest(req)
      
      logApiRequest(req.method, req.url, userId, duration, 500)
      
      reportApiError(error as Error, {
        path: req.url,
        method: req.method,
        userId,
        requestId,
        requestBody: req.body
      })
      
      // Re-throw to let the API route handle the response
      throw error
    }
  }
}

// Helper to extract user ID from request (adapt to your auth system)
function extractUserIdFromRequest(req: any): string | undefined {
  try {
    // This would depend on how your auth middleware attaches user info
    // Example implementations:
    
    // From JWT token in Authorization header
    const authHeader = req.headers?.authorization
    if (authHeader?.startsWith('Bearer ')) {
      // You'd decode the JWT here and extract user ID
      // This is just a placeholder
      return 'user-from-jwt'
    }
    
    // From request context (if set by auth middleware)
    return req.user?.id
  } catch {
    return undefined
  }
}