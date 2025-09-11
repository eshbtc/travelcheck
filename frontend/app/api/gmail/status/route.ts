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
    // Check if Gmail account is connected
    const { data: emailAccounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)

    if (error) {
      console.error('Error checking Gmail connection status:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to check connection status' },
        { status: 500 }
      )
    }

    if (emailAccounts && emailAccounts.length > 0) {
      const account = emailAccounts[0]
      return NextResponse.json({
        success: true,
        connected: true,
        provider: account.provider,
        email: account.email,
        connectedAt: account.created_at,
        lastSync: account.last_sync,
        syncStatus: account.sync_status,
        isActive: account.is_active,
      })
    } else {
      return NextResponse.json({
        success: true,
        connected: false,
      })
    }
  } catch (error) {
    console.error('Error checking Gmail connection status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}