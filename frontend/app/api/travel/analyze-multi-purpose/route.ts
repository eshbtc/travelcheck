import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const AnalyzeMultiPurposeSchema = z.object({
  purposes: z.array(z.object({
    category: z.string().min(1, 'Category is required'),
    country: z.string().min(2, 'Country code is required').max(3),
    ruleId: z.string().min(1, 'Rule ID is required')
  })).min(1, 'At least one purpose is required'),
  options: z.object({
    userTimezone: z.string().optional(),
    includeWhatIf: z.boolean().default(false),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional()
})

// Helper function to calculate days present in a country
function calculatePresenceDays(entries: any[], country: string, startDate?: string, endDate?: string): number {
  const countryEntries = entries.filter(entry => 
    (entry.country_code === country || entry.country_name === country) &&
    (!startDate || entry.entry_date >= startDate) &&
    (!endDate || entry.entry_date <= endDate)
  )

  return countryEntries.reduce((total, entry) => {
    const entryDate = new Date(entry.entry_date)
    const exitDate = entry.exit_date ? new Date(entry.exit_date) : new Date()
    const days = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    return total + Math.max(0, days)
  }, 0)
}

// Helper function to calculate weighted presence for US substantial presence test
function calculateWeightedPresence(entries: any[], currentYear: number): {
  currentYearDays: number
  priorYearDays: number
  twoYearsDays: number
  weightedTotal: number
} {
  const usEntries = entries.filter(entry => 
    entry.country_code === 'US' || entry.country_name === 'United States'
  )

  const currentYearDays = calculatePresenceDays(usEntries, 'US', `${currentYear}-01-01`, `${currentYear}-12-31`)
  const priorYearDays = calculatePresenceDays(usEntries, 'US', `${currentYear-1}-01-01`, `${currentYear-1}-12-31`)
  const twoYearsDays = calculatePresenceDays(usEntries, 'US', `${currentYear-2}-01-01`, `${currentYear-2}-12-31`)

  const weightedTotal = currentYearDays + (priorYearDays / 3) + (twoYearsDays / 6)

  return {
    currentYearDays,
    priorYearDays,
    twoYearsDays,
    weightedTotal
  }
}

// Helper function to calculate Schengen area presence (90/180 rule)
function calculateSchengenPresence(entries: any[]): {
  totalDays: number
  violations: Array<{ date: string, consecutiveDays: number }>
} {
  const schengenCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR', 'LU', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY']
  
  const schengenEntries = entries.filter(entry => 
    schengenCountries.includes(entry.country_code) || 
    schengenCountries.some(code => entry.country_name?.includes(code))
  ).sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

  const violations: Array<{ date: string, consecutiveDays: number }> = []
  let totalDays = 0

  // Simple sliding window check for 90/180 rule
  for (let i = 0; i < schengenEntries.length; i++) {
    const entry = schengenEntries[i]
    const entryDate = new Date(entry.entry_date)
    const exitDate = entry.exit_date ? new Date(entry.exit_date) : new Date()
    const stayDays = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    
    totalDays += stayDays

    // Check 180-day lookback window
    const lookbackDate = new Date(entryDate)
    lookbackDate.setDate(lookbackDate.getDate() - 180)
    
    const daysInWindow = schengenEntries
      .filter(e => new Date(e.entry_date) >= lookbackDate && new Date(e.entry_date) <= exitDate)
      .reduce((sum, e) => {
        const eDays = Math.ceil((new Date(e.exit_date || new Date()).getTime() - new Date(e.entry_date).getTime()) / (1000 * 60 * 60 * 24))
        return sum + eDays
      }, 0)

    if (daysInWindow > 90) {
      violations.push({
        date: entry.entry_date,
        consecutiveDays: daysInWindow
      })
    }
  }

  return { totalDays, violations }
}

// Rule analysis functions
function analyzeRule(ruleId: string, country: string, entries: any[], options: any = {}) {
  const currentYear = new Date().getFullYear()
  
  switch (ruleId) {
    case 'us-tax-residency-183':
      const usPresence = calculateWeightedPresence(entries, currentYear)
      const meetsMinDays = usPresence.currentYearDays >= 31
      const meetsWeightedTest = usPresence.weightedTotal >= 183
      
      return {
        status: (meetsMinDays && meetsWeightedTest) ? 'met' : 'not_met',
        result: {
          currentYearDays: usPresence.currentYearDays,
          weightedTotal: Math.round(usPresence.weightedTotal * 10) / 10,
          meetsMinimumDays: meetsMinDays,
          meetsWeightedTest: meetsWeightedTest,
          breakdown: {
            currentYear: usPresence.currentYearDays,
            priorYear: `${usPresence.priorYearDays} ÷ 3 = ${Math.round(usPresence.priorYearDays/3 * 10) / 10}`,
            twoYearsAgo: `${usPresence.twoYearsDays} ÷ 6 = ${Math.round(usPresence.twoYearsDays/6 * 10) / 10}`
          }
        },
        recommendations: meetsWeightedTest ? 
          ['Consider closer connection exception if applicable', 'Consult tax advisor for filing obligations'] :
          ['Track days carefully to avoid crossing threshold', 'Consider timing of future travel']
      }

    case 'ca-tax-residency-183':
      const caDays = calculatePresenceDays(entries, 'CA')
      return {
        status: caDays >= 183 ? 'met' : 'not_met',
        result: {
          daysPresent: caDays,
          threshold: 183,
          daysRemaining: Math.max(0, 183 - caDays)
        },
        recommendations: caDays >= 183 ? 
          ['May be Canadian tax resident', 'Consider residential ties in other countries'] :
          [`${183 - caDays} days remaining before threshold`]
      }

    case 'uk-tax-residency-srt':
      const ukDays = calculatePresenceDays(entries, 'GB')
      let status = 'not_met'
      let srtResult = { daysPresent: ukDays, automaticTests: {} }
      
      if (ukDays >= 183) {
        status = 'met'
        srtResult.automaticTests = { resident: 'Present 183+ days' }
      } else if (ukDays >= 121) {
        status = 'partial'
        srtResult.automaticTests = { sufficient_ties: 'Need 1+ UK tie' }
      } else if (ukDays >= 91) {
        status = 'partial'
        srtResult.automaticTests = { sufficient_ties: 'Need 2+ UK ties' }
      }
      
      return {
        status,
        result: srtResult,
        recommendations: status === 'met' ? 
          ['UK tax resident under automatic test'] :
          ['Check UK ties: home, work, family, accommodation']
      }

    case 'de-schengen-duration':
    case 'fr-schengen-duration':
      const schengenAnalysis = calculateSchengenPresence(entries)
      return {
        status: schengenAnalysis.violations.length > 0 ? 'not_met' : 'met',
        result: {
          totalDaysInSchengen: schengenAnalysis.totalDays,
          violations: schengenAnalysis.violations,
          complianceStatus: schengenAnalysis.violations.length === 0 ? 'compliant' : 'violations_found'
        },
        recommendations: schengenAnalysis.violations.length > 0 ?
          ['Schengen overstays detected', 'Consult immigration lawyer', 'Plan longer breaks between visits'] :
          ['Currently Schengen compliant', 'Monitor 90/180 day rule carefully']
      }

    default:
      // Generic presence-based analysis
      const days = calculatePresenceDays(entries, country, options.dateRange?.start, options.dateRange?.end)
      return {
        status: 'partial',
        result: {
          daysPresent: days,
          analysisNote: `Generic analysis for rule ${ruleId}`
        },
        recommendations: ['Rule-specific analysis not implemented', 'Consult relevant authorities']
      }
  }
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
    const body = await request.json()
    console.log('Multi-purpose analysis request:', sanitizeForLogging({ userId: user.id, purposes: body.purposes?.length }))
    
    // Validate input data
    const validation = validateInput(AnalyzeMultiPurposeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { purposes, options = {} } = validation.data!

    // Get user's travel entries
    const { data: entries, error } = await supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: true })

    if (error) {
      console.error('Error fetching travel entries:', sanitizeForLogging(error))
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel data' },
        { status: 500 }
      )
    }

    // Analyze each purpose
    const results = purposes.map(purpose => {
      const analysis = analyzeRule(purpose.ruleId, purpose.country, entries || [], options)
      
      return {
        purpose: purpose.category,
        country: purpose.country,
        ruleId: purpose.ruleId,
        result: analysis.result,
        status: analysis.status,
        recommendations: analysis.recommendations,
        analyzedAt: new Date().toISOString()
      }
    })

    // Generate summary insights
    const summary = {
      totalPurposes: purposes.length,
      statusBreakdown: {
        met: results.filter(r => r.status === 'met').length,
        not_met: results.filter(r => r.status === 'not_met').length,
        partial: results.filter(r => r.status === 'partial').length,
        error: results.filter(r => r.status === 'error').length
      },
      criticalIssues: results.filter(r => r.status === 'not_met' || r.status === 'error').length,
      countriesAnalyzed: Array.from(new Set(purposes.map(p => p.country))),
      dataSource: {
        travelEntries: entries?.length || 0,
        dateRange: entries?.length ? {
          earliest: entries[0]?.entry_date,
          latest: entries[entries.length - 1]?.entry_date
        } : null
      }
    }

    // Include what-if scenarios if requested
    let whatIfScenarios = null
    if (options.includeWhatIf) {
      whatIfScenarios = {
        note: 'What-if analysis available via /api/travel/simulate endpoint',
        suggestedScenarios: [
          'Add 30 days to US presence',
          'Remove recent UK trip',
          'Plan 6-month Europe break'
        ]
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      summary,
      whatIfScenarios,
      meta: {
        analyzedAt: new Date().toISOString(),
        userTimezone: options.userTimezone || 'UTC',
        includeWhatIf: options.includeWhatIf || false
      }
    })
  } catch (error) {
    console.error('Error analyzing multi-purpose travel:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to analyze travel purposes' },
      { status: 500 }
    )
  }
}