'use client'

import React, { useState } from 'react'
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'
import { cn } from '../../lib/utils'

export interface Filter {
  id: string
  label: string
  type: 'select' | 'date' | 'dateRange' | 'text' | 'number'
  options?: { value: string; label: string }[]
  value?: any
}

export interface FilterBarProps {
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  className?: string
}

export function FilterBar({ filters, onFiltersChange, className }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = (filterId: string, value: any) => {
    const updatedFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, value } : filter
    )
    onFiltersChange(updatedFilters)
  }

  const clearFilter = (filterId: string) => {
    updateFilter(filterId, undefined)
  }

  const clearAllFilters = () => {
    const clearedFilters = filters.map(filter => ({ ...filter, value: undefined }))
    onFiltersChange(clearedFilters)
  }

  const activeFiltersCount = filters.filter(filter => filter.value !== undefined).length

  const renderFilterInput = (filter: Filter) => {
    switch (filter.type) {
      case 'select':
        return (
          <select
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value || undefined)}
            className="input"
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'text':
        return (
          <input
            type="text"
            placeholder={`Filter by ${filter.label}`}
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value || undefined)}
            className="input"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            placeholder={`Filter by ${filter.label}`}
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value ? Number(e.target.value) : undefined)}
            className="input"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value || undefined)}
            className="input"
          />
        )

      case 'dateRange':
        return (
          <div className="flex space-x-2">
            <input
              type="date"
              placeholder="From"
              value={filter.value?.from || ''}
              onChange={(e) => updateFilter(filter.id, { 
                ...filter.value, 
                from: e.target.value || undefined 
              })}
              className="input"
            />
            <input
              type="date"
              placeholder="To"
              value={filter.value?.to || ''}
              onChange={(e) => updateFilter(filter.id, { 
                ...filter.value, 
                to: e.target.value || undefined 
              })}
              className="input"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2"
        >
          <FunnelIcon className="h-4 w-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="badge badge-primary">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="text-text-secondary hover:text-text-primary"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.id} className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  {filter.label}
                </label>
                <div className="relative">
                  {renderFilterInput(filter)}
                  {filter.value !== undefined && (
                    <button
                      onClick={() => clearFilter(filter.id)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters
            .filter(filter => filter.value !== undefined)
            .map(filter => (
              <div
                key={filter.id}
                className="inline-flex items-center space-x-2 bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-sm"
              >
                <span>
                  {filter.label}: {filter.type === 'dateRange' 
                    ? `${filter.value.from} - ${filter.value.to}`
                    : String(filter.value)
                  }
                </span>
                <button
                  onClick={() => clearFilter(filter.id)}
                  className="hover:text-brand-primary/80"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
