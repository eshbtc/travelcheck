// Validation utilities for forms and data

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  message?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export class Validator {
  private rules: Record<string, ValidationRule[]> = {}

  addRule(field: string, rule: ValidationRule) {
    if (!this.rules[field]) {
      this.rules[field] = []
    }
    this.rules[field].push(rule)
    return this
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {}

    for (const [field, rules] of Object.entries(this.rules)) {
      const value = data[field]
      
      for (const rule of rules) {
        const error = this.validateField(value, rule, field)
        if (error) {
          errors[field] = error
          break // Stop at first error for this field
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  private validateField(value: any, rule: ValidationRule, field: string): string | null {
    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      return rule.message || `${field} is required`
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `${field} must be at least ${rule.minLength} characters`
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `${field} must be no more than ${rule.maxLength} characters`
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `${field} format is invalid`
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        return customError
      }
    }

    return null
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  name: /^[a-zA-Z\s\-']+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}$/,
  currency: /^\d+(\.\d{2})?$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
  passport: /^[A-Z]{1,2}\d{6,9}$/
}

// Common validation rules
export const CommonRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'This field is required'
  }),

  email: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.email,
    message: message || 'Please enter a valid email address'
  }),

  password: (minLength: number = 8, message?: string): ValidationRule => ({
    minLength,
    pattern: ValidationPatterns.password,
    message: message || `Password must be at least ${minLength} characters and contain uppercase, lowercase, number, and special character`
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Must be at least ${length} characters`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Must be no more than ${length} characters`
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.phone,
    message: message || 'Please enter a valid phone number'
  }),

  url: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.url,
    message: message || 'Please enter a valid URL'
  }),

  name: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.name,
    message: message || 'Please enter a valid name'
  }),

  date: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.date,
    message: message || 'Please enter a valid date (YYYY-MM-DD)'
  }),

  passport: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.passport,
    message: message || 'Please enter a valid passport number'
  }),

  confirmPassword: (password: string, message?: string): ValidationRule => ({
    custom: (value: string) => {
      if (value !== password) {
        return message || 'Passwords do not match'
      }
      return null
    }
  }),

  age: (minAge: number = 18, message?: string): ValidationRule => ({
    custom: (value: string) => {
      if (!value) return null
      
      const birthDate = new Date(value)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age < minAge ? (message || `Must be at least ${minAge} years old`) : null
      }
      
      return age < minAge ? (message || `Must be at least ${minAge} years old`) : null
    }
  }),

  fileSize: (maxSizeMB: number, message?: string): ValidationRule => ({
    custom: (value: File) => {
      if (!value) return null
      
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      if (value.size > maxSizeBytes) {
        return message || `File size must be less than ${maxSizeMB}MB`
      }
      return null
    }
  }),

  fileType: (allowedTypes: string[], message?: string): ValidationRule => ({
    custom: (value: File) => {
      if (!value) return null
      
      const fileType = value.type
      if (!allowedTypes.includes(fileType)) {
        return message || `File type must be one of: ${allowedTypes.join(', ')}`
      }
      return null
    }
  })
}

// Predefined validators for common forms
export const FormValidators = {
  login: new Validator()
    .addRule('email', CommonRules.required('Email is required'))
    .addRule('email', CommonRules.email())
    .addRule('password', CommonRules.required('Password is required')),

  register: new Validator()
    .addRule('fullName', CommonRules.required('Full name is required'))
    .addRule('fullName', CommonRules.name())
    .addRule('email', CommonRules.required('Email is required'))
    .addRule('email', CommonRules.email())
    .addRule('password', CommonRules.required('Password is required'))
    .addRule('password', CommonRules.password())
    .addRule('confirmPassword', CommonRules.required('Please confirm your password')),

  profile: new Validator()
    .addRule('fullName', CommonRules.required('Full name is required'))
    .addRule('fullName', CommonRules.name())
    .addRule('email', CommonRules.required('Email is required'))
    .addRule('email', CommonRules.email())
    .addRule('phone', CommonRules.phone()),

  passport: new Validator()
    .addRule('passportNumber', CommonRules.required('Passport number is required'))
    .addRule('passportNumber', CommonRules.passport())
    .addRule('country', CommonRules.required('Country is required'))
    .addRule('issueDate', CommonRules.required('Issue date is required'))
    .addRule('issueDate', CommonRules.date())
    .addRule('expiryDate', CommonRules.required('Expiry date is required'))
    .addRule('expiryDate', CommonRules.date()),

  travelEntry: new Validator()
    .addRule('departureDate', CommonRules.required('Departure date is required'))
    .addRule('departureDate', CommonRules.date())
    .addRule('returnDate', CommonRules.required('Return date is required'))
    .addRule('returnDate', CommonRules.date())
    .addRule('destination', CommonRules.required('Destination is required'))
    .addRule('purpose', CommonRules.required('Purpose is required'))
}

// Utility functions
export function validateEmail(email: string): boolean {
  return ValidationPatterns.email.test(email)
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function formatValidationErrors(errors: Record<string, string>): string {
  return Object.values(errors).join(', ')
}
