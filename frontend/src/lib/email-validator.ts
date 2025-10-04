/**
 * Email Validation Module
 *
 * Comprehensive email filtering to eliminate false positives in flight booking detection.
 * Only emails that pass ALL validation criteria are accepted as legitimate flight bookings.
 */

import {
  isValidIATACode,
  isValidBookingReference,
  isValidFlightNumber,
  isValidAirline,
  isValidFlightDate,
  isValidPassengerName,
  isTrustedSender,
  isMarketingSender,
  hasBookingSubject,
  hasMarketingSubject,
  hasMarketingContent,
  hasStructuredFlightDetails,
  countBookingKeywords,
  extractBookingReference,
  extractFlightNumber,
} from './utils/flight-validator'

/**
 * Extracted flight data structure
 * Compatible with Prisma's JSON type (index signature required)
 */
export interface ExtractedFlightData {
  [key: string]: string | number | undefined
  airline?: string
  flightNumber?: string
  confirmation?: string
  departure?: string
  arrival?: string
  date?: string
  passengerName?: string
  confidence: number
}

/**
 * Validation result with detailed reasoning
 */
export interface ValidationResult {
  isValid: boolean
  confidence: number
  reasons: string[]
  extractedData?: ExtractedFlightData
}

/**
 * Email validation context
 */
interface EmailContext {
  subject: string
  body: string
  sender: string
  extractedData: ExtractedFlightData
}

/**
 * Core validation: Checks if ALL required fields are present and valid
 */
