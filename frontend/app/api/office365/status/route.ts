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
    // Get all active Office365 accounts for this user
    const { data: emailAccounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'office365')
      .eq('is_active', true)

    if (error) {
      console.error('Error checking Office365 connection status:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to check connection status' },
        { status: 500 }
      )
    }

    const accounts = emailAccounts || []
    return NextResponse.json({
      success: true,
      connected: accounts.length > 0,
      count: accounts.length,
      accounts: accounts.map(a => ({
        id: a.id,
        email: a.email,
        provider: a.provider,
        connectedAt: a.created_at,
        lastSync: a.last_sync,
        syncStatus: a.sync_status,
        isActive: a.is_active
      }))
    })
  } catch (error) {
    console.error('Error checking Office365 connection status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
