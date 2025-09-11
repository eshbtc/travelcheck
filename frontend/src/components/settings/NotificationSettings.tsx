'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface NotificationSettings {
  email: boolean
  push: boolean
  reportReady: boolean
  dataConflicts: boolean
  ruleUpdates: boolean
  thresholds: {
    schengen90: number
    schengen180: number
    uk180: number
    uk12m: number
  }
}

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)

  // Load notification settings on mount
  useEffect(() => {
    loadNotificationSettings()
  }, [])

  const loadNotificationSettings = async () => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await getNotificationSettings()
      // setSettings(response.data)
      
      // Mock data for now
      const mockSettings: NotificationSettings = {
        email: true,
        push: false,
        reportReady: true,
        dataConflicts: true,
        ruleUpdates: false,
        thresholds: {
          schengen90: 75,
          schengen180: 90,
          uk180: 150,
          uk12m: 10
        }
      }
      setSettings(mockSettings)
    } catch (error) {
      console.error('Error loading notification settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      setIsSaving(true)
      // TODO: Replace with actual API call
      // await updateNotificationSetting(key, value)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSettings(prev => prev ? { ...prev, [key]: value } : null)
      toast.success('Notification settings updated')
    } catch (error) {
      console.error('Error updating notification settings:', error)
      toast.error('Failed to update notification settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleThresholdChange = async (rule: keyof NotificationSettings['thresholds'], value: number) => {
    try {
      setIsSaving(true)
      // TODO: Replace with actual API call
      // await updateNotificationThreshold(rule, value)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSettings(prev => prev ? {
        ...prev,
        thresholds: { ...prev.thresholds, [rule]: value }
      } : null)
      toast.success('Threshold updated')
    } catch (error) {
      console.error('Error updating threshold:', error)
      toast.error('Failed to update threshold')
    } finally {
      setIsSaving(false)
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
        <BellIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
      </div>

      <div className="space-y-6">
        {/* Notification Channels */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Channels</h4>
          
          <div className="space-y-3">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Email Notifications</div>
                  <div className="text-xs text-gray-600">Receive notifications via email</div>
                </div>
              </div>
              <button
                onClick={() => handleToggle('email', !settings?.email)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.email ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.email ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Push Notifications</div>
                  <div className="text-xs text-gray-600">Receive notifications on your device</div>
                </div>
              </div>
              <button
                onClick={() => handleToggle('push', !settings?.push)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.push ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.push ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Types</h4>
          
          <div className="space-y-3">
            {/* Report Ready */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900">Report Ready</div>
                <div className="text-xs text-gray-600">When your travel report is generated</div>
              </div>
              <button
                onClick={() => handleToggle('reportReady', !settings?.reportReady)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.reportReady ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.reportReady ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Data Conflicts */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900">Data Conflicts</div>
                <div className="text-xs text-gray-600">When conflicting travel data is detected</div>
              </div>
              <button
                onClick={() => handleToggle('dataConflicts', !settings?.dataConflicts)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.dataConflicts ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.dataConflicts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Rule Updates */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900">Rule Updates</div>
                <div className="text-xs text-gray-600">When immigration rules change</div>
              </div>
              <button
                onClick={() => handleToggle('ruleUpdates', !settings?.ruleUpdates)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.ruleUpdates ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.ruleUpdates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Warning Thresholds */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Warning Thresholds</h4>
          <p className="text-sm text-gray-600 mb-4">
            Get notified when you&apos;re approaching limits for different visa rules.
          </p>
          
          <div className="space-y-4">
            {/* Schengen 90/180 */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Schengen 90/180 Rule</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-blue-700 mb-1">90-day warning</label>
                  <select
                    value={settings?.thresholds.schengen90 || 75}
                    onChange={(e) => handleThresholdChange('schengen90', Number(e.target.value))}
                    disabled={isSaving}
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={60}>60 days</option>
                    <option value={70}>70 days</option>
                    <option value={75}>75 days</option>
                    <option value={80}>80 days</option>
                    <option value={85}>85 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-blue-700 mb-1">180-day warning</label>
                  <select
                    value={settings?.thresholds.schengen180 || 90}
                    onChange={(e) => handleThresholdChange('schengen180', Number(e.target.value))}
                    disabled={isSaving}
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={80}>80 days</option>
                    <option value={85}>85 days</option>
                    <option value={90}>90 days</option>
                    <option value={95}>95 days</option>
                    <option value={100}>100 days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* UK 180/12m */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">UK 180/12m Rule</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-purple-700 mb-1">180-day warning</label>
                  <select
                    value={settings?.thresholds.uk180 || 150}
                    onChange={(e) => handleThresholdChange('uk180', Number(e.target.value))}
                    disabled={isSaving}
                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value={140}>140 days</option>
                    <option value={150}>150 days</option>
                    <option value={160}>160 days</option>
                    <option value={170}>170 days</option>
                    <option value={175}>175 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-purple-700 mb-1">12m warning</label>
                  <select
                    value={settings?.thresholds.uk12m || 10}
                    onChange={(e) => handleThresholdChange('uk12m', Number(e.target.value))}
                    disabled={isSaving}
                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value={5}>5 months</option>
                    <option value={8}>8 months</option>
                    <option value={10}>10 months</option>
                    <option value={11}>11 months</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Status */}
        {isSaving && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">Saving settings...</span>
          </div>
        )}
      </div>
    </Card>
  )
}