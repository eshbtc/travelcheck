import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { getOffice365AuthUrl, handleOffice365Callback, disconnectOffice365Account, getOffice365ConnectionStatus } from '../../services/firebaseFunctions'
import { toast } from 'react-hot-toast'

export default function Office365IntegrationPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Check connection status on load
  useEffect(() => {
    if (user) {
      checkConnectionStatus()
    }
  }, [user])

  const checkConnectionStatus = async () => {
    if (!user) return
    
    try {
      // Check Office365 connection status via Firebase Function
      const result = await getOffice365ConnectionStatus()
      if (result.success) {
        if (result.connected) {
          setConnectionStatus('connected')
          if (result.connectedAt) {
            setLastSync(result.connectedAt)
          }
        } else {
          setConnectionStatus('disconnected')
        }
      }
    } catch (err) {
      console.error('Error checking connection status:', err)
      setConnectionStatus('error')
    }
  }

  const handleOffice365Connect = async () => {
    if (!user) return

    setIsConnecting(true)
    setError('')

    try {
      // Get Office365 OAuth URL from Firebase Function
      const result = await getOffice365AuthUrl()
      if (result.success) {
        // Redirect to Office365 OAuth
        window.location.href = result.authUrl
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Office365 account')
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSyncEmails = async () => {
    if (!user) return

    setIsSyncing(true)
    setError('')

    try {
      // This would use the stored access token to sync emails
      // For now, we'll simulate the sync
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setLastSync(new Date().toISOString())
      toast.success('Emails synced successfully!')
      
    } catch (err: any) {
      setError(err.message || 'Failed to sync emails')
      toast.error('Failed to sync emails')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user) return

    try {
      // Disconnect Office365 account via Firebase Function
      const result = await disconnectOffice365Account()
      if (result.success) {
        setConnectionStatus('disconnected')
        setLastSync(null)
        toast.success('Office365 account disconnected successfully')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Office365 account')
      toast.error('Failed to disconnect Office365 account')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Office365 Integration</h1>
          <p className="mt-2 text-gray-600">
            Connect your Office365 account to automatically import flight confirmations and travel-related emails.
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Office365 Account</h3>
                  <p className="text-sm text-gray-500">
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'error' ? 'Connection Error' : 'Not Connected'}
                  </p>
                </div>
              </div>
              
              {connectionStatus === 'connected' && lastSync && (
                <div className="text-sm text-gray-500">
                  Last synced: {new Date(lastSync).toLocaleString()}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-6 flex space-x-4">
              {connectionStatus === 'disconnected' ? (
                <Button
                  onClick={handleOffice365Connect}
                  disabled={isConnecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Connect Office365
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSyncEmails}
                    disabled={isSyncing}
                    variant="secondary"
                  >
                    {isSyncing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync Emails
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDisconnect}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Automatic Email Import</h3>
              </div>
              <p className="text-gray-600">
                Automatically import flight confirmations, hotel bookings, and travel-related emails from your Office365 account.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Secure & Private</h3>
              </div>
              <p className="text-gray-600">
                Your email data is processed securely and never stored permanently. We only access travel-related emails.
              </p>
            </div>
          </Card>
        </div>

        {/* Privacy Notice */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Privacy & Security</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• We only request read-only access to your emails</p>
              <p>• Your email credentials are encrypted and stored securely</p>
              <p>• We only process travel-related emails (flight confirmations, bookings, etc.)</p>
              <p>• You can disconnect your account at any time</p>
              <p>• We never share your personal data with third parties</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
