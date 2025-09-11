import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  try {
    // Check database connectivity
    const { data: healthCheck, error: healthError } = await supabase
      .from('health_check')
      .select('*')
      .limit(1)

    // Check various system components
    const systemStatus = {
      database: {
        status: healthError ? 'unhealthy' : 'healthy',
        lastCheck: new Date().toISOString(),
        error: healthError?.message || null,
      },
      authentication: {
        status: 'healthy', // If we got here, auth is working
        lastCheck: new Date().toISOString(),
      },
      emailIntegrations: {
        gmail: {
          status: 'available',
          configured: !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET),
        },
        office365: {
          status: 'available', 
          configured: !!(process.env.OFFICE365_CLIENT_ID && process.env.OFFICE365_CLIENT_SECRET),
        },
      },
      ocr: {
        status: 'available',
        configured: true, // Mock OCR is always available
      },
      storage: {
        status: 'healthy',
        provider: 'supabase',
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
      version: '2.0.0-supabase',
      components: systemStatus,
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