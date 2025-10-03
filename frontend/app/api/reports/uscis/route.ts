import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

interface TravelEntry {
  id: string
  entryDate: Date
  exitDate?: Date | null
  countryCode: string
  countryName: string
  city?: string | null
  entryType: string
  purpose?: string | null
  createdAt: Date
}

function calculateDaysOutside(entries: TravelEntry[], startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let totalDays = 0

  for (const entry of entries) {
    if (entry.countryCode === 'US' || entry.countryName === 'United States') {
      continue // Skip US entries for days outside calculation
    }

    const entryDate = new Date(entry.entryDate)
    const exitDate = entry.exitDate ? new Date(entry.exitDate) : new Date()

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
    .filter(entry => entry.countryCode !== 'US' && entry.countryName !== 'United States')
    .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())

  for (const entry of sortedEntries) {
    trips.push({
      departureDate: entry.entryDate.toISOString().split('T')[0],
      returnDate: entry.exitDate ? entry.exitDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      destination: entry.countryName || entry.countryCode,
      city: entry.city,
      purpose: entry.purpose || 'Personal/Tourism',
      daysAbsent: entry.exitDate
        ? Math.ceil((new Date(entry.exitDate).getTime() - new Date(entry.entryDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    })
  }

  return trips
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

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
    const entries = await prisma.travelEntry.findMany({
      where: {
        userId: session.user.id,
        entryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { entryDate: 'asc' }
    })

    // Generate USCIS report
    const trips = generateUSCISTrips((entries || []) as any)
    const totalDaysOutside = calculateDaysOutside((entries || []) as any, startDate, endDate)
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
    let savedReport
    try {
      savedReport = await prisma.report.create({
        data: {
          userId: session.user.id,
          reportType: 'uscis',
          title: `USCIS ${reportType} Report`,
          description: `Travel history report for ${reportType} application`,
          parameters: { startDate, endDate, reportType, applicantInfo } as any,
          reportData: reportData as any,
          fileFormat: 'json',
          status: 'completed'
        }
      })
    } catch (saveError) {
      console.error('Error saving report:', saveError)
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      reportId: savedReport?.id,
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
