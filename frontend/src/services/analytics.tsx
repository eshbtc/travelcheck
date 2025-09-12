// Mock Analytics service - Firebase removed, keeping interface for compatibility

import React from 'react';

// Mock user type for compatibility
type User = { id: string; email?: string; [key: string]: any }

// Analytics event names
export const AnalyticsEvents = {
  // Authentication events
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'sign_up',
  PASSWORD_RESET: 'password_reset',
  
  // Navigation events
  PAGE_VIEW: 'page_view',
  NAVIGATION: 'navigation',
  
  // Feature usage events
  PASSPORT_UPLOAD: 'passport_upload',
  PASSPORT_PROCESS: 'passport_process',
  EMAIL_CONNECT: 'email_connect',
  EMAIL_SYNC: 'email_sync',
  TRAVEL_ENTRY_CREATE: 'travel_entry_create',
  TRAVEL_ENTRY_UPDATE: 'travel_entry_update',
  TRAVEL_ENTRY_DELETE: 'travel_entry_delete',
  REPORT_GENERATE: 'report_generate',
  REPORT_EXPORT: 'report_export',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  OCR_ERROR: 'ocr_error',
  EMAIL_PARSE_ERROR: 'email_parse_error',
  
  // Performance events
  PAGE_LOAD_TIME: 'page_load_time',
  FUNCTION_CALL_TIME: 'function_call_time',
  IMAGE_PROCESSING_TIME: 'image_processing_time',
  
  // User engagement events
  FEATURE_DISCOVERY: 'feature_discovery',
  HELP_ACCESSED: 'help_accessed',
  SETTINGS_CHANGED: 'settings_changed',
  
  // Business events
  TRAVEL_HISTORY_COMPLETE: 'travel_history_complete',
  USCIS_REPORT_GENERATED: 'uscis_report_generated',
  EMAIL_ACCOUNT_CONNECTED: 'email_account_connected',
  PASSPORT_DATA_EXTRACTED: 'passport_data_extracted'
}

// Mock Analytics service class
class AnalyticsService {
  private isInitialized = true // Always true for mock

  constructor() {
    console.log('Mock Analytics service initialized')
  }

  // Check if analytics is available
  isAvailable(): boolean {
    return this.isInitialized
  }

