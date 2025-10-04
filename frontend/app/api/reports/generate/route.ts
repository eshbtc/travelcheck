import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

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
    const country = entry.countryCode || entry.countryName || 'Unknown'
    if (!presenceByCountry[country]) {
      presenceByCountry[country] = {
        country,
        totalDays: 0,
        entries: []
      }
    }

    const entryDate = new Date(entry.entryDate)
    const exitDate = entry.exitDate ? new Date(entry.exitDate) : new Date()
    const days = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

    presenceByCountry[country].totalDays += days
    presenceByCountry[country].entries.push({
      entryDate: entry.entryDate,
      exitDate: entry.exitDate,
      days,
      purpose: entry.purpose,
      transportType: entry.transportType
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
      date: entry.entryDate,
      country: entry.countryCode || entry.countryName,
      city: entry.city,
      purpose: entry.purpose,
      transportType: entry.transportType,
      status: entry.status
    }))
  }
}

function generateTravelSummaryReport(entries: any[], parameters: ReportParameters) {
  const byYear = entries.reduce((acc, entry) => {
    const year = new Date(entry.entryDate).getFullYear()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(entry)
    return acc
  }, {})

  const countries = Array.from(new Set(entries.map(e => e.countryCode || e.countryName)))
  const transportTypes = Array.from(new Set(entries.map(e => e.transportType).filter(Boolean)))

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
      countries: Array.from(new Set(yearEntries.map((e: any) => e.countryCode || e.countryName))).length
    })),
    byCountry: countries.map(country => ({
      country,
      visits: entries.filter(e => (e.countryCode || e.countryName) === country).length
    })).sort((a, b) => b.visits - a.visits),
    timeline: entries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const parameters: ReportParameters = await request.json()

    // Check entitlements unless admin
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true }
    })
    const isAdmin = (profile?.role || 'user') === 'admin'

    if (!isAdmin) {
      const ent = await prisma.billingEntitlement.findUnique({
        where: { userId: userId },
        select: { status: true, reportCreditsBalance: true }
      })

      const hasCredit = (ent?.reportCreditsBalance || 0) > 0
      if (!hasCredit) {
        return NextResponse.json(
          {
            success: false,
            error: 'payment_required',
            message: 'You need a report credit to generate a report. Visit pricing to buy a one‑time report or start a plan that includes credits.',
            links: { pricing: '/pricing' }
          },
          { status: 402 }
        )
      }
    }
    
    // Validate required parameters with better error messages
    if (!parameters.reportType) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: reportType' },
        { status: 400 }
      )
    }
    if (!parameters.startDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: startDate' },
        { status: 400 }
      )
    }
    if (!parameters.endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: endDate' },
        { status: 400 }
      )
    }

    // Validate date formats
    const startDateTest = new Date(parameters.startDate)
    const endDateTest = new Date(parameters.endDate)
    if (isNaN(startDateTest.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid startDate format. Expected ISO-8601 date string.' },
        { status: 400 }
      )
    }
    if (isNaN(endDateTest.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid endDate format. Expected ISO-8601 date string.' },
        { status: 400 }
      )
    }

    // Normalize reportType to string if it's an object
    let reportTypeString: string
    if (typeof parameters.reportType === 'object' && parameters.reportType !== null) {
      if ('category' in parameters.reportType) {
        const reportObj = parameters.reportType as { category: string; purpose?: string }
        reportTypeString = reportObj.category
        // Auto-generate title from purpose if available
        if (!parameters.title && reportObj.purpose) {
          parameters.title = reportObj.purpose
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid reportType object. Expected { category: string, purpose?: string }' },
          { status: 400 }
        )
      }
    } else if (typeof parameters.reportType === 'string') {
      reportTypeString = parameters.reportType
    } else {
      return NextResponse.json(
        { success: false, error: 'reportType must be a string or object with category field' },
        { status: 400 }
      )
    }

    // Validate reportTypeString is a valid type
    const validReportTypes = ['presence', 'travel_summary', 'tax_residency', 'visa_compliance', 'custom']
    if (!validReportTypes.includes(reportTypeString)) {
      return NextResponse.json(
        { success: false, error: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Auto-generate title if not provided
    if (!parameters.title) {
      parameters.title = `${reportTypeString.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`
    }

    // Get travel entries for the date range
    const entries = await prisma.travelEntry.findMany({
      where: {
        userId: userId,
        entryDate: {
          gte: new Date(parameters.startDate),
          lte: new Date(parameters.endDate)
        },
        ...(parameters.countries && parameters.countries.length > 0
          ? { countryCode: { in: parameters.countries } }
          : {})
      },
      orderBy: { entryDate: 'asc' }
    })

    // Generate report based on type (use normalized string)
    let reportData
    switch (reportTypeString) {
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

    // Save report to database (use normalized reportTypeString)
    let savedReport
    try {
      savedReport = await prisma.report.create({
        data: {
          userId: userId,
          reportType: reportTypeString,
          title: parameters.title,
          description: parameters.description || '',
          parameters: {
            ...parameters,
            reportType: reportTypeString // Save normalized version
          } as any,
          reportData: reportData as any,
          fileFormat: parameters.format || 'json',
          status: 'generated'
        }
      })
    } catch (saveError) {
      console.error('Error saving report:', saveError)
      // Still return the report data even if save fails
    }

    // Optional: decrement one-time report credit if available
    try {
      const ent = await prisma.billingEntitlement.findUnique({
        where: { userId: userId },
        select: { id: true, reportCreditsBalance: true }
      })
      if (ent && typeof ent.reportCreditsBalance === 'number' && ent.reportCreditsBalance > 0) {
        await prisma.billingEntitlement.update({
          where: { id: ent.id },
          data: { reportCreditsBalance: ent.reportCreditsBalance - 1 }
        })
      }
    } catch (e) {
      console.warn('Credit decrement skipped:', (e as Error).message)
    }

    return NextResponse.json({
      success: true,
      report: {
        id: savedReport?.id,
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
