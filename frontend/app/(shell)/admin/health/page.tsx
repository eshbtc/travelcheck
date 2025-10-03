"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Status = Record<string, any>

export default function AdminHealthPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Status | null>(null)
  const [adminStatus, setAdminStatus] = useState<Status | null>(null)
  const [ping, setPing] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isLoading = sessionStatus === 'loading'
  const user = session?.user

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/auth/login')
  }, [sessionStatus, router])

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const [sysRes, adminRes, hcRes] = await Promise.all([
          fetch('/api/system/status').catch(() => null),
          fetch('/api/system/status').catch(() => null), // Using same call for now
          fetch('/api/health').catch(() => null),
        ])

        const sys = sysRes ? await sysRes.json() : null
        const admin = adminRes ? await adminRes.json() : null
        const hc = hcRes ? await hcRes.json() : null

        setStatus(sys)
        setAdminStatus(admin)
        setPing(hc)
      } catch (e: any) {
        setError(e?.message || 'Failed to load status')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking system status…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          {error}
        </div>
      </div>
    )
  }

  const Section = ({ title, data }: { title: string; data: any }) => (
    <div className="rounded-xl border border-border-light bg-bg-primary p-6 shadow-kaggle">
      <h2 className="text-lg font-semibold text-text-primary mb-3">{title}</h2>
      <pre className="text-sm overflow-auto text-text-secondary">{JSON.stringify(data ?? {}, null, 2)}</pre>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <h1 className="text-3xl font-bold text-text-primary">System Health</h1>
      <p className="text-text-secondary">Status snapshots from Cloud Functions and services.</p>
      <Section title="Health Check" data={ping} />
      <Section title="System Status" data={status} />
      <Section title="Admin System Status" data={adminStatus} />
    </div>
  )
}

