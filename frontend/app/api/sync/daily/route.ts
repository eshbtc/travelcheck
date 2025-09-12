import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { decrypt } from '@/lib/crypto'
import { google } from 'googleapis'

async function syncUserGmail(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get user's Gmail account
    const { data: emailAccount, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .single()

    if (error || !emailAccount) {
      return { success: false, count: 0, error: 'Gmail account not found' }
    }

    const refreshToken = decrypt(emailAccount.refresh_token)
    if (!refreshToken) {
      return { success: false, count: 0, error: 'Invalid refresh token' }
    }

    // Initialize OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )

    oauth2Client.setCredentials({ refresh_token: refreshToken })
    
    try {
      await oauth2Client.refreshAccessToken()
    } catch (tokenError) {
      return { success: false, count: 0, error: 'Failed to refresh access token' }
    }

    // Use Gmail API to sync emails
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const searchQuery = 'subject:(confirmation OR booking OR ticket OR flight) (airline OR travel) newer_than:7d'
    
    const { data: list } = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 20
    })

    let syncCount = 0
    if (list.messages && list.messages.length) {
      for (const message of list.messages) {
        if (!message.id) continue

        // Check if already processed
        const { data: existing } = await supabase
          .from('flight_emails')
          .select('id')
          .eq('user_id', userId)
          .eq('message_id', message.id)
          .single()

        if (existing) continue // Already processed

        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        })

        const email = messageData.data
        const headers = email.payload?.headers || []
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
        const from = headers.find((h: any) => h.name === 'From')?.value || ''
        const date = headers.find((h: any) => h.name === 'Date')?.value || ''

        // Extract email content
        let content = ''
        if (email.payload?.body?.data) {
          content = Buffer.from(email.payload.body.data, 'base64').toString()
        } else if (email.payload?.parts) {
          for (const part of email.payload.parts) {
            if (part.body?.data) {
              content += Buffer.from(part.body.data, 'base64').toString()
            }
          }
        }

        // Simple flight extraction
        const flightRegex = /flight\s+([A-Z]{2}\d{3,4})/gi
        const flights = []
        let match
        while ((match = flightRegex.exec(content)) !== null) {
          flights.push(match[1])
        }

        // Save to database
        const { error: insertError } = await supabase
          .from('flight_emails')
          .insert({
            user_id: userId,
            message_id: message.id,
            subject,
            sender: from,
            date_received: date,
            body_text: content,
            parsed_data: { flights, extractedAt: new Date().toISOString() },
            processing_status: 'completed',
            confidence_score: flights.length > 0 ? 0.8 : 0.3,
            created_at: new Date().toISOString()
          })

        if (!insertError) {
          syncCount++
        }
      }
    }

    return { success: true, count: syncCount }
  } catch (error) {
    console.error('Error syncing Gmail for user:', userId, error)
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function syncUserOffice365(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get user's Office365 account
    const { data: emailAccount, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'office365')
      .single()

    if (error || !emailAccount) {
      return { success: false, count: 0, error: 'Office365 account not found' }
    }

    const accessToken = decrypt(emailAccount.access_token)
    if (!accessToken) {
      return { success: false, count: 0, error: 'Invalid access token' }
    }

    // Use Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=20&$filter=receivedDateTime ge ' + 
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return { success: false, count: 0, error: 'Failed to fetch emails from Office365' }
    }

    const data = await response.json()
    const messages = data.value || []

    let syncCount = 0
    for (const message of messages) {
      // Check if flight-related
      const subject = message.subject || ''
      const isFlightEmail = /confirmation|booking|ticket|flight|airline|travel/i.test(subject)
      
      if (!isFlightEmail) continue

      // Check if already processed
      const { data: existing } = await supabase
        .from('flight_emails')
        .select('id')
        .eq('user_id', userId)
        .eq('message_id', message.id)
        .single()

      if (existing) continue

      const content = message.body?.content || ''
      const from = message.from?.emailAddress?.address || ''

      // Save to database
      const { error: insertError } = await supabase
        .from('flight_emails')
        .insert({
          user_id: userId,
          message_id: message.id,
          subject,
          sender: from,
          date_received: message.receivedDateTime,
          body_text: content,
          parsed_data: { source: 'office365', extractedAt: new Date().toISOString() },
          processing_status: 'completed',
          confidence_score: 0.6,
          created_at: new Date().toISOString()
        })

      if (!insertError) {
        syncCount++
      }
    }

    return { success: true, count: syncCount }
  } catch (error) {
    console.error('Error syncing Office365 for user:', userId, error)
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a scheduled request (in production, you'd check for a secret header)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body for single user processing
    const body = await request.json().catch(() => ({}))
    const singleUserId = body.singleUser

    // Get email accounts - either for all users or specific user
    let query = supabase
      .from('email_accounts')
      .select('user_id, provider, is_active')
      .eq('is_active', true)
    
    if (singleUserId) {
      query = query.eq('user_id', singleUserId)
    }

    const { data: emailAccounts, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch email accounts' },
        { status: 500 }
      )
    }

    const results = []
    const processedUsers = new Set<string>()

    for (const account of emailAccounts || []) {
      if (processedUsers.has(account.user_id)) continue
      processedUsers.add(account.user_id)

      const userResults = {
        userId: account.user_id,
        gmail: { success: false, count: 0 },
        office365: { success: false, count: 0 }
      }

      // Check if user has Gmail
      const hasGmail = emailAccounts.some(acc => 
        acc.user_id === account.user_id && acc.provider === 'gmail'
      )

      // Check if user has Office365
      const hasOffice365 = emailAccounts.some(acc => 
        acc.user_id === account.user_id && acc.provider === 'office365'
      )

      // Sync Gmail if connected
      if (hasGmail) {
        userResults.gmail = await syncUserGmail(account.user_id)
      }

      // Sync Office365 if connected
      if (hasOffice365) {
        userResults.office365 = await syncUserOffice365(account.user_id)
      }

      results.push(userResults)
    }

    // Calculate totals
    const totalSynced = results.reduce((sum, result) => 
      sum + result.gmail.count + result.office365.count, 0
    )

    return NextResponse.json({
      success: true,
      message: singleUserId ? `Email sync completed for user ${singleUserId}` : 'Daily email sync completed',
      summary: {
        usersProcessed: results.length,
        totalEmailsSynced: totalSynced,
        singleUserMode: !!singleUserId,
        timestamp: new Date().toISOString()
      },
      results
    })
  } catch (error) {
    console.error('Error in daily email sync:', error)
    return NextResponse.json(
      { success: false, error: 'Daily sync failed' },
      { status: 500 }
    )
  }
}