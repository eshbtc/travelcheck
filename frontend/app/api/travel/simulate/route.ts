import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const SimulateScenarioSchema = z.object({
  name: z.string().min(1, 'Scenario name is required').max(200),
  description: z.string().max(1000).optional(),
  changes: z.array(z.object({
    type: z.enum(['add_travel', 'remove_travel', 'modify_travel']),
    data: z.object({
      id: z.string().optional(), // For modify/remove operations
      country_code: z.string().max(3).optional(),
      country_name: z.string().optional(),
      entry_date: z.string().optional(),
      exit_date: z.string().optional(),
      purpose: z.string().optional(),
      transport_type: z.string().optional()
    })
  })).min(1, 'At least one change is required'),
  purposes: z.array(z.object({
    category: z.string().min(1, 'Category is required'),
    country: z.string().min(2, 'Country code is required').max(3),
    ruleId: z.string().min(1, 'Rule ID is required')
  })).min(1, 'At least one purpose is required')
})

// Helper functions from analyze-multi-purpose (reused)
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
          daysUntilThreshold: meetsWeightedTest ? 0 : Math.max(0, 183 - usPresence.weightedTotal),
          breakdown: {
            currentYear: usPresence.currentYearDays,
            priorYear: `${usPresence.priorYearDays} ÷ 3 = ${Math.round(usPresence.priorYearDays/3 * 10) / 10}`,
            twoYearsAgo: `${usPresence.twoYearsDays} ÷ 6 = ${Math.round(usPresence.twoYearsDays/6 * 10) / 10}`
          }
        }
      }

    case 'ca-tax-residency-183':
      const caDays = calculatePresenceDays(entries, 'CA')
      return {
        status: caDays >= 183 ? 'met' : 'not_met',
        result: {
          daysPresent: caDays,
          threshold: 183,
          daysRemaining: Math.max(0, 183 - caDays),
          daysUntilThreshold: Math.max(0, 183 - caDays)
        }
      }

    case 'uk-tax-residency-srt':
      const ukDays = calculatePresenceDays(entries, 'GB')
      let status = 'not_met'
      
      if (ukDays >= 183) {
        status = 'met'
      } else if (ukDays >= 121) {
        status = 'partial'
      } else if (ukDays >= 91) {
        status = 'partial'
      }
      
      return {
        status,
        result: {
          daysPresent: ukDays,
          daysUntilAutomatic: Math.max(0, 183 - ukDays),
          sufficientTiesThreshold: ukDays >= 121 ? 1 : ukDays >= 91 ? 2 : ukDays >= 46 ? 3 : 4
        }
      }

    default:
      const days = calculatePresenceDays(entries, country)
      return {
        status: 'partial',
        result: {
          daysPresent: days,
          analysisNote: `Generic analysis for rule ${ruleId}`
        }
      }
  }
}

function applyScenarioChanges(originalEntries: any[], changes: any[]): any[] {
  let modifiedEntries = [...originalEntries]
  
  changes.forEach(change => {
    switch (change.type) {
      case 'add_travel':
        // Add new travel entry
        const newEntry = {
          id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: 'simulation',
          ...change.data,
          created_at: new Date().toISOString(),
          is_simulated: true
        }
        modifiedEntries.push(newEntry)
        break
        
      case 'remove_travel':
        // Remove existing travel entry
        if (change.data.id) {
          modifiedEntries = modifiedEntries.filter(entry => entry.id !== change.data.id)
        }
        break
        
      case 'modify_travel':
        // Modify existing travel entry
        if (change.data.id) {
          const index = modifiedEntries.findIndex(entry => entry.id === change.data.id)
          if (index !== -1) {
            modifiedEntries[index] = {
              ...modifiedEntries[index],
              ...change.data,
              is_modified: true
            }
          }
        }
        break
    }
  })
  
  // Sort by entry date
  return modifiedEntries.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
}

