import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const { searchParams } = new URL(request.url)

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Filter parameters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const airline = searchParams.get('airline')
    const airport = searchParams.get('airport')
    const minConfidence = searchParams.get('minConfidence')
    const search = searchParams.get('search')

    // Build where clause
    const where: Prisma.FlightEmailWhereInput = {
      userId,
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.dateReceived = {}
      if (dateFrom) {
        where.dateReceived.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.dateReceived.lte = new Date(dateTo)
      }
    }

    // Airline filter
    if (airline) {
      where.airline = {
        contains: airline,
        mode: 'insensitive',
      }
    }

    // Airport filter (departure or arrival)
    if (airport) {
      where.OR = [
        { departureAirport: { contains: airport, mode: 'insensitive' } },
        { arrivalAirport: { contains: airport, mode: 'insensitive' } },
      ]
    }

    // Confidence score filter
    if (minConfidence) {
      where.confidenceScore = {
        gte: parseFloat(minConfidence),
      }
    }

    // Search filter (subject or sender)
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { sender: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Fetch emails with pagination
    const [emails, totalCount] = await Promise.all([
      prisma.flightEmail.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          dateReceived: 'desc',
        },
        include: {
          emailAccount: {
            select: {
              email: true,
              provider: true,
            },
          },
        },
      }),
      prisma.flightEmail.count({ where }),
    ])

    // Calculate aggregate stats
    const [
      totalEmails,
      flightsFound,
      airlineStats,
      confidenceStats,
      dateRange,
    ] = await Promise.all([
      // Total emails
      prisma.flightEmail.count({
        where: { userId },
      }),
      // Emails with flights found
      prisma.flightEmail.count({
        where: {
          userId,
          isProcessed: true,
          flightData: { not: Prisma.JsonNull },
        },
      }),
      // Group by airline
      prisma.flightEmail.groupBy({
        by: ['airline'],
        where: {
          userId,
          airline: { not: null },
        },
        _count: {
          airline: true,
        },
        orderBy: {
          _count: {
            airline: 'desc',
          },
        },
        take: 10,
      }),
      // Group by confidence score ranges
      prisma.flightEmail.groupBy({
        by: ['confidenceScore'],
        where: {
          userId,
          confidenceScore: { not: null },
        },
        _count: {
          confidenceScore: true,
        },
      }),
      // Date range
      prisma.flightEmail.aggregate({
        where: { userId },
        _min: {
          dateReceived: true,
        },
        _max: {
          dateReceived: true,
        },
      }),
    ])

    // Group confidence scores into ranges
    const confidenceRanges = {
      high: 0, // >= 0.8
      medium: 0, // 0.5 - 0.79
      low: 0, // < 0.5
    }

    confidenceStats.forEach((stat: any) => {
      const score = stat.confidenceScore
      if (score) {
        const scoreNum = typeof score === 'number' ? score : parseFloat(score.toString())
        if (scoreNum >= 0.8) {
          confidenceRanges.high += stat._count.confidenceScore
        } else if (scoreNum >= 0.5) {
          confidenceRanges.medium += stat._count.confidenceScore
        } else {
          confidenceRanges.low += stat._count.confidenceScore
        }
      }
    })

    const stats = {
      total: totalEmails,
      flightsFound,
      dateRange: {
        earliest: dateRange._min.dateReceived,
        latest: dateRange._max.dateReceived,
      },
      byAirline: airlineStats.map((stat: any) => ({
        airline: stat.airline,
        count: stat._count.airline,
      })),
      byConfidence: confidenceRanges,
    }

    return NextResponse.json({
      success: true,
      emails,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + emails.length < totalCount,
      },
      stats,
    })
  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch emails',
      },
      { status: 500 }
    )
  }
}
