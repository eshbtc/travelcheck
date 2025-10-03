import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true }
    })

    if (!user) return false

    // Check admin emails from environment
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (adminEmails.includes(user.email?.toLowerCase() || '')) {
      return true
    }

    // Check user role in database
    return user.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
  }
  return false
}

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)

  // Check if user is admin
  const adminStatus = await isAdmin(session.user.id)
  if (!adminStatus) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    // Calculate cutoff dates
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Get system statistics
    const [
      totalUsers,
      activeEmailAccounts,
      recentPassportScans,
      recentFlightEmails,
      totalTravelEntries,
      recentReports,
      pendingDuplicates,
      recentActivity
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Active email accounts
      prisma.emailAccount.count({
        where: { isActive: true }
      }),

      // Recent passport scans (last 7 days)
      prisma.passportScan.count({
        where: {
          createdAt: { gte: sevenDaysAgo }
        }
      }),

      // Recent flight emails (last 7 days)
      prisma.flightEmail.count({
        where: {
          createdAt: { gte: sevenDaysAgo }
        }
      }),

      // Total travel entries
      prisma.travelEntry.count(),

      // Recent reports (last 30 days)
      prisma.report.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      }),

      // Pending duplicates
      prisma.duplicateGroup.count({
        where: { status: 'pending' }
      }),

      // Recent activity
      prisma.passportScan.findMany({
        select: {
          id: true,
          createdAt: true,
          userId: true,
          processingStatus: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    // System health metrics
    const systemHealth = {
      database: 'healthy',
      api: 'healthy',
      lastHealthCheck: new Date().toISOString(),
      uptime: process.uptime ? Math.floor(process.uptime()) : 0
    }

    const systemStatus = {
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),

      statistics: {
        totalUsers,
        activeEmailAccounts,
        recentPassportScans,
        recentFlightEmails,
        totalTravelEntries,
        recentReports,
        pendingDuplicates
      },

      processing: {
        passportScans: {
          total: recentPassportScans
        },
        flightEmails: {
          total: recentFlightEmails
        },
        travelEntries: {
          total: totalTravelEntries
        }
      },

      health: systemHealth,

      recentActivity: recentActivity || [],

      configuration: {
        gmailEnabled: !!process.env.GMAIL_CLIENT_ID,
        office365Enabled: !!process.env.OFFICE365_CLIENT_ID,
        ocrEnabled: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        prismaConnected: true
      }
    }

    return NextResponse.json({
      success: true,
      systemStatus
    })
  } catch (error) {
    console.error('Error fetching admin system status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}
