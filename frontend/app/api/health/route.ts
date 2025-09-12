import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Simple health check - test database connection
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-supabase',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}