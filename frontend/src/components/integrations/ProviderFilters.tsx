'use client'

import React from 'react'
import { 
  FunnelIcon,
  BuildingOfficeIcon,
  HomeIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ProviderFiltersProps {
  selectedProviders: string[]
  onProviderToggle: (provider: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  className?: string
}

const PROVIDERS = [
  {
    id: 'booking.com',
    name: 'Booking.com',
    icon: GlobeAltIcon,
    color: 'blue',
    description: 'Hotel and accommodation bookings'
  },
  {
    id: 'hotels.com',
    name: 'Hotels.com',
    icon: BuildingOfficeIcon,
    color: 'red',
    description: 'Hotel reservations and confirmations'
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    icon: HomeIcon,
    color: 'pink',
    description: 'Short-term rental bookings'
  },
  {
    id: 'marriott',
    name: 'Marriott',
    icon: BuildingStorefrontIcon,
    color: 'yellow',
    description: 'Marriott hotel chain bookings'
  },
  {
    id: 'hilton',
    name: 'Hilton',
    icon: BuildingStorefrontIcon,
    color: 'indigo',
    description: 'Hilton hotel chain bookings'
  }
]

export function ProviderFilters({
  selectedProviders,
  onProviderToggle,
  onSelectAll,
  onSelectNone,
  className = ''
}: ProviderFiltersProps) {
  const allSelected = selectedProviders.length === PROVIDERS.length
  const noneSelected = selectedProviders.length === 0

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Provider Filters</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectNone}
            disabled={noneSelected}
          >
            Select None
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROVIDERS.map((provider) => {
          const ProviderIcon = provider.icon
          const isSelected = selectedProviders.includes(provider.id)
          
          return (
            <button
              key={provider.id}
              onClick={() => onProviderToggle(provider.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                isSelected 
                  ? `border-${provider.color}-500 bg-${provider.color}-50` 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ProviderIcon className={`h-5 w-5 ${
                  isSelected ? `text-${provider.color}-600` : 'text-gray-400'
                }`} />
                <div className="flex-1">
                  <div className={`font-medium ${
                    isSelected ? `text-${provider.color}-900` : 'text-gray-900'
                  }`}>
                    {provider.name}
                  </div>
                  <div className="text-sm text-gray-600">{provider.description}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isSelected 
                    ? `bg-${provider.color}-500 border-${provider.color}-500` 
                    : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <strong>Selected:</strong> {selectedProviders.length} of {PROVIDERS.length} providers
          {selectedProviders.length > 0 && (
            <span className="ml-2 text-gray-500">
              ({selectedProviders.join(', ')})
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}