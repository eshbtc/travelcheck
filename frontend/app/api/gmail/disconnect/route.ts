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
    // Remove Gmail account from Supabase
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'gmail')

    if (error) {
      console.error('Error disconnecting Gmail:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect Gmail account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail account disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Gmail:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Gmail account' },
      { status: 500 }
    )
  }
}