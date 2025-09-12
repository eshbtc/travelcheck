'use client'

import React, { useEffect } from 'react'
import { PresenceCalendar } from '@/components/travel/PresenceCalendar'
import { useTravelData } from '@/hooks/useTravelData'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export default function TravelCalendarPage() {
  const { presenceDays, isLoading, loadTravelData } = useTravelData()


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
