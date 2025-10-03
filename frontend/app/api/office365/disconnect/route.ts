import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}))
    const { accountId, email } = body

    // Soft delete (set isActive to false) for one or all Office365 accounts
    const whereClause: any = {
      userId: user.id,
      provider: 'office365',
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
        { success: false, error: 'No Office365 accounts found to disconnect' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: accountId || email ? 'Office365 account disconnected successfully' : 'All Office365 accounts disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Office365:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Office365 account' },
      { status: 500 }
    )
  }
}
