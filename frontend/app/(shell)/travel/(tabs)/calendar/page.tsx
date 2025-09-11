'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PresenceCalendar } from '@/components/travel/PresenceCalendar'
import { universalTravelService } from '@/services/universalService'
import { MockDataService } from '@/services/mockDataService'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export default function TravelCalendarPage() {
  const { user } = useAuth()
  const [presenceDays, setPresenceDays] = useState<PresenceDay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTravelData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load mock data immediately for development
      const mockData = await MockDataService.getPresenceDays()
      console.log('Mock data loaded:', mockData.length, 'items')
      console.log('First few items:', mockData.slice(0, 3))
      setPresenceDays(mockData)
      toast.success('Loaded sample travel data for demonstration')
      
      // Skip real API calls for now to avoid 500 errors
      // TODO: Re-enable when backend is properly configured
    } catch (error) {
      console.error('Error loading travel data:', error)
      toast.error('Failed to load travel data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTravelData()
  }, [loadTravelData])

  const handleDayClick = (day: PresenceDay | null, date: Date) => {
    if (day) {
      toast.success(`Viewing details for ${day.country} on ${date.toLocaleDateString()}`)
    } else {
      toast.success(`No travel data for ${date.toLocaleDateString()}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presence Calendar</h1>
        <p className="text-gray-600">Visualize your presence days with a calendar heatmap</p>
        <p className="text-sm text-gray-500">Debug: {presenceDays.length} presence days loaded</p>
      </div>
      
      <PresenceCalendar
        presenceDays={presenceDays}
        isLoading={isLoading}
        onDayClick={handleDayClick}
      />
    </div>
  )
}
