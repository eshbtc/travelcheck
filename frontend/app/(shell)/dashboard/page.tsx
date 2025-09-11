'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusTiles, AlertList, QuickActions, RecentActivity } from '@/components/dashboard'
import { FeatureCard } from '@/components/ui'
import { CalendarIcon, TrophyIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const router = useRouter()
  const [loadingTiles, setLoadingTiles] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [tierProgress, setTierProgress] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setLoadingTiles(false), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('tc_show_stats')
    if (saved !== null) setShowStats(saved === 'true')
  }, [])

  const toggleStats = () => {
    const next = !showStats
    setShowStats(next)
    localStorage.setItem('tc_show_stats', String(next))
  }

  useEffect(() => {
    const t = setTimeout(() => setTierProgress(24), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-semibold text-text-primary">Welcome back</h1>
        <p className="text-text-secondary mt-1">Overview of your travel status and recent activity</p>
      </div>

      {/* Compact header stats (Kaggle-like) */}
      {showStats && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border-light bg-bg-primary px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Login Streak</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-text-primary">5</span>
            <span className="text-sm text-text-secondary">days</span>
          </div>
          <div className="text-xs text-text-tertiary">a new record!</div>
        </div>
        <div className="rounded-xl border border-border-light bg-bg-primary px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Tier Progress</div>
          <div className="mt-2 flex items-center gap-3">
            <svg width="56" height="56" viewBox="0 0 36 36">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#20BEFF" />
                  <stop offset="100%" stopColor="#00C853" />
                </linearGradient>
              </defs>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="2" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 600ms ease', strokeDasharray: 97.4, strokeDashoffset: 97.4 * (1 - tierProgress / 100) }} />
              <text x="18" y="20" textAnchor="middle" fontSize="7" fontWeight="700" fill="#111827">{tierProgress}%</text>
            </svg>
            <div className="text-xs text-text-tertiary">to Expert</div>
          </div>
        </div>
        <div className="rounded-xl border border-border-light bg-bg-primary px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Public Activity</div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 12 ? 'bg-brand-primary' : 'bg-border-medium'}`} />
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Divider & toggle */}
      <div className="flex items-center justify-between my-2">
        <div className="h-px bg-border-light flex-1 mr-4" />
        <button onClick={toggleStats} className="text-sm text-brand-primary hover:underline">
          {showStats ? 'Hide stats' : 'Show stats'}
        </button>
      </div>
      
      {/* Status Tiles */}
      <StatusTiles loading={loadingTiles} />
      
      {/* Alerts */}
      <AlertList />

      {/* Quick Actions */}
      <QuickActions />
      
      {/* Recent Activity */}
      <RecentActivity />

      {/* How to start: Choose a focus for today */}
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">How to start: Choose a focus for today</h2>
          <p className="text-text-secondary">Help us make relevant suggestions for you</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            title="Upload passport"
            description="Use AI to extract dates and locations from stamps."
            icon={<CalendarIcon className="h-8 w-8 text-kaggle-blue" />}
            actionText="Get started"
            gradient="blue"
            onAction={() => router.push('/travel/evidence')}
          />
          <FeatureCard
            title="Connect email"
            description="Import flight confirmations from Gmail or Office 365."
            icon={<ClockIcon className="h-8 w-8 text-kaggle-teal" />}
            actionText="Get started"
            gradient="teal"
            onAction={() => router.push('/integrations')}
          />
          <FeatureCard
            title="Generate USCIS report"
            description="Create a compliant report for your application."
            icon={<TrophyIcon className="h-8 w-8 text-kaggle-green" />}
            actionText="Get started"
            gradient="green"
            onAction={() => router.push('/reports/generate')}
          />
        </div>
      </section>
    </div>
  )
}
