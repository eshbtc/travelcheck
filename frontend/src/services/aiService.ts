import type { PresenceDay } from '../types/universal'
import { vertexAI } from './vertexAI'

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
  constructor() {
    // All AI functionality is now handled by the vertexAI service
  }

  /**
   * Analyze passport stamp image using AI
   */
  async analyzePassportStamp(imageData: string): Promise<PassportStampAnalysis> {
    try {
      // Convert base64 string to Buffer for vertexAI
      const buffer = Buffer.from(imageData, 'base64')
      
      // Use vertexAI service to process the passport image
      const result = await vertexAI.processPassportImage(buffer)
      
      if (!result.success || !result.data) {
        throw new Error('Service error' || 'Failed to analyze passport stamp')
      }

      // Extract the first stamp if multiple are found
      const stamps = result.data.stamps || []
      const firstStamp = stamps.length > 0 ? stamps[0] : null
      
      // Map vertexAI response to our interface
      return {
        country: firstStamp?.country || result.data.personalInfo?.nationality || 'Unknown',
        entryDate: firstStamp?.date || '',
        exitDate: undefined, // vertexAI doesn't distinguish entry/exit in current implementation
        location: firstStamp?.location || 'Unknown',
        visaType: result.data.personalInfo?.passportNumber ? 'Passport' : undefined,
        confidence: firstStamp?.confidence || 50,
        rawText: `${result.data.personalInfo?.firstName || ''} ${result.data.personalInfo?.lastName || ''}`.trim()
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
      // Convert base64 string to Buffer for vertexAI
      const buffer = Buffer.from(imageData, 'base64')
      
      // Use vertexAI service to process the passport image
      const result = await vertexAI.processPassportImage(buffer)
      
      if (!result.success || !result.data) {
        throw new Error('Service error' || 'Failed to analyze passport stamps')
      }

      // Extract all stamps from the result
      const stamps = result.data.stamps || []
      
      // Map vertexAI response to our interface
      return stamps.map(stamp => ({
        country: stamp.country || 'Unknown',
        entryDate: stamp.date || '',
        exitDate: undefined, // vertexAI doesn't distinguish entry/exit in current implementation
        location: stamp.location || 'Unknown',
        visaType: stamp.type || undefined,
        confidence: stamp.confidence || 50,
        rawText: stamp.country + (stamp.location ? ` - ${stamp.location}` : '')
      }))
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
      // Use vertexAI to analyze and validate the travel patterns
      const result = await vertexAI.analyzeTravelPatterns(entries)
      
      if (!result.success) {
        throw new Error('Service error' || 'Failed to process travel history')
      }

      // Return the original entries since vertexAI provides patterns, not modified entries
      // In a real implementation, you might transform the entries based on the analysis
      return entries.map((entry, index) => ({
        ...entry,
        // Add any validation metadata from the analysis
        conflicts: result.data?.patterns?.some(p => p.type === 'conflict') ? [] : (entry.conflicts || [])
      }))
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
      // Calculate report data from presence entries
      const countries = Array.from(new Set(entries.map(e => e.country)))
      const sortedEntries = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      const report: USCISReportData = {
        totalTrips: entries.filter(e => e.attribution === 'entry').length,
        totalDaysAbroad: entries.filter(e => e.country !== 'United States').length,
        countries: countries,
        dateRange: {
          start: sortedEntries[0]?.date || '',
          end: sortedEntries[sortedEntries.length - 1]?.date || ''
        },
        entries: entries,
        gaps: [] // Would need more complex logic to detect gaps
      }
      
      return report
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
      // Use vertexAI to generate insights
      const result = await vertexAI.analyzeTravelPatterns(days)
      
      if (!result.success) {
        throw new Error('Service error' || 'Failed to generate insights')
      }

      // Transform the vertexAI result to match expected format
      const countries: Record<string, number> = {}
      days.forEach(day => {
        countries[day.country] = (countries[day.country] || 0) + 1
      })
      
      const sortedDays = days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      return {
        summary: {
          totalDays: days.length,
          countries,
          dateRange: {
            start: sortedDays[0]?.date || '',
            end: sortedDays[sortedDays.length - 1]?.date || ''
          }
        },
        risks: result.data?.insights?.filter(i => i.type === 'warning').map(i => i.description) || [],
        recommendations: result.data?.insights?.filter(i => i.type === 'info').map(i => i.description) || []
      }
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
      // Use vertexAI to generate smart suggestions from email content
      const result = await vertexAI.generateSmartSuggestions({ emailContent })
      
      if (!result.success) {
        throw new Error('Service error' || 'Failed to analyze email content')
      }

      // Transform suggestions into PresenceDay format
      // This is a simplified transformation - in a real implementation,
      // you'd want more sophisticated parsing
      return result.data?.suggestions?.map((suggestion: any, index: number) => ({
        date: new Date().toISOString().split('T')[0], // Placeholder date
        country: suggestion.title || 'Unknown',
        attribution: 'email_analysis',
        confidence: 0.7,
        evidence: [emailContent.substring(0, 100)],
        conflicts: [],
        timezone: 'UTC',
        localTime: '12:00:00'
      } as PresenceDay)) || []
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
      // Simple merging logic - in production, you'd want more sophisticated merging
      const allEntries = [...passportEntries, ...emailEntries]
      const mergedEntries: PresenceDay[] = []
      const seenDates = new Set<string>()
      
      // Sort by date and deduplicate based on date + country
      allEntries
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(entry => {
          const key = `${entry.date}-${entry.country}`
          if (!seenDates.has(key)) {
            seenDates.add(key)
            mergedEntries.push({
              ...entry,
              // Boost confidence if we have multiple sources
              confidence: Math.min((entry.confidence || 0.5) * 1.2, 1.0)
            })
          }
        })
      
      return mergedEntries
    } catch (error) {
      console.error('Error cross-referencing data:', error)
      throw new Error('Failed to cross-reference travel data')
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
export default aiService

