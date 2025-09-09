import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { StatsCard } from '../../components/ui/StatsCard'
import { FeatureCard } from '../../components/ui/FeatureCard'
import { Logo } from '../../components/ui/Logo'
import { useAI } from '../../hooks/useAI'
import { getAdminSystemStatus } from '../../services/firebaseFunctions'

export default function DashboardPage() {
  const { user, firebaseUser, isLoading } = useAuth()
  const router = useRouter()
  const { isLoading: aiLoading } = useAI()
  const [adminStatus, setAdminStatus] = useState<any>(null)
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = !!(user?.email && adminEmails.includes((user.email || '').toLowerCase())) || (user as any)?.role === 'admin'
  const [stats, setStats] = useState({
    totalTrips: 0,
    countriesVisited: 0,
    daysAbroad: 0,
    lastTrip: null
  })
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([])
  const [showAIInsights, setShowAIInsights] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  // Generate AI recommendations based on current state
  useEffect(() => {
    if (user) {
      const recommendations = []
      
      if (stats.totalTrips === 0) {
        recommendations.push("📄 Upload your passport scans to start building your travel history")
        recommendations.push("📧 Connect your email accounts to import flight confirmations")
      } else if (stats.totalTrips < 5) {
        recommendations.push("🔍 Review your travel history for any missing trips")
        recommendations.push("📊 Generate your first USCIS report to see the current status")
      } else {
        recommendations.push("✅ Your travel history looks comprehensive!")
        recommendations.push("📋 Consider generating a USCIS report for your citizenship application")
      }
      
      if (stats.countriesVisited === 0) {
        recommendations.push("🌍 Add countries you've visited to complete your profile")
      }
      
      setAiRecommendations(recommendations)
    }
  }, [user, stats])

  // Admin: fetch App Check status
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAdminSystemStatus()
        if (res?.success) setAdminStatus(res.status)
      } catch (_) {}
    }
    if (isAdmin) load()
  }, [isAdmin])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Logo variant="icon" size="lg" />
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const quickActions = [
    {
      title: 'Upload Passport',
      description: 'Scan your passport stamps for automatic travel history extraction',
      icon: '📄',
      action: () => router.push('/upload/passport'),
      color: 'bg-blue-500'
    },
    {
      title: 'Connect Gmail',
      description: 'Import flight confirmations and travel emails automatically',
      icon: '📧',
      action: () => router.push('/email/gmail'),
      color: 'bg-green-500'
    },
    {
      title: 'Add Travel Entry',
      description: 'Manually add travel information for complete history',
      icon: '✈️',
      action: () => router.push('/travel/create'),
      color: 'bg-purple-500'
    },
    {
      title: 'Generate Report',
      description: 'Create USCIS-ready travel history report',
      icon: '📊',
      action: () => router.push('/reports'),
      color: 'bg-orange-500'
    }
  ]

  const dataSources = [
    {
      name: 'Gmail Account',
      status: 'disconnected',
      description: 'Connect to import flight confirmations',
      action: () => router.push('/email/gmail')
    },
    {
      name: 'Office365 Account',
      status: 'disconnected',
      description: 'Connect to import travel emails',
      action: () => router.push('/email/office365')
    },
    {
      name: 'Passport Scans',
      status: 'empty',
      description: 'Upload passport images for OCR processing',
      action: () => router.push('/upload/passport')
    }
  ]

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.full_name || user.email}!
              </h1>
              <p className="text-gray-600 mt-1">
                Let's build your complete travel history for USCIS citizenship application.
              </p>
            </div>
            <div className="hidden sm:block">
              <Logo variant="icon" size="md" />
            </div>
          </div>
        </div>

        {/* Admin: App Check Status */}
        {isAdmin && adminStatus && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 text-lg">🛡️</span>
                <h2 className="text-lg font-semibold text-gray-900">App Check</h2>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Admin</span>
              </div>
              <span className={`text-sm ${adminStatus.appCheck?.enforced ? 'text-green-700' : 'text-red-700'}`}>
                {adminStatus.appCheck?.enforced ? 'Enforced' : 'Not enforced'}
                {adminStatus.appCheck?.replayProtection ? ' • Replay Protected' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-gray-500">Node</div>
                <div className="font-medium">{adminStatus.node || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Firestore</div>
                <div className="font-medium">{adminStatus.firestore || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Timestamp</div>
                <div className="font-medium">{adminStatus.timestamp ? new Date(adminStatus.timestamp).toLocaleString() : '—'}</div>
              </div>
            </div>
          </Card>
        )}

        {/* AI Insights & Recommendations */}
        {showAIInsights && aiRecommendations.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 text-lg">🤖</span>
                <h2 className="text-xl font-semibold text-blue-900">AI Insights & Recommendations</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Powered by Firebase AI Logic
                </span>
              </div>
              <button
                onClick={() => setShowAIInsights(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {aiRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">💡</span>
                  </div>
                  <p className="text-blue-800 text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Trips"
            value={stats.totalTrips}
            icon="✈️"
            description="International trips recorded"
          />
          <StatsCard
            title="Countries Visited"
            value={stats.countriesVisited}
            icon="🌍"
            description="Unique countries visited"
          />
          <StatsCard
            title="Days Abroad"
            value={stats.daysAbroad}
            icon="📅"
            description="Total days outside US"
          />
          <StatsCard
            title="Last Trip"
            value={stats.lastTrip || 'None'}
            icon="🕒"
            description="Most recent travel date"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <FeatureCard
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                onAction={action.action}
                gradient={action.color as 'blue' | 'teal' | 'yellow' | 'green'}
              />
            ))}
          </div>
        </div>

        {/* Data Sources Status */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dataSources.map((source, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">{source.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    source.status === 'connected' 
                      ? 'bg-green-100 text-green-800'
                      : source.status === 'empty'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {source.status === 'connected' ? 'Connected' : 
                     source.status === 'empty' ? 'Empty' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{source.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={source.action}
                  className="w-full"
                >
                  {source.status === 'connected' ? 'Manage' : 'Connect'}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <Card className="p-6">
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-600 mb-4">
                Start by uploading your passport or connecting your email to see your travel history.
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/upload/passport')}
              >
                Get Started
              </Button>
            </div>
          </Card>
        </div>

        {/* Progress Indicator */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Progress</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Account Setup</span>
                <span className="text-sm text-green-600">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Data Sources Connected</span>
                <span className="text-sm text-gray-500">0/3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Travel History Compiled</span>
                <span className="text-sm text-gray-500">Not started</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Report Generated</span>
                <span className="text-sm text-gray-500">Not started</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-brand-primary h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">25% Complete</p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
