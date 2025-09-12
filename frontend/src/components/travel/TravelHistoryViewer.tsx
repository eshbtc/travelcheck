'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  DocumentTextIcon,
  PhotoIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { 
  getPassportScans,
  getFlightEmails,
  analyzeEnhancedTravelHistory
} from '@/services/supabaseService'
import { toast } from 'react-hot-toast'
import type { PassportScan, FlightEmail } from '@/types/universal'

interface TravelHistoryViewerProps {
  onItemSelect?: (item: any) => void
  className?: string
}

interface TravelItem {
  id: string
  type: 'passport' | 'flight' | 'booking'
  date: string
  country: string
  source: string
  confidence?: number
  data: any
  createdAt: Date
}

export function TravelHistoryViewer({
  onItemSelect,
  className = ''
}: TravelHistoryViewerProps) {
  const [travelItems, setTravelItems] = useState<TravelItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'country' | 'confidence'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const loadTravelHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load all data sources in parallel
      const [passportResult, flightResult] = await Promise.all([
        getPassportScans(),
        getFlightEmails()
      ])

      const items: TravelItem[] = []

      // Process passport scans
      if (passportResult.success && passportResult.data) {
        passportResult.data.forEach((scan: PassportScan) => {
          if (scan.analysis_results?.stamps && Array.isArray(scan.analysis_results.stamps)) {
            scan.analysis_results.stamps.forEach((stamp: any) => {
              items.push({
                id: `${scan.id}-${stamp.date || 'unknown'}`,
                type: 'passport',
                date: stamp.date || 'Unknown',
                country: stamp.country || 'Unknown',
                source: 'Passport Scan',
                confidence: stamp.confidence || 95,
                data: { scan, stamp },
                createdAt: new Date(scan.created_at || Date.now())
              })
            })
          }
        })
      }

      // Process flight emails
      if (flightResult.success && flightResult.data) {
        flightResult.data.forEach((email: FlightEmail) => {
          if (email.parsed_data) {
            items.push({
              id: email.id,
              type: 'flight',
              date: email.parsed_data.departureDate || email.parsed_data.date || 'Unknown',
              country: email.parsed_data.destination || email.parsed_data.country || 'Unknown',
              source: 'Flight Email',
              confidence: 85,
              data: email,
              createdAt: new Date(email.created_at || Date.now())
            })
          }
        })
      }

      // Sort items
      items.sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
            break
          case 'country':
            comparison = a.country.localeCompare(b.country)
            break
          case 'confidence':
            comparison = (a.confidence || 0) - (b.confidence || 0)
            break
        }
        return sortOrder === 'asc' ? comparison : -comparison
      })

      setTravelItems(items)
    } catch (error) {
      console.error('Error loading travel history:', error)
      toast.error('Failed to load travel history')
    } finally {
      setIsLoading(false)
    }
  }, [sortBy, sortOrder])

  useEffect(() => {
    loadTravelHistory()
  }, [loadTravelHistory])

  const filteredItems = travelItems.filter(item => {
    const matchesType = selectedType === 'all' || item.type === selectedType
    const matchesCountry = selectedCountry === 'all' || item.country.toLowerCase().includes(selectedCountry.toLowerCase())
    const matchesSearch = searchQuery === '' || 
      item.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesType && matchesCountry && matchesSearch
  })

  const countries = Array.from(new Set(travelItems.map(item => item.country))).sort()
  const typeCounts = {
    all: travelItems.length,
    passport: travelItems.filter(item => item.type === 'passport').length,
    flight: travelItems.filter(item => item.type === 'flight').length,
    booking: travelItems.filter(item => item.type === 'booking').length
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'passport': return <PhotoIcon className="h-5 w-5" />
      case 'flight': return <EnvelopeIcon className="h-5 w-5" />
      case 'booking': return <DocumentTextIcon className="h-5 w-5" />
      default: return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'passport': return 'text-blue-600 bg-blue-100'
      case 'flight': return 'text-green-600 bg-green-100'
      case 'booking': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500'
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Travel History</h2>
          <p className="text-gray-600">
            Comprehensive view of all your travel data sources
          </p>
        </div>
        <Button
          onClick={loadTravelHistory}
          variant="outline"
          size="sm"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {typeCounts.passport}
          </div>
          <div className="text-sm text-gray-600">Passport Stamps</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {typeCounts.flight}
          </div>
          <div className="text-sm text-gray-600">Flight Records</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {typeCounts.booking}
          </div>
          <div className="text-sm text-gray-600">Bookings</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-gray-600">
            {countries.length}
          </div>
          <div className="text-sm text-gray-600">Countries</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by country, source, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types ({typeCounts.all})</option>
            <option value="passport">Passport ({typeCounts.passport})</option>
            <option value="flight">Flight ({typeCounts.flight})</option>
            <option value="booking">Booking ({typeCounts.booking})</option>
          </select>

          {/* Country Filter */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Countries</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field as 'date' | 'country' | 'confidence')
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="country-asc">Country (A-Z)</option>
            <option value="country-desc">Country (Z-A)</option>
            <option value="confidence-desc">Confidence (High)</option>
            <option value="confidence-asc">Confidence (Low)</option>
          </select>
        </div>
      </Card>

      {/* Travel Items List */}
      {filteredItems.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<DocumentTextIcon className="h-12 w-12 text-gray-400" />}
            title="No Travel Data"
            description="No travel items found matching your filters. Try adjusting your search criteria."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {item.country}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                        {item.type.toUpperCase()}
                      </span>
                      {item.confidence && (
                        <span className={`text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DocumentTextIcon className="h-3 w-3" />
                        <span>{item.source}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-3 w-3" />
                        <span>Added {item.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => onItemSelect?.(item)}
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    onClick={() => {
                      // TODO: Implement download functionality
                      toast.success('Download functionality coming soon')
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredItems.length > 0 && (
        <Card className="p-4">
          <div className="text-sm text-gray-600 text-center">
            Showing {filteredItems.length} of {travelItems.length} travel items
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </Card>
      )}
    </div>
  )
}
