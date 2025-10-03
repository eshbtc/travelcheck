import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('id')

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'Missing email ID' },
        { status: 400 }
      )
    }

    // Delete flight email with security check
    // This will throw if email doesn't exist or doesn't belong to user
    await prisma.flightEmail.deleteMany({
      where: {
        id: emailId,
        userId: userId, // Security check - only delete user's own emails
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Flight email deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting flight email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete flight email' },
      { status: 500 }
    )
  }
}