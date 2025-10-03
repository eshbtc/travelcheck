import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../../src/lib/api-auth'
import { prisma } from '../../../../../src/lib/prisma'

export async function DELETE(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

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
        userId: userId, // Security check - only delete user's own scans
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