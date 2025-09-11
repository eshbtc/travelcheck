'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import {
  HomeIcon,
  PlusIcon,
  DocumentTextIcon,
  ChartBarIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

interface SidebarProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const { user } = useAuth()

  const isAdmin = useMemo(() => {
    if (!user) return false
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const emailIsAdmin = !!(user.email && adminEmails.includes((user.email || '').toLowerCase()))
    const roleIsAdmin = (user as any).role === 'admin'
    return emailIsAdmin || roleIsAdmin
  }, [user])

  const createItems = [
    { label: 'Upload Passport', href: '/travel/evidence', icon: ArrowUpTrayIcon },
    { label: 'Generate Report', href: '/reports/generate', icon: ChartBarIcon },
    { label: 'Connect Email', href: '/integrations', icon: EnvelopeIcon },
  ] as const

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!createRef.current) return
      if (!createRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCreateOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Travel Timeline', href: '/travel/timeline', icon: DocumentTextIcon },
    { name: 'Travel Calendar', href: '/travel/calendar', icon: ChartBarIcon },
    { name: 'Travel History', href: '/travel/history', icon: DocumentTextIcon },
    { name: 'Evidence', href: '/travel/evidence', icon: DocumentTextIcon },
    { name: 'Travel Map', href: '/travel/map', icon: GlobeAltIcon },
    { name: 'Resolution Center', href: '/resolution', icon: ExclamationTriangleIcon },
    { name: 'Integrations', href: '/integrations', icon: EnvelopeIcon },
  ]
  const reportsNav = [
    { name: 'Generate Report', href: '/reports/generate', icon: ChartBarIcon },
    { name: 'Report History', href: '/reports/history', icon: DocumentTextIcon },
  ]
  const adminNav = isAdmin ? [{ name: 'Admin • Users', href: '/admin/users', icon: DocumentTextIcon }] : []

  return (
    <>
      {/* Mobile close button */}
      {onClose && (
        <div className="flex h-16 items-center justify-end px-4">
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Desktop logo */}
      {/* No desktop logo; TopBar now displays the brand lockup */}

      {/* Brand */}
      <div className={`-mt-1 ${collapsed ? 'pb-1' : 'pb-1'} w-full ${collapsed ? 'flex justify-center' : 'block'}`}>
        {collapsed ? (
          <div className="w-full flex justify-center pt-1 pb-1">
            <div className="h-12 w-12 rounded-full border border-border-light bg-white grid place-items-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="scale-[1.2]">
                <Logo variant="icon" size="sm" />
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 pr-4 w-full">
            <Logo variant="sidebar" size="md" />
          </div>
        )}
      </div>
      <div className="h-px bg-border-light mx-3 my-1" />
      {/* Collapse/Expand control under brand */}
      <div className="px-3 pt-1 pb-2 flex justify-start">
        <button
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="h-12 w-12 items-center justify-center rounded-full border border-border-light bg-bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-bg-secondary transition-colors hidden lg:flex"
          onClick={() => onToggleCollapse && onToggleCollapse()}
        >
          <span className="nav-icon inline-flex items-center justify-center w-6 h-6 text-text-secondary">
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </span>
        </button>
      </div>

      {/* Create CTA */}
      <div className={`px-3 ${onClose ? 'pt-0' : (collapsed ? 'pt-14' : 'pt-10')} pb-5`}>
        <div className="relative inline-block" ref={createRef}>
          {/* Full pill when not collapsed */}
          {!collapsed && (
            <button
              className="hidden lg:inline-flex h-11 items-center rounded-full border border-border-light bg-bg-primary shadow-[0_1px_1px_rgba(0,0,0,0.04)] hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-colors px-5 self-start"
              onClick={() => setCreateOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={createOpen}
            >
              <PlusIcon className="h-7 w-7 text-brand-primary mr-2" style={{ strokeWidth: 2.5 }} />
              <span className="text-base font-semibold text-text-primary">Create</span>
            </button>
          )}
          {/* Icon-only when collapsed (lg) or on md */}
          <button
            className={`${collapsed ? 'inline-flex' : 'md:inline-flex lg:hidden'} w-12 h-12 items-center justify-center rounded-full border border-border-light bg-bg-primary shadow-[0_1px_1px_rgba(0,0,0,0.04)] hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-colors`}
            title="Create"
            onClick={() => setCreateOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={createOpen}
          >
            <PlusIcon className="h-7 w-7 text-brand-primary" style={{ strokeWidth: 2.5 }} />
          </button>

          {/* Dropdown */}
          {createOpen && (
            <div
              role="menu"
              className="absolute left-0 mt-2 w-72 rounded-2xl border border-border-light bg-bg-primary shadow-[0_12px_24px_rgba(0,0,0,0.08)] ring-1 ring-border-light p-2 z-50 transition-all duration-150 ease-out"
            >
              {createItems.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="flex items-center gap-3 px-3 h-12 rounded-xl text-text-primary hover:bg-bg-secondary transition-colors"
                  onClick={() => setCreateOpen(false)}
                  role="menuitem"
                >
                  <item.icon className="h-6 w-6 text-text-secondary" />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${onClose ? 'px-2 py-4' : 'mt-10 px-3'} flex flex-col`}>
        {[{title:'Main',items:mainNav},{title:'Reports',items:reportsNav}, ...(adminNav.length? [{title:'Admin',items:adminNav}]:[])].map(section => (
          <div key={section.title} className="mb-4">
            <div className={`px-2 pb-2 text-xs uppercase tracking-wide text-text-tertiary ${collapsed ? 'hidden' : ''}`}>{section.title}</div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative group flex items-center w-full gap-3 px-3 h-12 text-base leading-7 font-medium rounded-lg transition-colors ${isActive ? 'bg-brand-primary/5 text-text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
                    onClick={onClose}
                    title={item.name}
                  >
                    {isActive && <span className="absolute left-0 h-5 w-[3px] rounded-full bg-brand-primary" />}
                    <span className="nav-icon shrink-0 inline-flex items-center justify-center w-6 h-6">
                      <item.icon className="w-full h-full" />
                    </span>
                    <span className={`truncate ${collapsed ? 'hidden' : 'hidden lg:block'} flex-1`}>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        {/* Removed bottom Quick Upload button per request */}
      </nav>
    </>
  )
}
