'use client'

import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { 
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useIngestionStatus } from '@/hooks/useIntegrations'
import { toast } from 'react-hot-toast'

interface IngestStatusTableProps {
  onRefresh: () => void
  className?: string
}

export function IngestStatusTable({
  onRefresh,
  className = ''
}: IngestStatusTableProps) {
  const { data: statuses, isLoading, error, refetch, isFetching } = useIngestionStatus()

  const handleRefresh = () => {
    onRefresh()
    refetch()
  }

  const formatLastIngested = (dateString?: string) => {
    if (!dateString || !isValid(parseISO(dateString))) return 'Never'
    const date = parseISO(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  const getStatusColor = (status: any) => {
    if (status.isIngesting) return 'text-blue-600 bg-blue-50'
    if (status.lastError) return 'text-red-600 bg-red-50'
    if (status.lastIngested) {
      const lastIngested = parseISO(status.lastIngested)
      const hoursSince = (Date.now() - lastIngested.getTime()) / (1000 * 60 * 60)
      if (hoursSince > 24) return 'text-yellow-600 bg-yellow-50'
      return 'text-green-600 bg-green-50'
    }
    return 'text-gray-600 bg-gray-50'
  }

  const getStatusLabel = (status: any) => {
    if (status.isIngesting) return 'Ingesting'
    if (status.lastError) return 'Error'
    if (status.lastIngested) {
      const lastIngested = parseISO(status.lastIngested)
      const hoursSince = (Date.now() - lastIngested.getTime()) / (1000 * 60 * 60)
      if (hoursSince > 24) return 'Stale'
      return 'Active'
    }
    return 'Never'
  }

  if (isLoading) {
    return <SkeletonTable />
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Status</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (!statuses || statuses.length === 0) {
    return (
      <EmptyState
        icon={<DocumentTextIcon className="h-12 w-12 text-gray-400" />}
        title="No Ingest Status"
        description="Start ingesting bookings to see status information here."
      />
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Ingest Status</h3>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center space-x-2"
        >
          {isFetching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          ) : (
            <ArrowPathIcon className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

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
                Last Ingested
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Emails Processed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bookings Found
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statuses.map((status, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {status.provider}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span>{formatLastIngested(status.lastIngested)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                    <span>{status.totalEmails.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span>{status.totalBookings.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success('View details coming soon')}
                      className="flex items-center space-x-1"
                    >
                      <EyeIcon className="h-4 w-4" />
                      <span>Details</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {statuses.reduce((sum, status) => sum + status.totalEmails, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Emails</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {statuses.reduce((sum, status) => sum + status.totalBookings, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {statuses.filter(status => status.lastIngested && !status.lastError).length}
            </div>
            <div className="text-sm text-gray-600">Active Providers</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
