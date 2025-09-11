import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

async function isAdmin(user: any): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (adminEmails.includes(user.email?.toLowerCase())) return true
  
  const { data: userDoc } = await supabase
    .from('users')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()
  
  return userDoc?.role === 'admin' || userDoc?.is_admin === true
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

  // Admin only operation
  if (!(await isAdmin(user))) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    // Get all users with active OAuth tokens for evening batch
    const { data: users, error: usersError } = await supabase
      .from('oauth_tokens')
      .select('user_id, provider, encrypted_access_token')
      .gte('expires_at', now.toISOString())

    if (usersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users for evening batch' },
        { status: 500 }
      )
    }

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      analyzed: 0,
      details: [] as any[]
    }

    // Process each user's data with focus on analysis and optimization
    for (const userToken of users || []) {
      try {
        // Check if user was already processed in evening batch today
        const { data: existingJob } = await supabase
          .from('batch_jobs')
          .select('id')
          .eq('user_id', userToken.user_id)
          .eq('job_type', 'evening_ingest')
          .gte('created_at', sixHoursAgo.toISOString())

        if (existingJob && existingJob.length > 0) {
          results.skipped++
          continue
        }

        // Create evening batch job
        const { data: batchJob, error: jobError } = await supabase
          .from('batch_jobs')
          .insert({
            user_id: userToken.user_id,
            job_type: 'evening_ingest',
            status: 'processing',
            metadata: {
              provider: userToken.provider,
              scheduled_time: now.toISOString(),
              type: 'evening_analysis'
            }
          })
          .select()

        if (jobError) {
          results.failed++
          continue
        }

        // Run enhanced analysis on recent data
        const analysisResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/travel/enhanced-analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken.encrypted_access_token}`
          },
          body: JSON.stringify({
            userId: userToken.user_id,
            timeRange: {
              startDate: sixHoursAgo.toISOString(),
              endDate: now.toISOString()
            },
            includePatterns: true,
            runOptimization: true
          })
        })

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          
          // Store analysis results
          await supabase
            .from('travel_analysis_cache')
            .upsert({
              user_id: userToken.user_id,
              analysis_type: 'evening_batch',
              analysis_data: analysisData,
              created_at: new Date().toISOString()
            })

          // Run duplicate detection
          const duplicateResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/travel/detect-duplicates`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken.encrypted_access_token}`
            },
            body: JSON.stringify({
              userId: userToken.user_id,
              autoResolve: false
            })
          })

          await supabase
            .from('batch_jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              metadata: {
                ...batchJob[0].metadata,
                analysis_results: analysisData,
                duplicates_checked: duplicateResponse.ok
              }
            })
            .eq('id', batchJob[0].id)
          
          results.processed++
          results.analyzed++
          results.details.push({
            userId: userToken.user_id,
            provider: userToken.provider,
            status: 'success',
            analyzed: true
          })
        } else {
          await supabase
            .from('batch_jobs')
            .update({ 
              status: 'failed',
              error_message: await analysisResponse.text(),
              completed_at: new Date().toISOString()
            })
            .eq('id', batchJob[0].id)
          
          results.failed++
          results.details.push({
            userId: userToken.user_id,
            provider: userToken.provider,
            status: 'failed',
            error: await analysisResponse.text()
          })
        }

      } catch (error) {
        results.failed++
        results.details.push({
          userId: userToken.user_id,
          provider: userToken.provider,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log the evening batch operation
    await supabase
      .from('system_logs')
      .insert({
        user_id: user.id,
        operation: 'evening_booking_ingest',
        details: {
          results,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      message: `Evening booking ingestion and analysis completed`,
      results
    })

  } catch (error) {
    console.error('Error in evening booking ingestion:', error)
    return NextResponse.json(
      { success: false, error: 'Evening booking ingestion failed' },
      { status: 500 }
    )
  }
}