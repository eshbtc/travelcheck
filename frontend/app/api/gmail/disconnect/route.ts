import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const body = await request.json().catch(() => ({}))
    const { accountId, email } = body

    // Soft delete (set isActive to false) for one or all Gmail accounts
    const whereClause: any = {
      userId: userId,
      provider: 'gmail',
    }

    if (accountId) {
      whereClause.id = accountId
    }
    if (email) {
      whereClause.email = email
    }

    const result = await prisma.emailAccount.updateMany({
      where: whereClause,
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'No Gmail accounts found to disconnect' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: accountId || email ? 'Gmail account disconnected successfully' : 'All Gmail accounts disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Gmail:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Gmail account' },
      { status: 500 }
    )
  }
}
