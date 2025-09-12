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

// Mock flight extraction
async function extractFlightInfo(emailContent: string) {
  const flightPatterns = {
    airline: /(?:airline|carrier)[:\s]+([a-z\s]+)/i,
    flightNumber: /flight[:\s#]*([a-z]{2}\d{3,4})/i,
    confirmation: /confirmation[:\s#]*([a-z0-9]{6,})/i,
    departure: /(?:depart|from)[:\s]*([a-z]{3})/i,
    arrival: /(?:arrive|to)[:\s]*([a-z]{3})/i,
    date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  }

  const extracted: any = {}
  Object.entries(flightPatterns).forEach(([key, pattern]) => {
    const match = emailContent.match(pattern)
    if (match) {
      extracted[key] = match[1]
    }
  })

  return extracted
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

    // Fetch messages from Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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
      
      // Only process emails that might be flight-related
      if (!subject.toLowerCase().includes('flight') && 
          !subject.toLowerCase().includes('booking') && 
          !subject.toLowerCase().includes('confirmation') &&
          !content.toLowerCase().includes('airline')) {
        continue
      }

      const extractedFlights = await extractFlightInfo(content)
      
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
      const { error: insertError } = await supabase
        .from('flight_emails')
        .upsert(flightEmails, {
          onConflict: 'user_id,message_id',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error('Error saving flight emails:', insertError)
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
