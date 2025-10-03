import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const userPreferences = await prisma.userPreference.findUnique({
      where: { userId: userId },
    })

    const defaultPreferences = {
      syncFrequency: 'daily',
      emailSync: true,
      passportProcessing: true,
      duplicateDetection: true,
      notifications: {
        email: true,
        syncComplete: true,
        duplicatesFound: true,
        lowConfidence: false
      },
      schedules: {
        emailSync: '06:00',
        duplicateCheck: '12:00',
        cleanup: '02:00'
      }
    }

    return NextResponse.json({
      success: true,
      preferences: userPreferences?.preferences || defaultPreferences
    })
  } catch (error) {
    console.error('Error fetching schedule preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
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
    const { preferences } = body

    // Upsert user preferences
    await prisma.userPreference.upsert({
      where: { userId: userId },
      update: {
        preferences,
        updatedAt: new Date(),
      },
      create: {
        userId: userId,
        preferences,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences
    })
  } catch (error) {
    console.error('Error updating schedule preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}