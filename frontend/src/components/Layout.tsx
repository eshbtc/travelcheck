import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from './ui/Logo';
import {
  HomeIcon,
  PlusIcon,
  TrophyIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon, current: router.pathname === '/' },
    { name: 'Travel History', href: '/history', icon: DocumentTextIcon, current: router.pathname === '/history' },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon, current: router.pathname === '/reports' },
    { name: 'Settings', href: '/settings', icon: CogIcon, current: router.pathname === '/settings' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-bg-sidebar">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <Logo variant="icon" size="sm" />
              <span className="text-xl font-bold text-text-primary">TravelCheck</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  item.current
                    ? 'bg-kaggle-blue text-white'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-16 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-bg-sidebar">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center justify-center">
              <Logo variant="icon" size="sm" />
            </div>
            <nav className="mt-5 flex flex-1 flex-col">
              <div className="space-y-1 px-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex flex-col items-center px-2 py-2 text-xs font-medium rounded-md ${
                      item.current
                        ? 'text-kaggle-blue bg-white shadow-sm'
                        : 'text-text-secondary hover:bg-white hover:text-text-primary'
                    }`}
                  >
                    <item.icon className="h-6 w-6 mb-1" />
                    <span className="text-xs">{item.name}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-auto px-2">
                <button className="group flex flex-col items-center px-2 py-2 text-xs font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90 w-full">
                  <PlusIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs">Create</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-16">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border-light bg-bg-primary px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-text-secondary lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-border-light lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Search */}
            <form className="relative flex flex-1" action="#" method="GET">
              <label htmlFor="search-field" className="sr-only">
                Search
              </label>
              <MagnifyingGlassIcon
                className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-text-tertiary pl-3"
                aria-hidden="true"
              />
              <input
                id="search-field"
                className="block h-full w-full border-0 py-0 pl-10 pr-0 text-text-primary placeholder:text-text-placeholder focus:ring-0 sm:text-sm bg-bg-secondary rounded-lg"
                placeholder="Search..."
                type="search"
                name="search"
              />
            </form>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button type="button" className="-m-2.5 p-2.5 text-text-secondary hover:text-text-primary">
                <BellIcon className="h-6 w-6" />
              </button>

              {/* Separator */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border-light" />

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="-m-1.5 flex items-center p-1.5"
                  id="user-menu-button"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden lg:flex lg:items-center">
                    <span className="ml-4 text-sm font-semibold leading-6 text-text-primary" aria-hidden="true">
                      User
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