function validateRequiredFields(data: ExtractedFlightData): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  if (!data.confirmation || !isValidBookingReference(data.confirmation)) {
    missing.push('Valid booking reference/PNR (6 alphanumeric)')
  }

  if (!data.flightNumber || !isValidFlightNumber(data.flightNumber)) {
    missing.push('Valid flight number (airline code + digits)')
  }

  if (!data.departure || !isValidIATACode(data.departure)) {
    missing.push('Valid departure airport (3-letter IATA code)')
  }

  if (!data.arrival || !isValidIATACode(data.arrival)) {
    missing.push('Valid arrival airport (3-letter IATA code)')
  }

  if (!data.date || !isValidFlightDate(data.date)) {
    missing.push('Valid departure date (within reasonable range)')
  }

  // Passenger name is optional but recommended
  if (!data.passengerName || !isValidPassengerName(data.passengerName)) {
    // Not added to missing since it's optional
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Sender validation: Checks if sender is trustworthy
 */
function validateSender(sender: string): { valid: boolean; reason?: string } {
  if (!sender) {
    return { valid: false, reason: 'No sender information' }
  }

  // Reject marketing senders
  if (isMarketingSender(sender)) {
    return { valid: false, reason: 'Marketing/newsletter sender detected' }
  }

  // Prefer trusted senders (but don't require it)
  const trusted = isTrustedSender(sender)

  return { valid: true } // Pass if not explicitly blacklisted
}

/**
 * Subject line validation: Checks for booking indicators and rejects marketing
 */
function validateSubject(subject: string): { valid: boolean; reason?: string } {
  if (!subject) {
    return { valid: false, reason: 'No subject line' }
  }

  // Reject marketing subjects
  if (hasMarketingSubject(subject)) {
    return { valid: false, reason: 'Marketing subject line detected' }
  }

  // Require booking indicators in subject
  if (!hasBookingSubject(subject)) {
    return { valid: false, reason: 'No booking confirmation keywords in subject' }
  }

  return { valid: true }
}

/**
 * Body content validation: Checks for structured details and rejects marketing
 */
function validateBody(body: string): { valid: boolean; reason?: string } {
  if (!body || body.length < 50) {
    return { valid: false, reason: 'Email body too short or empty' }
  }

  // Reject marketing content
  if (hasMarketingContent(body)) {
    return { valid: false, reason: 'Unsubscribe or marketing content detected' }
  }

  // Require structured flight details (not just paragraph text)
  if (!hasStructuredFlightDetails(body)) {
    return { valid: false, reason: 'No structured flight details found' }
  }

  // Require sufficient booking keywords
  const keywordCount = countBookingKeywords(body)
  if (keywordCount < 3) {
    return { valid: false, reason: `Only ${keywordCount} booking keywords found (need 3+)` }
  }

  return { valid: true }
}

/**
 * Calculate confidence score based on validation results
 */
function calculateConfidenceScore(context: EmailContext): number {
  let score = 0

  // Required fields (70% of score)
  if (isValidIATACode(context.extractedData.departure)) score += 15
  if (isValidIATACode(context.extractedData.arrival)) score += 15
  if (isValidBookingReference(context.extractedData.confirmation)) score += 15
  if (isValidFlightNumber(context.extractedData.flightNumber)) score += 15
  if (isValidFlightDate(context.extractedData.date)) score += 10

  // Optional fields (15% of score)
  if (isValidAirline(context.extractedData.airline)) score += 5
  if (isValidPassengerName(context.extractedData.passengerName)) score += 10

  // Context validation (15% of score)
  if (isTrustedSender(context.sender)) score += 5
  if (hasBookingSubject(context.subject)) score += 5
  if (hasStructuredFlightDetails(context.body)) score += 5

  return Math.min(score, 100) / 100 // Normalize to 0-1
}

/**
 * Main validation function: Validates email as legitimate flight booking
 *
 * @param subject - Email subject line
 * @param body - Email body content
 * @param sender - Sender email address
 * @param extractedData - Pre-extracted flight data
 * @returns Validation result with confidence score and reasons
 */
export function validateFlightEmail(
  subject: string,
  body: string,
  sender: string,
  extractedData: ExtractedFlightData
): ValidationResult {
  const reasons: string[] = []
  let isValid = true

  // Step 1: Validate sender
  const senderValidation = validateSender(sender)
  if (!senderValidation.valid) {
    isValid = false
    reasons.push(`❌ Sender: ${senderValidation.reason}`)
  } else {
    reasons.push('✓ Sender: Valid')
  }

  // Step 2: Validate subject line
  const subjectValidation = validateSubject(subject)
  if (!subjectValidation.valid) {
    isValid = false
    reasons.push(`❌ Subject: ${subjectValidation.reason}`)
  } else {
    reasons.push('✓ Subject: Contains booking confirmation keywords')
  }

  // Step 3: Validate body content
  const bodyValidation = validateBody(body)
  if (!bodyValidation.valid) {
    isValid = false
    reasons.push(`❌ Body: ${bodyValidation.reason}`)
  } else {
    reasons.push('✓ Body: Structured flight details present')
  }

  // Step 4: Validate required fields
  const fieldsValidation = validateRequiredFields(extractedData)
  if (!fieldsValidation.valid) {
    isValid = false
    reasons.push(`❌ Required fields missing: ${fieldsValidation.missing.join(', ')}`)
  } else {
    reasons.push('✓ Required fields: All present and valid')
  }

  // Step 5: Calculate confidence score
  const context: EmailContext = { subject, body, sender, extractedData }
  const confidence = isValid ? calculateConfidenceScore(context) : 0

  // Step 6: Apply minimum confidence threshold (0.75)
  if (confidence < 0.75) {
    isValid = false
    reasons.push(`❌ Confidence too low: ${(confidence * 100).toFixed(0)}% (need 75%+)`)
  } else if (isValid) {
    reasons.push(`✓ Confidence: ${(confidence * 100).toFixed(0)}%`)
  }

  return {
    isValid,
    confidence,
    reasons,
    extractedData: isValid ? extractedData : undefined,
  }
}

/**
 * Pre-filter emails before extraction (fast rejection)
 *
 * @returns true if email should be processed, false if it should be skipped
 */
export function shouldProcessEmail(subject: string, sender: string): boolean {
  // Quick rejection checks
  if (isMarketingSender(sender)) return false
  if (hasMarketingSubject(subject)) return false
  if (!hasBookingSubject(subject)) return false

  return true
}

/**
 * Enhanced extraction with validation (replaces existing extraction logic)
 */
export function extractAndValidateFlightData(
  subject: string,
  body: string,
  sender: string
): ValidationResult {
  // Pre-filter check
  if (!shouldProcessEmail(subject, sender)) {
    return {
      isValid: false,
      confidence: 0,
      reasons: ['Pre-filter: Marketing or non-booking email detected'],
    }
  }

  const combinedText = `${subject}\n${body}`

  // Extract booking reference
  const confirmation = extractBookingReference(combinedText)

  // Extract flight number
  const flightNumber = extractFlightNumber(combinedText)

  // Extract airport codes (existing regex patterns)
  const departureMatch = combinedText.match(/(?:depart(?:ing|ure)?|from)[:\s]*\b([A-Z]{3})\b/i)
  const departure = departureMatch?.[1]

  const arrivalMatch = combinedText.match(/(?:arriv(?:al|ing)?|to|destination)[:\s]*\b([A-Z]{3})\b/i)
  const arrival = arrivalMatch?.[1]

  // Extract date (existing regex patterns)
  const dateMatch = combinedText.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})|(\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4})|(\d{4}-\d{2}-\d{2})/i
  )
  const date = dateMatch?.[0]

  // Extract airline (existing regex patterns)
  const airlineMatch = combinedText.match(
    /(?:airline|carrier)[:\s]+([a-z\s]+)|^([a-z\s]{2,20})\s+flight|(\b(?:american|delta|united|southwest|jetblue|alaska|spirit|frontier)\b)/i
  )
  const airline = airlineMatch?.[1] || airlineMatch?.[2] || airlineMatch?.[3]

  // Extract passenger name (optional)
  const passengerMatch = combinedText.match(/(?:passenger|traveler)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i)
  const passengerName = passengerMatch?.[1]

  const extractedData: ExtractedFlightData = {
    confirmation: confirmation || undefined,
    flightNumber: flightNumber || undefined,
    departure: departure || undefined,
    arrival: arrival || undefined,
    date: date || undefined,
    airline: airline || undefined,
    passengerName: passengerName || undefined,
    confidence: 0, // Will be calculated by validateFlightEmail
  }

  // Validate extracted data
  return validateFlightEmail(subject, body, sender, extractedData)
}
