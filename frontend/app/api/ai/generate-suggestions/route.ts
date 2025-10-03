import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import crypto from 'crypto'

// Configuration
const API_KEY = process.env.GOOGLE_AI_API_KEY
const MAX_DATA_SIZE = 50000 // Max characters in JSON
const CACHE_TTL_HOURS = 24 // Cache results for 24 hours
const RATE_LIMIT_PER_HOUR = 10 // Max 10 requests per hour per user

// Helper function to create cache key
function createCacheKey(userData: any): string {
  const dataStr = JSON.stringify(userData, null, 0)
  return crypto.createHash('sha256').update(dataStr).digest('hex')
}

// Helper function to check rate limit
async function checkRateLimit(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  try {
    const count = await prisma.aiUsageLog.count({
      where: {
        userId,
        endpoint: 'generate-suggestions',
        createdAt: {
          gte: oneHourAgo
        }
      }
    })

    return count < RATE_LIMIT_PER_HOUR
  } catch (error) {
    console.error('Error checking rate limit:', error)
    return false // Be conservative, deny if we can't check
  }
}

// Helper function to log usage
async function logUsage(userId: string, cacheHit: boolean, dataSize: number) {
  await prisma.aiUsageLog.create({
    data: {
      userId,
      endpoint: 'generate-suggestions',
      cacheHit,
      dataSize
    }
  })
}

// Helper function to condense large datasets
function condenseData(userData: any): any {
  const dataStr = JSON.stringify(userData)
  if (dataStr.length <= MAX_DATA_SIZE) return userData

  // Summarize by taking recent entries and aggregating older ones
  const condensed = { ...userData }
  
  if (userData.travelEntries && Array.isArray(userData.travelEntries)) {
    const entries = userData.travelEntries
    if (entries.length > 50) {
      // Keep recent 30 entries, summarize older ones by month/country
      const recent = entries.slice(-30)
      const older = entries.slice(0, -30)
      
      const summary: any = {}
      older.forEach((entry: any) => {
        const month = entry.entry_date?.substring(0, 7) || 'unknown'
        const country = entry.country_code || 'unknown'
        const key = `${month}-${country}`
        summary[key] = (summary[key] || 0) + 1
      })

      condensed.travelEntries = recent
      condensed.summarizedData = {
        message: `Showing recent 30 entries. Older data aggregated: ${Object.keys(summary).length} country-month combinations`,
        summary
      }
    }
  }

  return condensed
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const { userData } = await request.json()
    
    if (!userData) {
      return NextResponse.json({ success: false, error: 'No user data provided' }, { status: 400 })
    }

    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Google AI API key not configured' }, { status: 501 })
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId)
    if (!canProceed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: '1 hour'
      }, { status: 429 })
    }

    // Condense data if too large
    const processedData = condenseData(userData)
    const cacheKey = createCacheKey(processedData)
    const dataSize = JSON.stringify(processedData).length

    // Check cache first
    const cachedResult = await prisma.aiCache.findFirst({
      where: {
        cacheKey,
        endpoint: 'generate-suggestions'
      },
      select: {
        result: true,
        createdAt: true
      }
    })

    if (cachedResult) {
      const cacheAge = Date.now() - new Date(cachedResult.createdAt).getTime()
      const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

      if (cacheAge < maxAge) {
        await logUsage(userId, true, dataSize)
        return NextResponse.json({
          success: true,
          data: cachedResult.result,
          fromCache: true
        })
      }
    }

    // Generate new suggestions
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) // Use faster model
    
    const prompt = `
      Analyze the user's travel data and generate smart suggestions (max 5 suggestions):
      
      ${JSON.stringify(processedData, null, 0)}
      
      Please provide a JSON response with:
      1. suggestions: Array of max 5 actionable recommendations
      2. conflictingData: Array of any data conflicts found
      3. potentialGaps: Array of missing travel information gaps
      
      Focus on data quality, compliance opportunities, and optimization suggestions.
      Keep responses concise and actionable.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    let parsedData
    try {
      parsedData = JSON.parse(text)
    } catch {
      parsedData = {
        suggestions: [],
        conflictingData: [],
        potentialGaps: []
      }
    }

    // Cache the result
    await prisma.aiCache.upsert({
      where: {
        ai_cache_unique: {
          cacheKey,
          endpoint: 'generate-suggestions'
        }
      },
      create: {
        cacheKey,
        endpoint: 'generate-suggestions',
        userId: userId,
        result: parsedData
      },
      update: {
        result: parsedData,
        createdAt: new Date()
      }
    })

    await logUsage(userId, false, dataSize)

    return NextResponse.json({
      success: true,
      data: parsedData
    })
  } catch (error) {
    console.error('Error generating smart suggestions:', error)

    // Log the error for monitoring
    await prisma.aiUsageLog.create({
      data: {
        userId: userId,
        endpoint: 'generate-suggestions',
        cacheHit: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Suggestions generation failed'
    }, { status: 500 })
  }
}