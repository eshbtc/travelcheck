'use client'

import React from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface SearchBarProps {
  onActivate?: () => void
  placeholder?: string
}

export function SearchBar({ onActivate, placeholder = 'Search travel history…' }: SearchBarProps) {
  return (
    <button
      onClick={onActivate}
      className="w-full h-12 rounded-full bg-white/90 backdrop-blur-sm ring-1 ring-border-light hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 px-5 flex items-center gap-3 text-left"
    >
      <MagnifyingGlassIcon className="h-5 w-5 text-text-secondary" />
      <span className="text-text-secondary flex-1">{placeholder}</span>
      <span className="text-xs text-text-tertiary">⌘K</span>
    </button>
  )
}

export default SearchBar

