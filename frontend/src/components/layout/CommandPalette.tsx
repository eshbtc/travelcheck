'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

interface Command {
  id: string
  name: string
  description: string
  href: string
  icon: string
  keywords: string[]
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const commands: Command[] = [
    {
      id: 'dashboard',
      name: 'Go to Dashboard',
      description: 'View your travel status overview',
      href: '/dashboard',
      icon: '🏠',
      keywords: ['dashboard', 'home', 'overview']
    },
    {
      id: 'timeline',
      name: 'Travel Timeline',
      description: 'View your travel history chronologically',
      href: '/travel/timeline',
      icon: '📅',
      keywords: ['timeline', 'history', 'travel', 'chronological']
    },
    {
      id: 'calendar',
      name: 'Presence Calendar',
      description: 'Visualize presence days with calendar heatmap',
      href: '/travel/calendar',
      icon: '📊',
      keywords: ['calendar', 'presence', 'heatmap', 'visualization']
    },
    {
      id: 'upload',
      name: 'Upload Passport',
      description: 'Upload passport stamps for analysis',
      href: '/travel/evidence',
      icon: '📸',
      keywords: ['upload', 'passport', 'stamps', 'photos']
    },
    {
      id: 'ingest',
      name: 'Ingest Bookings',
      description: 'Pull new bookings from connected inboxes',
      href: '/integrations',
      icon: '📥',
      keywords: ['ingest', 'bookings', 'email', 'gmail', 'outlook']
    },
    {
      id: 'map',
      name: 'Travel Map',
      description: 'View travel routes and stays on a map',
      href: '/travel/map',
      icon: '🗺️',
      keywords: ['map', 'routes', 'locations', 'geography']
    },
    {
      id: 'generate-report',
      name: 'Generate Report',
      description: 'Create a new travel report',
      href: '/reports/generate',
      icon: '📋',
      keywords: ['report', 'generate', 'create', 'new']
    },
    {
      id: 'report-history',
      name: 'Report History',
      description: 'View previously generated reports',
      href: '/reports/history',
      icon: '📚',
      keywords: ['history', 'reports', 'previous', 'past']
    },
    {
      id: 'integrations',
      name: 'Integrations',
      description: 'Manage data source connections',
      href: '/integrations',
      icon: '🔗',
      keywords: ['integrations', 'connections', 'gmail', 'office365']
    },
    {
      id: 'resolve-next',
      name: 'Resolve Next Conflict',
      description: 'Jump to the next data conflict to resolve',
      href: '/travel/timeline',
      icon: '🧩',
      keywords: ['resolve', 'conflict', 'data', 'fix']
    }
  ]

  const filteredCommands = commands.filter(command =>
    command.name.toLowerCase().includes(query.toLowerCase()) ||
    command.description.toLowerCase().includes(query.toLowerCase()) ||
    command.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          router.push(filteredCommands[selectedIndex].href)
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, filteredCommands, router, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center px-4 pt-16 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-text-primary/50 transition-opacity"
          onClick={onClose}
        />

        {/* Command palette */}
        <div className="relative inline-block w-full max-w-md transform overflow-hidden rounded-xl bg-bg-primary text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          {/* Search input */}
          <div className="flex items-center border-b border-border-light px-4 py-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-text-secondary mr-3" />
            <input
              type="text"
              className="flex-1 bg-transparent text-text-primary placeholder-text-secondary focus:outline-none"
              placeholder="Search commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button
              onClick={onClose}
              className="ml-3 text-text-secondary hover:text-text-primary"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Command list */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary">
                No commands found
              </div>
            ) : (
              <div className="py-2">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    className={`w-full flex items-center px-4 py-3 text-left hover:bg-bg-secondary transition-colors ${
                      index === selectedIndex ? 'bg-bg-secondary' : ''
                    }`}
                    onClick={() => {
                      router.push(command.href)
                      onClose()
                    }}
                  >
                    <span className="text-2xl mr-3">{command.icon}</span>
                    <div>
                      <div className="font-medium text-text-primary">{command.name}</div>
                      <div className="text-sm text-text-secondary">{command.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-light px-4 py-2 text-xs text-text-tertiary">
            <div className="flex justify-between">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
