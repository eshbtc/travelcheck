import { NextRequest, NextResponse } from 'next/server'
import { requireServerAuth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/privacy
 * Returns current user privacy settings
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
    const privacy = settings.privacy || {
      dataRetentionDays: 365,
      shareAnalytics: false,
      allowResearch: false,
      exportFormats: ['json', 'csv'],
    }

    return NextResponse.json(privacy)
  } catch (error) {
    console.error('Error fetching privacy settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/privacy
 * Updates user privacy settings
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
    const currentPrivacy = currentSettings.privacy || {}

    // Merge with new privacy settings
    const updatedPrivacy = {
      ...currentPrivacy,
      ...body,
    }

    // Update user settings
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        settings: {
          ...currentSettings,
          privacy: updatedPrivacy,
        },
      },
    })

    return NextResponse.json(updatedPrivacy)
  } catch (error) {
    console.error('Error updating privacy settings:', error)
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    )
  }
}
