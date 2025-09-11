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
    // Remove Office365 account from Supabase
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'office365')

    if (error) {
      console.error('Error disconnecting Office365:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect Office365 account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Office365 account disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Office365:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Office365 account' },
      { status: 500 }
    )
  }
}