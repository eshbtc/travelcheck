'use client'

import React, { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { 
  MapIcon, 
  MapPinIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PresenceDay } from '@/types/universal'
import { MapboxTravelMap } from './MapboxTravelMap'

interface PresenceMapProps {
  presenceDays: PresenceDay[]
  isLoading?: boolean
  onLocationClick?: (location: MapLocation) => void
  className?: string
}

interface MapLocation {
  id: string
  country: string
  coordinates: { lat: number; lng: number }
  presenceDays: PresenceDay[]
  totalDays: number
  hasConflicts: boolean
  conflictCount: number
  dateRange: { start: string; end: string }
  confidence: number
}

// Basic country coordinates (in a real app, you'd use a proper geocoding service)
const COUNTRY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  'United States': { lat: 39.8283, lng: -98.5795 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Argentina': { lat: -38.4161, lng: -63.6167 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Egypt': { lat: 26.0975, lng: 30.0444 },
  'Turkey': { lat: 38.9637, lng: 35.2433 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'Thailand': { lat: 15.8700, lng: 100.9925 },
  'Singapore': { lat: 1.3521, lng: 103.8198 }
}

export function PresenceMap({
  presenceDays = [],
  isLoading = false,
  onLocationClick,
  className = ''
}: PresenceMapProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [mapView, setMapView] = useState<'countries' | 'timeline'>('countries')
  const [mapStyle, setMapStyle] = useState<'light' | 'dark' | 'streets' | 'satellite' | 'outdoors'>('light')
  const [showRoutes, setShowRoutes] = useState(true)
  const [animateRoutes, setAnimateRoutes] = useState(true)

  // Group presence days by country
  const mapLocations = useMemo(() => {
    const countryMap = new Map<string, PresenceDay[]>()
    
    presenceDays.forEach(day => {
      if (!countryMap.has(day.country)) {
        countryMap.set(day.country, [])
      }
      countryMap.get(day.country)!.push(day)
    })

    const locations: MapLocation[] = []
    
    countryMap.forEach((days, country) => {
      const coordinates = COUNTRY_COORDINATES[country] || { lat: 0, lng: 0 }
      const hasConflicts = days.some(day => day.conflicts && day.conflicts.length > 0)
      const conflictCount = days.reduce((sum, day) => sum + (day.conflicts?.length || 0), 0)
      const confidence = days.reduce((sum, day) => sum + day.confidence, 0) / days.length
      
      const sortedDays = days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const dateRange = {
        start: sortedDays[0].date,
        end: sortedDays[sortedDays.length - 1].date
      }

      locations.push({
        id: country,
        country,
        coordinates,
        presenceDays: days,
        totalDays: days.length,
        hasConflicts,
        conflictCount,
        dateRange,
        confidence
      })
    })

    return locations.sort((a, b) => b.totalDays - a.totalDays)
  }, [presenceDays])

  // Filter locations
  const filteredLocations = useMemo(() => {
    return mapLocations.filter(location => {
      if (selectedCountry !== 'all' && location.country !== selectedCountry) {
        return false
      }
      if (showConflictsOnly && !location.hasConflicts) {
        return false
      }
      return true
    })
  }, [mapLocations, selectedCountry, showConflictsOnly])

  // Get countries for filter dropdown
  const countries = useMemo(() => {
    return mapLocations.map(location => location.country).sort()
  }, [mapLocations])

  // Build simple routes between consecutive country changes
  const routeSegments = useMemo(() => {
    const sorted = [...presenceDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const segs: Array<{ id: string; from: { lat: number; lng: number }; to: { lat: number; lng: number } }> = []
    let lastCountry: string | null = null
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i].country
      if (!lastCountry) { lastCountry = c; continue }
      if (c !== lastCountry) {
        const from = COUNTRY_COORDINATES[lastCountry]
        const to = COUNTRY_COORDINATES[c]
        if (from && to) {
          segs.push({ id: `${lastCountry}-${c}-${i}`, from, to })
        }
        lastCountry = c
      }
    }
    return segs
  }, [presenceDays])

  const getLocationColor = (location: MapLocation) => {
    if (location.hasConflicts) return 'text-orange-600 bg-orange-100 border-orange-300'
    if (location.confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-300'
    if (location.confidence >= 0.6) return 'text-yellow-600 bg-yellow-100 border-yellow-300'
    return 'text-red-600 bg-red-100 border-red-300'
  }

  const getLocationSize = (location: MapLocation) => {
    if (location.totalDays >= 30) return 'w-8 h-8'
    if (location.totalDays >= 10) return 'w-6 h-6'
    if (location.totalDays >= 5) return 'w-5 h-5'
    return 'w-4 h-4'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (presenceDays.length === 0) {
    return (
      <EmptyState
        icon={<MapIcon className="h-12 w-12 text-gray-400" />}
        title="No Travel Data"
        description="No presence data available for the map view."
      />
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Presence Map</h2>
          <p className="text-sm text-gray-600">
            Travel locations and presence data
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={mapView === 'countries' ? "primary" : "outline"}
            size="sm"
            onClick={() => setMapView('countries')}
          >
            Countries
          </Button>
          <Button
            variant={mapView === 'timeline' ? "primary" : "outline"}
            size="sm"
            onClick={() => setMapView('timeline')}
          >
            Timeline
          </Button>
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

          <div className="ml-auto flex items-center space-x-3">
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Map Style"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="streets">Streets</option>
              <option value="outdoors">Outdoors</option>
              <option value="satellite">Satellite</option>
            </select>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
              <span>Routes</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={animateRoutes} onChange={(e) => setAnimateRoutes(e.target.checked)} />
              <span>Animate</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Map Container */}
      <Card className="p-6">
        <MapboxTravelMap
          locations={filteredLocations.map(l => ({
            id: l.id,
            country: l.country,
            coordinates: l.coordinates,
            totalDays: l.totalDays,
            hasConflicts: l.hasConflicts,
            confidence: l.confidence,
          }))}
          styleId={mapStyle}
          routes={routeSegments}
          showRoutes={showRoutes}
          animateRoutes={animateRoutes}
          onLocationClick={(id) => {
            const loc = filteredLocations.find(l => l.id === id)
            if (loc) onLocationClick?.(loc)
          }}
        />
      </Card>

      {/* Location List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map(location => (
          <Card
            key={location.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onLocationClick?.(location)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <h3 className="font-medium text-gray-900">{location.country}</h3>
              </div>
              
              {location.hasConflicts && (
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
              )}
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4" />
                <span>{location.totalDays} days</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-medium">Date Range:</span>
                <span>
                  {isValid(parseISO(location.dateRange.start)) 
                    ? format(parseISO(location.dateRange.start), 'MMM dd')
                    : location.dateRange.start
                  } - {isValid(parseISO(location.dateRange.end)) 
                    ? format(parseISO(location.dateRange.end), 'MMM dd, yyyy')
                    : location.dateRange.end
                  }
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-medium">Confidence:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  location.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                  location.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {Math.round(location.confidence * 100)}%
                </span>
              </div>
              
              {location.hasConflicts && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>{location.conflictCount} conflicts</span>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onLocationClick?.(location)
                }}
              >
                <EyeIcon className="h-4 w-4" />
                <span>View Details</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Countries Visited</p>
              <p className="text-2xl font-bold text-gray-900">{mapLocations.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {mapLocations.reduce((sum, loc) => sum + loc.totalDays, 0)}
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
              <p className="text-sm font-medium text-gray-600">Countries with Conflicts</p>
              <p className="text-2xl font-bold text-gray-900">
                {mapLocations.filter(loc => loc.hasConflicts).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  mapLocations.reduce((sum, loc) => sum + loc.confidence, 0) / 
                  Math.max(1, mapLocations.length) * 100
                )}%
              </p>
            </div>
          </div>
    </Card>
      </div>
    </div>
  )
}
