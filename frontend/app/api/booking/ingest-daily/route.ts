import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

async function isAdmin(user: any): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (adminEmails.includes(user.email?.toLowerCase())) return true
  
  const { data: userDoc } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  return userDoc?.role === 'admin'
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
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get all users with active email accounts for batch ingestion
    const { data: users, error: usersError } = await supabase
      .from('email_accounts')
      .select('user_id, provider, access_token')
      .eq('is_active', true)
      .not('access_token', 'is', null)

    if (usersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users for batch ingestion' },
        { status: 500 }
      )
    }

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    }

    // Process each user's booking data
    for (const userToken of users || []) {
      try {
        // Check if user was already processed today
        const { data: existingJob } = await supabase
          .from('batch_jobs')
          .select('id')
          .eq('user_id', userToken.user_id)
          .eq('job_type', 'daily_ingest')
          .gte('created_at', yesterday.toISOString())

        if (existingJob && existingJob.length > 0) {
          results.skipped++
          continue
        }

        // Create batch job record
        const { data: batchJob, error: jobError } = await supabase
          .from('batch_jobs')
          .insert({
            user_id: userToken.user_id,
            job_type: 'daily_ingest',
            status: 'processing',
            metadata: {
              provider: userToken.provider,
              scheduled_time: now.toISOString()
            }
          })
          .select()

        if (jobError) {
          results.failed++
          continue
        }

        // Use unified sync/daily route instead of provider-specific routes
        const syncResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/sync/daily`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET || 'local-dev-secret'}`
          },
          body: JSON.stringify({
            singleUser: userToken.user_id, // Process only this user
            batchJobId: batchJob[0].id,
            timeRange: {
              startDate: yesterday.toISOString(),
              endDate: now.toISOString()
            }
          })
        })

        if (syncResponse.ok) {
          await supabase
            .from('batch_jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', batchJob[0].id)
          
          results.processed++
          results.details.push({
            userId: userToken.user_id,
            provider: userToken.provider,
            status: 'success'
          })
        } else {
          await supabase
            .from('batch_jobs')
            .update({ 
              status: 'failed',
              error_message: await syncResponse.text(),
              completed_at: new Date().toISOString()
            })
            .eq('id', batchJob[0].id)
          
          results.failed++
          results.details.push({
            userId: userToken.user_id,
            provider: userToken.provider,
            status: 'failed',
            error: await syncResponse.text()
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

    // Log the batch operation
    await supabase
      .from('system_logs')
      .insert({
        user_id: user.id,
        operation: 'daily_booking_ingest',
        details: {
          results,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      message: `Daily booking ingestion completed`,
      results
    })

  } catch (error) {
    console.error('Error in daily booking ingestion:', error)
    return NextResponse.json(
      { success: false, error: 'Daily booking ingestion failed' },
      { status: 500 }
    )
  }
}