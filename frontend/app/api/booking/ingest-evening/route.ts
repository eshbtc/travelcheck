import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

async function isAdmin(user: any): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (adminEmails.includes(user.email?.toLowerCase())) return true

  const userDoc = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  return userDoc?.role === 'admin'
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  // Admin only operation
  if (!(await isAdmin(userId))) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    // Get all users with active email accounts for evening batch
    const users = await prisma.emailAccount.findMany({
      where: {
        isActive: true,
        accessToken: { not: null },
      },
      select: {
        userId: true,
        provider: true,
        accessToken: true,
      },
    })

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
        const existingJob = await prisma.batchJob.findFirst({
          where: {
            userId: userToken.userId,
            jobType: 'evening_ingest',
            createdAt: {
              gte: sixHoursAgo,
            },
          },
        })

        if (existingJob) {
          results.skipped++
          continue
        }

        // Create evening batch job
        const batchJob = await prisma.batchJob.create({
          data: {
            userId: userToken.userId,
            jobType: 'evening_ingest',
            status: 'processing',
            metadata: {
              provider: userToken.provider,
              scheduled_time: now.toISOString(),
              type: 'evening_analysis'
            },
          },
        })

        // Run enhanced analysis on recent data
        const analysisResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/travel/enhanced-analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken.accessToken}`
          },
          body: JSON.stringify({
            userId: userToken.userId,
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

          // Store analysis results - removed travelAnalysisCache (not in schema)
          // Analysis data is already stored in TravelHistory model
          // Future: consider adding dedicated cache table if needed

          // Run duplicate detection
          const duplicateResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/travel/detect-duplicates`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken.accessToken}`
            },
            body: JSON.stringify({
              userId: userToken.userId,
              autoResolve: false
            })
          })

          await prisma.batchJob.update({
            where: { id: batchJob.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              metadata: {
                ...(batchJob.metadata as any),
                analysis_results: analysisData,
                duplicates_checked: duplicateResponse.ok
              },
            },
          })

          results.processed++
          results.analyzed++
          results.details.push({
            userId: userToken.userId,
            provider: userToken.provider,
            status: 'success',
            analyzed: true
          })
        } else {
          await prisma.batchJob.update({
            where: { id: batchJob.id },
            data: {
              status: 'failed',
              errorMessage: await analysisResponse.text(),
              completedAt: new Date(),
            },
          })

          results.failed++
          results.details.push({
            userId: userToken.userId,
            provider: userToken.provider,
            status: 'failed',
            error: await analysisResponse.text()
          })
        }

      } catch (error) {
        results.failed++
        results.details.push({
          userId: userToken.userId,
          provider: userToken.provider,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log the evening batch operation
    await prisma.systemLog.create({
      data: {
        userId: userId,
        operation: 'evening_booking_ingest',
        details: {
          results,
          timestamp: new Date().toISOString()
        },
      },
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