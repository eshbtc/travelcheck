'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface PrivacySettings {
  dataRetentionDays: number
  shareAnalytics: boolean
  allowResearch: boolean
  exportFormats: string[]
}

interface PrivacyControlsProps {
  className?: string
}

export function PrivacyControls({ className = '' }: PrivacyControlsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [settings, setSettings] = useState<PrivacySettings | null>(null)

  // Load privacy settings on mount
  useEffect(() => {
    loadPrivacySettings()
  }, [])

  const loadPrivacySettings = async () => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await getPrivacySettings()
      // setSettings(response.data)
      
      // Mock data for now
      const mockSettings: PrivacySettings = {
        dataRetentionDays: 365,
        shareAnalytics: false,
        allowResearch: false,
        exportFormats: ['json', 'csv']
      }
      setSettings(mockSettings)
    } catch (error) {
      console.error('Error loading privacy settings:', error)
      toast.error('Failed to load privacy settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetentionChange = async (days: number) => {
    try {
      setIsSaving(true)
      // TODO: Replace with actual API call
      // await updateDataRetention(days)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSettings(prev => prev ? { ...prev, dataRetentionDays: days } : null)
      toast.success('Data retention period updated')
    } catch (error) {
      console.error('Error updating retention:', error)
      toast.error('Failed to update data retention')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnalyticsToggle = async (enabled: boolean) => {
    try {
      setIsSaving(true)
      // TODO: Replace with actual API call
      // await updateAnalyticsSharing(enabled)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSettings(prev => prev ? { ...prev, shareAnalytics: enabled } : null)
      toast.success(`Analytics sharing ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error updating analytics:', error)
      toast.error('Failed to update analytics settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResearchToggle = async (enabled: boolean) => {
    try {
      setIsSaving(true)
      // TODO: Replace with actual API call
      // await updateResearchParticipation(enabled)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSettings(prev => prev ? { ...prev, allowResearch: enabled } : null)
      toast.success(`Research participation ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error updating research settings:', error)
      toast.error('Failed to update research settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      setIsExporting(true)
      // TODO: Replace with actual API call
      // const response = await exportUserData()
      // const blob = new Blob([response.data], { type: 'application/zip' })
      // const url = window.URL.createObjectURL(blob)
      // const a = document.createElement('a')
      // a.href = url
      // a.download = `travelcheck-data-${new Date().toISOString().split('T')[0]}.zip`
      // a.click()
      
      // Mock export for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Data export completed. Download will start shortly.')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      // TODO: Replace with actual API call
      // await deleteUserAccount()
      
      // Mock delete for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Account deletion initiated. You will receive a confirmation email.')
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Privacy & Data</h3>
      </div>

      <div className="space-y-6">
        {/* Data Retention */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="h-4 w-4 inline mr-1" />
            Data Retention Period
          </label>
          <div className="flex items-center space-x-4">
            <select
              value={settings?.dataRetentionDays || 365}
              onChange={(e) => handleRetentionChange(Number(e.target.value))}
              disabled={isSaving}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={0}>Keep indefinitely</option>
            </select>
            {isSaving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Your data will be automatically deleted after this period. This helps protect your privacy.
          </p>
        </div>

        {/* Analytics Sharing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share Analytics Data
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleAnalyticsToggle(!settings?.shareAnalytics)}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings?.shareAnalytics ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings?.shareAnalytics ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {settings?.shareAnalytics ? 'Enabled' : 'Disabled'}
            </span>
            {isSaving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Help improve TravelCheck by sharing anonymous usage data. No personal information is included.
          </p>
        </div>

        {/* Research Participation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allow Research Participation
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleResearchToggle(!settings?.allowResearch)}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings?.allowResearch ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings?.allowResearch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {settings?.allowResearch ? 'Enabled' : 'Disabled'}
            </span>
            {isSaving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Allow anonymized data to be used for travel pattern research and immigration policy studies.
          </p>
        </div>

        {/* Data Export */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Data Export</h4>
          <p className="text-sm text-gray-600 mb-3">
            Download all your data in a portable format. This includes travel history, reports, and settings.
          </p>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center space-x-2"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>{isExporting ? 'Exporting...' : 'Export My Data'}</span>
          </Button>
        </div>

        {/* Account Deletion */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Danger Zone</h4>
          <p className="text-sm text-gray-600 mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete Account</span>
            </Button>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-red-900">Are you absolutely sure?</h5>
                  <p className="text-sm text-red-700 mt-1">
                    This will permanently delete your account and all data. This action cannot be undone.
                  </p>
                  <div className="flex space-x-3 mt-3">
                    <Button
                      variant="primary"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}