  // Set user ID for analytics
  setUser(user: User | null) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Analytics: Set user', user?.id)
    }
  }

  // Log custom event
  logEvent(eventName: string, parameters?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Analytics Event:', eventName, parameters)
    }
  }

  // Authentication events
  logLogin(method: string = 'email') {
    this.logEvent(AnalyticsEvents.LOGIN, { method })
  }

  logLogout() {
    this.logEvent(AnalyticsEvents.LOGOUT)
  }

  logSignup(method: string = 'email') {
    this.logEvent(AnalyticsEvents.SIGNUP, { method })
  }

  logPasswordReset() {
    this.logEvent(AnalyticsEvents.PASSWORD_RESET)
  }

  // Navigation events
  logPageView(pageName: string, pageTitle?: string) {
    this.logEvent(AnalyticsEvents.PAGE_VIEW, {
      page_name: pageName,
      page_title: pageTitle || pageName
    })
  }

  logNavigation(from: string, to: string) {
    this.logEvent(AnalyticsEvents.NAVIGATION, { from, to })
  }

  // Feature usage events
  logPassportUpload(success: boolean, fileSize?: number, processingTime?: number) {
    this.logEvent(AnalyticsEvents.PASSPORT_UPLOAD, {
      success,
      file_size: fileSize,
      processing_time: processingTime
    })
  }

  logPassportProcess(success: boolean, textFound: boolean, processingTime?: number) {
    this.logEvent(AnalyticsEvents.PASSPORT_PROCESS, {
      success,
      text_found: textFound,
      processing_time: processingTime
    })
  }

  logEmailConnect(provider: 'gmail' | 'office365', success: boolean) {
    this.logEvent(AnalyticsEvents.EMAIL_CONNECT, {
      provider,
      success
    })
  }

  logEmailSync(provider: 'gmail' | 'office365', success: boolean, emailCount?: number) {
    this.logEvent(AnalyticsEvents.EMAIL_SYNC, {
      provider,
      success,
      email_count: emailCount
    })
  }

  logTravelEntryCreate(success: boolean, entryType: 'manual' | 'email' | 'passport') {
    this.logEvent(AnalyticsEvents.TRAVEL_ENTRY_CREATE, {
      success,
      entry_type: entryType
    })
  }

  logTravelEntryUpdate(success: boolean) {
    this.logEvent(AnalyticsEvents.TRAVEL_ENTRY_UPDATE, { success })
  }

  logTravelEntryDelete(success: boolean) {
    this.logEvent(AnalyticsEvents.TRAVEL_ENTRY_DELETE, { success })
  }

  logReportGenerate(success: boolean, reportType: 'uscis' | 'summary', entryCount?: number) {
    this.logEvent(AnalyticsEvents.REPORT_GENERATE, {
      success,
      report_type: reportType,
      entry_count: entryCount
    })
  }

  logReportExport(success: boolean, format: 'pdf' | 'json', reportType: 'uscis' | 'summary') {
    this.logEvent(AnalyticsEvents.REPORT_EXPORT, {
      success,
      format,
      report_type: reportType
    })
  }

  // Error events
  logError(errorCode: string, errorMessage: string, context?: string) {
    this.logEvent(AnalyticsEvents.ERROR_OCCURRED, {
      error_code: errorCode,
      error_message: errorMessage,
      context
    })
  }

  logOcrError(errorMessage: string, imageSize?: number) {
    this.logEvent(AnalyticsEvents.OCR_ERROR, {
      error_message: errorMessage,
      image_size: imageSize
    })
  }

  logEmailParseError(provider: 'gmail' | 'office365', errorMessage: string) {
    this.logEvent(AnalyticsEvents.EMAIL_PARSE_ERROR, {
      provider,
      error_message: errorMessage
    })
  }

  // Performance events
  logPageLoadTime(pageName: string, loadTime: number) {
    this.logEvent(AnalyticsEvents.PAGE_LOAD_TIME, {
      page_name: pageName,
      load_time: loadTime
    })
  }

  logFunctionCallTime(functionName: string, callTime: number, success: boolean) {
    this.logEvent(AnalyticsEvents.FUNCTION_CALL_TIME, {
      function_name: functionName,
      call_time: callTime,
      success
    })
  }

  logImageProcessingTime(processingTime: number, imageSize: number, success: boolean) {
    this.logEvent(AnalyticsEvents.IMAGE_PROCESSING_TIME, {
      processing_time: processingTime,
      image_size: imageSize,
      success
    })
  }

  // User engagement events
  logFeatureDiscovery(featureName: string, discoveryMethod: 'navigation' | 'help' | 'tutorial') {
    this.logEvent(AnalyticsEvents.FEATURE_DISCOVERY, {
      feature_name: featureName,
      discovery_method: discoveryMethod
    })
  }

  logHelpAccessed(helpTopic: string) {
    this.logEvent(AnalyticsEvents.HELP_ACCESSED, { help_topic: helpTopic })
  }

  logSettingsChanged(settingName: string, oldValue: any, newValue: any) {
    this.logEvent(AnalyticsEvents.SETTINGS_CHANGED, {
      setting_name: settingName,
      old_value: oldValue,
      new_value: newValue
    })
  }

  // Business events
  logTravelHistoryComplete(entryCount: number, dateRange: { start: string; end: string }) {
    this.logEvent(AnalyticsEvents.TRAVEL_HISTORY_COMPLETE, {
      entry_count: entryCount,
      date_range: dateRange
    })
  }

  logUscisReportGenerated(success: boolean, entryCount: number, dateRange: { start: string; end: string }) {
    this.logEvent(AnalyticsEvents.USCIS_REPORT_GENERATED, {
      success,
      entry_count: entryCount,
      date_range: dateRange
    })
  }

  logEmailAccountConnected(provider: 'gmail' | 'office365', success: boolean) {
    this.logEvent(AnalyticsEvents.EMAIL_ACCOUNT_CONNECTED, {
      provider,
      success
    })
  }

  logPassportDataExtracted(success: boolean, dataFields: string[]) {
    this.logEvent(AnalyticsEvents.PASSPORT_DATA_EXTRACTED, {
      success,
      data_fields: dataFields
    })
  }
}

// Create singleton instance
export const analytics = new AnalyticsService()

// Hook for using analytics in React components
export function useAnalytics() {
  return analytics
}

// Higher-order component for automatic page view tracking
export function withAnalytics<T extends object>(
  Component: React.ComponentType<T>,
  pageName: string
) {
  const WrappedComponent = (props: T) => {
    React.useEffect(() => {
      analytics.logPageView(pageName)
    }, [])

    return <Component {...props} />
  }

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Performance tracking utilities
export class PerformanceTracker {
  private startTimes: Map<string, number> = new Map()

  startTiming(key: string): void {
    this.startTimes.set(key, performance.now())
  }

  endTiming(key: string): number | null {
    const startTime = this.startTimes.get(key)
    if (!startTime) return null

    const duration = performance.now() - startTime
    this.startTimes.delete(key)
    return duration
  }

  trackPageLoad(pageName: string): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now()
        analytics.logPageLoadTime(pageName, loadTime)
      })
    }
  }

  trackFunctionCall<T>(
    functionName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startTiming(functionName)
    
    return fn()
      .then(result => {
        const callTime = this.endTiming(functionName)
        if (callTime !== null) {
          analytics.logFunctionCallTime(functionName, callTime, true)
        }
        return result
      })
      .catch(error => {
        const callTime = this.endTiming(functionName)
        if (callTime !== null) {
          analytics.logFunctionCallTime(functionName, callTime, false)
        }
        throw error
      })
  }
}

export const performanceTracker = new PerformanceTracker()