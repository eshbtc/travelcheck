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
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const defaultPreferences = {
      syncFrequency: 'daily',
      emailSync: true,
      passportProcessing: true,
      duplicateDetection: true,
      notifications: {
        email: true,
        syncComplete: true,
        duplicatesFound: true,
        lowConfidence: false
      },
      schedules: {
        emailSync: '06:00',
        duplicateCheck: '12:00',
        cleanup: '02:00'
      }
    }

    return NextResponse.json({
      success: true,
      preferences: preferences?.preferences || defaultPreferences
    })
  } catch (error) {
    console.error('Error fetching schedule preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
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
    const { preferences } = body

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferences,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences
    })
  } catch (error) {
    console.error('Error updating schedule preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}