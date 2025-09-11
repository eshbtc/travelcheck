'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  IntegrationCard, 
  ProviderFilters, 
  IngestControls, 
  IngestLogTable 
} from '@/components/integrations'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  CogIcon,
  ClockIcon,
  BellIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useIntegrations, useConnectionStatus, useIngestionReadiness } from '@/hooks/useIntegrations'
import type { IngestParams } from '@/services/integrationService'

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [selectedProviders, setSelectedProviders] = useState<string[]>([
    'booking.com',
    'hotels.com',
    'airbnb',
    'marriott',
    'hilton'
  ])
  const [lookbackDays, setLookbackDays] = useState(365)

  // Use the integration hooks
  const {
    integrationStatus,
    ingestionStatus,
    schedulePrefs,
    connectGmail,
    connectOffice365,
    disconnectGmail,
    disconnectOffice365,
    ingestGmail,
    ingestOffice365,
    updateSchedulePreferences,
    isLoading,
    isConnecting,
    isDisconnecting,
    isIngesting,
    isUpdatingSchedule,
    error,
    connectionError,
    disconnectionError,
    ingestionError,
    scheduleError
  } = useIntegrations()

  const { isGmailConnected, isOffice365Connected, gmailStatus, office365Status } = useConnectionStatus()
  const { canIngestGmail, canIngestOffice365, canIngestAny, needsConnection, needsProviders } = useIngestionReadiness(selectedProviders)

  const handleProviderToggle = (provider: string) => {
    setSelectedProviders(prev => 
      prev.includes(provider) 
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    )
  }

  const handleSelectAllProviders = () => {
    setSelectedProviders([
      'booking.com',
      'hotels.com',
      'airbnb',
      'marriott',
      'hilton'
    ])
  }

  const handleSelectNoneProviders = () => {
    setSelectedProviders([])
  }

  const handleConnect = async (provider: 'gmail' | 'office365') => {
    if (provider === 'gmail') {
      connectGmail()
    } else {
      connectOffice365()
    }
  }

  const handleReconnect = async (provider: 'gmail' | 'office365') => {
    // For now, reconnect is the same as connect
    await handleConnect(provider)
  }

  const handleRevoke = async (provider: 'gmail' | 'office365') => {
    if (provider === 'gmail') {
      disconnectGmail()
    } else {
      disconnectOffice365()
    }
  }

  const handleIngestGmail = async () => {
    const params: IngestParams = {
      providers: selectedProviders,
      lookbackDays
    }
    ingestGmail(params)
  }

  const handleIngestOffice365 = async () => {
    const params: IngestParams = {
      providers: selectedProviders,
      lookbackDays
    }
    ingestOffice365(params)
  }

  const handleRefreshStatus = () => {
    // React Query will handle the refresh automatically
    window.location.reload()
  }

  const handleScheduleToggle = async (type: 'daily' | 'evening') => {
    if (!schedulePrefs.data) return
    
    const newPrefs = {
      ...schedulePrefs.data,
      [type]: !schedulePrefs.data[type]
    }
    updateSchedulePreferences(newPrefs)
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Please log in to manage your integrations</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Loading integration status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-red-600">Failed to load integrations: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600">Connect your email accounts and manage booking ingestion</p>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IntegrationCard
          provider="gmail"
          isConnected={isGmailConnected}
          lastConnected={gmailStatus?.lastConnected}
          scopes={gmailStatus?.scopes}
          onConnect={() => handleConnect('gmail')}
          onReconnect={() => handleReconnect('gmail')}
          onRevoke={() => handleRevoke('gmail')}
        />
        
        <IntegrationCard
          provider="office365"
          isConnected={isOffice365Connected}
          lastConnected={office365Status?.lastConnected}
          scopes={office365Status?.scopes}
          onConnect={() => handleConnect('office365')}
          onReconnect={() => handleReconnect('office365')}
          onRevoke={() => handleRevoke('office365')}
        />
      </div>

      {/* Provider Filters */}
      <ProviderFilters
        selectedProviders={selectedProviders}
        onProviderToggle={handleProviderToggle}
        onSelectAll={handleSelectAllProviders}
        onSelectNone={handleSelectNoneProviders}
      />

      {/* Ingest Controls */}
      <IngestControls
        selectedProviders={selectedProviders}
        lookbackDays={lookbackDays}
        onLookbackChange={setLookbackDays}
        onIngestGmail={handleIngestGmail}
        onIngestOffice365={handleIngestOffice365}
        isGmailConnected={isGmailConnected}
        isOffice365Connected={isOffice365Connected}
      />

      {/* Schedule Preferences */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ClockIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Automatic Ingestion Schedule</h3>
        </div>
        
        {schedulePrefs.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Daily Morning</div>
                  <div className="text-sm text-gray-600">Automatically ingest new bookings at 6:00 AM</div>
                </div>
              </div>
              <Button
                variant={schedulePrefs.data.daily ? "primary" : "outline"}
                size="sm"
                onClick={() => handleScheduleToggle('daily')}
                disabled={isUpdatingSchedule}
              >
                {schedulePrefs.data.daily ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BellIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Evening Check</div>
                  <div className="text-sm text-gray-600">Automatically ingest new bookings at 6:00 PM</div>
                </div>
              </div>
              <Button
                variant={schedulePrefs.data.evening ? "primary" : "outline"}
                size="sm"
                onClick={() => handleScheduleToggle('evening')}
                disabled={isUpdatingSchedule}
              >
                {schedulePrefs.data.evening ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading schedule preferences...</div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <CheckCircleIcon className="h-4 w-4 inline mr-1 text-green-500" />
            Schedule preferences are automatically saved and will be respected by the ingestion system.
          </div>
        </div>
      </Card>

      {/* Ingest Status */}
      <IngestLogTable />
    </div>
  )
}