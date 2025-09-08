// Error handling utilities

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
  userId?: string
  context?: string
}

export class CustomError extends Error {
  public code: string
  public details?: any
  public timestamp: Date
  public userId?: string
  public context?: string

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: any,
    userId?: string,
    context?: string
  ) {
    super(message)
    this.name = 'CustomError'
    this.code = code
    this.details = details
    this.timestamp = new Date()
    this.userId = userId
    this.context = context
  }

  toAppError(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      userId: this.userId,
      context: this.context
    }
  }
}

// Common error codes
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_PERMISSION_DENIED: 'AUTH_PERMISSION_DENIED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Firebase errors
  FIREBASE_AUTH_ERROR: 'FIREBASE_AUTH_ERROR',
  FIREBASE_FIRESTORE_ERROR: 'FIREBASE_FIRESTORE_ERROR',
  FIREBASE_STORAGE_ERROR: 'FIREBASE_STORAGE_ERROR',
  FIREBASE_FUNCTIONS_ERROR: 'FIREBASE_FUNCTIONS_ERROR',
  
  // OAuth errors
  OAUTH_ERROR: 'OAUTH_ERROR',
  OAUTH_CANCELLED: 'OAUTH_CANCELLED',
  OAUTH_INVALID_STATE: 'OAUTH_INVALID_STATE',
  
  // OCR errors
  OCR_ERROR: 'OCR_ERROR',
  OCR_NO_TEXT_FOUND: 'OCR_NO_TEXT_FOUND',
  OCR_IMAGE_TOO_SMALL: 'OCR_IMAGE_TOO_SMALL',
  OCR_IMAGE_TOO_LARGE: 'OCR_IMAGE_TOO_LARGE',
  
  // Email parsing errors
  EMAIL_PARSE_ERROR: 'EMAIL_PARSE_ERROR',
  EMAIL_CONNECTION_ERROR: 'EMAIL_CONNECTION_ERROR',
  EMAIL_PERMISSION_ERROR: 'EMAIL_PERMISSION_ERROR',
  
  // Report generation errors
  REPORT_GENERATION_ERROR: 'REPORT_GENERATION_ERROR',
  REPORT_TEMPLATE_ERROR: 'REPORT_TEMPLATE_ERROR',
  REPORT_EXPORT_ERROR: 'REPORT_EXPORT_ERROR',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
}

