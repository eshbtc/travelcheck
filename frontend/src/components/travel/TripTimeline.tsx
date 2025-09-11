'use client'

import React, { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { 
  MapPinIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonTimeline } from '@/components/ui/Skeleton'
import { EmptyState, EmptyTravelHistory } from '@/components/ui/EmptyState'
import type { PresenceDay } from '@/types/universal'

interface TripTimelineProps {
  presenceDays: PresenceDay[]
  isLoading?: boolean
  onEditEntry?: (entry: PresenceDay) => void
  onDeleteEntry?: (entry: PresenceDay) => void
  onViewEvidence?: (entry: PresenceDay) => void
  className?: string
}

interface TimelineEntry {
  id: string
  date: string
  country: string
  attribution: string
  confidence: number
  evidence: string[]
  conflicts: any[]
  timezone: string
  localTime: string
  hasConflicts: boolean
  conflictCount: number
}

export function TripTimeline({
  presenceDays = [],
  isLoading = false,
  onEditEntry,
  onDeleteEntry,
  onViewEvidence,
  className = ''
}: TripTimelineProps) {
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null)
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)

  // Transform presence days into timeline entries
  const timelineEntries = useMemo(() => {
    return presenceDays
      .map((day): TimelineEntry => ({
        id: `${day.date}-${day.country}`,
        date: day.date,
        country: day.country,
        attribution: day.attribution,
        confidence: day.confidence,
        evidence: day.evidence,
        conflicts: day.conflicts,
        timezone: day.timezone,
        localTime: day.localTime,
        hasConflicts: day.conflicts && day.conflicts.length > 0,
        conflictCount: day.conflicts ? day.conflicts.length : 0
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [presenceDays])

  // Filter entries based on conflicts
  const filteredEntries = useMemo(() => {
    if (showConflictsOnly) {
      return timelineEntries.filter(entry => entry.hasConflicts)
    }
    return timelineEntries
  }, [timelineEntries, showConflictsOnly])

  // Group entries by month for better organization
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: TimelineEntry[] } = {}
    
    filteredEntries.forEach(entry => {
      const date = parseISO(entry.date)
      if (!isValid(date)) return
      
      const monthKey = format(date, 'yyyy-MM')
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(entry)
    })
    
    return groups
  }, [filteredEntries])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  if (isLoading) {
    return <SkeletonTimeline />
  }

  if (presenceDays.length === 0) {
    return <EmptyTravelHistory />
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Travel Timeline</h2>
          <p className="text-sm text-gray-600">
            {timelineEntries.length} entries
            {showConflictsOnly && ` (${timelineEntries.filter(e => e.hasConflicts).length} with conflicts)`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={showConflictsOnly ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowConflictsOnly(!showConflictsOnly)}
            className="flex items-center space-x-2"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>Show Conflicts Only</span>
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEntries)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, entries]) => (
            <div key={month} className="space-y-4">
              {/* Month header */}
              <div className="flex items-center space-x-3">
                <div className="h-px bg-gray-200 flex-1" />
                <h3 className="text-lg font-medium text-gray-700 px-3">
                  {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                </h3>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              {/* Entries for this month */}
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <Card
                    key={entry.id}
                    className={`p-4 transition-all duration-200 hover:shadow-md ${
                      entry.hasConflicts ? 'border-l-4 border-l-orange-400' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{entry.country}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {format(parseISO(entry.date), 'MMM dd, yyyy')}
                            </span>
                          </div>

                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(entry.confidence)}`}>
                            {getConfidenceLabel(entry.confidence)} Confidence
                          </div>

                          {entry.hasConflicts && (
                            <div className="flex items-center space-x-1 text-orange-600">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {entry.conflictCount} conflict{entry.conflictCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Attribution:</span> {entry.attribution}</p>
                          <p><span className="font-medium">Local Time:</span> {entry.localTime}</p>
                          {entry.evidence.length > 0 && (
                            <p><span className="font-medium">Evidence:</span> {entry.evidence.join(', ')}</p>
                          )}
                        </div>

                        {/* Conflicts preview */}
                        {entry.hasConflicts && (
                          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center space-x-2 mb-2">
                              <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                              <span className="text-sm font-medium text-orange-800">Conflicts Detected</span>
                            </div>
                            <div className="text-sm text-orange-700">
                              {entry.conflicts.slice(0, 2).map((conflict, idx) => (
                                <p key={idx}>• {conflict.description || 'Data inconsistency detected'}</p>
                              ))}
                              {entry.conflicts.length > 2 && (
                                <p className="text-orange-600">+ {entry.conflicts.length - 2} more conflicts</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {onViewEvidence && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewEvidence(entry)}
                            className="flex items-center space-x-1"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>Evidence</span>
                          </Button>
                        )}
                        
                        {onEditEntry && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditEntry(entry)}
                            className="flex items-center space-x-1"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </Button>
                        )}
                        
                        {onDeleteEntry && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteEntry(entry)}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span>Delete</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{timelineEntries.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Conflicts</p>
              <p className="text-2xl font-bold text-gray-900">
                {timelineEntries.filter(e => e.hasConflicts).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(timelineEntries.map(e => e.country)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}