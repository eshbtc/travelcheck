import { httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { auth, functions } from '../lib/firebase'
import { handleError, getUserFriendlyMessage } from '../utils/errorHandling'
import type { 
  FirebaseFunctionResponse, 
  GmailConnectionStatus, 
  Office365ConnectionStatus,
  EmailSyncResult,
  TravelHistoryResult,
  ReportResult,
  UserProfile
} from '../types/firebase'

// Optional: connect to Functions emulator only when explicitly enabled
if (process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === 'true') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001)
    console.log('[dev] Connected to Functions emulator on localhost:5001')
  } catch (error) {
    console.warn('Failed to connect Functions emulator:', error)
  }
}

// Helper function to make callable function calls
export const callFunction = async <T = any>(functionName: string, data: any = {}, useAppCheck: boolean = true): Promise<T> => {
  try {
    // Check if user is authenticated - don't proceed if not
    const user = auth.currentUser
    if (!user) {
      throw new Error(`Function ${functionName} called but user is not authenticated`)
    }
    
    // Disable App Check to prevent throttling issues
    const options = {} // No App Check options
    const callable = httpsCallable(functions, functionName, options)
    const result = await callable(data)
    return result.data as T
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error)
    
    // Handle Firebase Functions errors
    if (error && typeof error === 'object' && 'code' in error) {
      const customError = new Error(getUserFriendlyMessage(error as any))
      customError.name = 'FirebaseFunctionError'
      handleError(customError, `Firebase Function: ${functionName}`)
      throw customError
    }
    
    // Handle other errors
    handleError(error as Error, `Firebase Function: ${functionName}`)
    throw error
  }
}

// OCR Functions
export const extractPassportData = async (imageData: string) => {
  return callFunction('extractPassportData', { imageData })
}

export const storePassportAnalysis = async (imageData: string, analysisResults: any, fileName?: string) => {
  return callFunction('storePassportAnalysis', { imageData, analysisResults, fileName })
}

// Email Functions
// Removed: legacy parseGmailEmails (use server-managed syncGmail)

// Travel History Functions (legacy removed in favor of enhanced/universal)

// User Management Functions
export const getUserProfile = async (): Promise<FirebaseFunctionResponse<UserProfile>> => {
  return callFunction<FirebaseFunctionResponse<UserProfile>>('getUserProfile', {})
}

export const updateUserProfile = async (profileData: any) => {
  return callFunction('updateUserProfile', { profileData })
}

// Data Management Functions
export const getTravelHistory = async () => {
  return callFunction('getTravelHistory', {})
}

export const getPassportScans = async () => {
  return callFunction('getPassportScans', {})
}

export const getFlightEmails = async () => {
  return callFunction('getFlightEmails', {}, false)
}

export const deletePassportScan = async (scanId: string) => {
  return callFunction('deletePassportScan', { scanId })
}

export const deleteFlightEmail = async (emailId: string) => {
  return callFunction('deleteFlightEmail', { emailId })
}

// Email Integration Functions
export const getGmailAuthUrl = async () => {
  return callFunction('getGmailAuthUrl', {}, false)
}

export const handleGmailCallback = async (code: string, state: string) => {
  // Call the HTTP function directly instead of using callable function
  const user = auth.currentUser
  if (!user) {
    throw new Error('User must be authenticated')
  }

  const token = await user.getIdToken()
  // In production, rely on Hosting rewrite to /api/gmail/callback
  // In local dev without Hosting emulator, optionally use direct Functions URL
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const directBase = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || (projectId ? `http://localhost:5001/${projectId}/us-central1` : '')
  const callbackUrl = directBase ? `${directBase}/gmailCallbackHTTP` : '/api/gmail/callback'
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code, state })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to handle Gmail callback')
  }

  return await response.json()
}

export const disconnectGmailAccount = async () => {
  return callFunction('disconnectGmail', {}, false)
}

export const getGmailConnectionStatus = async (): Promise<FirebaseFunctionResponse<GmailConnectionStatus>> => {
  return callFunction<FirebaseFunctionResponse<GmailConnectionStatus>>('getGmailConnectionStatus', {}, false)
}

