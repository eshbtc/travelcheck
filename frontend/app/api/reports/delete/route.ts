import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const DeleteReportSchema = z.object({
  reportId: z.string().uuid('Invalid report ID format')
})

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const body = await request.json()
    console.log('Delete report request:', sanitizeForLogging(body))

    // Validate input data
    const validation = validateInput(DeleteReportSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { reportId } = validation.data!

    // Delete the report (only if it belongs to the user)
    await prisma.report.deleteMany({
      where: {
        id: reportId,
        userId: userId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting report:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}