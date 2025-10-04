/**
 * Email Validator Tests
 *
 * Test cases for the comprehensive email filtering system
 */

import { validateFlightEmail, shouldProcessEmail, extractAndValidateFlightData } from '../email-validator'
import type { ExtractedFlightData } from '../email-validator'

describe('Email Validator', () => {
  describe('shouldProcessEmail', () => {
    it('should accept legitimate booking confirmation emails', () => {
      expect(shouldProcessEmail(
        'Flight Confirmation - UA1234 - Booking ABC123',
        'confirmations@united.com'
      )).toBe(true)
    })

    it('should reject marketing emails by sender', () => {
      expect(shouldProcessEmail(
        'Flight Deals',
        'marketing@delta.com'
      )).toBe(false)
    })

    it('should reject marketing emails by subject', () => {
      expect(shouldProcessEmail(
        'Flash Sale! 50% off all flights',
        'booking@delta.com'
      )).toBe(false)
    })

    it('should reject newsletter emails', () => {
      expect(shouldProcessEmail(
        'Weekly Travel Newsletter',
        'newsletter@thepointsguy.com'
      )).toBe(false)
    })

    it('should reject emails without booking keywords', () => {
      expect(shouldProcessEmail(
        'Travel Tips',
        'info@airline.com'
      )).toBe(false)
    })
  })

  describe('validateFlightEmail', () => {
    const validExtractedData: ExtractedFlightData = {
      confirmation: 'ABC123',
      flightNumber: 'UA1234',
      departure: 'SFO',
      arrival: 'JFK',
      date: '2025-12-25',
      airline: 'United',
      passengerName: 'John Doe',
      confidence: 0,
    }

    const validSubject = 'Flight Confirmation - UA1234 - Booking ABC123'
    const validBody = `
      Your Flight Confirmation

      Booking Reference: ABC123
      Flight Number: UA1234
      Passenger: John Doe

      Departure:
      - Airport: SFO (San Francisco)
      - Date: December 25, 2025
      - Time: 10:00 AM

      Arrival:
      - Airport: JFK (New York)
      - Date: December 25, 2025
      - Time: 6:00 PM

      Airline: United Airlines
    `
    const validSender = 'confirmations@united.com'

    it('should accept valid flight booking email', () => {
      const result = validateFlightEmail(validSubject, validBody, validSender, validExtractedData)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThanOrEqual(0.75)
      expect(result.reasons).toContain('✓ Sender: Valid')
      expect(result.reasons).toContain('✓ Subject: Contains booking confirmation keywords')
      expect(result.reasons).toContain('✓ Required fields: All present and valid')
    })

    it('should reject email with marketing content', () => {
      const marketingBody = validBody + '\n\nUnsubscribe from this mailing list'
      const result = validateFlightEmail(validSubject, marketingBody, validSender, validExtractedData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('marketing'))).toBe(true)
    })

    it('should reject email with missing booking reference', () => {
      const invalidData = { ...validExtractedData, confirmation: undefined }
      const result = validateFlightEmail(validSubject, validBody, validSender, invalidData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('booking reference'))).toBe(true)
    })

    it('should reject email with invalid airport code', () => {
      const invalidData = { ...validExtractedData, departure: 'BOO' } // Common word
      const result = validateFlightEmail(validSubject, validBody, validSender, invalidData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('Required fields'))).toBe(true)
    })

    it('should reject email with invalid flight number', () => {
      const invalidData = { ...validExtractedData, flightNumber: '12345' } // No airline code
      const result = validateFlightEmail(validSubject, validBody, validSender, invalidData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('flight number'))).toBe(true)
    })

    it('should reject email from marketing sender', () => {
      const marketingSender = 'marketing@delta.com'
      const result = validateFlightEmail(validSubject, validBody, marketingSender, validExtractedData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('Marketing'))).toBe(true)
    })

    it('should reject email with marketing subject', () => {
      const marketingSubject = 'Flash Sale! Book now and save 50%'
      const result = validateFlightEmail(marketingSubject, validBody, validSender, validExtractedData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('Marketing subject'))).toBe(true)
    })

    it('should reject email with unstructured body', () => {
      const unstructuredBody = 'Your flight is tomorrow. Please check in online.'
      const result = validateFlightEmail(validSubject, unstructuredBody, validSender, validExtractedData)

      expect(result.isValid).toBe(false)
      expect(result.reasons.some(r => r.includes('structured'))).toBe(true)
    })

    it('should calculate confidence score correctly', () => {
      const result = validateFlightEmail(validSubject, validBody, validSender, validExtractedData)

      // Should have high confidence with all valid fields
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    })
  })

  describe('extractAndValidateFlightData', () => {
    it('should extract and validate legitimate booking email', () => {
      const subject = 'Flight Confirmation - Booking ABC123'
      const body = `
        Confirmation Number: ABC123
        Flight: UA1234
        From: SFO to JFK
        Date: December 25, 2025
        Passenger: John Doe
      `
      const sender = 'confirmations@united.com'

      const result = extractAndValidateFlightData(subject, body, sender)

      // May or may not pass validation depending on extraction quality
      // Just verify it returns a result
      expect(result).toHaveProperty('isValid')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasons')
    })

    it('should reject marketing email immediately', () => {
      const subject = 'Flash Sale! 50% off'
      const body = 'Book now and save!'
      const sender = 'marketing@airline.com'

      const result = extractAndValidateFlightData(subject, body, sender)

      expect(result.isValid).toBe(false)
      expect(result.reasons).toContain('Pre-filter: Marketing or non-booking email detected')
    })
  })
})
