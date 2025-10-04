import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import crypto from 'crypto'
import { shouldProcessEmail, extractAndValidateFlightData } from '../../../../src/lib/email-validator'

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

// Newsletter/marketing domain exclusion list
const EXCLUDED_DOMAINS = [
  'thepointsguy.com',
  't.delta.com',
  'marketing.united.com',
  'newsletter',
  'mailchimp',
  'constantcontact',
  'sendgrid.net',
  'e.delta.com',
  'e.united.com',
  'info@',
  'news@',
  'promo@'
]

// Valid airport codes (major airports)
const VALID_AIRPORTS = new Set([
  // North America
  'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'LAS', 'SEA', 'PHX', 'IAH', 'MCO', 'EWR', 'BOS', 'CLT', 'MSP', 'DTW', 'PHL', 'LGA', 'FLL', 'BWI', 'IAD', 'MDW', 'SAN', 'TPA', 'PDX', 'STL', 'HNL', 'AUS', 'BNA', 'OAK', 'SJC', 'RDU', 'SMF', 'SNA', 'MCI', 'SLC', 'SJU', 'CMH', 'CVG',
  'YYZ', 'YVR', 'YUL', 'YYC', 'YEG', 'YOW', 'YHZ',
  'MEX', 'GDL', 'MTY', 'CUN',
  // Europe
  'LHR', 'LGW', 'STN', 'MAN', 'EDI', 'BHX', 'GLA',
  'CDG', 'ORY', 'NCE', 'LYS', 'MRS', 'TLS',
  'FRA', 'MUC', 'TXL', 'DUS', 'HAM', 'CGN', 'STR',
  'AMS', 'BCN', 'MAD', 'FCO', 'MXP', 'VCE', 'NAP', 'ZRH', 'GVA', 'VIE', 'BRU', 'CPH', 'ARN', 'OSL', 'HEL', 'DUB', 'LIS', 'OPO', 'ATH', 'PRG', 'WAW', 'BUD',
  // Asia-Pacific
  'NRT', 'HND', 'KIX', 'NGO', 'FUK', 'CTS',
  'PEK', 'PVG', 'CAN', 'SZX', 'HKG', 'CTU', 'XIY', 'CKG',
  'ICN', 'GMP',
  'SIN',
  'BKK', 'DMK',
  'KUL',
  'SYD', 'MEL', 'BNE', 'PER', 'ADL', 'AKL', 'CHC', 'WLG',
  'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU',
  'DXB', 'AUH', 'DOH', 'BAH', 'KWI',
  'MNL', 'CGK', 'HAN', 'SGN',
  // South America
  'GRU', 'GIG', 'BSB', 'EZE', 'SCL', 'LIM', 'BOG', 'UIO', 'CCS',
  // Africa
  'JNB', 'CPT', 'CAI', 'LOS', 'NBO', 'ADD', 'ACC'
])

// Valid airlines (names and codes)
const VALID_AIRLINES = new Set([
  // Full names
  'united', 'delta', 'american', 'southwest', 'jetblue', 'alaska', 'spirit', 'frontier', 'allegiant', 'hawaiian', 'sun country',
  'british airways', 'lufthansa', 'air france', 'klm', 'iberia', 'alitalia', 'swiss', 'austrian', 'brussels airlines', 'tap portugal', 'aer lingus', 'scandinavian', 'finnair', 'turkish airlines', 'lot polish',
  'emirates', 'etihad', 'qatar', 'saudi arabian', 'gulf air', 'kuwait airways', 'oman air',
  'air canada', 'westjet',
  'cathay pacific', 'singapore airlines', 'ana', 'jal', 'korean air', 'asiana', 'china airlines', 'china eastern', 'china southern', 'air china', 'hainan airlines',
  'qantas', 'virgin australia', 'air new zealand',
  'thai airways', 'malaysia airlines', 'garuda indonesia', 'philippine airlines', 'vietnam airlines',
  'latam', 'aeromexico', 'avianca', 'copa airlines', 'gol', 'azul',
  'air india', 'indigo', 'spicejet', 'vistara',
  // Codes
  'aa', 'ua', 'dl', 'wn', 'b6', 'as', 'nk', 'f9', 'g4', 'ha', 'sy',
  'ba', 'lh', 'af', 'kl', 'ib', 'az', 'lx', 'os', 'sn', 'tp', 'ei', 'sk', 'ay', 'tk', 'lo',
  'ek', 'ey', 'qr', 'sv', 'gf', 'ku', 'wy',
  'ac', 'ws',
  'cx', 'sq', 'nh', 'jl', 'ke', 'oz', 'ci', 'mu', 'cz', 'ca', 'hu',
  'qf', 'va', 'nz',
  'tg', 'mh', 'ga', 'pr', 'vn',
  'la', 'am', 'av', 'cm', 'g3', 'ad',
  'ai', '6e', 'sg', 'uk'
])