function calculateScenarioImpact(beforeResult: any, afterResult: any, purpose: any): string {
  if (beforeResult.status === afterResult.status) {
    if (beforeResult.status === 'met' && afterResult.status === 'met') {
      return 'No change - remains compliant'
    } else if (beforeResult.status === 'not_met' && afterResult.status === 'not_met') {
      return 'No change - remains non-compliant'
    }
    return 'No status change'
  }
  
  if (beforeResult.status === 'not_met' && afterResult.status === 'met') {
    return 'Positive impact - achieves compliance'
  }
  
  if (beforeResult.status === 'met' && afterResult.status === 'not_met') {
    return 'Negative impact - loses compliance'
  }
  
  if (beforeResult.status === 'partial') {
    return afterResult.status === 'met' ? 'Positive impact - achieves full compliance' : 'Negative impact - moves away from compliance'
  }
  
  return 'Status change detected'
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
    console.log('Scenario simulation request:', sanitizeForLogging({ 
      userId: user.id, 
      scenarioName: body.name,
      changesCount: body.changes?.length,
      purposesCount: body.purposes?.length
    }))
    
    // Validate input data
    const validation = validateInput(SimulateScenarioSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const scenario = validation.data!

    // Get user's current travel entries
    const { data: originalEntries, error } = await supabase
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

    // Analyze current state (before scenario)
    const beforeResults = scenario.purposes.map(purpose => {
      const analysis = analyzeRule(purpose.ruleId, purpose.country, originalEntries || [])
      return {
        purpose: purpose.category,
        country: purpose.country,
        ruleId: purpose.ruleId,
        status: analysis.status,
        result: analysis.result
      }
    })

    // Apply scenario changes
    const modifiedEntries = applyScenarioChanges(originalEntries || [], scenario.changes)

    // Analyze modified state (after scenario)
    const afterResults = scenario.purposes.map((purpose, index) => {
      const analysis = analyzeRule(purpose.ruleId, purpose.country, modifiedEntries)
      const beforeResult = beforeResults[index]
      const impact = calculateScenarioImpact(beforeResult, analysis, purpose)
      
      return {
        purpose: purpose.category,
        country: purpose.country,
        ruleId: purpose.ruleId,
        status: analysis.status,
        result: analysis.result,
        impact
      }
    })

    // Calculate scenario summary
    const scenarioSummary = {
      changesApplied: scenario.changes.length,
      entriesAdded: scenario.changes.filter(c => c.type === 'add_travel').length,
      entriesRemoved: scenario.changes.filter(c => c.type === 'remove_travel').length,
      entriesModified: scenario.changes.filter(c => c.type === 'modify_travel').length,
      totalEntriesAfter: modifiedEntries.length,
      statusChanges: {
        improved: afterResults.filter((after, i) => {
          const before = beforeResults[i]
          return (before.status === 'not_met' && after.status === 'met') ||
                 (before.status === 'partial' && after.status === 'met')
        }).length,
        worsened: afterResults.filter((after, i) => {
          const before = beforeResults[i]
          return (before.status === 'met' && after.status === 'not_met') ||
                 (before.status === 'met' && after.status === 'partial')
        }).length,
        unchanged: afterResults.filter((after, i) => beforeResults[i].status === after.status).length
      }
    }

    // Generate scenario ID for reference
    const scenarioId = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json({
      success: true,
      scenarioId,
      scenario: {
        name: scenario.name,
        description: scenario.description,
        changes: scenario.changes
      },
      results: afterResults.map((after, index) => ({
        purpose: after.purpose,
        country: after.country,
        ruleId: after.ruleId,
        before: beforeResults[index],
        after: {
          status: after.status,
          result: after.result
        },
        impact: after.impact
      })),
      summary: scenarioSummary,
      dataSnapshot: {
        originalEntries: originalEntries?.length || 0,
        modifiedEntries: modifiedEntries.length,
        simulatedEntries: modifiedEntries.filter(e => e.is_simulated).length
      },
      meta: {
        simulatedAt: new Date().toISOString(),
        scenarioId,
        userId: user.id
      }
    })
  } catch (error) {
    console.error('Error simulating travel scenario:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to simulate travel scenario' },
      { status: 500 }
    )
  }
}