'use client'

import React, { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState, EmptyEvidence } from '@/components/ui/EmptyState'
import type { PresenceDay } from '@/types/universal'

interface EvidenceListProps {
  presenceDays: PresenceDay[]
  isLoading?: boolean
  onViewEvidence?: (evidence: EvidenceItem) => void
  onDownloadEvidence?: (evidence: EvidenceItem) => void
  className?: string
}

interface EvidenceItem {
  id: string
  type: 'passport' | 'email' | 'booking' | 'flight' | 'other'
  source: string
  date: string
  country: string
  confidence: number
  hasConflicts: boolean
  conflictCount: number
  evidence: string[]
  rawData: any
  attribution: string
}

const EVIDENCE_TYPES = {
  passport: { label: 'Passport Stamp', icon: PhotoIcon, color: 'blue' },
  email: { label: 'Email', icon: EnvelopeIcon, color: 'green' },
  booking: { label: 'Hotel Booking', icon: DocumentTextIcon, color: 'purple' },
  flight: { label: 'Flight', icon: DocumentTextIcon, color: 'indigo' },
  other: { label: 'Other', icon: DocumentTextIcon, color: 'gray' }
}

export function EvidenceList({
  presenceDays = [],
  isLoading = false,
  onViewEvidence,
  onDownloadEvidence,
  className = ''
}: EvidenceListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)

  // Transform presence days into evidence items
  const evidenceItems = useMemo(() => {
    const items: EvidenceItem[] = []
    
    presenceDays.forEach(day => {
      if (day.evidence && day.evidence.length > 0) {
        day.evidence.forEach((evidence, index) => {
          let type: EvidenceItem['type'] = 'other'
          let source = 'Unknown'
          
          if (evidence.toLowerCase().includes('passport') || evidence.toLowerCase().includes('stamp')) {
            type = 'passport'
            source = 'Passport Scan'
          } else if (evidence.toLowerCase().includes('email') || evidence.toLowerCase().includes('gmail')) {
            type = 'email'
            source = 'Email'
          } else if (evidence.toLowerCase().includes('booking') || evidence.toLowerCase().includes('hotel')) {
            type = 'booking'
            source = 'Hotel Booking'
          } else if (evidence.toLowerCase().includes('flight') || evidence.toLowerCase().includes('airline')) {
            type = 'flight'
            source = 'Flight Record'
          }
          
          items.push({
            id: `${day.date}-${day.country}-${index}`,
            type,
            source,
            date: day.date,
            country: day.country,
            confidence: day.confidence,
            hasConflicts: day.conflicts && day.conflicts.length > 0,
            conflictCount: day.conflicts ? day.conflicts.length : 0,
            evidence: [evidence],
            rawData: day,
            attribution: day.attribution
          })
        })
      } else {
        items.push({
          id: `${day.date}-${day.country}`,
          type: 'other',
          source: day.attribution,
          date: day.date,
          country: day.country,
          confidence: day.confidence,
          hasConflicts: day.conflicts && day.conflicts.length > 0,
          conflictCount: day.conflicts ? day.conflicts.length : 0,
          evidence: ['Presence data'],
          rawData: day,
          attribution: day.attribution
        })
      }
    })
    
    return items
  }, [presenceDays])

  // Get unique countries and types for filters
  const countries = useMemo(() => {
    const countrySet = new Set(evidenceItems.map(item => item.country))
    return Array.from(countrySet).sort()
  }, [evidenceItems])

  const types = useMemo(() => {
    const typeSet = new Set(evidenceItems.map(item => item.type))
    return Array.from(typeSet).sort()
  }, [evidenceItems])

  // Filter evidence items
  const filteredItems = useMemo(() => {
    return evidenceItems.filter(item => {
      if (selectedType !== 'all' && item.type !== selectedType) return false
      if (selectedCountry !== 'all' && item.country !== selectedCountry) return false
      if (showConflictsOnly && !item.hasConflicts) return false
      return true
    })
  }, [evidenceItems, selectedType, selectedCountry, showConflictsOnly])

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

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
    return <SkeletonTable />
  }

  if (evidenceItems.length === 0) {
    return <EmptyEvidence />
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Evidence List</h2>
          <p className="text-sm text-gray-600">
            {filteredItems.length} evidence items
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {EVIDENCE_TYPES[type as keyof typeof EVIDENCE_TYPES]?.label || type}
              </option>
            ))}
          </select>
          
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
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.map((item) => {
                const EvidenceIcon = EVIDENCE_TYPES[item.type]?.icon || DocumentTextIcon
                const evidenceColor = EVIDENCE_TYPES[item.type]?.color || 'gray'
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span>
                          {isValid(parseISO(item.date)) 
                            ? format(parseISO(item.date), 'MMM dd, yyyy')
                            : item.date
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span>{item.country}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <EvidenceIcon className={`h-4 w-4 text-${evidenceColor}-600`} />
                        <span>{EVIDENCE_TYPES[item.type]?.label || item.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                        {getConfidenceLabel(item.confidence)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.hasConflicts ? (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{item.conflictCount} conflict{item.conflictCount !== 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Valid</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {onViewEvidence && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewEvidence(item)}
                            className="flex items-center space-x-1"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>View</span>
                          </Button>
                        )}
                        
                        {onDownloadEvidence && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDownloadEvidence(item)}
                            className="flex items-center space-x-1"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Download</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
    </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredItems.length)} of {filteredItems.length} results
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}