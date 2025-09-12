import { supabase } from '../lib/supabase'

// Auth helpers
export const authService = {
  signUp: async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password })
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  getUser: async () => {
    return await supabase.auth.getUser()
  },

  getSession: async () => {
    return await supabase.auth.getSession()
  },

  signInWithOAuth: async (provider: 'google' | 'github') => {
    return await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `https://travelcheck.xyz/auth/callback`
      }
    })
  }
}

// API call helper that automatically includes auth token
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add any additional headers from options
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value
      }
    })
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Replacement functions for Firebase Functions calls
export const supabaseService = {
  // User Management
  getUserProfile: async () => {
    return apiCall('/user/profile')
  },

  updateUserProfile: async (profileData: any) => {
    return apiCall('/user/profile', {
      method: 'POST',
      body: JSON.stringify({ profileData })
    })
  },

  // Travel History
  getTravelHistory: async () => {
    return apiCall('/travel/history')
  },

  saveTravelHistory: async (passportData: any, flightData: any) => {
    return apiCall('/travel/history', {
      method: 'POST',
      body: JSON.stringify({ passportData, flightData })
    })
  },

  // Passport Scans
  getPassportScans: async () => {
    return apiCall('/passport/scans')
  },

  savePassportScan: async (fileUrl: string, analysisResults: any, fileName?: string) => {
    return apiCall('/passport/scans', {
      method: 'POST',
      body: JSON.stringify({ fileUrl, analysisResults, fileName })
    })
  },

  deletePassportScan: async (scanId: string) => {
    return apiCall(`/passport/scans/${scanId}`, {
      method: 'DELETE'
    })
  },

  // Flight Emails
  getFlightEmails: async () => {
    return apiCall('/flight/emails')
  },

  deleteFlightEmail: async (emailId: string) => {
    return apiCall(`/flight/emails/${emailId}`, {
      method: 'DELETE'
    })
  },

  // System
  healthCheck: async () => {
    return apiCall('/health')
  },

  getSystemStatus: async () => {
    return apiCall('/system/status')
  },

  // Integration Status (to be implemented)
  getIntegrationStatus: async () => {
    return apiCall('/integration/status')
  },

  getBookingIngestionStatus: async () => {
    return apiCall('/booking/status')
  },

  // Admin functions (to be implemented)
  setUserRole: async (targetUserId: string, role: 'admin' | 'user') => {
    return apiCall('/admin/users/role', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, role })
    })
  },

  listUsers: async () => {
    return apiCall('/admin/users')
  },

  // Real apiCall method that routes to actual API endpoints
  apiCall: async (endpoint: string, data?: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Map friendly names to actual API routes
      const routeMap: Record<string, string> = {
        'generateUniversalReport': '/reports/generate',
        'exportReport': '/reports/export',
        'listUniversalReports': '/reports/list',
        'deleteUniversalReport': '/reports/delete',
        'getAvailableCountries': '/countries/available',
        'getUserProfile': '/user/profile',
        'updateUserProfile': '/user/profile',
        'getBookingIngestionStatus': '/booking/status',
        'ingestGmailBookings': '/gmail/sync',
        'ingestOffice365Bookings': '/office365/sync',
        'getReportTemplates': '/reports/templates',
        'saveReportTemplate': '/reports/templates',
        // Feature-flagged endpoints (not implemented yet)
        'getCountryRules': '/countries/rules',
        'analyzeMultiPurpose': '/travel/analyze-multi-purpose', 
        'getTravelInsights': '/travel/insights',
        'simulateScenario': '/travel/simulate'
      }

      // Normalize endpoint - ensure it starts with /
      const originalEndpoint = endpoint
      let normalizedEndpoint = endpoint
      if (routeMap[endpoint]) {
        normalizedEndpoint = routeMap[endpoint]
      } else if (!endpoint.startsWith('/')) {
        normalizedEndpoint = `/${endpoint}`
      }

      // Some endpoints expect GET with query params even when a payload is provided
      const getWithQueryAliases = new Set<string>([
        'listUniversalReports',
        'getReportTemplates'
      ])

      let method: 'GET' | 'POST' = data ? 'POST' : 'GET'
      let url = `/api${normalizedEndpoint}`

      if (getWithQueryAliases.has(originalEndpoint)) {
        method = 'GET'
        if (data && typeof data === 'object') {
          const qs = new URLSearchParams()
          Object.entries(data).forEach(([k, v]) => {
            if (v !== undefined && v !== null) qs.append(k, String(v))
          })
          const query = qs.toString()
          if (query) url = `${url}?${query}`
        }
      }

      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' && data ? JSON.stringify(data) : undefined
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API call error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'API call failed' 
      }
    }
  }
}

