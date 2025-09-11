'use client'

import React, { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { UniversalReport } from '@/types/universal'

interface ReportHistoryListProps {
  reports: UniversalReport[]
  isLoading?: boolean
  onViewReport?: (report: UniversalReport) => void
  onExportReport?: (report: UniversalReport, format: 'json' | 'pdf') => void
  onDeleteReport?: (report: UniversalReport) => void
  className?: string
}

const REPORT_CATEGORIES = {
  citizenship: { label: 'Citizenship', color: 'blue' },
  tax_residency: { label: 'Tax Residency', color: 'green' },
  visa_application: { label: 'Visa Application', color: 'purple' },
  travel_summary: { label: 'Travel Summary', color: 'indigo' },
  custom: { label: 'Custom', color: 'orange' }
}

export function ReportHistoryList({
  reports = [],
  isLoading = false,
  onViewReport,
  onExportReport,
  onDeleteReport,
  className = ''
}: ReportHistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')

  // Get unique categories and countries for filters
  const categories = useMemo(() => {
    const categorySet = new Set(reports.map(report => report.reportType.category))
    return Array.from(categorySet).sort()
  }, [reports])

  const countries = useMemo(() => {
    const countrySet = new Set(reports.map(report => report.country))
    return Array.from(countrySet).sort()
  }, [reports])

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (selectedCategory !== 'all' && report.reportType.category !== selectedCategory) {
        return false
      }
      if (selectedCountry !== 'all' && report.country !== selectedCountry) {
        return false
      }
      return true
    }).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
  }, [reports, selectedCategory, selectedCountry])

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  const getComplianceStatus = (report: UniversalReport) => {
    const evaluations = report.data?.ruleEvaluations || []
    const passed = evaluations.filter(e => e.met).length
    const total = evaluations.length
    
    if (total === 0) return { status: 'unknown', percentage: 0 }
    
    const percentage = Math.round((passed / total) * 100)
    const status = passed === total ? 'compliant' : passed > 0 ? 'partial' : 'non-compliant'
    
    return { status, percentage }
  }

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50'
      case 'partial': return 'text-yellow-600 bg-yellow-50'
      case 'non-compliant': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getComplianceLabel = (status: string) => {
    switch (status) {
      case 'compliant': return 'Compliant'
      case 'partial': return 'Partial'
      case 'non-compliant': return 'Non-Compliant'
      default: return 'Unknown'
    }
  }

  if (isLoading) {
    return <SkeletonTable />
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<DocumentTextIcon className="h-12 w-12 text-gray-400" />}
        title="No Reports Generated"
        description="Generate your first report to see it here."
      />
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Report History</h2>
          <p className="text-sm text-gray-600">
            {filteredReports.length} reports
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {REPORT_CATEGORIES[category as keyof typeof REPORT_CATEGORIES]?.label || category}
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
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
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
              {paginatedReports.map((report) => {
                const compliance = getComplianceStatus(report)
                
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span>
                          {isValid(parseISO(report.generatedAt)) 
                            ? format(parseISO(report.generatedAt), 'MMM dd, yyyy')
                            : report.generatedAt
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={report.reportType.purpose}>
                        {report.reportType.purpose}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${REPORT_CATEGORIES[report.reportType.category as keyof typeof REPORT_CATEGORIES]?.color || 'gray'}-100 text-${REPORT_CATEGORIES[report.reportType.category as keyof typeof REPORT_CATEGORIES]?.color || 'gray'}-800`}>
                        {REPORT_CATEGORIES[report.reportType.category as keyof typeof REPORT_CATEGORIES]?.label || report.reportType.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span>{report.country}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(compliance.status)}`}>
                        {getComplianceLabel(compliance.status)} ({compliance.percentage}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {onViewReport && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewReport(report)}
                            className="flex items-center space-x-1"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>View</span>
                          </Button>
                        )}
                        
                        {onExportReport && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onExportReport(report, 'json')}
                            className="flex items-center space-x-1"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Export</span>
                          </Button>
                        )}
                        
                        {onDeleteReport && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteReport(report)}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span>Delete</span>
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
            Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} results
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