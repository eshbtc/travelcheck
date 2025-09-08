import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { getFlightEmails, getGmailAuthUrl, handleGmailCallback, disconnectGmailAccount, getGmailConnectionStatus, syncGmailEmails } from '../../services/firebaseFunctions'
import { toast } from 'react-hot-toast'

export default function GmailIntegrationPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')
  const [flightEmails, setFlightEmails] = useState<any[]>([])
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
      loadFlightEmails()
    }
  }, [user])

  const checkConnectionStatus = async () => {
    if (!user) return
    
    try {
      // Check Gmail connection status via Firebase Function
      const result = await getGmailConnectionStatus()
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

  const loadFlightEmails = async () => {
    if (!user) return

    try {
      const result = await getFlightEmails()
      if (result.success) {
        setFlightEmails(result.emails || [])
      }
    } catch (err) {
      console.error('Error loading flight emails:', err)
    }
  }

  const handleGmailConnect = async () => {
    if (!user) return

    setIsConnecting(true)
    setError('')

    try {
      // Get Gmail OAuth URL from Firebase Function
      const result = await getGmailAuthUrl()
      if (result.success) {
        // Redirect to Gmail OAuth
        window.location.href = result.authUrl
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Gmail account')
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
      // Server-side sync using stored tokens
      await syncGmailEmails()
      
      // Reload flight emails
      await loadFlightEmails()
      setLastSync(new Date().toISOString())
      
    } catch (err: any) {
      setError(err.message || 'Failed to sync emails')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user) return

    try {
      // Disconnect Gmail account via Firebase Function
      const result = await disconnectGmailAccount()
      if (result.success) {
        setConnectionStatus('disconnected')
        setFlightEmails([])
        setLastSync(null)
        toast.success('Gmail account disconnected successfully')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Gmail account')
      toast.error('Failed to disconnect Gmail account')
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
          <h1 className="text-3xl font-bold text-gray-900">Gmail Integration</h1>
          <p className="mt-2 text-gray-600">
            Connect your Gmail account to automatically import flight confirmations and travel-related emails.
          </p>
        </div>

        {/* Connection Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">📧</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Gmail Account</h3>
                <p className="text-sm text-gray-600">
                  {connectionStatus === 'connected' 
                    ? `Connected • Last sync: ${lastSync ? new Date(lastSync).toLocaleString() : 'Never'}`
                    : 'Not connected'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-800'
                  : connectionStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'error' ? 'Error' : 'Disconnected'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex space-x-4">
            {connectionStatus === 'disconnected' ? (
              <Button
                variant="primary"
                onClick={handleGmailConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Gmail'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleSyncEmails}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Emails'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* What We Import */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What We Import</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Flight Confirmations</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Airline booking confirmations</li>
                <li>• Flight tickets and itineraries</li>
                <li>• Boarding passes</li>
                <li>• Flight change notifications</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Travel Emails</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Hotel reservations</li>
                <li>• Car rental confirmations</li>
                <li>• Travel insurance documents</li>
                <li>• Trip planning emails</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Flight Emails */}
        {connectionStatus === 'connected' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Imported Flight Emails ({flightEmails.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFlightEmails}
              >
                Refresh
              </Button>
            </div>

            {flightEmails.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📭</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No emails found</h4>
                <p className="text-gray-600 mb-4">
                  We haven't found any travel-related emails yet. Try syncing your account.
                </p>
                <Button
                  variant="primary"
                  onClick={handleSyncEmails}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Emails'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {flightEmails.map((email, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{email.subject}</h4>
                        <p className="text-sm text-gray-600 mt-1">{email.from}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(email.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Processed
                        </span>
                      </div>
                    </div>
                    
                    {email.extractedFlights && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-700 mb-1">Extracted Information:</p>
                        <pre className="text-xs text-gray-600 overflow-auto">
                          {JSON.stringify(email.extractedFlights, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Privacy & Security */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy & Security</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <p>We only read emails related to travel and flights</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <p>Your email credentials are encrypted and stored securely</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <p>We never access your personal emails or send emails on your behalf</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <p>You can disconnect your account at any time</p>
            </div>
          </div>
        </Card>

        {/* Help */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>How does the connection work?</strong><br />
              We use Google's secure OAuth system to access only your travel-related emails. You maintain full control and can revoke access anytime.
            </p>
            <p>
              <strong>What if I don't see my emails?</strong><br />
              Make sure you have travel-related emails in your Gmail account. We look for keywords like "flight", "booking", "confirmation", etc.
            </p>
            <p>
              <strong>Can I disconnect later?</strong><br />
              Yes, you can disconnect your Gmail account at any time from this page. This will stop all email syncing immediately.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
