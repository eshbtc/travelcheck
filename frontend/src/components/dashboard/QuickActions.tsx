'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { 
  PlusIcon, 
  DocumentTextIcon, 
  EnvelopeIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { 
  ingestGmailBookings,
  ingestOffice365Bookings,
  getIntegrationStatus
} from '@/services/integrationService'
import { supabaseService, generateUniversalReport } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export function QuickActions() {
  const { user } = useAuth()
  const router = useRouter()
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Get integration status
  const { data: integrationStatus, isLoading: integrationLoading } = useQuery({
    queryKey: ['integrationStatus'],
    queryFn: getIntegrationStatus,
    enabled: !!user
  })

  // Gmail ingestion mutation
  const gmailIngestionMutation = useMutation({
    mutationFn: () => ingestGmailBookings({
      providers: ['gmail'],
      lookbackDays: 30,
      maxResults: 100
    }),
    onSuccess: (result) => {
      toast.success(`Gmail sync completed: ${result.bookingsFound} bookings found`)
    },
    onError: (error: any) => {
      toast.error(`Gmail sync failed: ${error.message}`)
    }
  })

  // Office365 ingestion mutation
  const office365IngestionMutation = useMutation({
    mutationFn: () => ingestOffice365Bookings({
      providers: ['office365'],
      lookbackDays: 30,
      maxResults: 100
    }),
    onSuccess: (result) => {
      toast.success(`Office 365 sync completed: ${result.bookingsFound} bookings found`)
    },
    onError: (error: any) => {
      toast.error(`Office 365 sync failed: ${error.message}`)
    }
  })

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: () => generateUniversalReport({
      reportType: { category: 'citizenship', purpose: 'US Naturalization' },
      country: 'United States',
      dateRange: { 
        start: '2020-01-01', 
        end: new Date().toISOString().split('T')[0] 
      },
      includeEvidence: true,
      includeConflicts: true
    }),
    onSuccess: () => {
      toast.success('Report generated successfully!')
      router.push('/reports/history')
    },
    onError: (error: any) => {
      toast.error(`Report generation failed: ${error.message}`)
    }
  })

  const handleUploadPassport = () => {
    router.push('/travel/evidence')
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      await generateReportMutation.mutateAsync()
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleSyncEmail = async () => {
    if (!integrationStatus || integrationStatus.length === 0) {
      toast.error('No email integrations connected')
      router.push('/integrations')
      return
    }

    const connectedProviders = integrationStatus.filter(i => i.isConnected)
    if (connectedProviders.length === 0) {
      toast.error('No email accounts connected')
      router.push('/integrations')
      return
    }

    // Sync all connected providers
    const syncPromises = connectedProviders.map(integration => {
      if (integration.provider === 'gmail') {
        return gmailIngestionMutation.mutateAsync()
      } else if (integration.provider === 'office365') {
        return office365IngestionMutation.mutateAsync()
      }
      return Promise.resolve()
    })

    try {
      await Promise.all(syncPromises)
      toast.success('All email accounts synced successfully!')
    } catch (error) {
      toast.error('Some email accounts failed to sync')
    }
  }

  const isAnyIngestionLoading = gmailIngestionMutation.isPending || office365IngestionMutation.isPending

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-text-primary mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          variant="primary" 
          className="flex items-center justify-center space-x-2"
          onClick={handleUploadPassport}
        >
          <PlusIcon className="h-5 w-5" />
          <span>Upload Passport</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex items-center justify-center space-x-2"
          onClick={handleGenerateReport}
          disabled={isGeneratingReport}
        >
          {isGeneratingReport ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <DocumentTextIcon className="h-5 w-5" />
          )}
          <span>{isGeneratingReport ? 'Generating...' : 'Generate Report'}</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex items-center justify-center space-x-2"
          onClick={handleSyncEmail}
          disabled={isAnyIngestionLoading || integrationLoading}
        >
          {isAnyIngestionLoading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <EnvelopeIcon className="h-5 w-5" />
          )}
          <span>{isAnyIngestionLoading ? 'Syncing...' : 'Sync Email'}</span>
        </Button>
      </div>
      
      {/* Integration status indicator */}
      {integrationStatus && integrationStatus.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-light">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Email Integrations:</span>
            <div className="flex items-center space-x-2">
              {integrationStatus.map((integration) => (
                <div key={integration.provider} className="flex items-center space-x-1">
                  {integration.isConnected ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-gray-300" />
                  )}
                  <span className="text-xs capitalize">{integration.provider}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
