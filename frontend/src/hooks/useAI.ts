import { useState, useCallback } from 'react'
import { aiService, PassportStampAnalysis, USCISReportData } from '../services/aiService'
import type { PresenceDay } from '../types/universal'

interface UseAIState {
  isLoading: boolean
  error: string | null
  result: any
}

interface UseAIResult {
  // Passport stamp analysis
  analyzePassportStamp: (imageData: string) => Promise<PassportStampAnalysis>
  
  // Travel history processing
  processTravelHistory: (entries: PresenceDay[]) => Promise<PresenceDay[]>
  
  // USCIS report generation
  generateUSCISReport: (entries: PresenceDay[]) => Promise<USCISReportData>
  // Presence calendar insights
  generatePresenceInsights: (days: PresenceDay[]) => Promise<any>
  
  // Email analysis
  analyzeEmailContent: (emailContent: string) => Promise<PresenceDay[]>
  
  // Cross-reference data
  crossReferenceData: (
    passportEntries: PresenceDay[],
    emailEntries: PresenceDay[]
  ) => Promise<PresenceDay[]>
  
  // State
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export const useAI = (): UseAIResult => {
  const [state, setState] = useState<UseAIState>({
    isLoading: false,
    error: null,
    result: null
  })

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setResult = useCallback((result: any) => {
    setState(prev => ({ ...prev, result }))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  const analyzePassportStamp = useCallback(async (imageData: string): Promise<PassportStampAnalysis> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await aiService.analyzePassportStamp(imageData)
      setResult(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze passport stamp'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setResult])

  const processTravelHistory = useCallback(async (entries: PresenceDay[]): Promise<PresenceDay[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await aiService.processTravelHistory(entries)
      setResult(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process travel history'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setResult])

  const generateUSCISReport = useCallback(async (entries: PresenceDay[]): Promise<USCISReportData> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await aiService.generateUSCISReport(entries)
      setResult(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate USCIS report'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setResult])

  const generatePresenceInsights = useCallback(async (days: PresenceDay[]): Promise<any> => {
    setLoading(true)
    setError(null)
    try {
      const result = await aiService.generatePresenceInsights(days)
      setResult(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate presence insights'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setResult])

  const analyzeEmailContent = useCallback(async (emailContent: string): Promise<PresenceDay[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await aiService.analyzeEmailContent(emailContent)
      setResult(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze email content'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setResult])

  const crossReferenceData = useCallback(async (
    passportEntries: PresenceDay[],
    emailEntries: PresenceDay[]
  ): Promise<PresenceDay[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await aiService.crossReferenceData(passportEntries, emailEntries)
      setResult(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cross-reference data'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setResult])

  return {
    analyzePassportStamp,
    processTravelHistory,
    generateUSCISReport,
    generatePresenceInsights,
    analyzeEmailContent,
    crossReferenceData,
    isLoading: state.isLoading,
    error: state.error,
    clearError
  }
}

export default useAI
