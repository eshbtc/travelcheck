import { NextRequest, NextResponse } from 'next/server'
import { requireServerAuth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/preferences
 * Returns current user preferences
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireServerAuth()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const settings = (user.settings as any) || {}
    const preferences = settings.preferences || {
      timezone: settings.timezone || 'UTC',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      language: 'en',
      defaultAttributionPolicy: 'midnight',
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/preferences
 * Updates user preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireServerAuth()
    const body = await req.json()

    // Get current settings
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    })

    const currentSettings = (currentUser?.settings as any) || {}
    const currentPreferences = currentSettings.preferences || {}

    // Merge with new preferences
    const updatedPreferences = {
      ...currentPreferences,
      ...body,
    }

    // Also update the root timezone field if changed
    const updatedSettings = {
      ...currentSettings,
      preferences: updatedPreferences,
    }

    if (body.timezone) {
      updatedSettings.timezone = body.timezone
    }

    // Update user settings
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        settings: updatedSettings,
      },
    })

    return NextResponse.json(updatedPreferences)
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
