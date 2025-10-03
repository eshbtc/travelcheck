import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

interface TravelEntry {
  id: string
  entry_date: string
  exit_date?: string | null
  country_code: string
  country_name: string
  entry_type: string
  created_at: string
}

function calculatePresence(entries: TravelEntry[], country: string, startDate: string, endDate: string): {
  daysPresent: number
  daysAbsent: number
  totalDays: number
  presencePercentage: number
  trips: any[]
} {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  let daysPresent = totalDays // Start assuming full presence
  const trips = []
  
  // Calculate days absent based on travel entries
  for (const entry of entries) {
    if (entry.country_code === country || entry.country_name === country) {
      continue // Skip entries for the country we're calculating presence for
    }
    
    const entryDate = new Date(entry.entry_date)
    const exitDate = entry.exit_date ? new Date(entry.exit_date) : end
    
    // Calculate overlap with our date range
    const overlapStart = new Date(Math.max(start.getTime(), entryDate.getTime()))
    const overlapEnd = new Date(Math.min(end.getTime(), exitDate.getTime()))
    
    if (overlapStart <= overlapEnd) {
      const daysAway = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24))
      daysPresent -= daysAway
      
      trips.push({
        destination: entry.country_name || entry.country_code,
        departureDate: overlapStart.toISOString().split('T')[0],
        returnDate: overlapEnd.toISOString().split('T')[0],
        daysAway
      })
    }
  }
  
  const daysAbsent = totalDays - daysPresent
  const presencePercentage = (daysPresent / totalDays) * 100
  
  return {
    daysPresent: Math.max(0, daysPresent),
    daysAbsent,
    totalDays,
    presencePercentage,
    trips
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const body = await request.json()
    const { 
      country = 'US',
      startDate,
      endDate,
      countryName = 'United States'
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
        userId: userId,
        entryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { entryDate: 'asc' },
    })

    // Calculate presence
    const presence = calculatePresence((entries || []) as any, country, startDate, endDate)

    // Calculate tax residency implications
    const taxResidencyAnalysis = {
      substantialPresenceTest: {
        applicable: country === 'US',
        currentYearDays: presence.daysPresent,
        requiredDays: 183,
        meets: presence.daysPresent >= 183
      },
      physicalPresenceTest: {
        applicable: true,
        percentage: presence.presencePercentage,
        requiredPercentage: 50,
        meets: presence.presencePercentage >= 50
      }
    }

    const presenceReport = {
      country: {
        code: country,
        name: countryName
      },
      period: {
        startDate,
        endDate,
        totalDays: presence.totalDays
      },
      presence: {
        daysPresent: presence.daysPresent,
        daysAbsent: presence.daysAbsent,
        presencePercentage: Math.round(presence.presencePercentage * 100) / 100
      },
      travel: {
        totalTrips: presence.trips.length,
        trips: presence.trips,
        longestAbsence: Math.max(...presence.trips.map(t => t.daysAway), 0)
      },
      taxResidency: taxResidencyAnalysis,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      presenceReport,
      summary: {
        meetsPhysicalPresence: presence.presencePercentage >= 50,
        meetsSubstantialPresence: country === 'US' ? presence.daysPresent >= 183 : null,
        totalAbsences: presence.trips.length,
        riskLevel: presence.presencePercentage < 50 ? 'high' : 
                   presence.presencePercentage < 70 ? 'medium' : 'low'
      }
    })
  } catch (error) {
    console.error('Error calculating presence:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to calculate presence' },
      { status: 500 }
    )
  }
}