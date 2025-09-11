import { getGenerativeModel } from 'firebase/ai'
import type { PresenceDay, UniversalResidenceRecord } from '../types/universal'
import { ai } from '../lib/firebase'

// AI Service for TravelCheck
// Handles passport stamp analysis, travel history processing, and USCIS report generation

export interface PassportStampAnalysis {
  country: string
  entryDate: string
  exitDate?: string
  location: string
  visaType?: string
  confidence: number
  rawText: string
}

// Use PresenceDay from universal types instead of custom TravelHistoryEntry
export type TravelHistoryEntry = PresenceDay

export interface USCISReportData {
  totalTrips: number
  totalDaysAbroad: number
  countries: string[]
  dateRange: {
    start: string
    end: string
  }
  entries: PresenceDay[]
  gaps: Array<{
    startDate: string
    endDate: string
    duration: number
  }>
}

class AIService {
  private passportModel: any
  private travelModel: any
  private reportModel: any

  constructor() {
    // Initialize different models for different tasks
    this.passportModel = getGenerativeModel(ai, { 
      model: "gemini-2.5-flash",
      systemInstruction: `You are an expert at analyzing passport stamps and entry/exit records. 
      Extract travel information including country, dates, locations, and visa types.
      Always provide confidence scores and explain your reasoning.`
    })

    this.travelModel = getGenerativeModel(ai, { 
      model: "gemini-2.5-flash",
      systemInstruction: `You are a travel history analyst specializing in USCIS citizenship applications.
      Process and validate travel data, identify gaps, and ensure accuracy for immigration purposes.`
    })

    this.reportModel = getGenerativeModel(ai, { 
      model: "gemini-2.5-flash",
      systemInstruction: `You are a USCIS report generator. Create comprehensive, accurate travel history reports
      formatted specifically for US citizenship applications. Ensure all dates are precise and gaps are identified.`
    })
  }

  /**
   * Analyze passport stamp image using AI
   */
  async analyzePassportStamp(imageData: string): Promise<PassportStampAnalysis> {
    try {
      const prompt = `Analyze this passport stamp image and extract the following information:
      
      1. Country name
      2. Entry date (YYYY-MM-DD format)
      3. Exit date if visible (YYYY-MM-DD format)
      4. Location/city
      5. Visa type if applicable
      6. Confidence score (0-100)
      7. Raw text visible in the stamp
      
      Return the information in JSON format with the exact field names above.
      If any information is unclear or not visible, use null for that field.
      Be conservative with confidence scores - only give high scores for clearly readable information.`

      const result = await this.passportModel.generateContent([
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageData,
          },
        },
      ])

      const response = result.response
      const text = response.text()
      
      // Parse the JSON response defensively (strip Markdown code fences)
      const analysis = this.parseJsonSafely(text)
      
      // Handle both single object and array responses
      let stampData;
      if (Array.isArray(analysis)) {
        // If it's an array, take the first (most confident) entry
        stampData = analysis[0] || {};
      } else {
        stampData = analysis;
      }
      
