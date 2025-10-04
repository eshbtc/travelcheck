import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

/**
 * GET /api/passport/list
 * Returns all passport scans for the authenticated user
 * This is an alias endpoint to /api/passport/scans for backward compatibility
 */
export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const scans = await prisma.passportScan.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        fileUrl: true,
        fileName: true,
        processingStatus: true,
        confidenceScore: true,
        extractedStamps: true,
        analysisResults: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      scans: scans || [],
      count: scans.length
    })
  } catch (error) {
    console.error('Error fetching passport scans:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch passport scans',
        technical_error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
