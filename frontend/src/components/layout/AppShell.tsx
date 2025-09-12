'use client'

import React, { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { SearchBar } from '../ui/SearchBar'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BellIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, UserIcon, XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hoverExpand, setHoverExpand] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, logout } = useAuth()
  const billingPortalUrl = process.env.NEXT_PUBLIC_LEMON_CUSTOMER_PORTAL_URL
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-text-primary/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-bg-primary shadow-xl pt-6">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop + md compact sidebar */}
      <div
        className={`hidden md:fixed md:top-0 md:bottom-0 md:flex md:flex-col transition-all duration-200 ease-out ${
          (!collapsed || hoverExpand) ? 'md:w-64 lg:w-64' : 'md:w-16 lg:w-16'
        }`}
        onMouseEnter={() => collapsed && setHoverExpand(true)}
        onMouseLeave={() => collapsed && setHoverExpand(false)}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-bg-primary shadow-sm border-r border-border-light">
          <Sidebar collapsed={collapsed && !hoverExpand} onToggleCollapse={() => setCollapsed(v => !v)} />
        </div>
      </div>

      {/* Main content */}
      <div className={`${(!collapsed || hoverExpand) ? 'md:pl-64 lg:pl-64' : 'md:pl-16 lg:pl-16'} transition-all duration-200`}>
        <main className="py-6">
          <div className="mx-auto max-w-[1200px] px-6">
            {/* Page-level search (Kaggle-style) */}
            <div className="mb-6 sticky top-4 z-10">
              <SearchBar onActivate={() => setCommandPaletteOpen(true)} />
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* FAB removed; control moved under brand divider */}

      {/* Command Palette */}
      <CommandPalette 
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Floating Profile trigger (top-right) */}
      <button
        onClick={() => setProfileOpen(true)}
        title="Account"
        className="fixed right-4 top-4 z-[70] h-10 w-10 rounded-full bg-brand-primary text-white grid place-items-center shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
      >
        <UserIcon className="h-5 w-5" />
      </button>

      {/* Profile slide-over via portal */}
      {profileOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40" onClick={() => setProfileOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[420px] max-w-[90vw] bg-bg-primary shadow-2xl ring-1 ring-border-light overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-border-light">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white grid place-items-center text-brand-primary font-semibold">
                  {(user?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="font-semibold">{user?.email || 'Account'}</div>
              </div>
              <button className="p-2 rounded-full hover:bg-bg-secondary" onClick={() => setProfileOpen(false)}>
                <XMarkIcon className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            <div className="divide-y divide-border-light">
              <div className="p-2">
                {billingPortalUrl && (
                  <a href={billingPortalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary w-full text-left">
                    <CreditCardIcon className="h-5 w-5 text-text-secondary" />
                    <span>Manage Billing</span>
                  </a>
                )}
                <button onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary w-full text-left">
                  <UserIcon className="h-5 w-5 text-text-secondary" />
                  <span>Your Profile</span>
                </button>
                <button onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary w-full text-left">
                  <ShieldCheckIcon className="h-5 w-5 text-text-secondary" />
                  <span>Settings</span>
                </button>
                <button onClick={async () => { await logout(); setProfileOpen(false) }} className="flex items-center gap-3 px-3 h-12 rounded-lg hover:bg-bg-secondary w-full text-left">
                  <ArrowRightOnRectangleIcon className="h-5 w-5 text-text-secondary" />
                  <span>Sign Out</span>
                </button>
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold mb-2">Notifications</div>
                <div className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-bg-secondary">
                  <BellIcon className="h-5 w-5 text-text-secondary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Welcome to TravelCheck</div>
                    <div className="text-sm text-text-secondary">You can upload passport scans and generate reports here.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </div>
  )
}
