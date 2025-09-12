import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import crypto from 'crypto'

// Configuration
const API_KEY = process.env.GOOGLE_AI_API_KEY
const MAX_DATA_SIZE = 75000 // Max characters in JSON (larger for pattern analysis)
const CACHE_TTL_HOURS = 48 // Cache results for 48 hours (longer for patterns)
const RATE_LIMIT_PER_DAY = 5 // Max 5 pattern analyses per day per user

// Helper function to create cache key
function createCacheKey(travelData: any): string {
  const dataStr = JSON.stringify(travelData, null, 0)
  return crypto.createHash('sha256').update(dataStr).digest('hex')
}

// Helper function to check rate limit
async function checkRateLimit(userId: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('endpoint', 'analyze-patterns')
    .gte('created_at', oneDayAgo)

  if (error) {
    console.error('Error checking rate limit:', error)
    return false
  }

  return (count || 0) < RATE_LIMIT_PER_DAY
}

// Helper function to log usage
async function logUsage(userId: string, cacheHit: boolean, dataSize: number) {
  await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    endpoint: 'analyze-patterns',
    cache_hit: cacheHit,
    data_size: dataSize,
    created_at: new Date().toISOString()
  })
}

// Helper function to condense large datasets for pattern analysis
function condenseData(travelData: any): any {
  const dataStr = JSON.stringify(travelData)
  if (dataStr.length <= MAX_DATA_SIZE) return travelData

  const condensed = { ...travelData }
  
  if (travelData.entries && Array.isArray(travelData.entries)) {
    const entries = travelData.entries
    if (entries.length > 100) {
      // For pattern analysis, keep more data but aggregate by quarters
      const recent = entries.slice(-50) // Last 50 entries
      const older = entries.slice(0, -50)
      
      // Group older entries by quarter and country
      const quarters: any = {}
      older.forEach((entry: any) => {
        const date = new Date(entry.entry_date || entry.date)
        const year = date.getFullYear()
        const quarter = Math.floor(date.getMonth() / 3) + 1
        const country = entry.country_code || entry.country
        const key = `${year}-Q${quarter}-${country}`
        
        if (!quarters[key]) {
          quarters[key] = { count: 0, firstDate: entry.entry_date, entries: [] }
        }
        quarters[key].count++
        quarters[key].entries.push({
          date: entry.entry_date,
          type: entry.entry_type,
          purpose: entry.purpose
        })
      })

      condensed.entries = recent
      condensed.quarterlyAggregations = quarters
      condensed.dataCondensationNote = `Showing ${recent.length} recent entries + ${Object.keys(quarters).length} quarterly aggregations`
    }
  }

  return condensed
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  const { user } = authResult
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  try {
    const { travelData } = await request.json()
    
    if (!travelData) {
      return NextResponse.json({ success: false, error: 'No travel data provided' }, { status: 400 })
    }

    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Google AI API key not configured' }, { status: 501 })
    }

    // Check rate limit
    const canProceed = await checkRateLimit(user.id)
    if (!canProceed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Maximum 5 pattern analyses per day.',
        retryAfter: '24 hours'
      }, { status: 429 })
    }

    // Condense data if too large
    const processedData = condenseData(travelData)
    const cacheKey = createCacheKey(processedData)
    const dataSize = JSON.stringify(processedData).length

    // Check cache first
    const { data: cachedResult } = await supabase
      .from('ai_cache')
      .select('result, created_at')
      .eq('cache_key', cacheKey)
      .eq('endpoint', 'analyze-patterns')
      .single()

    if (cachedResult) {
      const cacheAge = Date.now() - new Date(cachedResult.created_at).getTime()
      const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

      if (cacheAge < maxAge) {
        await logUsage(user.id, true, dataSize)
        return NextResponse.json({
          success: true,
          data: cachedResult.result,
          fromCache: true
        })
      }
    }

    // Generate new pattern analysis
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const prompt = `
      Analyze the following travel data and provide insights on travel patterns, 
      citizenship/residency opportunities, and recommendations (max 8 insights):
      
      ${JSON.stringify(processedData, null, 0)}
      
      Please provide a JSON response with:
      1. patterns: Array of max 5 travel patterns identified
      2. insights: Array of max 8 actionable insights and opportunities
      
      Focus on:
      - Residency requirements analysis
      - Tax residency implications  
      - Citizenship eligibility patterns
      - Visa optimization opportunities
      
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
        patterns: [],
        insights: [{
          type: 'info',
          title: 'Analysis Complete',
          description: text.substring(0, 200) + '...',
          priority: 'medium'
        }]
      }
    }

    // Cache the result
    await supabase.from('ai_cache').upsert({
      cache_key: cacheKey,
      endpoint: 'analyze-patterns',
      user_id: user.id,
      result: parsedData,
      created_at: new Date().toISOString()
    })

    await logUsage(user.id, false, dataSize)

    return NextResponse.json({
      success: true,
      data: parsedData
    })
  } catch (error) {
    console.error('Error analyzing travel patterns:', error)
    
    // Log the error for monitoring
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      endpoint: 'analyze-patterns',
      cache_hit: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, { status: 500 })
  }
}