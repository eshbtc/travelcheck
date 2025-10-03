import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const reportType = searchParams.get('report_type')
    const status = searchParams.get('status')

    const where: any = {
      userId: session.user.id
    }

    if (reportType) {
      where.reportType = reportType
    }

    if (status) {
      where.status = status
    }

    const [reports, count] = await Promise.all([
      prisma.report.findMany({
        where,
        select: {
          id: true,
          reportType: true,
          title: true,
          description: true,
          status: true,
          fileFormat: true,
          createdAt: true,
          updatedAt: true,
          parameters: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.report.count({ where })
    ])

    return NextResponse.json({
      success: true,
      reports: reports || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (reports?.length || 0) === limit
      }
    })
  } catch (error) {
    console.error('Error listing reports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list reports' },
      { status: 500 }
    )
  }
}