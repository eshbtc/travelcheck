'use client'

import React, { useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { UniversalReport } from '@/types/universal'

interface ReportPreviewProps {
  report: UniversalReport
  onExport?: (format: 'json' | 'pdf') => void
  onViewEvidence?: (evidence: any) => void
  className?: string
}

export function ReportPreview({
  report,
  onExport,
  onViewEvidence,
  className = ''
}: ReportPreviewProps) {
  const [showWhyDrawer, setShowWhyDrawer] = useState(false)

  const ruleEvaluations = report.data?.ruleEvaluations || []
  const presenceDays = report.data?.presenceCalendar || []
  const conflicts = report.data?.conflicts || []

  const getComplianceStatus = () => {
    const passed = ruleEvaluations.filter(e => e.met).length
    const total = ruleEvaluations.length
    
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Preview</h2>
          <p className="text-gray-600">
            Generated on {format(new Date(report.generatedAt), 'MMM dd, yyyy \'at\' h:mm a')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWhyDrawer(true)}
            className="flex items-center space-x-2"
          >
            <InformationCircleIcon className="h-4 w-4" />
            <span>Why?</span>
          </Button>
          
          {onExport && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('json')}
                className="flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>JSON</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                className="flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>PDF</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Status */}
      {compliance && (
        <Card className="p-6">
          <div className={`p-4 rounded-lg border-2 ${
            compliance.status === 'compliant' 
              ? 'border-green-200 bg-green-50' 
              : compliance.status === 'partial'
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center space-x-4">
              {compliance.status === 'compliant' ? (
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              ) : compliance.status === 'partial' ? (
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              ) : (
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              )}
              <div>
                <div className={`text-xl font-bold ${
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
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Days</p>
              <p className="text-2xl font-bold text-gray-900">{presenceDays.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(presenceDays.map(d => d.country)).size}
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
              <p className="text-sm font-medium text-gray-600">Conflicts</p>
              <p className="text-2xl font-bold text-gray-900">{conflicts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Evidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.data?.evidence?.length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Rule Evaluations */}
    <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rule Evaluations</h3>
        <div className="space-y-3">
          {ruleEvaluations.map((evaluation, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {evaluation.met ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {evaluation.ruleName || `Rule ${index + 1}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {evaluation.required} required, {evaluation.actual} actual
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                evaluation.met 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {evaluation.met ? 'PASS' : 'FAIL'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Why Drawer */}
      {showWhyDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowWhyDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <InformationCircleIcon className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Why This Result?</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWhyDrawer(false)}
                  className="flex items-center space-x-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span>Close</span>
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Rule Evaluations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rule Evaluations</h3>
                  <div className="space-y-3">
                    {ruleEvaluations.map((evaluation, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {evaluation.met ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                              ) : (
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                              )}
                              <span className="font-medium text-gray-900">
                                {evaluation.ruleName || `Rule ${index + 1}`}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-2">
                              {evaluation.details?.description || 'Rule evaluation result'}
                            </div>
                            
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>Required: {evaluation.required || 'N/A'}</div>
                              <div>Actual: {evaluation.actual || 'N/A'}</div>
                              {evaluation.details?.confidence && (
                                <div>Confidence: {Math.round(evaluation.details.confidence * 100)}%</div>
                              )}
                              {evaluation.details?.version && (
                                <div>Rule Version: {evaluation.details.version}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            evaluation.met 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {evaluation.met ? 'PASSED' : 'FAILED'}
                          </div>
                        </div>
    </Card>
                    ))}
                  </div>
                </div>

                {/* Presence Days Used */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Presence Days Used</h3>
                  <div className="space-y-2">
                    {presenceDays.slice(0, 10).map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {isValid(parseISO(day.date)) 
                                ? format(parseISO(day.date), 'MMM dd, yyyy')
                                : day.date
                              }
                            </div>
                            <div className="text-xs text-gray-600">{day.country}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            day.confidence >= 0.8 
                              ? 'bg-green-100 text-green-800'
                              : day.confidence >= 0.6
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {Math.round(day.confidence * 100)}%
                          </span>
                          {day.conflicts && day.conflicts.length > 0 && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    {presenceDays.length > 10 && (
                      <div className="text-sm text-gray-500 text-center py-2">
                        ... and {presenceDays.length - 10} more days
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence Sources */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidence Sources</h3>
                  <div className="space-y-2">
                    {report.data?.evidence?.slice(0, 5).map((evidence, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {evidence.type || 'Evidence'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {evidence.source || 'Unknown source'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {evidence.checksum?.substring(0, 8) || 'N/A'}
                          </span>
                          {onViewEvidence && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewEvidence(evidence)}
                              className="flex items-center space-x-1"
                            >
                              <EyeIcon className="h-3 w-3" />
                              <span>View</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!report.data?.evidence || report.data.evidence.length === 0) && (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No evidence data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Conflicts */}
                {conflicts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Conflicts Detected</h3>
                    <div className="space-y-2">
                      {conflicts.slice(0, 5).map((conflict, index) => (
                        <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-900">
                              {conflict.type || 'Conflict'}
                            </span>
                          </div>
                          <div className="text-xs text-orange-700">
                            Sources: {conflict.sources?.join(', ') || 'Unknown'}
                          </div>
                          {conflict.resolution && (
                            <div className="text-xs text-orange-600 mt-1">
                              Resolution: {conflict.resolution}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attribution Policy */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Attribution Policy</h3>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-900">
                      <strong>Policy:</strong> {ruleEvaluations[0]?.attributionPolicy || 'Midnight Rule'}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      {ruleEvaluations[0]?.attributionPolicy === 'midnight' 
                        ? 'Days are counted if present at midnight'
                        : 'Days are counted if present at any time during the day'
                      }
                    </div>
                  </div>
                </div>

                {/* Data Quality */}
                {report.data?.summary?.dataQuality && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">Completeness</div>
                        <div className="text-xs text-gray-600">
                          {Math.round((report.data.summary.dataQuality.completeness || 0) * 100)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">Confidence</div>
                        <div className="text-xs text-gray-600">
                          {Math.round((report.data.summary.dataQuality.confidence || 0) * 100)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">Conflicts</div>
                        <div className="text-xs text-gray-600">
                          {report.data.summary.dataQuality.conflicts || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">Gaps</div>
                        <div className="text-xs text-gray-600">
                          {report.data.summary.dataQuality.gaps || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}