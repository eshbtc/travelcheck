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
    const body = await request.json()
    const { 
      operation = 'analyze', 
      batchSize = 50,
      priorityUser = null,
      optimizationType = 'performance'
    } = body

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    let results: any = {
      analyzed: 0,
      optimized: 0,
      errors: 0,
      recommendations: [],
      performance: {}
    }

    switch (operation) {
      case 'analyze':
        // Analyze current batch processing performance
        const { data: recentJobs } = await supabase
          .from('batch_jobs')
          .select('*')
          .gte('created_at', oneHourAgo.toISOString())
          .order('created_at', { ascending: false })

        const { data: queuedJobs } = await supabase
          .from('batch_jobs')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        const { data: processingJobs } = await supabase
          .from('batch_jobs')
          .select('*')
          .eq('status', 'processing')

        results.performance = {
          recent_jobs: recentJobs?.length || 0,
          queued_jobs: queuedJobs?.length || 0,
          processing_jobs: processingJobs?.length || 0,
          avg_processing_time: recentJobs?.reduce((sum, job) => {
            if (job.completed_at && job.created_at) {
              const duration = new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()
              return sum + duration
            }
            return sum
          }, 0) / (recentJobs?.length || 1),
          success_rate: (recentJobs?.filter(job => job.status === 'completed').length || 0) / (recentJobs?.length || 1)
        }

        // Generate recommendations
        if ((queuedJobs?.length || 0) > 10) {
          results.recommendations.push('High queue backlog detected - consider increasing batch size')
        }
        if (results.performance.success_rate < 0.8) {
          results.recommendations.push('Low success rate - investigate failing jobs')
        }
        if (results.performance.avg_processing_time > 300000) { // 5 minutes
          results.recommendations.push('High processing time - optimize job complexity')
        }

        results.analyzed = 1
        break

      case 'optimize_queue':
        // Optimize job queue processing
        const { data: stuckJobs } = await supabase
          .from('batch_jobs')
          .select('*')
          .eq('status', 'processing')
          .lt('created_at', oneHourAgo.toISOString())

        // Reset stuck jobs
        if (stuckJobs && stuckJobs.length > 0) {
          await supabase
            .from('batch_jobs')
            .update({ 
              status: 'pending',
              error_message: 'Reset due to optimization - job was stuck in processing',
              updated_at: new Date().toISOString()
            })
            .in('id', stuckJobs.map(job => job.id))

          results.optimized = stuckJobs.length
          results.recommendations.push(`Reset ${stuckJobs.length} stuck jobs`)
        }

        // Prioritize jobs by user or type
        if (priorityUser) {
          const { data: priorityJobs } = await supabase
            .from('batch_jobs')
            .select('*')
            .eq('user_id', priorityUser)
            .eq('status', 'pending')
            .limit(batchSize)

          if (priorityJobs && priorityJobs.length > 0) {
            await supabase
              .from('batch_jobs')
              .update({ 
                priority: 1,
                updated_at: new Date().toISOString()
              })
              .in('id', priorityJobs.map(job => job.id))

            results.recommendations.push(`Prioritized ${priorityJobs.length} jobs for user ${priorityUser}`)
          }
        }
        break

      case 'cleanup':
        // Clean up old completed jobs
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        
        const { data: oldJobs, error: deleteError } = await supabase
          .from('batch_jobs')
          .delete()
          .eq('status', 'completed')
          .lt('completed_at', thirtyDaysAgo.toISOString())
          .select()

        if (!deleteError && oldJobs) {
          results.optimized = oldJobs.length
          results.recommendations.push(`Cleaned up ${oldJobs.length} old completed jobs`)
        }

        // Clean up orphaned sync jobs
        const { data: orphanedSyncs, error: syncDeleteError } = await supabase
          .from('sync_jobs')
          .delete()
          .eq('status', 'completed')
          .lt('completed_at', thirtyDaysAgo.toISOString())
          .select()

        if (!syncDeleteError && orphanedSyncs) {
          results.recommendations.push(`Cleaned up ${orphanedSyncs.length} old sync jobs`)
        }
        break

      case 'rebalance':
        // Rebalance processing load across time periods
        const { data: pendingJobs } = await supabase
          .from('batch_jobs')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(batchSize)

        if (pendingJobs && pendingJobs.length > 0) {
          // Distribute jobs across different time slots
          const timeSlots = 4 // Distribute across 4 time slots
          const jobsPerSlot = Math.ceil(pendingJobs.length / timeSlots)

          for (let i = 0; i < pendingJobs.length; i++) {
            const slotIndex = Math.floor(i / jobsPerSlot)
            const scheduledTime = new Date(now.getTime() + (slotIndex * 15 * 60 * 1000)) // 15-minute intervals

            await supabase
              .from('batch_jobs')
              .update({ 
                scheduled_for: scheduledTime.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', pendingJobs[i].id)
          }

          results.optimized = pendingJobs.length
          results.recommendations.push(`Rebalanced ${pendingJobs.length} jobs across ${timeSlots} time slots`)
        }
        break

      case 'performance_tune':
        // Optimize based on historical performance data
        const { data: performanceData } = await supabase
          .from('batch_jobs')
          .select('job_type, metadata, created_at, completed_at')
          .eq('status', 'completed')
          .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

        if (performanceData && performanceData.length > 0) {
          const jobTypeStats: any = {}

          performanceData.forEach(job => {
            if (!jobTypeStats[job.job_type]) {
              jobTypeStats[job.job_type] = {
                count: 0,
                totalTime: 0,
                avgTime: 0
              }
            }

            const duration = new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()
            jobTypeStats[job.job_type].count++
            jobTypeStats[job.job_type].totalTime += duration
          })

          Object.keys(jobTypeStats).forEach(jobType => {
            jobTypeStats[jobType].avgTime = jobTypeStats[jobType].totalTime / jobTypeStats[jobType].count
          })

          // Find slowest job types
          const slowestJobTypes = Object.entries(jobTypeStats)
            .sort(([,a], [,b]) => (b as any).avgTime - (a as any).avgTime)
            .slice(0, 3)

          slowestJobTypes.forEach(([jobType, stats]: [string, any]) => {
            results.recommendations.push(`${jobType}: avg ${Math.round(stats.avgTime / 1000)}s (${stats.count} jobs)`)
          })

          results.performance.job_type_stats = jobTypeStats
          results.analyzed = performanceData.length
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation. Use: analyze, optimize_queue, cleanup, rebalance, performance_tune' },
          { status: 400 }
        )
    }

    // Log the optimization operation
    await supabase
      .from('system_logs')
      .insert({
        user_id: user.id,
        operation: 'batch_processing_optimization',
        details: {
          operation,
          results,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      operation,
      results: {
        ...results,
        summary: `${operation} completed: analyzed ${results.analyzed}, optimized ${results.optimized}, errors ${results.errors}`
      }
    })

  } catch (error) {
    console.error('Error in batch processing optimization:', error)
    return NextResponse.json(
      { success: false, error: 'Batch processing optimization failed' },
      { status: 500 }
    )
  }
}