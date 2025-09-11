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
    const { reportId, format = 'json' } = body

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      )
    }

    // Get the report
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (error || !report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      )
    }

    let exportData: any
    let contentType: string
    let filename: string

    switch (format.toLowerCase()) {
      case 'json':
        exportData = JSON.stringify(report.report_data, null, 2)
        contentType = 'application/json'
        filename = `${report.title.replace(/\s+/g, '_')}.json`
        break

      case 'csv':
        // Convert report data to CSV format
        const csvData = convertToCSV(report.report_data)
        exportData = csvData
        contentType = 'text/csv'
        filename = `${report.title.replace(/\s+/g, '_')}.csv`
        break

      case 'pdf':
        // Mock PDF generation (in production, use a PDF library)
        exportData = generateMockPDF(report)
        contentType = 'application/pdf'
        filename = `${report.title.replace(/\s+/g, '_')}.pdf`
        break

      case 'txt':
        exportData = generateTextReport(report.report_data)
        contentType = 'text/plain'
        filename = `${report.title.replace(/\s+/g, '_')}.txt`
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported format. Use json, csv, pdf, or txt' },
          { status: 400 }
        )
    }

    // Return the file data
    return NextResponse.json({
      success: true,
      exportData: Buffer.from(exportData).toString('base64'),
      contentType,
      filename,
      size: exportData.length
    })

  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export report' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') return ''

  // Handle different report structures
  if (data.trips && Array.isArray(data.trips)) {
    const headers = ['Date', 'Destination', 'Purpose', 'Days']
    const rows = data.trips.map((trip: any) => [
      trip.departureDate || '',
      trip.destination || '',
      trip.purpose || '',
      trip.daysAway || ''
    ])
    
    return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n')
  }

  if (data.entries && Array.isArray(data.entries)) {
    const headers = ['Entry Date', 'Exit Date', 'Country', 'Type']
    const rows = data.entries.map((entry: any) => [
      entry.entry_date || '',
      entry.exit_date || '',
      entry.country_name || entry.country_code || '',
      entry.entry_type || ''
    ])
    
    return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n')
  }

  // Fallback: convert object to key-value CSV
  const entries = Object.entries(data)
  return entries.map(([key, value]) => `${key},${JSON.stringify(value)}`).join('\n')
}

function generateMockPDF(report: any): string {
  // Mock PDF content (in production, use jsPDF or similar)
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
190
%%EOF`
}

function generateTextReport(data: any): string {
  const lines = []
  lines.push('TRAVEL HISTORY REPORT')
  lines.push('='.repeat(50))
  lines.push('')
  
  if (data.period) {
    lines.push(`Period: ${data.period.startDate} to ${data.period.endDate}`)
    lines.push('')
  }

  if (data.summary) {
    lines.push('SUMMARY:')
    Object.entries(data.summary).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value}`)
    })
    lines.push('')
  }

  if (data.trips && Array.isArray(data.trips)) {
    lines.push('TRAVEL HISTORY:')
    data.trips.forEach((trip: any, index: number) => {
      lines.push(`${index + 1}. ${trip.destination} (${trip.departureDate} - ${trip.returnDate})`)
      if (trip.purpose) lines.push(`   Purpose: ${trip.purpose}`)
      if (trip.daysAway) lines.push(`   Duration: ${trip.daysAway} days`)
      lines.push('')
    })
  }

  return lines.join('\n')
}