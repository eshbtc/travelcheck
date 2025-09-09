import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'
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

// Initialize Firebase Functions
const functions = getFunctions()

// Helper function to make callable function calls
const callFunction = async <T = any>(functionName: string, data: any = {}): Promise<T> => {
  try {
    const callable = httpsCallable(functions, functionName, { limitedUseAppCheckTokens: true })
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

// Email Functions
export const parseGmailEmails = async (accessToken: string) => {
  return callFunction('parseGmailEmails', { accessToken })
}

// Travel History Functions
export const analyzeTravelHistory = async () => {
  return callFunction('analyzeTravelHistory', {})
}

// Report Functions
export const generateUSCISReport = async (format: 'pdf' | 'json' = 'pdf') => {
  return callFunction('generateUSCISReport', { format })
}

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
  return callFunction('getFlightEmails', {})
}

export const deletePassportScan = async (scanId: string) => {
  return callFunction('deletePassportScan', { scanId })
}

export const deleteFlightEmail = async (emailId: string) => {
  return callFunction('deleteFlightEmail', { emailId })
}

// Email Integration Functions
export const getGmailAuthUrl = async () => {
  return callFunction('getGmailAuthUrl', {})
}

export const handleGmailCallback = async (code: string, state: string) => {
  return callFunction('handleGmailCallback', { code, state })
}

export const disconnectGmailAccount = async () => {
  return callFunction('disconnectGmail', {})
}

export const getGmailConnectionStatus = async (): Promise<FirebaseFunctionResponse<GmailConnectionStatus>> => {
  return callFunction<FirebaseFunctionResponse<GmailConnectionStatus>>('getGmailConnectionStatus', {})
}

export const syncGmailEmails = async (): Promise<FirebaseFunctionResponse<EmailSyncResult>> => {
  return callFunction<FirebaseFunctionResponse<EmailSyncResult>>('syncGmail', {})
}

export const getOffice365AuthUrl = async () => {
  return callFunction('getOffice365AuthUrl', {})
}

export const handleOffice365Callback = async (code: string, state: string) => {
  return callFunction('handleOffice365Callback', { code, state })
}

export const disconnectOffice365Account = async () => {
  return callFunction('disconnectOffice365', {})
}

export const getOffice365ConnectionStatus = async () => {
  return callFunction('getOffice365ConnectionStatus', {})
}

export const syncOffice365Emails = async () => {
  return callFunction('syncOffice365', {})
}

// Utility Functions
export const healthCheck = async () => {
  return callFunction('healthCheck', {})
}

export const getSystemStatus = async () => {
  return callFunction('getSystemStatus', {})
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
