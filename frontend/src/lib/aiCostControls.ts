/**
 * AI Cost Control and Payload Validation
 * Prevents excessive AI usage and protects against large payloads
 */

import { validateInput, sanitizeForLogging } from './validation'
import { z } from 'zod'

// Cost limits and thresholds
export const AI_LIMITS = {
  // File size limits (bytes)
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB per image
  MAX_BATCH_SIZE: 50 * 1024 * 1024, // 50MB total batch
  MAX_IMAGES_PER_BATCH: 20,         // Max 20 images per batch
  
  // Usage limits per user per day
  MAX_ANALYSIS_REQUESTS_PER_DAY: 100,
  MAX_BATCH_REQUESTS_PER_DAY: 10,
  MAX_SIMULATION_REQUESTS_PER_DAY: 50,
  
  // Content limits
  MAX_TRAVEL_ENTRIES_FOR_ANALYSIS: 10000,
  MAX_SCENARIO_CHANGES: 50,
  
  // Rate limits
  AI_REQUESTS_PER_MINUTE: 30,
  BATCH_REQUESTS_PER_HOUR: 5
}

// Validation schemas for AI endpoints
const ImageValidationSchema = z.object({
  file: z.instanceof(File).optional(),
  fileName: z.string().min(1, 'File name is required').max(255),
  fileSize: z.number().min(1, 'File size must be greater than 0').max(AI_LIMITS.MAX_IMAGE_SIZE),
  fileType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, 'Invalid image type')
})

const BatchProcessSchema = z.object({
  images: z.array(ImageValidationSchema)
    .min(1, 'At least one image is required')
    .max(AI_LIMITS.MAX_IMAGES_PER_BATCH, `Maximum ${AI_LIMITS.MAX_IMAGES_PER_BATCH} images allowed`),
  totalSize: z.number().max(AI_LIMITS.MAX_BATCH_SIZE, 'Total batch size too large')
})

// Usage tracking store (use Redis in production)
class UsageTracker {
  private dailyUsage = new Map<string, {
    date: string
    analysisRequests: number
    batchRequests: number
    simulationRequests: number
  }>()
  
  private minuteUsage = new Map<string, {
    timestamp: number
    requests: number
  }>()
  
  getDailyKey(userId: string): string {
    const today = new Date().toISOString().split('T')[0]
    return `${userId}:${today}`
  }
  
  getMinuteKey(userId: string): string {
    const minute = Math.floor(Date.now() / 60000)
    return `${userId}:${minute}`
  }
  
  trackDailyUsage(userId: string, type: 'analysis' | 'batch' | 'simulation'): boolean {
    const key = this.getDailyKey(userId)
    const today = new Date().toISOString().split('T')[0]
    
    let usage = this.dailyUsage.get(key)
    if (!usage || usage.date !== today) {
      usage = {
        date: today,
        analysisRequests: 0,
        batchRequests: 0,
        simulationRequests: 0
      }
    }
    
    // Check limits before incrementing
    switch (type) {
      case 'analysis':
        if (usage.analysisRequests >= AI_LIMITS.MAX_ANALYSIS_REQUESTS_PER_DAY) {
          return false
        }
        usage.analysisRequests++
        break
      case 'batch':
        if (usage.batchRequests >= AI_LIMITS.MAX_BATCH_REQUESTS_PER_DAY) {
          return false
        }
        usage.batchRequests++
        break
      case 'simulation':
        if (usage.simulationRequests >= AI_LIMITS.MAX_SIMULATION_REQUESTS_PER_DAY) {
          return false
        }
        usage.simulationRequests++
        break
    }
    
    this.dailyUsage.set(key, usage)
    return true
  }
  
  trackMinuteUsage(userId: string): boolean {
    const key = this.getMinuteKey(userId)
    const currentMinute = Math.floor(Date.now() / 60000)
    
    let usage = this.minuteUsage.get(key)
    if (!usage || Math.floor(usage.timestamp / 60000) !== currentMinute) {
      usage = {
        timestamp: Date.now(),
        requests: 0
      }
    }
    
    if (usage.requests >= AI_LIMITS.AI_REQUESTS_PER_MINUTE) {
      return false
    }
    
    usage.requests++
    this.minuteUsage.set(key, usage)
    return true
  }
  
