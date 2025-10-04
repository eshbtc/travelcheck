import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import { google } from 'googleapis'
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

// Helper function to extract email content
function extractEmailContent(payload: any): string {
  console.log('[extractEmailContent] Starting extraction...')
  console.log('[extractEmailContent] Payload type:', typeof payload)
  console.log('[extractEmailContent] Payload has body:', !!payload?.body)
  console.log('[extractEmailContent] Payload has parts:', !!payload?.parts)

  let content = ''

  try {
    if (payload.body && payload.body.data) {
      console.log('[extractEmailContent] Using payload.body.data')
      content = Buffer.from(payload.body.data, 'base64').toString()
      console.log('[extractEmailContent] Content extracted from body, length:', content.length)
    } else if (payload.parts) {
      console.log('[extractEmailContent] Using payload.parts')
      console.log('[extractEmailContent] Parts type:', typeof payload.parts)
      console.log('[extractEmailContent] Parts isArray:', Array.isArray(payload.parts))
      console.log('[extractEmailContent] Parts length:', payload.parts?.length)

      if (!Array.isArray(payload.parts)) {
        console.error('[extractEmailContent] CRITICAL: payload.parts is not an array!')
        console.error('[extractEmailContent] Parts value:', payload.parts)
        return content
      }

      for (const part of payload.parts) {
        console.log('[extractEmailContent] Processing part, mimeType:', part.mimeType)
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          console.log('[extractEmailContent] Extracting text/plain part')
          content += Buffer.from(part.body.data, 'base64').toString()
        }
      }
      console.log('[extractEmailContent] Content extracted from parts, total length:', content.length)
    } else {
      console.log('[extractEmailContent] No body or parts found')
    }

    return content
  } catch (error) {
    console.error('[extractEmailContent] Error during extraction:', error)
    console.error('[extractEmailContent] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return content
  }
}