// User-friendly error messages
export const ErrorMessages = {
  [ErrorCodes.AUTH_REQUIRED]: 'Please log in to continue',
  [ErrorCodes.AUTH_INVALID]: 'Invalid login credentials',
  [ErrorCodes.AUTH_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCodes.AUTH_PERMISSION_DENIED]: 'You do not have permission to perform this action',
  
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
  [ErrorCodes.REQUIRED_FIELD]: 'This field is required',
  [ErrorCodes.INVALID_FORMAT]: 'Please enter a valid format',
  [ErrorCodes.FILE_TOO_LARGE]: 'File size is too large',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type',
  
  [ErrorCodes.NETWORK_ERROR]: 'Network connection error. Please check your internet connection',
  [ErrorCodes.TIMEOUT_ERROR]: 'Request timed out. Please try again',
  [ErrorCodes.SERVER_ERROR]: 'Server error. Please try again later',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  
  [ErrorCodes.FIREBASE_AUTH_ERROR]: 'Authentication error. Please try again',
  [ErrorCodes.FIREBASE_FIRESTORE_ERROR]: 'Database error. Please try again',
  [ErrorCodes.FIREBASE_STORAGE_ERROR]: 'File storage error. Please try again',
  [ErrorCodes.FIREBASE_FUNCTIONS_ERROR]: 'Server function error. Please try again',
  
  [ErrorCodes.OAUTH_ERROR]: 'Email connection error. Please try again',
  [ErrorCodes.OAUTH_CANCELLED]: 'Email connection was cancelled',
  [ErrorCodes.OAUTH_INVALID_STATE]: 'Invalid connection state. Please try again',
  
  [ErrorCodes.OCR_ERROR]: 'Image processing error. Please try with a different image',
  [ErrorCodes.OCR_NO_TEXT_FOUND]: 'No text found in the image. Please try with a clearer image',
  [ErrorCodes.OCR_IMAGE_TOO_SMALL]: 'Image is too small. Please use a higher resolution image',
  [ErrorCodes.OCR_IMAGE_TOO_LARGE]: 'Image is too large. Please use a smaller image',
  
  [ErrorCodes.EMAIL_PARSE_ERROR]: 'Email parsing error. Please try again',
  [ErrorCodes.EMAIL_CONNECTION_ERROR]: 'Email connection error. Please check your credentials',
  [ErrorCodes.EMAIL_PERMISSION_ERROR]: 'Email permission error. Please grant necessary permissions',
  
  [ErrorCodes.REPORT_GENERATION_ERROR]: 'Report generation error. Please try again',
  [ErrorCodes.REPORT_TEMPLATE_ERROR]: 'Report template error. Please contact support',
  [ErrorCodes.REPORT_EXPORT_ERROR]: 'Report export error. Please try again',
  
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal error. Please contact support',
  [ErrorCodes.NOT_IMPLEMENTED]: 'This feature is not yet implemented'
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: AppError[] = []
  private maxLogSize = 100

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // Handle and log error
  handleError(error: Error | CustomError, context?: string, userId?: string): AppError {
    let appError: AppError

    if (error instanceof CustomError) {
      appError = error.toAppError()
    } else {
      appError = {
        code: this.getErrorCode(error),
        message: this.getErrorMessage(error),
        details: error.stack,
        timestamp: new Date(),
        userId,
        context
      }
    }

    // Log error
    this.logError(appError)

    // Send to crash reporting service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(appError)
    }

    return appError
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error: Error | CustomError): string {
    if (error instanceof CustomError) {
      return ErrorMessages[error.code] || error.message
    }

    const code = this.getErrorCode(error)
    return ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR]
  }

  // Get error code from error
  private getErrorCode(error: Error): string {
    // Firebase errors
    if (error.message.includes('auth/')) {
      return ErrorCodes.FIREBASE_AUTH_ERROR
    }
    if (error.message.includes('firestore/')) {
      return ErrorCodes.FIREBASE_FIRESTORE_ERROR
    }
    if (error.message.includes('storage/')) {
      return ErrorCodes.FIREBASE_STORAGE_ERROR
    }
    if (error.message.includes('functions/')) {
      return ErrorCodes.FIREBASE_FUNCTIONS_ERROR
    }

    // Network errors
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return ErrorCodes.NETWORK_ERROR
    }
    if (error.message.includes('timeout')) {
      return ErrorCodes.TIMEOUT_ERROR
    }

    // OAuth errors
    if (error.message.includes('oauth') || error.message.includes('OAuth')) {
      return ErrorCodes.OAUTH_ERROR
    }

    // OCR errors
    if (error.message.includes('OCR') || error.message.includes('vision')) {
      return ErrorCodes.OCR_ERROR
    }

    // Email errors
    if (error.message.includes('email') || error.message.includes('gmail')) {
      return ErrorCodes.EMAIL_PARSE_ERROR
    }

    return ErrorCodes.UNKNOWN_ERROR
  }

  // Get error message
  private getErrorMessage(error: Error): string {
    return error.message || 'An unexpected error occurred'
  }

  // Log error locally
  private logError(error: AppError): void {
    this.errorLog.unshift(error)
    
    // Keep only the most recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', error)
    }
  }

  // Report error to external service
  private reportError(error: AppError): void {
    // TODO: Implement crash reporting service integration
    // Example: Firebase Crashlytics, Sentry, etc.
    
    // For now, just log to console
    console.error('Error reported:', error)
  }

  // Get error log
  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }

  // Get error statistics
  getErrorStats(): { total: number; byCode: Record<string, number> } {
    const byCode: Record<string, number> = {}
    
    this.errorLog.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1
    })

    return {
      total: this.errorLog.length,
      byCode
    }
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance()

// Utility functions
export function createError(
  message: string,
  code: string = ErrorCodes.UNKNOWN_ERROR,
  details?: any,
  userId?: string,
  context?: string
): CustomError {
  return new CustomError(message, code, details, userId, context)
}

export function handleError(
  error: Error | CustomError,
  context?: string,
  userId?: string
): AppError {
  return errorHandler.handleError(error, context, userId)
}

export function getUserFriendlyMessage(error: Error | CustomError): string {
  return errorHandler.getUserFriendlyMessage(error)
}

// React error boundary helper
export function getErrorBoundaryProps(onError?: (error: Error, errorInfo: any) => void) {
  return {
    onError: (error: Error, errorInfo: any) => {
      handleError(error, 'ErrorBoundary')
      if (onError) {
        onError(error, errorInfo)
      }
    }
  }
}

// Promise error handler
export function handlePromiseError<T>(
  promise: Promise<T>,
  context?: string,
  userId?: string
): Promise<T> {
  return promise.catch((error: Error) => {
    handleError(error, context, userId)
    throw error
  })
}

// Async function wrapper
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error as Error, context)
      throw error
    }
  }
}
