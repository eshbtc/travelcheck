'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, subYears, startOfYear, endOfYear } from 'date-fns'
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { universalTravelService } from '@/services/universalService'
import { toast } from 'react-hot-toast'
import type { ReportType, UniversalReport, PresenceDay } from '@/types/universal'

interface ReportFormProps {
  onReportGenerated?: (report: UniversalReport) => void
  className?: string
}

interface ReportFormData {
  purpose: string
  category: 'citizenship' | 'tax_residency' | 'visa_application' | 'travel_summary' | 'custom'
  country: string
  dateRange: {
    start: string
    end: string
  }
  evaluateAsOf: string
  attributionPolicy: 'midnight' | 'any-presence'
  includes: {
    evidence: boolean
    conflicts: boolean
    exemptions: boolean
  }
  customRules?: any
}

const REPORT_CATEGORIES = {
  citizenship: {
    label: 'Citizenship & Naturalization',
    description: 'US Naturalization, UK citizenship, etc.',
    icon: CheckCircleIcon,
    color: 'blue'
  },
  tax_residency: {
    label: 'Tax Residency',
    description: 'Tax residency determination',
    icon: DocumentTextIcon,
    color: 'green'
  },
  visa_application: {
    label: 'Visa Application',
    description: 'Schengen, UK visa requirements',
    icon: MapPinIcon,
    color: 'purple'
  },
  travel_summary: {
    label: 'Travel Summary',
    description: 'General travel history overview',
    icon: CalendarIcon,
    color: 'indigo'
  },
  custom: {
    label: 'Custom Report',
    description: 'Custom rules and requirements',
    icon: SparklesIcon,
    color: 'orange'
  }
}

const COMMON_COUNTRIES = [
  'United States',
  'United Kingdom', 
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Canada',
  'Australia',
  'Japan'
]

