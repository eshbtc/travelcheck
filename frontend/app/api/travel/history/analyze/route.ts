import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

interface TravelEntry {
  id: string
  entry_date: string
  exit_date?: string | null
  country_code: string
  country_name: string
  city?: string | null
  entry_type: string
  source_type?: string | null
  created_at: string
}

interface PassportScan {
  id: string
  extracted_text: string
  structured_data: any
  confidence_score?: number
  created_at: string
}

interface FlightEmail {
  id: string
  extracted_data: any
  confidence_score?: number
  created_at: string
}

async function crossReferenceTravelData(
  passportData: PassportScan[],
  flightData: FlightEmail[]
): Promise<any> {
  const travelEvents = []

  // Process passport data
  for (const passport of passportData) {
    try {
      const text = passport.extracted_text || ''
      
      // Extract dates from passport text
      const dateMatches = text.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/g) || []
      
      // Extract countries from passport text
      const countryMatches = text.match(/[A-Z][A-Z][A-Z]/g) || []
      
      for (let i = 0; i < Math.min(dateMatches.length, countryMatches.length); i++) {
        travelEvents.push({
          date: dateMatches[i],
          country: countryMatches[i],
          type: 'passport_stamp',
          source: 'passport_scan',
          confidence: passport.confidence_score || 0.7,
          sourceId: passport.id
        })
      }
    } catch (error) {
      console.error('Error processing passport data:', error)
    }
  }

  // Process flight data
  for (const flight of flightData) {
    try {
      const extracted = flight.extracted_data || {}
      
      if (extracted.dates && extracted.airports) {
        for (let i = 0; i < Math.min(extracted.dates.length, extracted.airports.length); i++) {
          travelEvents.push({
            date: extracted.dates[i],
            country: extracted.airports[i],
            type: 'flight',
            source: 'email',
            confidence: flight.confidence_score || 0.6,
            sourceId: flight.id,
            flightNumber: extracted.flightNumbers?.[0]
          })
        }
      }
    } catch (error) {
      console.error('Error processing flight data:', error)
    }
  }

  // Sort events by date
  travelEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group by country and calculate statistics
  const byCountry = travelEvents.reduce((acc: any, event) => {
    const country = event.country
    if (!acc[country]) {
      acc[country] = {
        visits: 0,
        totalDays: 0,
        events: []
      }
    }
    acc[country].visits++
    acc[country].events.push(event)
    return acc
  }, {})

  // Calculate date ranges and presence
  const presenceAnalysis = Object.entries(byCountry).map(([country, data]: [string, any]) => ({
    country,
    visits: data.visits,
    events: data.events,
    firstVisit: data.events[0]?.date,
    lastVisit: data.events[data.events.length - 1]?.date
  }))

  return {
    events: travelEvents,
    summary: {
      totalEvents: travelEvents.length,
      uniqueCountries: Object.keys(byCountry).length,
      dateRange: {
        earliest: travelEvents[0]?.date,
        latest: travelEvents[travelEvents.length - 1]?.date
      }
    },
    presenceAnalysis,
    confidence: {
      overall: travelEvents.reduce((sum, e) => sum + e.confidence, 0) / travelEvents.length || 0,
      sources: {
        passport: travelEvents.filter(e => e.source === 'passport_scan').length,
        email: travelEvents.filter(e => e.source === 'email').length
      }
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
    // Get passport scans
    const { data: passportScans, error: passportError } = await supabase
      .from('passport_scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (passportError) {
      console.error('Error fetching passport scans:', passportError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch passport data' },
        { status: 500 }
      )
    }

    // Get flight emails
    const { data: flightEmails, error: flightError } = await supabase
      .from('flight_emails')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (flightError) {
      console.error('Error fetching flight emails:', flightError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch flight data' },
        { status: 500 }
      )
    }

    // Analyze and cross-reference data
    const travelHistory = await crossReferenceTravelData(
      passportScans || [],
      flightEmails || []
    )

    // Save analyzed travel history
    const { error: saveError } = await supabase
      .from('travel_history')
      .upsert({
        user_id: user.id,
        analysis_data: travelHistory,
        last_updated: new Date().toISOString(),
      })

    if (saveError) {
      console.error('Error saving travel history:', saveError)
    }

    return NextResponse.json({
      success: true,
      travelHistory,
      summary: {
        passportScans: passportScans?.length || 0,
        flightEmails: flightEmails?.length || 0,
        analyzedEvents: travelHistory.events.length
      }
    })
  } catch (error) {
    console.error('Error analyzing travel history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze travel history' },
      { status: 500 }
    )
  }
}