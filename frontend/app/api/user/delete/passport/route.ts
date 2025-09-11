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
    const scanId = searchParams.get('id')

    if (!scanId) {
      return NextResponse.json(
        { success: false, error: 'Missing scan ID' },
        { status: 400 }
      )
    }

    // Delete passport scan
    const { error } = await supabase
      .from('passport_scans')
      .delete()
      .eq('id', scanId)
      .eq('user_id', user.id) // Security check

    if (error) {
      console.error('Error deleting passport scan:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete passport scan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Passport scan deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting passport scan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete passport scan' },
      { status: 500 }
    )
  }
}