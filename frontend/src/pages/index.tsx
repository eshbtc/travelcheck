import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { 
  GlobeAltIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Passport Stamp OCR',
    description: 'Automatically extract travel dates and locations from passport stamps using advanced OCR technology.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Email Integration',
    description: 'Connect your Gmail and Office365 accounts to automatically find flight confirmation emails.',
    icon: GlobeAltIcon,
  },
  {
    name: 'Flight Tracking',
    description: 'Cross-reference with flight tracking apps like Flighty for complete travel history.',
    icon: ClockIcon,
  },
  {
    name: 'USCIS Compliant',
    description: 'Generate reports that meet USCIS requirements for citizenship applications.',
    icon: ShieldCheckIcon,
  },
]

const steps = [
  {
    id: 1,
    name: 'Connect Your Accounts',
    description: 'Link your email accounts and upload passport images',
    icon: CheckCircleIcon,
  },
  {
    id: 2,
    name: 'Automatic Processing',
    description: 'Our AI processes your data to extract travel information',
    icon: CheckCircleIcon,
  },
  {
    id: 3,
    name: 'Review & Verify',
    description: 'Review the extracted data and make any necessary corrections',
    icon: CheckCircleIcon,
  },
  {
    id: 4,
    name: 'Generate Report',
    description: 'Download your USCIS-compliant travel history report',
    icon: CheckCircleIcon,
  },
]

export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Travel History Tracker - USCIS Citizenship Application Tool</title>
        <meta name="description" content="Automatically compile your international travel history from passport stamps, emails, and flight data for USCIS citizenship applications." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-primary-600">
                    Travel History Tracker
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-800">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Compile Your Travel History
                <span className="block text-primary-200">for USCIS Applications</span>
              </h1>
              <p className="mt-6 max-w-3xl mx-auto text-xl text-primary-100">
                Automatically extract travel information from passport stamps, email confirmations, 
                and flight tracking data. Generate USCIS-compliant reports in minutes, not hours.
              </p>
              <div className="mt-10 flex justify-center space-x-4">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="bg-white text-primary-600 px-8 py-3 rounded-md text-lg font-medium hover:bg-primary-50 transition-colors flex items-center"
                  >
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/register"
                      className="bg-white text-primary-600 px-8 py-3 rounded-md text-lg font-medium hover:bg-primary-50 transition-colors"
                    >
                      Start Free Trial
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="border-2 border-white text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-white hover:text-primary-600 transition-colors"
                    >
                      Learn More
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Everything You Need for USCIS Applications
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                Our comprehensive platform handles all aspects of travel history compilation
              </p>
            </div>
            <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.name} className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-gray-900">{feature.name}</h3>
                  <p className="mt-2 text-base text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                Get your travel history compiled in just 4 simple steps
              </p>
            </div>
            <div className="mt-20">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step, stepIdx) => (
                  <div key={step.name} className="relative">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-500 text-white">
                          <step.icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{step.name}</h3>
                        <p className="text-base text-gray-600">{step.description}</p>
                      </div>
                    </div>
                    {stepIdx < steps.length - 1 && (
                      <div className="hidden sm:block absolute top-5 left-10 w-full h-0.5 bg-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary-600">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="block">Ready to get started?</span>
              <span className="block text-primary-200">Start your free trial today.</span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-800">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-400">
                © 2024 Travel History Tracker. All rights reserved.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This tool is designed to assist with travel history compilation but should not replace professional legal advice.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
