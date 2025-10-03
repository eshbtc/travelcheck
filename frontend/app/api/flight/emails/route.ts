import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const airline = searchParams.get('airline')

    const whereClause: any = {
      userId: user.id,
    }

    if (status) {
      whereClause.processingStatus = status
    }

    if (airline) {
      whereClause.airline = airline
    }

    const emails = await prisma.flightEmail.findMany({
      where: whereClause,
      orderBy: {
        dateReceived: 'desc',
      },
      skip: offset,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      emails: emails || [],
      pagination: {
        limit,
        offset,
        hasMore: emails && emails.length === limit,
      },
    })
  } catch (error) {
    console.error('Error getting flight emails:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get flight emails' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('id')

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'Missing email ID' },
        { status: 400 }
      )
    }

    const result = await prisma.flightEmail.deleteMany({
      where: {
        id: emailId,
        userId: user.id, // Security check
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Flight email not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Flight email deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting flight email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete flight email' },
      { status: 500 }
    )
  }
}