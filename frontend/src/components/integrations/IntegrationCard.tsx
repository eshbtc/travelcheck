'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { format, parseISO, isValid } from 'date-fns'
import { 
  EnvelopeIcon, 
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LinkIcon,
  XMarkIcon,
  ClockIcon,
  EyeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from 'react-hot-toast'

interface IntegrationCardProps {
  provider: 'gmail' | 'office365'
  isConnected: boolean
  lastConnected?: string
  scopes?: string[]
  onConnect: () => Promise<void>
  onReconnect: () => Promise<void>
  onRevoke: () => Promise<void>
  className?: string
}

const PROVIDER_CONFIG = {
  gmail: {
    name: 'Gmail',
    description: 'Import travel bookings from Gmail emails',
    icon: EnvelopeIcon,
    color: 'red',
    connectUrl: '/auth/gmail',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.labels'
    ]
  },
  office365: {
    name: 'Office 365',
    description: 'Import travel bookings from Outlook emails',
    icon: BuildingOfficeIcon,
    color: 'blue',
    connectUrl: '/auth/office365',
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/User.Read'
    ]
  }
}

export function IntegrationCard({
  provider,
  isConnected,
  lastConnected,
  scopes = [],
  onConnect,
  onReconnect,
  onRevoke,
  className = ''
}: IntegrationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showScopes, setShowScopes] = useState(false)

  const config = PROVIDER_CONFIG[provider]
  const ProviderIcon = config.icon

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      await onConnect()
      toast.success(`Connected to ${config.name} successfully`)
    } catch (error) {
      console.error(`Error connecting to ${config.name}:`, error)
      toast.error(`Failed to connect to ${config.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReconnect = async () => {
    setIsLoading(true)
    try {
      await onReconnect()
      toast.success(`Reconnected to ${config.name} successfully`)
    } catch (error) {
      console.error(`Error reconnecting to ${config.name}:`, error)
      toast.error(`Failed to reconnect to ${config.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to disconnect from ${config.name}?`)) {
      return
    }

    setIsLoading(true)
    try {
      await onRevoke()
      toast.success(`Disconnected from ${config.name}`)
    } catch (error) {
      console.error(`Error disconnecting from ${config.name}:`, error)
      toast.error(`Failed to disconnect from ${config.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatLastConnected = (dateString: string) => {
    if (!isValid(parseISO(dateString))) return 'Unknown'
    return format(parseISO(dateString), 'MMM dd, yyyy \'at\' h:mm a')
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg bg-${config.color}-100`}>
            <ProviderIcon className={`h-6 w-6 text-${config.color}-600`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
              {isConnected ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{config.description}</p>
            
            {isConnected && lastConnected && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
                <ClockIcon className="h-4 w-4" />
                <span>Last connected: {formatLastConnected(lastConnected)}</span>
              </div>
            )}
            
            {isConnected && scopes.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setShowScopes(!showScopes)}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <EyeIcon className="h-4 w-4" />
                  <span>{showScopes ? 'Hide' : 'Show'} permissions</span>
                </button>
                
                {showScopes && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 mb-2">Granted permissions:</div>
                    <ul className="space-y-1">
                      {scopes.map((scope, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                          <ShieldCheckIcon className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="break-all">{scope}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <ArrowPathIcon className="h-4 w-4" />
                )}
                <span>Reconnect</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevoke}
                disabled={isLoading}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Disconnect</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className={`flex items-center space-x-2 bg-${config.color}-600 hover:bg-${config.color}-700 text-white`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
              <span>Connect</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Privacy Notice */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <strong>Privacy:</strong> We only access emails containing travel bookings. 
          Email content is processed locally and only booking details are stored. 
          <Link href="/settings" className="text-blue-600 hover:text-blue-700 ml-1">
            Learn more
          </Link>
        </div>
      </div>
    </Card>
  )
}