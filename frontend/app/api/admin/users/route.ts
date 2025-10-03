import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

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

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    // Check if user is admin
    const isAdmin = await requireAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        settings: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      users: users,
    })
  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list users' },
      { status: 500 }
    )
  }
}
