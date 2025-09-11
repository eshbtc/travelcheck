import { httpsCallable } from 'firebase/functions'
import { functions, auth } from '@/lib/firebase'
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

// Callable function wrappers
const callFunction = async <TRequest, TResponse>(
  functionName: string,
  data: TRequest,
  timeout = 30000
): Promise<TResponse> => {
  try {
    // Check if user is authenticated - don't proceed if not
    const user = auth.currentUser
    if (!user) {
      throw new Error(`Function ${functionName} called but user is not authenticated`)
    }
    
    const callable = httpsCallable<TRequest, TResponse>(functions, functionName)
    const result = await Promise.race([
      callable(data),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ])
    return result.data
  } catch (error: any) {
    console.error(`Error calling ${functionName}:`, error)
    
    // Map common Firebase errors to user-friendly messages
    if (error.code === 'functions/unauthenticated') {
      throw new Error('Please log in to continue')
    } else if (error.code === 'functions/permission-denied') {
      throw new Error('You do not have permission to perform this action')
    } else if (error.code === 'functions/resource-exhausted') {
      throw new Error('Service temporarily unavailable. Please try again later.')
    } else if (error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please try again.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

// OAuth Management
export const getGmailAuthUrl = async (): Promise<string> => {
  return callFunction<{}, { authUrl: string }>('getGmailAuthUrl', {})
    .then(result => result.authUrl)
}

export const handleGmailCallback = async (code: string): Promise<IntegrationStatus> => {
  return callFunction<{ code: string }, IntegrationStatus>('handleGmailCallback', { code })
}

export const getOffice365AuthUrl = async (): Promise<string> => {
  return callFunction<{}, { authUrl: string }>('getOffice365AuthUrl', {})
    .then(result => result.authUrl)
}

export const handleOffice365Callback = async (code: string): Promise<IntegrationStatus> => {
  return callFunction<{ code: string }, IntegrationStatus>('handleOffice365Callback', { code })
}

export const revokeGmailAccess = async (): Promise<void> => {
  return callFunction<{}, void>('revokeGmailAccess', {})
}

export const revokeOffice365Access = async (): Promise<void> => {
  return callFunction<{}, void>('revokeOffice365Access', {})
}

// Integration Status
export const getIntegrationStatus = async (): Promise<IntegrationStatus[]> => {
  const result = await callFunction<{}, { data: IntegrationStatus[] }>('getIntegrationStatus', {})
  return result.data
}

// Booking Ingestion
export const ingestGmailBookings = async (params: IngestParams): Promise<IngestResult> => {
  return callFunction<IngestParams, IngestResult>('ingestGmailBookings', params)
}

export const ingestOffice365Bookings = async (params: IngestParams): Promise<IngestResult> => {
  return callFunction<IngestParams, IngestResult>('ingestOffice365Bookings', params)
}

export const getBookingIngestionStatus = async (): Promise<IngestStatus[]> => {
  // The backend returns { success, data: { lastIngestedAt, emailsIngested, totalParsedBookings, providers: [...] } }
  const raw: any = await callFunction<{}, any>('getBookingIngestionStatus', {})
  const data = raw?.data || raw || {}
  const last = data.lastIngestedAt || null
  const providers = Array.isArray(data.providers) ? data.providers : []
  const rows: IngestStatus[] = providers.map((p: any) => ({
    provider: String(p.provider || 'unknown'),
    lastIngested: last || undefined,
    totalEmails: Number(p.emails || 0),
    totalBookings: Number(p.parsedBookings || 0),
    lastError: undefined,
    isIngesting: false,
  }))
  return rows
}

// Schedule Management
export const getSchedulePreferences = async (): Promise<SchedulePreferences> => {
  const result = await callFunction<{}, { data: SchedulePreferences }>('getSchedulePreferences', {})
  return result.data
}

export const updateSchedulePreferences = async (preferences: SchedulePreferences): Promise<void> => {
  return callFunction<SchedulePreferences, void>('updateSchedulePreferences', preferences)
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
