import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import { google } from 'googleapis'
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
  console.log('[extractFlightInfo] Starting flight info extraction...')
  console.log('[extractFlightInfo] Email content length:', emailContent?.length || 0)
  console.log('[extractFlightInfo] Subject:', subject)
  console.log('[extractFlightInfo] Sender:', sender)

  // Check if from excluded domain
  if (isExcludedDomain(sender)) {
    console.log('[extractFlightInfo] Excluded domain detected, skipping:', sender)
    return { confidence: 0 }
  }

  try {
    const combinedText = `${subject} ${emailContent}`
    console.log('[extractFlightInfo] Combined text length:', combinedText.length)

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
    console.log('[extractFlightInfo] Processing patterns...')

    Object.entries(flightPatterns).forEach(([key, pattern]) => {
      console.log('[extractFlightInfo] Matching pattern for:', key)
      const match = combinedText.match(pattern)
      console.log('[extractFlightInfo] Match result for', key, ':', match ? 'found' : 'not found')

      if (match) {
        console.log('[extractFlightInfo] Match array for', key, ':', match)

        if (!Array.isArray(match)) {
          console.error('[extractFlightInfo] CRITICAL: match is not an array for key:', key)
          return
        }

        // Get first non-undefined capture group
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

    // Calculate confidence score
    const confidence = calculateConfidence(extracted, combinedText, sender)
    extracted.confidence = confidence

    console.log('[extractFlightInfo] Extraction complete, extracted data:', extracted)
    console.log('[extractFlightInfo] Confidence score:', confidence)

    return extracted
  } catch (error) {
    console.error('[extractFlightInfo] Error during extraction:', error)
    console.error('[extractFlightInfo] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return { confidence: 0 }
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

  // Only create travel entries if confidence > 0.6
  const confidence = flightData.confidence || 0
  if (confidence <= 0.6) {
    console.log(`[createTravelEntries] Skipping travel entry creation due to low confidence: ${confidence}`)
    return entries
  }

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
    console.log('[SYNC] Starting Gmail sync for user:', userId)

    const body = await request.json().catch(() => ({}))
    const {
      accountId,
      pageToken,
      syncFromDate,
      maxResults = 200, // Default to 200, max cap at 500 for safety
      syncAll = false, // Sync all pages automatically
    } = body
    console.log('[SYNC] Request body:', { accountId, pageToken, syncFromDate, maxResults, syncAll })

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

    const aggregateResults: Array<{
      accountId: string
      email: string
      count: number
      stats?: {
        fetched: number
        alreadyProcessed: number
        newlyAdded: number
        failed: number
      }
    }> = []
    let totalCount = 0
    let nextPageToken: string | null | undefined = null
    let allPagesStats = {
      totalFetched: 0,
      totalAlreadyProcessed: 0,
      totalNewlyAdded: 0,
      totalFailed: 0,
      pagesProcessed: 0,
    }

    // Validate and cap maxResults
    const cappedMaxResults = Math.min(Math.max(1, maxResults), 500)

    // Safety limit for syncAll to prevent infinite loops
    const MAX_PAGES = 10

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

        // Build search query with optional date filter
        let searchQuery = 'subject:(confirmation OR booking OR ticket OR flight) (airline OR travel)'
        if (syncFromDate) {
          try {
            const fromDate = new Date(syncFromDate)
            if (!isNaN(fromDate.getTime())) {
              // Gmail date format: yyyy/mm/dd
              const year = fromDate.getFullYear()
              const month = String(fromDate.getMonth() + 1).padStart(2, '0')
              const day = String(fromDate.getDate()).padStart(2, '0')
              searchQuery += ` after:${year}/${month}/${day}`
            }
          } catch (error) {
            console.warn('[SYNC] Invalid syncFromDate, ignoring:', syncFromDate)
          }
        }

        console.log('[SYNC] Fetching messages with query:', searchQuery)
        console.log('[SYNC] Max results:', cappedMaxResults, 'Page token:', pageToken || 'none')

        const { data: list } = await gmail.users.messages.list({
          userId: 'me',
          q: searchQuery,
          maxResults: cappedMaxResults,
          ...(pageToken && { pageToken })
        })

        // Store next page token for pagination
        nextPageToken = list.nextPageToken

        console.log('[SYNC] Gmail API response - list:', list ? 'exists' : 'null')
        console.log('[SYNC] Gmail API response - list.messages:', list?.messages ? `array with ${list.messages.length} items` : 'null/undefined')
        console.log('[SYNC] Gmail API response - list.messages type:', typeof list?.messages)
        console.log('[SYNC] Gmail API response - list.messages isArray:', Array.isArray(list?.messages))

        const flightEmails: any[] = []
        let fetchedCount = 0
        let alreadyProcessedCount = 0
        let newlyAddedCount = 0
        let failedCount = 0

        if (list && list.messages && Array.isArray(list.messages) && list.messages.length > 0) {
          console.log('[SYNC] Processing', list.messages.length, 'messages...')
          fetchedCount = list.messages.length

          // Check which message IDs already exist in the database for progress tracking
          const messageIds = list.messages.map(m => m.id).filter(Boolean) as string[]
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
          console.log('[SYNC] Already processed:', existingMessageIds.size, 'out of', messageIds.length)

          for (const m of list.messages) {
            if (!m.id) {
              console.log('[SYNC] Skipping message with no ID')
              failedCount++
              continue
            }

            // Skip if already processed (for progress tracking)
            if (existingMessageIds.has(m.id)) {
              console.log('[SYNC] Message already processed, skipping:', m.id)
              alreadyProcessedCount++
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

              console.log('[SYNC] Pre-filtering email...')
              // Pre-filter: Quick rejection for marketing emails
              if (!shouldProcessEmail(subject, from)) {
                console.log('[SYNC] Email rejected by pre-filter (marketing/non-booking)')
                failedCount++
                continue
              }

              console.log('[SYNC] Extracting and validating flight info...')
              const validationResult = extractAndValidateFlightData(subject, emailContent, from)
              console.log('[SYNC] Validation result:', {
                isValid: validationResult.isValid,
                confidence: validationResult.confidence,
                reasons: validationResult.reasons,
              })

              // Only save emails that pass validation (confidence >= 0.75)
              if (validationResult.isValid && validationResult.confidence >= 0.75) {
                flightEmails.push({
                  userId: userId,
                  emailAccountId: account.id,
                  messageId: m.id,
                  subject,
                  sender: from,
                  recipient: account.email || '',
                  bodyText: emailContent,
                  flightData: validationResult.extractedData,
                  parsedData: validationResult.extractedData,
                  confidenceScore: validationResult.confidence,
                  processingStatus: 'completed',
                  isProcessed: true,
                  dateReceived: date ? new Date(date) : new Date(),
                })
                console.log('[SYNC] Flight email added to array (confidence:', validationResult.confidence, '), total count:', flightEmails.length)
              } else {
                console.log('[SYNC] Flight email rejected:', validationResult.reasons.join('; '))
              }
            } catch (messageError) {
              console.error('[SYNC] Error processing message ID:', m.id)
              console.error('[SYNC] Message error details:', messageError)
              console.error('[SYNC] Message error stack:', messageError instanceof Error ? messageError.stack : 'No stack trace')
              failedCount++
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
            newlyAddedCount = insertResult.count

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
        totalCount += newlyAddedCount
        aggregateResults.push({
          accountId: account.id,
          email: account.email || '',
          count: emailCount,
          stats: {
            fetched: fetchedCount,
            alreadyProcessed: alreadyProcessedCount,
            newlyAdded: newlyAddedCount,
            failed: failedCount
          }
        })

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

    // If syncAll is enabled and there's a nextPageToken, continue fetching recursively
    if (syncAll && nextPageToken && allPagesStats.pagesProcessed < MAX_PAGES) {
      console.log('[SYNC] SyncAll enabled, fetching next page...')
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
            pageToken: nextPageToken,
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

          // Update nextPageToken for final response
          nextPageToken = nextPageData.nextPageToken
        }
      } catch (recursiveError) {
        console.error('[SYNC] Error during recursive syncAll:', recursiveError)
        // Don't fail the entire sync, just stop pagination
      }
    }

    // Calculate aggregate stats across all accounts
    const aggregateStats = aggregateResults.reduce(
      (acc, result) => ({
        fetched: acc.fetched + (result.stats?.fetched || 0),
        alreadyProcessed: acc.alreadyProcessed + (result.stats?.alreadyProcessed || 0),
        newlyAdded: acc.newlyAdded + (result.stats?.newlyAdded || 0),
        failed: acc.failed + (result.stats?.failed || 0)
      }),
      { fetched: 0, alreadyProcessed: 0, newlyAdded: 0, failed: 0 }
    )

    // If syncAll was used, include the accumulated stats
    if (syncAll && allPagesStats.pagesProcessed > 0) {
      aggregateStats.fetched += allPagesStats.totalFetched
      aggregateStats.alreadyProcessed += allPagesStats.totalAlreadyProcessed
      aggregateStats.newlyAdded += allPagesStats.totalNewlyAdded
      aggregateStats.failed += allPagesStats.totalFailed
    }

    return NextResponse.json({
      success: true,
      totalCount: syncAll ? aggregateStats.newlyAdded : totalCount,
      stats: aggregateStats,
      results: aggregateResults,
      nextPageToken: nextPageToken || undefined,
      hasMore: !!nextPageToken,
      ...(syncAll && { pagesProcessed: allPagesStats.pagesProcessed + 1 }),
    })
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