// Normalize and validate date strings to ISO-8601 format (YYYY-MM-DD)
function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  // Normalize whitespace (replace multiple spaces with single space)
  dateStr = dateStr.replace(/\s+/g, ' ').trim()

  // OCR error recovery: try to clean up corrupted text
  // "11  ET02 2025" → extract numbers and try patterns
  // "ET02" might be OCR error for month numbers or names
  let ocrCorrectionApplied = false
  const ocrErrorPatterns: Array<{ pattern: RegExp; replacement: string | ((match: string, ...args: string[]) => string) }> = [
    { pattern: /ET0?(\d{1,2})/i, replacement: (match: string, num: string) => num }, // ET02 → 02
    { pattern: /0CT/i, replacement: 'Oct' }, // 0CT → Oct
    { pattern: /\bET\b/i, replacement: 'Oct' }, // ET alone → Oct (common OCR error)
  ]

  for (const { pattern, replacement } of ocrErrorPatterns) {
    if (pattern.test(dateStr)) {
      dateStr = typeof replacement === 'function'
        ? dateStr.replace(pattern, replacement)
        : dateStr.replace(pattern, replacement)
      ocrCorrectionApplied = true
    }
  }

  try {
    // Try parsing as-is first (skip if OCR correction was applied, as native Date parser may misinterpret)
    if (!ocrCorrectionApplied) {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }

    // Handle various formats:
    // 1. YY/MM/DD format (year first, 2-digit): "25/09/10" → 2025-09-10
    // Detect by checking if first number could be a 2-digit year (20-29 for 2020s)
    const yymmdd = /^(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
    let match = dateStr.match(yymmdd)
    if (match) {
      const [, first, second, third] = match
      const firstNum = parseInt(first, 10)

      // If first number is 20-29, likely YY/MM/DD format
      // Also check if second and third are valid month/day ranges
      if (firstNum >= 20 && firstNum <= 29 && parseInt(second, 10) <= 12 && parseInt(third, 10) <= 31) {
        const year = `20${first}`
        const month = second.padStart(2, '0')
        const day = third.padStart(2, '0')
        const date = new Date(`${year}-${month}-${day}`)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]
        }
      }

      // Otherwise try MM/DD/YY interpretation
      const yearNum = parseInt(third, 10)
      const year = yearNum < 50 ? `20${third}` : `19${third}`
      const date = new Date(`${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // 2. MM/DD/YYYY or MM-DD-YYYY or MM/DD/YY or MM-DD-YY
    const slashOrDash = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/
    match = dateStr.match(slashOrDash)
    if (match) {
      let [, month, day, year] = match
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year, 10)
        year = yearNum < 50 ? `20${year}` : `19${year}`
      }
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // 3. Month name formats with flexible spacing: "January 20, 2025" or "Jan 20, 2025"
    // Only match letters for month names (not digits like "11")
    const monthNames = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/
    match = dateStr.match(monthNames)
    if (match) {
      const [, month, day, year] = match
      const date = new Date(`${month} ${day}, ${year}`)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // 4. Reverse format with flexible spacing: "20 January 2025"
    // Only match letters for month names (not digits like "11")
    const reverseMonth = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/
    match = dateStr.match(reverseMonth)
    if (match) {
      const [, day, month, year] = match
      const date = new Date(`${month} ${day}, ${year}`)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // 5. ISO-8601 format: "2025-08-30" or "20250830"
    const iso = /^(\d{4})-?(\d{2})-?(\d{2})$/
    match = dateStr.match(iso)
    if (match) {
      const [, year, month, day] = match
      const date = new Date(`${year}-${month}-${day}`)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // 6. Fallback: extract just numbers from corrupted string
    // "11  ET02 2025" → try "11 02 2025" as "day month year"
    const numbersOnly = dateStr.match(/\d+/g)
    if (numbersOnly && numbersOnly.length >= 3) {
      const [a, b, c] = numbersOnly

      // Try various interpretations, prioritizing more likely formats
      const interpretations = [
        // Day Month Year (most common for OCR errors)
        { day: a, month: b, year: c.length === 2 ? `20${c}` : c, priority: 1 },
        // Year Month Day (if first number is 4 digits)
        ...(a.length === 4 ? [{ year: a, month: b, day: c, priority: 2 }] : []),
        // Month Day Year (fallback)
        { month: a, day: b, year: c.length === 2 ? `20${c}` : c, priority: 3 },
      ]

      // Sort by priority and try each interpretation
      interpretations.sort((x, y) => x.priority - y.priority)

      for (const { day, month, year } of interpretations) {
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)

        // Validate ranges
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error(`Date normalization failed for "${dateStr}":`, error)
    return null
  }
}

// Mock flight extraction (replace with real AI/NLP service)
async function extractFlightInfo(emailContent: string, subject: string) {
  console.log('[extractFlightInfo] Starting flight info extraction...')
  console.log('[extractFlightInfo] Email content length:', emailContent?.length || 0)
  console.log('[extractFlightInfo] Subject:', subject)

  try {
    // Simple pattern matching for demo - in production use proper AI/NLP
    const combinedText = `${subject} ${emailContent}`
    console.log('[extractFlightInfo] Combined text length:', combinedText.length)

    const flightPatterns = {
      airline: /(?:airline|carrier)[:\s]+([a-z\s]+)|^([a-z\s]{2,20})\s+flight|(\b(?:american|delta|united|southwest|jetblue|alaska|spirit|frontier)\b)/i,
      flightNumber: /flight[:\s#]*([a-z]{2}\d{3,4})|(\b[a-z]{2}\s*\d{3,4}\b)/i,
      confirmation: /confirmation[:\s#]*([a-z0-9]{6,})|booking[:\s#]*([a-z0-9]{6,})/i,
      departure: /(?:depart|from)[:\s]*([a-z]{3})|(\b[A-Z]{3}\b)\s*(?:to|→)|departing\s*([a-z]{3})/i,
      arrival: /(?:arrive|to|arriving)[:\s]*([a-z]{3})|(?:to|→)\s*(\b[A-Z]{3}\b)/i,
      // Improved date pattern - capture full month names and various formats
      date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})|(\d{1,2}\s+\w+\s+\d{4})|(\d{4}-\d{2}-\d{2})/i
    }

    const extracted: any = {}
    console.log('[extractFlightInfo] Processing patterns...')

    Object.entries(flightPatterns).forEach(([key, pattern]) => {
      console.log('[extractFlightInfo] Matching pattern for:', key)
      const match = combinedText.match(pattern)
      console.log('[extractFlightInfo] Match result for', key, ':', match ? 'found' : 'not found')

      if (match) {
        console.log('[extractFlightInfo] Match array for', key, ':', match)
        console.log('[extractFlightInfo] Match array type:', typeof match)
        console.log('[extractFlightInfo] Match isArray:', Array.isArray(match))

        if (!Array.isArray(match)) {
          console.error('[extractFlightInfo] CRITICAL: match is not an array for key:', key)
          console.error('[extractFlightInfo] Match value:', match)
          return
        }

        // Get first non-undefined capture group
        console.log('[extractFlightInfo] About to call match.find() for key:', key)
        const rawValue = match.find((m, i) => i > 0 && m !== undefined)?.trim()
        console.log('[extractFlightInfo] Raw value for', key, ':', rawValue)

        // Special handling for date fields - normalize to ISO-8601
        if (key === 'date' && rawValue) {
          console.log('[extractFlightInfo] Normalizing date:', rawValue)
          const normalized = normalizeDate(rawValue)
          console.log('[extractFlightInfo] Normalized date:', normalized)
          if (normalized) {
            extracted[key] = normalized
          } else {
            console.warn(`[extractFlightInfo] Failed to normalize date: "${rawValue}"`)
          }
        } else {
          extracted[key] = rawValue
        }
      }
    })

    console.log('[extractFlightInfo] Extraction complete, extracted data:', extracted)
    return extracted
  } catch (error) {
    console.error('[extractFlightInfo] Error during extraction:', error)
    console.error('[extractFlightInfo] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return {}
  }
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
  const entries: any[] = []

  if (flightData.departure && flightData.arrival && flightData.date) {
    // Validate and normalize the date - flightData.date should already be in ISO-8601 format
    let entryDateStr: string

    try {
      // If date is already in ISO-8601 format (YYYY-MM-DD), use it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(flightData.date)) {
        // Validate it's a valid date
        const testDate = new Date(flightData.date)
        if (isNaN(testDate.getTime())) {
          throw new Error('Invalid date')
        }
        entryDateStr = flightData.date
      } else {
        // Try to normalize the date
        const normalized = normalizeDate(flightData.date)
        if (normalized) {
          entryDateStr = normalized
        } else {
          throw new Error('Date normalization failed')
        }
      }
    } catch (error) {
      // Fallback to email received date
      console.warn(`Invalid flight date "${flightData.date}" for email ${flightEmailId}, using email date as fallback`)
      const fallbackDate = new Date(emailDate)
      if (isNaN(fallbackDate.getTime())) {
        // Skip this entry if we can't get a valid date
        console.error(`Cannot create travel entry: both flight date and email date are invalid`)
        return entries
      }
      entryDateStr = fallbackDate.toISOString().split('T')[0]
    }

    // Extract country codes from airport codes
    const departureCountry = AIRPORT_COUNTRIES[flightData.departure.toUpperCase()] || 'UNKNOWN'
    const arrivalCountry = AIRPORT_COUNTRIES[flightData.arrival.toUpperCase()] || 'UNKNOWN'

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
    console.log('[SYNC] Starting Gmail sync for user:', userId)

    const body = await request.json().catch(() => ({}))
    const { accountId } = body
    console.log('[SYNC] Request body:', { accountId })

    // Get user's Gmail accounts (optionally a specific account)
    console.log('[SYNC] Fetching email accounts...')
    const emailAccounts = await prisma.emailAccount.findMany({
      where: {
        userId: userId,
        provider: 'gmail',
        isActive: true,
        ...(accountId && { id: accountId }),
      },
    })
    console.log('[SYNC] Found email accounts:', emailAccounts?.length || 0)

    if (!emailAccounts || emailAccounts.length === 0) {
      console.log('[SYNC] No Gmail accounts found')
      return NextResponse.json(
        { success: false, error: 'Gmail account not connected' },
        { status: 404 }
      )
    }

    const aggregateResults: Array<{ accountId: string, email: string, count: number }> = []
    let totalCount = 0

    for (const account of emailAccounts) {
      console.log('[SYNC] Processing account:', account.id, account.email)

      try {
        const refreshToken = decrypt(account.refreshToken)
        if (!refreshToken) {
          console.error('[SYNC] Failed to decrypt refresh token for account:', account.id)
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: {
              syncStatus: 'failed',
              errorMessage: 'Invalid refresh token',
              updatedAt: new Date(),
            },
          })
          continue
        }

        console.log('[SYNC] Setting up OAuth2 client...')
        const oauth2Client = new google.auth.OAuth2(
          process.env.GMAIL_CLIENT_ID,
          process.env.GMAIL_CLIENT_SECRET,
          process.env.GMAIL_REDIRECT_URI,
        )

        oauth2Client.setCredentials({ refresh_token: refreshToken })
        console.log('[SYNC] Refreshing access token...')
        await oauth2Client.refreshAccessToken()

        // Use Gmail API to fetch messages
        console.log('[SYNC] Initializing Gmail API...')
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
        const searchQuery = 'subject:(confirmation OR booking OR ticket OR flight) (airline OR travel)'
        console.log('[SYNC] Fetching messages with query:', searchQuery)
        const { data: list } = await gmail.users.messages.list({ userId: 'me', q: searchQuery, maxResults: 50 })

        console.log('[SYNC] Gmail API response - list:', list ? 'exists' : 'null')
        console.log('[SYNC] Gmail API response - list.messages:', list?.messages ? `array with ${list.messages.length} items` : 'null/undefined')
        console.log('[SYNC] Gmail API response - list.messages type:', typeof list?.messages)
        console.log('[SYNC] Gmail API response - list.messages isArray:', Array.isArray(list?.messages))

        const flightEmails: any[] = []
        if (list && list.messages && Array.isArray(list.messages) && list.messages.length > 0) {
          console.log('[SYNC] Processing', list.messages.length, 'messages...')

          for (const m of list.messages) {
            if (!m.id) {
              console.log('[SYNC] Skipping message with no ID')
              continue
            }

            console.log('[SYNC] Fetching message details for ID:', m.id)
            try {
              const messageData = await gmail.users.messages.get({
                userId: 'me',
                id: m.id,
                format: 'full'
              })

              console.log('[SYNC] Message data received for ID:', m.id)
              const email = messageData.data
              const headers = email.payload?.headers || []
              console.log('[SYNC] Headers count:', headers.length)

              // Check if headers is actually an array before calling find
              if (!Array.isArray(headers)) {
                console.error('[SYNC] CRITICAL: headers is not an array! Type:', typeof headers)
                console.error('[SYNC] Headers value:', headers)
                continue
              }

              console.log('[SYNC] About to call headers.find() for Subject...')
              const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
              console.log('[SYNC] Subject extracted:', subject)

              console.log('[SYNC] About to call headers.find() for From...')
              const from = headers.find((h: any) => h.name === 'From')?.value || ''
              console.log('[SYNC] From extracted:', from)

              console.log('[SYNC] About to call headers.find() for Date...')
              const date = headers.find((h: any) => h.name === 'Date')?.value || ''
              console.log('[SYNC] Date extracted:', date)

              console.log('[SYNC] Extracting email content...')
              const emailContent = extractEmailContent(email.payload)
              console.log('[SYNC] Email content extracted, length:', emailContent.length)

              console.log('[SYNC] Extracting flight info...')
              const extractedFlights = await extractFlightInfo(emailContent, subject)
              console.log('[SYNC] Flight info extracted:', extractedFlights)

              flightEmails.push({
                userId: userId,
                emailAccountId: account.id,
                messageId: m.id,
                subject,
                sender: from,
                recipient: account.email || '',
                bodyText: emailContent,
                flightData: extractedFlights,
                parsedData: extractedFlights,
                confidenceScore: 0.8,
                processingStatus: 'completed',
                isProcessed: true,
                dateReceived: date ? new Date(date) : new Date(),
              })
              console.log('[SYNC] Flight email added to array, total count:', flightEmails.length)
            } catch (messageError) {
              console.error('[SYNC] Error processing message ID:', m.id)
              console.error('[SYNC] Message error details:', messageError)
              console.error('[SYNC] Message error stack:', messageError instanceof Error ? messageError.stack : 'No stack trace')
              // Continue processing other messages
            }
          }

          console.log('[SYNC] Finished processing messages, flight emails count:', flightEmails.length)

          // Save to database using Prisma createMany with skipDuplicates
          if (flightEmails.length > 0) {
            console.log('[SYNC] Saving flight emails to database...')
            const insertResult = await prisma.flightEmail.createMany({
              data: flightEmails,
              skipDuplicates: true,
            })
            console.log('[SYNC] Insert result count:', insertResult.count)

            // Fetch the inserted emails to create travel entries
            if (insertResult.count > 0 && flightEmails && Array.isArray(flightEmails) && flightEmails.length > 0) {
              console.log('[SYNC] Creating message IDs array for travel entries...')
              console.log('[SYNC] flightEmails type:', typeof flightEmails)
              console.log('[SYNC] flightEmails isArray:', Array.isArray(flightEmails))
              console.log('[SYNC] flightEmails length:', flightEmails?.length)
              console.log('[SYNC] flightEmails sample (first item):', flightEmails[0])

              console.log('[SYNC] About to call flightEmails.map()...')
              const messageIds = (flightEmails.map(e => e?.messageId) || []).filter(Boolean)
              console.log('[SYNC] Message IDs extracted:', messageIds)

              if (!messageIds || messageIds.length === 0) {
                console.warn('[SYNC] No valid message IDs found in flight emails')
                continue
              }

              console.log('[SYNC] Fetching inserted emails from database...')
              const insertedEmails = await prisma.flightEmail.findMany({
                where: {
                  userId: userId,
                  emailAccountId: account.id,
                  messageId: {
                    in: messageIds,
                  },
                },
                select: {
                  id: true,
                  flightData: true,
                  dateReceived: true,
                },
              })
              console.log('[SYNC] Fetched inserted emails count:', insertedEmails?.length || 0)

              const travelEntries = []
              console.log('[SYNC] Creating travel entries...')
              for (const email of insertedEmails || []) {
                console.log('[SYNC] Processing email for travel entry, ID:', email.id)
                if (email.flightData && email.dateReceived) {
                  console.log('[SYNC] Calling createTravelEntries...')
                  const entries = await createTravelEntries(
                    userId,
                    email.id,
                    email.flightData,
                    email.dateReceived.toISOString()
                  )
                  console.log('[SYNC] Travel entries created:', entries?.length || 0)
                  if (entries && Array.isArray(entries) && entries.length > 0) {
                    travelEntries.push(...entries)
                    console.log('[SYNC] Total travel entries now:', travelEntries.length)
                  }
                }
              }

              if (travelEntries.length > 0) {
                console.log('[SYNC] Saving travel entries to database, count:', travelEntries.length)
                await prisma.travelEntry.createMany({
                  data: travelEntries,
                  skipDuplicates: true,
                })
                console.log('[SYNC] Travel entries saved')
              }
            }
          }
        } else {
          console.log('[SYNC] No messages to process (list check failed)')
        }

        const emailCount = Array.isArray(flightEmails) ? flightEmails.length : 0
        console.log('[SYNC] Email count for account:', emailCount)
        totalCount += emailCount
        aggregateResults.push({ accountId: account.id, email: account.email || '', count: emailCount })

        console.log('[SYNC] Updating account sync status to completed...')
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            lastSync: new Date(),
            syncStatus: 'completed',
            errorMessage: null,
            updatedAt: new Date(),
          },
        })
        console.log('[SYNC] Account sync status updated')
      } catch (accountError) {
        console.error('[SYNC] Error processing account:', account.id)
        console.error('[SYNC] Account error details:', accountError)
        console.error('[SYNC] Account error stack:', accountError instanceof Error ? accountError.stack : 'No stack trace')
        console.error('[SYNC] Account error name:', accountError instanceof Error ? accountError.name : 'Unknown')
        console.error('[SYNC] Account error message:', accountError instanceof Error ? accountError.message : 'Unknown error')

        // Update account status to failed
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            syncStatus: 'failed',
            errorMessage: accountError instanceof Error ? accountError.message : 'Unknown error',
            updatedAt: new Date(),
          },
        })
      }
    }

    console.log('[SYNC] Gmail sync completed successfully, total count:', totalCount)
    return NextResponse.json({ success: true, totalCount, results: aggregateResults })
  } catch (error) {
    console.error('[SYNC] Top-level error syncing Gmail:', error)
    console.error('[SYNC] Error type:', typeof error)
    console.error('[SYNC] Error constructor:', error?.constructor?.name)
    console.error('[SYNC] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('[SYNC] Error message:', error instanceof Error ? error.message : 'Unknown error')

    // Update error status
    const accounts = await prisma.emailAccount.findMany({
      where: {
        userId: userId,
        provider: 'gmail',
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
      { success: false, error: 'Failed to sync Gmail emails' },
      { status: 500 }
    )
  }
}
