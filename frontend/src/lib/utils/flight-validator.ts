/**
 * Flight Data Validation Utilities
 *
 * Provides strict validation functions for flight booking data to eliminate false positives.
 */

import {
  AIRLINE_TRANSACTIONAL_DOMAINS,
  MARKETING_BLACKLIST_PATTERNS,
  BOOKING_SUBJECT_PATTERNS,
  MARKETING_SUBJECT_PATTERNS,
  MARKETING_BODY_PATTERNS,
  BOOKING_REFERENCE_PATTERNS,
  FLIGHT_NUMBER_PATTERNS,
} from '../constants/trusted-senders'

// Valid IATA airport codes (comprehensive list)
const VALID_IATA_CODES = new Set([
  // North America
  'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'LAS', 'SEA', 'PHX',
  'IAH', 'MCO', 'EWR', 'BOS', 'CLT', 'MSP', 'DTW', 'PHL', 'LGA', 'FLL',
  'BWI', 'IAD', 'MDW', 'SAN', 'TPA', 'PDX', 'STL', 'HNL', 'AUS', 'BNA',
  'OAK', 'SJC', 'RDU', 'SMF', 'SNA', 'MCI', 'SLC', 'SJU', 'CMH', 'CVG',
  'YYZ', 'YVR', 'YUL', 'YYC', 'YEG', 'YOW', 'YHZ',
  'MEX', 'GDL', 'MTY', 'CUN',

  // Europe
  'LHR', 'LGW', 'STN', 'MAN', 'EDI', 'BHX', 'GLA',
  'CDG', 'ORY', 'NCE', 'LYS', 'MRS', 'TLS',
  'FRA', 'MUC', 'TXL', 'DUS', 'HAM', 'CGN', 'STR',
  'AMS', 'BCN', 'MAD', 'FCO', 'MXP', 'VCE', 'NAP',
  'ZRH', 'GVA', 'VIE', 'BRU', 'CPH', 'ARN', 'OSL',
  'HEL', 'DUB', 'LIS', 'OPO', 'ATH', 'PRG', 'WAW', 'BUD',

  // Asia-Pacific
  'NRT', 'HND', 'KIX', 'NGO', 'FUK', 'CTS',
  'PEK', 'PVG', 'CAN', 'SZX', 'HKG', 'CTU', 'XIY', 'CKG',
  'ICN', 'GMP', 'SIN', 'BKK', 'DMK', 'KUL',
  'SYD', 'MEL', 'BNE', 'PER', 'ADL', 'AKL', 'CHC', 'WLG',
  'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU',
  'DXB', 'AUH', 'DOH', 'BAH', 'KWI',
  'MNL', 'CGK', 'HAN', 'SGN',

  // South America & Africa
  'GRU', 'GIG', 'BSB', 'EZE', 'SCL', 'LIM', 'BOG', 'UIO', 'CCS',
  'JNB', 'CPT', 'CAI', 'LOS', 'NBO', 'ADD', 'ACC',
])

// Valid airline IATA codes
const VALID_AIRLINE_CODES = new Set([
  'AA', 'UA', 'DL', 'WN', 'B6', 'AS', 'NK', 'F9', 'G4', 'HA', 'SY',
  'BA', 'LH', 'AF', 'KL', 'IB', 'AZ', 'LX', 'OS', 'SN', 'TP', 'EI', 'SK', 'AY', 'TK', 'LO',
  'EK', 'EY', 'QR', 'SV', 'GF', 'KU', 'WY',
  'AC', 'WS',
  'CX', 'SQ', 'NH', 'JL', 'KE', 'OZ', 'CI', 'MU', 'CZ', 'CA', 'HU',
  'QF', 'VA', 'NZ',
  'TG', 'MH', 'GA', 'PR', 'VN',
  'LA', 'AM', 'AV', 'CM', 'G3', 'AD',
  'AI', '6E', 'SG', 'UK',
])

