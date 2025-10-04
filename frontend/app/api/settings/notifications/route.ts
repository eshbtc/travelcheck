import { NextRequest, NextResponse } from 'next/server'
import { requireServerAuth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/notifications
 * Returns current user notification settings
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
    const notifications = settings.notifications || {
      email: true,
      push: false,
      reportReady: true,
      dataConflicts: true,
      ruleUpdates: false,
      thresholds: {
        schengen90: 75,
        schengen180: 90,
        uk180: 150,
        uk12m: 10,
      },
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/notifications
 * Updates user notification settings
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
    const currentNotifications = currentSettings.notifications || {}

    // Merge with new notification settings
    const updatedNotifications = {
      ...currentNotifications,
      ...body,
    }

    // Update user settings
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        settings: {
          ...currentSettings,
          notifications: updatedNotifications,
        },
      },
    })

    return NextResponse.json(updatedNotifications)
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
}