// Common English words that might be mistaken for codes
const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'may', 'any', 'add', 'age', 'ago', 'air', 'big', 'box', 'car', 'cut', 'dog', 'eat', 'end', 'far', 'few', 'got', 'gun', 'hat', 'hot', 'job', 'key', 'law', 'lay', 'leg', 'lie', 'lot', 'low', 'map', 'men', 'Mrs', 'nor', 'off', 'oil', 'own', 'pay', 'per', 'ran', 'red', 'run', 'sat', 'sea', 'set', 'sit', 'son', 'sun', 'ten', 'top', 'try', 'war', 'win', 'yes', 'yet',
  'boo', 'you', 'che', 'arr', 'incredible', 'book', 'your', 'check', 'arrival', 'departure', 'from', 'into', 'than', 'that', 'this', 'with'
])

// Validate airport code
function isValidAirport(code: string | undefined): boolean {
  if (!code || typeof code !== 'string') return false
  const upper = code.toUpperCase().trim()
  // Must be exactly 3 letters and in valid set
  if (upper.length !== 3 || !/^[A-Z]{3}$/.test(upper)) return false
  if (COMMON_WORDS.has(upper.toLowerCase())) return false
  return VALID_AIRPORTS.has(upper)
}

// Validate airline
function isValidAirline(airline: string | undefined): boolean {
  if (!airline || typeof airline !== 'string') return false
  const lower = airline.toLowerCase().trim()
  return VALID_AIRLINES.has(lower)
}

// Validate confirmation number (6+ alphanumeric, not a common word)
function isValidConfirmation(confirmation: string | undefined): boolean {
  if (!confirmation || typeof confirmation !== 'string') return false
  const trimmed = confirmation.trim()
  // Must be 6+ characters, alphanumeric only
  if (trimmed.length < 6 || !/^[A-Z0-9]+$/i.test(trimmed)) return false
  // Must not be a common word
  if (COMMON_WORDS.has(trimmed.toLowerCase())) return false
  // Should have at least one number (to avoid pure words)
  if (!/\d/.test(trimmed)) return false
  return true
}

// Validate flight number (airline code + 1-4 digits)
function isValidFlightNumber(flightNumber: string | undefined, airline?: string): boolean {
  if (!flightNumber || typeof flightNumber !== 'string') return false
  const trimmed = flightNumber.trim()
  // Must match airline code + digits pattern
  const match = trimmed.match(/^([A-Z]{2})\s*(\d{1,4})$/i)
  if (!match) return false
  const [, airlineCode, digits] = match
  // Check if airline code is valid (if we have airline context, verify match)
  if (airline && !airline.toLowerCase().includes(airlineCode.toLowerCase())) return false
  return VALID_AIRLINES.has(airlineCode.toLowerCase())
}