      // Map field names from Gemini response to our interface
      return {
        country: stampData.country_name || stampData.country || 'Unknown',
        entryDate: stampData.entry_date || stampData.entryDate || '',
        exitDate: stampData.exit_date || stampData.exitDate || undefined,
        location: stampData.location_city || stampData.location || 'Unknown',
        visaType: stampData.visa_type || stampData.visaType || undefined,
        confidence: stampData.confidence_score || stampData.confidence || 0,
        rawText: stampData.raw_text || stampData.rawText || ''
      }
    } catch (error) {
      console.error('Error analyzing passport stamp:', error)
      throw new Error('Failed to analyze passport stamp')
    }
  }

  /**
   * Analyze passport stamp image and return all detected stamps
   */
  async analyzePassportStamps(imageData: string): Promise<PassportStampAnalysis[]> {
    try {
      const prompt = `Analyze this passport stamp image and extract ALL passport stamps visible. 
      Return an array of objects, each containing:
      
      1. Country name
      2. Entry date (YYYY-MM-DD format)
      3. Exit date if visible (YYYY-MM-DD format)
      4. Location/city
      5. Visa type if applicable
      6. Confidence score (0-100)
      7. Raw text visible in the stamp
      
      Return as JSON array. If any information is unclear, use null for that field.`

      const result = await this.passportModel.generateContent([
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageData,
          },
        },
      ])

      const response = result.response
      const text = response.text()
      
      // Parse the JSON response defensively
      const analysis = this.parseJsonSafely(text)
      
      // Ensure we have an array
      const stampsArray = Array.isArray(analysis) ? analysis : [analysis];
      
      // Map field names and return array
      return stampsArray.map(stamp => ({
        country: stamp.country_name || stamp.country || 'Unknown',
        entryDate: stamp.entry_date || stamp.entryDate || '',
        exitDate: stamp.exit_date || stamp.exitDate || undefined,
        location: stamp.location_city || stamp.location || 'Unknown',
        visaType: stamp.visa_type || stamp.visaType || undefined,
        confidence: stamp.confidence_score || stamp.confidence || 0,
        rawText: stamp.raw_text || stamp.rawText || ''
      }));
    } catch (error) {
      console.error('Error analyzing passport stamps:', error)
      throw new Error('Failed to analyze passport stamps')
    }
  }

  /**
   * Process and validate travel history data
   */
  async processTravelHistory(entries: PresenceDay[]): Promise<PresenceDay[]> {
    try {
      const prompt = `Process and validate this travel history data for USCIS citizenship application:
      
      ${JSON.stringify(entries, null, 2)}
      
      Please:
      1. Validate all dates and ensure they're in correct format
      2. Calculate accurate durations
      3. Identify any inconsistencies or gaps
      4. Suggest corrections for any obvious errors
      5. Maintain the same JSON structure
      
      Return the processed and validated travel history entries.`

      const result = await this.travelModel.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      return this.parseJsonSafely(text)
    } catch (error) {
      console.error('Error processing travel history:', error)
      throw new Error('Failed to process travel history')
    }
  }

  /**
   * Generate USCIS-compliant travel history report
   */
  async generateUSCISReport(entries: PresenceDay[]): Promise<USCISReportData> {
    try {
      const prompt = `Generate a comprehensive USCIS travel history report from this data:
      
      ${JSON.stringify(entries, null, 2)}
      
      Create a report that includes:
      1. Total number of trips
      2. Total days spent abroad
      3. List of all countries visited
      4. Date range of all travel
      5. Detailed entries with calculated durations
      6. Any gaps in the travel history
      
      Format the response as JSON with the following structure:
      {
        "totalTrips": number,
        "totalDaysAbroad": number,
        "countries": string[],
        "dateRange": {
          "start": "YYYY-MM-DD",
          "end": "YYYY-MM-DD"
        },
        "entries": PresenceDay[],
        "gaps": [
          {
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD", 
            "duration": number
          }
        ]
      }`

      const result = await this.reportModel.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      return this.parseJsonSafely(text)
    } catch (error) {
      console.error('Error generating USCIS report:', error)
      throw new Error('Failed to generate USCIS report')
    }
  }

  /**
   * Generate insights directly from presence calendar days
   */
  async generatePresenceInsights(days: PresenceDay[]): Promise<any> {
    try {
      const prompt = `Analyze this presence calendar and summarize key insights for travel/residency:

      ${JSON.stringify(days, null, 2)}

      Provide:
      - Total presence days by country
      - Date range coverage
      - Notable gaps/conflicts
      - Any risks (e.g., approaching Schengen 90/180 limit)
      - A concise recommendations list

      Return JSON with: { summary: { totalDays, countries: Record<string, number>, dateRange: { start, end } },
        risks: string[], recommendations: string[] }`

      const result = await this.reportModel.generateContent(prompt)
      const response = result.response
      const text = response.text()
      return this.parseJsonSafely(text)
    } catch (error) {
      console.error('Error generating presence insights:', error)
      throw new Error('Failed to generate presence insights')
    }
  }

  /**
   * Analyze email content for travel information
   */
  async analyzeEmailContent(emailContent: string): Promise<PresenceDay[]> {
    try {
      const prompt = `Analyze this email content and extract any travel information:
      
      ${emailContent}
      
      Look for:
      - Flight confirmations
      - Hotel bookings
      - Travel dates
      - Destinations
      - Trip purposes
      
      Return an array of travel entries in JSON format, or an empty array if no travel information is found.
      Each entry should have: country, entryDate, exitDate, duration, purpose, source: "email", confidence.`

      const result = await this.travelModel.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      return this.parseJsonSafely(text)
    } catch (error) {
      console.error('Error analyzing email content:', error)
      throw new Error('Failed to analyze email content')
    }
  }

  /**
   * Cross-reference passport and email data
   */
  async crossReferenceData(
    passportEntries: PresenceDay[],
    emailEntries: PresenceDay[]
  ): Promise<PresenceDay[]> {
    try {
      const prompt = `Cross-reference and merge these travel history entries from different sources:
      
      Passport entries: ${JSON.stringify(passportEntries, null, 2)}
      Email entries: ${JSON.stringify(emailEntries, null, 2)}
      
      Please:
      1. Merge duplicate entries (same country, similar dates)
      2. Resolve conflicts by using the most reliable source
      3. Fill in missing information where possible
      4. Maintain chronological order
      5. Update confidence scores based on multiple sources
      
      Return the merged and validated travel history entries.`

      const result = await this.travelModel.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      return JSON.parse(text)
    } catch (error) {
      console.error('Error cross-referencing data:', error)
      throw new Error('Failed to cross-reference travel data')
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
export default aiService

// Extend class with helper method without changing export shape
interface AIService {
  parseJsonSafely(text: string): any
}

AIService.prototype.parseJsonSafely = function (text: string): any {
  try {
    return JSON.parse(text)
  } catch (_) {
    // Try to extract content inside ```json ... ``` or ``` ... ``` fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenceMatch && fenceMatch[1]) {
      const inner = fenceMatch[1].trim()
      try {
        return JSON.parse(inner)
      } catch (_) {
        // fall through
      }
    }
    // Fallback: try to find first JSON object or array
    const matches = Array.from(text.matchAll(/[\[{]/g))
    const start = Math.min(
      ...matches.map((m) => m.index ?? text.length).concat([text.length])
    )
    const candidate = start < text.length ? text.slice(start).trim() : text
    try {
      return JSON.parse(candidate)
    } catch (err) {
      console.error('Failed to parse JSON from model text:', { textSnippet: text.slice(0, 200) })
      throw err
    }
  }
}
