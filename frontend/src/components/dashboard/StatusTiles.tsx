'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { 
  getBookingIngestionStatus, 
  getIntegrationStatus
} from '@/services/integrationService'
import { universalTravelService } from '@/services/universalService'
import { useAuth } from '@/contexts/AuthContext'

interface StatusTile {
  id: string
  title: string
  value: string | number
  status: 'success' | 'warning' | 'error' | 'info'
  icon: React.ComponentType<{ className?: string }>
  description?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
}

interface StatusTilesProps {
  className?: string
  loading?: boolean
}

export function StatusTiles({ className = '', loading = false }: StatusTilesProps) {
  const { user } = useAuth()

  // Fetch real data from backend
  const { data: integrationStatus, isLoading: integrationLoading } = useQuery({
    queryKey: ['integrationStatus'],
    queryFn: getIntegrationStatus,
    enabled: !!user
  })

  const { data: bookingStatus, isLoading: bookingLoading } = useQuery({
    queryKey: ['bookingStatus'],
    queryFn: getBookingIngestionStatus,
    enabled: !!user
  })

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => universalTravelService.listUniversalReports(10),
    enabled: !!user
  })

  const { data: travelData, isLoading: travelLoading } = useQuery({
    queryKey: ['travelData'],
    queryFn: () => universalTravelService.generateUniversalReport(
      {
        category: 'travel_summary',
        purpose: 'Dashboard Status',
        requirements: []
      },
      'Global',
      { 
        start: '2020-01-01', 
        end: new Date().toISOString().split('T')[0] 
      },
      {
        includeEvidence: false,
        includeConflicts: false,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    ),
    enabled: !!user
  })

  const isLoading = loading || integrationLoading || bookingLoading || reportsLoading || travelLoading

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4 rounded-xl h-28 ring-1 ring-border-light bg-bg-primary animate-pulse" />
        ))}
      </div>
    )
  }

  // Calculate real metrics from backend data
  const travelSummary = travelData?.summary
  const totalPresenceDays = travelSummary?.totalDays || 0
  const totalCountries = travelSummary?.uniqueCountries || 0
  const totalReports = Array.isArray(reports) ? reports.length : 0
  const connectedIntegrations = Array.isArray(integrationStatus) ? integrationStatus.filter(i => i.isConnected).length : 0
  const totalIntegrations = Array.isArray(integrationStatus) ? integrationStatus.length : 0
  const lastIngestedAt = Array.isArray(bookingStatus) && bookingStatus.length > 0 ? bookingStatus[0].lastIngested : null
  const totalBookings = Array.isArray(bookingStatus) ? bookingStatus.reduce((sum, status) => sum + status.totalBookings, 0) : 0

  // Format last sync time
  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const tiles: StatusTile[] = [
    {
      id: 'travel-days',
      title: 'Total Travel Days',
      value: totalPresenceDays,
      status: totalPresenceDays > 0 ? 'success' : 'info',
      icon: CalendarIcon,
      description: 'Days tracked across all countries',
      trend: { value: 0, direction: 'neutral' }
    },
    {
      id: 'countries',
      title: 'Countries Visited',
      value: totalCountries,
      status: totalCountries > 0 ? 'success' : 'info',
      icon: GlobeAltIcon,
      description: 'Unique countries in travel history',
      trend: { value: 0, direction: 'neutral' }
    },
    {
      id: 'reports',
      title: 'Reports Generated',
      value: totalReports,
      status: totalReports > 0 ? 'success' : 'info',
      icon: DocumentTextIcon,
      description: 'Total reports created',
      trend: { value: 0, direction: 'neutral' }
    },
    {
      id: 'integrations',
      title: 'Connected Integrations',
      value: `${connectedIntegrations}/${totalIntegrations}`,
      status: connectedIntegrations === totalIntegrations ? 'success' : 
              connectedIntegrations > 0 ? 'warning' : 'error',
      icon: UserGroupIcon,
      description: 'Email accounts connected',
      trend: { value: 0, direction: 'neutral' }
    },
    {
      id: 'bookings',
      title: 'Parsed Bookings',
      value: totalBookings,
      status: totalBookings > 0 ? 'success' : 'info',
      icon: ChartBarIcon,
      description: 'Hotel bookings extracted',
      trend: { value: 0, direction: 'neutral' }
    },
    {
      id: 'last-sync',
      title: 'Last Sync',
      value: formatLastSync(lastIngestedAt || null),
      status: lastIngestedAt ? 'success' : 'warning',
      icon: ClockIcon,
      description: 'Email integration',
      trend: { value: 0, direction: 'neutral' }
    }
  ]

  const getIconColor = (status: StatusTile['status']) => {
    switch (status) {
      case 'success':
        return 'text-success-500'
      case 'warning':
        return 'text-warning-400'
      case 'error':
        return 'text-error-500'
      case 'info':
      default:
        return 'text-status-info'
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      case 'neutral':
      default:
        return '→'
    }
  }

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'neutral':
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
          <Card key={tile.id} className={`px-6 py-4 rounded-xl min-h-[128px] h-auto overflow-hidden ring-1 ring-border-light hover:ring-border-medium transition-colors`}>
            <div className="flex items-start justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`h-5 w-5 ${getIconColor(tile.status)}`} />
                  <h3 className="text-xs uppercase tracking-wide text-text-secondary leading-5">{tile.title}</h3>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-1 truncate">
                  {tile.value}
                </div>
                {tile.description && (
                  <p className="text-sm text-gray-600 mb-2 truncate max-w-full">{tile.description}</p>
                )}
                {tile.id === 'last-sync' && (
                  <div className="text-xs text-text-tertiary truncate">Last updated just now</div>
                )}
                {tile.trend && tile.trend.value > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs font-medium ${getTrendColor(tile.trend.direction)}`}>
                      {getTrendIcon(tile.trend.direction)} {tile.trend.value}
                    </span>
                    <span className="text-xs text-gray-500">vs last period</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
