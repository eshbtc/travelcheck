'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, isValid } from 'date-fns'
import { 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Skeleton, SkeletonTable } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { getBookingIngestionStatus } from '@/services/integrationService'
import { useAuth } from '@/contexts/AuthContext'

interface IngestLogTableProps {
  className?: string
}

interface IngestLogEntry {
  id: string
  provider: string
  timestamp: string
  status: 'success' | 'error' | 'pending' | 'partial'
  emailsProcessed: number
  bookingsFound: number
  duplicates: number
  errors: number
  duration: number
  lastProcessed?: string
  errorMessage?: string
}

export function IngestLogTable({ className = '' }: IngestLogTableProps) {
  const { user } = useAuth()
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Fetch ingestion status from backend
  const { data: ingestionStatus, isLoading, error } = useQuery({
    queryKey: ['ingestionLogs'],
    queryFn: getBookingIngestionStatus,
    enabled: !!user,
    refetchInterval: 30000 // Refetch every 30 seconds for real-time updates
  })

  // Transform backend data into log entries
  const logEntries = useMemo((): IngestLogEntry[] => {
    if (!Array.isArray(ingestionStatus)) return []

    return ingestionStatus.map((status, index) => ({
      id: `${status.provider}-${index}`,
      provider: status.provider,
      timestamp: status.lastIngested || new Date().toISOString(),
      status: status.lastError ? 'error' : status.isIngesting ? 'pending' : 'success',
      emailsProcessed: status.totalEmails,
      bookingsFound: status.totalBookings,
      duplicates: 0, // Not available in current backend response
      errors: status.lastError ? 1 : 0,
      duration: 0, // Not available in current backend response
      lastProcessed: status.lastIngested,
      errorMessage: status.lastError
    }))
  }, [ingestionStatus])

  // Filter entries based on selected filters
  const filteredEntries = useMemo(() => {
    return logEntries.filter(entry => {
      const providerMatch = selectedProvider === 'all' || entry.provider === selectedProvider
      const statusMatch = selectedStatus === 'all' || entry.status === selectedStatus
      return providerMatch && statusMatch
    })
  }, [logEntries, selectedProvider, selectedStatus])

  // Get unique providers for filter
  const providers = useMemo(() => {
    const uniqueProviders = Array.from(new Set(logEntries.map(entry => entry.provider)))
    return uniqueProviders
  }, [logEntries])

  const getStatusIcon = (status: IngestLogEntry['status']) => {
    switch (status) {
      case 'success':
        return CheckCircleIcon
      case 'error':
        return ExclamationTriangleIcon
      case 'pending':
        return ArrowPathIcon
      case 'partial':
        return InformationCircleIcon
      default:
        return ClockIcon
    }
  }

  const getStatusColor = (status: IngestLogEntry['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'pending':
        return 'text-blue-600 bg-blue-50'
      case 'partial':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: IngestLogEntry['status']) => {
    switch (status) {
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      case 'pending':
        return 'Processing'
      case 'partial':
        return 'Partial'
      default:
        return 'Unknown'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Ingestion Logs</h3>
        </div>
        <SkeletonTable />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Logs</h3>
          <p className="text-gray-600">Failed to load ingestion logs. Please try again.</p>
        </div>
      </Card>
    )
  }

  if (logEntries.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Ingestion Logs</h3>
          <p className="text-gray-600">No email ingestion has been performed yet.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ingestion Logs</h3>
          <p className="text-sm text-gray-600">
            {filteredEntries.length} of {logEntries.length} entries
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Providers</option>
          {providers.map(provider => (
            <option key={provider} value={provider}>
              {provider.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="pending">Processing</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Emails
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bookings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntries.map((entry) => {
              const StatusIcon = getStatusIcon(entry.status)
              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {entry.provider}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {getStatusLabel(entry.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isValid(parseISO(entry.timestamp)) 
                      ? format(parseISO(entry.timestamp), 'MMM dd, yyyy HH:mm')
                      : 'Unknown'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.emailsProcessed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.bookingsFound.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.errors}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {entry.errorMessage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Show error details in a modal or toast
                          console.log('Error details:', entry.errorMessage)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Error
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Emails</p>
              <p className="text-2xl font-bold text-blue-900">
                {logEntries.reduce((sum, entry) => sum + entry.emailsProcessed, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Bookings Found</p>
              <p className="text-2xl font-bold text-green-900">
                {logEntries.reduce((sum, entry) => sum + entry.bookingsFound, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Total Errors</p>
              <p className="text-2xl font-bold text-red-900">
                {logEntries.reduce((sum, entry) => sum + entry.errors, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Last Ingestion</p>
              <p className="text-sm font-bold text-purple-900">
                {logEntries.length > 0 
                  ? format(parseISO(logEntries[0].timestamp), 'MMM dd, HH:mm')
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
