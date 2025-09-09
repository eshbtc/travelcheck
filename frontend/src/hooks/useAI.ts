import { useState, useCallback } from 'react'
import { aiService, PassportStampAnalysis, TravelHistoryEntry, USCISReportData } from '../services/aiService'

interface UseAIState {
  isLoading: boolean
  error: string | null
  result: any
}

interface UseAIResult {
  // Passport stamp analysis
  analyzePassportStamp: (imageData: string) => Promise<PassportStampAnalysis>
  
  // Travel history processing
  processTravelHistory: (entries: TravelHistoryEntry[]) => Promise<TravelHistoryEntry[]>
  
  // USCIS report generation
  generateUSCISReport: (entries: TravelHistoryEntry[]) => Promise<USCISReportData>
  
  // Email analysis
  analyzeEmailContent: (emailContent: string) => Promise<TravelHistoryEntry[]>
  
  // Cross-reference data
  crossReferenceData: (
    passportEntries: TravelHistoryEntry[],
    emailEntries: TravelHistoryEntry[]
  ) => Promise<TravelHistoryEntry[]>
  
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

  const processTravelHistory = useCallback(async (entries: TravelHistoryEntry[]): Promise<TravelHistoryEntry[]> => {
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

  const generateUSCISReport = useCallback(async (entries: TravelHistoryEntry[]): Promise<USCISReportData> => {
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

  const analyzeEmailContent = useCallback(async (emailContent: string): Promise<TravelHistoryEntry[]> => {
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
    passportEntries: TravelHistoryEntry[],
    emailEntries: TravelHistoryEntry[]
  ): Promise<TravelHistoryEntry[]> => {
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
    analyzeEmailContent,
    crossReferenceData,
    isLoading: state.isLoading,
    error: state.error,
    clearError
  }
}

export default useAI

