import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { getUserProfile, updateUserProfile, runDailyEmailSync } from '../../services/firebaseFunctions'
import { toast } from 'react-hot-toast'
import { 
  UserIcon, 
  EnvelopeIcon, 
  BellIcon,
  ShieldCheckIcon,
  CogIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const { user, firebaseUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    email_notifications: true,
    gmail_enabled: false,
    office365_enabled: false
  })
  const [isRunningSync, setIsRunningSync] = useState(false)

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = !!(user?.email && adminEmails.includes((user.email || '').toLowerCase()))

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const result = await getUserProfile()
      if (result.success) {
        setProfile(result.data)
        setFormData({
          full_name: result.data.full_name || '',
          email: result.data.email || '',
          email_notifications: result.data.email_notifications || true,
          gmail_enabled: result.data.gmail_enabled || false,
          office365_enabled: result.data.office365_enabled || false
        })
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
      toast.error('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const result = await updateUserProfile(formData)
      if (result.success) {
        setProfile({ ...profile, ...formData })
        toast.success('Profile updated successfully')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleRunDailySync = async () => {
    if (!user) return
    setIsRunningSync(true)
    const tid = toast.loading('Running daily email sync...')
    try {
      const res = await runDailyEmailSync()
      if (res?.success) {
        toast.success(`Sync completed (checked: ${res.usersChecked ?? 'n/a'}, processed: ${res.processed ?? 'n/a'})`, { id: tid })
      } else {
        toast.success('Sync invoked', { id: tid })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to run daily sync', { id: tid })
    } finally {
      setIsRunningSync(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
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
            <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
            <p className="mt-2 text-text-secondary">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Profile Information */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-text-primary mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </Card>

        {/* Email Integration */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Email Integration</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100">
                  <EnvelopeIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">Gmail Integration</h3>
                  <p className="text-sm text-text-secondary">
                    Connect your Gmail account to automatically parse flight confirmation emails
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="gmail_enabled"
                    checked={formData.gmail_enabled}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/email/gmail')}
                >
                  Configure
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                  <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">Office 365 Integration</h3>
                  <p className="text-sm text-text-secondary">
                    Connect your Office 365 account to parse Outlook emails
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="office365_enabled"
                    checked={formData.office365_enabled}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Admin Tools */}
        {isAdmin && (
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Admin Tools</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-text-primary">Run Daily Email Sync</h3>
                  <p className="text-sm text-text-secondary">Trigger the scheduled email sync job on demand</p>
                </div>
                <Button onClick={handleRunDailySync} disabled={isRunningSync}>
                  {isRunningSync ? 'Running...' : 'Run Now'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Notifications */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BellIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="font-medium text-text-primary">Email Notifications</h3>
                  <p className="text-sm text-text-secondary">
                    Receive email updates about your travel history analysis
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="email_notifications"
                  checked={formData.email_notifications}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-text-primary">Two-Factor Authentication</h3>
                  <p className="text-sm text-text-secondary">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <CogIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="font-medium text-text-primary">Change Password</h3>
                  <p className="text-sm text-text-secondary">
                    Update your account password
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* Account Status */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Account Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-text-primary">Email Verified</h3>
                  <p className="text-sm text-text-secondary">
                    {firebaseUser?.emailVerified ? 'Your email is verified' : 'Please verify your email address'}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                firebaseUser?.emailVerified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {firebaseUser?.emailVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-text-primary">Account Active</h3>
                  <p className="text-sm text-text-secondary">
                    Your account is active and ready to use
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