// Common English words that could be mistaken for codes
const COMMON_WORDS_BLACKLIST = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
  'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW',
  'BOO', 'CHE', 'ARR', 'INCREDIBLE', 'BOOK', 'YOUR', 'CHECK',
  'FROM', 'INTO', 'THAN', 'THAT', 'THIS', 'WITH',
])

/**
 * Validates IATA airport code
 */
export function isValidIATACode(code: string | undefined): boolean {
  if (!code || typeof code !== 'string') return false

  const normalized = code.toUpperCase().trim()

  // Must be exactly 3 letters
  if (!/^[A-Z]{3}$/.test(normalized)) return false

  // Must not be a common word
  if (COMMON_WORDS_BLACKLIST.has(normalized)) return false

  // Must be in valid IATA list
  return VALID_IATA_CODES.has(normalized)
}

/**
 * Validates booking reference/PNR format
 */
export function isValidBookingReference(ref: string | undefined): boolean {
  if (!ref || typeof ref !== 'string') return false

  const normalized = ref.toUpperCase().trim()

  // Must be 5-7 alphanumeric characters
  if (!/^[A-Z0-9]{5,7}$/.test(normalized)) return false

  // Must not be a common word
  if (COMMON_WORDS_BLACKLIST.has(normalized)) return false

  // Must contain at least one number (to avoid pure words)
  if (!/\d/.test(normalized)) return false

  // Must contain at least one letter (to avoid pure numbers)
  if (!/[A-Z]/.test(normalized)) return false

  return true
}

/**
 * Validates flight number format
 */
export function isValidFlightNumber(flightNum: string | undefined): boolean {
  if (!flightNum || typeof flightNum !== 'string') return false

  const normalized = flightNum.toUpperCase().trim()

  // Must match pattern: 2-letter airline code + 1-4 digit flight number
  const match = normalized.match(/^([A-Z]{2})\s*(\d{1,4})$/)
  if (!match) return false

  const [, airlineCode] = match

  // Airline code must be valid
  return VALID_AIRLINE_CODES.has(airlineCode)
}

/**
 * Validates airline name or code
 */
export function isValidAirline(airline: string | undefined): boolean {
  if (!airline || typeof airline !== 'string') return false

  const normalized = airline.toUpperCase().trim()

  // Check if it's a valid 2-letter code
  if (/^[A-Z]{2}$/.test(normalized)) {
    return VALID_AIRLINE_CODES.has(normalized)
  }

  // Check against known airline names (basic check)
  const knownAirlines = [
    'AMERICAN', 'DELTA', 'UNITED', 'SOUTHWEST', 'JETBLUE', 'ALASKA',
    'BRITISH AIRWAYS', 'LUFTHANSA', 'AIR FRANCE', 'KLM', 'EMIRATES',
    'QATAR', 'SINGAPORE AIRLINES', 'CATHAY PACIFIC',
  ]

  return knownAirlines.some(name => normalized.includes(name))
}

/**
 * Validates date is in reasonable range
 */
export function isValidFlightDate(dateStr: string | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return false

    const year = date.getFullYear()
    const now = new Date()
    const fiveYearsFromNow = new Date()
    fiveYearsFromNow.setFullYear(now.getFullYear() + 5)

    // Date must be between 1 year ago and 5 years in the future
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(now.getFullYear() - 1)

    return date >= oneYearAgo && date <= fiveYearsFromNow
  } catch {
    return false
  }
}

/**
 * Validates passenger name format
 */
