import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const reportType = searchParams.get('report_type')
    const status = searchParams.get('status')

    let query = supabase
      .from('reports')
      .select('id, report_type, title, description, status, file_format, created_at, updated_at, parameters')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: reports, error } = await query

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (reportType) {
      countQuery = countQuery.eq('report_type', reportType)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    return NextResponse.json({
      success: true,
      reports: reports || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (reports?.length || 0) === limit
      }
    })
  } catch (error) {
    console.error('Error listing reports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list reports' },
      { status: 500 }
    )
  }
}