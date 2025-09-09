import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminSystemStatus } from '../../services/firebaseFunctions'
import { toast } from 'react-hot-toast'

export default function AdminHealthPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const adminEmails = useMemo(() => (
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  ), [])

  const isAdmin = useMemo(() => {
    if (!user) return false
    const emailIsAdmin = !!(user.email && adminEmails.includes(user.email.toLowerCase()))
    const roleIsAdmin = (user as any).role === 'admin'
    return emailIsAdmin || roleIsAdmin
  }, [user, adminEmails])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [isLoading, user, router])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        setLoadingStatus(true)
        const res = await getAdminSystemStatus()
        if (res?.success) {
          setStatus(res.status)
        } else {
          toast.error('Failed to load system status')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load system status')
      } finally {
        setLoadingStatus(false)
      }
    }
    if (user) load()
  }, [user])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">403 • Admins only</h1>
            <p className="mt-2 text-gray-600">You do not have access to this page.</p>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="mt-2 text-gray-600">Admin-only overview of backend status and configuration hints.</p>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Firestore</div>
              <div className="text-lg font-semibold text-gray-900">{status?.firestore || 'unknown'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Node Version</div>
              <div className="text-lg font-semibold text-gray-900">{status?.node || '—'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">App Check</div>
              <div className="text-lg font-semibold text-gray-900">
                {status?.appCheck?.enforced ? 'Enforced' : 'Not Enforced'}
                {status?.appCheck?.replayProtection ? ' • Replay Protected' : ''}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Timestamp</div>
              <div className="text-lg font-semibold text-gray-900">{status?.timestamp ? new Date(status.timestamp).toLocaleString() : '—'}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Gmail OAuth</div>
              <div className={`text-lg font-semibold ${status?.config?.gmailConfigured ? 'text-green-700' : 'text-red-700'}`}>
                {status?.config?.gmailConfigured ? 'Configured' : 'Missing'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Office365 OAuth</div>
              <div className={`text-lg font-semibold ${status?.config?.officeConfigured ? 'text-green-700' : 'text-red-700'}`}>
                {status?.config?.officeConfigured ? 'Configured' : 'Missing'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Document AI</div>
              <div className={`text-lg font-semibold ${status?.config?.docAiConfigured ? 'text-green-700' : 'text-red-700'}`}>
                {status?.config?.docAiConfigured ? 'Configured' : 'Missing'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={async () => {
              try {
                setLoadingStatus(true)
                const res = await getAdminSystemStatus()
                setStatus(res?.status)
              } catch (e) { /* ignore */ } finally { setLoadingStatus(false) }
            }} disabled={loadingStatus}>
              {loadingStatus ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