export const syncGmailEmails = async (): Promise<FirebaseFunctionResponse<EmailSyncResult>> => {
  return callFunction<FirebaseFunctionResponse<EmailSyncResult>>('syncGmail', {}, false)
}

export const getOffice365AuthUrl = async () => {
  return callFunction('getOffice365AuthUrl', {}, false)
}

export const handleOffice365Callback = async (code: string, state: string) => {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User must be authenticated')
  }
  const token = await user.getIdToken()
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const directBase = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || (projectId ? `http://localhost:5001/${projectId}/us-central1` : '')
  const callbackUrl = directBase ? `${directBase}/office365CallbackHTTP` : '/api/office365/callback'
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code, state })
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to handle Office365 callback')
  }
  return await response.json()
}

export const disconnectOffice365Account = async () => {
  return callFunction('disconnectOffice365', {}, false)
}

export const getOffice365ConnectionStatus = async () => {
  return callFunction('getOffice365ConnectionStatus', {}, false)
}

export const syncOffice365Emails = async () => {
  return callFunction('syncOffice365', {}, false)
}

// Utility Functions
export const healthCheck = async () => {
  return callFunction('healthCheck', {}, false)
}

export const getSystemStatus = async () => {
  return callFunction('getSystemStatus', {}, false)
}

// Admin/maintenance
export const runDailyEmailSync = async () => {
  return callFunction('runDailyEmailSync', {})
}

// Admin functions
export const setUserRole = async (targetUserId: string, role: 'admin' | 'user') => {
  return callFunction('setUserRole', { targetUserId, role })
}

export const getAdminSystemStatus = async () => {
  return callFunction('getAdminSystemStatus', {})
}

export const listUsers = async () => {
  return callFunction('listUsers', {})
}

// ===== NEW FEATURES - Duplicate Detection & Caching =====

// Duplicate Detection Functions
export const detectDuplicateScans = async () => {
  return callFunction('detectDuplicateScans', {})
}

export const getDuplicateResults = async () => {
  return callFunction('getDuplicateResults', {})
}

export const resolveDuplicate = async (duplicateId: string, action: string, resolution?: any) => {
  return callFunction('resolveDuplicate', { duplicateId, action, resolution })
}

// Batch Analysis Functions
export const processBatchPassportImages = async (imageDataArray: any[], options?: any) => {
  return callFunction('processBatchPassportImages', { imageDataArray, options })
}

export const generateSmartSuggestions = async () => {
  return callFunction('generateSmartSuggestions', {})
}

export const analyzeTravelPatterns = async () => {
  return callFunction('analyzeTravelPatterns', {})
}

export const optimizeBatchProcessing = async (imageDataArray: any[], options?: any) => {
  return callFunction('optimizeBatchProcessing', { imageDataArray, options })
}

// Enhanced Travel History Functions
export const analyzeEnhancedTravelHistory = async (passportData?: any, flightData?: any) => {
  return callFunction('analyzeEnhancedTravelHistory', { passportData, flightData })
}

export const generateUniversalReport = async (reportType: string | any, options?: any) => {
  return callFunction('generateUniversalReport', { reportType, options })
}

export const getAvailableCountries = async () => {
  return callFunction('getAvailableCountries', {})
}

// Universal reporting functions
export const listUniversalReports = async (limit: number = 500) => {
  return callFunction('listUniversalReports', { limit })
}

export const deleteUniversalReport = async (reportId: string) => {
  return callFunction('deleteUniversalReport', { reportId })
}

// Booking ingestion functions
export const getBookingIngestionStatus = async () => {
  return callFunction('getBookingIngestionStatus', {})
}

export const ingestGmailBookings = async (options?: { maxResults?: number; query?: string }) => {
  return callFunction('ingestGmailBookings', options || {})
}

export const ingestOffice365Bookings = async (options?: { maxResults?: number; providers?: string[]; days?: number }) => {
  return callFunction('ingestOffice365Bookings', options || {})
}
