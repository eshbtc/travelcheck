import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

// Cache system status for 30 seconds
export const revalidate = 30

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    // Check database connectivity
    let dbHealthy = true
    let dbError = null
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      dbHealthy = false
      dbError = error instanceof Error ? error.message : 'Database connection failed'
    }

    // Check various system components
    const systemStatus = {
      database: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: dbError,
      },
      authentication: {
        status: 'healthy', // If we got here, auth is working
        lastCheck: new Date().toISOString(),
      },
      emailIntegrations: {
        gmail: {
          status: 'available',
          configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        },
        office365: {
          status: 'available',
          configured: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
        },
      },
      ocr: {
        status: 'available',
        configured: true, // Mock OCR is always available
      },
      storage: {
        status: 'healthy',
        provider: 'r2',
      },
    }

    const overallStatus = Object.values(systemStatus).every(component =>
      typeof component === 'object' && 'status' in component ?
        component.status === 'healthy' || component.status === 'available' : true
    ) ? 'healthy' : 'degraded'

    return NextResponse.json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '3.0.0-railway',
      components: systemStatus,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      }
    })
  } catch (error) {
    console.error('Error getting system status:', error)
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: 'System status check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}