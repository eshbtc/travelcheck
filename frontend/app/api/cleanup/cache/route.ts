import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)

  try {
    const body = await request.json()
    const { type = 'all', olderThanDays = 30 } = body

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    let cleanupResults = {
      scansRemoved: 0,
      emailsRemoved: 0,
      reportsRemoved: 0,
      duplicatesResolved: 0
    }

    // Clean up old passport scans with low confidence
    if (type === 'all' || type === 'scans') {
      const deletedScans = await prisma.passportScan.deleteMany({
        where: {
          userId: session.user.id,
          createdAt: { lt: cutoffDate },
          confidenceScore: { lt: 0.3 }
        }
      })
      cleanupResults.scansRemoved = deletedScans.count
    }

    // Clean up processed flight emails that are old
    if (type === 'all' || type === 'emails') {
      const deletedEmails = await prisma.flightEmail.deleteMany({
        where: {
          userId: session.user.id,
          processingStatus: 'completed',
          createdAt: { lt: cutoffDate }
        }
      })
      cleanupResults.emailsRemoved = deletedEmails.count
    }

    // Clean up old reports
    if (type === 'all' || type === 'reports') {
      const deletedReports = await prisma.report.deleteMany({
        where: {
          userId: session.user.id,
          createdAt: { lt: cutoffDate }
        }
      })
      cleanupResults.reportsRemoved = deletedReports.count
    }

    // Auto-resolve old duplicate groups with low confidence
    if (type === 'all' || type === 'duplicates') {
      const updatedDuplicates = await prisma.duplicateGroup.updateMany({
        where: {
          userId: session.user.id,
          status: 'pending',
          similarityScore: { lt: 0.6 },
          createdAt: { lt: cutoffDate }
        },
        data: {
          status: 'auto_resolved',
          resolutionAction: 'ignored',
          resolvedAt: new Date(),
          metadata: { auto_resolved: true, reason: 'low_confidence_cleanup' } as any
        }
      })
      cleanupResults.duplicatesResolved = updatedDuplicates.count
    }

    // Log cleanup operation
    await prisma.systemLog.create({
      data: {
        userId: session.user.id,
        operation: 'cache_cleanup',
        details: {
          type,
          olderThanDays,
          results: cleanupResults,
          timestamp: new Date().toISOString()
        } as any
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      results: cleanupResults,
      summary: {
        totalItemsRemoved: Object.values(cleanupResults).reduce((a, b) => a + b, 0),
        cutoffDate: cutoffDate.toISOString(),
        type
      }
    })
  } catch (error) {
    console.error('Error in cache cleanup:', error)
    return NextResponse.json(
      { success: false, error: 'Cache cleanup failed' },
      { status: 500 }
    )
  }
}
