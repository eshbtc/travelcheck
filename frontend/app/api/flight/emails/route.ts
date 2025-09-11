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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const airline = searchParams.get('airline')

    let query = supabase
      .from('flight_emails')
      .select('*')
      .eq('user_id', user.id)
      .order('date_received', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('processing_status', status)
    }

    if (airline) {
      query = query.eq('airline', airline)
    }

    const { data: emails, error } = await query

    if (error) {
      console.error('Error fetching flight emails:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch flight emails' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emails: emails || [],
      pagination: {
        limit,
        offset,
        hasMore: emails && emails.length === limit,
      },
    })
  } catch (error) {
    console.error('Error getting flight emails:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get flight emails' },
      { status: 500 }
    )
  }
}

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
      message: 'Flight email deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting flight email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete flight email' },
      { status: 500 }
    )
  }
}