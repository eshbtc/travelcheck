import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

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
    // Get booking ingestion statistics
    const { data: flightEmails, error: emailError } = await supabase
      .from('flight_emails')
      .select('id, processing_status, confidence_score, date_received, airline, flight_number')
      .eq('user_id', user.id)
      .order('date_received', { ascending: false })
      .limit(100)

    if (emailError) {
      console.error('Error fetching flight emails:', emailError)
    }

    const { data: passportScans, error: passportError } = await supabase
      .from('passport_scans')
      .select('id, processing_status, confidence_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (passportError) {
      console.error('Error fetching passport scans:', passportError)
    }

    const { data: travelEntries, error: entriesError } = await supabase
      .from('travel_entries')
      .select('id, entry_type, status, confidence_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (entriesError) {
      console.error('Error fetching travel entries:', entriesError)
    }

    // Calculate statistics
    const flightEmailStats = {
      total: flightEmails?.length || 0,
      processed: flightEmails?.filter(e => e.processing_status === 'completed').length || 0,
      pending: flightEmails?.filter(e => e.processing_status === 'pending').length || 0,
      failed: flightEmails?.filter(e => e.processing_status === 'failed').length || 0,
      averageConfidence: flightEmails && flightEmails.length > 0 ? 
        flightEmails.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / flightEmails.length : 0,
      recent: flightEmails?.slice(0, 10).map(e => ({
        id: e.id,
        airline: e.airline,
        flightNumber: e.flight_number,
        status: e.processing_status,
        confidence: e.confidence_score,
        date: e.date_received
      })) || []
    }

    const passportStats = {
      total: passportScans?.length || 0,
      processed: passportScans?.filter(s => s.processing_status === 'completed').length || 0,
      pending: passportScans?.filter(s => s.processing_status === 'pending').length || 0,
      failed: passportScans?.filter(s => s.processing_status === 'failed').length || 0,
      averageConfidence: passportScans && passportScans.length > 0 ? 
        passportScans.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / passportScans.length : 0
    }

    const travelEntriesStats = {
      total: travelEntries?.length || 0,
      confirmed: travelEntries?.filter(e => e.status === 'confirmed').length || 0,
      pending: travelEntries?.filter(e => e.status === 'pending').length || 0,
      disputed: travelEntries?.filter(e => e.status === 'disputed').length || 0,
      bySource: {
        passport_stamp: travelEntries?.filter(e => e.entry_type === 'passport_stamp').length || 0,
        flight: travelEntries?.filter(e => e.entry_type === 'flight').length || 0,
        email: travelEntries?.filter(e => e.entry_type === 'email').length || 0,
        manual: travelEntries?.filter(e => e.entry_type === 'manual').length || 0
      }
    }

    // Get processing queue status
    const processingQueues = {
      emailSync: {
        status: 'idle',
        lastRun: null,
        nextRun: null
      },
      ocrProcessing: {
        status: 'idle',
        pending: passportStats.pending
      },
      duplicateDetection: {
        status: 'idle',
        lastRun: null
      }
    }

    return NextResponse.json({
      success: true,
      ingestionStatus: {
        flightEmails: flightEmailStats,
        passportScans: passportStats,
        travelEntries: travelEntriesStats,
        processingQueues,
        summary: {
          totalDataPoints: flightEmailStats.total + passportStats.total + travelEntriesStats.total,
          successRate: {
            emails: flightEmailStats.total > 0 ? flightEmailStats.processed / flightEmailStats.total : 0,
            passports: passportStats.total > 0 ? passportStats.processed / passportStats.total : 0,
            entries: travelEntriesStats.total > 0 ? travelEntriesStats.confirmed / travelEntriesStats.total : 0
          }
        },
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error getting booking ingestion status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get booking ingestion status' },
      { status: 500 }
    )
  }
}