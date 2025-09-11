'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  WifiIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { 
  getDuplicateResults, 
  generateSmartSuggestions,
  getSystemStatus
} from '@/services/firebaseFunctions'
import { 
  getIntegrationStatus,
  getBookingIngestionStatus
} from '@/services/integrationService'
import { useAuth } from '@/contexts/AuthContext'

interface Alert {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  message: string
  timestamp: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

interface AlertListProps {
  className?: string
}

export function AlertList({ className = '' }: AlertListProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  // Fetch real data from backend
  const { data: duplicates, isLoading: duplicatesLoading } = useQuery({
    queryKey: ['duplicates'],
    queryFn: getDuplicateResults,
    enabled: !!user
  })

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: generateSmartSuggestions,
    enabled: !!user
  })

  const { data: systemStatus, isLoading: systemLoading } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: getSystemStatus,
    enabled: !!user
  })

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

  const isLoading = duplicatesLoading || suggestionsLoading || systemLoading || integrationLoading || bookingLoading

  // Generate alerts from real backend data
  const generateAlerts = (): Alert[] => {
    const alerts: Alert[] = []

    // Duplicate detection alerts
    if (duplicates?.data && duplicates.data.length > 0) {
      duplicates.data.forEach((duplicate: any) => {
        alerts.push({
          id: `duplicate-${duplicate.id}`,
          type: 'warning',
          title: 'Duplicate Data Detected',
          message: `Found ${duplicate.stamps?.length || 2} similar entries that may be duplicates. Please review.`,
          timestamp: duplicate.detectedAt || new Date().toISOString(),
          action: {
            label: 'Review Duplicates',
            onClick: () => router.push('/travel/evidence')
          },
          dismissible: true
        })
      })
    }

    // Data quality issues from suggestions
    if (suggestions?.data) {
      const { conflictingData, potentialGaps } = suggestions.data

      if (conflictingData && conflictingData.length > 0) {
        conflictingData.forEach((conflict: any, index: number) => {
          alerts.push({
            id: `conflict-${index}`,
            type: 'error',
            title: 'Data Conflict Detected',
            message: conflict.description || 'Conflicting travel data found. Please resolve.',
            timestamp: new Date().toISOString(),
            action: {
              label: 'Resolve Conflict',
              onClick: () => router.push('/travel/timeline')
            },
            dismissible: false
          })
        })
      }

      if (potentialGaps && potentialGaps.length > 0) {
        potentialGaps.forEach((gap: any, index: number) => {
          alerts.push({
            id: `gap-${index}`,
            type: 'info',
            title: 'Potential Data Gap',
            message: gap.description || 'Gap in travel data detected. Consider uploading additional documents.',
            timestamp: new Date().toISOString(),
            action: {
              label: 'Upload Documents',
              onClick: () => router.push('/travel/evidence')
            },
            dismissible: true
          })
        })
      }
    }

    // Integration status alerts
    if (integrationStatus && Array.isArray(integrationStatus)) {
      integrationStatus.forEach((integration: any) => {
        if (!integration.isConnected) {
          alerts.push({
            id: `integration-${integration.provider}`,
            type: 'warning',
            title: `${integration.provider.toUpperCase()} Not Connected`,
            message: `Connect your ${integration.provider} account to automatically import travel data.`,
            timestamp: new Date().toISOString(),
            action: {
              label: 'Connect Account',
              onClick: () => router.push('/integrations')
            },
            dismissible: true
          })
        }
      })
    }

    // System status alerts
    if (systemStatus?.status?.firestore === 'disconnected') {
      alerts.push({
        id: 'system-error',
        type: 'error',
        title: 'System Connection Issue',
        message: 'Unable to connect to the database. Some features may be unavailable.',
        timestamp: new Date().toISOString(),
        dismissible: false
      })
    }

    // Recent ingestion success
    if (bookingStatus && Array.isArray(bookingStatus) && bookingStatus.length > 0) {
      const latestIngestion = bookingStatus
        .filter(status => status.lastIngested)
        .sort((a, b) => new Date(b.lastIngested!).getTime() - new Date(a.lastIngested!).getTime())[0]
      
      if (latestIngestion) {
        const lastIngested = new Date(latestIngestion.lastIngested!)
        const hoursSinceIngestion = (new Date().getTime() - lastIngested.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceIngestion < 24) {
          const totalBookings = bookingStatus.reduce((sum, status) => sum + status.totalBookings, 0)
          alerts.push({
            id: 'recent-ingestion',
            type: 'success',
            title: 'New Data Imported',
            message: `Successfully imported ${totalBookings} booking confirmations.`,
            timestamp: latestIngestion.lastIngested!,
            action: {
              label: 'View Data',
              onClick: () => router.push('/travel/evidence')
            },
            dismissible: true
          })
        }
      }
    }

    return alerts.filter(alert => !dismissedAlerts.has(alert.id))
  }

  const alerts = generateAlerts()

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return ExclamationTriangleIcon
      case 'info':
        return InformationCircleIcon
      case 'success':
        return CheckCircleIcon
      case 'error':
        return ExclamationTriangleIcon
      default:
        return InformationCircleIcon
    }
  }

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(Array.from(prev).concat(alertId)))
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

  if (alerts.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No alerts or notifications at this time.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
          {alerts.length > 0 && (
            <button
              onClick={() => setDismissedAlerts(new Set(alerts.map(a => a.id)))}
              className="text-sm text-brand-primary hover:underline"
            >
              Dismiss all
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert.type)
          return (
            <div
              key={alert.id}
              className={`px-4 py-3 rounded-md ring-1 ring-border-light bg-bg-primary relative overflow-hidden`}
            >
              {/* Left status bar */}
              <div
                className={`absolute inset-y-0 left-0 w-1 rounded-l-md ${
                  alert.type === 'warning'
                    ? 'bg-warning-400/30'
                    : alert.type === 'success'
                    ? 'bg-success-500/30'
                    : alert.type === 'error'
                    ? 'bg-error-500/30'
                    : 'bg-primary-500/30'
                }`}
              />
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon
                    className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      alert.type === 'warning'
                        ? 'text-warning-400'
                        : alert.type === 'success'
                        ? 'text-success-500'
                        : alert.type === 'error'
                        ? 'text-error-500'
                        : 'text-status-info'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-xs text-text-tertiary">
                        <ClockIcon className="h-3 w-3" />
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      {alert.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={alert.action.onClick}
                          className="text-xs"
                        >
                          {alert.action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {alert.dismissible && (
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-2 flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