// Check if email has booking indicators
function hasBookingKeywords(text: string): boolean {
  const lower = text.toLowerCase()
  let count = 0

  if (/(confirmation|booking reference|pnr|record locator)/i.test(text)) count++
  if (/(itinerary|e-ticket|boarding pass|ticket number)/i.test(text)) count++
  if (/(flight details|travel details|trip details)/i.test(text)) count++
  if (/(departure|depart|departs|departing)/i.test(text) && /(arrival|arrive|arrives|arriving)/i.test(text)) count++

  // Need at least 2 indicators
  return count >= 2
}

// Check if email is from excluded domain
function isExcludedDomain(sender: string): boolean {
  if (!sender) return false
  const lower = sender.toLowerCase()
  return EXCLUDED_DOMAINS.some(domain => lower.includes(domain))
}

// Calculate confidence score based on extracted data
function calculateConfidence(data: any, emailContent: string, sender: string): number {
  let score = 0

  // Check for excluded domains (instant disqualification)
  if (isExcludedDomain(sender)) return 0

  // Valid departure airport (+25%)
  if (isValidAirport(data.departure)) score += 0.25
  else if (data.departure) score -= 0.1 // Penalty for invalid airport

  // Valid arrival airport (+25%)
  if (isValidAirport(data.arrival)) score += 0.25
  else if (data.arrival) score -= 0.1 // Penalty for invalid airport

  // Valid airline (+20%)
  if (isValidAirline(data.airline)) score += 0.2

  // Valid confirmation number (+20%)
  if (isValidConfirmation(data.confirmation)) score += 0.2

  // Valid flight number (+10%)
  if (isValidFlightNumber(data.flightNumber, data.airline)) score += 0.1

  // Booking keywords present (+10%)
  if (hasBookingKeywords(emailContent)) score += 0.1

  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(score, 1.0))
}

// Enhanced flight extraction with validation
async function extractFlightInfo(emailContent: string, subject: string, sender: string = '') {
  // Check if from excluded domain
  if (isExcludedDomain(sender)) {
    console.log('[Office365 extractFlightInfo] Excluded domain detected, skipping:', sender)
    return { confidence: 0 }
  }

  const combinedText = `${subject} ${emailContent}`

  // Improved patterns with word boundaries
  const flightPatterns = {
    airline: /(?:airline|carrier)[:\s]+([a-z\s]+)|^([a-z\s]{2,20})\s+flight|(\b(?:american|delta|united|southwest|jetblue|alaska|spirit|frontier)\b)/i,
    flightNumber: /flight[:\s#]*([A-Z]{2}\s*\d{1,4})\b/i,
    confirmation: /(?:confirmation|booking|pnr|record locator)[:\s#]*([A-Z0-9]{6,})\b/i,
    departure: /(?:depart(?:ing|ure)?|from)[:\s]*\b([A-Z]{3})\b/i,
    arrival: /(?:arriv(?:al|ing)?|to|destination)[:\s]*\b([A-Z]{3})\b/i,
    date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})|(\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4})|(\d{4}-\d{2}-\d{2})/i
  }

  const extracted: any = {}
  Object.entries(flightPatterns).forEach(([key, pattern]) => {
    const match = combinedText.match(pattern)
    if (match) {
      // Get first non-undefined capture group
      extracted[key] = match.find((m, i) => i > 0 && m !== undefined)?.trim()
    }
  })

  // Calculate confidence score
  const confidence = calculateConfidence(extracted, combinedText, sender)
  extracted.confidence = confidence

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

