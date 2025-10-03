import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const entryType = searchParams.get('entry_type')

    // Build Prisma where clause
    const where: any = { userId: user.id }
    if (status) {
      where.status = status
    }
    if (entryType) {
      where.entryType = entryType
    }

    const entries = await prisma.travelEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      skip: offset,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      entries: entries || [],
      pagination: {
        limit,
        offset,
        hasMore: entries && entries.length === limit,
      },
    })
  } catch (error) {
    console.error('Error getting travel entries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get travel entries' },
      { status: 500 }
    )
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
    const body = await request.json()
    const {
      entry_type,
      country_code,
      country_name,
      city,
      airport_code,
      entry_date,
      exit_date,
      entry_time,
      exit_time,
      timezone,
      purpose,
      transport_type,
      carrier,
      flight_number,
      confirmation_number,
      notes,
      tags,
    } = body

    if (!entry_type || !country_code || !entry_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entry_type, country_code, entry_date' },
        { status: 400 }
      )
    }

    const entry = await prisma.travelEntry.create({
      data: {
        userId: user.id,
        entryType: entry_type,
        sourceType: 'manual',
        countryCode: country_code,
        countryName: country_name,
        city,
        airportCode: airport_code,
        entryDate: new Date(entry_date),
        exitDate: exit_date ? new Date(exit_date) : null,
        entryTime: entry_time,
        exitTime: exit_time,
        timezone,
        purpose,
        transportType: transport_type,
        carrier,
        flightNumber: flight_number,
        confirmationNumber: confirmation_number,
        status: 'confirmed',
        confidenceScore: 1.0,
        isVerified: true,
        manualOverride: true,
        notes,
        tags: tags || [],
        metadata: {},
      },
    })

    return NextResponse.json({
      success: true,
      entry,
    })
  } catch (error) {
    console.error('Error creating travel entry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create travel entry' },
      { status: 500 }
    )
  }
}