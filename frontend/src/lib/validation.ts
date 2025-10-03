import { z } from 'zod'

// Common schemas
export const UUIDSchema = z.string().uuid('Invalid UUID format')

export const DateSchema = z.string().refine((val) => {
  return !isNaN(Date.parse(val))
}, 'Invalid date format')

export const EmailSchema = z.string().email('Invalid email format')

// User profile validation
export const UserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: EmailSchema.optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true)
  }).optional()
})

// Travel history validation
export const TravelHistorySchema = z.object({
  passportData: z.object({
    stamps: z.array(z.object({
      country: z.string().min(2, 'Country is required'),
      date: DateSchema,
      location: z.string().optional(),
      type: z.enum(['entry', 'exit']).optional()
    }))
  }).optional(),
  flightData: z.object({
    bookings: z.array(z.object({
      from: z.string().min(3, 'Origin airport is required'),
      to: z.string().min(3, 'Destination airport is required'),
      date: DateSchema,
      airline: z.string().optional(),
      flightNumber: z.string().optional()
    }))
  }).optional()
})

// Passport scan validation
export const PassportScanSchema = z.object({
  fileUrl: z.string().url('Invalid file URL'),
  fileName: z.string().optional(),
  analysisResults: z.object({
    personalInfo: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      passportNumber: z.string().optional(),
      nationality: z.string().optional()
    }).optional(),
    stamps: z.array(z.object({
      country: z.string(),
      date: z.string().optional(),
      location: z.string().optional(),
      confidence: z.number().min(0).max(1).optional()
    })).optional()
  }).optional()
})

// Batch processing validation
export const BatchProcessSchema = z.object({
  images: z.array(z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().min(1, 'File size must be greater than 0'),
    fileType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, 'Invalid image type')
  })).min(1, 'At least one image is required').max(20, 'Maximum 20 images allowed')
})

// Report generation validation
export const ReportSchema = z.object({
  reportType: z.object({
    category: z.enum(['travel_summary', 'uscis_report', 'presence_calendar']),
    format: z.enum(['pdf', 'json', 'csv']).optional().default('pdf')
  }),
  dateRange: z.object({
    start: DateSchema.optional(),
    end: DateSchema.optional()
  }).optional(),
  options: z.object({
    includeStamps: z.boolean().default(true),
    includeFlights: z.boolean().default(true),
    groupByCountry: z.boolean().default(false)
  }).optional()
})

// Duplicate resolution validation
export const DuplicateResolutionSchema = z.object({
  duplicateId: UUIDSchema,
  resolution: z.enum(['keep_first', 'keep_second', 'keep_both']).default('keep_first')
})

// Admin user role validation
export const UserRoleSchema = z.object({
  targetUserId: UUIDSchema,
  role: z.enum(['admin', 'user'])
})

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional()
})

// Success response schema
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  message: z.string().optional()
})

// Generic API response
export const ApiResponseSchema = z.union([
  SuccessResponseSchema,
  ErrorResponseSchema
])

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): {
  success: boolean
  data?: T
  error?: string
} {
  try {
    const result = schema.parse(input)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { 
        success: false, 
        error: `${firstError.path.join('.')}: ${firstError.message}` 
      }
    }
    return { 
      success: false, 
      error: 'Validation failed' 
    }
  }
}

// Sanitize input to prevent sensitive data logging
export function sanitizeForLogging(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input
  }

  const sensitive = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session']
  const sanitized = { ...input }

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase()
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key])
    }
  })

  return sanitized
}