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

  // Stub methods that route to API endpoints
  async getPassportScans() {
    return this.apiCall('/api/passport/list')
  }

  async getFlightEmails() {
    return this.apiCall('/api/flight-emails/list')
  }

  async detectDuplicateScans() {
    return this.apiCall('/api/duplicates/detect')
  }

  async getDuplicateResults() {
    return this.apiCall('/api/duplicates/list')
  }

  async resolveDuplicate(duplicateId: string, resolution: any) {
    return this.apiCall('/api/duplicates/resolve', {
      method: 'POST',
      body: JSON.stringify({ duplicateId, resolution })
    })
  }

  async generateSmartSuggestions(userData: any) {
    return this.apiCall('/api/ai/generate-suggestions', {
      method: 'POST',
      body: JSON.stringify({ userData })
    })
  }

  async analyzeTravelPatterns() {
    return this.apiCall('/api/ai/analyze-patterns')
  }

  async analyzeEnhancedTravelHistory() {
    return this.apiCall('/api/travel/history/analyze')
  }

  async processBatchPassportImages(files: File[]) {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`file${index}`, file)
    })

    const response = await fetch('/api/batch/process', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || 'Batch processing failed')
    }

    return response.json()
  }

  async optimizeBatchProcessing() {
    return this.apiCall('/api/batch/optimize-processing')
  }
}

export const supabaseService = new SupabaseServiceStub()
