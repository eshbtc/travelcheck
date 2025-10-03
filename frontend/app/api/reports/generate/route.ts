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
    
    if (!parameters.reportType || !parameters.title || !parameters.startDate || !parameters.endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: reportType, title, startDate, endDate' },
        { status: 400 }
      )
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
    let savedReport
    try {
      savedReport = await prisma.report.create({
        data: {
          userId: userId,
          reportType: parameters.reportType,
          title: parameters.title,
          description: parameters.description || '',
          parameters: parameters as any,
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
