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
    // Get user's travel data
    const [entriesResult, scansResult, emailsResult, duplicatesResult] = await Promise.all([
      supabase.from('travel_entries').select('*').eq('user_id', user.id),
      supabase.from('passport_scans').select('*').eq('user_id', user.id),
      supabase.from('flight_emails').select('*').eq('user_id', user.id),
      supabase.from('duplicate_groups').select('*').eq('user_id', user.id).eq('status', 'pending')
    ])

    const entries = entriesResult.data || []
    const scans = scansResult.data || []
    const emails = emailsResult.data || []
    const duplicates = duplicatesResult.data || []

    const suggestions = []

    // Data completeness suggestions
    const entriesWithoutScans = entries.filter((entry: any) => 
      !scans.some((scan: any) => {
        const scanDate = new Date(scan.created_at)
        const entryDate = new Date(entry.entry_date)
        const daysDiff = Math.abs(scanDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysDiff <= 30
      })
    )

    if (entriesWithoutScans.length > 0) {
      suggestions.push({
        type: 'data_completeness',
        priority: 'high',
        title: 'Missing passport documentation',
        description: `${entriesWithoutScans.length} travel entries lack corresponding passport scans`,
        action: 'Upload passport stamps for better documentation',
        affected_items: entriesWithoutScans.length
      })
    }

    // Duplicate resolution suggestions
    if (duplicates.length > 0) {
      suggestions.push({
        type: 'data_quality',
        priority: 'medium',
        title: 'Duplicate entries detected',
        description: `${duplicates.length} potential duplicate groups need resolution`,
        action: 'Review and resolve duplicate travel entries',
        affected_items: duplicates.length
      })
    }

    // Travel compliance suggestions
    const recentEntries = entries.filter((entry: any) => {
      const entryDate = new Date(entry.entry_date)
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      return entryDate >= oneYearAgo
    })

    const daysOutside = recentEntries.reduce((total: number, entry: any) => {
      if (entry.country_code === 'US') return total
      const duration = entry.exit_date ? 
        Math.ceil((new Date(entry.exit_date).getTime() - new Date(entry.entry_date).getTime()) / (1000 * 60 * 60 * 24)) : 30
      return total + duration
    }, 0)

    if (daysOutside > 180) {
      suggestions.push({
        type: 'compliance',
        priority: 'high',
        title: 'High travel volume detected',
        description: `${daysOutside} days outside US in the last year may impact tax residency`,
        action: 'Consider generating compliance reports for tax purposes',
        affected_items: recentEntries.length
      })
    }

    // Organization suggestions
    const unprocessedEmails = emails.filter((email: any) => 
      email.processing_status === 'pending' || !email.confidence_score || email.confidence_score < 0.5
    )

    if (unprocessedEmails.length > 0) {
      suggestions.push({
        type: 'processing',
        priority: 'low',
        title: 'Emails need review',
        description: `${unprocessedEmails.length} flight emails have low confidence scores`,
        action: 'Review and manually verify flight information',
        affected_items: unprocessedEmails.length
      })
    }

    // Data backup suggestions
    if (entries.length > 50 && !suggestions.some(s => s.type === 'backup')) {
      suggestions.push({
        type: 'backup',
        priority: 'medium',
        title: 'Consider data export',
        description: 'You have substantial travel history that should be backed up',
        action: 'Generate and download comprehensive travel reports',
        affected_items: entries.length + scans.length
      })
    }

    // Optimization suggestions
    const lowConfidenceScans = scans.filter((scan: any) => 
      !scan.confidence_score || scan.confidence_score < 0.7
    )

    if (lowConfidenceScans.length > 3) {
      suggestions.push({
        type: 'optimization',
        priority: 'low',
        title: 'Improve scan quality',
        description: `${lowConfidenceScans.length} passport scans have low recognition quality`,
        action: 'Consider rescanning passport pages with better lighting/resolution',
        affected_items: lowConfidenceScans.length
      })
    }

    // Sort by priority
    const priorityOrder: any = { 'high': 3, 'medium': 2, 'low': 1 }
    suggestions.sort((a: any, b: any) => priorityOrder[b.priority] - priorityOrder[a.priority])

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 10), // Limit to top 10 suggestions
      summary: {
        total: suggestions.length,
        high_priority: suggestions.filter(s => s.priority === 'high').length,
        medium_priority: suggestions.filter(s => s.priority === 'medium').length,
        low_priority: suggestions.filter(s => s.priority === 'low').length
      }
    })
  } catch (error) {
    console.error('Error generating smart suggestions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}