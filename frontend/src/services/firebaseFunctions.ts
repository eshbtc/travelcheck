import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'

// Initialize Firebase Functions
const functions = getFunctions()

// Helper function to make callable function calls
const callFunction = async (functionName: string, data: any = {}) => {
  try {
    const callable = httpsCallable(functions, functionName)
    const result = await callable(data)
    return result.data
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error)
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
export const getUserProfile = async () => {
  return callFunction('getUserProfile', {})
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

export const getGmailConnectionStatus = async () => {
  return callFunction('getGmailConnectionStatus', {})
}

export const connectOffice365Account = async (authCode: string) => {
  return callFunction('connectOffice365Account', { authCode })
}

export const disconnectOffice365Account = async () => {
  return callFunction('disconnectOffice365Account', {})
}

// Utility Functions
export const healthCheck = async () => {
  return callFunction('healthCheck', {})
}

export const getSystemStatus = async () => {
  return callFunction('getSystemStatus', {})
}