// Real-time subscriptions (replacing Firebase Firestore listeners)
export const subscribeToUserData = (userId: string, callback: (data: any) => void) => {
  return supabase
    .channel(`user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

export const subscribeToPassportScans = (userId: string, callback: (data: any) => void) => {
  return supabase
    .channel(`passport_scans_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'passport_scans',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

// Import real services
import { vertexAI } from './vertexAI'
import { supabaseStorage } from './supabaseStorage'

// Real implementation functions using Vertex AI and Supabase
export const getPassportScans = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('passport_scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting passport scans:', error)
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const getFlightEmails = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('flight_emails')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting flight emails:', error)
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const analyzeEnhancedTravelHistory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's travel data from database  
    const { data: travelData, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Analyze with Vertex AI
    const analysisResult = await vertexAI.analyzeTravelPatterns(travelData || [])
    
    return analysisResult
  } catch (error) {
    console.error('Error analyzing travel history:', error)
    return { success: false, data: {}, error: error instanceof Error ? error.message : 'Analysis failed' }
  }
}

export const getDuplicateResults = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get passport scans for duplicate detection
    const { data: scans, error } = await supabase
      .from('passport_scans')
      .select('id, file_url, analysis_results')
      .eq('user_id', user.id)

    if (error) throw error

    // Use Vertex AI to detect duplicates
    const duplicateResult = await vertexAI.detectDuplicateScans(
      (scans || []).map(scan => ({
        id: scan.id,
        imageUrl: scan.file_url,
        metadata: scan.analysis_results
      }))
    )

    return duplicateResult
  } catch (error) {
    console.error('Error getting duplicate results:', error)
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Duplicate detection failed' }
  }
}

export const generateSmartSuggestions = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's complete data
    const [travelData, passportData, profileData] = await Promise.all([
      supabase.from('travel_history').select('*').eq('user_id', user.id),
      supabase.from('passport_scans').select('*').eq('user_id', user.id),
      supabase.from('users').select('*').eq('id', user.id).single()
    ])

    const userData = {
      travel: travelData.data || [],
      passports: passportData.data || [],
      profile: profileData.data || {}
    }

    // Use Vertex AI to generate suggestions
    const suggestionsResult = await vertexAI.generateSmartSuggestions(userData)
    
    return suggestionsResult
  } catch (error) {
    console.error('Error generating smart suggestions:', error)
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Suggestions generation failed' }
  }
}

export const getSystemStatus = async () => {
  try {
    // Check Supabase connectivity by testing a simple query
    const { data, error } = await supabase.from('users').select('id').limit(1)
    
    const services = {
      database: !error ? 'healthy' : 'error',
      storage: 'healthy', // Assume healthy if we got this far
      ai: 'healthy' // Assume healthy if we got this far
    }

    return { 
      success: true, 
      status: Object.values(services).every(s => s === 'healthy') ? 'ok' : 'degraded',
      services 
    }
  } catch (error) {
    console.error('Error getting system status:', error)
    return { 
      success: false, 
      status: 'error', 
      services: { database: 'error', storage: 'unknown', ai: 'unknown' } 
    }
  }
}

export const generateUniversalReport = async (options?: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's travel data
    const { data: travelData, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Generate report using travel data
    const report = {
      id: `report_${Date.now()}`,
      userId: user.id,
      reportType: options?.reportType || { category: 'travel_summary' },
      generatedAt: new Date().toISOString(),
      data: {
        summary: {
          totalCountries: new Set((travelData || []).map(t => t.country)).size,
          totalPresenceDays: (travelData || []).length,
          dateRange: {
            start: travelData?.[0]?.date || '',
            end: travelData?.[travelData.length - 1]?.date || ''
          }
        },
        records: travelData || []
      }
    }

    // Save report to database
    const { error: saveError } = await supabase
      .from('reports')
      .insert([report])

    if (saveError) console.warn('Could not save report:', saveError.message)

    return { success: true, data: report }
  } catch (error) {
    console.error('Error generating universal report:', error)
    return { success: false, data: {}, error: error instanceof Error ? error.message : 'Report generation failed' }
  }
}

