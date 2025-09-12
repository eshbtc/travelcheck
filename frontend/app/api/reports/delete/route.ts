import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const DeleteReportSchema = z.object({
  reportId: z.string().uuid('Invalid report ID format')
})

export async function POST(request: NextRequest) {
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
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Supabase error:', sanitizeForLogging(error))
      return NextResponse.json(
        { success: false, error: 'Failed to delete report' },
        { status: 500 }
      )
    }

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