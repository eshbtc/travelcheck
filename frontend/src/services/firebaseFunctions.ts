import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'
import { auth } from '../lib/firebase'

// Initialize Firebase Functions
const functions = getFunctions()

// Helper function to get auth token
const getAuthToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken()
  }
  throw new Error('User not authenticated')
}

// Helper function to make authenticated function calls
const callFunction = async (functionName: string, data: any = {}) => {
  try {
    const token = await getAuthToken()
    const callable = httpsCallable(functions, functionName)
    
    // Add auth token to the data
    const requestData = {
      ...data,
      authToken: token
    }
    
    const result = await callable(requestData)
    return result.data
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error)
    throw error
  }
}

// OCR Functions
export const extractPassportData = async (imageData: string, userId: string) => {
  return callFunction('extractPassportData', { imageData, userId })
}

// Email Functions
export const parseGmailEmails = async (accessToken: string, userId: string) => {
  return callFunction('parseGmailEmails', { accessToken, userId })
}

// Travel History Functions
export const analyzeTravelHistory = async (userId: string) => {
  return callFunction('analyzeTravelHistory', { userId })
}

// Report Functions
export const generateUSCISReport = async (userId: string, format: 'pdf' | 'json' = 'pdf') => {
  return callFunction('generateUSCISReport', { userId, format })
}

// User Management Functions
export const getUserProfile = async (userId: string) => {
  return callFunction('getUserProfile', { userId })
}

export const updateUserProfile = async (userId: string, profileData: any) => {
  return callFunction('updateUserProfile', { userId, profileData })
}

// Data Management Functions
export const getTravelHistory = async (userId: string) => {
  return callFunction('getTravelHistory', { userId })
}

export const getPassportScans = async (userId: string) => {
  return callFunction('getPassportScans', { userId })
}

export const getFlightEmails = async (userId: string) => {
  return callFunction('getFlightEmails', { userId })
}

export const deletePassportScan = async (userId: string, scanId: string) => {
  return callFunction('deletePassportScan', { userId, scanId })
}

export const deleteFlightEmail = async (userId: string, emailId: string) => {
  return callFunction('deleteFlightEmail', { userId, emailId })
}

// Email Integration Functions
export const connectGmailAccount = async (userId: string, authCode: string) => {
  return callFunction('connectGmailAccount', { userId, authCode })
}

export const disconnectGmailAccount = async (userId: string) => {
  return callFunction('disconnectGmailAccount', { userId })
}

export const connectOffice365Account = async (userId: string, authCode: string) => {
  return callFunction('connectOffice365Account', { userId, authCode })
}

export const disconnectOffice365Account = async (userId: string) => {
  return callFunction('disconnectOffice365Account', { userId })
}

// Utility Functions
export const healthCheck = async () => {
  return callFunction('healthCheck')
}

export const getSystemStatus = async () => {
  return callFunction('getSystemStatus')
}
