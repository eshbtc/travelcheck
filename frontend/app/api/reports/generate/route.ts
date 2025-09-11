import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

interface ReportParameters {
  reportType: 'presence' | 'travel_summary' | 'tax_residency' | 'visa_compliance' | 'custom'
  title: string
  description?: string
  startDate: string
  endDate: string
  countries?: string[]
  format?: 'json' | 'pdf' | 'csv' | 'xlsx'
  includeFlightData?: boolean
  includePassportData?: boolean
}

function generatePresenceReport(entries: any[], parameters: ReportParameters) {
  const presenceByCountry: any = {}
  
  entries.forEach(entry => {
    const country = entry.country_code || entry.country_name || 'Unknown'
    if (!presenceByCountry[country]) {
      presenceByCountry[country] = {
        country,
        totalDays: 0,
        entries: []
      }
    }
    
    const entryDate = new Date(entry.entry_date)
    const exitDate = entry.exit_date ? new Date(entry.exit_date) : new Date()
    const days = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    
    presenceByCountry[country].totalDays += days
    presenceByCountry[country].entries.push({
      entryDate: entry.entry_date,
      exitDate: entry.exit_date,
      days,
      purpose: entry.purpose,
      transportType: entry.transport_type
    })
  })

  return {
    reportType: parameters.reportType,
    title: parameters.title,
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: parameters.startDate,
      end: parameters.endDate
    },
    summary: {
      totalCountries: Object.keys(presenceByCountry).length,
      totalDays: Object.values(presenceByCountry).reduce((sum: number, country: any) => sum + country.totalDays, 0),
      totalEntries: entries.length
    },
    presenceByCountry: Object.values(presenceByCountry),
    detailedEntries: entries.map(entry => ({
      id: entry.id,
      date: entry.entry_date,
      country: entry.country_code || entry.country_name,
      city: entry.city,
      purpose: entry.purpose,
      transportType: entry.transport_type,
      status: entry.status
    }))
  }
}

function generateTravelSummaryReport(entries: any[], parameters: ReportParameters) {
  const byYear = entries.reduce((acc, entry) => {
    const year = new Date(entry.entry_date).getFullYear()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(entry)
    return acc
  }, {})

  const countries = Array.from(new Set(entries.map(e => e.country_code || e.country_name)))
  const transportTypes = Array.from(new Set(entries.map(e => e.transport_type).filter(Boolean)))

  return {
    reportType: parameters.reportType,
    title: parameters.title,
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: parameters.startDate,
      end: parameters.endDate
    },
    summary: {
      totalTrips: entries.length,
      uniqueCountries: countries.length,
      yearRange: `${Math.min(...Object.keys(byYear).map(Number))} - ${Math.max(...Object.keys(byYear).map(Number))}`,
      transportMethods: transportTypes
    },
    byYear: Object.entries(byYear).map(([year, yearEntries]: [string, any]) => ({
      year: parseInt(year),
      trips: yearEntries.length,
      countries: Array.from(new Set(yearEntries.map((e: any) => e.country_code || e.country_name))).length
    })),
    byCountry: countries.map(country => ({
      country,
      visits: entries.filter(e => (e.country_code || e.country_name) === country).length
    })).sort((a, b) => b.visits - a.visits),
    timeline: entries.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
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
    const parameters: ReportParameters = await request.json()
    
    if (!parameters.reportType || !parameters.title || !parameters.startDate || !parameters.endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: reportType, title, startDate, endDate' },
        { status: 400 }
      )
    }

    // Get travel entries for the date range
    let query = supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', parameters.startDate)
      .lte('entry_date', parameters.endDate)
      .order('entry_date', { ascending: true })

    if (parameters.countries && parameters.countries.length > 0) {
      query = query.in('country_code', parameters.countries)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching travel entries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel entries' },
        { status: 500 }
      )
    }

    // Generate report based on type
    let reportData
    switch (parameters.reportType) {
      case 'presence':
        reportData = generatePresenceReport(entries || [], parameters)
        break
      case 'travel_summary':
        reportData = generateTravelSummaryReport(entries || [], parameters)
        break
      case 'tax_residency':
        reportData = generatePresenceReport(entries || [], parameters)
        ;(reportData as any).taxResidencyNotes = [
          'This report shows physical presence which may be relevant for tax residency determination',
          'Consult with a tax professional for specific tax residency rules',
          'Different countries have different criteria for tax residency'
        ]
        break
      case 'visa_compliance':
        reportData = generateTravelSummaryReport(entries || [], parameters)
        ;(reportData as any).complianceNotes = [
          'Review visa duration limits for each country visited',
          'Some countries have rolling period restrictions',
          'Ensure passport validity meets entry requirements'
        ]
        break
      default:
        reportData = generateTravelSummaryReport(entries || [], parameters)
    }

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        report_type: parameters.reportType,
        title: parameters.title,
        description: parameters.description || '',
        parameters: parameters,
        report_data: reportData,
        file_format: parameters.format || 'json',
        status: 'generated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (saveError) {
      console.error('Error saving report:', saveError)
      // Still return the report data even if save fails
    }

    return NextResponse.json({
      success: true,
      report: {
        id: savedReport?.[0]?.id,
        ...reportData
      }
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}