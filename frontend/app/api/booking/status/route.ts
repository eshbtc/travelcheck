import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    // Get booking ingestion statistics
    const flightEmails = await prisma.flightEmail.findMany({
      where: { userId: userId },
      select: {
        id: true,
        processingStatus: true,
        confidenceScore: true,
        dateReceived: true,
        airline: true,
        flightNumber: true,
      },
      orderBy: { dateReceived: 'desc' },
      take: 100,
    })

    const passportScans = await prisma.passportScan.findMany({
      where: { userId: userId },
      select: {
        id: true,
        processingStatus: true,
        confidenceScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const travelEntries = await prisma.travelEntry.findMany({
      where: { userId: userId },
      select: {
        id: true,
        entryType: true,
        status: true,
        confidenceScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Calculate statistics
    const flightEmailStats = {
      total: flightEmails?.length || 0,
      processed: flightEmails?.filter(e => e.processingStatus === 'completed').length || 0,
      pending: flightEmails?.filter(e => e.processingStatus === 'pending').length || 0,
      failed: flightEmails?.filter(e => e.processingStatus === 'failed').length || 0,
      averageConfidence: flightEmails && flightEmails.length > 0
        ? flightEmails.reduce((sum, e) => sum + (Number(e.confidenceScore) || 0), 0) / flightEmails.length : 0,
      recent: flightEmails?.slice(0, 10).map(e => ({
        id: e.id,
        airline: e.airline,
        flightNumber: e.flightNumber,
        status: e.processingStatus,
        confidence: e.confidenceScore,
        date: e.dateReceived
      })) || []
    }

    const passportStats = {
      total: passportScans?.length || 0,
      processed: passportScans?.filter(s => s.processingStatus === 'completed').length || 0,
      pending: passportScans?.filter(s => s.processingStatus === 'pending').length || 0,
      failed: passportScans?.filter(s => s.processingStatus === 'failed').length || 0,
      averageConfidence: passportScans && passportScans.length > 0
        ? passportScans.reduce((sum, s) => sum + (Number(s.confidenceScore) || 0), 0) / passportScans.length : 0
    }

    const travelEntriesStats = {
      total: travelEntries?.length || 0,
      confirmed: travelEntries?.filter(e => e.status === 'confirmed').length || 0,
      pending: travelEntries?.filter(e => e.status === 'pending').length || 0,
      disputed: travelEntries?.filter(e => e.status === 'disputed').length || 0,
      bySource: {
        passport_stamp: travelEntries?.filter(e => e.entryType === 'passport_stamp').length || 0,
        flight: travelEntries?.filter(e => e.entryType === 'flight').length || 0,
        email: travelEntries?.filter(e => e.entryType === 'email').length || 0,
        manual: travelEntries?.filter(e => e.entryType === 'manual').length || 0
      }
    }

    // Get processing queue status
    const processingQueues = {
      emailSync: {
        status: 'idle',
        lastRun: null,
        nextRun: null
      },
      ocrProcessing: {
        status: 'idle',
        pending: passportStats.pending
      },
      duplicateDetection: {
        status: 'idle',
        lastRun: null
      }
    }

    return NextResponse.json({
      success: true,
      ingestionStatus: {
        flightEmails: flightEmailStats,
        passportScans: passportStats,
        travelEntries: travelEntriesStats,
        processingQueues,
        summary: {
          totalDataPoints: flightEmailStats.total + passportStats.total + travelEntriesStats.total,
          successRate: {
            emails: flightEmailStats.total > 0 ? flightEmailStats.processed / flightEmailStats.total : 0,
            passports: passportStats.total > 0 ? passportStats.processed / passportStats.total : 0,
            entries: travelEntriesStats.total > 0 ? travelEntriesStats.confirmed / travelEntriesStats.total : 0
          }
        },
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error getting booking ingestion status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get booking ingestion status' },
      { status: 500 }
    )
  }
}