'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { universalTravelService } from '@/services/universalService'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export function useTravelData() {
  const { user } = useAuth()
  const [presenceDays, setPresenceDays] = useState<PresenceDay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTravelData = useCallback(async () => {
    if (!user) {
      setPresenceDays([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      // Generate a travel summary report to get presence days
      const report = await universalTravelService.generateUniversalReport(
        {
          category: 'travel_summary',
          purpose: 'Travel Data Display',
          requirements: []
        },
        'Global', // For all countries
        {
          start: new Date(new Date().getFullYear() - 3, 0, 1).toISOString().split('T')[0], // 3 years ago
          end: new Date().toISOString().split('T')[0] // Today
        },
        {
          includeEvidence: true,
          includeConflicts: true,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      )
      
      // Transform detailed entries to PresenceDay format
      const presenceData: PresenceDay[] = (report.detailedEntries || []).map((entry: any) => ({
        date: entry.date,
        country: entry.country || 'Unknown',
        attribution: entry.transportType || 'manual_entry',
        confidence: 0.8, // Default confidence
        evidence: [entry.id], // Reference to the travel entry
        conflicts: [], // No conflicts by default
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date(entry.date).toLocaleTimeString()
      }))
      
      setPresenceDays(presenceData)
      
      if (presenceData.length > 0) {
        toast.success(`Loaded ${presenceData.length} travel records`)
      } else {
        toast.info('No travel data found. Upload passport scans or connect email accounts to get started.')
      }
    } catch (error) {
      console.error('Error loading travel data:', error)
      
      // Fallback to empty state with helpful message
      setPresenceDays([])
      toast.error('Unable to load travel data. Please try connecting your email accounts or uploading passport scans.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  return {
    presenceDays,
    isLoading,
    loadTravelData,
    refetch: loadTravelData
  }
}