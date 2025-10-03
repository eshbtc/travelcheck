import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    // Get all active Gmail accounts for this user
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        userId: userId,
        provider: 'gmail',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        provider: true,
        createdAt: true,
        lastSync: true,
        syncStatus: true,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      connected: emailAccounts.length > 0,
      count: emailAccounts.length,
      accounts: emailAccounts.map(a => ({
        id: a.id,
        email: a.email,
        provider: a.provider,
        connectedAt: a.createdAt,
        lastSync: a.lastSync,
        syncStatus: a.syncStatus,
        isActive: a.isActive
      }))
    })
  } catch (error) {
    console.error('Error checking Gmail connection status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
