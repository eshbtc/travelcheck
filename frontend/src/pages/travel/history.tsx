import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { getTravelHistory, analyzeTravelHistory, generateUSCISReport } from '../../services/firebaseFunctions'
import { useAI } from '../../hooks/useAI'
import { toast } from 'react-hot-toast'
import { 
  DocumentTextIcon, 
  ChartBarIcon, 
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function TravelHistoryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { processTravelHistory, crossReferenceData, isLoading: aiLoading, error: aiError } = useAI()
  const [travelHistory, setTravelHistory] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [useAIEnhancement, setUseAIEnhancement] = useState(true)
  const [aiInsights, setAiInsights] = useState<any>(null)

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Load travel history on mount
  useEffect(() => {
    if (user) {
      loadTravelHistory()
    }
  }, [user])

  const loadTravelHistory = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const result = await getTravelHistory()
      if (result.success) {
        setTravelHistory(result.travelHistory)
      }
    } catch (err) {
      console.error('Error loading travel history:', err)
      toast.error('Failed to load travel history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyzeHistory = async () => {
    if (!user) return

    setIsAnalyzing(true)
    try {
      let result = await analyzeTravelHistory()
      
      if (result.success && useAIEnhancement && result.travelHistory?.entries) {
        // Use AI to enhance the travel history analysis
        try {
          const enhancedEntries = await processTravelHistory(result.travelHistory.entries)
          result = {
            ...result,
            travelHistory: {
              ...result.travelHistory,
              entries: enhancedEntries,
              aiEnhanced: true
            }
          }
          
          // Generate AI insights
          const uniqueCountries = Array.from(new Set(enhancedEntries.map((e: any) => e.country)))
          setAiInsights({
            totalTrips: enhancedEntries.length,
            countries: uniqueCountries,
            dateRange: {
              start: enhancedEntries.reduce((min: any, entry: any) => 
                !min || entry.entryDate < min ? entry.entryDate : min, null),
              end: enhancedEntries.reduce((max: any, entry: any) => 
                !max || entry.exitDate > max ? entry.exitDate : max, null)
            },
            confidence: enhancedEntries.reduce((sum: number, entry: any) => 
              sum + (entry.confidence || 0), 0) / enhancedEntries.length
          })
          
          toast.success('Travel history analyzed and enhanced with AI successfully')
        } catch (aiError) {
          console.error('AI enhancement failed:', aiError)
          toast.error('Travel history analyzed, but AI enhancement failed')
        }
      } else {
        toast.success('Travel history analyzed successfully')
      }
      
      setTravelHistory(result.travelHistory)
    } catch (err) {
      console.error('Error analyzing travel history:', err)
      toast.error('Failed to analyze travel history')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerateReport = async (format: 'pdf' | 'json' = 'pdf') => {
    if (!user) return

    setIsGeneratingReport(true)
    try {
      const result = await generateUSCISReport(format)
      if (result.success) {
        if (format === 'pdf') {
          // Convert data URI or base64 string to Blob if needed
          const toBlob = (input: any): Blob => {
            if (typeof input === 'string' && input.startsWith('data:')) {
              // data:application/pdf;base64,....
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
              // Assume base64 payload
              const bstr = atob(input)
              let n = bstr.length
              const u8arr = new Uint8Array(n)
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
              }
              return new Blob([u8arr], { type: 'application/pdf' })
            }
            // Fallback if already binary-like
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
        toast.success('Report generated successfully')
      }
    } catch (err) {
      console.error('Error generating report:', err)
      toast.error('Failed to generate report')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading travel history...</p>
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
            <h1 className="text-3xl font-bold text-text-primary">Travel History</h1>
            <p className="mt-2 text-text-secondary">
              View and manage your international travel records for USCIS applications
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleAnalyzeHistory}
              disabled={isAnalyzing || aiLoading}
              variant="outline"
            >
              {isAnalyzing || aiLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                  <span>{useAIEnhancement ? 'AI Analyzing...' : 'Analyzing...'}</span>
                </div>
              ) : (
                `Analyze History${useAIEnhancement ? ' (AI Enhanced)' : ''}`
              )}
            </Button>
            <Button
              onClick={() => handleGenerateReport('pdf')}
              disabled={isGeneratingReport || !travelHistory}
            >
              {isGeneratingReport ? 'Generating...' : 'Generate PDF Report'}
            </Button>
          </div>
        </div>

        {/* AI Enhancement Toggle */}
        <Card className="p-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">AI Enhancement</h3>
                <p className="text-sm text-blue-700">
                  Use Firebase AI Logic to enhance travel history analysis and validation
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
        </Card>

        {/* AI Insights */}
        {aiInsights && (
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-blue-600 text-lg">🤖</span>
              <h2 className="text-xl font-semibold text-blue-900">AI Insights</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Enhanced
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{aiInsights.totalTrips}</div>
                <div className="text-sm text-blue-700">Total Trips Analyzed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{aiInsights.countries.length}</div>
                <div className="text-sm text-blue-700">Countries Identified</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {Math.round(aiInsights.confidence)}%
                </div>
                <div className="text-sm text-blue-700">Average Confidence</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-blue-700">
              <p><strong>Date Range:</strong> {aiInsights.dateRange.start} to {aiInsights.dateRange.end}</p>
              <p><strong>Countries:</strong> {aiInsights.countries.join(', ')}</p>
            </div>
          </Card>
        )}

        {/* Summary Cards */}
        {travelHistory && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-primary/10 mx-auto mb-4">
                <DocumentTextIcon className="h-6 w-6 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">{travelHistory.totalTrips || 0}</h3>
              <p className="text-text-secondary">Total Trips</p>
            </Card>

            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-accent/10 mx-auto mb-4">
                <MapPinIcon className="h-6 w-6 text-brand-accent" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">{travelHistory.countries?.length || 0}</h3>
              <p className="text-text-secondary">Countries Visited</p>
            </Card>

            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-yellow-500/10 mx-auto mb-4">
                <CalendarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">
                {travelHistory.dateRange?.start ? new Date(travelHistory.dateRange.start).getFullYear() : 'N/A'}
              </h3>
              <p className="text-text-secondary">First Trip</p>
            </Card>

            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-500/10 mx-auto mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">
                {travelHistory.lastUpdated ? 'Updated' : 'Pending'}
              </h3>
              <p className="text-text-secondary">Status</p>
            </Card>
          </div>
        )}

        {/* Travel Entries */}
        {travelHistory && travelHistory.entries && travelHistory.entries.length > 0 ? (
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Travel Entries</h2>
            <div className="space-y-4">
              {travelHistory.entries.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-primary/10">
                      <ClockIcon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {entry.country || 'Unknown Country'}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {entry.date} • {entry.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">
                      {entry.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="text-center" padding="lg">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mx-auto mb-4">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Travel History Found</h3>
            <p className="text-text-secondary mb-6">
              Upload passport scans or connect your email to start building your travel history.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/upload/passport')}>
                Upload Passport
              </Button>
              <Button variant="outline" onClick={() => router.push('/email/gmail')}>
                Connect Email
              </Button>
            </div>
          </Card>
        )}

        {/* Report Generation Options */}
        {travelHistory && (
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Generate Reports</h2>
            <p className="text-text-secondary mb-6">
              Create USCIS-compliant travel history reports for your citizenship application.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGeneratingReport}
                className="flex items-center gap-2"
              >
                <DocumentTextIcon className="h-5 w-5" />
                {isGeneratingReport ? 'Generating...' : 'PDF Report'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('json')}
                disabled={isGeneratingReport}
                className="flex items-center gap-2"
              >
                <ChartBarIcon className="h-5 w-5" />
                {isGeneratingReport ? 'Generating...' : 'JSON Report'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
