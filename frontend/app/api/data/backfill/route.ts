import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

async function isAdmin(user: any): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (adminEmails.includes(user.email?.toLowerCase())) return true
  
  const { data: userDoc } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  return userDoc?.role === 'admin'
}

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

  // Admin only operation
  if (!(await isAdmin(user))) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { operation = 'timestamps', dryRun = true } = body

    let results: any = {
      updated: 0,
      errors: 0,
      operations: []
    }

    switch (operation) {
      case 'timestamps':
        // Backfill missing timestamps
        const { data: entriesWithoutTimestamps } = await supabase
          .from('travel_entries')
          .select('id, entry_date')
          .is('created_at', null)

        if (entriesWithoutTimestamps) {
          for (const entry of entriesWithoutTimestamps) {
            if (!dryRun) {
              const { error } = await supabase
                .from('travel_entries')
                .update({
                  created_at: entry.entry_date + 'T00:00:00Z',
                  updated_at: new Date().toISOString()
                })
                .eq('id', entry.id)

              if (error) {
                results.errors++
              } else {
                results.updated++
              }
            } else {
              results.updated++
            }

            results.operations.push({
              type: 'timestamp_backfill',
              id: entry.id,
              action: dryRun ? 'would_update' : 'updated'
            })
          }
        }
        break

      case 'confidence_scores':
        // Backfill missing confidence scores
        const { data: scansWithoutScores } = await supabase
          .from('passport_scans')
          .select('id, passport_info')
          .is('confidence_score', null)

        if (scansWithoutScores) {
          for (const scan of scansWithoutScores) {
            const mockConfidence = Math.random() * 0.3 + 0.6 // 0.6-0.9

            if (!dryRun) {
              const { error } = await supabase
                .from('passport_scans')
                .update({ confidence_score: mockConfidence })
                .eq('id', scan.id)

              if (error) {
                results.errors++
              } else {
                results.updated++
              }
            } else {
              results.updated++
            }

            results.operations.push({
              type: 'confidence_backfill',
              id: scan.id,
              confidence: mockConfidence,
              action: dryRun ? 'would_update' : 'updated'
            })
          }
        }
        break

      case 'user_settings':
        // Backfill missing user settings
        const { data: usersWithoutSettings } = await supabase
          .from('users')
          .select('id, settings')
          .is('settings', null)

        if (usersWithoutSettings) {
          for (const userRecord of usersWithoutSettings) {
            const defaultSettings = {
              notifications: true,
              theme: 'light',
              timezone: 'UTC'
            }

            if (!dryRun) {
              const { error } = await supabase
                .from('users')
                .update({ settings: defaultSettings })
                .eq('id', userRecord.id)

              if (error) {
                results.errors++
              } else {
                results.updated++
              }
            } else {
              results.updated++
            }

            results.operations.push({
              type: 'settings_backfill',
              user_id: userRecord.id,
              action: dryRun ? 'would_update' : 'updated'
            })
          }
        }
        break

      case 'processing_status':
        // Backfill missing processing status
        const { data: emailsWithoutStatus } = await supabase
          .from('flight_emails')
          .select('id')
          .is('processing_status', null)

        if (emailsWithoutStatus) {
          for (const email of emailsWithoutStatus) {
            if (!dryRun) {
              const { error } = await supabase
                .from('flight_emails')
                .update({ processing_status: 'completed' })
                .eq('id', email.id)

              if (error) {
                results.errors++
              } else {
                results.updated++
              }
            } else {
              results.updated++
            }

            results.operations.push({
              type: 'status_backfill',
              id: email.id,
              action: dryRun ? 'would_update' : 'updated'
            })
          }
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation. Use: timestamps, confidence_scores, user_settings, processing_status' },
          { status: 400 }
        )
    }

    // Log the backfill operation
    if (!dryRun) {
      await supabase
        .from('system_logs')
        .insert({
          user_id: user.id,
          operation: 'data_backfill',
          details: {
            operation,
            results,
            timestamp: new Date().toISOString()
          }
        })
    }

    return NextResponse.json({
      success: true,
      operation,
      dryRun,
      results: {
        ...results,
        summary: `${dryRun ? 'Would update' : 'Updated'} ${results.updated} records, ${results.errors} errors`
      }
    })

  } catch (error) {
    console.error('Error in data backfill:', error)
    return NextResponse.json(
      { success: false, error: 'Backfill operation failed' },
      { status: 500 }
    )
  }
}