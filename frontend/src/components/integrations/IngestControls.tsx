'use client'

import React, { useState } from 'react'
import { 
  ArrowDownTrayIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

interface IngestControlsProps {
  selectedProviders: string[]
  lookbackDays: number
  onLookbackChange: (days: number) => void
  onIngestGmail: () => Promise<void>
  onIngestOffice365: () => Promise<void>
  isGmailConnected: boolean
  isOffice365Connected: boolean
  className?: string
}

const LOOKBACK_PRESETS = [
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '6 months', value: 180 },
  { label: '1 year', value: 365 },
  { label: '2 years', value: 730 }
]

export function IngestControls({
  selectedProviders,
  lookbackDays,
  onLookbackChange,
  onIngestGmail,
  onIngestOffice365,
  isGmailConnected,
  isOffice365Connected,
  className = ''
}: IngestControlsProps) {
  const [isIngestingGmail, setIsIngestingGmail] = useState(false)
  const [isIngestingOffice365, setIsIngestingOffice365] = useState(false)

  const handleIngestGmail = async () => {
    if (!isGmailConnected) {
      toast.error('Please connect to Gmail first')
      return
    }

    if (selectedProviders.length === 0) {
      toast.error('Please select at least one provider')
      return
    }

    setIsIngestingGmail(true)
    try {
      await onIngestGmail()
      toast.success('Gmail ingestion started successfully')
    } catch (error) {
      console.error('Error ingesting Gmail:', error)
      toast.error('Failed to start Gmail ingestion')
    } finally {
      setIsIngestingGmail(false)
    }
  }

  const handleIngestOffice365 = async () => {
    if (!isOffice365Connected) {
      toast.error('Please connect to Office 365 first')
      return
    }

    if (selectedProviders.length === 0) {
      toast.error('Please select at least one provider')
      return
    }

    setIsIngestingOffice365(true)
    try {
      await onIngestOffice365()
      toast.success('Office 365 ingestion started successfully')
    } catch (error) {
      console.error('Error ingesting Office 365:', error)
      toast.error('Failed to start Office 365 ingestion')
    } finally {
      setIsIngestingOffice365(false)
    }
  }

  const canIngest = selectedProviders.length > 0 && (isGmailConnected || isOffice365Connected)

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <ArrowDownTrayIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Ingest Bookings</h3>
      </div>

      {/* Lookback Period */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lookback Period
        </label>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="1095" // 3 years
              value={lookbackDays}
              onChange={(e) => onLookbackChange(parseInt(e.target.value) || 365)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {LOOKBACK_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                size="sm"
                onClick={() => onLookbackChange(preset.value)}
                className={lookbackDays === preset.value ? 'bg-blue-50 border-blue-300' : ''}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          <CalendarIcon className="h-4 w-4 inline mr-1" />
          Looking back from today: {new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
        </div>
      </div>

      {/* Ingest Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isGmailConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isGmailConnected ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">Gmail</div>
              <div className="text-sm text-gray-600">
                {isGmailConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleIngestGmail}
            disabled={!isGmailConnected || !canIngest || isIngestingGmail}
            className="flex items-center space-x-2"
          >
            {isIngestingGmail ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Ingesting...</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Ingest Gmail</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isOffice365Connected ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isOffice365Connected ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">Office 365</div>
              <div className="text-sm text-gray-600">
                {isOffice365Connected ? 'Connected' : 'Not connected'}
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleIngestOffice365}
            disabled={!isOffice365Connected || !canIngest || isIngestingOffice365}
            className="flex items-center space-x-2"
          >
            {isIngestingOffice365 ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Ingesting...</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Ingest Office 365</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Selected providers: {selectedProviders.length}
            </span>
          </div>
          
          <div className="text-gray-500">
            {canIngest ? (
              <span className="text-green-600">Ready to ingest</span>
            ) : (
              <span className="text-orange-600">Connect accounts and select providers</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}