const QUICK_DATE_RANGES = {
  'last-year': {
    label: 'Last 12 Months',
    getValue: () => ({
      start: format(subYears(new Date(), 1), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  'current-year': {
    label: 'Current Year',
    getValue: () => ({
      start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      end: format(endOfYear(new Date()), 'yyyy-MM-dd')
    })
  },
  'last-2-years': {
    label: 'Last 2 Years',
    getValue: () => ({
      start: format(subYears(new Date(), 2), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  }
}

export function ReportForm({
  onReportGenerated,
  className = ''
}: ReportFormProps) {
  const [formData, setFormData] = useState<ReportFormData>({
    purpose: '',
    category: 'citizenship',
    country: 'United States',
    dateRange: QUICK_DATE_RANGES['last-year'].getValue(),
    evaluateAsOf: format(new Date(), 'yyyy-MM-dd'),
    attributionPolicy: 'midnight',
    includes: {
      evidence: true,
      conflicts: true,
      exemptions: true
    }
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [previewReport, setPreviewReport] = useState<UniversalReport | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [showWhyDrawer, setShowWhyDrawer] = useState(false)

  const generatePreview = useCallback(async () => {
    if (!formData.purpose || !formData.country) return

    setIsPreviewLoading(true)
    try {
      const reportType: ReportType = {
        category: formData.category,
        purpose: formData.purpose,
        requirements: getRequirementsForCategory(formData.category)
      }

      const report = await universalTravelService.generateUniversalReport(
        reportType,
        formData.country,
        formData.dateRange,
        {
          includeEvidence: formData.includes.evidence,
          includeConflicts: formData.includes.conflicts,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          customRules: formData.customRules
        }
      )

      setPreviewReport(report)
    } catch (error) {
      console.error('Error generating preview:', error)
      // Don't show error toast for preview failures
    } finally {
      setIsPreviewLoading(false)
    }
  }, [formData])

  // Auto-generate preview when form changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.purpose && formData.country && formData.dateRange.start && formData.dateRange.end) {
        generatePreview()
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [formData, generatePreview])

  const getRequirementsForCategory = (category: string): string[] => {
    switch (category) {
      case 'citizenship':
        return ['physical_presence', 'continuous_residence']
      case 'tax_residency':
        return ['days_present', 'tax_home']
      case 'visa_application':
        return ['days_present', 'entry_exit_records']
      case 'travel_summary':
        return ['travel_history', 'presence_summary']
      default:
        return ['presence_summary']
    }
  }

  const handleGenerateReport = async () => {
    if (!formData.purpose || !formData.country) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsGenerating(true)
    try {
      const reportType: ReportType = {
        category: formData.category,
        purpose: formData.purpose,
        requirements: getRequirementsForCategory(formData.category)
      }

      const report = await universalTravelService.generateUniversalReport(
        reportType,
        formData.country,
        formData.dateRange,
        {
          includeEvidence: formData.includes.evidence,
          includeConflicts: formData.includes.conflicts,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          customRules: formData.customRules
        }
      )

      onReportGenerated?.(report)
      toast.success('Report generated successfully!')
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleQuickDateRange = (rangeKey: keyof typeof QUICK_DATE_RANGES) => {
    setFormData(prev => ({
      ...prev,
      dateRange: QUICK_DATE_RANGES[rangeKey].getValue()
    }))
  }

  const getComplianceStatus = () => {
    if (!previewReport?.data?.ruleEvaluations) return null
    
    const evaluations = previewReport.data.ruleEvaluations
    const passed = evaluations.filter(e => e.met).length
    const total = evaluations.length
    
    return {
      passed,
      total,
      percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
      status: passed === total ? 'compliant' : passed > 0 ? 'partial' : 'non-compliant'
    }
  }

  const compliance = getComplianceStatus()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Form */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Generate Report</h2>
              <p className="text-sm text-gray-600">Create a comprehensive travel and presence report</p>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Purpose *
            </label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              placeholder="e.g., US Naturalization Application"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Category *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(REPORT_CATEGORIES).map(([key, category]) => {
                const CategoryIcon = category.icon
                const isSelected = formData.category === key
                
                return (
                  <button
                    key={key}
                    onClick={() => setFormData(prev => ({ ...prev, category: key as any }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected 
                        ? `border-${category.color}-500 bg-${category.color}-50` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CategoryIcon className={`h-5 w-5 ${
                        isSelected ? `text-${category.color}-600` : 'text-gray-400'
                      }`} />
                      <div>
                        <div className={`font-medium ${
                          isSelected ? `text-${category.color}-900` : 'text-gray-900'
                        }`}>
                          {category.label}
                        </div>
                        <div className="text-sm text-gray-600">{category.description}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Country *
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMMON_COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range *
            </label>
            
            {/* Quick Date Ranges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(QUICK_DATE_RANGES).map(([key, range]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateRange(key as keyof typeof QUICK_DATE_RANGES)}
                  className="text-xs"
                >
                  {range.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.dateRange.start}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.dateRange.end}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Evaluate As Of */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluate As Of
            </label>
            <input
              type="date"
              value={formData.evaluateAsOf}
              onChange={(e) => setFormData(prev => ({ ...prev, evaluateAsOf: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              The date to evaluate compliance against (defaults to today)
            </p>
          </div>

          {/* Attribution Policy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attribution Policy
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  value="midnight"
                  checked={formData.attributionPolicy === 'midnight'}
                  onChange={(e) => setFormData(prev => ({ ...prev, attributionPolicy: e.target.value as any }))}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium">Midnight Rule</div>
                  <div className="text-sm text-gray-600">Count day if present at midnight</div>
                </div>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  value="any-presence"
                  checked={formData.attributionPolicy === 'any-presence'}
                  onChange={(e) => setFormData(prev => ({ ...prev, attributionPolicy: e.target.value as any }))}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium">Any Presence</div>
                  <div className="text-sm text-gray-600">Count day if present at any time</div>
                </div>
              </label>
            </div>
          </div>

          {/* Includes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include in Report
            </label>
            <div className="space-y-2">
              {Object.entries(formData.includes).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      includes: { ...prev.includes, [key]: e.target.checked }
                    }))}
                    className="text-blue-600"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || !formData.purpose || !formData.country}
              className="w-full flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Generate Report</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Live Preview */}
      {formData.purpose && formData.country && (
    <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <EyeIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
            </div>
            {compliance && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWhyDrawer(true)}
                className="flex items-center space-x-2"
              >
                <InformationCircleIcon className="h-4 w-4" />
                <span>Why?</span>
              </Button>
            )}
          </div>

          {isPreviewLoading ? (
            <Skeleton className="h-32" />
          ) : previewReport ? (
            <div className="space-y-4">
              {/* Compliance Status */}
              {compliance && (
                <div className={`p-4 rounded-lg border-2 ${
                  compliance.status === 'compliant' 
                    ? 'border-green-200 bg-green-50' 
                    : compliance.status === 'partial'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    {compliance.status === 'compliant' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : compliance.status === 'partial' ? (
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <div className={`font-semibold ${
                        compliance.status === 'compliant' 
                          ? 'text-green-900' 
                          : compliance.status === 'partial'
                          ? 'text-yellow-900'
                          : 'text-red-900'
                      }`}>
                        {compliance.status === 'compliant' 
                          ? 'Compliant' 
                          : compliance.status === 'partial'
                          ? 'Partially Compliant'
                          : 'Non-Compliant'
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        {compliance.passed} of {compliance.total} requirements met ({compliance.percentage}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Total Days</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {previewReport.data?.presenceCalendar?.length || 0}
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Countries</div>
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(previewReport.data?.presenceCalendar?.map(d => d.country)).size || 0}
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-orange-900">Conflicts</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {previewReport.data?.conflicts?.length || 0}
                  </div>
                </div>
              </div>

              {/* Date Range Summary */}
              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {format(new Date(formData.dateRange.start), 'MMM dd, yyyy')} - {format(new Date(formData.dateRange.end), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPinIcon className="h-4 w-4" />
                  <span>Target: {formData.country}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<EyeIcon className="h-12 w-12 text-gray-400" />}
              title="No Preview Available"
              description="Fill in the form above to see a live preview of your report."
            />
          )}
    </Card>
      )}
    </div>
  )
}