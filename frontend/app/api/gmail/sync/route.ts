import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { google } from 'googleapis'
import crypto from 'crypto'

// Decryption function
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || 'default-key'
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

// Helper function to extract email content
function extractEmailContent(payload: any): string {
  let content = ''

  if (payload.body && payload.body.data) {
    content = Buffer.from(payload.body.data, 'base64').toString()
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        content += Buffer.from(part.body.data, 'base64').toString()
      }
    }
  }

  return content
}

// Mock flight extraction (replace with real AI/NLP service)
async function extractFlightInfo(emailContent: string) {
  // Simple pattern matching for demo - in production use proper AI/NLP
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
    // Get user's Gmail account
    const { data: emailAccounts, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .limit(1)

    if (accountError || !emailAccounts || emailAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gmail account not connected' },
        { status: 404 }
      )
    }

    const account = emailAccounts[0]
    const refreshToken = decrypt(account.refresh_token)

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )

    oauth2Client.setCredentials({ refresh_token: refreshToken })
    await oauth2Client.refreshAccessToken()

    // Use Gmail API to fetch messages
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const searchQuery = 'subject:(confirmation OR booking OR ticket OR flight) (airline OR travel)'
    const { data: list } = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 50
    })

    const flightEmails = []
    if (list.messages && list.messages.length) {
      for (const m of list.messages) {
        if (!m.id) continue
        
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: m.id,
          format: 'full'
        })
        
        const email = messageData.data
        const headers = email.payload?.headers || []
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
        const from = headers.find((h: any) => h.name === 'From')?.value || ''
        const date = headers.find((h: any) => h.name === 'Date')?.value || ''
        const emailContent = extractEmailContent(email.payload)

        const extractedFlights = await extractFlightInfo(emailContent)
        
        const flightData = {
          user_id: user.id,
          email_account_id: account.id,
          message_id: m.id,
          subject,
          sender: from,
          recipient: account.email,
          body_text: emailContent,
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
    console.error('Error syncing Gmail:', error)
    
    // Update error status
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
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
      { success: false, error: 'Failed to sync Gmail emails' },
      { status: 500 }
    )
  }
}