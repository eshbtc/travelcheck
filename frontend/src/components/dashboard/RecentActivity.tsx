'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  DocumentTextIcon,
  CloudArrowDownIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { 
  getBookingIngestionStatus,
  getIntegrationStatus
} from '@/services/integrationService'
import { UniversalTravelService } from '@/services/universalService'
import { useAuth } from '@/contexts/AuthContext'

interface ActivityItem {
  id: string
  type: 'report' | 'ingestion' | 'travel' | 'conflict' | 'sync'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'pending'
  metadata?: {
    country?: string
    days?: number
    provider?: string
  }
}

interface RecentActivityProps {
  className?: string
}

export function RecentActivity({ className = '' }: RecentActivityProps) {
  const { user } = useAuth()
  const router = useRouter()

  // Fetch real data from backend
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['recentReports'],
    queryFn: () => new UniversalTravelService().listUniversalReports(5),
    enabled: !!user
  })

  const { data: bookingStatus, isLoading: bookingLoading } = useQuery({
    queryKey: ['bookingStatus'],
    queryFn: getBookingIngestionStatus,
    enabled: !!user
  })

  const { data: integrationStatus, isLoading: integrationLoading } = useQuery({
    queryKey: ['integrationStatus'],
    queryFn: getIntegrationStatus,
    enabled: !!user
  })

  // Generate activities from real backend data
  const generateActivities = (): ActivityItem[] => {
    const activities: ActivityItem[] = []

    // Add recent reports
    if (Array.isArray(reports)) {
      reports.forEach((report, index) => {
        activities.push({
          id: `report-${report.id || `report_${Date.now()}_${index}`}`,
          type: 'report',
          title: `${report.reportType?.purpose || 'Travel'} Report Generated`,
          description: `Report for ${report.country} covering ${report.dateRange?.start} to ${report.dateRange?.end}`,
          timestamp: report.generatedAt || new Date().toISOString(),
          status: 'success',
          metadata: {
            country: report.country,
            days: report.data?.summary?.totalPresenceDays || 0
          }
        })
      })
    }

    // Add recent ingestion activities
    if (Array.isArray(bookingStatus)) {
      bookingStatus.forEach((status, index) => {
        if (status.lastIngested) {
          activities.push({
            id: `ingestion-${status.provider}-${index}`,
            type: 'ingestion',
            title: `${status.provider.toUpperCase()} Bookings Synced`,
            description: `Found ${status.totalBookings} booking confirmations`,
            timestamp: status.lastIngested,
            status: status.lastError ? 'error' : 'success',
            metadata: {
              provider: status.provider
            }
          })
        }
      })
    }

    // Add integration connection activities
    if (Array.isArray(integrationStatus)) {
      integrationStatus.forEach((integration, index) => {
        if (integration.isConnected && integration.lastConnected) {
          activities.push({
            id: `sync-${integration.provider}-${index}`,
            type: 'sync',
            title: `${integration.provider.toUpperCase()} Connected`,
            description: `Successfully connected to ${integration.provider} account`,
            timestamp: integration.lastConnected,
            status: 'success',
            metadata: {
              provider: integration.provider
            }
          })
        }
      })
    }

    // Sort by timestamp (most recent first) and limit to 6 items
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
  }

  const activities = generateActivities()

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'report':
        return DocumentTextIcon
      case 'ingestion':
        return CloudArrowDownIcon
      case 'travel':
        return PlusIcon
      case 'conflict':
        return ExclamationTriangleIcon
      case 'sync':
        return ClockIcon
      default:
        return CheckCircleIcon
    }
  }

  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return CheckCircleIcon
      case 'warning':
        return ExclamationTriangleIcon
      case 'error':
        return ExclamationTriangleIcon
      case 'pending':
        return ClockIcon
      default:
        return CheckCircleIcon
    }
  }

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'error':
        return 'text-red-600'
      case 'pending':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }
  }

  const getActivityTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'report':
        return 'Report'
      case 'ingestion':
        return 'Data Sync'
      case 'travel':
        return 'Travel'
      case 'conflict':
        return 'Conflict'
      case 'sync':
        return 'Integration'
      default:
        return 'Activity'
    }
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600">Latest updates and changes</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/reports/history')}
        >
          View All
          <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const ActivityIcon = getActivityIcon(activity.type)
          const StatusIcon = getStatusIcon(activity.status)
          
          return (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ActivityIcon className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {getActivityTypeLabel(activity.type)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {activity.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-text-tertiary">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {formatTimestamp(activity.timestamp)}
                    </span>
                    {activity.metadata?.country && (
                      <span>• {activity.metadata.country}</span>
                    )}
                    {activity.metadata?.days && (
                      <span>• {activity.metadata.days} days</span>
                    )}
                    {activity.metadata?.provider && (
                      <span>• {activity.metadata.provider}</span>
                    )}
                  </div>
                  
                  <StatusIcon className={`h-4 w-4 ${getStatusColor(activity.status)}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
