import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import crypto from 'crypto'

// Decryption function
function getKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Server misconfiguration: ENCRYPTION_KEY is not set')
  }
  return crypto.createHash('sha256').update(raw).digest()
}

function decrypt(obj: any) {
  if (!obj || typeof obj === 'string') {
    try {
      obj = JSON.parse(obj)
    } catch {
      return null
    }
  }
  if (!obj.iv || !obj.data || !obj.tag) return null
  
  const iv = Buffer.from(obj.iv, 'base64')
  const data = Buffer.from(obj.data, 'base64') 
  const tag = Buffer.from(obj.tag, 'base64')
  const key = getKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

// Enhanced flight extraction
async function extractFlightInfo(emailContent: string, subject: string) {
  const combinedText = `${subject} ${emailContent}`
  
  const flightPatterns = {
    airline: /(?:airline|carrier)[:\s]+([a-z\s]+)|^([a-z\s]{2,20})\s+flight|(\b(?:american|delta|united|southwest|jetblue|alaska|spirit|frontier)\b)/i,
    flightNumber: /flight[:\s#]*([a-z]{2}\d{3,4})|(\b[a-z]{2}\s*\d{3,4}\b)/i,
    confirmation: /confirmation[:\s#]*([a-z0-9]{6,})|booking[:\s#]*([a-z0-9]{6,})/i,
    departure: /(?:depart|from)[:\s]*([a-z]{3})|(\b[A-Z]{3}\b)\s*(?:to|→)|departing\s*([a-z]{3})/i,
    arrival: /(?:arrive|to|arriving)[:\s]*([a-z]{3})|(?:to|→)\s*(\b[A-Z]{3}\b)/i,
    date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w{3}\s+\d{1,2},?\s+\d{4})/
  }

  const extracted: any = {}
  Object.entries(flightPatterns).forEach(([key, pattern]) => {
    const match = combinedText.match(pattern)
    if (match) {
      // Get first non-undefined capture group
      extracted[key] = match.find((m, i) => i > 0 && m !== undefined)?.trim()
    }
  })

  return extracted
}

// Airport code to country mapping (basic set)
const AIRPORT_COUNTRIES: Record<string, string> = {
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US', 'SFO': 'US', 'SEA': 'US', 'LAS': 'US', 'PHX': 'US', 'ATL': 'US',
  'LHR': 'GB', 'LGW': 'GB', 'STN': 'GB', 'MAN': 'GB', 'EDI': 'GB',
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR',
  'FRA': 'DE', 'MUC': 'DE', 'TXL': 'DE', 'DUS': 'DE',
  'NRT': 'JP', 'HND': 'JP', 'KIX': 'JP',
  'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA',
  'AMS': 'NL', 'BCN': 'ES', 'MAD': 'ES', 'FCO': 'IT', 'MXP': 'IT', 'ZUR': 'CH', 'VIE': 'AT', 'BRU': 'BE', 'CPH': 'DK', 'ARN': 'SE', 'OSL': 'NO',
  'DXB': 'AE', 'DOH': 'QA', 'SIN': 'SG', 'ICN': 'KR', 'BOM': 'IN', 'DEL': 'IN'
}

// Create travel entries from extracted flight data
async function createTravelEntries(userId: string, flightEmailId: string, flightData: any, emailDate: string) {
  const entries = []
  
  if (flightData.departure && flightData.arrival && flightData.date) {
    // Parse date
    let entryDate: Date
    try {
      if (flightData.date.includes('/') || flightData.date.includes('-')) {
        entryDate = new Date(flightData.date)
      } else {
        entryDate = new Date(flightData.date)
      }
      if (isNaN(entryDate.getTime())) {
        entryDate = new Date(emailDate)
      }
    } catch {
      entryDate = new Date(emailDate)
    }

    // Extract country codes from airport codes
    const departureCountry = AIRPORT_COUNTRIES[flightData.departure.toUpperCase()] || 'UNKNOWN'
    const arrivalCountry = AIRPORT_COUNTRIES[flightData.arrival.toUpperCase()] || 'UNKNOWN'

    // Create departure entry (exit from departure country)
    if (departureCountry !== 'UNKNOWN') {
      entries.push({
        user_id: userId,
        entry_type: 'email',
        source_id: flightEmailId,
        source_type: 'flight_email',
        country_code: departureCountry,
        country_name: departureCountry,
        airport_code: flightData.departure.toUpperCase(),
        entry_date: entryDate.toISOString().split('T')[0],
        exit_date: entryDate.toISOString().split('T')[0],
        transport_type: 'flight',
        carrier: flightData.airline,
        flight_number: flightData.flightNumber,
        confirmation_number: flightData.confirmation,
        status: 'pending',
        confidence_score: 0.7,
        is_verified: false,
        manual_override: false,
        notes: `Extracted from email - departure from ${flightData.departure}`,
        metadata: { 
          email_extracted: true,
          flight_type: 'departure',
          raw_data: flightData
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    // Create arrival entry (entry to arrival country) 
    if (arrivalCountry !== 'UNKNOWN' && arrivalCountry !== departureCountry) {
      entries.push({
        user_id: userId,
        entry_type: 'email',
        source_id: flightEmailId,
        source_type: 'flight_email',
        country_code: arrivalCountry,
        country_name: arrivalCountry,
        airport_code: flightData.arrival.toUpperCase(),
        entry_date: entryDate.toISOString().split('T')[0],
        transport_type: 'flight',
        carrier: flightData.airline,
        flight_number: flightData.flightNumber,
        confirmation_number: flightData.confirmation,
        status: 'pending',
        confidence_score: 0.7,
        is_verified: false,
        manual_override: false,
        notes: `Extracted from email - arrival in ${flightData.arrival}`,
        metadata: { 
          email_extracted: true,
          flight_type: 'arrival',
          raw_data: flightData
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  }

  return entries
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

  try {
    // Get user's Office365 account
    const { data: emailAccounts, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'office365')
      .eq('is_active', true)
      .limit(1)

    if (accountError || !emailAccounts || emailAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Office365 account not connected' },
        { status: 404 }
      )
    }

    const account = emailAccounts[0]
    const accessToken = decrypt(account.access_token)

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid access token' },
        { status: 400 }
      )
    }

    // Fetch messages from Microsoft Graph API with server-side filtering
    const searchQuery = encodeURIComponent('(subject:flight OR subject:booking OR subject:confirmation OR subject:ticket) AND (body:airline OR body:travel)')
    const filterQuery = `$search="${searchQuery}"&$top=50&$orderby=receivedDateTime desc`
    
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${filterQuery}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        // Required for $search in Microsoft Graph
        'ConsistencyLevel': 'eventual',
        // Prefer text body content for easier parsing
        'Prefer': 'outlook.body-content-type="text"',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Graph API error: ${response.status} ${errorText}`)
    }

    const json = await response.json()
    const items = json.value || []

    const flightEmails = []
    for (const item of items) {
      const subject = item.subject || ''
      const from = item.from?.emailAddress?.address || ''
      const date = item.receivedDateTime || item.sentDateTime || ''
      const content = item.body?.content || ''

      const extractedFlights = await extractFlightInfo(content, subject)
      
      const flightData = {
        user_id: user.id,
        email_account_id: account.id,
        message_id: item.id,
        subject,
        sender: from,
        recipient: account.email,
        body_text: content,
        body_html: content,
        flight_data: extractedFlights,
        parsed_data: extractedFlights,
        confidence_score: 0.8,
        processing_status: 'completed',
        is_processed: true,
        date_received: date ? new Date(date).toISOString() : new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      flightEmails.push(flightData)
    }

    // Save to Supabase
    if (flightEmails.length > 0) {
      const { data: insertedEmails, error: insertError } = await supabase
        .from('flight_emails')
        .upsert(flightEmails, {
          onConflict: 'user_id,message_id',
          ignoreDuplicates: false
        })
        .select('id, flight_data, date_received')

      if (insertError) {
        console.error('Error saving flight emails:', insertError)
      } else if (insertedEmails && insertedEmails.length > 0) {
        // Create travel entries from flight emails
        const travelEntries = []
        for (const email of insertedEmails) {
          if (email.flight_data) {
            const entries = await createTravelEntries(
              user.id, 
              email.id, 
              email.flight_data, 
              email.date_received
            )
            travelEntries.push(...entries)
          }
        }

        // Save travel entries
        if (travelEntries.length > 0) {
          const { error: entriesError } = await supabase
            .from('travel_entries')
            .upsert(travelEntries, {
              onConflict: 'user_id,source_id,entry_type,country_code,entry_date',
              ignoreDuplicates: true
            })

          if (entriesError) {
            console.error('Error saving travel entries:', entriesError)
          } else {
            console.log(`Created ${travelEntries.length} travel entries from ${insertedEmails.length} flight emails`)
          }
        }
      }
    }

    // Update sync status
    await supabase
      .from('email_accounts')
      .update({
        last_sync: new Date().toISOString(),
        sync_status: 'completed',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    return NextResponse.json({
      success: true,
      count: flightEmails.length,
      emails: flightEmails,
    })
  } catch (error) {
    console.error('Error syncing Office365:', error)
    
    // Update error status
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'office365')
      .limit(1)

    if (accounts && accounts.length > 0) {
      await supabase
        .from('email_accounts')
        .update({
          sync_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accounts[0].id)
    }

    return NextResponse.json(
      { success: false, error: 'Failed to sync Office365 emails' },
      { status: 500 }
    )
  }
}
