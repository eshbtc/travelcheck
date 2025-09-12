import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const GetInsightsSchema = z.object({
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional()
  }).optional(),
  countries: z.array(z.string()).optional(),
  purposes: z.array(z.string()).optional(),
  includeRecommendations: z.boolean().default(true),
  includeOpportunities: z.boolean().default(true),
  includeWarnings: z.boolean().default(true)
})

// Helper functions for analysis
function analyzeTravelPatterns(entries: any[]) {
  const patterns = {
    mostVisitedCountries: {} as Record<string, number>,
    travelFrequency: {} as Record<string, number>,
    seasonalPatterns: {} as Record<string, number>,
    averageTripDuration: {} as Record<string, number[]>
  }

  entries.forEach(entry => {
    const country = entry.country_code || entry.country_name || 'Unknown'
    const month = new Date(entry.entry_date).getMonth()
    const duration = entry.exit_date ? 
      Math.ceil((new Date(entry.exit_date).getTime() - new Date(entry.entry_date).getTime()) / (1000 * 60 * 60 * 24)) : 1

    // Count visits by country
    patterns.mostVisitedCountries[country] = (patterns.mostVisitedCountries[country] || 0) + 1

    // Track seasonal patterns
    const season = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'][month]
    patterns.seasonalPatterns[season] = (patterns.seasonalPatterns[season] || 0) + 1

    // Track trip durations
    if (!patterns.averageTripDuration[country]) {
      patterns.averageTripDuration[country] = []
    }
    patterns.averageTripDuration[country].push(duration)
  })

  return patterns
}

function generateInsights(entries: any[], patterns: any, options: any = {}) {
  const insights = []
  const currentYear = new Date().getFullYear()

  // Travel frequency insights
  const totalTrips = entries.length
  const uniqueCountries = new Set(entries.map(e => e.country_code || e.country_name)).size
  const thisYearTrips = entries.filter(e => new Date(e.entry_date).getFullYear() === currentYear).length

  if (totalTrips > 20) {
    insights.push({
      type: 'info',
      title: 'Frequent Traveler Profile',
      description: `You've recorded ${totalTrips} trips across ${uniqueCountries} countries. This extensive travel history provides rich data for compliance analysis.`,
      priority: 'medium',
      action: 'Consider reviewing tax residency implications across multiple jurisdictions'
    })
  }

  // US tax residency warnings
  const usEntries = entries.filter(e => e.country_code === 'US' || e.country_name?.includes('United States'))
  if (usEntries.length > 0) {
    const usCurrentYear = usEntries.filter(e => new Date(e.entry_date).getFullYear() === currentYear)
    const usDaysThisYear = usCurrentYear.reduce((total, entry) => {
      const duration = entry.exit_date ? 
        Math.ceil((new Date(entry.exit_date).getTime() - new Date(entry.entry_date).getTime()) / (1000 * 60 * 60 * 24)) : 1
      return total + duration
    }, 0)

    if (usDaysThisYear > 120) {
      insights.push({
        type: 'warning',
        title: 'US Tax Residency Alert',
        description: `You've spent ${usDaysThisYear} days in the US this year. Monitor the substantial presence test carefully.`,
        priority: 'high',
        action: 'Calculate weighted days using the substantial presence test formula'
      })
    } else if (usDaysThisYear > 90) {
      insights.push({
        type: 'opportunity',
        title: 'US Tax Planning Opportunity',
        description: `With ${usDaysThisYear} days in the US, you're approaching tax residency thresholds. Plan remaining travel carefully.`,
        priority: 'medium',
        action: 'Track remaining days and consider year-end travel timing'
      })
    }
  }

  // Schengen area analysis
  const schengenCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR']
  const schengenEntries = entries.filter(e => schengenCountries.includes(e.country_code))
  if (schengenEntries.length > 0) {
    const recentSchengen = schengenEntries.filter(e => {
      const entryDate = new Date(e.entry_date)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      return entryDate >= sixMonthsAgo
    })

    const recentDays = recentSchengen.reduce((total, entry) => {
      const duration = entry.exit_date ? 
        Math.ceil((new Date(entry.exit_date).getTime() - new Date(entry.entry_date).getTime()) / (1000 * 60 * 60 * 24)) : 1
      return total + duration
    }, 0)

    if (recentDays > 70) {
      insights.push({
        type: 'warning',
        title: 'Schengen 90/180 Rule Alert',
        description: `You've spent ${recentDays} days in Schengen area in the last 180 days. Monitor the 90-day limit carefully.`,
        priority: 'high',
        action: 'Plan extended break from Schengen area if approaching 90 days'
      })
    }
  }

  // Seasonal travel patterns
  const seasonalData = patterns.seasonalPatterns
  const mostPopularSeason = Object.keys(seasonalData).reduce((a, b) => seasonalData[a] > seasonalData[b] ? a : b)
  if (seasonalData[mostPopularSeason] > totalTrips * 0.4) {
    insights.push({
      type: 'info',
      title: 'Seasonal Travel Pattern',
      description: `You travel most frequently in ${mostPopularSeason.toLowerCase()} (${seasonalData[mostPopularSeason]} trips). Consider seasonal tax implications.`,
      priority: 'low',
      action: 'Plan travel to optimize seasonal presence rules'
    })
  }

  // Documentation gaps
  const entriesWithoutExit = entries.filter(e => !e.exit_date).length
  if (entriesWithoutExit > 0) {
    insights.push({
      type: 'warning',
      title: 'Missing Exit Data',
      description: `${entriesWithoutExit} travel entries are missing exit dates, which may affect compliance calculations.`,
      priority: 'medium',
      action: 'Review and complete travel history records'
    })
  }

  return insights
}

