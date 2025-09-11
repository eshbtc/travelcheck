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

  const { user } = authResult

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  try {
    // Get user's email integrations
    const { data: emailAccounts, error } = await supabase
      .from('email_accounts')
      .select('provider, email, is_active, last_sync, sync_status, error_message, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching integration status:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch integration status' },
        { status: 500 }
      )
    }

    // Get passport scan counts
    const { count: passportCount, error: passportError } = await supabase
      .from('passport_scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get flight email counts  
    const { count: flightEmailCount, error: flightError } = await supabase
      .from('flight_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get travel entry counts
    const { count: travelEntryCount, error: travelError } = await supabase
      .from('travel_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const integrationStatus = {
      emailAccounts: emailAccounts || [],
      dataCounts: {
        passportScans: passportError ? 0 : (passportCount || 0),
        flightEmails: flightError ? 0 : (flightEmailCount || 0), 
        travelEntries: travelError ? 0 : (travelEntryCount || 0),
      },
      summary: {
        totalIntegrations: emailAccounts?.length || 0,
        activeIntegrations: emailAccounts?.filter(acc => acc.is_active).length || 0,
        lastActivity: emailAccounts?.reduce((latest: string | null, acc: any) => {
          if (!acc.last_sync) return latest
          if (!latest) return acc.last_sync
          return new Date(acc.last_sync) > new Date(latest) ? acc.last_sync : latest
        }, null),
      },
    }

    return NextResponse.json({
      success: true,
      integrations: integrationStatus,
    })
  } catch (error) {
    console.error('Error getting integration status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get integration status' },
      { status: 500 }
    )
  }
}