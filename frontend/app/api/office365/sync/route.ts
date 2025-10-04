import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import crypto from 'crypto'

// Decryption function
function getKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Server misconfiguration: ENCRYPTION_KEY is not set')
  }
  return crypto.createHash('sha256').update(raw).digest()
}

function encrypt(text: string) {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64')
  })
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

// Create travel entries from extracted flight data (Prisma format)
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

    const entryDateStr = entryDate.toISOString().split('T')[0]

    // Create departure entry (exit from departure country)
    if (departureCountry !== 'UNKNOWN') {
      entries.push({
        userId,
        entryType: 'email',
        sourceId: flightEmailId,
        sourceType: 'flight_email',
        countryCode: departureCountry,
        countryName: departureCountry,
        airportCode: flightData.departure.toUpperCase(),
        entryDate: entryDateStr,
        exitDate: entryDateStr,
        transportType: 'flight',
        carrier: flightData.airline || null,
        flightNumber: flightData.flightNumber || null,
        confirmationNumber: flightData.confirmation || null,
        status: 'pending',
        confidenceScore: 0.7,
        isVerified: false,
        manualOverride: false,
        notes: `Extracted from email - departure from ${flightData.departure}`,
        metadata: {
          email_extracted: true,
          flight_type: 'departure',
          raw_data: flightData
        },
      })
    }

    // Create arrival entry (entry to arrival country)
    if (arrivalCountry !== 'UNKNOWN' && arrivalCountry !== departureCountry) {
      entries.push({
        userId,
        entryType: 'email',
        sourceId: flightEmailId,
        sourceType: 'flight_email',
        countryCode: arrivalCountry,
        countryName: arrivalCountry,
        airportCode: flightData.arrival.toUpperCase(),
        entryDate: entryDateStr,
        exitDate: null,
        transportType: 'flight',
        carrier: flightData.airline || null,
        flightNumber: flightData.flightNumber || null,
        confirmationNumber: flightData.confirmation || null,
        status: 'pending',
        confidenceScore: 0.7,
        isVerified: false,
        manualOverride: false,
        notes: `Extracted from email - arrival in ${flightData.arrival}`,
        metadata: {
          email_extracted: true,
          flight_type: 'arrival',
          raw_data: flightData
        },
      })
    }
  }

  return entries
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const body = await request.json().catch(() => ({}))
    const {
      accountId,
      skipToken,
      syncFromDate,
      maxResults = 200 // Default to 200, max cap at 500 for safety
    } = body

    // Validate and cap maxResults
    const cappedMaxResults = Math.min(Math.max(1, maxResults), 500)

    // Get user's Office365 account(s)
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        userId: userId,
        provider: 'office365',
        isActive: true,
        ...(accountId && { id: accountId }),
      },
    })

    if (!emailAccounts || emailAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Office365 account not connected' },
        { status: 404 }
      )
    }

    const account = emailAccounts[0]
    let accessToken = decrypt(account.accessToken)
    const refreshToken = decrypt(account.refreshToken)

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token available' },
        { status: 400 }
      )
    }

    // Check if token is expired and refresh if necessary
    const tokenExpiresAt = account.tokenExpiresAt
    const now = new Date()

    if (!accessToken || !tokenExpiresAt || tokenExpiresAt < now) {
      console.log('[Office365 Sync] Token expired or missing, refreshing...')

      // Refresh the access token
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
      const tokenParams = new URLSearchParams({
        client_id: process.env.OFFICE365_CLIENT_ID!,
        client_secret: process.env.OFFICE365_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'offline_access User.Read Mail.Read',
      })

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams,
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('[Office365 Sync] Token refresh failed:', errorText)
        return NextResponse.json(
          { success: false, error: 'Failed to refresh Office365 token. Please reconnect your account.' },
          { status: 401 }
        )
      }

      const tokens = await tokenResponse.json()
      accessToken = tokens.access_token

      // Update the stored tokens
      const encryptedAccessToken = encrypt(tokens.access_token)
      const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : account.refreshToken
      const newExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      })

      console.log('[Office365 Sync] Token refreshed successfully')
    }

    // Fetch messages from Microsoft Graph API with server-side filtering
    // Build query parameters based on whether we're using date filtering or search
    let apiUrl = 'https://graph.microsoft.com/v1.0/me/messages'
    const queryParams: string[] = []
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'outlook.body-content-type="text"',
    }

    // If syncFromDate is provided, use $filter instead of $search (they're mutually exclusive)
    if (syncFromDate) {
      try {
        const fromDate = new Date(syncFromDate)
        if (!isNaN(fromDate.getTime())) {
          // Microsoft Graph API date format: ISO-8601
          const isoDate = fromDate.toISOString()
          // Use $filter with date and subject/body keywords
          const filterExpr = encodeURIComponent(
            `receivedDateTime ge ${isoDate} and (contains(subject,'flight') or contains(subject,'booking') or contains(subject,'confirmation') or contains(subject,'ticket'))`
          )
          queryParams.push(`$filter=${filterExpr}`)
          queryParams.push(`$orderby=receivedDateTime desc`)
        }
      } catch (error) {
        console.warn('[Office365 Sync] Invalid syncFromDate, falling back to search:', syncFromDate)
      }
    }

    // If no date filter or it failed, use $search instead
    if (queryParams.length === 0) {
      const searchQuery = encodeURIComponent('(subject:flight OR subject:booking OR subject:confirmation OR subject:ticket) AND (body:airline OR body:travel)')
      queryParams.push(`$search="${searchQuery}"`)
      // Required for $search in Microsoft Graph
      headers['ConsistencyLevel'] = 'eventual'
    }

    queryParams.push(`$top=${cappedMaxResults}`)
    queryParams.push('$select=id,subject,bodyPreview,receivedDateTime,from,body')

    // Add skip token for pagination if provided
    if (skipToken) {
      queryParams.push(`$skiptoken=${encodeURIComponent(skipToken)}`)
    }

    const fullUrl = `${apiUrl}?${queryParams.join('&')}`
    console.log('[Office365 Sync] Fetching from:', fullUrl)

    const response = await fetch(fullUrl, { headers })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Graph API error: ${response.status} ${errorText}`)
    }

    const json = await response.json()
    let items = json.value || []
    const nextSkipToken = json['@odata.nextLink']
      ? new URL(json['@odata.nextLink']).searchParams.get('$skiptoken')
      : null

    // Sort emails by receivedDateTime (newest first) if using $search (can't use $orderBy with $search)
    if (!syncFromDate) {
      items.sort((a: any, b: any) => {
        const dateA = new Date(a.receivedDateTime || 0).getTime()
        const dateB = new Date(b.receivedDateTime || 0).getTime()
        return dateB - dateA // Descending order (newest first)
      })
    }

    console.log('[Office365 Sync] Fetched', items.length, 'messages, has more:', !!nextSkipToken)

    // Check which message IDs already exist in the database for progress tracking
    const messageIds = items.map((item: any) => item.id).filter(Boolean)
    const existingEmails = await prisma.flightEmail.findMany({
      where: {
        userId: userId,
        emailAccountId: account.id,
        messageId: {
          in: messageIds
        }
      },
      select: {
        messageId: true
      }
    })

    const existingMessageIds = new Set(existingEmails.map(e => e.messageId))
    console.log('[Office365 Sync] Already processed:', existingMessageIds.size, 'out of', messageIds.length)

    let fetchedCount = items.length
    let alreadyProcessedCount = 0
    let newlyAddedCount = 0
    let failedCount = 0

    const flightEmails = []
    for (const item of items) {
      // Skip if already processed
      if (existingMessageIds.has(item.id)) {
        console.log('[Office365 Sync] Message already processed, skipping:', item.id)
        alreadyProcessedCount++
        continue
      }

      try {
        const subject = item.subject || ''
        const from = item.from?.emailAddress?.address || ''
        const date = item.receivedDateTime || item.sentDateTime || ''
        const content = item.body?.content || ''

        const extractedFlights = await extractFlightInfo(content, subject)

        const flightData = {
          userId: userId,
          emailAccountId: account.id,
          messageId: item.id,
          subject,
          sender: from,
          recipient: account.email || '',
          bodyText: content,
          bodyHtml: content,
          flightData: extractedFlights,
          parsedData: extractedFlights,
          confidenceScore: 0.8,
          processingStatus: 'completed',
          isProcessed: true,
          dateReceived: date ? new Date(date) : new Date(),
        }

        flightEmails.push(flightData)
      } catch (itemError) {
        console.error('[Office365 Sync] Error processing message:', item.id, itemError)
        failedCount++
      }
    }

    // Save to database using Prisma createMany with skipDuplicates
    if (flightEmails.length > 0) {
      const insertResult = await prisma.flightEmail.createMany({
        data: flightEmails,
        skipDuplicates: true,
      })
      newlyAddedCount = insertResult.count
      console.log('[Office365 Sync] Inserted', newlyAddedCount, 'new emails')

      // Fetch the inserted emails to create travel entries
      if (insertResult.count > 0) {
        const insertedEmails = await prisma.flightEmail.findMany({
          where: {
            userId: userId,
            emailAccountId: account.id,
            messageId: {
              in: flightEmails.map(e => e.messageId),
            },
          },
          select: {
            id: true,
            flightData: true,
            dateReceived: true,
          },
        })

        // Create travel entries from flight emails
        const travelEntries = []
        for (const email of insertedEmails) {
          if (email.flightData && email.dateReceived) {
            const entries = await createTravelEntries(
              userId,
              email.id,
              email.flightData,
              email.dateReceived.toISOString()
            )
            travelEntries.push(...entries)
          }
        }

        // Save travel entries
        if (travelEntries.length > 0) {
          await prisma.travelEntry.createMany({
            data: travelEntries,
            skipDuplicates: true,
          })
          console.log(`Created ${travelEntries.length} travel entries from ${insertedEmails.length} flight emails`)
        }
      }
    }

    // Update sync status
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        lastSync: new Date(),
        syncStatus: 'completed',
        errorMessage: null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      totalCount: newlyAddedCount,
      stats: {
        fetched: fetchedCount,
        alreadyProcessed: alreadyProcessedCount,
        newlyAdded: newlyAddedCount,
        failed: failedCount
      },
      results: [{
        accountId: account.id,
        email: account.email || '',
        count: flightEmails.length,
        stats: {
          fetched: fetchedCount,
          alreadyProcessed: alreadyProcessedCount,
          newlyAdded: newlyAddedCount,
          failed: failedCount
        }
      }],
      nextPageToken: nextSkipToken || undefined,
      hasMore: !!nextSkipToken
    })
  } catch (error) {
    console.error('Error syncing Office365:', error)

    // Update error status
    const accounts = await prisma.emailAccount.findMany({
      where: {
        userId: userId,
        provider: 'office365',
      },
      select: { id: true },
      take: 1,
    })

    if (accounts && accounts.length > 0) {
      await prisma.emailAccount.update({
        where: { id: accounts[0].id },
        data: {
          syncStatus: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to sync Office365 emails' },
      { status: 500 }
    )
  }
}
