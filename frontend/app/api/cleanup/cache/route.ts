import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

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
    const { type = 'all', olderThanDays = 30 } = body

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    let cleanupResults = {
      scansRemoved: 0,
      emailsRemoved: 0,
      reportsRemoved: 0,
      duplicatesResolved: 0
    }

    // Clean up old passport scans with low confidence
    if (type === 'all' || type === 'scans') {
      const { data: oldScans } = await supabase
        .from('passport_scans')
        .select('id')
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate)
        .lt('confidence_score', 0.3)

      if (oldScans && oldScans.length > 0) {
        const { error } = await supabase
          .from('passport_scans')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', cutoffDate)
          .lt('confidence_score', 0.3)

        if (!error) {
          cleanupResults.scansRemoved = oldScans.length
        }
      }
    }

    // Clean up processed flight emails that are old
    if (type === 'all' || type === 'emails') {
      const { data: oldEmails } = await supabase
        .from('flight_emails')
        .select('id')
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')
        .lt('created_at', cutoffDate)

      if (oldEmails && oldEmails.length > 0) {
        const { error } = await supabase
          .from('flight_emails')
          .delete()
          .eq('user_id', user.id)
          .eq('processing_status', 'completed')
          .lt('created_at', cutoffDate)

        if (!error) {
          cleanupResults.emailsRemoved = oldEmails.length
        }
      }
    }

    // Clean up old reports
    if (type === 'all' || type === 'reports') {
      const { data: oldReports } = await supabase
        .from('reports')
        .select('id')
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate)

      if (oldReports && oldReports.length > 0) {
        const { error } = await supabase
          .from('reports')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', cutoffDate)

        if (!error) {
          cleanupResults.reportsRemoved = oldReports.length
        }
      }
    }

    // Auto-resolve old duplicate groups with low confidence
    if (type === 'all' || type === 'duplicates') {
      const { data: oldDuplicates } = await supabase
        .from('duplicate_groups')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lt('similarity_score', 0.6)
        .lt('created_at', cutoffDate)

      if (oldDuplicates && oldDuplicates.length > 0) {
        const { error } = await supabase
          .from('duplicate_groups')
          .update({
            status: 'auto_resolved',
            resolution_action: 'ignored',
            resolved_at: new Date().toISOString(),
            metadata: { auto_resolved: true, reason: 'low_confidence_cleanup' }
          })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lt('similarity_score', 0.6)
          .lt('created_at', cutoffDate)

        if (!error) {
          cleanupResults.duplicatesResolved = oldDuplicates.length
        }
      }
    }

    // Log cleanup operation
    await supabase
      .from('system_logs')
      .insert({
        user_id: user.id,
        operation: 'cache_cleanup',
        details: {
          type,
          olderThanDays,
          results: cleanupResults,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      results: cleanupResults,
      summary: {
        totalItemsRemoved: Object.values(cleanupResults).reduce((a, b) => a + b, 0),
        cutoffDate,
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