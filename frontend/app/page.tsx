"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, StatsCard, FeatureCard, Button, Logo } from '@/components/ui'
import {
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <Logo variant="lockup" size="md" className="scale-125" />
          <nav className="space-x-4">
            <Link href="/pricing" className="text-sm text-gray-700 hover:text-gray-900">Pricing</Link>
            <Link href="/auth/login" className="text-sm text-gray-700 hover:text-gray-900">Sign in</Link>
            <Link href="/auth/register" className="text-sm text-brand-primary hover:text-brand-primary/90">Create account</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-text-primary sm:text-5xl md:text-6xl">Welcome!</h1>
          <p className="mt-3 max-w-3xl mx-auto text-lg text-text-secondary">
            Track your international travel history for USCIS citizenship applications using AI-powered passport stamp analysis and email integration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Travel Records" value="—" description="total created" icon={<DocumentTextIcon className="h-6 w-6 text-kaggle-blue" />} />
          <StatsCard title="Reports Generated" value="—" description="total created" icon={<ChartBarIcon className="h-6 w-6 text-kaggle-teal" />} />
          <StatsCard title="Days Tracked" value="—" description="total days" icon={<ClockIcon className="h-6 w-6 text-kaggle-yellow" />} />
          <StatsCard title="Completion Rate" value="—" description="to Expert" icon={<TrophyIcon className="h-6 w-6 text-kaggle-green" />} />
        </div>

        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-text-primary">How to start: Choose a focus for today</h2>
            <p className="mt-2 text-text-secondary">Help us make relevant suggestions for you</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Upload Passport Stamps"
              description="Use AI-powered OCR to extract travel information from passport stamps and entry/exit records."
              icon={<DocumentTextIcon className="h-8 w-8 text-kaggle-blue" />}
              actionText="Get started"
              gradient="blue"
              onAction={() => router.push('/travel/evidence')}
            />
            <FeatureCard
              title="Connect Email Accounts"
              description="Integrate with Gmail and Office 365 to automatically parse flight confirmation emails."
              icon={<GlobeAltIcon className="h-8 w-8 text-kaggle-teal" />}
              actionText="Get started"
              gradient="teal"
              onAction={() => router.push('/integrations')}
            />
            <FeatureCard
              title="Generate USCIS Report"
              description="Create comprehensive travel history reports formatted specifically for USCIS citizenship applications."
              icon={<ShieldCheckIcon className="h-8 w-8 text-kaggle-green" />}
              actionText="Get started"
              gradient="green"
              onAction={() => router.push('/reports/generate')}
            />
          </div>
        </div>

        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-text-primary">Everything You Need for USCIS Applications</h2>
            <p className="mt-2 text-text-secondary">Our comprehensive platform handles all aspects of travel history compilation</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-blue/10 mx-auto mb-4">
                <DocumentTextIcon className="h-6 w-6 text-kaggle-blue" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Passport Stamp OCR</h3>
              <p className="text-text-secondary text-sm">Automatically extract travel dates and locations from passport stamps using advanced OCR technology.</p>
            </Card>
            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-teal/10 mx-auto mb-4">
                <GlobeAltIcon className="h-6 w-6 text-kaggle-teal" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Email Integration</h3>
              <p className="text-text-secondary text-sm">Connect your Gmail and Office365 accounts to automatically find flight confirmation emails.</p>
            </Card>
            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-yellow/10 mx-auto mb-4">
                <ClockIcon className="h-6 w-6 text-kaggle-yellow" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Flight Tracking</h3>
              <p className="text-text-secondary text-sm">Cross-reference with flight tracking apps for complete travel history.</p>
            </Card>
            <Card className="text-center" padding="lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-green/10 mx-auto mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-kaggle-green" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">USCIS Compliant</h3>
              <p className="text-text-secondary text-sm">Generate reports that meet USCIS requirements for citizenship applications.</p>
            </Card>
          </div>
        </div>

        <Card className="text-center" padding="lg">
          <h3 className="text-xl font-semibold text-text-primary mb-4">Get started with TravelCheck</h3>
          <p className="text-text-secondary mb-6">Sign in to start tracking your travel history for your USCIS citizenship application.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">Sign In</Button>
            </Link>
            <Link href="/auth/register" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">Create Account</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}
