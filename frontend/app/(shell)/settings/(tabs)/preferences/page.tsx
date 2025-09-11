'use client'

import React from 'react'
import { PreferencesForm } from '@/components/settings'

export default function PreferencesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Preferences</h1>
        <p className="text-text-secondary">Customize your application settings</p>
      </div>
      
      <PreferencesForm />
    </div>
  )
}
