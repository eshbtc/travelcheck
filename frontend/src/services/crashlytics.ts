// Firebase Crashlytics service for error tracking and crash reporting

import { getCrashlytics, log, setUserId, setCustomKey, recordError } from 'firebase/crashlytics'
import { getApp } from 'firebase/app'
import { User } from 'firebase/auth'

// Crashlytics service class
class CrashlyticsService {
  private crashlytics: any = null
  private isInitialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      // Only initialize in browser environment
      if (typeof window !== 'undefined') {
        const app = getApp()
        this.crashlytics = getCrashlytics(app)
        this.isInitialized = true
        console.log('Crashlytics initialized successfully')
      }
    } catch (error) {
      console.warn('Crashlytics initialization failed:', error)
      this.isInitialized = false
    }
  }

  // Check if crashlytics is available
  isAvailable(): boolean {
    return this.isInitialized && this.crashlytics !== null
  }

  // Set user ID for crash reporting
  setUser(user: User | null) {
    if (!this.isAvailable() || !user) return

    try {
      setUserId(this.crashlytics, user.uid)
      setCustomKey(this.crashlytics, 'user_email', user.email || '')
      setCustomKey(this.crashlytics, 'email_verified', user.emailVerified)
      setCustomKey(this.crashlytics, 'created_at', user.metadata.creationTime || '')
      setCustomKey(this.crashlytics, 'last_sign_in', user.metadata.lastSignInTime || '')
    } catch (error) {
      console.warn('Failed to set user crashlytics:', error)
    }
  }

  // Log custom message
  log(message: string) {
    if (!this.isAvailable()) return

    try {
      log(this.crashlytics, message)
    } catch (error) {
      console.warn('Failed to log crashlytics message:', error)
    }
  }

  // Set custom key-value pair
  setCustomKey(key: string, value: any) {
    if (!this.isAvailable()) return

    try {
      setCustomKey(this.crashlytics, key, value)
    } catch (error) {
      console.warn('Failed to set custom key:', error)
    }
  }

  // Record error
  recordError(error: Error, context?: string) {
    if (!this.isAvailable()) return

    try {
      // Add context information
      if (context) {
        this.setCustomKey('error_context', context)
      }
      
      // Add timestamp
      this.setCustomKey('error_timestamp', new Date().toISOString())
      
      // Record the error
      recordError(this.crashlytics, error)
    } catch (crashlyticsError) {
      console.warn('Failed to record error in crashlytics:', crashlyticsError)
    }
  }

  // Record non-fatal error
  recordNonFatalError(error: Error, context?: string) {
    if (!this.isAvailable()) return

    try {
      // Add context information
      if (context) {
        this.setCustomKey('non_fatal_error_context', context)
      }
      
      // Add timestamp
      this.setCustomKey('non_fatal_error_timestamp', new Date().toISOString())
      
      // Record the error
      recordError(this.crashlytics, error)
    } catch (crashlyticsError) {
      console.warn('Failed to record non-fatal error in crashlytics:', crashlyticsError)
    }
  }

  // Log user action
  logUserAction(action: string, details?: Record<string, any>) {
    if (!this.isAvailable()) return

    try {
      this.log(`User action: ${action}`)
      
      if (details) {
        Object.entries(details).forEach(([key, value]) => {
          this.setCustomKey(`action_${key}`, value)
        })
      }
    } catch (error) {
      console.warn('Failed to log user action:', error)
    }
  }

  // Log feature usage
  logFeatureUsage(feature: string, success: boolean, details?: Record<string, any>) {
    if (!this.isAvailable()) return

    try {
      this.log(`Feature usage: ${feature} - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('feature_name', feature)
      this.setCustomKey('feature_success', success)
      
      if (details) {
        Object.entries(details).forEach(([key, value]) => {
          this.setCustomKey(`feature_${key}`, value)
        })
      }
    } catch (error) {
      console.warn('Failed to log feature usage:', error)
    }
  }

  // Log performance metrics
  logPerformance(metric: string, value: number, unit: string = 'ms') {
    if (!this.isAvailable()) return

    try {
      this.log(`Performance: ${metric} = ${value}${unit}`)
      this.setCustomKey(`perf_${metric}`, value)
      this.setCustomKey(`perf_${metric}_unit`, unit)
    } catch (error) {
      console.warn('Failed to log performance metric:', error)
    }
  }

  // Log authentication events
  logAuthEvent(event: string, success: boolean, method?: string) {
    if (!this.isAvailable()) return

    try {
      this.log(`Auth event: ${event} - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('auth_event', event)
      this.setCustomKey('auth_success', success)
      
      if (method) {
        this.setCustomKey('auth_method', method)
      }
    } catch (error) {
      console.warn('Failed to log auth event:', error)
    }
  }

  // Log API calls
  logApiCall(endpoint: string, method: string, success: boolean, responseTime?: number) {
    if (!this.isAvailable()) return

    try {
      this.log(`API call: ${method} ${endpoint} - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('api_endpoint', endpoint)
      this.setCustomKey('api_method', method)
      this.setCustomKey('api_success', success)
      
      if (responseTime !== undefined) {
        this.setCustomKey('api_response_time', responseTime)
      }
    } catch (error) {
      console.warn('Failed to log API call:', error)
    }
  }

  // Log file operations
  logFileOperation(operation: string, fileName: string, success: boolean, fileSize?: number) {
    if (!this.isAvailable()) return

    try {
      this.log(`File operation: ${operation} ${fileName} - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('file_operation', operation)
      this.setCustomKey('file_name', fileName)
      this.setCustomKey('file_success', success)
      
      if (fileSize !== undefined) {
        this.setCustomKey('file_size', fileSize)
      }
    } catch (error) {
      console.warn('Failed to log file operation:', error)
    }
  }

  // Log OCR operations
  logOcrOperation(success: boolean, imageSize?: number, processingTime?: number, textFound?: boolean) {
    if (!this.isAvailable()) return

    try {
      this.log(`OCR operation - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('ocr_success', success)
      
      if (imageSize !== undefined) {
        this.setCustomKey('ocr_image_size', imageSize)
      }
      
      if (processingTime !== undefined) {
        this.setCustomKey('ocr_processing_time', processingTime)
      }
      
      if (textFound !== undefined) {
        this.setCustomKey('ocr_text_found', textFound)
      }
    } catch (error) {
      console.warn('Failed to log OCR operation:', error)
    }
  }

  // Log email operations
  logEmailOperation(provider: 'gmail' | 'office365', operation: string, success: boolean, emailCount?: number) {
    if (!this.isAvailable()) return

    try {
      this.log(`Email operation: ${provider} ${operation} - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('email_provider', provider)
      this.setCustomKey('email_operation', operation)
      this.setCustomKey('email_success', success)
      
      if (emailCount !== undefined) {
        this.setCustomKey('email_count', emailCount)
      }
    } catch (error) {
      console.warn('Failed to log email operation:', error)
    }
  }

  // Log report generation
  logReportGeneration(reportType: 'uscis' | 'summary', success: boolean, entryCount?: number, processingTime?: number) {
    if (!this.isAvailable()) return

    try {
      this.log(`Report generation: ${reportType} - ${success ? 'success' : 'failed'}`)
      this.setCustomKey('report_type', reportType)
      this.setCustomKey('report_success', success)
      
      if (entryCount !== undefined) {
        this.setCustomKey('report_entry_count', entryCount)
      }
      
      if (processingTime !== undefined) {
        this.setCustomKey('report_processing_time', processingTime)
      }
    } catch (error) {
      console.warn('Failed to log report generation:', error)
    }
  }

  // Clear user data
  clearUser() {
    if (!this.isAvailable()) return

    try {
      setUserId(this.crashlytics, null)
    } catch (error) {
      console.warn('Failed to clear user data:', error)
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
  crashlytics.setCustomKey('error_info', JSON.stringify(errorInfo))
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
