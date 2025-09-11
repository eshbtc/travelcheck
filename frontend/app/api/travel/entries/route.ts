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
    const entryType = searchParams.get('entry_type')

    let query = supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (entryType) {
      query = query.eq('entry_type', entryType)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching travel entries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel entries' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: entries || [],
      pagination: {
        limit,
        offset,
        hasMore: entries && entries.length === limit,
      },
    })
  } catch (error) {
    console.error('Error getting travel entries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get travel entries' },
      { status: 500 }
    )
  }
}

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
    const body = await request.json()
    const {
      entry_type,
      country_code,
      country_name,
      city,
      airport_code,
      entry_date,
      exit_date,
      entry_time,
      exit_time,
      timezone,
      purpose,
      transport_type,
      carrier,
      flight_number,
      confirmation_number,
      notes,
      tags,
    } = body

    if (!entry_type || !country_code || !entry_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entry_type, country_code, entry_date' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('travel_entries')
      .insert({
        user_id: user.id,
        entry_type,
        source_type: 'manual',
        country_code,
        country_name,
        city,
        airport_code,
        entry_date,
        exit_date,
        entry_time,
        exit_time,
        timezone,
        purpose,
        transport_type,
        carrier,
        flight_number,
        confirmation_number,
        status: 'confirmed',
        confidence_score: 1.0,
        is_verified: true,
        manual_override: true,
        notes,
        tags: tags || [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Error creating travel entry:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create travel entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entry: data[0],
    })
  } catch (error) {
    console.error('Error creating travel entry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create travel entry' },
      { status: 500 }
    )
  }
}