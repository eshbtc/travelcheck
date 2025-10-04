'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../../../src/components/ui/Button'
import { toast } from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

interface FlightEmail {
  id: string
  subject: string | null
  sender: string | null
  recipient: string | null
  dateReceived: string | null
  airline: string | null
  flightNumber: string | null
  departureAirport: string | null
  arrivalAirport: string | null
  confirmationNumber: string | null
  confidenceScore: number | null
  isProcessed: boolean
  flightData: any
  emailAccount: {
    email: string
    provider: string
  } | null
}

interface EmailStats {
  total: number
  flightsFound: number
  dateRange: {
    earliest: string | null
    latest: string | null
  }
  byAirline: Array<{
    airline: string
    count: number
  }>
  byConfidence: {
    high: number
    medium: number
    low: number
  }
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<FlightEmail[]>([])
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [airline, setAirline] = useState('')
  const [airport, setAirport] = useState('')
  const [minConfidence, setMinConfidence] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchEmails = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(airline && { airline }),
        ...(airport && { airport }),
        ...(minConfidence && { minConfidence }),
      })

      const response = await fetch(`/api/emails/list?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch emails')
      }

      setEmails(data.emails)
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
    } catch (error) {
      console.error('Error fetching emails:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch emails')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmails()
  }, [page, search, dateFrom, dateTo, airline, airport, minConfidence])

  const handleExport = () => {
    // Convert emails to CSV
    const headers = [
      'Date Received',
      'Subject',
      'Sender',
      'Airline',
      'Flight Number',
      'Departure',
      'Arrival',
      'Confirmation',
      'Confidence',
    ]
    const rows = emails.map((email) => [
      email.dateReceived ? new Date(email.dateReceived).toLocaleString() : '',
      email.subject || '',
      email.sender || '',
      email.airline || '',
      email.flightNumber || '',
      email.departureAirport || '',
      email.arrivalAirport || '',
      email.confirmationNumber || '',
      email.confidenceScore?.toString() || '',
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `emails-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
  }

  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setAirline('')
    setAirport('')
    setMinConfidence('')
    setPage(1)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getConfidenceBadge = (score: number | null) => {
    if (!score) return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">N/A</span>
    if (score >= 0.8) return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">High</span>
    if (score >= 0.5) return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Medium</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Low</span>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingested Emails</h1>
          <p className="text-sm text-gray-600">View and manage your flight booking emails</p>
        </div>
        <Button onClick={handleExport} disabled={emails.length === 0}>
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Emails</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Flights Found</div>
            <div className="text-2xl font-bold text-gray-900">{stats.flightsFound}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Date Range</div>
            <div className="text-sm font-medium text-gray-900">
              {stats.dateRange.earliest && stats.dateRange.latest
                ? `${new Date(stats.dateRange.earliest).toLocaleDateString()} - ${new Date(stats.dateRange.latest).toLocaleDateString()}`
                : 'N/A'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Confidence</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-green-600">High:</span>
                <span className="font-medium">{stats.byConfidence.high}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-600">Medium:</span>
                <span className="font-medium">{stats.byConfidence.medium}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">Low:</span>
                <span className="font-medium">{stats.byConfidence.low}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by subject or sender..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <FunnelIcon className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Airline</label>
              <input
                type="text"
                value={airline}
                onChange={(e) => {
                  setAirline(e.target.value)
                  setPage(1)
                }}
                placeholder="e.g., United, Delta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Airport Code</label>
              <input
                type="text"
                value={airport}
                onChange={(e) => {
                  setAirport(e.target.value)
                  setPage(1)
                }}
                placeholder="e.g., SFO, LAX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Confidence</label>
              <select
                value={minConfidence}
                onChange={(e) => {
                  setMinConfidence(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="0.8">High (0.8+)</option>
                <option value="0.5">Medium (0.5+)</option>
                <option value="0">Low (0+)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Email Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading emails...</div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No emails found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flight
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expand
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {emails.map((email) => (
                  <React.Fragment key={email.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(email.dateReceived)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {email.subject || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {email.sender || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {email.airline ? (
                          <div>
                            <div className="font-medium">{email.airline}</div>
                            {email.flightNumber && (
                              <div className="text-xs text-gray-500">{email.flightNumber}</div>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {email.departureAirport && email.arrivalAirport ? (
                          `${email.departureAirport} → ${email.arrivalAirport}`
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getConfidenceBadge(email.confidenceScore)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setExpandedRow(expandedRow === email.id ? null : email.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ChevronDownIcon
                            className={`h-5 w-5 transition-transform ${
                              expandedRow === email.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                    {expandedRow === email.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Extracted Flight Details
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-600">Confirmation Number</div>
                                  <div className="font-medium text-gray-900">
                                    {email.confirmationNumber || 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Provider</div>
                                  <div className="font-medium text-gray-900">
                                    {email.emailAccount?.provider || 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Account Email</div>
                                  <div className="font-medium text-gray-900">
                                    {email.emailAccount?.email || 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Processed</div>
                                  <div className="font-medium text-gray-900">
                                    {email.isProcessed ? 'Yes' : 'No'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {email.flightData && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                  Raw Flight Data
                                </h4>
                                <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
                                  {JSON.stringify(email.flightData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} emails
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                size="sm"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                size="sm"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
