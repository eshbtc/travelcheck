import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import { TravelHistorySchema, validateInput, sanitizeForLogging } from '../../../../src/lib/validation'

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const travelHistory = await prisma.travelHistory.findUnique({
      where: { userId: userId },
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
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

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
      where: { userId: userId },
      create: {
        userId: userId,
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