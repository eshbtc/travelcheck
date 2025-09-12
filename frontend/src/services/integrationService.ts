// Mock integration service - Firebase removed
import { toast } from 'react-hot-toast'

// Types for integration service
export interface IntegrationStatus {
  provider: 'gmail' | 'office365'
  isConnected: boolean
  lastConnected?: string
  scopes?: string[]
  expiresAt?: string
}

export interface IngestParams {
  providers: string[]
  lookbackDays: number
  maxResults?: number
}

export interface IngestResult {
  provider: string
  emailsProcessed: number
  bookingsFound: number
  duplicates: number
  errors: number
  duration: number
  lastProcessed?: string
}

export interface IngestStatus {
  provider: string
  lastIngested?: string
  totalEmails: number
  totalBookings: number
  lastError?: string
  isIngesting: boolean
}

export interface SchedulePreferences {
  daily: boolean
  evening: boolean
}

// HTTP client wrapper for API calls
const apiCall = async <TResponse>(
  endpoint: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<TResponse> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(endpoint, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error(`Error calling ${endpoint}:`, error)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    } else if (error.message?.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your connection.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

// OAuth Management
export const getGmailAuthUrl = async (): Promise<string> => {
  const result = await apiCall<{ success: boolean; authUrl: string }>('/api/gmail/auth', {
    method: 'POST',
  })
  return result.authUrl
}

export const handleGmailCallback = async (code: string): Promise<IntegrationStatus> => {
  const result = await apiCall<{ success: boolean; connected: boolean; provider: string; email: string; connectedAt: string }>('/api/gmail/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  
  return {
    provider: 'gmail',
    isConnected: result.connected,
    lastConnected: result.connectedAt,
  }
}

export const getOffice365AuthUrl = async (): Promise<string> => {
  const result = await apiCall<{ success: boolean; authUrl: string }>('/api/office365/auth', {
    method: 'POST',
  })
  return result.authUrl
}

export const handleOffice365Callback = async (code: string): Promise<IntegrationStatus> => {
  const result = await apiCall<{ success: boolean; connected: boolean; provider: string; email: string; connectedAt: string }>('/api/office365/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  
  return {
    provider: 'office365',
    isConnected: result.connected,
    lastConnected: result.connectedAt,
  }
}

export const revokeGmailAccess = async (): Promise<void> => {
  await apiCall<{ success: boolean }>('/api/gmail/disconnect', {
    method: 'POST',
  })
}

export const revokeOffice365Access = async (): Promise<void> => {
  await apiCall<{ success: boolean }>('/api/office365/disconnect', {
    method: 'POST',
  })
}

// Integration Status
export const getIntegrationStatus = async (): Promise<IntegrationStatus[]> => {
  const result = await apiCall<{ success: boolean; integrations: any }>('/api/integration/status')
  
  // Transform the response to match our expected format
  const emailAccounts = result.integrations.emailAccounts || []
  return emailAccounts.map((account: any) => ({
    provider: account.provider as 'gmail' | 'office365',
    isConnected: account.is_active,
    lastConnected: account.created_at,
    scopes: [], // Not provided by current API
    expiresAt: undefined, // Not provided by current API
  }))
}

// Booking Ingestion
export const ingestGmailBookings = async (params: IngestParams): Promise<IngestResult> => {
  const result = await apiCall<{ success: boolean; count: number; emails: any[] }>('/api/gmail/sync', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  
  return {
    provider: 'gmail',
    emailsProcessed: result.count,
    bookingsFound: result.emails.filter(e => e.flight_data && Object.keys(e.flight_data).length > 0).length,
    duplicates: 0, // Not tracked in current API
    errors: 0, // Not tracked in current API  
    duration: 0, // Not tracked in current API
    lastProcessed: new Date().toISOString(),
  }
}

export const ingestOffice365Bookings = async (params: IngestParams): Promise<IngestResult> => {
  const result = await apiCall<{ success: boolean; count: number; emails: any[] }>('/api/office365/sync', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  
  return {
    provider: 'office365',
    emailsProcessed: result.count,
    bookingsFound: result.emails.filter(e => e.flight_data && Object.keys(e.flight_data).length > 0).length,
    duplicates: 0, // Not tracked in current API
    errors: 0, // Not tracked in current API
    duration: 0, // Not tracked in current API
    lastProcessed: new Date().toISOString(),
  }
}

export const getBookingIngestionStatus = async (): Promise<IngestStatus[]> => {
  const result = await apiCall<{ success: boolean; ingestionStatus: any }>('/api/booking/status')
  
  const ingestionStatus = result.ingestionStatus
  if (!ingestionStatus) {
    return []
  }
  
  // Extract rich booking ingestion data from the detailed status
  const flightEmails = ingestionStatus.flightEmails || {}
  const passportScans = ingestionStatus.passportScans || {}
  const travelEntries = ingestionStatus.travelEntries || {}
  
  // Create unified status entries based on different data sources
  const statuses: IngestStatus[] = []
  
  if (flightEmails.total > 0) {
    statuses.push({
      provider: 'email_processing',
      lastIngested: ingestionStatus.lastUpdated,
      totalEmails: flightEmails.total,
      totalBookings: flightEmails.processed,
      lastError: flightEmails.failed > 0 ? `${flightEmails.failed} emails failed processing` : undefined,
      isIngesting: ingestionStatus.processingQueues?.emailSync?.status === 'running',
    })
  }
  
  if (passportScans.total > 0) {
    statuses.push({
      provider: 'passport_processing',
      lastIngested: ingestionStatus.lastUpdated,
      totalEmails: 0, // Not applicable for passport scans
      totalBookings: passportScans.processed,
      lastError: passportScans.failed > 0 ? `${passportScans.failed} passport scans failed` : undefined,
      isIngesting: ingestionStatus.processingQueues?.ocrProcessing?.status === 'running',
    })
  }
  
  if (travelEntries.total > 0) {
    statuses.push({
      provider: 'travel_entry_processing',
      lastIngested: ingestionStatus.lastUpdated,
      totalEmails: 0, // Not applicable for travel entries
      totalBookings: travelEntries.confirmed,
      lastError: travelEntries.disputed > 0 ? `${travelEntries.disputed} entries are disputed` : undefined,
      isIngesting: false, // Travel entries are typically processed immediately
    })
  }
  
  // If no data processed yet, return a basic status
  if (statuses.length === 0) {
    statuses.push({
      provider: 'system',
      lastIngested: null,
      totalEmails: 0,
      totalBookings: 0,
      lastError: undefined,
      isIngesting: false,
    })
  }
  
  return statuses
}

// Schedule Management  
export const getSchedulePreferences = async (): Promise<SchedulePreferences> => {
  // Schedule preferences are handled by dedicated schedule API
  try {
    const result = await apiCall<{ success: boolean; data: SchedulePreferences }>('/api/schedule')
    return result.data
  } catch (error) {
    // Return defaults if API not available
    return { daily: false, evening: false }
  }
}

export const updateSchedulePreferences = async (preferences: SchedulePreferences): Promise<void> => {
  await apiCall<{ success: boolean }>('/api/schedule', {
    method: 'POST',
    body: JSON.stringify(preferences),
  })
}

// Service class for easier usage
export class IntegrationService {
  // OAuth Management
  static async connectGmail(): Promise<string> {
    try {
      const authUrl = await getGmailAuthUrl()
      // Open OAuth flow in new window
      window.open(authUrl, 'gmail-oauth', 'width=600,height=600')
      return authUrl
    } catch (error: any) {
      toast.error(`Failed to start Gmail connection: ${error.message}`)
      throw error
    }
  }

  static async connectOffice365(): Promise<string> {
    try {
      const authUrl = await getOffice365AuthUrl()
      // Open OAuth flow in new window
      window.open(authUrl, 'office365-oauth', 'width=600,height=600')
      return authUrl
    } catch (error: any) {
      toast.error(`Failed to start Office 365 connection: ${error.message}`)
      throw error
    }
  }

  static async disconnectGmail(): Promise<void> {
    try {
      await revokeGmailAccess()
      toast.success('Gmail disconnected successfully')
    } catch (error: any) {
      toast.error(`Failed to disconnect Gmail: ${error.message}`)
      throw error
    }
  }

  static async disconnectOffice365(): Promise<void> {
    try {
      await revokeOffice365Access()
      toast.success('Office 365 disconnected successfully')
    } catch (error: any) {
      toast.error(`Failed to disconnect Office 365: ${error.message}`)
      throw error
    }
  }

  // Status Management
  static async getStatus(): Promise<IntegrationStatus[]> {
    try {
      return await getIntegrationStatus()
    } catch (error: any) {
      toast.error(`Failed to load integration status: ${error.message}`)
      throw error
    }
  }

  // Ingestion
  static async ingestGmail(params: IngestParams): Promise<IngestResult> {
    try {
      const result = await ingestGmailBookings(params)
      toast.success(`Gmail ingestion completed: ${result.bookingsFound} bookings found`)
      return result
    } catch (error: any) {
      toast.error(`Gmail ingestion failed: ${error.message}`)
      throw error
    }
  }

  static async ingestOffice365(params: IngestParams): Promise<IngestResult> {
    try {
      const result = await ingestOffice365Bookings(params)
      toast.success(`Office 365 ingestion completed: ${result.bookingsFound} bookings found`)
      return result
    } catch (error: any) {
      toast.error(`Office 365 ingestion failed: ${error.message}`)
      throw error
    }
  }

  static async getIngestionStatus(): Promise<IngestStatus[]> {
    try {
      return await getBookingIngestionStatus()
    } catch (error: any) {
      toast.error(`Failed to load ingestion status: ${error.message}`)
      throw error
    }
  }

  // Schedule Management
  static async getSchedulePrefs(): Promise<SchedulePreferences> {
    try {
      return await getSchedulePreferences()
    } catch (error: any) {
      toast.error(`Failed to load schedule preferences: ${error.message}`)
      throw error
    }
  }

  static async updateSchedulePrefs(preferences: SchedulePreferences): Promise<void> {
    try {
      await updateSchedulePreferences(preferences)
      toast.success('Schedule preferences updated')
    } catch (error: any) {
      toast.error(`Failed to update schedule preferences: ${error.message}`)
      throw error
    }
  }
}

// OAuth callback handler for popup windows
export const handleOAuthCallback = async (provider: 'gmail' | 'office365', code: string): Promise<void> => {
  try {
    let result: IntegrationStatus
    if (provider === 'gmail') {
      result = await handleGmailCallback(code)
    } else {
      result = await handleOffice365Callback(code)
    }
    
    if (result.isConnected) {
      toast.success(`${provider} connected successfully`)
      // Close the popup window
      window.close()
    } else {
      toast.error(`Failed to connect ${provider}`)
    }
  } catch (error: any) {
    toast.error(`OAuth callback failed: ${error.message}`)
    throw error
  }
}

// Utility functions
export const isTokenExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export const getTimeUntilExpiry = (expiresAt?: string): string => {
  if (!expiresAt) return 'Unknown'
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  
  if (diff <= 0) return 'Expired'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days} days, ${hours} hours`
  return `${hours} hours`
}

export default IntegrationService
