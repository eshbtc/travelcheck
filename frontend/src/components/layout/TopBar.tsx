'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/Button'
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface TopBarProps {
  onMenuClick: () => void
  onSearchClick: () => void
}

export function TopBar({ onMenuClick, onSearchClick }: TopBarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profilePanelOpen, setProfilePanelOpen] = useState(false)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { user, logout } = useAuth()
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(0)
  const menuRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  useEffect(() => {
    if (profileMenuOpen) {
      setFocusedMenuIndex(0)
      // Focus first actionable item after render
      setTimeout(() => menuRefs.current[0]?.focus(), 0)
    }
  }, [profileMenuOpen])

  useEffect(() => { setMounted(true) }, [])

  // Prevent body scroll while slide-over is open and close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setProfilePanelOpen(false)
    }
    if (profilePanelOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKey)
      return () => {
        document.body.style.overflow = prev
        document.removeEventListener('keydown', onKey)
      }
    }
  }, [profilePanelOpen])

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border-light bg-white/80 backdrop-blur-sm px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-text-secondary lg:hidden"
        onClick={onMenuClick}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-border-light lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
        {/* Brand lockup (desktop) */}
        <div className="hidden md:block">
          <Logo variant="lockup" size="md" className="scale-125" />
        </div>
        {/* Search */}
        <button
          onClick={onSearchClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearchClick()
          }}
          className="relative flex flex-[1_1_960px] md:flex-[1_1_1040px] items-center gap-3 h-10 rounded-full px-4 text-sm text-text-secondary bg-white/90 backdrop-blur-sm ring-1 ring-border-light hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
          <span className="hidden sm:block">Search travel history…</span>
          <span className="hidden sm:block text-xs text-text-tertiary ml-auto">⌘K</span>
        </button>

        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          {/* Notifications */}
          <button 
            type="button" 
            className="-m-2.5 p-2.5 text-text-secondary hover:text-text-primary"
          >
            <BellIcon className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border-light" />

          {/* Profile dropdown trigger (opens slide-over) */}
          <div className="relative">
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5"
              onClick={() => setProfilePanelOpen(true)}
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-text-primary">
                  {user?.email || 'User'}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile slide-over */}
      {profilePanelOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40" onClick={() => setProfilePanelOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[420px] max-w-[90vw] bg-bg-primary shadow-2xl ring-1 ring-border-light overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-border-light">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-primary grid place-items-center text-white">{(user?.email || 'U')[0].toUpperCase()}</div>
                <div className="font-semibold">{user?.email || 'User'}</div>
              </div>
              <button className="p-2 rounded-full hover:bg-bg-secondary" onClick={() => setProfilePanelOpen(false)}>
                <XMarkIcon className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            <div className="divide-y divide-border-light">
              <div className="p-2">
                <Link href="/settings/profile" className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary">
                  <UserIcon className="h-5 w-5 text-text-secondary" />
                  <span>Your Profile</span>
                </Link>
                <Link href="/settings/preferences" className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary">
                  <ShieldCheckIcon className="h-5 w-5 text-text-secondary" />
                  <span>Settings</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary w-full text-left">
                  <ArrowRightOnRectangleIcon className="h-5 w-5 text-text-secondary" />
                  <span>Sign Out</span>
                </button>
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold mb-2">Your notifications</div>
                <div className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-bg-secondary">
                  <BellIcon className="h-5 w-5 text-text-secondary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">New Badge Received</div>
                    <div className="text-sm text-text-secondary">Congratulations! You generated your first report.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>, document.body)
      }
    </div>
  )
}