export function isValidPassengerName(name: string | undefined): boolean {
  if (!name || typeof name !== 'string') return false

  const trimmed = name.trim()

  // Must have at least 2 parts (first and last name)
  const parts = trimmed.split(/\s+/)
  if (parts.length < 2) return false

  // Each part must be at least 2 characters
  if (parts.some(part => part.length < 2)) return false

  // Must only contain letters, spaces, hyphens, and apostrophes
  if (!/^[A-Za-z\s'-]+$/.test(trimmed)) return false

  return true
}

/**
 * Checks if sender is from a trusted domain
 */
export function isTrustedSender(email: string): boolean {
  if (!email) return false

  const lowerEmail = email.toLowerCase()

  // Extract domain from email
  const domainMatch = lowerEmail.match(/@([a-z0-9.-]+)/)
  if (!domainMatch) return false

  const domain = domainMatch[1]

  // Check against trusted domains (convert Set to Array for iteration)
  const trustedDomains = Array.from(AIRLINE_TRANSACTIONAL_DOMAINS)
  for (const trustedDomain of trustedDomains) {
    if (domain === trustedDomain || domain.endsWith(`.${trustedDomain}`)) {
      return true
    }
  }

  return false
}

/**
 * Checks if sender matches marketing patterns
 */
export function isMarketingSender(email: string): boolean {
  if (!email) return false

  const lowerEmail = email.toLowerCase()

  return MARKETING_BLACKLIST_PATTERNS.some(pattern =>
    lowerEmail.includes(pattern.toLowerCase())
  )
}

/**
 * Checks if subject line indicates a booking confirmation
 */
export function hasBookingSubject(subject: string): boolean {
  if (!subject) return false

  return BOOKING_SUBJECT_PATTERNS.some(pattern => pattern.test(subject))
}

/**
 * Checks if subject line indicates marketing content
 */
export function hasMarketingSubject(subject: string): boolean {
  if (!subject) return false

  return MARKETING_SUBJECT_PATTERNS.some(pattern => pattern.test(subject))
}

/**
 * Checks if email body contains marketing indicators
 */
export function hasMarketingContent(body: string): boolean {
  if (!body) return false

  return MARKETING_BODY_PATTERNS.some(pattern => pattern.test(body))
}

/**
 * Extracts booking reference from text
 */
export function extractBookingReference(text: string): string | null {
  if (!text) return null

  for (const pattern of BOOKING_REFERENCE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const ref = match[1] || match[0]
      if (isValidBookingReference(ref)) {
        return ref.toUpperCase()
      }
    }
  }

  return null
}

/**
 * Extracts flight number from text
 */
export function extractFlightNumber(text: string): string | null {
  if (!text) return null

  for (const pattern of FLIGHT_NUMBER_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const flightNum = match[0].replace(/\s+/g, ' ').trim()
      if (isValidFlightNumber(flightNum)) {
        return flightNum.toUpperCase()
      }
    }
  }

  return null
}

/**
 * Checks if email body has structured flight details (not just paragraph text)
 */
export function hasStructuredFlightDetails(body: string): boolean {
  if (!body) return false

  // Look for table/list structures or labeled data
  const structureIndicators = [
    /<table/i, // HTML table
    /\|\s*\w+\s*\|/i, // Markdown table
    /flight\s*:\s*[A-Z]{2}\s*\d+/i, // Labeled flight number
    /departure\s*:\s*[A-Z]{3}/i, // Labeled departure
    /confirmation\s*#?\s*:\s*[A-Z0-9]{6}/i, // Labeled confirmation
    /\n\s*[-•*]\s+/gm, // Bullet list
  ]

  return structureIndicators.some(pattern => pattern.test(body))
}

/**
 * Counts booking-related keywords in text
 */
export function countBookingKeywords(text: string): number {
  if (!text) return 0

  const keywords = [
    /\bconfirmation\b/i,
    /\bbooking\s+reference\b/i,
    /\bpnr\b/i,
    /\bitinerary\b/i,
    /\be-?ticket\b/i,
    /\bboarding\s+pass\b/i,
    /\bflight\s+number\b/i,
    /\bdeparture\s+time\b/i,
    /\barrival\s+time\b/i,
    /\bpassenger\s+name\b/i,
  ]

  return keywords.filter(pattern => pattern.test(text)).length
}
