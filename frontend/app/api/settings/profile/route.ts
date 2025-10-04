import { NextRequest, NextResponse } from 'next/server'
import { requireServerAuth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/profile
 * Returns current user profile data
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireServerAuth()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        emailVerified: true,
        settings: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse settings JSON to get timezone
    const settings = user.settings as any
    const timezone = settings?.timezone || 'UTC'

    return NextResponse.json({
      displayName: user.displayName || user.name || '',
      email: user.email || '',
      emailVerified: !!user.emailVerified,
      timezone,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLogin?.toISOString() || user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/profile
 * Updates user profile data
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireServerAuth()
    const body = await req.json()

    const { displayName, email, timezone } = body

    // Validate required fields
    if (!displayName || !email || !timezone) {
      return NextResponse.json(
        { error: 'displayName, email, and timezone are required' },
        { status: 400 }
      )
    }

    // Check if email is being changed and if it's already in use
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        )
      }
    }

    // Get current settings
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    })

    const currentSettings = (currentUser?.settings as any) || {}

    // Update user with new data
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName,
        name: displayName, // Keep in sync
        email,
        settings: {
          ...currentSettings,
          timezone,
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerified: true,
        settings: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    const settings = updatedUser.settings as any

    return NextResponse.json({
      displayName: updatedUser.displayName || '',
      email: updatedUser.email || '',
      emailVerified: !!updatedUser.emailVerified,
      timezone: settings?.timezone || 'UTC',
      createdAt: updatedUser.createdAt.toISOString(),
      lastLoginAt: updatedUser.lastLogin?.toISOString() || updatedUser.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
