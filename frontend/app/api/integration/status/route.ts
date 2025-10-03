import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { prisma } from '@/lib/prisma'

// Cache integration status for 60 seconds (changes infrequently)
export const revalidate = 60

export async function GET(request: NextRequest) {
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
    // Get user's email integrations
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        provider: true,
        email: true,
        isActive: true,
        lastSync: true,
        syncStatus: true,
        errorMessage: true,
        createdAt: true,
      },
    })

    // Get passport scan counts
    const passportCount = await prisma.passportScan.count({
      where: { userId: user.id },
    })

    // Get flight email counts
    const flightEmailCount = await prisma.flightEmail.count({
      where: { userId: user.id },
    })

    // Get travel entry counts
    const travelEntryCount = await prisma.travelEntry.count({
      where: { userId: user.id },
    })

    const integrationStatus = {
      emailAccounts: emailAccounts || [],
      dataCounts: {
        passportScans: passportCount,
        flightEmails: flightEmailCount,
        travelEntries: travelEntryCount,
      },
      summary: {
        totalIntegrations: emailAccounts?.length || 0,
        activeIntegrations: emailAccounts?.filter(acc => acc.isActive).length || 0,
        lastActivity: emailAccounts?.reduce((latest: Date | null, acc: any) => {
          if (!acc.lastSync) return latest
          if (!latest) return acc.lastSync
          return new Date(acc.lastSync) > new Date(latest) ? acc.lastSync : latest
        }, null),
      },
    }

    return NextResponse.json({
      success: true,
      integrations: integrationStatus,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      }
    })
  } catch (error) {
    console.error('Error getting integration status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get integration status' },
      { status: 500 }
    )
  }
}