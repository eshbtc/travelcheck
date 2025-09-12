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

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { fileUrl, analysisResults, fileName } = body

    // Extract stamps for the extracted_stamps field
    const extractedStamps = analysisResults?.data?.stamps || []

    const { data, error } = await supabase
      .from('passport_scans')
      .insert({
        user_id: user.id,
        file_url: fileUrl,
        analysis_results: analysisResults,
        extracted_stamps: extractedStamps,
        file_name: fileName,
        processing_status: extractedStamps.length > 0 ? 'completed' : 'pending',
        confidence_score: extractedStamps.length > 0 ? Math.max(...extractedStamps.map((s: any) => s.confidence || 0.5)) : 0.5,
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

    // Create travel entries from extracted stamps
    if (extractedStamps.length > 0) {
      const travelEntries = extractedStamps.map((stamp: any) => ({
        user_id: user.id,
        entry_type: 'passport_stamp',
        source_id: data.id,
        source_type: 'passport_scan',
        country_code: stamp.country || 'UNKNOWN',
        country_name: stamp.country || 'UNKNOWN', 
        city: stamp.location,
        entry_date: stamp.date,
        exit_date: stamp.type === 'exit' ? stamp.date : null,
        purpose: stamp.type === 'entry' ? 'entry' : stamp.type === 'exit' ? 'exit' : 'unknown',
        transport_type: 'other',
        status: 'pending',
        confidence_score: stamp.confidence || 0.5,
        is_verified: false,
        manual_override: false,
        notes: `Extracted from passport scan - ${stamp.type} stamp`,
        metadata: {
          passport_extracted: true,
          stamp_type: stamp.type,
          original_text: stamp.metadata?.originalText,
          extraction_source: stamp.metadata?.extractedFrom
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: entriesError } = await supabase
        .from('travel_entries')
        .upsert(travelEntries, {
          onConflict: 'user_id,source_id,entry_type,country_code,entry_date',
          ignoreDuplicates: true
        })

      if (entriesError) {
        console.error('Error saving travel entries from passport stamps:', entriesError)
      } else {
        console.log(`Created ${travelEntries.length} travel entries from passport stamps`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Passport scan saved successfully',
      scan: data,
      travelEntriesCreated: extractedStamps.length
    })
  } catch (error) {
    console.error('Error saving passport scan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save passport scan' },
      { status: 500 }
    )
  }
}