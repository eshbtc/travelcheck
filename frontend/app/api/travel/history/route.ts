import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TravelHistorySchema, validateInput, sanitizeForLogging } from '@/lib/validation'

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
    const travelHistory = await prisma.travelHistory.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      travelHistory: travelHistory || null,
    })
  } catch (error) {
    console.error('Error getting travel history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get travel history' },
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
    console.log('Travel history save request:', sanitizeForLogging(body))

    const { passportData, flightData } = body

    // Validate input data
    const validation = validateInput(TravelHistorySchema, { passportData, flightData })
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Upsert travel history
    const data = await prisma.travelHistory.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passportData: passportData as any,
        flightData: flightData as any,
      },
      update: {
        passportData: passportData as any,
        flightData: flightData as any,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Travel history saved successfully',
      travelHistory: data,
    })
  } catch (error) {
    console.error('Error saving travel history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save travel history' },
      { status: 500 }
    )
  }
}