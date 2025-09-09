import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { generateUSCISReport } from '../../services/firebaseFunctions'
import { useAI } from '../../hooks/useAI'
import { toast } from 'react-hot-toast'
import { 
  DocumentTextIcon, 
  ChartBarIcon, 
  ArrowDownTrayIcon as DownloadIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { generateUSCISReport: generateAIReport, isLoading: aiLoading, error: aiError } = useAI()
  const [isGenerating, setIsGenerating] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [useAIEnhancement, setUseAIEnhancement] = useState(true)

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const handleGenerateReport = async (format: 'pdf' | 'json' = 'pdf') => {
    if (!user) return

    setIsGenerating(true)
    try {
      let result: any
      
      if (useAIEnhancement) {
        // Use AI-enhanced report generation
        // First get travel history data, then enhance with AI
        const basicResult = await generateUSCISReport(format)
        if (basicResult.success && basicResult.data?.entries) {
          // Enhance the report data with AI analysis
          const enhancedData = await generateAIReport(basicResult.data.entries)
          result = {
            ...basicResult,
            data: {
              ...basicResult.data,
              ...enhancedData,
              aiEnhanced: true
            }
          }
        } else {
          result = basicResult
        }
      } else {
        // Use standard report generation
        result = await generateUSCISReport(format)
      }
      
      if (result.success) {
        if (format === 'pdf') {
          // Convert data URI or base64 string to Blob if needed
          const toBlob = (input: any): Blob => {
            if (typeof input === 'string' && input.startsWith('data:')) {
              const arr = input.split(',')
              const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf'
              const bstr = atob(arr[1])
              let n = bstr.length
              const u8arr = new Uint8Array(n)
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
              }
              return new Blob([u8arr], { type: mime })
            }
            if (typeof input === 'string') {
              const bstr = atob(input)
              let n = bstr.length
              const u8arr = new Uint8Array(n)
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
              }
              return new Blob([u8arr], { type: 'application/pdf' })
            }
            return new Blob([input], { type: 'application/pdf' })
          }

          const blob = toBlob(result.report)
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `travel-history-report-${new Date().toISOString().split('T')[0]}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          // Handle JSON download
          const blob = new Blob([JSON.stringify(result.report, null, 2)], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `travel-history-report-${new Date().toISOString().split('T')[0]}.json`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
        
        // Add to recent reports
        setRecentReports(prev => [{
          id: result.report.id,
          format,
          generatedAt: new Date().toISOString(),
          fileName: `travel-history-report-${new Date().toISOString().split('T')[0]}.${format}`
        }, ...prev.slice(0, 4)])
        
        toast.success('Report generated successfully')
      }
    } catch (err) {
      console.error('Error generating report:', err)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Reports</h1>
            <p className="mt-2 text-text-secondary">
              Generate USCIS-compliant travel history reports for your citizenship application
            </p>
          </div>
        </div>

        {/* Report Generation */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Generate New Report</h2>
          <p className="text-text-secondary mb-6">
            Create a comprehensive travel history report formatted specifically for USCIS citizenship applications.
          </p>
          
          {/* AI Enhancement Toggle */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">AI Enhancement</h3>
                <p className="text-sm text-blue-700">
                  Use Firebase AI Logic to enhance report accuracy and completeness
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAIEnhancement}
                  onChange={(e) => setUseAIEnhancement(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {aiError && (
              <div className="mt-2 text-sm text-red-600">
                AI Enhancement Warning: {aiError}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100 mr-4">
                  <DocumentTextIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">PDF Report</h3>
                  <p className="text-text-secondary">Formatted document ready for submission</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Professional PDF format with proper formatting, headers, and USCIS-compliant structure.
              </p>
              <Button
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGenerating || aiLoading}
                className="w-full flex items-center justify-center gap-2"
              >
                <DownloadIcon className="h-5 w-5" />
                {isGenerating || aiLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{useAIEnhancement ? 'AI Processing...' : 'Generating...'}</span>
                  </div>
                ) : (
                  `Generate PDF${useAIEnhancement ? ' (AI Enhanced)' : ''}`
                )}
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 mr-4">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">JSON Report</h3>
                  <p className="text-text-secondary">Machine-readable data format</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Structured JSON data that can be imported into other systems or used for further analysis.
              </p>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('json')}
                disabled={isGenerating || aiLoading}
                className="w-full flex items-center justify-center gap-2"
              >
                <DownloadIcon className="h-5 w-5" />
                {isGenerating || aiLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                    <span>{useAIEnhancement ? 'AI Processing...' : 'Generating...'}</span>
                  </div>
                ) : (
                  `Generate JSON${useAIEnhancement ? ' (AI Enhanced)' : ''}`
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Report Features */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Report Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">USCIS Compliant</h3>
                  <p className="text-sm text-text-secondary">Formatted according to USCIS requirements</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">Comprehensive Data</h3>
                  <p className="text-sm text-text-secondary">Includes all travel entries from passport and email sources</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">Cross-Referenced</h3>
                  <p className="text-sm text-text-secondary">Validated against multiple data sources</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">AI Enhanced</h3>
                  <p className="text-sm text-text-secondary">Powered by Firebase AI Logic for improved accuracy</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">Professional Format</h3>
                  <p className="text-sm text-text-secondary">Clean, readable layout with proper headers</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">Date Range Summary</h3>
                  <p className="text-sm text-text-secondary">Clear overview of travel periods</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary">Country List</h3>
                  <p className="text-sm text-text-secondary">Complete list of visited countries</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Reports</h2>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-primary/10">
                      {report.format === 'pdf' ? (
                        <DocumentTextIcon className="h-5 w-5 text-brand-primary" />
                      ) : (
                        <ChartBarIcon className="h-5 w-5 text-brand-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{report.fileName}</p>
                      <p className="text-sm text-text-secondary">
                        Generated {new Date(report.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {report.format.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Help Section */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Need Help?</h2>
          <p className="text-text-secondary mb-4">
            If you need assistance with your travel history or report generation, here are some helpful resources:
          </p>
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              • Make sure you have uploaded passport scans and connected your email accounts
            </p>
            <p className="text-sm text-text-secondary">
              • Review your travel history before generating reports
            </p>
            <p className="text-sm text-text-secondary">
              • Contact USCIS for specific formatting requirements if needed
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