function generateRecommendations(entries: any[], patterns: any, insights: any[]) {
  const recommendations = []

  // High-priority warnings get specific recommendations
  const highPriorityWarnings = insights.filter(i => i.type === 'warning' && i.priority === 'high')
  if (highPriorityWarnings.length > 0) {
    recommendations.push({
      category: 'compliance',
      title: 'Address Critical Compliance Issues',
      description: 'You have high-priority compliance alerts that require immediate attention.',
      impact: 'Avoid potential tax or immigration violations',
      effort: 'medium'
    })
  }

  // Data quality recommendations
  const dataIssues = insights.filter(i => i.description.includes('missing') || i.description.includes('incomplete'))
  if (dataIssues.length > 0) {
    recommendations.push({
      category: 'data_quality',
      title: 'Complete Travel History Records',
      description: 'Fill in missing travel data to improve accuracy of compliance analysis.',
      impact: 'More accurate compliance calculations and reports',
      effort: 'low'
    })
  }

  // Travel optimization recommendations
  const uniqueCountries = new Set(entries.map(e => e.country_code || e.country_name)).size
  if (uniqueCountries >= 5) {
    recommendations.push({
      category: 'optimization',
      title: 'Multi-Jurisdiction Tax Planning',
      description: 'With travel across multiple countries, consider professional tax advice for optimization.',
      impact: 'Potential tax savings and compliance confidence',
      effort: 'high'
    })
  }

  // Automation recommendations
  if (entries.length > 10) {
    recommendations.push({
      category: 'automation',
      title: 'Enable Automated Data Collection',
      description: 'Connect email accounts to automatically import flight confirmations and bookings.',
      impact: 'Reduce manual data entry and improve accuracy',
      effort: 'low'
    })
  }

  // Document organization recommendations
  recommendations.push({
    category: 'organization',
    title: 'Maintain Supporting Documentation',
    description: 'Keep passport stamps, boarding passes, and hotel receipts as evidence for travel dates.',
    impact: 'Strong evidence for compliance reporting and audits',
    effort: 'low'
  })

  return recommendations
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
    console.log('Travel insights request:', sanitizeForLogging({ userId: user.id, options: Object.keys(body) }))
    
    // Validate input data
    const validation = validateInput(GetInsightsSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const options = validation.data!

    // Build query with optional filters
    let query = supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: true })

    // Apply time range filter
    if (options.timeRange?.start) {
      query = query.gte('entry_date', options.timeRange.start)
    }
    if (options.timeRange?.end) {
      query = query.lte('entry_date', options.timeRange.end)
    }

    // Apply country filter
    if (options.countries && options.countries.length > 0) {
      query = query.in('country_code', options.countries)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching travel entries:', sanitizeForLogging(error))
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel data' },
        { status: 500 }
      )
    }

    // Analyze travel patterns
    const patterns = analyzeTravelPatterns(entries || [])
    
    // Generate insights
    let insights: any[] = []
    if (options.includeOpportunities !== false || options.includeWarnings !== false) {
      insights = generateInsights(entries || [], patterns, options)
      
      // Filter by type if requested
      if (options.includeOpportunities === false) {
        insights = insights.filter(i => i.type !== 'opportunity')
      }
      if (options.includeWarnings === false) {
        insights = insights.filter(i => i.type !== 'warning')
      }
    }

    // Generate recommendations
    let recommendations: any[] = []
    if (options.includeRecommendations !== false) {
      recommendations = generateRecommendations(entries || [], patterns, insights)
    }

    // Calculate summary statistics
    const summary = {
      totalEntries: entries?.length || 0,
      uniqueCountries: new Set(entries?.map(e => e.country_code || e.country_name) || []).size,
      dateRange: entries?.length ? {
        earliest: entries[0]?.entry_date,
        latest: entries[entries.length - 1]?.entry_date
      } : null,
      insightsSummary: {
        total: insights.length,
        warnings: insights.filter(i => i.type === 'warning').length,
        opportunities: insights.filter(i => i.type === 'opportunity').length,
        highPriority: insights.filter(i => i.priority === 'high').length
      },
      recommendationsSummary: {
        total: recommendations.length,
        categories: Array.from(new Set(recommendations.map(r => r.category)))
      }
    }

    return NextResponse.json({
      success: true,
      insights,
      recommendations,
      summary,
      travelPatterns: {
        mostVisitedCountries: Object.entries(patterns.mostVisitedCountries)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([country, visits]) => ({ country, visits })),
        seasonalDistribution: patterns.seasonalPatterns,
        travelFrequency: {
          totalTrips: entries?.length || 0,
          averageTripsPerYear: entries?.length ? 
            Math.round((entries.length / ((new Date().getFullYear() - new Date(entries[0].entry_date).getFullYear() + 1)) * 10)) / 10 : 0
        }
      },
      meta: {
        analyzedAt: new Date().toISOString(),
        appliedFilters: {
          timeRange: options.timeRange,
          countries: options.countries,
          purposes: options.purposes
        }
      }
    })
  } catch (error) {
    console.error('Error generating travel insights:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to generate travel insights' },
      { status: 500 }
    )
  }
}