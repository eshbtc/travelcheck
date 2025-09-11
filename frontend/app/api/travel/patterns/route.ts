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
    const { data: entries, error } = await supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel data' },
        { status: 500 }
      )
    }

    // Analyze travel patterns
    const patterns: any = {
      monthly: Array(12).fill(0),
      yearly: {},
      destinations: {},
      durations: {},
      frequency: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0
      }
    }

    entries?.forEach((entry: any) => {
      const entryDate = new Date(entry.entry_date)
      const month = entryDate.getMonth()
      const year = entryDate.getFullYear()
      const country = entry.country_name || entry.country_code

      patterns.monthly[month]++
      patterns.yearly[year] = (patterns.yearly[year] || 0) + 1
      patterns.destinations[country] = (patterns.destinations[country] || 0) + 1

      if (entry.exit_date) {
        const duration = Math.ceil(
          (new Date(entry.exit_date).getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const bucket = duration <= 7 ? 'week' : duration <= 30 ? 'month' : duration <= 90 ? 'quarter' : 'extended'
        patterns.durations[bucket] = (patterns.durations[bucket] || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      patterns: {
        ...patterns,
        insights: {
          peakMonth: patterns.monthly.indexOf(Math.max(...patterns.monthly)),
          topDestination: Object.keys(patterns.destinations).reduce((a, b) => 
            patterns.destinations[a] > patterns.destinations[b] ? a : b, ''),
          totalTrips: entries?.length || 0,
          averagePerYear: entries?.length ? 
            (entries.length / Math.max(1, Object.keys(patterns.yearly).length)) : 0
        }
      }
    })
  } catch (error) {
    console.error('Error analyzing travel patterns:', error)
    return NextResponse.json(
      { success: false, error: 'Pattern analysis failed' },
      { status: 500 }
    )
  }
}