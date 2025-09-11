'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ClockIcon,
  GlobeAltIcon,
  LanguageIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

// Form validation schema
const preferencesSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required'),
  dateFormat: z.string().min(1, 'Date format is required'),
  numberFormat: z.string().min(1, 'Number format is required'),
  language: z.string().min(1, 'Language is required'),
  defaultAttributionPolicy: z.enum(['midnight', 'any_presence'], {
    required_error: 'Attribution policy is required'
  })
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

interface UserPreferences {
  timezone: string
  dateFormat: string
  numberFormat: string
  language: string
  defaultAttributionPolicy: 'midnight' | 'any_presence'
}

interface PreferencesFormProps {
  className?: string
}

export function PreferencesForm({ className = '' }: PreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      language: 'en',
      defaultAttributionPolicy: 'midnight'
    }
  })

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await getUserPreferences()
      // setPreferences(response.data)
      
      // Mock data for now
      const mockPreferences: UserPreferences = {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: 'en-US',
        language: 'en',
        defaultAttributionPolicy: 'midnight'
      }
      setPreferences(mockPreferences)
      reset(mockPreferences)
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast.error('Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: PreferencesFormData) => {
    try {
      setIsSaving(true)
      
      // TODO: Replace with actual API call
      // await updateUserPreferences(data)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPreferences(data)
      toast.success('Preferences saved successfully')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save preferences')
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
        <CogIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="h-4 w-4 inline mr-1" />
            Timezone
          </label>
          <select
            {...register('timezone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Shanghai">Shanghai (CST)</option>
          </select>
          {errors.timezone && (
            <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
          )}
        </div>

        {/* Date Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format
          </label>
          <select
            {...register('dateFormat')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            <option value="MMM DD, YYYY">MMM DD, YYYY</option>
            <option value="DD MMM YYYY">DD MMM YYYY</option>
          </select>
          {errors.dateFormat && (
            <p className="mt-1 text-sm text-red-600">{errors.dateFormat.message}</p>
          )}
        </div>

        {/* Number Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number Format
          </label>
          <select
            {...register('numberFormat')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en-US">1,234.56 (US)</option>
            <option value="en-GB">1,234.56 (UK)</option>
            <option value="de-DE">1.234,56 (German)</option>
            <option value="fr-FR">1 234,56 (French)</option>
            <option value="ja-JP">1,234.56 (Japanese)</option>
          </select>
          {errors.numberFormat && (
            <p className="mt-1 text-sm text-red-600">{errors.numberFormat.message}</p>
          )}
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <LanguageIcon className="h-4 w-4 inline mr-1" />
            Language
          </label>
          <select
            {...register('language')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
          </select>
          {errors.language && (
            <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
          )}
        </div>

        {/* Default Attribution Policy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <GlobeAltIcon className="h-4 w-4 inline mr-1" />
            Default Attribution Policy
          </label>
          <select
            {...register('defaultAttributionPolicy')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="midnight">Midnight Rule</option>
            <option value="any_presence">Any Presence</option>
          </select>
          <p className="mt-1 text-sm text-gray-600">
            {watch('defaultAttributionPolicy') === 'midnight' 
              ? 'Days are counted if present at midnight'
              : 'Days are counted if present at any time during the day'
            }
          </p>
          {errors.defaultAttributionPolicy && (
            <p className="mt-1 text-sm text-red-600">{errors.defaultAttributionPolicy.message}</p>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty || isSaving}
            className="flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}