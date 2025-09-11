import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { requireAuth } from '../../auth/middleware'

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
    const { data: travelHistory, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to get travel history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      travelHistory: travelHistory || null,
    })
  } catch (error) {
    console.error('Error getting travel history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get travel history' },
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
    const { passportData, flightData } = body

    // Upsert travel history
    const { data, error } = await supabase
      .from('travel_history')
      .upsert({
        user_id: user.id,
        passport_data: passportData,
        flight_data: flightData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save travel history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Travel history saved successfully',
      travelHistory: data,
    })
  } catch (error) {
    console.error('Error saving travel history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save travel history' },
      { status: 500 }
    )
  }
}