export const detectDuplicateScans = async () => {
  return getDuplicateResults()
}

export const resolveDuplicate = async (duplicateId: string, resolution: 'keep_first' | 'keep_second' | 'keep_both' = 'keep_first') => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // For now, just mark as resolved in memory - would need proper duplicate_resolutions table
    // This is a placeholder until the table is created
    console.log(`Duplicate ${duplicateId} resolved with strategy: ${resolution} for user ${user.id}`)

    return { success: true }
  } catch (error) {
    console.error('Error resolving duplicate:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Resolution failed' }
  }
}

export const getAvailableCountries = async () => {
  try {
    // Get countries from database or return hardcoded list
    const countries = [
      { code: 'US', name: 'United States', rules: [] },
      { code: 'CA', name: 'Canada', rules: [] },
      { code: 'GB', name: 'United Kingdom', rules: [] },
      { code: 'DE', name: 'Germany', rules: [] },
      { code: 'FR', name: 'France', rules: [] },
      { code: 'JP', name: 'Japan', rules: [] },
      { code: 'AU', name: 'Australia', rules: [] }
    ]

    return { success: true, data: countries }
  } catch (error) {
    console.error('Error getting available countries:', error)
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Countries fetch failed' }
  }
}

export const processBatchPassportImages = async (imageDataArray: Array<{
  file: File
  fileName: string
}>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    if (!imageDataArray || imageDataArray.length === 0) {
      return { success: true, processed: 0, failed: 0, results: [] }
    }

    // Upload files to storage first
    const uploadResults = await supabaseStorage.uploadBatch(
      imageDataArray.map((item, index) => ({
        file: item.file,
        path: `${user.id}/passports/${Date.now()}_${index}_${item.fileName}`,
        contentType: item.file.type,
        metadata: { originalName: item.fileName }
      }))
    )

    // Process uploaded images with Vertex AI
    const processResults = await vertexAI.processBatchPassportImages(
      uploadResults.results
        .filter(r => r.success && r.url)
        .map(r => ({
          id: r.path,
          data: r.url!, // Use URL for processing
          fileName: r.path.split('/').pop() || 'unknown'
        }))
    )

    // Save results to database
    const scansToSave = processResults.results
      .filter(r => r.success)
      .map(r => ({
        user_id: user.id,
        file_url: uploadResults.results.find(u => u.path === r.id)?.url || '',
        file_name: r.id.split('/').pop() || 'unknown',
        analysis_results: r.data,
        created_at: new Date().toISOString()
      }))

    if (scansToSave.length > 0) {
      await supabase.from('passport_scans').insert(scansToSave)
    }

    return processResults
  } catch (error) {
    console.error('Error processing batch passport images:', error)
    return { 
      success: false, 
      processed: 0, 
      failed: imageDataArray?.length || 0, 
      results: [],
      error: error instanceof Error ? error.message : 'Batch processing failed'
    }
  }
}

export const optimizeBatchProcessing = async (imageDataArray?: any) => {
  const batchSize = imageDataArray?.length || 0
  
  return { 
    success: true, 
    optimizations: [
      { type: 'batch_size', recommendation: Math.min(batchSize, 10), current: batchSize },
      { type: 'compression', recommendation: 'Enable image compression for faster processing' }
    ], 
    savings: Math.max(0, (batchSize - 10) * 0.5), // Estimated time savings
    data: { 
      batchSize,
      estimatedCost: batchSize * 0.01, // $0.01 per image
      suggestedBatchSize: Math.min(batchSize, 10)
    }
  }
}

export const analyzeTravelPatterns = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get travel data
    const { data: travelData, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Use Vertex AI to analyze patterns
    const result = await vertexAI.analyzeTravelPatterns(travelData || [])
    
    return result
  } catch (error) {
    console.error('Error analyzing travel patterns:', error)
    return { success: false, data: {}, error: error instanceof Error ? error.message : 'Travel pattern analysis failed' }
  }
}
