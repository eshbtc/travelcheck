import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../auth/middleware'
import { prisma } from '@/lib/prisma'

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
    const scanId = searchParams.get('id')

    if (!scanId) {
      return NextResponse.json(
        { success: false, error: 'Missing scan ID' },
        { status: 400 }
      )
    }

    // Delete passport scan with security check
    // This will throw if scan doesn't exist or doesn't belong to user
    await prisma.passportScan.deleteMany({
      where: {
        id: scanId,
        userId: user.id, // Security check - only delete user's own scans
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Passport scan deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting passport scan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete passport scan' },
      { status: 500 }
    )
  }
}