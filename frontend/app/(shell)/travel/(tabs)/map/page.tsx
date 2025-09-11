'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PresenceMap } from '@/components/travel/PresenceMap'
import { universalTravelService } from '@/services/universalService'
import { MockDataService } from '@/services/mockDataService'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export default function TravelMapPage() {
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

  const handleLocationClick = (location: any) => {
    toast.success(`Viewing details for ${location.country}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Travel Map</h1>
        <p className="text-gray-600">View your travel routes and stays on a map</p>
      </div>
      
      <PresenceMap
        presenceDays={presenceDays}
        isLoading={isLoading}
        onLocationClick={handleLocationClick}
      />
    </div>
  )
}
