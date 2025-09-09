import { getGenerativeModel } from 'firebase/ai'
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

export interface TravelHistoryEntry {
  country: string
  entryDate: string
  exitDate?: string
  duration: number // in days
  purpose?: string
  visaType?: string
  source: 'passport' | 'email' | 'manual'
  confidence: number
}

export interface USCISReportData {
  totalTrips: number
  totalDaysAbroad: number
  countries: string[]
  dateRange: {
    start: string
    end: string
  }
  entries: TravelHistoryEntry[]
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
      
      // Parse the JSON response
      const analysis = JSON.parse(text)
      
      return {
        country: analysis.country || 'Unknown',
        entryDate: analysis.entryDate || '',
        exitDate: analysis.exitDate || undefined,
        location: analysis.location || 'Unknown',
        visaType: analysis.visaType || undefined,
        confidence: analysis.confidence || 0,
        rawText: analysis.rawText || ''
      }
    } catch (error) {
      console.error('Error analyzing passport stamp:', error)
      throw new Error('Failed to analyze passport stamp')
    }
  }

  /**
   * Process and validate travel history data
   */
  async processTravelHistory(entries: TravelHistoryEntry[]): Promise<TravelHistoryEntry[]> {
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
      
      return JSON.parse(text)
    } catch (error) {
      console.error('Error processing travel history:', error)
      throw new Error('Failed to process travel history')
    }
  }

  /**
   * Generate USCIS-compliant travel history report
   */
  async generateUSCISReport(entries: TravelHistoryEntry[]): Promise<USCISReportData> {
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
        "entries": TravelHistoryEntry[],
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
      
      return JSON.parse(text)
    } catch (error) {
      console.error('Error generating USCIS report:', error)
      throw new Error('Failed to generate USCIS report')
    }
  }

  /**
   * Analyze email content for travel information
   */
  async analyzeEmailContent(emailContent: string): Promise<TravelHistoryEntry[]> {
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
      
      return JSON.parse(text)
    } catch (error) {
      console.error('Error analyzing email content:', error)
      throw new Error('Failed to analyze email content')
    }
  }

  /**
   * Cross-reference passport and email data
   */
  async crossReferenceData(
    passportEntries: TravelHistoryEntry[],
    emailEntries: TravelHistoryEntry[]
  ): Promise<TravelHistoryEntry[]> {
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

