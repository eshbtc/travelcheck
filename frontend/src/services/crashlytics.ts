// Mock Crashlytics service - Firebase removed, keeping interface for compatibility

import type { User } from '@supabase/supabase-js'

// Mock user type for compatibility
type MockUser = { id: string; email?: string; [key: string]: any }

// Crashlytics service class - now a mock implementation
class CrashlyticsService {
  private crashlytics: any = null
  private isInitialized = true // Always true for mock

  constructor() {
    console.log('Mock Crashlytics service initialized')
  }

  // Check if crashlytics is available
  isAvailable(): boolean {
    return this.isInitialized
  }

  // Set user ID for crash reporting
  setUser(user: User | MockUser | null) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics: Set user', user?.id)
    }
  }

  // Log custom message
  log(message: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Log:', message)
    }
  }

  // Set custom key-value pair
  setCustomKey(key: string, value: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Custom Key:', key, value)
    }
  }

  // Record error
  recordError(error: Error, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Mock Crashlytics Error:', error, context ? `Context: ${context}` : '')
    }
  }

  // Record non-fatal error
  recordNonFatalError(error: Error, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Mock Crashlytics Non-Fatal Error:', error, context ? `Context: ${context}` : '')
    }
  }

  // Log user action
  logUserAction(action: string, details?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics User Action:', action, details)
    }
  }

  // Log feature usage
  logFeatureUsage(feature: string, success: boolean, details?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Feature Usage:', feature, success ? 'success' : 'failed', details)
    }
  }

  // Log performance metrics
  logPerformance(metric: string, value: number, unit: string = 'ms') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Performance:', `${metric} = ${value}${unit}`)
    }
  }

  // Log authentication events
  logAuthEvent(event: string, success: boolean, method?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Auth Event:', event, success ? 'success' : 'failed', method ? `Method: ${method}` : '')
    }
  }

  // Log API calls
  logApiCall(endpoint: string, method: string, success: boolean, responseTime?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics API Call:', `${method} ${endpoint}`, success ? 'success' : 'failed', responseTime ? `${responseTime}ms` : '')
    }
  }

  // Log file operations
  logFileOperation(operation: string, fileName: string, success: boolean, fileSize?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics File Operation:', `${operation} ${fileName}`, success ? 'success' : 'failed', fileSize ? `${fileSize} bytes` : '')
    }
  }

  // Log OCR operations
  logOcrOperation(success: boolean, imageSize?: number, processingTime?: number, textFound?: boolean) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics OCR:', success ? 'success' : 'failed', {
        imageSize,
        processingTime,
        textFound
      })
    }
  }

  // Log email operations
  logEmailOperation(provider: 'gmail' | 'office365', operation: string, success: boolean, emailCount?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Email Operation:', `${provider} ${operation}`, success ? 'success' : 'failed', emailCount ? `${emailCount} emails` : '')
    }
  }

  // Log report generation
  logReportGeneration(reportType: 'uscis' | 'summary', success: boolean, entryCount?: number, processingTime?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics Report Generation:', reportType, success ? 'success' : 'failed', {
        entryCount,
        processingTime
      })
    }
  }

  // Clear user data
  clearUser() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Crashlytics: Clear user')
    }
  }
}

// Create singleton instance
export const crashlytics = new CrashlyticsService()

// Hook for using crashlytics in React components
export function useCrashlytics() {
  return crashlytics
}

// Error boundary integration
export function recordErrorInCrashlytics(error: Error, errorInfo: any, context?: string) {
  crashlytics.recordError(error, context)
  if (process.env.NODE_ENV === 'development') {
    console.log('Mock Crashlytics Error Info:', errorInfo)
  }
}

// Performance monitoring integration
export function recordPerformanceInCrashlytics(metric: string, value: number, unit: string = 'ms') {
  crashlytics.logPerformance(metric, value, unit)
}

// API call monitoring
export function recordApiCallInCrashlytics(
  endpoint: string,
  method: string,
  success: boolean,
  responseTime?: number
) {
  crashlytics.logApiCall(endpoint, method, success, responseTime)
}

// File operation monitoring
export function recordFileOperationInCrashlytics(
  operation: string,
  fileName: string,
  success: boolean,
  fileSize?: number
) {
  crashlytics.logFileOperation(operation, fileName, success, fileSize)
}