// Robust date normalization function
function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  // Normalize whitespace
  dateStr = dateStr.trim().replace(/\s+/g, ' ')

  // Fix common OCR/parsing errors
  const ocrCorrections: Record<string, string> = {
    'ET02': '02',
    'ET': 'Oct',
    '0CT': 'Oct',
    'OCT': 'Oct',
    'uly': 'July',  // Fix for "uly 2, 2025" error
    'anuary': 'January',
    'ebruary': 'February',
    'arch': 'March',
    'pril': 'April',
    'ay': 'May',
    'une': 'June',
    'ugust': 'August',
    'eptember': 'September',
    'ctober': 'October',
    'ovember': 'November',
    'ecember': 'December'
  }

  // Apply corrections
  for (const [error, correction] of Object.entries(ocrCorrections)) {
    const regex = new RegExp(`\\b${error}\\b`, 'gi')
    dateStr = dateStr.replace(regex, correction)
  }

  // Try various date formats
  let parsedDate: Date | null = null

  // Pattern 1: MM/DD/YY or MM-DD-YY (handle two-digit year)
  const twoDigitYearPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/
  const twoDigitMatch = dateStr.match(twoDigitYearPattern)
  if (twoDigitMatch) {
    const [_, month, day, year] = twoDigitMatch
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`
    parsedDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  }

  // Pattern 2: MM/DD/YYYY or MM-DD-YYYY
  const fullYearPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  const fullYearMatch = dateStr.match(fullYearPattern)
  if (!parsedDate && fullYearMatch) {
    const [_, month, day, year] = fullYearMatch
    parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  }

  // Pattern 3: Month DD, YYYY or Month DD YYYY
  const monthNamePattern = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/
  const monthNameMatch = dateStr.match(monthNamePattern)
  if (!parsedDate && monthNameMatch) {
    parsedDate = new Date(dateStr)
  }

  // Pattern 4: DD Month YYYY
  const dayMonthPattern = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/
  const dayMonthMatch = dateStr.match(dayMonthPattern)
  if (!parsedDate && dayMonthMatch) {
    const [_, day, month, year] = dayMonthMatch
    parsedDate = new Date(`${month} ${day}, ${year}`)
  }

  // Pattern 5: YYYY-MM-DD (ISO format)
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/
  if (!parsedDate && isoPattern.test(dateStr)) {
    parsedDate = new Date(dateStr)
  }

  // Last resort: try native Date parsing
  if (!parsedDate) {
    parsedDate = new Date(dateStr)
  }

  // Validate the date
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    console.log(`[normalizeDate] Failed to parse date: "${dateStr}"`)
    return null
  }

  // Ensure reasonable date range (1950-2050)
  const year = parsedDate.getFullYear()
  if (year < 1950 || year > 2050) {
    console.log(`[normalizeDate] Date out of reasonable range: ${year}`)
    return null
  }

  // Return ISO date string (YYYY-MM-DD)
  return parsedDate.toISOString().split('T')[0]
}

// Create travel entries from extracted flight data (Prisma format)
async function createTravelEntries(userId: string, flightEmailId: string, flightData: any, emailDate: string) {
  const entries: any[] = []

  // Only create travel entries if confidence > 0.6
  const confidence = flightData.confidence || 0
  if (confidence <= 0.6) {
    console.log(`[Office365 createTravelEntries] Skipping travel entry creation due to low confidence: ${confidence}`)
    return entries
  }

  if (flightData.departure && flightData.arrival && flightData.date) {
    // Parse date using normalizeDate function
    const normalizedDate = normalizeDate(flightData.date)
    let entryDateStr: string

    if (normalizedDate) {
      entryDateStr = normalizedDate
    } else {
      // Fallback to email date if normalization fails
      console.log(`[Office365 createTravelEntries] Failed to normalize date "${flightData.date}", using email date`)
      const emailDateObj = new Date(emailDate)
      if (!isNaN(emailDateObj.getTime())) {
        entryDateStr = emailDateObj.toISOString().split('T')[0]
      } else {
        console.log(`[Office365 createTravelEntries] Invalid email date, skipping travel entry`)
        return entries
      }
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
        confidenceScore: confidence,
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
        confidenceScore: confidence,
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
      maxResults = 200, // Default to 200, max cap at 500 for safety
      syncAll = false, // Sync all pages automatically
    } = body

    // Validate and cap maxResults
    const cappedMaxResults = Math.min(Math.max(1, maxResults), 500)

    // Safety limit for syncAll to prevent infinite loops
    const MAX_PAGES = 10
    let allPagesStats = {
      totalFetched: 0,
      totalAlreadyProcessed: 0,
      totalNewlyAdded: 0,
      totalFailed: 0,
      pagesProcessed: 0,
    }

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
    let nextSkipToken: string | null = json['@odata.nextLink']
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

        console.log('[Office365 Sync] Pre-filtering email...')
        // Pre-filter: Quick rejection for marketing emails
        if (!shouldProcessEmail(subject, from)) {
          console.log('[Office365 Sync] Email rejected by pre-filter (marketing/non-booking)')
          alreadyProcessedCount++ // Count as skipped
          continue
        }

        console.log('[Office365 Sync] Extracting and validating flight info...')
        const validationResult = extractAndValidateFlightData(subject, content, from)
        console.log('[Office365 Sync] Validation result:', {
          isValid: validationResult.isValid,
          confidence: validationResult.confidence,
          reasons: validationResult.reasons,
        })

        // Only save emails that pass validation (confidence >= 0.75)
        if (validationResult.isValid && validationResult.confidence >= 0.75) {
          const flightData = {
            userId: userId,
            emailAccountId: account.id,
            messageId: item.id,
            subject,
            sender: from,
            recipient: account.email || '',
            bodyText: content,
            bodyHtml: content,
            flightData: validationResult.extractedData,
            parsedData: validationResult.extractedData,
            confidenceScore: validationResult.confidence,
            processingStatus: 'completed',
            isProcessed: true,
            dateReceived: date ? new Date(date) : new Date(),
          }

          flightEmails.push(flightData)
          console.log('[Office365 Sync] Flight email added (confidence:', validationResult.confidence, ')')
        } else {
          console.log('[Office365 Sync] Flight email rejected:', validationResult.reasons.join('; '))
        }
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

    // If syncAll is enabled and there's a nextSkipToken, continue fetching recursively
    if (syncAll && nextSkipToken && allPagesStats.pagesProcessed < MAX_PAGES) {
      console.log('[Office365 Sync] SyncAll enabled, fetching next page...')
      allPagesStats.pagesProcessed++

      // Make recursive call to fetch next page
      try {
        const nextPageResponse = await fetch(request.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(request.headers),
          },
          body: JSON.stringify({
            accountId,
            skipToken: nextSkipToken,
            syncFromDate,
            maxResults,
            syncAll: true, // Keep syncAll enabled
          }),
        })

        if (nextPageResponse.ok) {
          const nextPageData = await nextPageResponse.json()

          // Accumulate stats
          if (nextPageData.stats) {
            allPagesStats.totalFetched += nextPageData.stats.fetched || 0
            allPagesStats.totalAlreadyProcessed += nextPageData.stats.alreadyProcessed || 0
            allPagesStats.totalNewlyAdded += nextPageData.stats.newlyAdded || 0
            allPagesStats.totalFailed += nextPageData.stats.failed || 0
          }

          // Update nextSkipToken for final response
          nextSkipToken = nextPageData.nextPageToken
        }
      } catch (recursiveError) {
        console.error('[Office365 Sync] Error during recursive syncAll:', recursiveError)
        // Don't fail the entire sync, just stop pagination
      }
    }

    // Calculate final stats
    const finalStats = {
      fetched: fetchedCount + allPagesStats.totalFetched,
      alreadyProcessed: alreadyProcessedCount + allPagesStats.totalAlreadyProcessed,
      newlyAdded: newlyAddedCount + allPagesStats.totalNewlyAdded,
      failed: failedCount + allPagesStats.totalFailed,
    }

    return NextResponse.json({
      success: true,
      totalCount: syncAll ? finalStats.newlyAdded : newlyAddedCount,
      stats: finalStats,
      results: [{
        accountId: account.id,
        email: account.email || '',
        count: flightEmails.length,
        stats: finalStats,
      }],
      nextPageToken: nextSkipToken || undefined,
      hasMore: !!nextSkipToken,
      ...(syncAll && { pagesProcessed: allPagesStats.pagesProcessed + 1 }),
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
