'use client'

import React, { useEffect } from 'react'
import { TripTimeline } from '@/components/travel/TripTimeline'
import { useTravelData } from '@/hooks/useTravelData'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export default function TravelTimelinePage() {
  const { presenceDays, isLoading, loadTravelData } = useTravelData()


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
