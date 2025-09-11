import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

interface TravelEntry {
  id: string
  entry_date: string
  exit_date?: string | null
  country_code: string
  country_name: string
  city?: string | null
  entry_type: string
  purpose?: string | null
  created_at: string
}

function calculateDaysOutside(entries: TravelEntry[], startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let totalDays = 0

  for (const entry of entries) {
    if (entry.country_code === 'US' || entry.country_name === 'United States') {
      continue // Skip US entries for days outside calculation
    }

    const entryDate = new Date(entry.entry_date)
    const exitDate = entry.exit_date ? new Date(entry.exit_date) : new Date()

    // Calculate overlap with the specified period
    const overlapStart = new Date(Math.max(start.getTime(), entryDate.getTime()))
    const overlapEnd = new Date(Math.min(end.getTime(), exitDate.getTime()))

    if (overlapStart <= overlapEnd) {
      const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24))
      totalDays += days
    }
  }

  return totalDays
}

function generateUSCISTrips(entries: TravelEntry[]): any[] {
  const trips = []
  
  // Sort entries by date
  const sortedEntries = entries
    .filter(entry => entry.country_code !== 'US' && entry.country_name !== 'United States')
    .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

  for (const entry of sortedEntries) {
    trips.push({
      departureDate: entry.entry_date,
      returnDate: entry.exit_date || new Date().toISOString().split('T')[0],
      destination: entry.country_name || entry.country_code,
      city: entry.city,
      purpose: entry.purpose || 'Personal/Tourism',
      daysAbsent: entry.exit_date 
        ? Math.ceil((new Date(entry.exit_date).getTime() - new Date(entry.entry_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    })
  }

  return trips
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
    const { 
      startDate, 
      endDate, 
      reportType = 'N-400',
      applicantInfo = {}
    } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Get travel entries
    const { data: entries, error } = await supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: true })

    if (error) {
      console.error('Error fetching travel entries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel entries' },
        { status: 500 }
      )
    }

    // Generate USCIS report
    const trips = generateUSCISTrips(entries || [])
    const totalDaysOutside = calculateDaysOutside(entries || [], startDate, endDate)
    const totalTrips = trips.length

    // Calculate physical presence
    const totalDaysInPeriod = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    const physicalPresenceDays = totalDaysInPeriod - totalDaysOutside

    const reportData = {
      reportType,
      generatedAt: new Date().toISOString(),
      period: {
        startDate,
        endDate,
        totalDays: totalDaysInPeriod
      },
      applicant: {
        name: applicantInfo.name || '',
        alienNumber: applicantInfo.alienNumber || '',
        ...applicantInfo
      },
      summary: {
        totalTripsOutside: totalTrips,
        totalDaysOutside,
        physicalPresenceDays,
        physicalPresencePercentage: (physicalPresenceDays / totalDaysInPeriod) * 100
      },
      trips,
      analysis: {
        eligibilityNotes: [
          `Physical presence: ${physicalPresenceDays} days out of ${totalDaysInPeriod} required`,
          `Total trips outside US: ${totalTrips}`,
          `Longest trip: ${Math.max(...trips.map(t => t.daysAbsent), 0)} days`
        ],
        warnings: trips.filter(trip => trip.daysAbsent > 365).length > 0 
          ? ['One or more trips exceeded 365 days - may affect continuous residence']
          : []
      },
      disclaimer: 'This report is generated from available data and should be reviewed with an immigration attorney. USCIS may request additional documentation.'
    }

    // Save report
    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        report_type: 'uscis',
        title: `USCIS ${reportType} Report`,
        description: `Travel history report for ${reportType} application`,
        parameters: { startDate, endDate, reportType, applicantInfo },
        report_data: reportData,
        file_format: 'json',
        status: 'completed',
        created_at: new Date().toISOString(),
      })
      .select()

    if (saveError) {
      console.error('Error saving report:', saveError)
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      reportId: savedReport?.[0]?.id,
      summary: {
        totalTrips,
        totalDaysOutside,
        physicalPresenceDays,
        eligibleForNaturalization: reportType === 'N-400' ? physicalPresenceDays >= (totalDaysInPeriod * 0.5) : null
      }
    })
  } catch (error) {
    console.error('Error generating USCIS report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate USCIS report' },
      { status: 500 }
    )
  }
}