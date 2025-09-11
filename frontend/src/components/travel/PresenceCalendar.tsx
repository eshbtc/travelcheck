'use client'

import React, { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isValid } from 'date-fns'
import { 
  CalendarIcon, 
  MapPinIcon, 
  FunnelIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonCalendar } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PresenceDay } from '@/types/universal'

interface PresenceCalendarProps {
  presenceDays: PresenceDay[]
  isLoading?: boolean
  onDayClick?: (day: PresenceDay | null, date: Date) => void
  className?: string
}

interface CalendarDay {
  date: Date
  presenceDay: PresenceDay | null
  hasConflicts: boolean
  countries: string[]
  confidence: number
}

export function PresenceCalendar({
  presenceDays = [],
  isLoading = false,
  onDayClick,
  className = ''
}: PresenceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)

  // Debug logging
  console.log('PresenceCalendar received:', presenceDays.length, 'presence days')
  console.log('PresenceCalendar isLoading:', isLoading)

  // Get all unique countries
  const countries = useMemo(() => {
    const countrySet = new Set(presenceDays.map(day => day.country))
    return Array.from(countrySet).sort()
  }, [presenceDays])

  // Create calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    
    // Create a map of presence days by date
    const presenceMap = new Map<string, PresenceDay>()
    presenceDays.forEach(day => {
      presenceMap.set(day.date, day)
    })

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const presenceDay = presenceMap.get(dateStr) || null
      
      return {
        date,
        presenceDay,
        hasConflicts: presenceDay?.conflicts && presenceDay.conflicts.length > 0,
        countries: presenceDay ? [presenceDay.country] : [],
        confidence: presenceDay?.confidence || 0
      } as CalendarDay
    })
  }, [currentMonth, presenceDays])

  // Filter calendar days based on selected filters
  const filteredDays = useMemo(() => {
    return calendarDays.filter(day => {
      // Country filter
      if (selectedCountry !== 'all' && !day.countries.includes(selectedCountry)) {
        return false
      }
      
      // Conflicts filter
      if (showConflictsOnly && !day.hasConflicts) {
        return false
      }
      
      return true
    })
  }, [calendarDays, selectedCountry, showConflictsOnly])

  // Get heatmap intensity based on confidence and conflicts
  const getHeatmapIntensity = (day: CalendarDay) => {
    if (!day.presenceDay) return 0
    
    let intensity = day.confidence
    
    // Reduce intensity for conflicts
    if (day.hasConflicts) {
      intensity *= 0.7
    }
    
    return Math.max(0, Math.min(1, intensity))
  }

  // Get color class based on intensity
  const getColorClass = (intensity: number, hasConflicts: boolean) => {
    if (intensity === 0) return 'bg-gray-100 hover:bg-gray-200'
    
    const baseIntensity = Math.floor(intensity * 4) + 1
    
    if (hasConflicts) {
      return `bg-orange-${baseIntensity * 100} hover:bg-orange-${Math.min(500, (baseIntensity + 1) * 100)}`
    }
    
    return `bg-blue-${baseIntensity * 100} hover:bg-blue-${Math.min(500, (baseIntensity + 1) * 100)}`
  }

  // Get tooltip content for a day
  const getTooltipContent = (day: CalendarDay) => {
    if (!day.presenceDay) {
      return `No travel data for ${format(day.date, 'MMM dd, yyyy')}`
    }
    
    const { presenceDay } = day
    return `
      ${format(day.date, 'MMM dd, yyyy')}
      Country: ${presenceDay.country}
      Confidence: ${Math.round(presenceDay.confidence * 100)}%
      ${day.hasConflicts ? `Conflicts: ${presenceDay.conflicts?.length || 0}` : ''}
    `.trim()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  if (isLoading) {
    return <SkeletonCalendar />
  }

  if (presenceDays.length === 0) {
    return (
      <EmptyState
        icon={<CalendarIcon className="h-12 w-12 text-gray-400" />}
        title="No Travel Data"
        description="No presence data available for the calendar view."
      />
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Presence Calendar</h2>
          <p className="text-sm text-gray-600">
            Travel presence heatmap for {format(currentMonth, 'MMMM yyyy')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            ← Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            Next →
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Countries</option>
          {countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
        
        <Button
          variant={showConflictsOnly ? "primary" : "outline"}
          size="sm"
          onClick={() => setShowConflictsOnly(!showConflictsOnly)}
          className="flex items-center space-x-2"
        >
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Conflicts Only</span>
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const intensity = getHeatmapIntensity(day)
              const colorClass = getColorClass(intensity, day.hasConflicts)
              const isToday = isSameDay(day.date, new Date())
              const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth()
              
              return (
                <button
                  key={index}
                  onClick={() => onDayClick?.(day.presenceDay, day.date)}
                  className={`
                    relative h-12 w-full rounded-lg transition-all duration-200
                    ${colorClass}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${day.presenceDay ? 'cursor-pointer' : 'cursor-default'}
                    flex items-center justify-center text-sm font-medium
                    ${intensity > 0.5 ? 'text-white' : 'text-gray-700'}
                    hover:scale-105
                  `}
                  title={getTooltipContent(day)}
                >
                  {format(day.date, 'd')}
                  
                  {/* Conflict indicator */}
                  {day.hasConflicts && (
                    <div className="absolute top-1 right-1">
                      <ExclamationTriangleIcon className="h-3 w-3 text-orange-600" />
                    </div>
                  )}
                  
                  {/* Today indicator */}
                  {isToday && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Legend:</span>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-100 rounded" />
              <span className="text-xs text-gray-600">Low confidence</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-400 rounded" />
              <span className="text-xs text-gray-600">High confidence</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-orange-400 rounded" />
              <span className="text-xs text-gray-600">Conflicts</span>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {filteredDays.filter(d => d.presenceDay).length} days with travel data
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Days with Data</p>
              <p className="text-2xl font-bold text-gray-900">
                {calendarDays.filter(d => d.presenceDay).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Conflict Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {calendarDays.filter(d => d.hasConflicts).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(calendarDays.filter(d => d.presenceDay).map(d => d.presenceDay!.country)).size}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EyeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  calendarDays
                    .filter(d => d.presenceDay)
                    .reduce((sum, d) => sum + d.confidence, 0) / 
                  Math.max(1, calendarDays.filter(d => d.presenceDay).length) * 100
                )}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}