  getDailyUsage(userId: string) {
    const key = this.getDailyKey(userId)
    return this.dailyUsage.get(key) || {
      date: new Date().toISOString().split('T')[0],
      analysisRequests: 0,
      batchRequests: 0,
      simulationRequests: 0
    }
  }
  
  // Cleanup old entries
  cleanup(): void {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    // Clean daily usage older than yesterday
    for (const [key, usage] of Array.from(this.dailyUsage.entries())) {
      if (usage.date < yesterdayStr) {
        this.dailyUsage.delete(key)
      }
    }
    
    // Clean minute usage older than 2 minutes
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000
    for (const [key, usage] of Array.from(this.minuteUsage.entries())) {
      if (usage.timestamp < twoMinutesAgo) {
        this.minuteUsage.delete(key)
      }
    }
  }
}

const usageTracker = new UsageTracker()

// Cleanup every 5 minutes
setInterval(() => usageTracker.cleanup(), 5 * 60 * 1000)

// Payload validation functions
export function validateImagePayload(imageData: any): {
  success: boolean
  error?: string
  cost?: number
} {
  try {
    const validation = validateInput(ImageValidationSchema, imageData)
    if (!validation.success) {
      return { success: false, error: validation.error }
    }
    
    const data = validation.data!
    
    // Additional file type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(data.fileType)) {
      return { success: false, error: 'Unsupported image type' }
    }
    
    // Estimate processing cost (rough calculation)
    const costPerMB = 0.01 // $0.01 per MB
    const cost = (data.fileSize / (1024 * 1024)) * costPerMB
    
    return { success: true, cost }
  } catch (error) {
    console.error('Image payload validation error:', sanitizeForLogging(error))
    return { success: false, error: 'Invalid image data' }
  }
}

export function validateBatchPayload(batchData: any): {
  success: boolean
  error?: string
  cost?: number
} {
  try {
    // Calculate total size
    const totalSize = batchData.images?.reduce((sum: number, img: any) => sum + (img.fileSize || 0), 0) || 0
    
    const validation = validateInput(BatchProcessSchema, {
      ...batchData,
      totalSize
    })
    
    if (!validation.success) {
      return { success: false, error: validation.error }
    }
    
    const data = validation.data!
    
    // Validate each image
    for (const image of data.images) {
      const imageValidation = validateImagePayload(image)
      if (!imageValidation.success) {
        return { success: false, error: `Image validation failed: ${imageValidation.error}` }
      }
    }
    
    // Estimate batch processing cost
    const baseCost = 0.05 // $0.05 base cost per batch
    const perImageCost = 0.02 // $0.02 per image
    const cost = baseCost + (data.images.length * perImageCost)
    
    return { success: true, cost }
  } catch (error) {
    console.error('Batch payload validation error:', sanitizeForLogging(error))
    return { success: false, error: 'Invalid batch data' }
  }
}

export function validateTravelAnalysisPayload(entries: any[]): {
  success: boolean
  error?: string
  cost?: number
} {
  if (!Array.isArray(entries)) {
    return { success: false, error: 'Travel entries must be an array' }
  }
  
  if (entries.length > AI_LIMITS.MAX_TRAVEL_ENTRIES_FOR_ANALYSIS) {
    return {
      success: false,
      error: `Too many travel entries. Maximum ${AI_LIMITS.MAX_TRAVEL_ENTRIES_FOR_ANALYSIS} allowed`
    }
  }
  
  // Estimate analysis cost based on number of entries
  const costPerEntry = 0.001 // $0.001 per entry
  const baseCost = 0.01      // $0.01 base cost
  const cost = baseCost + (entries.length * costPerEntry)
  
  return { success: true, cost }
}

