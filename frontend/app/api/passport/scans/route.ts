import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

  try {
    const { data: scans, error } = await supabase
      .from('passport_scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to get passport scans' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scans: scans || [],
    })
  } catch (error) {
    console.error('Error getting passport scans:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get passport scans' },
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

  try {
    const body = await request.json()
    const { fileUrl, analysisResults, fileName } = body

    const { data, error } = await supabase
      .from('passport_scans')
      .insert({
        user_id: user.id,
        file_url: fileUrl,
        analysis_results: analysisResults,
        file_name: fileName,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save passport scan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Passport scan saved successfully',
      scan: data,
    })
  } catch (error) {
    console.error('Error saving passport scan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save passport scan' },
      { status: 500 }
    )
  }
}