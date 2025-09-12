import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

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

    // Remove one or all Office365 accounts
    let query = supabase
      .from('email_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'office365')

    if (accountId) {
      query = query.eq('id', accountId)
    }
    if (email) {
      query = query.eq('email', email)
    }

    const { error } = await query

    if (error) {
      console.error('Error disconnecting Office365:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect Office365 account' },
        { status: 500 }
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
