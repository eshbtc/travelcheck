import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '../../auth/middleware'
import { UserProfileSchema, validateInput, sanitizeForLogging } from '@/lib/validation'

export async function GET(request: NextRequest) {
  // Authenticate user
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
    // Get user profile from Prisma
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: profile,
    })
  } catch (error) {
    console.error('Error getting user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get user profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Authenticate user
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
    console.log('Profile update request:', sanitizeForLogging(body))

    const { profileData } = body

    // Validate input data
    const validation = validateInput(UserProfileSchema, profileData)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Update user profile in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...profileData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}