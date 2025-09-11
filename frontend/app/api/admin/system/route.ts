import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

async function isAdmin(user: any): Promise<boolean> {
  try {
    // Check admin emails from environment
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (adminEmails.includes(user.email?.toLowerCase())) {
      return true
    }

    // Check user role in database
    const { data: userDoc, error } = await supabase
      .from('users')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()

    if (!error && userDoc) {
      return userDoc.role === 'admin' || userDoc.is_admin === true
    }
  } catch (error) {
    console.error('Error checking admin status:', error)
  }
  return false
}

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

  // Check if user is admin
  const adminStatus = await isAdmin(user)
  if (!adminStatus) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    // Get system statistics
    const stats = await Promise.all([
      // Total users
      supabase.from('users').select('*', { count: 'exact', head: true }),
      
      // Active email accounts
      supabase.from('email_accounts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      
      // Recent passport scans (last 7 days)
      supabase.from('passport_scans').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Recent flight emails (last 7 days)
      supabase.from('flight_emails').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Total travel entries
      supabase.from('travel_entries').select('*', { count: 'exact', head: true }),
      
      // Recent reports (last 30 days)
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Pending duplicates
      supabase.from('duplicate_groups').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ])

    // Get processing status by type
    const processingStats = await Promise.all([
      supabase.from('passport_scans').select('processing_status', { count: 'exact' }),
      supabase.from('flight_emails').select('processing_status', { count: 'exact' }),
      supabase.from('travel_entries').select('status', { count: 'exact' })
    ])

    // System health metrics
    const systemHealth = {
      database: 'healthy',
      api: 'healthy',
      lastHealthCheck: new Date().toISOString(),
      uptime: process.uptime ? Math.floor(process.uptime()) : 0
    }

    // Recent activity
    const { data: recentActivity } = await supabase
      .from('passport_scans')
      .select('id, created_at, user_id, processing_status')
      .order('created_at', { ascending: false })
      .limit(10)

    const systemStatus = {
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      
      statistics: {
        totalUsers: stats[0].count || 0,
        activeEmailAccounts: stats[1].count || 0,
        recentPassportScans: stats[2].count || 0,
        recentFlightEmails: stats[3].count || 0,
        totalTravelEntries: stats[4].count || 0,
        recentReports: stats[5].count || 0,
        pendingDuplicates: stats[6].count || 0
      },
      
      processing: {
        passportScans: {
          total: processingStats[0].data?.length || 0,
          // You'd count by status here
        },
        flightEmails: {
          total: processingStats[1].data?.length || 0,
        },
        travelEntries: {
          total: processingStats[2].data?.length || 0,
        }
      },
      
      health: systemHealth,
      
      recentActivity: recentActivity || [],
      
      configuration: {
        gmailEnabled: !!process.env.GMAIL_CLIENT_ID,
        office365Enabled: !!process.env.OFFICE365_CLIENT_ID,
        ocrEnabled: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        supabaseConnected: !!process.env.SUPABASE_URL,
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