export function validateSimulationPayload(scenario: any): {
  success: boolean
  error?: string
  cost?: number
} {
  if (!scenario.changes || !Array.isArray(scenario.changes)) {
    return { success: false, error: 'Scenario changes must be an array' }
  }
  
  if (scenario.changes.length > AI_LIMITS.MAX_SCENARIO_CHANGES) {
    return {
      success: false,
      error: `Too many scenario changes. Maximum ${AI_LIMITS.MAX_SCENARIO_CHANGES} allowed`
    }
  }
  
  // Estimate simulation cost
  const costPerChange = 0.005 // $0.005 per change
  const baseCost = 0.02       // $0.02 base cost
  const cost = baseCost + (scenario.changes.length * costPerChange)
  
  return { success: true, cost }
}

// Usage limit checking
export function checkUsageLimit(userId: string, type: 'analysis' | 'batch' | 'simulation'): {
  success: boolean
  error?: string
  remainingQuota?: number
} {
  // Check minute-level rate limiting
  if (!usageTracker.trackMinuteUsage(userId)) {
    return {
      success: false,
      error: `Rate limit exceeded. Maximum ${AI_LIMITS.AI_REQUESTS_PER_MINUTE} AI requests per minute.`
    }
  }
  
  // Check daily limits
  const dailyUsage = usageTracker.getDailyUsage(userId)
  let currentUsage = 0
  let maxLimit = 0
  
  switch (type) {
    case 'analysis':
      currentUsage = dailyUsage.analysisRequests
      maxLimit = AI_LIMITS.MAX_ANALYSIS_REQUESTS_PER_DAY
      break
    case 'batch':
      currentUsage = dailyUsage.batchRequests
      maxLimit = AI_LIMITS.MAX_BATCH_REQUESTS_PER_DAY
      break
    case 'simulation':
      currentUsage = dailyUsage.simulationRequests
      maxLimit = AI_LIMITS.MAX_SIMULATION_REQUESTS_PER_DAY
      break
  }
  
  if (!usageTracker.trackDailyUsage(userId, type)) {
    return {
      success: false,
      error: `Daily limit exceeded. Maximum ${maxLimit} ${type} requests per day.`,
      remainingQuota: 0
    }
  }
  
  return {
    success: true,
    remainingQuota: maxLimit - currentUsage - 1
  }
}

// Cost tracking (for monitoring/billing)
export function logCostUsage(userId: string, operation: string, cost: number, metadata?: any): void {
  console.log('AI Cost Usage:', sanitizeForLogging({
    userId,
    operation,
    cost,
    timestamp: new Date().toISOString(),
    metadata
  }))
  
  // In production, you might want to:
  // - Send to analytics service
  // - Store in database for billing
  // - Alert if costs exceed thresholds
}

// Middleware wrapper for AI endpoints
export function withAICostControls(
  handler: (req: any, res?: any) => Promise<Response>,
  options: {
    type: 'analysis' | 'batch' | 'simulation'
    validatePayload?: (data: any) => { success: boolean; error?: string; cost?: number }
  }
) {
  return async (req: any, res?: any): Promise<Response> => {
    try {
      // Extract user ID (adapt to your auth system)
      const userId = req.user?.id || 'unknown'
      
      // Check usage limits
      const usageCheck = checkUsageLimit(userId, options.type)
      if (!usageCheck.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: usageCheck.error,
            remainingQuota: usageCheck.remainingQuota
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-AI-Quota-Remaining': (usageCheck.remainingQuota || 0).toString()
            }
          }
        )
      }
      
      // Validate payload if validation function provided
      if (options.validatePayload) {
        const body = await req.json()
        const validation = options.validatePayload(body)
        
        if (!validation.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: validation.error
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        
        // Log cost usage
        if (validation.cost) {
          logCostUsage(userId, options.type, validation.cost, {
            endpoint: req.url,
            payloadSize: JSON.stringify(body).length
          })
        }
        
        // Re-create request with validated body
        req.validatedBody = body
      }
      
      const response = await handler(req, res)
      
      // Add quota headers to successful responses
      response.headers.set('X-AI-Quota-Remaining', (usageCheck.remainingQuota || 0).toString())
      
      return response
    } catch (error) {
      console.error('AI cost control error:', sanitizeForLogging(error))
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI processing failed'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}