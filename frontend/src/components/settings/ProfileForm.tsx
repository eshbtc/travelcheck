'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  UserIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

// Form validation schema
const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name too long'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required')
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserProfile {
  displayName: string
  email: string
  emailVerified: boolean
  timezone: string
  avatarUrl?: string
  createdAt: string
  lastLoginAt: string
}

interface ProfileFormProps {
  className?: string
}

export function ProfileForm({ className = '' }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      email: '',
      timezone: 'UTC'
    }
  })

  // Load profile on mount
  useEffect(() => {
    loadProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await getUserProfile()
      // setProfile(response.data)
      
      // Mock data for now
      const mockProfile: UserProfile = {
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        emailVerified: false,
        timezone: 'America/New_York',
        createdAt: '2024-01-15T10:30:00Z',
        lastLoginAt: '2024-01-20T14:22:00Z'
      }
      setProfile(mockProfile)
      reset({
        displayName: mockProfile.displayName,
        email: mockProfile.email,
        timezone: mockProfile.timezone
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true)
      
      // TODO: Replace with actual API call
      // await updateUserProfile(data)
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProfile(prev => prev ? { ...prev, ...data } : null)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyEmail = async () => {
    try {
      setIsVerifyingEmail(true)
      
      // TODO: Replace with actual API call
      // await sendEmailVerification()
      
      // Mock verification for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Verification email sent! Check your inbox.')
    } catch (error) {
      console.error('Error sending verification email:', error)
      toast.error('Failed to send verification email')
    } finally {
      setIsVerifyingEmail(false)
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
        <UserIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            {...register('displayName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your display name"
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <EnvelopeIcon className="h-4 w-4 inline mr-1" />
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email address"
            />
            {profile?.emailVerified ? (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              </div>
            ) : (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              </div>
            )}
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
          {!profile?.emailVerified && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    Your email address is not verified. Please verify your email to receive important notifications.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyEmail}
                    disabled={isVerifyingEmail}
                    className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                  >
                    {isVerifyingEmail ? 'Sending...' : 'Send Verification Email'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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

        {/* Account Information */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Member since:</span>
              <br />
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Last login:</span>
              <br />
              {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
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
              <span>Save Profile</span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}