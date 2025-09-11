import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('id')

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'Missing email ID' },
        { status: 400 }
      )
    }

    // Delete flight email
    const { error } = await supabase
      .from('flight_emails')
      .delete()
      .eq('id', emailId)
      .eq('user_id', user.id) // Security check

    if (error) {
      console.error('Error deleting flight email:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete flight email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Flight email deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting flight email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete flight email' },
      { status: 500 }
    )
  }
}