'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TripTimeline } from '@/components/travel/TripTimeline'
import { universalTravelService } from '@/services/universalService'
import { MockDataService } from '@/services/mockDataService'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export default function TravelTimelinePage() {
  const { user } = useAuth()
  const [presenceDays, setPresenceDays] = useState<PresenceDay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTravelData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load mock data immediately for development
      const mockData = await MockDataService.getPresenceDays()
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

  const handleEditEntry = (entry: PresenceDay) => {
    // TODO: Implement edit functionality
    toast.success('Edit functionality coming soon')
  }

  const handleDeleteEntry = (entry: PresenceDay) => {
    // TODO: Implement delete functionality
    toast.success('Delete functionality coming soon')
  }

  const handleViewEvidence = (entry: PresenceDay) => {
    // TODO: Implement evidence viewer
    toast.success('Evidence viewer coming soon')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Travel Timeline</h1>
        <p className="text-gray-600">View your travel history in chronological order</p>
      </div>
      
      <TripTimeline
        presenceDays={presenceDays}
        isLoading={isLoading}
        onEditEntry={handleEditEntry}
        onDeleteEntry={handleDeleteEntry}
        onViewEvidence={handleViewEvidence}
      />
    </div>
  )
}
