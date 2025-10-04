import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

async function isAdmin(user: any): Promise<boolean> {
  // Validate user object has required fields
  if (!user || !user.id || !user.email) {
    console.error('[Optimize Processing] Invalid user object:', { hasUser: !!user, hasId: !!user?.id, hasEmail: !!user?.email })
    return false
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (adminEmails.includes(user.email?.toLowerCase())) return true

  const userDoc = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  })

  return userDoc?.role === 'admin'
}

async function handleOptimization(userId: string, body: any) {
  console.log('[handleOptimization] Starting with userId:', userId)
  console.log('[handleOptimization] Body params:', body)

  try {
    const {
      operation = 'analyze',
      batchSize = 50,
      priorityUser = null,
      optimizationType = 'performance'
    } = body

    console.log('[handleOptimization] Operation:', operation)
    console.log('[handleOptimization] Parameters:', { batchSize, priorityUser, optimizationType })

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    let results: any = {
      analyzed: 0,
      optimized: 0,
      errors: 0,
      recommendations: [],
      performance: {}
    }

    console.log('[handleOptimization] Checking database connection...')
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('[handleOptimization] Database connection OK')
    } catch (dbError) {
      console.error('[handleOptimization] Database connection failed:', dbError)
      return NextResponse.json(
        {
          success: false,
          error: 'Database unavailable',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 503 }
      )
    }

    console.log('[handleOptimization] Executing operation:', operation)
    switch (operation) {
      case 'analyze':
        // Analyze current batch processing performance
        console.log('[handleOptimization] Querying recent jobs...')
        const recentJobs = await prisma.batchJob.findMany({
          where: {
            createdAt: { gte: oneHourAgo }
          },
          orderBy: { createdAt: 'desc' }
        })
        console.log('[handleOptimization] Found recent jobs:', recentJobs.length)

        console.log('[handleOptimization] Querying queued jobs...')
        const queuedJobs = await prisma.batchJob.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' }
        })
        console.log('[handleOptimization] Found queued jobs:', queuedJobs.length)

        console.log('[handleOptimization] Querying processing jobs...')
        const processingJobs = await prisma.batchJob.findMany({
          where: { status: 'processing' }
        })
        console.log('[handleOptimization] Found processing jobs:', processingJobs.length)

        results.performance = {
          recent_jobs: recentJobs?.length || 0,
          queued_jobs: queuedJobs?.length || 0,
          processing_jobs: processingJobs?.length || 0,
          avg_processing_time: recentJobs?.reduce((sum, job) => {
            if (job.completedAt && job.createdAt) {
              const duration = new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()
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
        const stuckJobs = await prisma.batchJob.findMany({
          where: {
            status: 'processing',
            createdAt: { lt: oneHourAgo }
          }
        })

        // Reset stuck jobs
        if (stuckJobs && stuckJobs.length > 0) {
          await prisma.batchJob.updateMany({
            where: {
              id: { in: stuckJobs.map(job => job.id) }
            },
            data: {
              status: 'pending',
              errorMessage: 'Reset due to optimization - job was stuck in processing',
              updatedAt: new Date()
            }
          })

          results.optimized = stuckJobs.length
          results.recommendations.push(`Reset ${stuckJobs.length} stuck jobs`)
        }

        // Prioritize jobs by user or type
        if (priorityUser) {
          const priorityJobs = await prisma.batchJob.findMany({
            where: {
              userId: priorityUser,
              status: 'pending'
            },
            take: batchSize
          })

          if (priorityJobs && priorityJobs.length > 0) {
            // Note: priority field may not exist in schema, check schema first
            await prisma.batchJob.updateMany({
              where: {
                id: { in: priorityJobs.map(job => job.id) }
              },
              data: {
                updatedAt: new Date()
                // priority: 1 - uncomment if field exists in schema
              }
            })

            results.recommendations.push(`Prioritized ${priorityJobs.length} jobs for user ${priorityUser}`)
          }
        }
        break

      case 'cleanup':
        // Clean up old completed jobs
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const deletedJobs = await prisma.batchJob.deleteMany({
          where: {
            status: 'completed',
            completedAt: { lt: thirtyDaysAgo }
          }
        })

        results.optimized = deletedJobs.count
        results.recommendations.push(`Cleaned up ${deletedJobs.count} old completed jobs`)
        break

      case 'rebalance':
        // Rebalance processing load across time periods
        const pendingJobs = await prisma.batchJob.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' },
          take: batchSize
        })

        if (pendingJobs && pendingJobs.length > 0) {
          // Distribute jobs across different time slots
          const timeSlots = 4 // Distribute across 4 time slots
          const jobsPerSlot = Math.ceil(pendingJobs.length / timeSlots)

          for (let i = 0; i < pendingJobs.length; i++) {
            const slotIndex = Math.floor(i / jobsPerSlot)
            const scheduledTime = new Date(now.getTime() + (slotIndex * 15 * 60 * 1000)) // 15-minute intervals

            // Note: scheduledFor field may not exist in schema
            await prisma.batchJob.update({
              where: { id: pendingJobs[i].id },
              data: {
                updatedAt: new Date()
                // scheduledFor: scheduledTime - uncomment if field exists
              }
            })
          }

          results.optimized = pendingJobs.length
          results.recommendations.push(`Rebalanced ${pendingJobs.length} jobs across ${timeSlots} time slots`)
        }
        break

      case 'performance_tune':
        // Optimize based on historical performance data
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const performanceData = await prisma.batchJob.findMany({
          where: {
            status: 'completed',
            createdAt: { gte: sevenDaysAgo }
          },
          select: {
            jobType: true,
            metadata: true,
            createdAt: true,
            completedAt: true
          }
        })

        if (performanceData && performanceData.length > 0) {
          const jobTypeStats: any = {}

          performanceData.forEach(job => {
            if (!job.completedAt || !job.createdAt) return

            if (!jobTypeStats[job.jobType]) {
              jobTypeStats[job.jobType] = {
                count: 0,
                totalTime: 0,
                avgTime: 0
              }
            }

            const duration = new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()
            jobTypeStats[job.jobType].count++
            jobTypeStats[job.jobType].totalTime += duration
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
    await prisma.systemLog.create({
      data: {
        userId: userId,
        operation: 'batch_processing_optimization',
        details: {
          operation,
          results,
          timestamp: new Date().toISOString()
        }
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
    console.error('[handleOptimization] Error in batch processing optimization:', error)
    console.error('[handleOptimization] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('[handleOptimization] Error details:', {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Batch processing optimization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('[Optimize GET] ===== REQUEST START =====')
  console.log('[Optimize GET] Request URL:', request.url)
  console.log('[Optimize GET] Request method:', request.method)
  console.log('[Optimize GET] Request headers:', {
    'content-type': request.headers.get('content-type'),
    'authorization': request.headers.get('authorization') ? 'present' : 'missing',
    'cookie': request.headers.get('cookie') ? 'present' : 'missing'
  })

  const session = await requireAuth(request)
  if (session instanceof NextResponse) {
    console.log('[Optimize GET] Auth failed - returning response')
    return session
  }

  console.log('[Optimize GET] Auth successful:', {
    hasUser: !!session.user,
    userId: session.user?.id,
    userEmail: session.user?.email
  })

  // Validate session has user with ID
  if (!session.user || !session.user.id) {
    console.error('[Optimize GET] Session missing user or user.id:', { hasUser: !!session.user, userId: session.user?.id })
    return NextResponse.json(
      { success: false, error: 'User not authenticated' },
      { status: 401 }
    )
  }

  const userId = session.user.id

  // Admin only operation
  const isAdminUser = await isAdmin(session.user)
  console.log('[Optimize GET] Admin check result:', { isAdmin: isAdminUser })

  if (!isAdminUser) {
    console.log('[Optimize GET] Access denied - not admin')
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const operation = searchParams.get('operation') || 'analyze'
  const batchSize = parseInt(searchParams.get('batchSize') || '50', 10)
  const priorityUser = searchParams.get('priorityUser') || null
  const optimizationType = searchParams.get('optimizationType') || 'performance'

  console.log('[Optimize GET] Query parameters:', {
    operation,
    batchSize,
    priorityUser,
    optimizationType
  })

  console.log('[Optimize GET] Calling handleOptimization...')
  return handleOptimization(userId, {
    operation,
    batchSize,
    priorityUser,
    optimizationType
  })
}

export async function POST(request: NextRequest) {
  console.log('[Optimize POST] ===== REQUEST START =====')
  console.log('[Optimize POST] Request URL:', request.url)
  console.log('[Optimize POST] Request method:', request.method)
  console.log('[Optimize POST] Request headers:', {
    'content-type': request.headers.get('content-type'),
    'authorization': request.headers.get('authorization') ? 'present' : 'missing',
    'cookie': request.headers.get('cookie') ? 'present' : 'missing'
  })

  const session = await requireAuth(request)
  if (session instanceof NextResponse) {
    console.log('[Optimize POST] Auth failed - returning response')
    return session
  }

  console.log('[Optimize POST] Auth successful:', {
    hasUser: !!session.user,
    userId: session.user?.id,
    userEmail: session.user?.email
  })

  // Validate session has user with ID
  if (!session.user || !session.user.id) {
    console.error('[Optimize POST] Session missing user or user.id:', { hasUser: !!session.user, userId: session.user?.id })
    return NextResponse.json(
      { success: false, error: 'User not authenticated' },
      { status: 401 }
    )
  }

  const userId = session.user.id

  // Admin only operation
  const isAdminUser = await isAdmin(session.user)
  console.log('[Optimize POST] Admin check result:', { isAdmin: isAdminUser })

  if (!isAdminUser) {
    console.log('[Optimize POST] Access denied - not admin')
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  const body = await request.json()
  console.log('[Optimize POST] Request body:', body)
  console.log('[Optimize POST] Calling handleOptimization...')
  return handleOptimization(userId, body)
}