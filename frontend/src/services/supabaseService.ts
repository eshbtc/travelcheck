/**
 * Supabase Service API Abstraction (Railway Migration Stub)
 *
 * This service provides a compatibility layer for components that previously
 * used Supabase directly. All methods now route to Next.js API routes.
 *
 * Migration Status: Stub for backward compatibility
 */

class SupabaseServiceStub {
  /**
   * Generic API call method
   * Routes all calls to Next.js API routes
   */
  async apiCall(endpoint: string, options?: RequestInit) {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `API call failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export const supabaseService = new SupabaseServiceStub()
