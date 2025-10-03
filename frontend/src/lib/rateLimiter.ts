/**
 * Rate Limiter for API endpoints with exponential backoff
 * Handles per-user limits with Redis-like in-memory store
 */

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  keyGenerator: (req: any) => string  // Function to generate rate limit key
  message?: string      // Custom error message
  headers?: boolean     // Include rate limit headers in response
  skipFailedRequests?: boolean  // Don't count failed requests
}

interface RateLimitInfo {
  totalHits: number
  resetTime: Date
  remainingPoints: number
}

// In-memory store for rate limiting (use Redis in production)
class MemoryStore {
  private store: Map<string, { count: number; resetTime: number; retryAfter?: number }> = new Map()
  
  increment(key: string, windowMs: number): RateLimitInfo {
    const now = Date.now()
    const resetTime = now + windowMs
    
    const existing = this.store.get(key)
    
    if (!existing || existing.resetTime <= now) {
      // Create new window
      this.store.set(key, { count: 1, resetTime })
      return {
        totalHits: 1,
        resetTime: new Date(resetTime),
        remainingPoints: 0 // Will be calculated by caller
      }
    } else {
      // Increment existing window
      existing.count++
      this.store.set(key, existing)
      return {
        totalHits: existing.count,
        resetTime: new Date(existing.resetTime),
        remainingPoints: 0 // Will be calculated by caller
      }
    }
  }
  
  setRetryAfter(key: string, retryAfterMs: number): void {
    const existing = this.store.get(key)
    if (existing) {
      existing.retryAfter = Date.now() + retryAfterMs
      this.store.set(key, existing)
    }
  }
  
  getRetryAfter(key: string): number | null {
    const existing = this.store.get(key)
    if (existing?.retryAfter && existing.retryAfter > Date.now()) {
      return Math.ceil((existing.retryAfter - Date.now()) / 1000) // Return seconds
    }
    return null
  }
  
  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of Array.from(this.store.entries())) {
      if (value.resetTime <= now && (!value.retryAfter || value.retryAfter <= now)) {
        this.store.delete(key)
      }
    }
  }
}

const store = new MemoryStore()

// Cleanup expired entries every 5 minutes
setInterval(() => store.cleanup(), 5 * 60 * 1000)

// Exponential backoff calculator
function calculateBackoff(attemptCount: number, baseDelayMs = 60000): number {
  // Base: 1 min, then 2 min, 4 min, 8 min, max 30 min
  const delay = Math.min(baseDelayMs * Math.pow(2, attemptCount - 1), 30 * 60 * 1000)
  // Add some jitter
  return delay + Math.random() * 0.1 * delay
}

// Pre-configured rate limiters
export const rateLimitConfigs = {
  // Gmail/Office sync - strict limits due to external API quotas
  emailSync: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,           // 10 requests per 15 min
    keyGenerator: (req: any) => `email_sync:${extractUserId(req)}`,
    message: 'Too many sync requests. Email sync is rate limited to prevent quota exhaustion.',
    headers: true
  },
  
  // AI analysis endpoints - moderate limits
  aiAnalysis: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 30,      // 30 requests per minute
    keyGenerator: (req: any) => `ai_analysis:${extractUserId(req)}`,
    message: 'AI analysis rate limit exceeded. Please wait before making more requests.',
    headers: true
  },
  
  // General API - generous limits
  general: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 120,     // 120 requests per minute  
    keyGenerator: (req: any) => `api:${extractUserId(req)}`,
    message: 'Rate limit exceeded. Please slow down your requests.',
    headers: true
  }
} satisfies Record<string, RateLimitConfig>

function extractUserId(req: any): string {
  // Extract user ID from request (adapt to your auth system)
  try {
    // From auth middleware context
    if (req.user?.id) return req.user.id
    
    // From JWT in Authorization header
    const authHeader = req.headers?.authorization
    if (authHeader?.startsWith('Bearer ')) {
      // This would decode JWT and extract user ID
      // For now, use IP as fallback
      return req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
    }
    
    return req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
  } catch {
    return 'unknown'
  }
}

// Rate limiter middleware function
export async function rateLimit(req: any, config: RateLimitConfig): Promise<{
  success: boolean
  error?: string
  headers?: Record<string, string>
  retryAfter?: number
}> {
  const key = config.keyGenerator(req)
  
  // Check if user is in backoff period
  const retryAfter = store.getRetryAfter(key)
  if (retryAfter) {
    return {
      success: false,
      error: `Rate limited with exponential backoff. Retry after ${retryAfter} seconds.`,
      retryAfter,
      headers: config.headers ? {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil((Date.now() + retryAfter * 1000) / 1000).toString(),
        'Retry-After': retryAfter.toString()
      } : undefined
    }
  }
  
  const result = store.increment(key, config.windowMs)
  const remaining = Math.max(0, config.maxRequests - result.totalHits)
  
  const headers = config.headers ? {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString()
  } : undefined
  
  if (result.totalHits > config.maxRequests) {
    // Calculate exponential backoff
    const backoffMs = calculateBackoff(result.totalHits - config.maxRequests)
    const backoffSeconds = Math.ceil(backoffMs / 1000)
    
    // Set retry after time
    store.setRetryAfter(key, backoffMs)
    
    return {
      success: false,
      error: config.message || 'Rate limit exceeded',
      retryAfter: backoffSeconds,
      headers: headers ? {
        ...headers,
        'X-RateLimit-Remaining': '0',
        'Retry-After': backoffSeconds.toString()
      } : undefined
    }
  }
  
  return {
    success: true,
    headers
  }
}

// Convenience functions for specific rate limits
export async function rateLimitEmailSync(req: any) {
  return rateLimit(req, rateLimitConfigs.emailSync)
}

export async function rateLimitAiAnalysis(req: any) {
  return rateLimit(req, rateLimitConfigs.aiAnalysis)
}

export async function rateLimitGeneral(req: any) {
  return rateLimit(req, rateLimitConfigs.general)
}

// Middleware wrapper for Next.js API routes
export function withRateLimit(
  handler: (req: any, res?: any) => Promise<Response>,
  limiterFn: (req: any) => Promise<{ success: boolean; error?: string; headers?: Record<string, string>; retryAfter?: number }>
) {
  return async (req: any, res?: any): Promise<Response> => {
    const result = await limiterFn(req)
    
    if (!result.success) {
      const response = new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.headers
          }
        }
      )
      return response
    }
    
    const response = await handler(req, res)
    
    // Add rate limit headers to successful responses
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
    
    return response
  }
}

// Email account status updater (for retry_after tracking)
export async function updateEmailAccountRetryAfter(
  supabase: any,
  userId: string,
  provider: 'gmail' | 'office365',
  retryAfterSeconds?: number
): Promise<void> {
  try {
    const nextSyncAllowedAt = retryAfterSeconds 
      ? new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
      : null
    
    await supabase
      .from('email_accounts')
      .update({
        next_sync_allowed_at: nextSyncAllowedAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider', provider)
    
    console.log(`Updated ${provider} account retry_after for user ${userId}:`, nextSyncAllowedAt)
  } catch (error) {
    console.error('Failed to update email account retry_after:', error)
  }
}