import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

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
    // Get all travel data
    const [entriesResult, scansResult, emailsResult] = await Promise.all([
      supabase.from('travel_entries').select('*').eq('user_id', user.id),
      supabase.from('passport_scans').select('*').eq('user_id', user.id),
      supabase.from('flight_emails').select('*').eq('user_id', user.id)
    ])

    const entries = entriesResult.data || []
    const scans = scansResult.data || []
    const emails = emailsResult.data || []

    // Enhanced analysis with ML-style pattern detection
    const patterns: any = {
      frequentDestinations: {},
      seasonalTrends: {},
      travelPurposes: {},
      durations: [],
      airlines: {},
      routes: {}
    }

    // Analyze travel patterns
    entries.forEach((entry: any) => {
      const country = entry.country_name || entry.country_code
      const month = new Date(entry.entry_date).getMonth()
      const duration = entry.exit_date ? 
        Math.ceil((new Date(entry.exit_date).getTime() - new Date(entry.entry_date).getTime()) / (1000 * 60 * 60 * 24)) : 0

      // Frequent destinations
      patterns.frequentDestinations[country] = (patterns.frequentDestinations[country] || 0) + 1

      // Seasonal trends
      patterns.seasonalTrends[month] = (patterns.seasonalTrends[month] || 0) + 1

      // Travel durations
      if (duration > 0) patterns.durations.push(duration)

      // Travel purposes
      const purpose = entry.purpose || 'Unknown'
      patterns.travelPurposes[purpose] = (patterns.travelPurposes[purpose] || 0) + 1
    })

    // Analyze flight emails for airline patterns
    emails.forEach((email: any) => {
      if (email.parsed_data?.flights) {
        email.parsed_data.flights.forEach((flight: string) => {
          const airline = flight.substring(0, 2)
          patterns.airlines[airline] = (patterns.airlines[airline] || 0) + 1
        })
      }
    })

    // Calculate insights
    const insights = {
      travelFrequency: entries.length / Math.max(1, new Date().getFullYear() - 2020),
      averageTripDuration: patterns.durations.length > 0 ? 
        patterns.durations.reduce((a: number, b: number) => a + b, 0) / patterns.durations.length : 0,
      mostFrequentDestination: Object.keys(patterns.frequentDestinations).reduce((a: string, b: string) => 
        patterns.frequentDestinations[a] > patterns.frequentDestinations[b] ? a : b, ''),
      peakTravelMonth: Object.keys(patterns.seasonalTrends).reduce((a: string, b: string) => 
        patterns.seasonalTrends[a] > patterns.seasonalTrends[b] ? a : b, '0'),
      preferredAirline: Object.keys(patterns.airlines).length > 0 ? 
        Object.keys(patterns.airlines).reduce((a: string, b: string) => 
          patterns.airlines[a] > patterns.airlines[b] ? a : b, '') : null
    }

    // Risk assessment
    const riskFactors = {
      highFrequencyTravel: insights.travelFrequency > 12,
      longAbsences: patterns.durations.some((d: number) => d > 180),
      multipleDestinations: Object.keys(patterns.frequentDestinations).length > 10,
      inconsistentDocumentation: scans.length < entries.length * 0.3
    }

    const riskScore = Object.values(riskFactors).filter(Boolean).length / Object.keys(riskFactors).length

    const enhancedAnalysis = {
      summary: {
        totalTrips: entries.length,
        totalScans: scans.length,
        totalEmails: emails.length,
        analysisDate: new Date().toISOString()
      },
      patterns,
      insights,
      riskAssessment: {
        score: riskScore,
        level: riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
        factors: riskFactors
      },
      recommendations: [
        riskScore > 0.5 ? 'Consider organizing travel documents more systematically' : null,
        insights.travelFrequency > 20 ? 'Frequent travel detected - ensure tax compliance' : null,
        patterns.durations.some((d: number) => d > 365) ? 'Long absences detected - verify residency status' : null
      ].filter(Boolean)
    }

    return NextResponse.json({
      success: true,
      enhancedAnalysis
    })
  } catch (error) {
    console.error('Error in enhanced travel analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Enhanced analysis failed' },
      { status: 500 }
    )
  }
}