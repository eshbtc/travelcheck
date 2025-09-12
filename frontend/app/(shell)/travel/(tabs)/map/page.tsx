'use client'

import React, { useEffect } from 'react'
import { PresenceMap } from '@/components/travel/PresenceMap'
import { useTravelData } from '@/hooks/useTravelData'
import { toast } from 'react-hot-toast'

export default function TravelMapPage() {
  const { presenceDays, isLoading, loadTravelData } = useTravelData()


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
