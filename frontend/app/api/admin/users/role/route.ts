import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to check if user is admin
async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true }
  })

  if (!user) return false

  // Check admin emails from environment
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  const isAdmin = user.role === 'admin' || adminEmails.includes(user.email || '')

  return isAdmin
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)

  try {
    // Check if user is admin
    const isAdmin = await requireAdmin(session.user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { targetUserId, role } = body

    if (!targetUserId || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing targetUserId or role' },
        { status: 400 }
      )
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin or user' },
        { status: 400 }
      )
    }

    // Update user role
    const data = await prisma.user.update({
      where: { id: targetUserId },
      data: { role }
    })

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: data,
    })
  } catch (error) {
    console.error('Error setting user role:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to set user role' },
      { status: 500 }
    )
  }
}
