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
    console.log('[SupabaseService] ===== API CALL START =====')
    console.log('[SupabaseService] Endpoint:', endpoint)
    console.log('[SupabaseService] Method:', options?.method || 'GET')
    console.log('[SupabaseService] Headers:', {
      ...options?.headers,
      'Content-Type': 'application/json'
    })

    // Log body if present (but not file data to avoid huge logs)
    if (options?.body) {
      try {
        const bodyPreview = options.body instanceof FormData
          ? `FormData with ${Array.from(options.body.entries()).length} entries`
          : typeof options.body === 'string'
            ? options.body.substring(0, 200) + (options.body.length > 200 ? '...' : '')
            : String(options.body)
        console.log('[SupabaseService] Body preview:', bodyPreview)
      } catch (e) {
        console.log('[SupabaseService] Body: [unable to preview]')
      }
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      console.log('[SupabaseService] Response status:', response.status, response.statusText)
      console.log('[SupabaseService] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      })

      if (!response.ok) {
        console.error('[SupabaseService] Response not OK - status:', response.status)
        let errorData
        try {
          errorData = await response.json()
          console.error('[SupabaseService] Error response body:', errorData)
        } catch (parseError) {
          console.error('[SupabaseService] Could not parse error response:', parseError)
          errorData = { message: 'Request failed' }
        }

        const errorMessage = errorData.message || errorData.error || `API call failed: ${response.statusText}`
        console.error('[SupabaseService] Throwing error:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[SupabaseService] Success response:', {
        success: data.success,
        dataKeys: Object.keys(data),
        dataPreview: JSON.stringify(data).substring(0, 200) + '...'
      })
      console.log('[SupabaseService] ===== API CALL END =====')
      return data
    } catch (error) {
      console.error('[SupabaseService] API call exception:', error)
      console.error('[SupabaseService] Error details:', {
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
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
    console.log('[SupabaseService] processBatchPassportImages called with', files.length, 'files')

    const formData = new FormData()

    // Generate unique batch ID
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    formData.append('batchId', batchId)
    console.log('[SupabaseService] Generated batchId:', batchId)

    // Append files
    files.forEach((file, index) => {
      formData.append(`file${index}`, file)
      console.log(`[SupabaseService] Appended file ${index}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      })
    })

    console.log('[SupabaseService] FormData entries count:', Array.from(formData.entries()).length)
    console.log('[SupabaseService] Sending POST to /api/batch/process')

    try {
      const response = await fetch('/api/batch/process', {
        method: 'POST',
        body: formData
        // Note: Do NOT set Content-Type header - browser will set it with boundary
      })

      console.log('[SupabaseService] Response status:', response.status, response.statusText)
      console.log('[SupabaseService] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      })

      if (!response.ok) {
        console.error('[SupabaseService] Batch process response not OK - status:', response.status)
        let errorData
        try {
          errorData = await response.json()
          console.error('[SupabaseService] Error response body:', errorData)
        } catch (parseError) {
          console.error('[SupabaseService] Could not parse error response:', parseError)
          errorData = { message: 'Request failed' }
        }

        const errorMessage = errorData.message || errorData.error || 'Batch processing failed'
        console.error('[SupabaseService] Throwing error:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[SupabaseService] Batch process success:', {
        success: data.success,
        batchId: data.batchId,
        hasData: !!data.data,
        scansCount: data.data?.scans?.length || 0,
        totalProcessed: data.data?.processed || 0
      })
      return data
    } catch (error) {
      console.error('[SupabaseService] Batch process exception:', error)
      console.error('[SupabaseService] Error details:', {
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  async optimizeBatchProcessing() {
    console.log('[SupabaseService] optimizeBatchProcessing called')
    try {
      const result = await this.apiCall('/api/batch/optimize-processing')
      console.log('[SupabaseService] optimizeBatchProcessing result:', result)
      return result
    } catch (error) {
      console.error('[SupabaseService] optimizeBatchProcessing failed:', error)
      throw error
    }
  }
}

export const supabaseService = new SupabaseServiceStub()
